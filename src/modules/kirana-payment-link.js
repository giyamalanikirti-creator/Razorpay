/* ================= KIRANA PAYMENT LINK: the retailer side of the same transaction ================= */
/* No retailer app, login or onboarding. The kirana only sees an enhanced Razorpay payment link sent by the
   distributor on WhatsApp. Everything the kirana does flows back into the distributor's RAY Credit workspace.
   Payments here are simulated: no money moves in this prototype. */

const KIR = { id:'guptak', inv:'INV-2048', amt:40000, issued:'2 Sep 2026', due:'2 Oct 2026', dueTxt:'3 days overdue', link:'rzp.io/i/AGD-2048', ph:'+91 98••••5521' };
const KIR_ROUTE = 'pay/INV-2048';

/* ---------- dates: demo "today" is Mon, 5 Oct 2026; never propose a date that has passed ---------- */
const K_TODAY = new Date(2026,9,5);
const K_WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'], K_MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const kAdd = n => { const d=new Date(K_TODAY); d.setDate(d.getDate()+n); return d; };
const kIso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const kParse = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const kFmt = s => { const d=kParse(s); return `${K_WD[d.getDay()]}, ${d.getDate()} ${K_MO[d.getMonth()]} ${d.getFullYear()}`; };
const kShort = s => { const d=kParse(s); return `${d.getDate()} ${K_MO[d.getMonth()]}`; };
function kNextFourth(){ const d=new Date(K_TODAY); if(d.getDate()>=4) d.setMonth(d.getMonth()+1); d.setDate(4); return kIso(d); }
/* distributor's pre-authorised rules for payment plans (also shown in Controls) */
const K_AUTO_DAYS = 14, K_MAX_DAYS = 45;
const kAutoMax = () => kIso(kAdd(K_AUTO_DAYS)), kMax = () => kIso(kAdd(K_MAX_DAYS)), kMin = () => kIso(kAdd(1));
const kNeedsApproval = s => s > kAutoMax();

/* ---------- shared state (lazily created so demo reset works) ---------- */
function kirS(){ if(!S.kir) S.kir={sent:false, sentAt:null, msg:null, editing:false, view:'home', now:15000, date:kNextFourth(), opt:'sugg', paying:false,
  kind:null, pay:'none', commit:'none', outcome:null, dispute:null, notif:false, submittedAt:null}; return S.kir; }
const kBal = () => KIR.amt - kirS().now;
const kirMsg = () => kirS().msg || `Namaste Gupta ji, Agarwal Distributors ka ₹40,000 (INV-2048) pending hai. Is secure Razorpay link se abhi pay karein, apne cash flow ke hisaab se payment schedule karein, ya koi issue ho toh dispute raise karein.`;
const PAY_ST = {none:'Not paid', initiated:'Payment initiated · simulated, not yet collected', received:'Received · simulated'};
const COMMIT_ST = {none:'No commitment', pending:'Pending your approval', auto:'Confirmed within your plan rules', approved:'Approved by you', rejected:'Rejected · original due date stands'};
function kirStatus(){ const k=kirS();
  if(k.kind==='dispute') return '<span class="badge b-a">Dispute raised</span>';
  if(k.kind==='full') return k.pay==='received'?'<span class="badge b-g">Paid · simulated</span>':'<span class="badge b-b">Full payment initiated · simulated</span>';
  if(k.kind==='plan'){ if(k.outcome==='kept') return '<span class="badge b-g">Commitment kept</span>'; if(k.outcome==='missed') return '<span class="badge b-r">Commitment missed</span>';
    return k.commit==='pending'?'<span class="badge b-a">Commitment pending approval</span>':k.commit==='rejected'?'<span class="badge b-r">Plan rejected</span>':'<span class="badge b-b">Payment plan active</span>'; }
  return k.sent?'<span class="badge b-n">Payment link sent</span>':'<span class="badge b-r">3 days overdue</span>'; }

