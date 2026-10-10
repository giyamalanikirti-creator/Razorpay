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
function collMethod(id){ return S.mand[id] || BASE_M[id] || (id==='newlife' ? {m:'Not set up'} : {m:'Manual'}); }
const isAuto = id => ['UPI Autopay','eNACH'].includes(collMethod(id).m);
const mLabel = m => m==='eNACH'?'eNACH mandate':m==='Manual'?'Manual payment':m;
function methodChip(id, sub){ const c=collMethod(id), m=c.m;
  const cls = m==='UPI Autopay'?'mt-upi':m==='eNACH'?'mt-nach':m==='Not set up'?'mt-none':'mt-man';
  return `<span class="mtag ${cls}">${m==='UPI Autopay'?I('refresh',11,2.4):m==='eNACH'?I('bank',11,2.2):m==='Not set up'?I('minus',11,2.4):I('link',11,2.2)} ${m}${c.st==='pending'?' · pending':''}</span>${sub?`<div class="xs ${sub[1]||'muted'} mt4">${sub[0]}</div>`:''}`;
}

/* ---------- scheduled automatic collections this week ---------- */
const UPCOMING = {
  arora:{inv:'INV-24860', amt:42800, due:'5 Oct', d:5, when:'Today · attempt at 11:00 AM'},
  mehta:{inv:'INV-24812', amt:30000, due:'6 Oct', d:6, when:'Tomorrow, 6 Oct'},
  chawla:{inv:'INV-24930', amt:27600, due:'6 Oct', d:6, when:'Tomorrow, 6 Oct'},
  sethi:{inv:'INV-24940', amt:18900, due:'8 Oct', d:8, when:'Thu, 8 Oct'},
};
const collSt = id => S.coll[id]||'scheduled';
function collStatus(id){ const s=collSt(id);
  if(s==='received') return `<span class="badge b-g">${I('check',11,2.6)} Received · matched automatically</span>`;
  if(s==='progress') return `<span class="badge b-b">Collection in progress</span>`;
  if(s==='paidbank') return `<span class="badge b-g">${I('check',11,2.6)} Paid by NEFT · autopay cancelled</span>`;
  return `<span class="badge b-n">${UPCOMING[id].d===5?'Due today':UPCOMING[id].d===6?'Due tomorrow':'Scheduled'}</span>`; }

/* ---------- failed automatic collections ---------- */
const FAILS = {
  gupta:{inv:'INV-24790', amt:20000, due:'3 Oct 2026', m:'UPI Autopay', on:'Sat, 3 Oct · 10:02 AM', reason:'Insufficient balance', rec:'Send a payment link and allow partial payment.', why:'Gupta Traders has paid in parts before. A partial-payment link lets them start paying now instead of waiting until the full amount is available.'},
};
const recS = id => (S.rec[id]=S.rec[id]||{st:null});
const failOpen = id => !!FAILS[id] && !recS(id).st;
const failCount = () => Object.keys(FAILS).filter(failOpen).length;
function recStatus(id){ const r=recS(id);
  if(id==='gupta'){ const paid=FAILS.gupta.amt-balOf('gupta',FAILS.gupta.inv); if(r.st==='part'||r.st==='learned') return `<span class="badge b-b">${inr(paid)} received · ${inr(balOf('gupta',FAILS.gupta.inv))} remaining</span>`; if(r.st==='sent') return `<span class="badge b-b">Payment link sent · watching</span>`; if(r.st==='later') return `<span class="badge b-n">Follow-up scheduled</span>`; }
  if(id==='singhms'&&r.st==='retry') return `<span class="badge b-b">Retry scheduled · 7 Oct</span>`;
  if(r.st==='later') return `<span class="badge b-n">Follow-up scheduled</span>`;
  if(r.st==='link') return `<span class="badge b-b">Payment link sent</span>`;
  return `<span class="badge b-r">${FAILS[id].m==='eNACH'?'eNACH debit failed':'Autopay failed'}</span>`; }
