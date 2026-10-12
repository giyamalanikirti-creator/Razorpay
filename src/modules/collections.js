/* ================= COLLECTIONS LIFECYCLE: repayment setup → collect → recover → learn ================= */
/* RAY Credit manages the distributor's own trade credit. Collections run only inside mandates the buyer authorised. */

/* ---------- the lifecycle, visible across the product ---------- */
const LC = [['request','Request credit'],['assess','Assess'],['approve','Approve limit & terms'],['repay','Set repayment method'],['monitor','Monitor'],['collect','Collect'],['recover','Recover if needed'],['reconcile','Reconcile'],['learn','Learn'],['next','Next credit decision']];
function lifecycle(st={}, opts={}){
  const n=opts.counts||{}, go_=opts.go||{};
  return `<div class="lc ${opts.compact?'lc-c':''}">${LC.map(([k,l],i)=>{ const s=st[k]||''; const c=n[k];
    return `<div class="lc-i ${s}" ${go_[k]?`onclick="${go_[k]}" style="cursor:pointer"`:''}><span class="lc-d">${s==='done'?I('check',10,3):s==='warn'?'!':i+1}</span><span class="lc-l">${l}</span>${c!==undefined&&c!==null&&c!==''?`<span class="lc-n">${c}</span>`:''}</div>`; }).join('')}</div>`;
}

/* ---------- collection methods (authorised mandates) ---------- */
const BASE_M = {
  gupta:{m:'UPI Autopay', max:100000}, arora:{m:'UPI Autopay', max:120000}, mehta:{m:'UPI Autopay', max:75000}, sethi:{m:'UPI Autopay', max:60000},
  chawla:{m:'eNACH', max:60000}, singhms:{m:'eNACH', max:40000},
};
function collMethod(id){ const b=BUY[id], dm=b&&b.debit&&b.debit.method; return S.mand[id] || BASE_M[id] || (id==='newlife' ? {m:'Not set up'} : dm&&dm!=='Manual' ? {m:dm} : {m:'Manual'}); }
const isAuto = id => ['UPI Autopay','eNACH'].includes(collMethod(id).m);
const mLabel = m => m==='eNACH'?'eNACH mandate':m==='Manual'?'Manual payment':m;
function methodChip(id, sub){ const c=collMethod(id), m=c.m;
  const cls = m==='UPI Autopay'?'mt-upi':m==='eNACH'?'mt-nach':m==='Not set up'?'mt-none':'mt-man';
  return `<span class="mtag ${cls}">${m==='UPI Autopay'?I('refresh',11,2.4):m==='eNACH'?I('bank',11,2.2):m==='Not set up'?I('minus',11,2.4):I('link',11,2.2)} ${m}${c.st==='pending'?' · pending':''}</span>${sub?`<div class="xs ${sub[1]||'muted'} mt4">${sub[0]}</div>`:''}`;
}

/* ---------- scheduled automatic collections this week ---------- */
const UPCOMING = {};
const collSt = id => S.coll[id]||'scheduled';
function collStatus(id){ const s=collSt(id);
  if(s==='received') return `<span class="badge b-g">${I('check',11,2.6)} Received · matched automatically</span>`;
  if(s==='progress') return `<span class="badge b-b">Collection in progress</span>`;
  if(s==='paidbank') return `<span class="badge b-g">${I('check',11,2.6)} Paid by NEFT · autopay cancelled</span>`;
  return `<span class="badge b-n">${planDays(UPCOMING[id].iso)===0?'Due today':planDays(UPCOMING[id].iso)===1?'Due tomorrow':'Scheduled'}</span>`; }

/* ---------- failed automatic collections ---------- */
const FAILS = {};
/* ================= COMPUTED COLLECTION LISTS =================
   Scheduled automatic collections, failed automatic debits and payment reviews are rebuilt from mandates,
   ledger events and incoming payment signals, the same way for every buyer. */
/* Incoming payment signals RAY has not confirmed yet (synthetic prototype data). Review entries are built from these. */
const PAY_SIGNALS = [
  {buyerId:'verma', inv:'INV-24655', kind:'unmatched_credit', possible:{amt:26500, t:'Yesterday, 6:10 PM', from:'UPI · Razorpay Smart Collect', ref:'pay_Q8f2Kx91LmZ4'}},
  {buyerId:'lifeline', inv:'INV-24702', kind:'bank_candidates', cands:[{amt:31200,t:'Yesterday, 4:32 PM',from:'LIFELINE MART',ref:'NEFT/HDFC81732',conf:'High'},{amt:31000,t:'Yesterday, 1:14 PM',from:'LIFELINE & CO',ref:'UPI/40918276',conf:'Low'}]},
  {buyerId:'goyal', inv:'INV-24611', kind:'not_confirmed'},
  {buyerId:'citycare', inv:'INV-24733', kind:'cheque_recorded', sp:{amt:42000, t:'3 Oct · 5:40 PM', date:'3 Oct', by:'Rakesh Sharma', from:'Cheque #004512 · recorded by Rakesh Sharma', ref:'Not yet seen in the bank'}},
];
function prNote(sg){
  if(sg.kind==='unmatched_credit') return `We found an unmatched ${inr(sg.possible.amt)} Razorpay credit (${sg.possible.t.toLowerCase()}) that may be this payment.`;
  if(sg.kind==='cheque_recorded') return `${sg.sp.by} recorded a ${inr(sg.sp.amt)} cheque collection on ${sg.sp.date}. It has not appeared in your bank account yet.`;
  return 'We haven’t found a confirmed payment for this invoice yet.'; }
const dueYear = iso => `${RayDates.fmtShort(iso)} ${iso.slice(0,4)}`;
function syncLists(){
  /* payment reviews: one per unconfirmed payment signal; status comes from the ledger */
  for(const k of Object.keys(PAYREV)) delete PAYREV[k];
  PAY_SIGNALS.forEach(sg=>{ const i=invOf(sg.buyerId, sg.inv); if(!i) return; const bal=i.bal-(i.disputed||0), d=planDays(i.due);
    PAYREV[sg.buyerId]=Object.assign({kind:sg.kind, inv:sg.inv, open:bal>0, amt:bal>0?bal:i.amt, due:dueYear(i.due), dueTxt:d===0?'Due today':d<0?`${-d} day${d===-1?'':'s'} overdue`:`Due in ${d} days`, note:prNote(sg), cands:sg.cands||[]},
      sg.possible?{possible:sg.possible}:{}, sg.sp?{sp:sg.sp}:{}); });
  /* failed automatic debits: every AUTOPAY_FAILED event. An unpaid recovery wins over a completed one; completed
     recoveries stay (as history) but drop out of every active list through recoveryOf(). */
  for(const k of Object.keys(FAILS)) delete FAILS[k];
  S.led.events.filter(e=>e.type==='AUTOPAY_FAILED').forEach(e=>{ const i=invOf(e.buyerId, e.invoice); if(!i||!BUY[e.buyerId]) return;
    const cur=FAILS[e.buyerId]; if(cur){ const ci=invOf(e.buyerId,cur.inv); if(ci&&ci.bal>0&&i.bal<=0) return; }
    const pe=partialEvidence(e.buyerId), part=pe.any, nm=BUY[e.buyerId].name;
    FAILS[e.buyerId]={inv:e.invoice, amt:e.amount||i.amt, date:e.date, due:dueYear(i.due), m:/enach/i.test(e.source||'')?'eNACH':collMethod(e.buyerId).m, on:`${RayDates.fmtDay(e.date)} · ${(e.meta&&e.meta.time)||'10:02 AM'}`,
      reason:(e.meta&&e.meta.reason)||'Debit did not go through', partialHistory:part,
      rec:part?'Send a payment link and allow partial payment.':'Retry the debit once and send a payment link.',
      why:part?`Evidence: ${pe.summary}. ${PARTIAL_RATIONALE}`:`${nm} usually pays on time. One retry after they add balance, plus a link to pay now, is enough.`}; });
  /* scheduled automatic collections: next invoice due within 7 days for every buyer with an active mandate */
  const keepUp=Object.fromEntries(Object.entries(UPCOMING).filter(([id])=>['received','progress','paidbank'].includes(S.coll&&S.coll[id])));
  for(const k of Object.keys(UPCOMING)) delete UPCOMING[k];
  const failed=new Set(S.led.events.filter(e=>e.type==='AUTOPAY_FAILED').map(e=>e.buyerId+'|'+e.invoice));
  for(const b of RayData.ALL){ const id=b.id; if(keepUp[id]){ UPCOMING[id]=keepUp[id]; continue; } if(!isAuto(id)) continue;
    const next=invsOf(id).filter(i=>i.bal-(i.disputed||0)>0&&!failed.has(id+'|'+i.inv)&&planDays(i.due)>=0&&planDays(i.due)<=7).sort((a,c)=>RayDates.toN(a.due)-RayDates.toN(c.due))[0];
    if(!next) continue; const d=planDays(next.due);
    UPCOMING[id]={inv:next.inv, amt:next.bal-(next.disputed||0), due:RayDates.fmtShort(next.due), iso:next.due, d:+next.due.slice(8), when:d===0?'Today · attempt at 11:00 AM':d===1?`Tomorrow, ${RayDates.fmtShort(next.due)}`:RayDates.fmtDay(next.due)}; }
}
const UP_SHOW = 6;
function upKeysAll(){ return Object.keys(UPCOMING).sort((a,c)=>{ const A1=['received','paidbank','progress'].includes(collSt(a))?0:1, C1=['received','paidbank','progress'].includes(collSt(c))?0:1;
  return (RayDates.toN(UPCOMING[a].iso)-RayDates.toN(UPCOMING[c].iso))||(UPCOMING[c].amt-UPCOMING[a].amt)||(A1-C1); }); }