/* ================= DISTRIBUTOR SIDE ================= */
/* 1. send payment link (AI-drafted message, distributor approves before sending) */
A.kirSend=()=>{ const k=kirS(), c=chem(KIR.id);
  modal({wide:true,title:'Send payment link',body:`
   <div class="pr-kv" style="grid-template-columns:repeat(4,minmax(0,1fr))"><div><span>Retailer</span><b>${c.name}</b></div><div><span>Distributor</span><b>${M.name}</b></div><div><span>Outstanding invoice</span><b class="num">${inr(KIR.amt)}</b></div><div><span>Invoice reference</span><b>${KIR.inv}</b></div></div>
   <div class="row between mt16"><span class="xs muted" style="font-weight:600">WhatsApp message · drafted by RAY</span><span class="ai-tag" style="font-size:11px">${clover(11)} RAY</span></div>
   ${k.editing?`<textarea class="textarea mt8" id="kir-msg" rows="3">${esc(kirMsg())}</textarea>`:`<div class="wa-preview mt8"><div class="wa-bubble">${esc(kirMsg())}<span class="lnk">${KIR.link}</span></div></div>`}
   <div class="kir-opts mt12"><span class="xs muted" style="font-weight:600">The link lets ${c.name} choose</span><div class="row gap6 mt8 wrap"><span class="kchip">${I('rupee',12,2.2)} Pay now</span><span class="kchip hl">${I('cal',12,2.2)} Schedule payment</span><span class="kchip">${I('alert',12,2.2)} Raise dispute</span></div></div>
   <div class="ol-note mt12"><span style="color:var(--link);flex-shrink:0">${I('lock',14,2)}</span><span>Any new payment date is a proposal. Dates within ${K_AUTO_DAYS} days follow your plan rules; later dates come back to you for approval. Nothing is collected automatically without a separate mandate.</span></div>
   <div class="xs muted mt8">Prototype: delivery is simulated. No real WhatsApp message is sent.</div>`,
   actions:[{label:'Cancel'},{label:k.editing?'Save message':'Edit message',fn:()=>{ if(k.editing){ const t=document.getElementById('kir-msg'); if(t) k.msg=t.value; } k.editing=!k.editing; A.kirSend(); }},{label:'Preview kirana experience',fn:()=>{ closeModal(); A.kirPreview(); }},{label:k.sent?'Send again':'Approve and send',cls:'btn-p',id:'kir-send',fn:()=>{ closeModal(); kirDoSend(); }}]}); };
function kirDoSend(quiet){ const k=kirS(), first=!k.sent; k.sent=true; k.sentAt=nowT();
  if(first) log({ic:'link',ti:'Payment link sent to Gupta Kirana Store',de:`${KIR.inv} · ${inr(KIR.amt)} · ${KIR.link} · options: pay now, schedule payment, raise dispute · delivery simulated in prototype`,src:['conv','rzp'],who:'Approved by '+M.owner+' · Dashboard',chem:'Gupta Kirana Store'});
  if(!quiet){ rr(); toast('Payment link sent (simulated)',{label:'Preview kirana experience',fn:()=>A.kirPreview()}); } }
A.kirPreview=()=>{ const k=kirS(); if(!k.sent) kirDoSend(true); if(!k.kind) k.view='home'; A.closeWA&&A.closeWA(); S.mob&&A.closeMobile(); go(KIR_ROUTE); };

/* 2. what the distributor sees once the kirana acts */
A.kirApprove=()=>{ const k=kirS(); k.commit='approved'; k.notif=false; kirCommitEvent();
  log({ic:'check',ti:'Payment plan approved for Gupta Kirana Store',de:`${inr(kBal())} proposed for ${kFmt(k.date)} · added to the collections forecast as an expected inflow, not guaranteed`,src:['conv'],who:'Approved by '+M.owner+' · Dashboard',chem:'Gupta Kirana Store'});
  rr(); toast('Plan approved · forecast updated'); };
A.kirReject=()=>modal({title:'Reject the proposed date?',body:`<p class="muted">The ${inr(kBal())} balance stays due on the original terms. RAY will not message Gupta Kirana Store. You tell them what you can accept.</p>`,actions:[{label:'Cancel'},{label:'Reject proposed date',cls:'btn-d',fn:()=>{ closeModal(); const k=kirS(); k.commit='rejected'; k.notif=false;
  log({ic:'x',ti:'Payment plan rejected for Gupta Kirana Store',de:`Proposed ${kFmt(k.date)} not accepted · balance due on original terms`,src:['conv'],who:'Decided by '+M.owner+' · Dashboard',chem:'Gupta Kirana Store'}); rr(); toast('Proposed date rejected'); }}]});
A.kirPaid=()=>{ const k=kirS(); k.pay='received'; S.adj[KIR.id]=(S.adj[KIR.id]||0)+(k.kind==='full'?KIR.amt:k.now); ledgerPay(KIR.id, KIR.inv, k.kind==='full'?KIR.amt:k.now, {source:'Razorpay Payment Link (simulated)', actor:'Razorpay', ref:'kir-now-'+KIR.inv});
  log({ic:'rupee',ti:`${inr(k.kind==='full'?KIR.amt:k.now)} received from Gupta Kirana Store (simulated)`,de:`${KIR.inv} · Razorpay payment link · matched automatically · prototype simulation, no money moved`,src:['rzp'],who:'Razorpay',chem:'Gupta Kirana Store'}); rr(); toast('Payment marked received (simulated)'); };