/* ---------- underwriting: broader but explainable signals, never a score ---------- */
function uwData(id){
  const c=chemView(chem(id)), on=netOn(), s=sigOf(id), r=recOf(id), n=BUY[id].network;
  const w=(bad,good)=>bad?'w':good?'g':'';
  const oldest=nextOpenInv(id), od=oldest?RayDates.diffDays(S.today,oldest.due):0;
  const season={gupta:['Orders are typically 35% higher during the festive period.','No festive increase, because repayment is weakening.','w'],arora:['Orders are typically 35% higher during the festive period.',`The ₹80,000 request fits that pattern. ${r.action==='increase'?'A higher limit for the season is supported.':''}`,'g']}[id]||['Orders are typically 20% higher in October and November.',r.recommendedTerms<s.terms?`Shorter ${r.recommendedTerms}-day terms keep festive exposure in check.`:'Current terms are fine for the season.',''];
  return [
   ['Payment behaviour','rzp',[['Average payment delay',`${s.delay} days · usual ${s.usual}`,w(s.delayVsUsual>=3,s.delayVsUsual<=0)],['Delay trend',s.last3.map(x=>x+'d').join(' → '),w(s.trajectory==='worse',s.trajectory==='better')],['Invoices paid on time',`${s.onTimePaid} of ${s.invoicesPaid} in 6 months`,w(s.onTimePct<75,s.onTimePct>=90)],['Broken payment promises',s.promises.made?`${s.promises.broken} of last ${s.promises.made}`:'None',w(s.promises.broken>0,!s.promises.broken)]]],
   ['Relationship','led',[['Buyer vintage',`Buying from you for ${(s.tenureMonths/12).toFixed(1)} years`,w(false,s.tenureMonths>=36)],['Monthly orders',`${lakh(s.ordersPrev)} → ${lakh(s.ordersNow)}`,''],['Recent order trend',s.ordersChangePct<=-10?`Declining · ${s.ordersChangePct}%`:s.ordersChangePct>=10?`Rising · +${s.ordersChangePct}%`:'Steady',w(s.ordersChangePct<=-10,s.ordersChangePct>=10)]]],
   ['Collection reliability','rzp',s.debit.method==='Manual'?[['Collection method','Manual payments',''],['Partial payments',s.partialPayments?`${s.partialPayments} verified this cycle`:'None',''],['Claims to reconcile',s.claimsPending?`${s.claimsPending} unverified`:'None','']]:[[`${s.debit.method} success rate`,`${s.debit.attempts-s.debit.failures6m} of ${s.debit.attempts} · ${Math.round((s.debit.attempts-s.debit.failures6m)/Math.max(1,s.debit.attempts)*100)}%`,w(s.debit.failures6m>0,!s.debit.failures6m)],['Failed debits',s.debit.failures6m?`${s.debit.failures60d} in 60 days · ${s.debit.failures6m} in 6 months`:'None',w(s.debit.failures60d>0,false)],['On-time collections in a row',String(s.debit.streak),w(false,s.debit.streak>=6)],['Partial-payment behaviour',s.partialPayments?`${s.partialPayments} verified · reduces the balance, never adds risk`:'None','']]],
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
A.repaySetup=(id,limit,terms)=>{ const cur=collMethod(id);
  const sug = cur.m==='UPI Autopay'||cur.m==='eNACH' ? cur.m : limit>=100000 ? 'eNACH' : 'UPI Autopay';
  S.rs={id, limit, terms, pick:sug, sug, step:'choose'}; rsRender(); };
function rsRender(){
  const r=S.rs; if(!r) return; const c=chem(r.id), cur=collMethod(r.id), first=c.name.split(' ')[0];
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
A.rsSkip=()=>{ const c=chem(S.rs.id); log({ic:'clock',ti:`Repayment setup skipped for ${c.name}`,de:`Current method kept: ${mLabel(collMethod(S.rs.id).m)}`,src:[],who:prWho(),chem:c.name}); S.rs=null; prClose(); prRefresh(); };
A.rsNext=()=>{ const r=S.rs, c=chem(r.id);
  if(r.pick==='Manual'){ S.mand[r.id]={m:'Manual'}; log({ic:'link',ti:`Repayment method set: manual payment for ${c.name}`,de:`Payment links on each invoice · RAY reconciles payments as they arrive · limit ${inr(r.limit)} · ${r.terms} days`,src:['led'],who:'Approved by '+prWho(),chem:c.name}); S.rs=null; prClose(); prRefresh(); toast('Repayment method saved · manual payment'); return; }
  r.step=r.pick==='UPI Autopay'?'upi':'nach'; rsRender(); };
A.rsSend=()=>{ const r=S.rs, c=chem(r.id); r.step='wait'; rsRender();
  log({ic:'send',ti:`${r.pick==='UPI Autopay'?'UPI Autopay':'eNACH mandate'} request sent to ${c.name}`,de:`Maximum ${inr(r.limit)} · ${r.pick==='UPI Autopay'?'on invoice due dates':'as invoices become due'} · buyer authorises in their ${r.pick==='UPI Autopay'?'UPI app':'bank'}`,src:['conv'],who:'Approved by '+prWho(),chem:c.name});
  setTimeout(()=>{ if(!S.rs) return; S.mand[r.id]={m:r.pick, max:r.limit}; r.step='active';
    log({ic:'check',ti:`${r.pick==='UPI Autopay'?'UPI Autopay':'Bank mandate'} active for ${c.name}`,de:`Authorised by the buyer · maximum ${inr(r.limit)} · RAY cannot debit beyond this mandate`,src:['rzp'],who:`${c.name} · ${r.pick==='UPI Autopay'?'UPI app':'net banking'}`,chem:c.name});
    rsRender(); rr(); },2200); };

/* ---------- REPAYMENT PLAN (buyer profile) ---------- */
const PLAN = { gupta:{inv:'INV-24891', amt:38400, d:12}, mehta:{inv:'INV-24812', amt:30000, d:6}, arora:{inv:'INV-24860', amt:42800, d:5}, chawla:{inv:'INV-24930', amt:27600, d:6}, sethi:{inv:'INV-24940', amt:18900, d:8} };
const dayLbl = n => n<=0?`${30+n} Sep`:`${n} Oct`;
function planSteps(id){
  const p=PLAN[id], c=chemView(chem(id)), m=collMethod(id).m, auto=m==='UPI Autopay'||m==='eNACH', watch=c.band!=='Reliable', st=[];
  const dd=k=>`${k} Oct`, today=5;
  const tag=(d,doneTxt)=> d<today?`<span class="badge b-g">${I('check',10,2.6)} ${doneTxt||'Done'}</span>`:d===today?'<span class="badge b-b">Today</span>':'';
  if(watch) st.push([p.d-7,'Early follow-up','Watch buyer: RAY starts 7 days before the due date.', id==='gupta'&&S.chase.gupta.st!=='draft'?`<span class="badge b-g">${I('check',10,2.6)} Sent</span>`:id==='gupta'?'<span class="badge b-b">Today · needs approval</span>':tag(p.d-7)]);
  st.push([p.d-3,'Pre-due reminder', auto?'WhatsApp via RAY. Mentions the mandate and the due date.':'WhatsApp via RAY with a payment link.', tag(p.d-3,'Sent')]);
  if(auto) st.push([p.d-1,'Upcoming debit notification', m==='eNACH'?'Pre-debit notice to the buyer before the mandate debit.':'Pre-debit notice through the buyer’s UPI app.', tag(p.d-1,'Sent')]);
  st.push([p.d, auto?(m==='eNACH'?'eNACH debit':'Autopay attempt'):'Due-date reminder', auto?`Collects ${inr(p.amt)} within the authorised mandate.`:'Payment link resent if unpaid.', p.d===today?'<span class="badge b-b">Today</span>':'']);
  return st;
}
function planCard(id){
  const p=PLAN[id]; if(!p) return '';
  const c=chem(id), m=collMethod(id).m, auto=m==='UPI Autopay'||m==='eNACH', s=collSt(id);
  const done = s==='received'?`<div class="alert ok mt12" style="padding:12px 14px"><span class="ic" style="width:28px;height:28px">${I('check',15,2.4)}</span><div class="grow small"><b style="color:var(--strong)">Payment received · ${inr(p.amt)} · ${p.inv}</b><div class="muted">${m} · ${id==='mehta'?'6 Oct, 10:42 AM':'today'} · matched automatically</div></div></div>`
    : s==='paidbank'?`<div class="alert ok mt12" style="padding:12px 14px"><span class="ic" style="width:28px;height:28px">${I('bank',15,2)}</span><div class="grow small"><b style="color:var(--strong)">Paid by NEFT before the autopay attempt</b><div class="muted">₹42,800 received 10:16 AM and matched from your bank account. RAY cancelled the autopay attempt. It never collects twice.</div></div></div>`:'';
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
   : s==='paidbank' ? `<div class="coll-st ok"><span class="lbl" style="color:var(--g)">Autopay attempt cancelled</span><div class="small mt8" style="color:var(--strong)">₹42,800 was already received by NEFT at 10:16 AM and matched to INV-24860 from your bank account. RAY does not collect twice.</div></div>`
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
  const f=FAILS[id], r=recS(id), routine=S.ctl.auto==='routine'&&chemView(chem(id)).band==='Reliable';
  const base=id==='gupta'?3:2; const d=k=>`${base+k} Oct`;
  const cur = id==='gupta' ? (r.st==='part'||r.st==='learned'?2:r.st==='sent'?1:1) : (r.st==='retry'?1:1);
  const stages=[[d(0),'Due date',`${f.m==='eNACH'?'eNACH debit':'Autopay attempt'} · failed: ${f.reason.toLowerCase()}`],[d(1),'Day +1','WhatsApp reminder + payment link'],[d(3),'Day +3','Second reminder · allow partial payment'],[d(5),'Day +5','Salesperson follow-up'],[d(7),'Day +7','RAY recommends: review credit exposure']];
  return `<div class="dun mt12">${stages.map((s,i)=>`<div class="dun-i ${i===0?'ko':i<cur?'done':i===cur?'cur':''}"><span class="dun-k">${s[1]}</span><span class="dun-d">${s[0]}</span><span class="dun-t">${s[2]}</span>${i===cur?`<span class="dun-now">${id==='gupta'&&r.st==='sent'?'Link sent':id==='gupta'&&(r.st==='part'||r.st==='learned')?'₹15,000 left':routine?'Automatic':'Needs approval'}</span>`:''}</div>`).join('')}</div>
   <div class="xs muted mt8">${routine?'Routine account: automatic follow-up within your configured limits.':'Review first: RAY prepares each step and you approve before anything is sent. Routine accounts can use automatic follow-up within your limits.'}</div>`;
}
function recBody(id,mob){
  const f=FAILS[id], c=chemView(chem(id)), r=recS(id);
  const btn=(cls,lbl,fn)=>mob?`<button class="mbtn ${cls==='btn-p'?'p':cls==='btn-g'?'g':''}" onclick="${fn}">${lbl}</button>`:`<button class="btn ${cls}" onclick="${fn}">${lbl}</button>`;
  const fail=`<div class="fail-box mt12"><div class="row between wrap gap8"><span class="fail-k">${f.m==='eNACH'?'eNACH DEBIT FAILED':'AUTOPAY FAILED'}</span><span class="xs muted">${f.on}</span></div><div class="mob-amt mt4" style="font-size:22px;color:var(--strong)">${inr(f.amt)}</div><div class="small mt4"><span class="muted">Reason:</span> <b style="color:var(--strong)">${f.reason}</b></div><div class="xs muted mt8">Not marked as defaulted. A failed debit starts a recovery plan, not a block on the buyer.</div></div>`;
  let main='';
  if(id==='gupta'&&r.st==='sent') main=`<div class="pr-res"><div class="row gap8"><span class="badge b-b">Payment link sent</span><span class="xs muted">${r.at||'10:05 AM'} · WhatsApp via RAY</span></div><div class="small mt8" style="color:var(--strong)">₹20,000 · partial payment allowed · minimum ₹5,000</div><div class="mt8">${thinking('Watching Razorpay for a payment against INV-24790…')}</div>${btn('btn-s','Prototype: buyer pays ₹5,000',`A.recPay('gupta')`)}</div>`;
  else if(id==='gupta'&&(r.st==='part'||r.st==='learned')) main=`<div class="event mt12"><span class="ic">${I('rupee',17,2)}</span><div class="grow"><div style="font-weight:600;color:var(--strong)">₹5,000 received <span class="xs muted" style="font-weight:500">· Razorpay Payment Link · ${r.paidAt||'11:20 AM'}</span></div><div class="small">Matched automatically to <b>INV-24790</b>. Remaining <b class="num">₹15,000</b>.</div></div><span class="badge b-g">Invoice updated</span></div>
    <div class="small mt8" style="color:var(--strong)">${I('shield',13,2)} Credit decision kept under review. Gupta Traders is not blocked.</div>
    ${mob?'':whatChangedCard(id)}
    <div class="row gap6 mt12 wrap"><span class="xs muted">Next outcome (simulated):</span>${btn('btn-g',`Next ${f.m} attempt fails`,`A.ocFail('${id}')`)}${openPromise(id)?btn('btn-g','Promise date passes unpaid',`A.ocMiss('${id}')`):''}${btn('btn-g','Balance paid',`A.ocPay('${id}')`)}</div>`;
  else if(id==='singhms'&&r.st==='retry') main=`<div class="pr-res"><span class="badge b-b">Retry scheduled · 7 Oct</span><div class="small mt8" style="color:var(--strong)">One retry of ${inr(f.amt)} within the ${inr(collMethod(id).max)} eNACH mandate. If it fails again, RAY moves to a payment link.</div></div>`;
  else if(r.st==='later') main=`<div class="pr-res"><span class="badge b-n">Follow-up scheduled · ${r.when||'8 Oct'}</span><div class="xs muted mt8">Internal reminder. The buyer has not been contacted.</div></div>`;
  const acts = r.st ? '' : id==='gupta'
    ? `<div class="pr-acts ${mob?'mob':''}" style="grid-template-columns:${mob?'1fr':'repeat(3,minmax(0,1fr))'}">${btn('btn-p','Send payment link',`A.recLink('gupta')`)}${btn('btn-s','Remind later',`A.recLater('gupta')`)}${btn('btn-g','Assign to salesperson',`A.recAssign('gupta')`)}</div>`
    : `<div class="pr-acts ${mob?'mob':''}" style="grid-template-columns:${mob?'1fr':'repeat(3,minmax(0,1fr))'}">${btn('btn-p','Schedule retry',`A.recRetry('${id}')`)}${btn('btn-s','Send payment link',`A.recLink('${id}')`)}${btn('btn-g','Remind later',`A.recLater('${id}')`)}</div>`;
  return `<div class="pr-kv ${mob?'mob':''}"><div><span>Buyer</span><b>${c.name}</b></div><div><span>Invoice</span><b>${f.inv}</b></div><div><span>Amount</span><b class="num">${inr(f.amt)}</b></div><div><span>Method</span><b>${f.m}</b></div></div>
   <div class="row gap8 mt12 wrap"><span class="xs muted" style="font-weight:600">Status</span>${recStatus(id)}${bandBadge(c.band)}</div>
   ${fail}
   ${r.st?'':`<div class="pr-note mt12"><span class="ai-tag">${clover(13)} RAY</span><div><div class="small" style="color:var(--strong);font-weight:600">${f.rec}</div><div class="xs muted mt4">${f.why}</div></div></div>`}
   ${main}${acts}
   <div class="lbl mt16">Recovery sequence</div>${dunning(id)}
   <div class="xs muted mt12 row gap4">${I('shield',12)} Before every step RAY checks Razorpay, your bank account and salesperson collections, so no one is chased after paying.</div>`;
}
function vRecover(id){ if(!FAILS[id]) return '<div class="empty">Not found</div>';
  return `<div class="crumb mt20" style="margin-bottom:0"><a onclick="goSec('raahi/actions','grp-failed')">${I('arrowL',14,2)} Failed collections</a></div><div style="max-width:920px">${pageHead('Smart recovery','A failed automatic collection, with a staged plan to recover it.')}<div class="card pad mt16">${recBody(id,false)}</div></div>`; }

A.recLink=(id,edit)=>{ const f=FAILS[id], c=chem(id), first=c.name.split(' ')[0], r=recS(id);
  const msg=r.msg||`Hi ${first} ji, the scheduled payment for ${inr(f.amt)} could not be completed. You can pay part or all of the amount using this link.`;
  prOpen(`<div class="pr-sh"><h3>Create Razorpay Payment Link</h3>
   <div class="pr-kv"><div><span>Invoice</span><b>${f.inv}</b></div><div><span>Amount</span><b class="num">${inr(f.amt)}</b></div><div><span>To</span><b>${c.name}</b></div></div>
   <div class="setrow mt12" style="padding:10px 0;border-top:1px solid var(--border-subtle)"><div class="t"><b>Allow partial payment</b><span>The buyer can pay any amount above the minimum</span></div><span class="badge b-g">YES</span></div>
   <div class="field mt8"><label>Minimum amount</label><input class="input num" id="rl-min" value="₹5,000" style="max-width:160px"></div>
   <div class="xs muted mt12" style="font-weight:600">Message</div>
   ${edit?`<textarea class="textarea mt4" id="rl-msg" rows="3">${esc(msg)}</textarea>`:`<div class="wa-preview mt4"><div class="wa-bubble">${esc(msg)}<span class="lnk">rzp.io/i/AMA-${f.inv.slice(4)}</span></div></div>`}
   <div class="xs muted mt8">RAY checked Razorpay payments, your bank account, unmatched credits and salesperson collections. No payment found for ${f.inv}.</div>
   <div class="pr-btns mt16"><button class="btn btn-g" onclick="prClose()">Cancel</button>${edit?`<button class="btn btn-s" onclick="recS('${id}').msg=document.getElementById('rl-msg').value;A.recLink('${id}')">Save message</button>`:`<button class="btn btn-s" onclick="A.recLink('${id}',true)">Edit message</button>`}<button class="btn btn-p" onclick="${edit?`recS('${id}').msg=document.getElementById('rl-msg').value;`:''}A.recSend('${id}')">${I('chat',14,2.2)} Send on WhatsApp</button></div></div>`); };
A.recSend=(id)=>{ const f=FAILS[id], c=chem(id), r=recS(id); r.st=id==='gupta'?'sent':'link'; r.at=nowT();
  log({ic:'link',ti:`Partial-payment link sent to ${c.name}`,de:`${inr(f.amt)} · ${f.inv} · minimum ₹5,000 · Razorpay Payment Link · WhatsApp via RAY`,src:['rzp','conv'],who:'Approved by '+prWho(),chem:c.name});
  prClose(); prRefresh(); toast('Payment link sent to '+c.name); };
A.recPay=(id)=>{ const r=recS(id); if(r.st!=='sent') return; const f=FAILS[id];
  const res=ledgerPay(id, f.inv, 5000, {type:'PAYMENT_RECEIVED', source:'Razorpay Payment Link', actor:'Razorpay', ref:'plink-'+f.inv+'-1'}); if(!res.ok) return toast('Payment not recorded');
  r.st='part'; r.paidAt=nowT();
  log({ic:'rupee',ti:`₹5,000 received from ${chem(id).name}`,de:`Razorpay Payment Link · matched to ${f.inv} · verified · ${inr(balOf(id,f.inv))} remaining · partial payments never add risk`,src:['rzp'],who:'Razorpay',chem:chem(id).name});
  prRefresh(); toast(`₹5,000 received · ${f.inv} updated`); };

A.recRetry=(id)=>{ const f=FAILS[id], c=chem(id);
  prOpen(`<div class="pr-sh"><h3>Retry the debit on 7 Oct?</h3><div class="pr-kv"><div><span>Buyer</span><b>${c.name}</b></div><div><span>Amount</span><b class="num">${inr(f.amt)}</b></div><div><span>Mandate</span><b>eNACH · up to ${inr(collMethod(id).max)}</b></div></div><p class="small muted mt12">One retry within the authorised mandate. The buyer gets a pre-debit notice. If it fails again, RAY recommends a payment link.</p><div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose()">Cancel</button><button class="btn btn-p" onclick="A.recRetryDo('${id}')">Schedule retry</button></div></div>`); };
A.recRetryDo=(id)=>{ const f=FAILS[id], c=chem(id); recS(id).st='retry';
  log({ic:'refresh',ti:`eNACH retry scheduled for ${c.name}`,de:`${inr(f.amt)} · ${f.inv} · 7 Oct · within the authorised mandate`,src:['rzp'],who:'Approved by '+prWho(),chem:c.name}); prClose(); prRefresh(); toast('Retry scheduled for 7 Oct'); };
A.recLater=(id)=>{ const c=chem(id);
  prOpen(`<div class="pr-sh"><h3>Remind you when?</h3><div class="col gap8 mt12">${[['Tomorrow','6 Oct'],['In 3 days','8 Oct'],['On the Day +5 step','8 Oct']].map((o,i)=>`<div role="button" class="radio-card rl-opt ${i===0?'on':''}" data-d="${o[1]}" style="padding:11px 14px" onclick="document.querySelectorAll('.rl-opt').forEach(x=>x.classList.remove('on'));this.classList.add('on')"><span class="radio"></span><span class="grow">${o[0]}</span><span class="xs muted">${o[1]}</span></div>`).join('')}</div><p class="small mt12" style="color:var(--strong)">${I('lock',12)} RAY will not contact the buyer yet.</p><div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose()">Cancel</button><button class="btn btn-p" onclick="A.recLaterDo('${id}')">Set reminder</button></div></div>`); };
A.recLaterDo=(id)=>{ const o=document.querySelector('.rl-opt.on'), d=o?o.dataset.d:'6 Oct', r=recS(id); r.st='later'; r.when=d;
  log({ic:'cal',ti:`Follow-up scheduled for ${d}`,de:`${chem(id).name} · ${FAILS[id].inv} · failed collection · internal reminder · buyer not contacted`,src:[],who:'Set by '+prWho(),chem:chem(id).name}); prClose(); prRefresh(); toast(`Reminder scheduled for ${d}`); };
A.recAssign=(id)=>{ const f=FAILS[id], c=chem(id); recS(id).st='later'; recS(id).when='Salesperson visit';
  log({ic:'truck',ti:`Recovery visit assigned to ${SP[0]}`,de:`${c.name} · ${inr(f.amt)} · ${f.inv} · failed ${f.m} collection`,src:['led'],who:'Approved by '+prWho(),chem:c.name}); prRefresh(); toast('Assigned to '+SP[0]); };

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
function upcomingRows(){ return Object.keys(UPCOMING).map((id,i)=>{ const u=UPCOMING[id], c=chemView(chem(id)), s=collSt(id);
  return aRow(i,{id:'act-up-'+id,name:c.name,band:c.band,area:u.inv,amt:inr(u.amt),kind:collMethod(id).m,kc:'k-credit',reason:s==='paidbank'?'Paid by NEFT before the attempt · autopay cancelled':s==='received'?'Collected · matched automatically':`${u.when} · ${collMethod(id).m} active`,chan:'Automatic collection',chanIc:collMethod(id).m==='eNACH'?'bank':'refresh',right:s==='received'||s==='paidbank'?doneLine(s==='received'?'Received':'Paid · matched')+`<button class="btn btn-g btn-sm" onclick="go('raahi/collect/${id}')">View</button>`:`<button class="btn btn-s btn-sm" onclick="go('raahi/collect/${id}')">View</button>`}); }).join(''); }
function failedRows(){ return Object.keys(FAILS).map((id,i)=>{ const f=FAILS[id], c=chemView(chem(id)), open=failOpen(id);
  return aRow(i,{id:'act-fail-'+id,name:c.name,band:c.band,area:f.inv,amt:inr(f.amt),kind:f.m==='eNACH'?'eNACH failed':'Autopay failed',kc:'k-held',reason:open?`${f.reason} · ${f.rec}`:recStatus(id).replace(/<[^>]+>/g,''),chan:'Smart recovery',chanIc:'alert',right:open?`<button class="btn btn-p btn-sm" onclick="go('raahi/recover/${id}')">${id==='gupta'?'Start recovery':'Review retry'}</button>`:`<button class="btn btn-g btn-sm" onclick="go('raahi/recover/${id}')">View</button>`}); }).join(''); }

/* ---------- buyer lifecycle position (Gupta Traders) ---------- */