function upKeys(){ const all=upKeysAll(); const acted=all.filter(id=>['received','paidbank','progress'].includes(collSt(id))); const top=all.filter(id=>!acted.includes(id)).slice(0,UP_SHOW);
  return all.filter(id=>acted.includes(id)||top.includes(id)); }
function upMoreRow(){ const shown=new Set(upKeys()), rest=Object.keys(UPCOMING).filter(id=>!shown.has(id)); if(!rest.length) return '';
  return `<div class="chase"><div class="chase-h" style="cursor:default;grid-template-columns:28px minmax(0,1fr) auto"><span class="rank">+</span><div class="small muted">${rest.length} more automatic collection${rest.length===1?'':'s'} this week · ${lakhs(rest.reduce((a,id)=>a+UPCOMING[id].amt,0))} · each runs only inside the buyer’s authorised mandate. RAY steps in only if a debit fails.</div><button class="btn btn-g btn-sm" onclick="go('raahi/portfolio')">View portfolio</button></div></div>`; }
const recS = id => (S.rec[id]=S.rec[id]||{st:null});
/* status comes from the ledger through recoveryOf(): a fully paid invoice is a completed recovery everywhere */
const failOpen = id => { const r=recoveryOf(id); return !!r&&r.needsAction; };
const failCount = () => Object.keys(FAILS).filter(failOpen).length;
function recStatus(id){ const r=recoveryOf(id); if(!r) return '';
  const cls={open:'b-r', action:'b-b', partial:'b-b', claimed:'b-a', completed:'b-g'}[r.status];
  const t=r.status==='open'?(r.method==='eNACH'?'eNACH debit failed':'Autopay failed'):r.status==='completed'?`${I('check',11,2.6)} Recovered in full`:r.label;
  return `<span class="badge ${cls}">${t}</span>`; }
/* ---------- underwriting: broader but explainable signals, never a score ---------- */
function uwData(id){
  const c=chemView(chem(id)), on=netOn(), s=sigOf(id), r=recOf(id), n=BUY[id].network;
  const w=(bad,good)=>bad?'w':good?'g':'';
  const oldest=nextOpenInv(id), od=oldest?RayDates.diffDays(S.today,oldest.due):0;
  const season={gupta:['Orders are typically 35% higher during the festive period.','No festive increase, because repayment is weakening.','w'],arora:['Orders are typically 35% higher during the festive period.',`The ₹80,000 request fits that pattern. ${r.action==='increase'?'A higher limit for the season is supported.':''}`,'g']}[id]||['Orders are typically 20% higher in October and November.',r.recommendedTerms<s.terms?`Shorter ${r.recommendedTerms}-day terms keep festive exposure in check.`:'Current terms are fine for the season.',''];
  return [
   ['Payment behaviour','rzp',[['Average days to pay (invoice → payment)',`${s.delay} days · usual ${s.usual}`,w(s.delayVsUsual>=3,s.delayVsUsual<=0)],['Days to pay, last 3 invoices',s.last3.map(x=>x+'d').join(' → '),w(s.trajectory==='worse',s.trajectory==='better')],['Invoices paid on time',`${s.onTimePaid} of ${s.invoicesPaid} in 6 months`,w(s.onTimePct<75,s.onTimePct>=90)],['Broken payment promises',s.promises.made?`${s.promises.broken} of last ${s.promises.made}`:'None',w(s.promises.broken>0,!s.promises.broken)]]],
   ['Relationship','led',[['Buyer vintage',`Buying from you for ${(s.tenureMonths/12).toFixed(1)} years`,w(false,s.tenureMonths>=36)],['Monthly orders',`${lakh(s.ordersPrev)} → ${lakh(s.ordersNow)}`,''],['Recent order trend',s.ordersChangePct<=-10?`Declining · ${s.ordersChangePct}%`:s.ordersChangePct>=10?`Rising · +${s.ordersChangePct}%`:'Steady',w(s.ordersChangePct<=-10,s.ordersChangePct>=10)]]],
   ['Collection reliability','rzp',s.debit.method==='Manual'?[['Collection method','Manual payments',''],['Partial-payment behaviour',partialEvidence(id).summary,''],['Claims to reconcile',s.claimsPending?`${s.claimsPending} unverified`:'None','']]:[[`${s.debit.method} success rate`,`${s.debit.attempts-s.debit.failures6m} of ${s.debit.attempts} · ${Math.round((s.debit.attempts-s.debit.failures6m)/Math.max(1,s.debit.attempts)*100)}%`,w(s.debit.failures6m>0,!s.debit.failures6m)],['Failed debits',s.debit.failures6m?`${s.debit.failures60d} in 60 days · ${s.debit.failures6m} in 6 months`:'None',w(s.debit.failures60d>0,false)],['On-time collections in a row',String(s.debit.streak),w(false,s.debit.streak>=6)],['Partial-payment behaviour',partialEvidence(id).summary+(partialEvidence(id).any?' · never adds risk':''),'']]],
   ['Current exposure','led',[['Outstanding balance',inr(s.out),''],['Exposure vs reference limit',`${s.utilisationPct}% of ${inr(s.refLimit)}`,w(s.utilisationPct>=75,false)],['Oldest unpaid invoice',oldest?`${inr(oldest.bal)} · ${oldest.inv} · ${od>0?od+' days overdue':od===0?'due today':'due '+RayDates.fmtShort(oldest.due)}`:'None',w(od>0,false)]]],
   ['How they pay other distributors','net',on&&r.network.eligible?[[`Across ${n.coverage} distributors`,n.baseLow!=null?`${n.baseLow}–${n.baseHigh}d → ${n.nowLow}–${n.nowHigh}d`:`About ${n.avgDays} days`,w(r.network.trend==='adverse',r.network.trend!=='adverse')],['Policy effect',r.networkStep?(r.networkStep.kind==='corroborated'?`${inr(r.networkStep.from)} → ${inr(r.networkStep.to)}`:'Watch · limit held'):'No adjustment',w(!!r.networkStep,false)]]:[[on?'Razorpay network':'Razorpay network',on?NET_STATE_LABEL[r.network.state]||'Not used':'Not enabled','']]],
   ['Seasonal context','led',[['Festive period',season[0],''],['RAY’s view',season[1],season[2]]]],
  ];
}
const UW_SRC = {rzp:['rzp','Razorpay payments'],led:['led','Own ledger'],net:['net','Razorpay network']};
function uwPanel(id){
  const d=uwData(id), n=d.findIndex(x=>x[1]==='net'); if(n>0) d.unshift(d.splice(n,1)[0]);
  return `<div class="uw-g mt12">${d.map(([h,src,rows])=>`<div class="uw ${src==='net'&&netOn()?'uw-net':''}"><div class="row between"><span class="uw-h">${h}</span><span class="src ${UW_SRC[src][0]}">${UW_SRC[src][1]}</span></div>${rows.map(r=>`<div class="uw-r"><span>${r[0]}</span><b class="${r[2]==='w'?'w':r[2]==='g'?'g':''}">${r[1]}</b></div>`).join('')}</div>`).join('')}</div>
   <div class="xs muted mt12 row gap4">${I('info',12)} No single score. RAY explains every recommendation using the signals above, and seasonal context only adjusts limits within what repayment supports.</div>`;
}
function uwMobile(id){ const d=uwData(id), n=d.findIndex(x=>x[1]==='net'); if(n>0) d.unshift(d.splice(n,1)[0]); return d.map(([h,src,rows])=>`<div class="xs muted mt8" style="font-weight:700;letter-spacing:.04em">${h.toUpperCase()}</div>${rows.map(r=>`<div class="mline"><span>${r[0]}</span><b style="${r[2]==='w'?'color:#b26a00':r[2]==='g'?'color:var(--g)':''};text-align:right;max-width:58%">${r[1]}</b></div>`).join('')}`).join(''); }