const kirCommitEvent=()=>{ const k=kirS(); if(!evOf(KIR.id).some(e=>e.type==='PROMISE_RECORDED')) recordEvent({type:'PROMISE_RECORDED', buyerId:KIR.id, invoice:KIR.inv, amount:kBal(), source:'Retailer payment page (Razorpay link)', actor:'Gupta Kirana Store', meta:{date:k.date, commit:k.commit}},{quiet:true}); };
A.kirOutcome=(o)=>{ const k=kirS(); k.outcome=o; kirCommitEvent();
  if(o==='kept'){ ledgerPay(KIR.id, KIR.inv, kBal(), {source:'Razorpay Payment Link (simulated)', ref:'kir-bal-'+KIR.inv}); recordEvent({type:'PROMISE_KEPT', buyerId:KIR.id, invoice:KIR.inv, source:'Ledger check', actor:'RAY'},{quiet:true}); }
  else recordEvent({type:'PROMISE_MISSED', buyerId:KIR.id, invoice:KIR.inv, amount:kBal(), source:'Ledger check', actor:'RAY'},{quiet:true});
  log({ic:o==='kept'?'check':'alert',ti:`Gupta Kirana Store ${o==='kept'?'kept':'missed'} its payment commitment`,de:`${inr(kBal())} ${o==='kept'?'paid':'not paid'} by ${kFmt(k.date)} · recorded as a repayment behaviour signal for future recommendations`,src:['rzp','conv'],who:'RAY',chem:'Gupta Kirana Store'});
  rr(); toast(o==='kept'?'Commitment kept · added to repayment record':'Commitment missed · RAY will factor this in'); };

function kirNotif(){ const k=kirS(); if(!k.notif||k.kind!=='plan') return '';
  return `<div class="alert info mt16" id="kir-notif"><span class="ic">${I('cal',17,2)}</span><div class="grow"><h4>New payment commitment from Gupta Kirana Store</h4><div class="small" style="color:var(--strong)">${inr(k.now)} payable now. ${inr(kBal())} proposed for ${kFmt(k.date)}.</div><div class="xs muted mt4">${k.commit==='pending'?`Outside your ${K_AUTO_DAYS}-day plan rules, so it needs your approval.`:'Within your plan rules, so it was confirmed automatically.'} The ${inr(k.now)} payment is simulated in this prototype.</div></div><button class="btn btn-p btn-sm" onclick="goSec('raahi/invoice/${KIR.inv}','kir-commit')">Review commitment</button></div>`; }

/* collections forecast: approved commitments count as expected inflow, never as guaranteed revenue */
function kirForecastRow(){ const k=kirS(), inForecast=k.kind==='plan'&&['approved','auto'].includes(k.commit)&&!k.outcome;
  const base=forecast30(), extra=inForecast?kBal():0, ks=sigOf('guptak');
  const sub=k.kind==='plan'&&k.commit==='pending'?`Gupta Kirana Store’s ${inr(kBal())} commitment awaits your approval, so it is not in the forecast yet`
    :inForecast?`Includes ${inr(kBal())} expected from Gupta Kirana Store on ${kShort(k.date)} · expected, not guaranteed · track record: ${ks.promises.made?`${ks.promises.kept} of ${ks.promises.made} past promises kept`:'no promise history'}`
    :'Rule-based: invoices due in 30 days from Reliable buyers, plus approved payment commitments. Expected, not guaranteed.';
  return `<div class="ov-row" id="ov-fc"><span class="ov-ic" style="background:#eef4ff;color:var(--link)">${I('tup',16,2)}</span><div class="grow"><div style="font-weight:600;color:var(--strong)">Collections forecast · next 30 days: ${lakhs(base+extra)} expected</div><div class="small muted mt4">${sub}</div></div>${inForecast?'<span class="badge b-b">Expected, not guaranteed</span>':''}</div>`; }
function kirOverviewRow(){ const k=kirS();
  const t=k.kind==='plan'?`Gupta Kirana Store · payment plan · ${inr(k.now)} now, ${inr(kBal())} on ${kShort(k.date)}`:k.kind==='dispute'?'Gupta Kirana Store · INV-2048 disputed':k.kind==='full'?'Gupta Kirana Store · ₹40,000 full payment initiated':'Gupta Kirana Store · INV-2048 · ₹40,000 · 3 days overdue';
  const s=k.kind?`${COMMIT_ST[k.commit]||''}${k.kind==='plan'?' · '+PAY_ST[k.pay]:''}`:k.sent?'Payment link sent · waiting for the retailer':'At-risk invoice · RAY recommends a payment link with a payment-plan option';
  return `<div class="ov-row" id="ov-kir"><span class="ov-ic" style="${k.kind?'background:#eef4ff;color:var(--link)':'background:var(--r-bg);color:var(--r)'}">${I(k.kind?'cal':'receipt',16,2)}</span><div class="grow"><div style="font-weight:600;color:var(--strong)">${t}</div><div class="small muted mt4">${s}</div></div><button class="btn ${k.kind==='plan'&&k.commit==='pending'?'btn-p':'btn-s'} btn-sm" onclick="go('raahi/invoice/${KIR.inv}')">${k.kind==='plan'&&k.commit==='pending'?'Review commitment':'Open invoice'}</button></div>`; }

/* 3. invoice detail (desktop) */
function vKirInvoice(){
  const k=kirS(), c=chemView(chem(KIR.id)), plan=k.kind==='plan';
  const kv=`<div class="pr-kv" style="grid-template-columns:repeat(5,minmax(0,1fr))"><div><span>Retailer</span><b>${c.name}</b></div><div><span>Invoice</span><b>${KIR.inv}</b></div><div><span>Amount</span><b class="num">${inr(KIR.amt)}</b></div><div><span>Due</span><b>${KIR.due}</b><em>${KIR.dueTxt}</em></div><div><span>Status</span><b style="font-size:12.5px">${kirStatus()}</b></div></div>`;
  const rec=`<div class="card pad mt16 rec"><div class="row between"><div class="row gap8">${stage('COLLECT')}<span class="h3">RAY recommendation</span></div><span class="ai-tag">${clover(14)} RAY</span></div>
    <div class="say mt12">Send a payment link that lets Gupta Kirana Store pay part now and propose a date for the rest.</div>
    <div class="col gap6 mt12 small">${['Usually settles around the 4th of the month (6 of the last 8 invoices)','3 days overdue on ₹40,000, with no broken promises in 90 days','A plan option is more likely to recover part of the amount now than a full-amount reminder'].map(x=>`<div class="row gap8" style="align-items:flex-start"><span style="color:var(--link);flex-shrink:0;margin-top:2px">${I('check',13,2.4)}</span>${x}</div>`).join('')}</div>
    <div class="xs muted mt8">Illustrative signals from synthetic demo data.</div>
    <div class="row gap8 mt16 wrap"><button class="btn btn-p" onclick="A.kirSend()">${k.sent?'Send payment link again':'Send payment link'}</button><button class="btn btn-s" onclick="A.kirPreview()">Preview kirana experience</button>${k.sent?`<span class="row gap6 small" style="color:var(--g)">${I('check',14,2.4)} Link sent ${k.sentAt||''} · simulated delivery</span>`:''}</div></div>`;
  let cm='';
  if(plan){ const pend=k.commit==='pending';
    cm=`<div class="card pad mt16 ${pend?'kir-pend':''}" id="kir-commit"><div class="row between wrap gap8"><div class="row gap8">${stage('REPAYMENT')}<span class="h3">Payment commitment from Gupta Kirana Store</span></div>${kirStatus()}</div>
     <div class="pr-kv mt12" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div><span>Amount proposed now</span><b class="num">${inr(k.now)}</b><em style="color:${k.pay==='received'?'var(--g)':'#9a5b00'}">${PAY_ST[k.pay]}</em></div><div><span>Remaining balance</span><b class="num">${inr(kBal())}</b><em style="color:var(--muted)">Proposed payment commitment</em></div><div><span>Proposed payment date</span><b>${kFmt(k.date)}</b><em style="color:var(--muted)">Original due ${KIR.due}</em></div></div>
     <div class="pr-kv mt8" style="grid-template-columns:repeat(2,minmax(0,1fr))"><div><span>Commitment status</span><b>${COMMIT_ST[k.commit]}</b></div><div><span>Distributor approval</span><b>${pend?`Required · beyond your ${K_AUTO_DAYS}-day plan rules`:k.commit==='auto'?'Not required · within your plan rules':k.commit==='approved'?'Given by you':'Not given'}</b></div></div>
     ${pend?`<div class="row gap8 mt16"><button class="btn btn-p" onclick="A.kirApprove()">Approve new terms</button><button class="btn btn-s" onclick="A.kirReject()">Reject proposed date</button></div>`:''}
     ${['approved','auto'].includes(k.commit)?`<div class="ol-note mt12"><span style="color:var(--link);flex-shrink:0">${I('tup',14,2)}</span><span>Added to your collections forecast as an <b>expected inflow of ${inr(kBal())} on ${kShort(k.date)}</b>, not guaranteed revenue. Track record: ${sigOf('guptak').promises.kept} of ${sigOf('guptak').promises.made} past promises kept (rule-based, no probability is claimed).</span></div>`:''}
     <div class="xs muted mt12" style="font-weight:600">Prototype controls</div>
     <div class="row gap8 mt8 wrap">${k.pay!=='received'?`<button class="btn btn-g btn-sm" onclick="A.kirPaid()">Simulate ₹15,000 payment confirmation</button>`:''}${['approved','auto'].includes(k.commit)&&!k.outcome?`<button class="btn btn-g btn-sm" onclick="A.kirOutcome('kept')">Simulate ${kShort(k.date)}: commitment kept</button><button class="btn btn-g btn-sm" onclick="A.kirOutcome('missed')">Simulate ${kShort(k.date)}: missed</button>`:''}</div>
     <div class="xs muted mt8">${k.outcome?`Recorded: commitment ${k.outcome}. RAY uses this as a repayment behaviour signal for future recommendations.`:`On ${kShort(k.date)}, RAY records whether the ${inr(kBal())} arrives. Kept or missed commitments become behaviour signals for future recommendations.`} Nothing is collected automatically without a separate mandate.</div></div>`; }
  else if(k.kind==='full') cm=`<div class="card pad mt16"><div class="row between"><span class="h3">Full payment initiated</span>${kirStatus()}</div><div class="small muted mt8">Gupta Kirana Store chose to pay ${inr(KIR.amt)} now. ${PAY_ST[k.pay]}.</div>${k.pay!=='received'?`<button class="btn btn-g btn-sm mt12" onclick="A.kirPaid()">Simulate payment confirmation</button>`:''}</div>`;
  else if(k.kind==='dispute') cm=`<div class="card pad mt16"><div class="row between"><span class="h3">Dispute raised by Gupta Kirana Store</span>${kirStatus()}</div><div class="pr-kv mt12" style="grid-template-columns:1fr 2fr"><div><span>Reason</span><b>${k.dispute.reason}</b></div><div><span>Note</span><b>${esc(k.dispute.note||'No note')}</b></div></div><div class="xs muted mt8">Reminders for INV-2048 are paused until you resolve the dispute.</div></div>`;
  return `<div class="crumb mt20" style="margin-bottom:0"><a onclick="goSec('raahi/actions','grp-failed')">${I('arrowL',14,2)} Collections</a></div>
   <div style="max-width:980px">${pageHead('Invoice '+KIR.inv,'Gupta Kirana Store · at-risk invoice')}${kirNotif()}<div class="card pad mt16">${kv}</div>${cm}${rec}</div>`;
}