/* ---------- SET UP REPAYMENT (after a limit or terms are approved) ---------- */
/* opened for one approved decision (opId). Limit and terms are read from that decision and the live state, never
   from values captured earlier; if the decision is undone or superseded, the setup closes and nothing can be confirmed. */
A.repaySetup=(id,opId)=>{ if(!opId){ const op=lastCreditOp(id); opId=op&&op.opId; }
  if(!setupOpValid(id,opId)) return toast('Repayment setup is not available: the credit decision it belongs to is no longer the applied one');
  const cur=collMethod(id), limit=curLimitOf(id), terms=curTermsOf(id);
  const sug = cur.m==='UPI Autopay'||cur.m==='eNACH' ? cur.m : limit>=100000 ? 'eNACH' : 'UPI Autopay';
  S.rs={id, opId, limit, terms, pick:sug, sug, step:'choose'}; rsRender(); };
function rsValid(){ const r=S.rs; return !!(r&&r.opId&&setupOpValid(r.id,r.opId)&&curLimitOf(r.id)===r.limit&&curTermsOf(r.id)===r.terms); }
/* close a setup whose decision is gone; nothing is sent or activated */
function rsCancel(id, opId, why){ const r=S.rs; if(!r||r.id!==id||(opId&&r.opId!==opId)) return false; const c=chem(id), sent=r.step==='wait';
  S.rs=null; closeModal(); if(S.mob&&S.mob.sheet==='pr'){ S.mob.sheet=null; if(typeof mobRender==='function') mobRender(); }
  log({ic:'x',ti:`Repayment setup withdrawn · ${c.name}`,de:`${why==='undone'?'The credit decision it belonged to was undone':'The credit decision changed'} · ${sent?'mandate request for '+inr(r.limit)+' withdrawn before activation':'nothing was sent'} · no mandate change`,src:[],who:'RAY controls',chem:c.name});
  return true; }
function rsGuard(){ if(rsValid()) return true; const r=S.rs; if(r) rsCancel(r.id, r.opId, 'changed'); toast('Repayment setup closed: the credit decision it was for is no longer applied. Nothing was changed.'); prRefresh(); return false; }
function rsRender(){
  const r=S.rs; if(!r) return; if(!rsValid()){ rsGuard(); return; } const c=chem(r.id), cur=collMethod(r.id), first=c.name.split(' ')[0];
  const kv=`<div class="pr-kv"><div><span>Buyer</span><b>${c.name}</b></div><div><span>Credit limit</span><b class="num">${inr(r.limit)}</b></div><div><span>Terms</span><b>${r.terms} days</b></div></div>`;
  let h='';
  if(r.step==='choose'){
    const opt=(k,t,d,f)=>`<div role="button" class="radio-card rs-opt ${r.pick===k?'on':''}" style="padding:12px 14px;align-items:flex-start" onclick="S.rs.pick='${k}';rsRender()"><span class="radio" style="margin-top:2px"></span><div class="grow"><div class="row gap6 wrap"><b style="color:var(--strong)">${t}</b>${cur.m===k&&cur.m!=='Manual'?'<span class="badge b-g">Current</span>':''}${r.sug===k?`<span class="ai-tag" style="font-size:11px">${clover(11)} RAY suggests</span>`:''}</div><div class="small mt4" style="color:var(--text)">${d}</div><div class="xs muted mt4">Recommended for: ${f}</div></div></div>`;
    h=`<div class="pr-sh"><span class="row gap8">${stage('REPAYMENT')}<h3 style="margin:0">Set up repayment</h3></span>${kv}
     <p class="mt12" style="font-weight:600;color:var(--strong)">How should ${c.name} repay?</p>
     <div class="col gap8 mt8">${opt('UPI Autopay','UPI Autopay','Automatically collect approved amounts through the buyer’s UPI mandate.','Smaller or frequent repayments')}${opt('eNACH','eNACH / NACH mandate','Set up a standing bank mandate for scheduled repayments.','Higher-value recurring trade credit')}${opt('Manual','Manual payment','Send payment links and reconcile payments as they arrive.','Buyers who prefer to pay each invoice themselves')}</div>
     ${cur.m==='UPI Autopay'||cur.m==='eNACH'?`<div class="xs muted mt8">${c.name} already has an active ${mLabel(cur.m)} for up to ${inr(cur.max)}. ${r.limit!==cur.max?`RAY suggests updating the maximum to ${inr(r.limit)} to match the new limit.`:''}</div>`:''}
     <div class="pr-btns mt16"><button class="btn btn-g" onclick="A.rsSkip()">Skip for now</button><button class="btn btn-p" onclick="A.rsNext()">Continue</button></div></div>`;
  } else if(r.step==='upi'||r.step==='nach'){
    const upi=r.step==='upi';
    h=`<div class="pr-sh"><h3>${upi?'Set up UPI Autopay':'Set up bank mandate'}</h3>
     <div class="pr-kv"><div><span>Buyer</span><b>${c.name}</b></div><div><span>${upi?'Maximum authorised debit':'Maximum mandate'}</span><b class="num">${inr(r.limit)}</b></div><div><span>${upi?'Repayment schedule':'Frequency'}</span><b>${upi?'On invoice due date':'As invoices become due'}</b></div></div>
     <div class="rs-steps mt12">${[`RAY sends ${c.name} an authorisation request`, upi?'The buyer approves the mandate in their UPI app':'The buyer authorises through net banking or debit card', upi?'Approved amounts are collected on each invoice due date':'Debits run as each invoice becomes due'].map((x,i)=>`<div class="row gap8 small"><span class="rs-n">${i+1}</span><span>${x}</span></div>`).join('')}</div>
     <div class="ol-note mt12"><span style="color:var(--link);flex-shrink:0">${I('lock',14,2)}</span><span>RAY can only collect up to <b class="num">${inr(r.limit)}</b>${upi?' on invoice due dates':''}. It cannot debit any amount outside the authorised mandate, and the buyer gets a notice before each debit.</span></div>
     ${(cur.m==='UPI Autopay'&&upi)||(cur.m==='eNACH'&&!upi)?`<div class="xs muted mt8">This replaces the current ${inr(cur.max)} mandate once ${c.name} approves it.</div>`:''}
     <div class="pr-btns mt16"><button class="btn btn-g" onclick="S.rs.step='choose';rsRender()">Back</button><button class="btn btn-p" onclick="A.rsSend()">${upi?'Send authorisation request':'Send mandate request'}</button></div></div>`;
  } else if(r.step==='wait'){
    h=`<div class="pr-sh"><h3>Waiting for ${c.name}</h3><div class="mt12">${thinking(r.pick==='UPI Autopay'?`Waiting for ${first} ji to approve in their UPI app…`:`Waiting for ${first} ji to authorise the bank mandate…`)}</div><p class="xs muted mt8">Authorisation request sent on WhatsApp via RAY · approved by ${M.owner}</p></div>`;
  } else if(r.step==='active'){
    const nx=r.id==='gupta'?'INV-24891 · ₹38,400 · 12 Oct':UPCOMING[r.id]?`${UPCOMING[r.id].inv} · ${inr(UPCOMING[r.id].amt)} · ${UPCOMING[r.id].due}`:'From the first invoice';
    h=`<div class="pr-sh"><div class="mand-ok"><span class="mand-ic">${I(r.pick==='eNACH'?'bank':'refresh',20,2.2)}</span><div><div class="xs muted" style="font-weight:600">${r.pick==='eNACH'?'Bank mandate':'UPI Autopay'}</div><div class="mand-st">ACTIVE</div></div></div>
     <div class="pr-kv mt12"><div><span>Buyer</span><b>${c.name}</b></div><div><span>Maximum</span><b class="num">${inr(r.limit)}</b></div><div><span>Next collection</span><b>${nx}</b></div></div>
     <p class="xs muted mt12">${c.name} authorised the mandate. RAY now monitors the buyer, reminds before each due date and attempts collection only within this mandate.</p>
     <div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose();${prMob()?`A.mobGo('buyer','${r.id}')`:`goSec('raahi/buyer/${r.id}','plan')`}">View repayment plan</button><button class="btn btn-p" onclick="prClose()">Done</button></div></div>`;
  }
  prOpen(h);
}
A.rsSkip=()=>{ if(!S.rs) return prClose(); const c=chem(S.rs.id); log({ic:'clock',ti:`Repayment setup skipped for ${c.name}`,de:`Current method kept: ${mLabel(collMethod(S.rs.id).m)}`,src:[],who:prWho(),chem:c.name}); S.rs=null; prClose(); prRefresh(); };
A.rsNext=()=>{ const r=S.rs; if(!r||r.step!=='choose') return; if(!rsGuard()) return; const c=chem(r.id);
  if(r.pick==='Manual'){ S.mand[r.id]={m:'Manual'}; log({ic:'link',ti:`Repayment method set: manual payment for ${c.name}`,de:`Payment links on each invoice · RAY reconciles payments as they arrive · limit ${inr(r.limit)} · ${r.terms} days`,src:['led'],who:'Approved by '+prWho(),chem:c.name}); S.rs=null; prClose(); prRefresh(); toast('Repayment method saved · manual payment'); return; }
  r.step=r.pick==='UPI Autopay'?'upi':'nach'; rsRender(); };