/* ================= RETAILER SIDE: Razorpay-hosted payment request page ================= */
function kirR(){ if(route().startsWith('pay/')){ const p=document.getElementById('pay-root'); if(p) p.innerHTML=kirPage(); } }
A.kirView=(v)=>{ kirS().view=v; kirR(); const p=document.getElementById('pay-root'); if(p) p.scrollTop=0; };
A.kirAmt=(el)=>{ const k=kirS(); let v=parseInt(String(el.value).replace(/\D/g,''))||0; const ok=v>=1000&&v<=KIR.amt-1000; if(ok) k.now=v;
  const set=(id,t)=>{const e=document.getElementById(id); if(e) e.textContent=t;};
  set('k-bal',inr(KIR.amt-(ok?v:k.now))); set('k-rv-now',inr(ok?v:k.now)); set('k-rv-bal',inr(KIR.amt-(ok?v:k.now))); set('k-cta',`Confirm plan and pay ${inr(ok?v:k.now)}`);
  const er=document.getElementById('k-err'); if(er) er.style.display=ok?'none':'block'; const b=document.getElementById('k-go'); if(b) b.disabled=!ok; };
A.kirPick=(opt,date)=>{ const k=kirS(); k.opt=opt; if(date) k.date=date; kirR(); };
A.kirCustom=(el)=>{ const k=kirS(); if(!el.value) return; let v=el.value; if(v<kMin()) v=kMin(); if(v>kMax()) v=kMax(); k.opt='custom'; k.date=v; kirR(); };
A.kirConfirm=()=>{ const k=kirS(); k.paying=true; kirR();
  setTimeout(()=>{ k.paying=false; k.kind='plan'; k.pay='initiated'; k.commit=kNeedsApproval(k.date)?'pending':'auto'; k.notif=true; k.submittedAt=nowT(); k.view='done';
    log({ic:'cal',ti:'New payment commitment from Gupta Kirana Store',de:`${inr(k.now)} payable now (simulated payment initiated) · ${inr(kBal())} proposed for ${kFmt(k.date)} · ${k.commit==='pending'?'needs your approval':'confirmed within your plan rules'}`,src:['rzp'],who:'Gupta Kirana Store · Razorpay payment link',chem:'Gupta Kirana Store'});
    if(S.wa.msgs) waPush({from:'ray',html:`📩 <b>New payment commitment from Gupta Kirana Store</b>\n${inr(k.now)} payable now (simulated). ${inr(kBal())} proposed for ${kFmt(k.date)}.\n${k.commit==='pending'?'This is outside your plan rules, so it needs your approval in RAY Credit.':'Within your plan rules, so it is confirmed.'}`});
    kirR(); },1300); };