A.rsSend=()=>{ const r=S.rs; if(!r||(r.step!=='upi'&&r.step!=='nach')) return; if(!rsGuard()) return; const c=chem(r.id); r.step='wait'; rsRender();
  log({ic:'send',ti:`${r.pick==='UPI Autopay'?'UPI Autopay':'eNACH mandate'} request sent to ${c.name}`,de:`Maximum ${inr(r.limit)} · ${r.pick==='UPI Autopay'?'on invoice due dates':'as invoices become due'} · buyer authorises in their ${r.pick==='UPI Autopay'?'UPI app':'bank'}`,src:['conv'],who:'Approved by '+prWho(),chem:c.name});
  setTimeout(()=>{ if(S.rs!==r) return; if(!rsValid()){ rsCancel(r.id, r.opId, 'changed'); prRefresh(); return; } S.mand[r.id]={m:r.pick, max:r.limit, opId:r.opId}; r.step='active';
    log({ic:'check',ti:`${r.pick==='UPI Autopay'?'UPI Autopay':'Bank mandate'} active for ${c.name}`,de:`Authorised by the buyer · maximum ${inr(r.limit)} · RAY cannot debit beyond this mandate`,src:['rzp'],who:`${c.name} · ${r.pick==='UPI Autopay'?'UPI app':'net banking'}`,chem:c.name});
    rsRender(); rr(); },2200); };

/* ---------- REPAYMENT PLAN (buyer profile) ---------- */
const PLAN = { gupta:{inv:'INV-24891', amt:38400, d:12}, mehta:{inv:'INV-24812', amt:30000, d:6}, arora:{inv:'INV-24860', amt:42800, d:5}, chawla:{inv:'INV-24930', amt:27600, d:6}, sethi:{inv:'INV-24940', amt:18900, d:8} };
const dayLbl = n => n<=0?`${30+n} Sep`:`${n} Oct`;
function planSteps(id){
  const p=PLAN[id], c=chemView(chem(id)), m=collMethod(id).m, auto=m==='UPI Autopay'||m==='eNACH', watch=c.band!=='Reliable', st=[];
  const dd=k=>`${k} Oct`, today=5;
  const tag=(d,doneTxt)=> d<today?`<span class="badge b-g">${I('check',10,2.6)} ${doneTxt||'Done'}</span>`:d===today?'<span class="badge b-b">Today</span>':'';
  if(watch) st.push([p.d-S.pol.watchLead,'Early follow-up',`Watch buyer: RAY starts ${S.pol.watchLead} days before the due date.`, id==='gupta'&&S.chase.gupta.st!=='draft'?`<span class="badge b-g">${I('check',10,2.6)} Sent</span>`:id==='gupta'?'<span class="badge b-b">Today · needs approval</span>':tag(p.d-7)]);
  st.push([p.d-3,'Pre-due reminder', auto?'WhatsApp via RAY. Mentions the mandate and the due date.':'WhatsApp via RAY with a payment link.', tag(p.d-3,'Sent')]);
  if(auto) st.push([p.d-1,'Upcoming debit notification', m==='eNACH'?'Pre-debit notice to the buyer before the mandate debit.':'Pre-debit notice through the buyer’s UPI app.', tag(p.d-1,'Sent')]);
  st.push([p.d, auto?(m==='eNACH'?'eNACH debit':'Autopay attempt'):'Due-date reminder', auto?`Collects ${inr(p.amt)} within the authorised mandate.`:'Payment link resent if unpaid.', p.d===today?'<span class="badge b-b">Today</span>':'']);
  return st;
}
function planCard(id){
  const p=PLAN[id]; if(!p) return '';
  const c=chem(id), m=collMethod(id).m, auto=m==='UPI Autopay'||m==='eNACH', s=collSt(id);
  const done = s==='received'?`<div class="alert ok mt12" style="padding:12px 14px"><span class="ic" style="width:28px;height:28px">${I('check',15,2.4)}</span><div class="grow small"><b style="color:var(--strong)">Payment received · ${inr(p.amt)} · ${p.inv}</b><div class="muted">${m} · ${id==='mehta'?'6 Oct, 10:42 AM':'today'} · matched automatically</div></div></div>`
    : s==='paidbank'?`<div class="alert ok mt12" style="padding:12px 14px"><span class="ic" style="width:28px;height:28px">${I('bank',15,2)}</span><div class="grow small"><b style="color:var(--strong)">Paid by NEFT before the autopay attempt</b><div class="muted">₹42,800 received 10:16 AM and matched from your bank account. RAY cancelled the autopay attempt. RAY cancelled the attempt to avoid collecting twice.</div></div></div>`:'';
  const pre = id==='gupta'?`<div class="pre-msg mt12"><div class="xs muted" style="font-weight:600">Pre-due message · 9 Oct · drafted by RAY</div><div class="small mt4" style="color:var(--strong)">“Your ₹38,400 payment against INV-24891 is due on 12 Oct. Your registered UPI mandate will be used on the due date.”</div><div class="xs mt8" style="color:#9a5b00;font-weight:600">${I('clock',12,2)} Gupta Traders usually pays late. RAY started follow-up 7 days before the due date.</div></div>`:'';
  return `<div class="card pad" id="plan"><div class="row between"><div class="row gap8">${stage('COLLECT')}<span class="h3">Repayment plan</span></div>${methodChip(id)}</div>
   <div class="pr-kv mt12" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div><span>Invoice</span><b>${p.inv}</b></div><div><span>Amount</span><b class="num">${inr(p.amt)}</b></div><div><span>Due</span><b>${p.d} Oct</b></div><div><span>Collection method</span><b>${mLabel(m)}</b></div></div>
   ${done}
   <div class="ptl mt12">${planSteps(id).map(s=>`<div class="ptl-i"><span class="ptl-d">${dayLbl(s[0])}</span><span class="ptl-dot"></span><div class="grow"><div class="row gap8"><b style="color:var(--strong)">${s[1]}</b>${s[3]||''}</div><div class="xs muted mt4">${s[2]}</div></div></div>`).join('')}
    <div class="ptl-br"><div class="ok"><b>If successful</b><span>Payment confirmed and matched automatically</span></div><div class="ko"><b>If unsuccessful</b><span>Recovery flow starts: payment link, partial payment allowed</span></div></div></div>
   ${pre}</div>`;
}

/* ---------- SCHEDULED COLLECTION detail (desktop page + mobile screen) ---------- */
function collBody(id,mob){
  const u=UPCOMING[id], c=chemView(chem(id)), cm=collMethod(id), s=collSt(id);
  const btn=(cls,lbl,fn)=>mob?`<button class="mbtn ${cls==='btn-p'?'p':cls==='btn-g'?'g':''}" onclick="${fn}">${lbl}</button>`:`<button class="btn ${cls}" onclick="${fn}">${lbl}</button>`;
  const state = s==='progress' ? `<div class="coll-st prog"><span class="lbl">Collection in progress</span><div class="mt8">${thinking(`Collecting ${inr(u.amt)} through ${cm.m}…`)}</div></div>`
   : s==='received' ? `<div class="coll-st ok"><span class="lbl" style="color:var(--g)">Payment received</span><div class="mob-amt mt4" style="font-size:24px;color:var(--strong)">${inr(u.amt)}</div><div class="pr-kv mt8 ${mob?'mob':''}"><div><span>Invoice</span><b>${u.inv}</b></div><div><span>Method</span><b>${cm.m}</b></div><div><span>Status</span><b style="color:var(--g)">Matched automatically</b></div></div><div class="xs muted mt8">Collected ${id==='mehta'?'6 Oct, 10:42 AM':'on the due date'}. Added to ${c.name}’s repayment record.</div></div>`
   : s==='paidbank' ? `<div class="coll-st ok"><span class="lbl" style="color:var(--g)">Autopay attempt cancelled</span><div class="small mt8" style="color:var(--strong)">₹42,800 was already received by NEFT at 10:16 AM and matched to INV-24860 from your bank account. RAY cancelled the attempt to avoid collecting twice.</div></div>`
   : `<div class="coll-st"><span class="lbl">Scheduled</span><div class="small mt4" style="color:var(--strong)">${u.when}</div>${btn('btn-s','Prototype: run collection on the due date',`A.collRun('${id}')`)}</div>`;
  return `<div class="pr-kv ${mob?'mob':''}"><div><span>Buyer</span><b>${c.name}</b></div><div><span>Invoice</span><b>${u.inv}</b></div><div><span>Amount</span><b class="num">${inr(u.amt)}</b></div><div><span>Due</span><b>${u.due}</b></div></div>
   <div class="row gap8 mt12 wrap"><span class="xs muted" style="font-weight:600">Collection method</span>${methodChip(id)}<span class="xs muted">Authorised up to ${inr(cm.max||u.amt)}</span></div>
   ${state}
   <div class="ptl mt12">${[[u.d-3,'Pre-due reminder','WhatsApp via RAY'],[u.d-1,'Upcoming debit notification',cm.m==='eNACH'?'Pre-debit notice to the buyer':'Pre-debit notice through the buyer’s UPI app'],[u.d,cm.m==='eNACH'?'eNACH debit':'Autopay attempt',`${inr(u.amt)} within the authorised mandate`]].map(x=>`<div class="ptl-i"><span class="ptl-d">${x[0]} Oct</span><span class="ptl-dot"></span><div class="grow"><b style="color:var(--strong)">${x[1]}</b><div class="xs muted mt4">${x[2]}</div></div></div>`).join('')}</div>
   <div class="xs muted mt12 row gap4">${I('lock',12)} Collections run only within the mandate the buyer authorised. If a debit fails, RAY starts a recovery plan and never marks the buyer as defaulted automatically.</div>`;
}
function vCollect(id){ if(!UPCOMING[id]) return '<div class="empty">Not found</div>';
  return `<div class="crumb mt20" style="margin-bottom:0"><a onclick="goSec('raahi/actions','grp-upcoming')">${I('arrowL',14,2)} Upcoming collections</a></div><div style="max-width:900px">${pageHead('Scheduled collection','Automatic collection within the buyer’s authorised mandate.')}<div class="card pad mt16">${collBody(id,false)}</div></div>`; }
A.collRun=(id)=>{ const u=UPCOMING[id], c=chem(id), cm=collMethod(id); S.coll[id]='progress'; prRefresh();
  setTimeout(()=>{ S.coll[id]='received'; S.adj[id]=(S.adj[id]||0)+u.amt; ledgerPay(id, u.inv, u.amt, {type:'AUTOPAY_SUCCEEDED', source:'Razorpay '+cm.m, actor:'Razorpay', ref:'auto-'+u.inv});
    log({ic:'rupee',ti:`${inr(u.amt)} collected from ${c.name} via ${cm.m}`,de:`${u.inv} · ${id==='mehta'?'6 Oct, 10:42 AM · ':''}matched automatically · added to repayment record`,src:['rzp'],who:'Razorpay '+cm.m,chem:c.name});
    if(S.wa.msgs&&id==='mehta') waPush({from:'ray',html:`✅ ₹30,000 collected from <b>Mehta Enterprises</b> through UPI Autopay at 10:42 AM and matched to INV-24812.`});
    prRefresh(); toast(`${inr(u.amt)} collected · matched to ${u.inv}`); },1600); };

/* ---------- SMART RECOVERY (failed automatic collections) ---------- */
function dunning(id){
  const f=FAILS[id], r=recoveryOf(id), routine=S.ctl.auto==='routine'&&chemView(chem(id)).band==='Reliable';
  const d=k=>RayDates.fmtShort(RayDates.addDays(f.date,k));
  const cur = r.status==='completed'?99 : r.status==='partial'?2 : 1;
  const stages=[[d(0),'Due date',`${f.m==='eNACH'?'eNACH debit':'Autopay attempt'} · failed: ${f.reason.toLowerCase()}`],[d(1),'Day +1','WhatsApp reminder + payment link'],[d(3),'Day +3','Second reminder · allow partial payment'],[d(5),'Day +5','Salesperson follow-up'],[d(7),'Day +7','RAY recommends: review credit exposure']];
  const now=r.status==='action'?(r.step||'In progress'):r.status==='partial'?`${inr(r.balance)} left`:r.status==='claimed'?'Verify claim first':routine?'Automatic':'Needs approval';
  return `<div class="dun mt12">${stages.map((s,i)=>`<div class="dun-i ${i===0?'ko':r.status==='completed'?'done':i<cur?'done':i===cur?'cur':''}"><span class="dun-k">${s[1]}</span><span class="dun-d">${s[0]}</span><span class="dun-t">${s[2]}</span>${i===cur?`<span class="dun-now">${now}</span>`:''}</div>`).join('')}</div>
   <div class="xs muted mt8">${r.status==='completed'?'Recovery complete. The remaining steps were stopped automatically: no further messages, retries or visits for this invoice.':routine?'Routine account: automatic follow-up within your configured limits.':'Review first: RAY prepares each step and you approve before anything is sent. Routine accounts can use automatic follow-up within your limits.'}</div>`;
}
const payRefFor = (id,inv) => `pay_${inv.replace(/\W/g,'')}_${S.led.seq}_${(S.rec[id]&&S.rec[id].n)||0}`; /* fixed per rendered button: a double click repeats the same reference and is rejected */
function recPayList(r){ if(!r.pays.length) return '';
  return `<div class="col gap6 mt12">${r.pays.map(e=>`<div class="event"><span class="ic">${I('rupee',17,2)}</span><div class="grow"><div style="font-weight:600;color:var(--strong)">${inr(e.amount)} received <span class="xs muted" style="font-weight:500">· ${esc(e.source)} · ${RayDates.fmtShort(e.date)}</span></div><div class="small">Verified · matched to <b>${e.invoice}</b> · balance ${inr(e.meta.balanceBefore)} → <b class="num">${inr(e.meta.balanceAfter)}</b></div></div><span class="badge b-g">Ledger updated</span></div>`).join('')}</div>`; }