A.kirPayFull=()=>{ const k=kirS(); k.paying=true; kirR();
  setTimeout(()=>{ k.paying=false; k.kind='full'; k.pay='initiated'; k.view='donefull';
    log({ic:'rupee',ti:'Gupta Kirana Store initiated full payment of ₹40,000',de:`${KIR.inv} · Razorpay payment link · simulated, not yet collected`,src:['rzp'],who:'Gupta Kirana Store · Razorpay payment link',chem:'Gupta Kirana Store'}); kirR(); },1300); };
A.kirDispute=()=>{ const k=kirS(), r=document.querySelector('.kd-opt.on'), n=document.getElementById('kd-note');
  k.kind='dispute'; k.dispute={reason:r?r.dataset.r:'Short supply', note:n?n.value:''}; k.view='donedispute'; k.notif=false;
  log({ic:'alert',ti:'Gupta Kirana Store raised a dispute on INV-2048',de:`${k.dispute.reason}${k.dispute.note?' · '+k.dispute.note:''} · reminders paused until resolved`,src:['conv'],who:'Gupta Kirana Store · Razorpay payment link',chem:'Gupta Kirana Store'}); kirR(); };

function kirPage(){
  const k=kirS(), v=k.view, c=chem(KIR.id);
  const top=`<div class="kp-demo"><span>Prototype preview · what Gupta Kirana Store sees after tapping the WhatsApp link</span><button onclick="go('raahi/invoice/${KIR.inv}')">${I('arrowL',13,2.4)} Back to RAY Credit</button></div>`;
  const head=`<div class="kp-head"><span class="kp-logo">AD</span><div><div class="kp-merch">${M.name}</div><div class="kp-sub">Payment request · ${M.city}</div></div></div>`;
  const inv=`<div class="kp-inv"><div class="row between"><span class="xs muted">Invoice #${KIR.inv.replace('INV-','INV-')}</span><span class="kp-due">${KIR.dueTxt}</span></div><div class="kp-l">Amount due</div><div class="kp-amt">${inr(KIR.amt)}</div><div class="xs muted mt4">Billed to ${c.name} · due ${KIR.due}</div></div>`;
  const foot=`<div class="kp-foot">${I('lock',12,2.2)} Secure payment request · Powered by Razorpay</div>`;
  const back=t=>`<button class="kp-back" onclick="A.kirView('home')">${I('arrowL',16,2.2)} ${t||'Back'}</button>`;
  let body='';
  if(k.paying) body=`${inv}<div class="kp-card" style="text-align:center;padding:28px 16px">${thinking('Opening your UPI app (simulated)…')}<div class="xs muted mt8">Prototype: no money moves.</div></div>`;
  else if(v==='home') body=`${inv}
    <div class="kp-q">How would you like to pay?</div>
    <button class="kp-opt" onclick="A.kirView('full')"><span class="kp-oi">${I('rupee',18,2)}</span><div class="grow"><b>Pay full amount now</b><span>${inr(KIR.amt)} by UPI, card or netbanking</span></div>${I('right',16,2)}</button>
    <button class="kp-opt hl" onclick="A.kirView('plan')"><span class="kp-oi">${I('cal',18,2)}</span><div class="grow"><div class="row gap6"><b>Pay part now, balance later</b><span class="kp-tag">Suggested for you</span></div><span>Choose a plan that works for your cash flow</span></div>${I('right',16,2)}</button>
    <button class="kp-opt" onclick="A.kirView('dispute')"><span class="kp-oi">${I('alert',18,2)}</span><div class="grow"><b>Raise an invoice dispute</b><span>Short supply, damaged goods or a billing issue</span></div>${I('right',16,2)}</button>`;
  else if(v==='plan'){ const sugg=kNextFourth(), d14=kIso(kAdd(K_AUTO_DAYS)), d21=kIso(kAdd(21));
    const opt=(o,date,l,s)=>{ const need=kNeedsApproval(date); return `<button class="kp-date ${k.opt===o?'on':''}" onclick="A.kirPick('${o}','${date}')"><span class="radio"></span><div class="grow"><b>${kFmt(date)}</b><span>${l}</span></div><span class="kp-dt ${need?'ap':'ok'}">${need?'Needs supplier approval':'Confirmed instantly'}</span></button>`; };
    body=`${back()}<div class="kp-h">Schedule your payment</div><div class="kp-p">Choose a payment plan that works for your cash flow.</div>
     <div class="kp-ai"><span class="ai-tag" style="font-size:11px">${clover(11)} Suggested by RAY</span><div class="mt4">Based on your previous payment pattern, you typically settle dues around the 4th of the month.</div><div class="kp-sg mt8"><div><span>Pay now</span><b>₹15,000</b></div><div><span>Pay on ${kShort(sugg)}</span><b>₹25,000</b></div></div><div class="xs muted mt8">Illustrative suggestion from synthetic demo data.</div></div>
     <div class="kp-card"><label class="kp-lbl">Amount to pay now</label><div class="kp-in"><span>₹</span><input inputmode="numeric" value="${k.now}" oninput="A.kirAmt(this)"></div><div class="kp-err" id="k-err" style="display:none">Enter between ₹1,000 and ₹39,000</div>
      <div class="row between small mt8"><span class="muted">Balance for later</span><b class="num" id="k-bal" style="color:var(--strong)">${inr(kBal())}</b></div></div>
     <div class="kp-card"><label class="kp-lbl">When will you pay the balance?</label><div class="col gap6 mt8">${opt('sugg',sugg,'Around your usual 4th of the month · suggested')}${opt('d14',d14,'Within Agarwal Distributors’ plan rules')}${opt('d21',d21,'Three weeks from today')}
      <div class="kp-date ${k.opt==='custom'?'on':''}" onclick="this.querySelector('input').showPicker&&this.querySelector('input').showPicker()"><span class="radio"></span><div class="grow"><b>Choose another date</b><span>Up to ${kFmt(kMax())}</span></div><input type="date" min="${kMin()}" max="${kMax()}" value="${k.opt==='custom'?k.date:''}" onchange="A.kirCustom(this)" onclick="event.stopPropagation()"></div></div>
      <div class="xs muted mt8">Dates up to ${kFmt(kAutoMax())} are confirmed instantly. Later dates are sent to Agarwal Distributors for approval.</div></div>
     <div class="kp-card kp-rv"><label class="kp-lbl">Review your commitment</label>
      <div class="row between mt8"><span>Pay now</span><b class="num" id="k-rv-now">${inr(k.now)}</b></div>
      <div class="row between mt8"><span>Proposed payment commitment<br><span class="xs muted">${kFmt(k.date)}</span></span><b class="num" id="k-rv-bal">${inr(kBal())}</b></div>
      <div class="row between kp-tot"><span>Total</span><b class="num">${inr(KIR.amt)} <span style="color:var(--g)">${I('check',13,2.6)}</span></b></div>
      <div class="xs muted mt8">The later amount is a proposed commitment, not an automatic debit. You pay it yourself with this link. ${kNeedsApproval(k.date)?'This date needs Agarwal Distributors’ approval.':'This date is within your supplier’s plan rules.'}</div></div>
     <button class="kp-cta" id="k-go" onclick="A.kirConfirm()"><span id="k-cta">Confirm plan and pay ${inr(k.now)}</span></button>`; }
  else if(v==='done') body=`<div class="kp-ok">${I('check',26,2.6)}</div><div class="kp-h" style="text-align:center">Payment plan received</div><div class="kp-p" style="text-align:center">Your payment commitment has been shared with Agarwal Distributors.</div>
     <div class="kp-card"><div class="row between"><span>Amount to pay now</span><b class="num">${inr(k.now)}</b></div><div class="kp-sim">Simulated payment · pending, not collected</div>
      <div class="row between mt12"><span>Proposed remaining payment</span><b class="num">${inr(kBal())}</b></div>
      <div class="row between mt8"><span>Proposed payment date</span><b>${kFmt(k.date)}</b></div>
      <div class="row between mt8"><span>Approval status</span><b style="color:${k.commit==='pending'?'#9a5b00':'var(--g)'}">${k.commit==='pending'?'Pending distributor approval':k.commit==='approved'?'Approved by Agarwal Distributors':k.commit==='rejected'?'Not approved':'Confirmed'}</b></div></div>
     <div class="kp-note">Keeping your payment commitments can help you build a stronger repayment record over time.</div>
     <div class="kp-v2"><span class="kp-soon">Coming later</span><b>RAY Payment Passport</b><div>Build a repayment history you can choose to share with participating suppliers to support future credit requests.</div></div>`;
  else if(v==='full') body=`${back()}${inv}<div class="kp-card"><div class="kp-lbl">Pay with</div>${['UPI · any app','Debit or credit card','Netbanking'].map((x,i)=>`<div class="kp-date ${i===0?'on':''}" style="cursor:default"><span class="radio"></span><div class="grow"><b>${x}</b></div></div>`).join('')}</div><button class="kp-cta" onclick="A.kirPayFull()">Pay ${inr(KIR.amt)}</button><div class="xs muted mt8" style="text-align:center">Prototype: payment is simulated. No money moves.</div>`;
  else if(v==='donefull') body=`<div class="kp-ok">${I('check',26,2.6)}</div><div class="kp-h" style="text-align:center">Payment initiated</div><div class="kp-card"><div class="row between"><span>Amount</span><b class="num">${inr(KIR.amt)}</b></div><div class="kp-sim">Simulated payment · pending, not collected</div><div class="row between mt8"><span>Invoice</span><b>${KIR.inv}</b></div></div><div class="kp-note">Agarwal Distributors will see the payment against this invoice.</div>`;
  else if(v==='dispute') body=`${back()}<div class="kp-h">Raise an invoice dispute</div><div class="kp-p">Tell Agarwal Distributors what is wrong with ${KIR.inv}.</div><div class="kp-card">${['Short supply','Damaged goods','Price or scheme mismatch','Already paid'].map((x,i)=>`<div role="button" class="kp-date kd-opt ${i===0?'on':''}" data-r="${x}" onclick="document.querySelectorAll('.kd-opt').forEach(e=>e.classList.remove('on'));this.classList.add('on')"><span class="radio"></span><div class="grow"><b>${x}</b></div></div>`).join('')}<label class="kp-lbl mt12" style="display:block">Add a note (optional)</label><textarea id="kd-note" class="textarea mt4" rows="2" placeholder="For example, 4 cartons short in the last delivery"></textarea></div><button class="kp-cta" onclick="A.kirDispute()">Submit dispute</button>`;
  else if(v==='donedispute') body=`<div class="kp-ok" style="background:#fff1dc;color:#9a5b00">${I('alert',26,2.4)}</div><div class="kp-h" style="text-align:center">Dispute raised</div><div class="kp-p" style="text-align:center">Agarwal Distributors will review it. Reminders for ${KIR.inv} are paused meanwhile.</div>`;
  return `<div class="kp-wrap">${top}<div class="kp">${head}<div class="kp-body">${body}</div>${foot}</div></div>`;
}