function recBody(id,mob){
  const f=FAILS[id], c=chemView(chem(id)), r=recoveryOf(id), rs=recS(id);
  const btn=(cls,lbl,fn,bid)=>mob?`<button class="mbtn ${cls==='btn-p'?'p':cls==='btn-g'?'g':''}" ${bid?`id="${bid}${mob?'-m':''}"`:''} onclick="${fn}">${lbl}</button>`:`<button class="btn ${cls}" ${bid?`id="${bid}"`:''} onclick="${fn}">${lbl}</button>`;
  const fail=`<div class="fail-box mt12"><div class="row between wrap gap8"><span class="fail-k">${f.m==='eNACH'?'eNACH DEBIT FAILED':'AUTOPAY FAILED'}</span><span class="xs muted">${f.on}</span></div><div class="mob-amt mt4" style="font-size:22px;color:var(--strong)">${inr(f.amt)}</div><div class="small mt4"><span class="muted">Reason:</span> <b style="color:var(--strong)">${f.reason}</b></div><div class="xs muted mt8">Not marked as defaulted. A failed debit starts a recovery plan, not a block on the buyer.</div></div>`;
  let main='', acts='';
  const ref=payRefFor(id,f.inv);
  if(r.status==='completed'){
    const nx=r.next;
    main=`<div class="alert ok mt12" id="rec-done-${id}"><span class="ic">${I('check',17,2.4)}</span><div class="grow"><h4>Recovered in full${r.completedAt?` on ${RayDates.fmtShort(r.completedAt)}`:''}</h4><div class="small muted mt4">${inr(r.received)} received against ${f.inv} in ${r.pays.length} verified payment${r.pays.length===1?'':'s'}. Balance ${inr(0)}. Collection steps for this invoice are stopped and nothing more will be sent for it.</div></div></div>
     ${recPayList(r)}
     <div class="small mt12" style="color:var(--strong)">${nx?`Next unpaid invoice: <b>${nx.inv}</b> · ${inr(nx.bal)} · due ${RayDates.fmtShort(nx.due)} · ${collMethod(id).m}. It is handled in today’s plan, not in this recovery.`:`${c.name} has nothing else outstanding.`}</div>`;
  } else if(r.status==='claimed'){
    const cl=invOf(id,f.inv).claim;
    main=`<div class="pr-res"><span class="badge b-a">Buyer says paid · not verified</span><div class="small mt8" style="color:var(--strong)">${c.name} says ${inr(cl.amount)} was paid. The balance stays ${inr(r.balance)} until a payment is found, and reminders stay paused.</div></div>${recPayList(r)}`;
    acts=`<div class="pr-acts ${mob?'mob':''}" style="grid-template-columns:${mob?'1fr':'repeat(2,minmax(0,1fr))'}">${btn('btn-p','Verify the claim',`A.claimCheck('${id}','${f.inv}')`,'rec-verify')}${btn('btn-g','Not found · close claim',`A.claimVerify('${id}','${f.inv}',false)`)}</div>`;
  } else if(r.status==='partial'||r.status==='action'){
    const L=r.link;
    main=`${L?`<div class="pr-res" id="rec-link-${id}"><div class="row gap8 wrap"><span class="badge b-b">Payment link sent</span><span class="badge b-n">Simulated delivery</span><span class="xs muted">${L.at} · WhatsApp via RAY</span></div><div class="small mt8" style="color:var(--strong)" id="rec-link-terms-${id}">${inr(L.amount)} · ${L.partial?`partial payment allowed · minimum ${inr(L.min)}`:'full amount only'}</div><div class="xs muted mt4">“${esc(L.msg)}”</div></div>`:r.step?`<div class="pr-res"><span class="badge b-n">${esc(r.step)}${rs.when&&rs.when!=='Salesperson visit'?` · ${rs.when}`:''}</span><div class="xs muted mt8">${rs.st==='later'?'Internal reminder. The buyer has not been contacted.':rs.st==='retry'?`One retry within the authorised mandate. If it fails again, RAY moves to a payment link.`:''}</div></div>`:''}
     ${recPayList(r)}
     ${r.status==='partial'?`<div class="small mt8" style="color:var(--strong)">${I('shield',13,2)} ${inr(r.balance)} still due on ${f.inv}. Credit decision kept under review. ${c.name} is not blocked.</div>${mob?'':whatChangedCard(id)}`:''}`;
    const payMin=L?Math.min(L.partial?L.min:r.balance, r.balance):null;
    acts=`<div class="row gap6 mt12 wrap"><span class="xs muted">Prototype outcome (simulated):</span>${L&&payMin<r.balance?btn('btn-s',`Buyer pays ${inr(payMin)}`,`A.recPay('${id}',${payMin},'${ref}')`,'rec-pay-min'):''}${btn('btn-s',`Buyer pays the remaining ${inr(r.balance)}`,`A.recPay('${id}',${r.balance},'${ref}-full')`,'rec-pay-full')}${btn('btn-g','Buyer says they paid',`A.ocClaim('${id}','${f.inv}')`)}${btn('btn-g',`Next ${f.m} attempt fails`,`A.ocFail('${id}')`)}</div>
     ${!L?`<div class="pr-acts ${mob?'mob':''} mt8" style="grid-template-columns:${mob?'1fr':'repeat(2,minmax(0,1fr))'}">${btn('btn-p','Send payment link',`A.recLink('${id}')`,'rec-link-btn')}${btn('btn-g','Assign to salesperson',`A.recAssign('${id}')`)}</div>`:''}`;
  } else {
    const retry=f.m==='eNACH'||!f.partialHistory;
    acts=`<div class="pr-acts ${mob?'mob':''}" style="grid-template-columns:${mob?'1fr':'repeat(3,minmax(0,1fr))'}">${retry?btn('btn-p','Schedule retry',`A.recRetry('${id}')`)+btn('btn-s','Send payment link',`A.recLink('${id}')`,'rec-link-btn'):btn('btn-p','Send payment link',`A.recLink('${id}')`,'rec-link-btn')+btn('btn-s','Remind later',`A.recLater('${id}')`)}${btn('btn-g','Assign to salesperson',`A.recAssign('${id}')`)}</div>`;
  }
  return `<div class="pr-kv ${mob?'mob':''}"><div><span>Buyer</span><b>${c.name}</b></div><div><span>Invoice</span><b>${f.inv}</b></div><div><span>Failed amount</span><b class="num">${inr(f.amt)}</b></div><div><span>Balance now</span><b class="num" id="rec-bal-${id}">${inr(r.balance)}</b></div></div>
   <div class="row gap8 mt12 wrap"><span class="xs muted" style="font-weight:600">Status</span><span id="rec-status-${id}">${recStatus(id)}</span>${bandBadge(c.band)}</div>
   ${fail}
   ${r.status==='open'?`<div class="pr-note mt12"><span class="ai-tag">${clover(13)} RAY</span><div><div class="small" style="color:var(--strong);font-weight:600">${f.rec}</div><div class="xs muted mt4">${f.why}</div></div></div>`:''}
   ${main}${acts}
   <div class="lbl mt16">Recovery sequence</div>${dunning(id)}
   ${r.status==='completed'?'':`<div class="xs muted mt12 row gap4" style="align-items:flex-start" id="rec-src-${id}">${I('shield',12)} <span>${sourcesLine(id,f.inv)}</span></div>`}`;
}
function vRecover(id){ if(!FAILS[id]) return '<div class="empty">No failed collection for this buyer</div>';
  return `<div class="crumb mt20" style="margin-bottom:0"><a onclick="goSec('raahi/actions','grp-failed')">${I('arrowL',14,2)} Failed collections</a></div><div style="max-width:920px">${pageHead('Smart recovery','A failed automatic collection, with a staged plan to recover it.')}<div class="card pad mt16">${recBody(id,false)}</div>${paymentsCard(id,{title:'Payments recorded against this buyer'})}</div>`; }

/* ---------- partial-payment link: the minimum is validated and bound to the payload, preview, record and audit ---------- */
function recLinkDraft(id){ const r=recoveryOf(id), rs=recS(id), c=chem(id), first=c.name.split(' ')[0];
  const v=RayGuards.linkMinimum(rs.draftMin!=null?rs.draftMin:RayGuards.LINK_RULES.defaultMin, r.balance);
  return {bal:r.balance, minRaw:rs.draftMin!=null?rs.draftMin:String(RayGuards.LINK_RULES.defaultMin), v,
    msg:rs.draftMsg||`Namaste ${first} ji, ${inr(r.amount)} ka scheduled payment (${FAILS[id].inv}) nahi ho paya. Is link se poora ya thoda thoda pay kar sakte hain.`}; }
function recLinkTerms(bal, v){ return !v.ok?'':v.partial?`Pay ${inr(bal)} · partial allowed · minimum ${inr(v.value)}`:`Pay ${inr(bal)} · full amount`; }
A.recLink=(id,edit)=>{ const f=FAILS[id], c=chem(id), r=recoveryOf(id); if(!r||r.balance<=0) return toast(`${f.inv} is already paid in full. No link needed.`);
  const d=recLinkDraft(id), small=d.bal<RayGuards.LINK_RULES.partialFrom, g=gateFor(id,'whatsapp',f.inv);
  prOpen(`<div class="pr-sh"><h3>Create Razorpay Payment Link</h3>
   <div class="pr-kv"><div><span>Invoice</span><b>${f.inv}</b></div><div><span>Link amount</span><b class="num">${inr(d.bal)}</b></div><div><span>To</span><b>${c.name}</b></div></div>
   ${small?`<div class="ol-note mt12"><span style="color:var(--link);flex-shrink:0">${I('info',15,2)}</span><span>${esc(d.v.note)}</span></div>`
   :`<div class="setrow mt12" style="padding:10px 0;border-top:1px solid var(--border-subtle)"><div class="t"><b>Allow partial payment</b><span>The buyer can pay any amount from the minimum up to the balance</span></div><span class="badge b-g">YES</span></div>
   <div class="field mt8"><label for="rl-min">Minimum amount (₹)</label><input class="input num" id="rl-min" inputmode="numeric" value="${esc(d.minRaw)}" style="max-width:180px" oninput="recLinkValidate('${id}')"><div class="xs mt4" id="rl-err" role="alert" style="color:var(--r);font-weight:600">${d.v.ok?'':esc(d.v.error)}</div><div class="xs muted mt4" id="rl-note">${d.v.ok&&d.v.note?esc(d.v.note):''}</div></div>`}
   <div class="xs muted mt12" style="font-weight:600">Message</div>
   ${edit?`<textarea class="textarea mt4" id="rl-msg" rows="3" maxlength="600">${esc(d.msg)}</textarea>`:`<div class="wa-preview mt4"><div class="wa-bubble" id="rl-preview">${esc(d.msg)}<span class="lnk">rzp.io/i/AMA-${f.inv.slice(4)}</span><span class="xs" id="rl-terms" style="display:block;margin-top:6px;color:#1d6b55;font-weight:600">${recLinkTerms(d.bal,d.v)}</span></div></div>`}
   <div class="xs muted mt8">${sourcesLine(id,f.inv)}</div>
   ${g.action==='block'?`<div class="alert warn mt12" style="padding:12px 14px"><span class="ic" style="width:28px;height:28px">${I('ban',15)}</span><div class="small grow"><b style="color:var(--strong)">Can’t send this now.</b> ${esc(gateNote(g))}</div></div>`:g.action==='queue'?`<div class="xs mt8" style="color:#9a5b00;font-weight:600">${esc(gateNote(g))}</div>`:''}
   <div class="xs muted mt8">${I('info',12)} Delivery is simulated in this prototype. No real message is sent and no real link is created.</div>
   <div class="pr-btns mt16"><button class="btn btn-g" onclick="prClose()">Cancel</button>${edit?`<button class="btn btn-s" id="rl-save" onclick="recLinkKeep('${id}');A.recLink('${id}')">Save message</button>`:`<button class="btn btn-s" id="rl-edit" onclick="recLinkKeep('${id}');A.recLink('${id}',true)">Edit message</button>`}<button class="btn btn-p" id="rl-send" ${d.v.ok&&g.action!=='block'?'':'disabled'} onclick="recLinkKeep('${id}');A.recSend('${id}')">${I('chat',14,2.2)} ${g.action==='queue'?'Queue for WhatsApp':'Send on WhatsApp'}</button></div></div>`); };
/* keep what the merchant typed (minimum and message) across preview, edit and send */
function recLinkKeep(id){ const rs=recS(id), m=document.getElementById('rl-min'), t=document.getElementById('rl-msg');
  if(m) rs.draftMin=m.value; if(t){ const v=t.value.trim(); rs.draftMsg=v||rs.draftMsg; } }
function recLinkValidate(id){ const r=recoveryOf(id), m=document.getElementById('rl-min'); if(!m) return;
  const v=RayGuards.linkMinimum(m.value, r.balance), e=document.getElementById('rl-err'), n=document.getElementById('rl-note'), b=document.getElementById('rl-send'), t=document.getElementById('rl-terms');
  if(e) e.textContent=v.ok?'':v.error; if(n) n.textContent=v.ok&&v.note?v.note:''; if(b) b.disabled=!v.ok||gateFor(id,'whatsapp',FAILS[id].inv).action==='block'; if(t) t.textContent=recLinkTerms(r.balance,v);
  m.setAttribute('aria-invalid', v.ok?'false':'true'); recS(id).draftMin=m.value; }
A.recSend=(id)=>{ const f=FAILS[id], c=chem(id), r=recoveryOf(id), rs=recS(id);
  const d=recLinkDraft(id); if(!d.v.ok){ toast(d.v.error); return A.recLink(id); }
  const payload={amount:d.bal, min:d.v.value, partial:d.v.partial, msg:d.msg, inv:f.inv, ref:`plink_${f.inv.replace(/\W/g,'')}_${(rs.n||0)+1}`};
  const res=sendMessage(id,{kind:'payment_link', inv:f.inv, msg:payload.msg, via:prWho(), payload});
  if(!res.ok&&!res.queued) return;
  rs.n=(rs.n||0)+1; rs.st='link'; rs.at=nowT(); rs.link=Object.assign({at:rs.at, status:res.queued?'queued':'sent'},payload); rs.draftMin=null; rs.draftMsg=null;
  log({ic:'link',ti:`${payload.partial?'Partial-payment':'Payment'} link ${res.queued?'queued':'sent'} to ${c.name}`,de:`${inr(payload.amount)} · ${f.inv} · ${payload.partial?`minimum ${inr(payload.min)}`:'full amount only'} · Razorpay Payment Link · WhatsApp via RAY · simulated delivery · message: “${payload.msg.slice(0,90)}${payload.msg.length>90?'…':''}”`,src:['rzp','conv'],who:'Approved by '+prWho(),chem:c.name});
  prClose(); prRefresh(); toast(`${res.queued?'Queued':'Sent (simulated)'}: ${inr(payload.amount)} link · ${payload.partial?'minimum '+inr(payload.min):'full amount'}`); };
/* simulated buyer payment through the link: the amount must respect the link minimum and the balance */
A.recPay=(id, amt, ref)=>{ const f=FAILS[id], r=recoveryOf(id), L=r&&r.link;
  if(!r||r.balance<=0) return toast(`${f.inv} is already paid in full. Nothing recorded.`);
  if(L&&L.partial&&amt<Math.min(L.min,r.balance)) return toast(`The link minimum is ${inr(L.min)}. Nothing recorded.`);
  const res=ledgerPay(id, f.inv, amt, {type:'PAYMENT_RECEIVED', source:L?'Razorpay Payment Link':'Razorpay payment', actor:'Razorpay', ref:ref||payRefFor(id,f.inv)});
  if(!res.ok) return toast(res.error||'Payment not recorded');
  const e=res.event, after=recoveryOf(id);
  if(typeof promiseProgress==='function') promiseProgress(id, amt, e);
  log({ic:'rupee',ti:`${inr(amt)} received from ${chem(id).name}`,de:`${e.source} (simulated) · matched to ${f.inv} · verified · balance ${inr(e.meta.balanceBefore)} → ${inr(e.meta.balanceAfter)}${after.status==='completed'?' · recovery completed, remaining steps stopped':' · partial payments never add risk'}`,src:['rzp'],who:'Razorpay',chem:chem(id).name});
  prRefresh(); toast(after.status==='completed'?`${f.inv} paid in full · recovery completed`:`${inr(amt)} received · ${inr(after.balance)} remaining`); };

A.recRetry=(id)=>{ const f=FAILS[id], c=chem(id), r=recoveryOf(id), d=RayDates.fmtShort(RayDates.addDays(S.today,2));
  prOpen(`<div class="pr-sh"><h3>Retry the debit on ${d}?</h3><div class="pr-kv"><div><span>Buyer</span><b>${c.name}</b></div><div><span>Amount</span><b class="num">${inr(r.balance)}</b></div><div><span>Mandate</span><b>${f.m}${collMethod(id).max?` · up to ${inr(collMethod(id).max)}`:''}</b></div></div><p class="small muted mt12">One retry within the authorised mandate. The buyer gets a pre-debit notice. If it fails again, RAY recommends a payment link. The retry is cancelled automatically if the invoice is paid first.</p><div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose()">Cancel</button><button class="btn btn-p" onclick="A.recRetryDo('${id}','${d}')">Schedule retry</button></div></div>`); };
A.recRetryDo=(id,d)=>{ const f=FAILS[id], c=chem(id), rs=recS(id); if(recoveryOf(id).balance<=0){ prClose(); return toast('Already paid. Retry not needed.'); } rs.st='retry'; rs.when=d;
  log({ic:'refresh',ti:`${f.m} retry scheduled for ${c.name}`,de:`${inr(recoveryOf(id).balance)} · ${f.inv} · ${d} · within the authorised mandate`,src:['rzp'],who:'Approved by '+prWho(),chem:c.name}); prClose(); prRefresh(); toast(`Retry scheduled for ${d}`); };