/* Actions → Failed Collections row */
function kirActionRow(i){ const k=kirS(), c=chemView(chem(KIR.id));
  const reason=!k.kind?(k.sent?'Payment link sent · waiting for the retailer':'3 days overdue · RAY recommends a payment link with a plan option'):k.kind==='plan'?`${inr(k.now)} now · ${inr(kBal())} proposed for ${kShort(k.date)} · ${COMMIT_ST[k.commit].toLowerCase()}`:k.kind==='dispute'?'Dispute raised · reminders paused':'Full payment initiated · simulated';
  return aRow(i,{id:'act-kir',name:c.name,band:c.band,area:KIR.inv,amt:inr(KIR.amt),kind:k.kind==='plan'?'Payment plan':'Missed payment',kc:k.kind?'k-credit':'k-held',reason,chan:'Payment link',chanIc:'link',
    right:k.kind==='plan'&&k.commit==='pending'?`<button class="btn btn-p btn-sm" onclick="go('raahi/invoice/${KIR.inv}')">Review commitment</button>`:`<button class="btn ${k.sent?'btn-s':'btn-p'} btn-sm" onclick="go('raahi/invoice/${KIR.inv}')">${k.sent?'Open invoice':'Send payment link'}</button>`}); }

/* demo helper: submit the suggested plan instantly (used by the guided story) */
function kirSubmitNow(){ const k=kirS(); if(k.kind) return; if(!k.sent) kirDoSend(true); k.kind='plan'; k.pay='initiated'; k.commit=kNeedsApproval(k.date)?'pending':'auto'; k.notif=true; k.view='done'; k.submittedAt=nowT();
  log({ic:'cal',ti:'New payment commitment from Gupta Kirana Store',de:`${inr(k.now)} payable now (simulated payment initiated) · ${inr(kBal())} proposed for ${kFmt(k.date)} · ${k.commit==='pending'?'needs your approval':'confirmed within your plan rules'}`,src:['rzp'],who:'Gupta Kirana Store · Razorpay payment link',chem:'Gupta Kirana Store'}); }