A.recLater=(id)=>{ const c=chem(id), o=[1,3,5].map(k=>RayDates.fmtShort(RayDates.addDays(S.today,k)));
  prOpen(`<div class="pr-sh"><h3>Remind you when?</h3><div class="col gap8 mt12">${[['Tomorrow',o[0]],['In 3 days',o[1]],['In 5 days',o[2]]].map((x,i)=>`<div role="button" class="radio-card rl-opt ${i===0?'on':''}" data-d="${x[1]}" style="padding:11px 14px" onclick="document.querySelectorAll('.rl-opt').forEach(x=>x.classList.remove('on'));this.classList.add('on')"><span class="radio"></span><span class="grow">${x[0]}</span><span class="xs muted">${x[1]}</span></div>`).join('')}</div><p class="small mt12" style="color:var(--strong)">${I('lock',12)} RAY will not contact the buyer yet.</p><div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose()">Cancel</button><button class="btn btn-p" onclick="A.recLaterDo('${id}')">Set reminder</button></div></div>`); };
A.recLaterDo=(id)=>{ const o=document.querySelector('.rl-opt.on'), d=o?o.dataset.d:RayDates.fmtShort(RayDates.addDays(S.today,1)), r=recS(id); r.st='later'; r.when=d;
  log({ic:'cal',ti:`Follow-up scheduled for ${d}`,de:`${chem(id).name} · ${FAILS[id].inv} · failed collection · internal reminder · buyer not contacted`,src:[],who:'Set by '+prWho(),chem:chem(id).name}); prClose(); prRefresh(); toast(`Reminder scheduled for ${d}`); };
A.recAssign=(id)=>{ const f=FAILS[id], c=chem(id), g=gateFor(id,'sm',f.inv);
  if(g.action==='block'){ logBlocked(id,g,'sm'); prRefresh(); return toast(gateNote(g)); }
  recS(id).st='later'; recS(id).when='Salesperson visit';
  log({ic:'truck',ti:`Recovery visit assigned to ${SP[0]}`,de:`${c.name} · ${inr(recoveryOf(id).balance)} · ${f.inv} · failed ${f.m} collection · salesperson app (simulated)`,src:['led'],who:'Approved by '+prWho(),chem:c.name}); prRefresh(); toast('Assigned to '+SP[0]); };

/* ---------- learning from collection outcomes ---------- */
function outcomesCard(){
  const mehta=collSt('mehta')==='received';
  const row=(name,band,t,s,cta,fn,tone)=>`<div class="oc-r"><div style="min-width:200px"><b style="color:var(--strong)">${name}</b> ${bandBadge(band)}</div><div class="grow"><div class="small" style="font-weight:600;color:${tone||'var(--strong)'}">${t}</div><div class="xs muted mt4">${s}</div></div>${cta?`<button class="btn btn-s btn-sm" onclick="${fn}">${cta}</button>`:''}</div>`;
  const changed=RayData.FEATURED.map(b=>b.id).filter(id=>recChanged(id)&&eventsSince(id).length);
  const rows=changed.map(id=>{ const d=decOf(id), r=recOf(id), ev=eventsSince(id).filter(e=>!['CREDIT_APPROVED','CREDIT_KEPT'].includes(e.type));
    return row(chem(id).name,r.band,`Recommended limit ${inr(d.snap.limit)} → ${inr(r.recommendedLimit)} · ${d.snap.terms} → ${r.recommendedTerms} days`,`${ev.map(e=>EV_LABEL[e.type]).join(' · ')}. The same policy re-ran on the new events.`,'Review',`goSec('raahi/buyer/${id}','wc-${id}')`,r.recommendedLimit<d.snap.limit?'var(--r)':'var(--g)'); });
  if(!changed.includes('gupta')){ const ev=eventsSince('gupta').filter(e=>!['CREDIT_APPROVED','CREDIT_KEPT'].includes(e.type));
    rows.push(ev.length?row('Gupta Traders',recOf('gupta').band,'New repayment events · recommendation unchanged',`${ev.map(e=>EV_LABEL[e.type]).join(' · ')}. Partial payments reduce the balance and never add risk.`,'View',"goSec('raahi/buyer/gupta','wc-gupta')")
      :row('Gupta Traders',recOf('gupta').band,`Watching the recovery of ${inr(balOf('gupta','INV-24790'))}`,'UPI Autopay failed on 3 Oct. Each outcome (payment, failure, missed promise) is recorded as an event and re-runs the policy.','View recovery',"go('raahi/recover/gupta')")); }
  const sr=recOf('sethi'), sd=decOf('sethi');
  if(!changed.includes('sethi')) rows.push(row('Sethi Mart',sr.band,sd.status==='approved'?`Future limit raised to ${inr(curLimitOf('sethi'))}`:sr.action==='increase'?`Recommended limit ${inr(curLimitOf('sethi'))} → ${inr(sr.recommendedLimit)}`:'No change recommended',`${sigOf('sethi').debit.streak} consecutive repayments collected through UPI Autopay on the due date · ${sr.network.eligible?'pays other distributors on Razorpay on time too · ':''}increase rule: up to +⅓ per review.`,sd.status==='approved'?null:'Review',"go('raahi/buyer/sethi')",'var(--g)'));
  if(typeof kirS==='function'&&kirS().outcome) rows.push(row('Gupta Kirana Store',recOf('guptak').band,kirS().outcome==='kept'?'Payment commitment kept':'Payment commitment missed',`${inr(KIR.amt-kirS().now)} ${kirS().outcome==='kept'?'paid':'not paid'} by the date the retailer proposed · recorded as a ${kirS().outcome==='kept'?'kept':'missed'} promise event.`,null,null,kirS().outcome==='kept'?'var(--g)':'var(--r)'));
  if(mehta) rows.push(row('Mehta Enterprises',recOf('mehta').band,'On-time Autopay repayment recorded','₹30,000 collected on 6 Oct and matched automatically to INV-24812 · on-time streak extended.',null,null,'var(--g)'));
  return `<div class="card" id="ov-learn"><div class="sec-h"><div><div class="row gap8">${stage('LEARN')}<span class="h3">RAY learns from collection outcomes</span></div><div class="small muted mt4">Outcome-informed recommendations: every recorded payment, failure or promise updates the buyer’s signals and re-runs the policy. No model is trained.</div></div></div>${rows.join('')}</div>`;
}
/* ---------- Overview + Actions blocks ---------- */
function upcomingRows(){ return upKeys().map((id,i)=>{ const u=UPCOMING[id], c=chemView(chem(id)), s=collSt(id);
  return aRow(i,{id:'act-up-'+id,name:c.name,band:c.band,area:u.inv,amt:inr(u.amt),kind:collMethod(id).m,kc:'k-credit',reason:s==='paidbank'?'Paid by NEFT before the attempt · autopay cancelled':s==='received'?'Collected · matched automatically':`${u.when} · ${collMethod(id).m} active`,chan:'Automatic collection',chanIc:collMethod(id).m==='eNACH'?'bank':'refresh',right:s==='received'||s==='paidbank'?doneLine(s==='received'?'Received':'Paid · matched')+`<button class="btn btn-g btn-sm" onclick="go('raahi/collect/${id}')">View</button>`:`<button class="btn btn-s btn-sm" onclick="go('raahi/collect/${id}')">View</button>`}); }).join('')+upMoreRow(); }
function failedRows(){ const act=recoveriesActive(), done=recoveriesDone();
  const rows=act.map((id,i)=>{ const f=FAILS[id], c=chemView(chem(id)), r=recoveryOf(id), open=r.needsAction;
    return aRow(i,{id:'act-fail-'+id,name:c.name,band:c.band,area:f.inv,amt:inr(r.balance),kind:f.m==='eNACH'?'eNACH failed':'Autopay failed',kc:'k-held',reason:open?`${f.reason} · ${f.rec}`:r.label,chan:'Smart recovery',chanIc:'alert',right:open?`<button class="btn btn-p btn-sm" onclick="go('raahi/recover/${id}')">Start recovery</button>`:`<button class="btn btn-g btn-sm" onclick="go('raahi/recover/${id}')">View</button>`}); });
  if(done.length) rows.push(`<div class="chase"><div class="chase-h" style="cursor:default;grid-template-columns:28px minmax(0,1fr) auto"><span class="rank" style="color:var(--g)">${I('check',13,2.6)}</span><div class="small muted">Completed: ${done.map(id=>`${chem(id).name} · ${FAILS[id].inv} recovered in full`).join(' · ')}. No further steps.</div><button class="btn btn-g btn-sm" onclick="go('raahi/recover/${done[0]}')">View</button></div></div>`);
  return rows.join(''); }

/* ---------- buyer lifecycle position (Gupta Traders) ---------- */