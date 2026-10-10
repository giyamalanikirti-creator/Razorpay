/* ================= EXPLAIN, LEARN, INTERPRET =================
 * howPanel()         "How RAY reached this recommendation", built only from evaluateCredit() output
 * whatChangedCard()  previous vs new recommendation, the evidence and the rule responsible, approval
 * outcomeCard()      record a simulated repayment outcome (events -> signals -> recommendation)
 * interpPanel()      AI payment-promise and dispute interpreter: extract, edit, confirm
 * Behind RAY and About this demo modals
 */
const SRC_CLS = s => /network/i.test(s)?'net':/Razorpay/.test(s)?'rzp':/ledger|Policy/i.test(s)?'led':/conversation/i.test(s)?'conv':'';
const EV_LABEL = {
  CREDIT_APPROVED:'Limit change approved', CREDIT_KEPT:'Current limit kept', PROMISE_RECORDED:'Payment promise confirmed', PROMISE_EDITED:'Payment promise edited', PROMISE_KEPT:'Promise kept', PROMISE_PARTIALLY_KEPT:'Promise part-kept', PROMISE_MISSED:'Promise missed',
  PAYMENT_RECEIVED:'Payment received (verified)', PAYMENT_PARTIALLY_RECEIVED:'Partial payment received (verified)', PAYMENT_CLAIMED:'Buyer claims payment (unverified)', PAYMENT_RECONCILED:'Payment reconciled', CLAIM_REJECTED:'Claimed payment not found',
  AUTOPAY_FAILED:'Automatic debit failed', AUTOPAY_SUCCEEDED:'Automatic debit collected', DISPUTE_OPENED:'Dispute opened', DISPUTE_RESOLVED:'Dispute resolved',
  CONSENT_REQUESTED:'Network consent requested', CONSENT_GRANTED:'Network consent granted', CONSENT_DENIED:'Network consent declined', CONSENT_REVOKED:'Network consent revoked', NETWORK_DISPUTED:'Buyer disputed network information', NETWORK_DISPUTE_RESOLVED:'Network review closed', GST_VERIFIED:'GST status verified'};
const evLine = e => `${EV_LABEL[e.type]||e.type}${e.amount?` · ${inr(e.amount)}`:''}${e.invoice?` · ${e.invoice}`:''} · ${RayDates.fmtShort(e.date)}`;
const ptsTag = p => p?`<b class="${p>0?'how-w':'how-g'}">${p>0?'+':''}${p}</b>`:'<span class="faint">0</span>';

/* ---------- How RAY reached this recommendation ---------- */
function howPanel(id, opts={}){
  const r=recOf(id), s=sigOf(id); if(!r) return '';
  S.howOpen=S.howOpen||{}; const open=opts.open||S.howOpen[id];
  const own=r.ownData, ns=r.networkStep, d=decOf(id);
  const chain = s.isNew
    ? [`Starter policy ${inr(own.recommendedLimit)} · ${own.recommendedTerms} days`, ns?`Consented network ${inr(ns.to-ns.from>=0?ns.to-ns.from:0)} uplift`:'No network uplift', `<b>${inr(r.recommendedLimit)} · ${r.recommendedTerms} days</b>`]
    : [`Reference limit ${inr(r.referenceLimit)}`, `${own.band}${own.score!=null?` (risk index ${own.score})`:''} → your data ${inr(own.recommendedLimit)} · ${own.recommendedTerms} days`, ns?(ns.kind==='corroborated'?`Network ${ns.to-ns.from<0?'−':'+'}${inr(Math.abs(ns.to-ns.from))} · ${ns.termsFrom}→${ns.termsTo} days`:'Network: Watch, limit held'):'No network adjustment', `<b>${inr(r.recommendedLimit)} · ${r.recommendedTerms} days</b>`];
  const head=`<div class="how-h" onclick="S.howOpen['${id}']=!S.howOpen['${id}'];rr()"><div class="grow"><div class="row gap8 wrap"><span class="h3">How RAY reached this recommendation</span>${bandBadge(r.band)}<span class="badge b-n">Confidence ${r.confidence}</span>${r.needsHumanReview?'<span class="badge b-a">Needs your review</span>':''}</div>
    <div class="how-chain mt8">${chain.map(x=>`<span>${x}</span>`).join(I('arrowR',12,2))}</div></div><span class="how-tg">${open?'Hide':'Show'} details ${I(open?'up':'down',14,2)}</span></div>`;
  if(!open) return `<div class="card how mt16" id="how-${id}">${head}</div>`;
  const rows=r.signalContributions.map(c=>`<tr><td><b style="color:var(--strong)">${c.label}</b><div class="xs muted">${c.group}</div></td><td class="small">${esc(c.observed)}</td><td><span class="src ${SRC_CLS(c.source)}">${esc(c.source)}</span></td><td class="xs muted" style="max-width:260px">${esc(c.rule)}</td><td class="r small">${c.points?ptsTag(c.points):`<span class="xs" style="color:var(--strong)">${esc(c.effect||'·')}</span>`}</td></tr>`).join('');
  const total=s.isNew?'':`<tr class="how-tot"><td colspan="4"><b>Risk index</b> <span class="xs muted">sum of points, clamped 0–100 · Reliable &lt;${POL.bands.watchAt} · Watch ${POL.bands.watchAt}–${POL.bands.riskyAt-1} · Risky ≥${POL.bands.riskyAt}</span></td><td class="r"><b>${own.score}</b></td></tr>`;
  const perm=networkPermRow(id);
  return `<div class="card how mt16" id="how-${id}">${head}
   <div class="how-b"><table class="table how-t"><thead><tr><th>Signal</th><th>Observed</th><th>Source</th><th>Rule</th><th class="r">Effect</th></tr></thead><tbody>${rows}${total}</tbody></table>
    <div class="how-g3 mt12">
     <div><div class="lbl">Why RAY recommends this</div><div class="small mt4" style="color:var(--strong)">${esc(r.recommendation)}</div>${r.rules.limit?`<div class="xs muted mt4">Your data: ${esc(r.rules.limit)} · ${esc(r.rules.terms)}${r.networkStep?` · then network rule`:''}</div>`:''}<div class="xs muted mt4">${esc(r.guardrails.note)} Supply is never paused automatically.</div></div>
     <div><div class="lbl">Evidence and freshness</div><div class="small mt4">Confidence <b>${r.confidence}</b> <span class="xs muted">(evidence sufficiency, not a probability)</span></div><div class="small mt4">${r.freshness.stale?`<span style="color:var(--a);font-weight:600">Ledger last synced ${r.freshness.ledgerAgeHours} hours ago</span>`:'Ledger synced within 24 hours'}</div>${r.missingSignals.length?`<div class="xs muted mt4">Missing: ${r.missingSignals.map(esc).join(' · ')}</div>`:''}</div>
     <div><div class="lbl">Approval</div><div class="small mt4">${d&&d.status==='approved'&&!recChanged(id)?`${I('check',12,2.4)} Approved by ${d.by||M.owner}`:d&&d.status==='kept'&&!recChanged(id)?'Current limit kept by you':['none','hold'].includes(r.action)?(r.action==='hold'?'No limit change to approve · follow-up needs your approval before sending':'Nothing to approve'):'<b style="color:var(--a)">Pending your approval</b>'}</div>${r.reviewReasons.length?`<div class="xs muted mt4">Review: ${r.reviewReasons.map(esc).join(' · ')}</div>`:''}<div class="xs muted mt4">Policy ${r.policyVersion} · ${POL.label}</div></div>
    </div>
    ${perm}
    <div class="row gap12 mt12 xs muted wrap"><span>${I('shield',12)} Rule-based and deterministic. The AI interpreter only reads buyer messages; it does not set limits.</span><a class="link" onclick="A.behind()">Behind RAY</a><a class="link" onclick="A.about()">About this demo</a></div></div></div>`;
}

/* per-buyer network permission (separate from the distributor's participation) */
function networkPermRow(id){
  const s=sigOf(id), r=recOf(id); if(!BUY[id].network&&s.consent==='none') return '';
  const st=r.network.state, part=!!S.ctl.net;
  const badge=`<span class="badge ${r.network.eligible?'b-g':st==='pending'?'b-b':'b-n'}">${r.network.eligible?'Used in this decision':esc(NET_STATE_LABEL[st]||st)}</span>`;
  let acts='';
  if(!part) acts=`<button class="btn btn-s btn-sm" onclick="A.netToggle()">Join Razorpay network</button>`;
  else if(s.consent==='available'&&!s.networkDisputed) acts=`<button class="btn btn-g btn-sm" onclick="A.consentSim('${id}','revoke')">Simulate: buyer revokes consent</button><button class="btn btn-g btn-sm" onclick="A.consentSim('${id}','dispute')">Simulate: buyer disputes this information</button>`;
  else if(s.networkDisputed) acts=`<button class="btn btn-g btn-sm" onclick="A.consentSim('${id}','resolve')">Close buyer review</button>`;
  else if(s.consent==='pending') acts=`<button class="btn btn-g btn-sm" onclick="A.consentSim('${id}','grant')">Simulate: buyer accepts</button><button class="btn btn-g btn-sm" onclick="A.consentSim('${id}','deny')">Simulate: buyer declines</button>`;
  else if(['revoked','denied','expired','none'].includes(s.consent)) acts=`<button class="btn btn-s btn-sm" onclick="A.consentSim('${id}','request')">Request consent</button>`;
  return `<div class="how-perm mt12"><div class="grow"><div class="row gap8 wrap"><b style="color:var(--strong)">Network data for this buyer</b>${badge}<span class="xs muted">Participation: ${part?'on':'off'}</span></div>
    <div class="xs muted mt4">${esc(r.network.reason||'')}. Synthetic, aggregated bands only; other distributors are never named and no transactions are shown. Use remains subject to consent, privacy and legal review, potentially including credit-information regulation.</div></div><div class="row gap6 wrap" style="justify-content:flex-end">${acts}</div></div>`;
}
A.consentSim=(id,k)=>{ const nm=BUY[id].name;
  const map={revoke:['CONSENT_REVOKED','Buyer revoked consent · network signals excluded from new decisions'],grant:['CONSENT_GRANTED','Buyer accepted the consent request'],deny:['CONSENT_DENIED','Buyer declined · own-data recommendation only'],request:['CONSENT_REQUESTED','Consent request sent on WhatsApp to the registered number'],dispute:['NETWORK_DISPUTED','Buyer asked to review the network information · excluded until reviewed'],resolve:['NETWORK_DISPUTE_RESOLVED','Review closed · network information can be used again']};
  const [type,de]=map[k]; recordEvent({type, buyerId:id, source:k==='request'?'WhatsApp via RAY':'Buyer (simulated)', actor:k==='request'?M.owner:nm+' (simulated)'});
  log({ic:k==='revoke'||k==='deny'?'ban':'lock',ti:`${EV_LABEL[type]} · ${nm}`,de:de+(k==='revoke'?' · earlier decisions keep their audit record':''),src:k==='request'?['conv']:['net'],who:k==='request'?'Sent by '+M.owner:nm+' · simulated',chem:nm});
  rr(); toast(`${EV_LABEL[type]} · recommendation recalculated`); };

/* ---------- What changed since the last decision ---------- */
function whatChangedCard(id, opts={}){
  const d=decOf(id), r=recOf(id); if(!d||!r) return '';
  const ev=eventsSince(id).filter(e=>!['CREDIT_APPROVED','CREDIT_KEPT'].includes(e.type));
  const settings=[]; if(d.snap.ctl.net!==!!S.ctl.net) settings.push(S.ctl.net?'You joined the Razorpay network':'You turned off the Razorpay network'); if(d.snap.ctl.stale!==!!S.stale) settings.push(S.stale?'Ledger sync is delayed':'Ledger refreshed');
  const changed=recChanged(id);
  if(!changed&&!ev.length&&!settings.length) return '';
  const s=d.snap;
  const diffs=r.signalContributions.filter(c=>{ const o=s.contrib[c.key]; return !o||o.p!==c.points||o.o!==c.observed||o.e!==c.effect; }).filter(c=>c.key!=='tenure');
  const ruleLines=diffs.map(c=>{ const o=s.contrib[c.key]; return `<div class="wc-r"><span class="grow"><b style="color:var(--strong)">${c.label}</b> <span class="xs muted">${o&&o.o!==c.observed?esc(o.o)+' → ':''}${esc(c.observed)}</span><div class="xs muted">${esc(c.rule)}</div></span><span class="small">${o&&o.p!==c.points?`${ptsTag(o.p)} → ${ptsTag(c.points)}`:esc(c.effect||'')}</span></div>`; });
  if(s.band!==r.band&&r.riskIndex!=null&&s.risk!=null) ruleLines.push(`<div class="wc-r"><span class="grow"><b style="color:var(--strong)">Risk index ${s.risk} → ${r.riskIndex}</b><div class="xs muted">Band thresholds: Watch at ${POL.bands.watchAt}, Risky at ${POL.bands.riskyAt}. ${esc(r.rules.limit||'')}</div></span><span>${bandBadge(s.band)} ${I('arrowR',12,2)} ${bandBadge(r.band)}</span></div>`);
  const pend=changed&&r.action!=='none';
  const isG=id==='gupta';
  const approveFn=isG?'A.approveGupta()':`A.setLimit('${id}')`, keepFn=isG?'A.keepLimit()':`A.keepLimitG('${id}')`;
  return `<div class="card pad mt16 wc ${changed?'on':''}" id="wc-${id}"><div class="row between wrap gap8"><div class="row gap8">${stage('LEARN')}<span class="h3">What changed since the last decision?</span></div><span class="xs muted">Last decision: ${d.status==='baseline'?'recommendation at start of day':d.status==='approved'?'approved by you':'current limit kept by you'} · ${s.at}</span></div>
   ${changed?`<div class="wc-g mt12"><div><div class="xs muted">Previous recommendation</div><div class="wc-v">${bandBadge(s.band)} ${inr(s.limit)} · ${s.terms} days</div></div><div class="wc-arr">${I('arrowR',18,2)}</div><div><div class="xs muted">New recommendation</div><div class="wc-v">${bandBadge(r.band)} <b style="color:var(--link)">${inr(r.recommendedLimit)}</b> · ${r.recommendedTerms} days</div></div></div>`
     :`<div class="small mt8" style="color:var(--strong)">${I('check',13,2.4)} New evidence recorded. The recommendation is unchanged: ${inr(r.recommendedLimit)} · ${r.recommendedTerms} days.</div>`}
   ${ev.length||settings.length?`<div class="lbl mt12">New evidence</div><div class="col gap4 mt4">${settings.map(x=>`<div class="small row gap6">${I('gear',12,2)}${x}</div>`).join('')}${ev.map(e=>`<div class="small row gap6"><span style="color:${/FAILED|MISSED|REVOKED|DENIED/.test(e.type)?'var(--a)':/RECEIVED|KEPT|SUCCEEDED|RECONCILED|GRANTED/.test(e.type)?'var(--g)':'var(--muted)'}">${I(/RECEIVED|SUCCEEDED|RECONCILED/.test(e.type)?'rupee':/CONSENT|NETWORK/.test(e.type)?'lock':/DISPUTE/.test(e.type)?'receipt':'alert',12,2.2)}</span>${esc(evLine(e))}${e.verification==='verified'?' <span class="xs muted">· verified</span>':e.type==='PAYMENT_CLAIMED'?' <span class="xs muted">· not counted as received</span>':''}</div>`).join('')}</div>`:''}
   ${ruleLines.length?`<div class="lbl mt12">Policy rules responsible</div><div class="mt4">${ruleLines.join('')}</div>`:''}
   ${changed?`<div class="lbl mt12">Recommended action</div><div class="small mt4" style="color:var(--strong);font-weight:500">${esc(r.recommendation)}</div><div class="xs muted mt4">${esc(r.guardrails.note)} Nothing changes until you approve. Supply is not paused.</div>`:''}
   ${pend?`<div class="row gap8 mt12 wrap"><span class="badge b-a">Awaiting your approval</span><span class="grow"></span><button class="btn btn-s btn-sm" onclick="${keepFn}">Keep current limit</button><button class="btn btn-p btn-sm" onclick="${approveFn}" ${blocked()?'disabled':''}>${r.recommendedLimit===curLimitOf(id)?'Approve new terms':`Approve ${inr(r.recommendedLimit)} · ${r.recommendedTerms} days`}</button></div>`:changed?`<div class="row gap8 mt12"><button class="btn btn-s btn-sm" onclick="decide('${id}','kept');rr();toast('Recorded as reviewed')">Mark as reviewed</button></div>`:''}
   <div class="xs faint mt8">Outcome-informed recommendation: repayment events update the buyer's signals and the same policy re-runs. No model is trained.</div></div>`;
}

/* ---------- Record a repayment outcome (simulated) ---------- */
function outcomeCard(id){
  const s=sigOf(id); if(!s||s.isNew) return '';
  const open=(S.ocOpen||{})[id]; const auto=['UPI Autopay','eNACH'].includes(s.debit.method);
  const pr=openPromise(id);
  const b=(lbl,fn,cls='btn-g')=>`<button class="btn ${cls} btn-sm" onclick="${fn}">${lbl}</button>`;
  return `<div class="card mt16 oc" id="oc-${id}"><div class="row between pad-s" style="cursor:pointer" onclick="S.ocOpen=S.ocOpen||{};S.ocOpen['${id}']=!S.ocOpen['${id}'];rr()"><div class="row gap8"><span class="h3">Record a repayment outcome</span><span class="badge b-n">Prototype simulation</span></div><span class="how-tg">${open?'Hide':'Show'} ${I(open?'up':'down',14,2)}</span></div>
   ${open?`<div class="pad-s" style="padding-top:0"><div class="xs muted">Each button records one event in the ledger. Balances, repayment signals and the recommendation update from the event; nothing is set directly.</div>
    <div class="row gap6 mt12 wrap">${b('Payment received',`A.ocPay('${id}')`)}${b('Buyer claims payment (unverified)',`A.ocClaim('${id}')`)}${auto?b(`${s.debit.method} attempt failed`,`A.ocFail('${id}')`)+b(`${s.debit.method} collected`,`A.ocAutoOk('${id}')`):''}${pr?b('Promise date passed unpaid',`A.ocMiss('${id}')`)+b('Promise kept',`A.ocKept('${id}')`):''}${b('Dispute opened',`A.ocDispute('${id}')`)}${invsOf(id).some(i=>i.disputed)?b('Dispute resolved',`A.ocResolve('${id}')`):''}</div>
    <div class="row gap16 mt12 xs muted wrap"><span>Outstanding <b class="num" style="color:var(--strong)">${inr(s.out)}</b></span><span>${s.openInvoices} open invoice${s.openInvoices===1?'':'s'}</span>${s.disputed?`<span>${inr(s.disputed)} disputed</span>`:''}<span>Demo date ${simDateLabel()}</span></div></div>`:''}</div>`;
}
const nextOpenInv = id => invsOf(id).filter(i=>i.bal>0).sort((a,b)=>RayDates.toN(a.due)-RayDates.toN(b.due))[0];
const nextDueInv = id => invsOf(id).filter(i=>i.bal-(i.disputed||0)>0).sort((a,b)=>RayDates.toN(a.due)-RayDates.toN(b.due))[0];
function invSelect(id, sel){ return `<select class="select" id="oc-inv">${invsOf(id).filter(i=>i.bal>0).map(i=>`<option value="${i.inv}" ${i.inv===sel?'selected':''}>${i.inv} · ${inr(i.bal)} · due ${RayDates.fmtShort(i.due)}</option>`).join('')}</select>`; }
A.ocPay=(id)=>{ const i=nextOpenInv(id); if(!i) return toast('Nothing outstanding');
  modal({title:`Record a verified payment · ${BUY[id].name}`,body:`<div class="field"><label>Invoice</label>${invSelect(id,i.inv)}</div><div class="grid g2 mt12"><div class="field"><label>Amount (₹)</label><input class="input num" id="oc-amt" value="${i.bal}"></div><div class="field"><label>Seen in</label><select class="select" id="oc-src"><option>Razorpay payment</option><option>Bank account (Connected Banking+)</option></select></div></div><p class="xs muted mt12">Verified payments reduce the invoice balance. They can’t exceed what is outstanding, and the same payment can’t be applied twice.</p>`,
   actions:[{label:'Cancel'},{label:'Record payment',cls:'btn-p',fn:()=>{ const inv=document.getElementById('oc-inv').value, amt=parseInt(String(document.getElementById('oc-amt').value).replace(/\D/g,''))||0, src=document.getElementById('oc-src').value;
     const r=recordEvent({type:'PAYMENT_RECEIVED', buyerId:id, invoice:inv, amount:amt, verification:'verified', source:src, actor:src.startsWith('Bank')?'Connected Banking+':'Razorpay', ref:'sim-'+id+'-'+S.led.seq});
     if(!r.ok) return; closeModal(); promiseProgress(id, amt, r.event); log({ic:'rupee',ti:`${inr(amt)} received from ${BUY[id].name}`,de:`${inv} · ${src} · verified · balance ${inr(r.event.meta.balanceBefore)} → ${inr(r.event.meta.balanceAfter)}`,src:[src.startsWith('Bank')?'aa':'rzp'],who:'Prototype simulation',chem:BUY[id].name}); rr(); toast(`${inr(amt)} recorded · ${inv} updated`); }}]}); };
A.ocClaim=(id)=>{ const i=nextOpenInv(id); if(!i) return; const r=recordEvent({type:'PAYMENT_CLAIMED', buyerId:id, invoice:i.inv, amount:i.bal, verification:'unverified', source:'Buyer message', actor:BUY[id].name});
  if(r.ok){ log({ic:'chat',ti:`${BUY[id].name} says they paid ${i.inv}`,de:'Unverified claim · balance unchanged · reminders paused until reconciled',src:['conv'],who:'Buyer message · simulated',chem:BUY[id].name}); rr(); toast('Claim recorded · not counted as received'); } };
A.ocFail=(id)=>{ const i=nextOpenInv(id); if(!i) return; const due=RayDates.diffDays(i.due,S.today)>0?i.due:S.today; if(RayDates.diffDays(due,S.today)>0) advanceDate(due);
  const r=recordEvent({type:'AUTOPAY_FAILED', buyerId:id, invoice:i.inv, amount:i.bal, verification:'verified', source:'Razorpay '+sigOf(id).debit.method, actor:'Razorpay', meta:{reason:'Insufficient balance'}});
  if(r.ok){ log({ic:'alert',ti:`${sigOf(id).debit.method} attempt failed · ${BUY[id].name}`,de:`${inr(i.bal)} · ${i.inv} · insufficient balance · not marked as defaulted`,src:['rzp'],who:'Razorpay · simulated',chem:BUY[id].name}); rr(); toast('Failed debit recorded · recommendation re-evaluated'); } };
A.ocAutoOk=(id)=>{ const i=nextOpenInv(id); if(!i) return; const r=recordEvent({type:'AUTOPAY_SUCCEEDED', buyerId:id, invoice:i.inv, amount:i.bal, verification:'verified', source:'Razorpay '+sigOf(id).debit.method, actor:'Razorpay', ref:'sim-ok-'+i.inv});
  if(r.ok){ log({ic:'rupee',ti:`${inr(i.bal)} collected from ${BUY[id].name}`,de:`${i.inv} · ${sigOf(id).debit.method} · matched automatically`,src:['rzp'],who:'Razorpay · simulated',chem:BUY[id].name}); rr(); toast('Collection recorded'); } };
A.ocDispute=(id)=>{ const i=nextOpenInv(id); if(!i) return;
  modal({title:'Record a dispute',body:`<div class="field"><label>Invoice</label>${invSelect(id,i.inv)}</div><div class="field mt12"><label>Disputed amount (₹)</label><input class="input num" id="oc-amt" value="${i.bal}"></div><p class="xs muted mt12">A dispute is routed to review. It is excluded from reminders and overdue, and never counted as a missed promise or a default.</p>`,actions:[{label:'Cancel'},{label:'Open dispute review',cls:'btn-p',fn:()=>{ const inv=document.getElementById('oc-inv').value, amt=parseInt(String(document.getElementById('oc-amt').value).replace(/\D/g,''))||0;
    const r=recordEvent({type:'DISPUTE_OPENED', buyerId:id, invoice:inv, amount:amt, source:'Merchant', actor:M.owner}); if(!r.ok) return; closeModal(); log({ic:'receipt',ti:`Dispute opened · ${BUY[id].name}`,de:`${inr(amt)} on ${inv} · excluded from reminders · not a default`,src:['conv'],who:M.owner,chem:BUY[id].name}); rr(); toast('Dispute opened'); }}]}); };
A.ocResolve=(id)=>{ const i=invsOf(id).find(x=>x.disputed); if(!i) return; const r=recordEvent({type:'DISPUTE_RESOLVED', buyerId:id, invoice:i.inv, source:'Merchant', actor:M.owner, meta:{creditNote:0}}); if(r.ok){ log({ic:'check',ti:`Dispute resolved · ${BUY[id].name}`,de:`${i.inv} · full amount due again`,src:[],who:M.owner,chem:BUY[id].name}); rr(); toast('Dispute resolved'); } };
A.ocMiss=(id)=>{ const p=openPromise(id); if(!p) return; const date=p.later&&p.later.date||p.first.date; if(RayDates.diffDays(date,S.today)>=0) advanceDate(RayDates.addDays(date,1));
  const r=recordEvent({type:'PROMISE_MISSED', buyerId:id, invoice:p.inv, amount:p.later&&p.later.amt||p.first.amt, source:'Ledger check', actor:'RAY', meta:{promiseId:p.id}});
  if(r.ok){ p.status='missed'; if(id==='gupta'){ S.gupta.promise='broken'; S.gupta.alert=true; } log({ic:'alert',ti:`${BUY[id].name} missed a payment promise`,de:`${inr(p.later&&p.later.amt||0)} due ${RayDates.fmtDay(date)} on ${p.inv} not received`,src:['rzp','conv'],who:'RAY',chem:BUY[id].name});
    if(S.wa.msgs&&id==='gupta') waPush({from:'ray',html:`${BUY[id].name} missed the ${RayDates.fmtDay(date)} promise. ${inr(balOf(id,p.inv))} is still due on ${p.inv}.\n\nI re-ran the policy: <b>${recOf(id).band}</b>, recommended limit <b>${inr(recOf(id).recommendedLimit)}</b> on ${recOf(id).recommendedTerms}-day terms. Nothing has been paused or changed.`,btns:[{l:'Review',a:'waReviewGupta'}]});
    rr(); toast('Missed promise recorded · recommendation re-evaluated'); } };
A.ocKept=(id)=>{ const p=openPromise(id); if(!p) return; const amt=Math.min(balOf(id,p.inv), (p.later&&p.later.amt)||p.first.amt||0);
  if(amt>0){ const r=recordEvent({type:'PAYMENT_RECEIVED', buyerId:id, invoice:p.inv, amount:amt, verification:'verified', source:'Razorpay payment', actor:'Razorpay', ref:'sim-kept-'+p.id}); if(!r.ok) return; }
  recordEvent({type:'PROMISE_KEPT', buyerId:id, invoice:p.inv, source:'Ledger check', actor:'RAY', meta:{promiseId:p.id}}); p.status='kept';
  log({ic:'check',ti:`${BUY[id].name} kept a payment promise`,de:`${inr(amt)} received on ${p.inv} · verified`,src:['rzp'],who:'Prototype simulation',chem:BUY[id].name}); rr(); toast('Promise kept · recorded as positive evidence'); };

/* advance the demo calendar (activity labels, date chip, 60/90-day windows) */
function advanceDate(iso){ if(RayDates.diffDays(iso,S.today)<=0) return; const from=S.today;
  S.act.forEach(x=>{ if(x.d==='Today') x.d=RayDates.fmtDay(from); else if(x.d==='Yesterday') x.d=RayDates.fmtDay(RayDates.addDays(from,-1)); });
  S.today=iso; S.date=RayDates.fmtDay(iso); _clock=0; const dc=document.getElementById('datechip'); if(dc) dc.textContent=S.date; runOutbox(); }

/* ---------- commitments ---------- */
const openPromise = id => S.promises.filter(p=>p.buyerId===id&&p.status==='confirmed').slice(-1)[0];
function promiseProgress(id, amt, ev){ const p=openPromise(id); if(!p||!ev) return; if(p.first&&p.first.amt&&!p.first.paid&&ev.invoice===p.inv&&amt>=p.first.amt-1){ p.first.paid=true; } }
function commitRows(offset=0){ return S.promises.filter(p=>p.status==='confirmed').map((p,i)=>{ const c=chemView(chem(p.buyerId));
  const due=p.later&&p.later.amt?`${inr(p.later.amt)} by ${RayDates.fmtDay(p.later.date)}`:`${inr(p.first.amt)} ${p.first.date===S.today?'today':'on '+RayDates.fmtDay(p.first.date)}`;
  return aRow(i+offset,{id:'act-pc-'+p.buyerId,name:c.name,band:c.band,area:p.inv,amt:inr((p.first&&!p.first.paid?p.first.amt||0:0)+((p.later&&p.later.amt)||0)),kind:'Commitment',kc:'k-credit',reason:`${due} · confirmed by you · ${p.source==='ai'?'extracted by AI':p.source==='rule'?'read by rule-based parser':'entered manually'}${p.first&&p.first.paid?' · first payment received':''}`,chan:'Payment commitment',chanIc:'cal',right:`<button class="btn btn-g btn-sm" onclick="go('raahi/buyer/${p.buyerId}')">View</button>`}); }).join(''); }

/* ---------- AI payment promise and dispute interpreter ---------- */
async function interpretMessage(key, input){
  const st=S.interp[key]={status:'loading', input, startedAt:nowLabel()}; rr();
  let res=null, why='';
  const cs=await claudeSample();
  if(cs&&!AI.claudeOff){
    try{
      const prompt=[RayPromise.SYSTEM_PROMPT,'',RayPromise.buildUserPrompt(input),'',
        'Reply with only one JSON object, no other text. It must match this JSON Schema exactly (every key present, null where a value is not stated):',
        JSON.stringify(RayPromise.SCHEMA)].join('\n');
      const raw=await cs.json(prompt,{modelTier:'quick'});
      if(!raw||typeof raw!=='object'||Array.isArray(raw)) throw {code:'invalid_json'};
      const v=RayPromise.validateInterpretation(raw,input);
      res={mode:'ai', provider:'Anthropic', model:'Claude', interpretation:v.interpretation, checks:v.checks, canConfirm:v.canConfirm};
    }catch(e){
      const code=(e&&e.code)||'upstream_error';
      const map={not_granted:'AI_NOT_GRANTED', sampling_disabled:'SAMPLING_DISABLED', not_declared:'SAMPLING_DISABLED', capability_disabled:'SAMPLING_DISABLED', capability_removed:'SAMPLING_DISABLED', session_expired:'SESSION_EXPIRED', rate_limited:'RATE_LIMITED', invalid_json:'INVALID_MODEL_OUTPUT', refused:'INVALID_MODEL_OUTPUT', empty_completion:'INVALID_MODEL_OUTPUT'};
      why=map[code]||'UPSTREAM_ERROR';
      if(['AI_NOT_GRANTED','SAMPLING_DISABLED'].includes(why)) AI.claudeOff=why; // permanent for this view: stop asking
    }
  }
  if(!res&&!cs&&location.protocol!=='file:'&&!(AI.checked&&!AI.reachable&&AI._failed)){
    try{
      const ctl=new AbortController(); const t=setTimeout(()=>ctl.abort(),15000);
      const r=await fetch('/api/parse-promise',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:input.message, outstanding:input.outstanding, invoiceId:input.inv, buyerName:input.buyerName, messageDate:input.messageDate, currentDate:S.today}),signal:ctl.signal});
      clearTimeout(t); const j=await r.json().catch(()=>null);
      if(r.ok&&j&&j.ok&&j.mode==='ai') res=j; else why=(j&&j.code)||('HTTP_'+r.status);
    }catch(e){ why=e.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR'; AI._failed=true; }
  } else if(!res&&!why) why=cs?(AI.claudeOff||'UPSTREAM_ERROR'):'NO_CLAUDE';
  if(!res){ const raw=RayPromise.demoParse(input.message,input); const v=RayPromise.validateInterpretation(raw,input); res={mode:'rule', interpretation:v.interpretation, checks:v.checks, canConfirm:v.canConfirm, unavailable:why}; }
  const it=res.interpretation;
  Object.assign(st,{status:'done', mode:res.mode, provider:res.provider||null, model:res.model||null, unavailable:res.unavailable||null, interpretation:it, checks:res.checks||[], canConfirm:!!res.canConfirm,
    fields:{firstAmt:it.promisedAmountNow, firstDate:it.firstPaymentDate, laterAmt:it.promisedAmountLater, laterDate:it.promisedDate}, edited:false});
  if(key==='gupta'&&['new','reading'].includes(S.gupta.promise)) S.gupta.promise='understood';
  rr(); if(document.getElementById('wa-root').innerHTML) waRender();
  return st;
}
const UNAVAIL = {NO_CLAUDE:'Live AI runs when this page is opened in Claude', AI_NOT_GRANTED:'You chose not to let this page use Claude', SAMPLING_DISABLED:'Claude is not available for this account', SESSION_EXPIRED:'Sign in to Claude again to use live AI', SCENARIO:'Presenter shortcut: scenario loaded without a live call', AI_NOT_CONFIGURED:'AI is not configured on this deployment (no API key)', NO_SERVER:'Opened without the API server', NETWORK_ERROR:'AI endpoint not reachable from here', TIMEOUT:'AI request timed out', RATE_LIMITED:'AI provider is rate limiting', INVALID_MODEL_OUTPUT:'Model returned invalid output', UPSTREAM_ERROR:'AI provider error', HTTP_404:'No AI endpoint on this host', HTTP_405:'No AI endpoint on this host'};
const INTENT_LABEL = {promise:'Payment promise', payment_claim:'Payment claim', dispute:'Dispute', extension_request:'Extension request', general_query:'General query', unclear:'Unclear'};
function modeBadge(st){ return st.mode==='ai'?`<span class="badge b-b">${clover(11)} AI · ${esc(st.model||'model')}</span>`:`<span class="badge b-n" title="${esc(UNAVAIL[st.unavailable]||st.unavailable||'')}">Rule-based demo parser · not AI</span>`; }
function highlight(msg, spans){ let h=esc(msg); (spans||[]).slice().sort((a,b)=>b.length-a.length).forEach(sp=>{ const re=new RegExp(esc(sp).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'); h=h.replace(re,m=>`<mark>${m}</mark>`); }); return h; }
function interpPanel(key, opts={}){
  const st=S.interp[key]; const id=opts.buyerId||(st&&st.input.buyerId);
  if(!st||st.status==='idle'){ return opts.idle||''; }
  if(st.status==='loading') return `<div style="padding:16px 0">${thinking(claudeLive()?'Reading the message with Claude…':AI.configured?`Interpreting with ${AI.model}…`:'Interpreting the message…')}</div>`;
  const it=st.interpretation, f=st.fields, inp=st.input, prom=S.promises.find(p=>p.key===key&&p.status!=='replaced');
  const status=prom?(prom.status==='kept'?'<span class="badge b-g">Kept · payment verified</span>':prom.status==='missed'?'<span class="badge b-r">Promise missed</span>':'<span class="badge b-g">'+I('check',11,2.6)+' Confirmed by you</span>'):st.routed?`<span class="badge b-b">${esc(st.routed)}</span>`:'<span class="badge b-a">Extracted · not confirmed</span>';
  const fld=(k,lbl,type)=>`<div class="field"><label>${lbl}</label>${type==='date'?`<input type="date" class="input" id="ip-${key}-${k}" min="${S.today}" value="${f[k]||''}" ${prom?'disabled':''} oninput="A.ipEdit('${key}')">`:`<input class="input num" id="ip-${key}-${k}" value="${f[k]!=null?f[k]:''}" placeholder="Not stated" ${prom?'disabled':''} oninput="A.ipEdit('${key}')">`}</div>`;
  const showFields=['promise','extension_request'].includes(it.intent)||(it.intent==='dispute'&&(f.firstAmt||f.laterAmt));
  const flags=[it.amountInferred?'Amount inferred from the invoice':'' , it.dateInferred?'Date resolved from a relative expression':'', it.isConditional?'Tentative wording':'' , it.needsClarification?'Needs clarification':''].filter(Boolean);
  const err=st.err?`<div class="xs mt8" style="color:var(--r);font-weight:600">${esc(st.err)}</div>`:'';
  let acts='';
  if(prom) acts=`<button class="btn btn-s btn-sm" onclick="A.ipReopen('${key}')">${I('edit',13)} Edit commitment</button>`;
  else if(it.intent==='promise'||it.intent==='extension_request') acts=`<button class="btn btn-p btn-sm" onclick="A.ipConfirm('${key}')" ${blocked()?'disabled':''}>Confirm commitment</button>${it.needsClarification||!st.canConfirm?`<button class="btn btn-s btn-sm" onclick="A.ipClarify('${key}')">Ask buyer to clarify</button>`:''}`;
  else if(it.intent==='dispute') acts=`<button class="btn btn-p btn-sm" onclick="A.ipDispute('${key}')">Open dispute review</button><button class="btn btn-g btn-sm" onclick="A.ipClarify('${key}')">Ask for details</button>`;
  else if(it.intent==='payment_claim') acts=`<button class="btn btn-p btn-sm" onclick="A.ipClaim('${key}')">Send to payment review</button><button class="btn btn-g btn-sm" onclick="A.ipClarify('${key}')">Ask for UTR</button>`;
  else acts=`<button class="btn btn-s btn-sm" onclick="A.ipClarify('${key}')">Ask buyer to clarify</button>`;
  if(st.routed) acts='';
  return `<div class="ip ${opts.compact?'ip-c':''}">
   <div class="row gap8 wrap">${modeBadge(st)}${status}<span class="badge ${it.intent==='promise'?'b-b':it.intent==='dispute'?'b-a':it.intent==='payment_claim'?'b-n':'b-n'}">${INTENT_LABEL[it.intent]}</span><span class="xs muted">Confidence: ${it.confidenceLabel}</span></div>
   ${st.mode!=='ai'?`<div class="xs muted mt4">${esc(UNAVAIL[st.unavailable]||'Live AI unavailable')}. Showing the deterministic fallback so the demo still works; it is not an AI model.</div>`:''}
   <div class="ip-msg mt8">“${highlight(inp.message, it.evidenceSpans)}”<span class="xs muted"> · ${esc(inp.buyerName||'')} · ${inp.inv} · ${inr(inp.outstanding)} outstanding</span></div>
   <div class="small mt8" style="color:var(--strong)">${esc(it.reasoningSummary)}</div>
   ${showFields?`<div class="ip-g mt12">${fld('firstAmt','First payment (₹)')}${fld('firstDate','On','date')}${fld('laterAmt','Balance (₹)')}${fld('laterDate','By','date')}</div>`:''}
   ${flags.length?`<div class="row gap6 mt8 wrap">${flags.map(x=>`<span class="badge b-n">${x}</span>`).join('')}</div>`:''}
   ${st.checks.length?`<div class="xs muted mt8">${I('shield',11)} Checks: ${st.checks.map(esc).join(' · ')}</div>`:''}
   ${it.intent==='payment_claim'?'<div class="xs mt8" style="color:var(--strong);font-weight:500">A claim is not a verified payment. Nothing is marked as paid until it is reconciled.</div>':''}
   ${it.intent==='dispute'?'<div class="xs mt8" style="color:var(--strong);font-weight:500">Routed as a dispute, not a missed payment. It will not count against the buyer.</div>':''}
   ${err}
   <div class="row gap8 mt12 wrap">${acts}<span class="grow"></span><span class="xs muted">Extracted ≠ confirmed ≠ received</span></div></div>`;
}
A.ipEdit=(key)=>{ const st=S.interp[key]; if(!st) return; st.edited=true; st.err=null; };
function ipRead(key){ const st=S.interp[key], g=k=>{const e=document.getElementById(`ip-${key}-${k}`); return e?e.value.trim():''}; const n=v=>v===''?null:parseInt(v.replace(/[^\d]/g,''),10);
  const f={firstAmt:n(g('firstAmt')), firstDate:g('firstDate')||null, laterAmt:n(g('laterAmt')), laterDate:g('laterDate')||null};
  if(!document.getElementById(`ip-${key}-firstAmt`)) return st.fields; return f; }
function ipValidate(f, out){ const errs=[];
  if([f.firstAmt,f.laterAmt].some(v=>v!=null&&(isNaN(v)||v<0))) errs.push('Amounts must be positive numbers.');
  if(!f.firstAmt&&!f.laterAmt) errs.push('Enter at least one amount the buyer committed to.');
  if((f.firstAmt||0)+(f.laterAmt||0)>out+1) errs.push(`Amounts add up to more than the ${inr(out)} outstanding.`);
  if(f.laterAmt&&!f.laterDate) errs.push('Add a date for the balance, or ask the buyer to clarify.');
  if(f.firstAmt&&!f.firstDate) errs.push('Add a date for the first payment.');
  [f.firstDate,f.laterDate].forEach(d=>{ if(d&&(!RayDates.isISO(d)||RayDates.diffDays(d,S.today)<0)) errs.push('Dates cannot be in the past.'); });
  return errs; }
A.ipConfirm=(key)=>{ const st=S.interp[key]; if(!st) return; const f=ipRead(key); const inp=st.input; const out=balOf(inp.buyerId,inp.inv)||inp.outstanding;
  const errs=ipValidate(f,out); if(errs.length){ st.fields=f; st.err=errs.join(' '); rr(); return; }
  const edited=['firstAmt','firstDate','laterAmt','laterDate'].some(k=>(st.fields[k]||null)!==(f[k]||null))||st.edited;
  st.fields=f; saveCommitment(key, f, edited); };
function saveCommitment(key, f, edited){ const st=S.interp[key], inp=st.input, id=inp.buyerId;
  const old=S.promises.find(p=>p.key===key&&p.status==='confirmed');
  const p={id:'pr-'+(S.promises.length+1), key, buyerId:id, inv:inp.inv, first:f.firstAmt?{amt:f.firstAmt, date:f.firstDate}:null, later:f.laterAmt?{amt:f.laterAmt, date:f.laterDate}:null, status:'confirmed', source:st.mode, model:st.model, edited, message:inp.message, at:nowLabel()};
  if(!p.first) p.first={amt:0,date:S.today,paid:true};
  if(old){ old.status='replaced'; recordEvent({type:'PROMISE_EDITED', buyerId:id, invoice:inp.inv, amount:(f.firstAmt||0)+(f.laterAmt||0), source:'Merchant', actor:M.owner, meta:{promiseId:old.id, newPromiseId:p.id}}); }
  else recordEvent({type:'PROMISE_RECORDED', buyerId:id, invoice:inp.inv, amount:(f.firstAmt||0)+(f.laterAmt||0), source:st.mode==='ai'?'AI extraction, confirmed by merchant':'Merchant-confirmed', actor:M.owner, meta:{promiseId:p.id, edited}});
  S.promises.push(p);
  const txt=[f.firstAmt?`${inr(f.firstAmt)} ${f.firstDate===S.today?'today':'on '+RayDates.fmtDay(f.firstDate)}`:'', f.laterAmt?`${inr(f.laterAmt)} by ${RayDates.fmtDay(f.laterDate)}`:''].filter(Boolean).join(' · ');
  log({ic:'cal',ti:`${old?'Promise updated':'Promise recorded'} for ${BUY[id].name}`,de:`${txt} · ${inp.inv} · ${st.mode==='ai'?'extracted by AI':'read by the rule-based parser'}${edited?' · edited by you':''}`,src:['conv'],who:'Confirmed by '+M.owner,chem:BUY[id].name});
  if(key==='gupta'){ S.gupta.promise='saved'; if(S.bank.st==='on'&&f.firstAmt&&f.firstDate===S.today) setTimeout(()=>{ if(S.gupta.promise==='saved'){ payGupta('bank'); rr(); } },2600); }
  rr(); toast(old?'Commitment updated':'Commitment confirmed · added to collections'); }
A.ipReopen=(key)=>{ const p=S.promises.find(x=>x.key===key&&x.status==='confirmed'); const st=S.interp[key]; if(!p||!st) return;
  modal({title:'Edit payment commitment',body:`<div class="grid g2"><div class="field"><label>First payment (₹)</label><input class="input num" id="ep-fa" value="${p.first&&p.first.amt||''}"></div><div class="field"><label>On</label><input type="date" class="input" id="ep-fd" min="${S.today}" value="${p.first&&p.first.date||S.today}"></div></div><div class="grid g2 mt12"><div class="field"><label>Balance (₹)</label><input class="input num" id="ep-la" value="${p.later&&p.later.amt||''}"></div><div class="field"><label>By</label><input type="date" class="input" id="ep-ld" min="${S.today}" value="${p.later&&p.later.date||''}"></div></div><div class="xs mt8" id="ep-err" style="color:var(--r);font-weight:600"></div><p class="xs muted mt8">Saving records a PROMISE_EDITED event and updates collections and Activity.</p>`,
   actions:[{label:'Cancel'},{label:'Save changes',cls:'btn-p',fn:()=>{ const n=v=>v===''?null:parseInt(String(v).replace(/[^\d]/g,''),10); const f={firstAmt:n(document.getElementById('ep-fa').value), firstDate:document.getElementById('ep-fd').value||null, laterAmt:n(document.getElementById('ep-la').value), laterDate:document.getElementById('ep-ld').value||null};
     if(p.first&&p.first.paid&&f.firstAmt===p.first.amt){ /* already received, keep */ }
     const errs=ipValidate(f, balOf(p.buyerId,p.inv)+(p.first&&p.first.paid?(p.first.amt||0):0)); if(errs.length){ document.getElementById('ep-err').textContent=errs.join(' '); return; }
     closeModal(); st.fields=f; saveCommitment(key,f,true); }}]}); };
A.ipClarify=(key)=>{ const st=S.interp[key]; const inp=st.input, id=inp.buyerId, first=BUY[id].name.split(' ')[0];
  const it=st.interpretation; const q=it.intent==='payment_claim'?`kripya UTR ya payment screenshot bhej dijiye taaki hum ${inp.inv} match kar saken`:it.intent==='dispute'?`kripya batayein kitna maal short/kharab aaya, hum ${inp.inv} check karke adjust karenge`:`kripya confirm karein kitna amount aur kis date tak bhejenge (${inp.inv}, ${inr(inp.outstanding)})`;
  const msg=`Namaste ${first} ji, ${q}. Dhanyavaad!`;
  const g=gateFor(id,'whatsapp',inp.inv);
  modal({title:`Ask ${BUY[id].name} to clarify?`,body:`<div class="wa-preview"><div class="wa-bubble">${esc(msg)}</div></div><div class="xs mt12 ${g.action==='block'?'':'muted'}" style="${g.action==='block'?'color:var(--r);font-weight:600':''}">${g.action==='send'?'Controls checked: OK to send now.':esc(gateNote(g))}</div><p class="xs muted mt8">Commitment stays unconfirmed until the buyer replies and you confirm.</p>`,
   actions:[{label:'Cancel'},{label:g.action==='queue'?'Queue message':'Send on WhatsApp',cls:'btn-p',disabled:g.action==='block',fn:()=>{ closeModal(); const r=trySend(id,{kind:'clarification',inv:inp.inv,msg,via:'Dashboard'});
     if(r.blocked) return toast('Not sent: '+gateNote(r.gate)); st.routed=r.queued?'Clarification queued':'Clarification requested'; log({ic:'chat',ti:`Clarification ${r.queued?'queued':'sent'} to ${BUY[id].name}`,de:`${inp.inv} · commitment not recorded until confirmed`,src:['conv'],who:'Approved by '+M.owner,chem:BUY[id].name}); rr(); toast(r.queued?'Queued for the end of quiet hours':'Clarification sent'); }}]}); };
A.ipDispute=(key)=>{ const st=S.interp[key], inp=st.input; const amt=balOf(inp.buyerId,inp.inv); if(!amt) return toast('Nothing outstanding on '+inp.inv);
  const r=recordEvent({type:'DISPUTE_OPENED', buyerId:inp.buyerId, invoice:inp.inv, amount:amt, source:'Buyer message', actor:M.owner}); if(!r.ok) return;
  st.routed='Dispute review opened'; log({ic:'receipt',ti:`Dispute review opened · ${BUY[inp.buyerId].name}`,de:`${inp.inv} · “${inp.message.slice(0,60)}” · reminders paused · not a default`,src:['conv'],who:M.owner,chem:BUY[inp.buyerId].name}); rr(); toast('Dispute review opened · reminders paused'); };
A.ipClaim=(key)=>{ const st=S.interp[key], inp=st.input; const amt=st.interpretation.promisedAmountNow||balOf(inp.buyerId,inp.inv);
  const r=recordEvent({type:'PAYMENT_CLAIMED', buyerId:inp.buyerId, invoice:inp.inv, amount:Math.min(amt,balOf(inp.buyerId,inp.inv))||1, verification:'unverified', source:'Buyer message', actor:BUY[inp.buyerId].name}); if(!r.ok) return;
  st.routed='In payment review'; log({ic:'match',ti:`Payment claim sent to review · ${BUY[inp.buyerId].name}`,de:`${inp.inv} · unverified · balance unchanged · reminders paused until reconciled`,src:['conv'],who:M.owner,chem:BUY[inp.buyerId].name}); rr(); toast('Sent to payment review · not marked as paid'); };
A.claimVerify=(id, inv, found)=>{ const i=invOf(id,inv); if(!i||!i.claim) return;
  if(found){ const amt=Math.min(i.claim.amount,i.bal); const r=recordEvent({type:'PAYMENT_RECONCILED', buyerId:id, invoice:inv, amount:amt, verification:'verified', source:'Bank account (Connected Banking+)', actor:M.owner, ref:'claim-'+i.claim.id}); if(!r.ok) return; log({ic:'match',ti:`Claimed payment found · ${BUY[id].name}`,de:`${inr(amt)} matched to ${inv} · verified`,src:['aa'],who:'Confirmed by '+M.owner,chem:BUY[id].name}); }
  else { recordEvent({type:'CLAIM_REJECTED', buyerId:id, invoice:inv, source:'Reconciliation', actor:M.owner}); log({ic:'x',ti:`Claimed payment not found · ${BUY[id].name}`,de:`${inv} · balance unchanged · reminders can resume`,src:['rzp','aa'],who:M.owner,chem:BUY[id].name}); }
  rr(); toast(found?'Payment verified and matched':'Claim closed · balance unchanged'); };
function claimRows(offset=0){ const rows=[]; Object.keys(S.led.invoices).forEach(id=>invsOf(id).forEach(i=>{ if(i.claim&&i.bal>0){ const c=chemView(chem(id)); rows.push(aRow(offset+rows.length,{id:'act-cl-'+id,name:c.name,band:c.band,area:i.inv,amt:inr(i.claim.amount),kind:'Payment claimed',kc:'k-held',reason:'Buyer says paid · unverified · reminders paused',chan:'Reconciliation',chanIc:'match',right:`<button class="btn btn-p btn-sm" onclick="A.claimVerify('${id}','${i.inv}',true)">Found in bank (simulated)</button><button class="btn btn-g btn-sm" onclick="A.claimVerify('${id}','${i.inv}',false)">Not found</button>`})); } })); return rows.join(''); }

/* generic "interpret a buyer message" card on a buyer profile */
function interpCard(id){
  const key='msg:'+id; const st=S.interp[key]; const open=invsOf(id).filter(i=>i.bal>0); if(!open.length) return '';
  const sel=(st&&st.input.inv)||open[0].inv;
  const idle=`<div class="ip-in mt12"><textarea class="textarea" id="ipq-${id}" rows="2" placeholder="Paste or type the buyer’s WhatsApp reply, e.g. “Kal 5 hazaar bhejunga, baaki Friday”"></textarea>
    <div class="row gap8 mt8 wrap"><select class="select" id="ipi-${id}" style="max-width:300px">${open.map(i=>`<option value="${i.inv}" ${i.inv===sel?'selected':''}>${i.inv} · ${inr(i.bal)} outstanding</option>`).join('')}</select><button class="btn btn-p btn-sm" onclick="A.ipRun('${id}')">${clover(13)} Interpret</button><span class="xs muted">${esc(aiLabel())}</span></div></div>`;
  const body=!st||st.status==='idle'?idle:`${interpPanel(key,{buyerId:id})}<div class="mt8"><a class="link xs" onclick="S.interp['${key}']={status:'idle',input:{inv:'${sel}'}};rr()">Interpret another message</a></div>`;
  return `<div class="card pad mt16" id="ip-card-${id}"><div class="row between"><div class="row gap8"><span class="ai-tag">${clover(14)}</span><span class="h3">Buyer message</span></div><span class="xs muted">Promise, dispute or payment claim · you confirm before anything is saved</span></div>${body}</div>`;
}
A.ipRun=(id)=>{ const q=(document.getElementById('ipq-'+id)||{}).value||''; const inv=(document.getElementById('ipi-'+id)||{}).value; if(!q.trim()) return toast('Type the buyer’s message first');
  interpretMessage('msg:'+id,{buyerId:id, buyerName:BUY[id].name, message:q.trim().slice(0,RayPromise.MAX_MESSAGE), inv, outstanding:balOf(id,inv), messageDate:S.today}); };

/* ---------- Behind RAY ---------- */
A.behind=()=>{ const tag=(k)=>({impl:'<span class="arch-t impl">Working logic</span>',mock:'<span class="arch-t mock">Mocked integration</span>',syn:'<span class="arch-t syn">Synthetic data</span>',ai:'<span class="arch-t ai">Live LLM when configured</span>',prop:'<span class="arch-t prop">Proposed</span>'}[k]);
  const L=[['Data sources',[['Marg / Tally ledger','mock'],['Razorpay payment history','syn'],['RazorpayX Connected Banking+','mock'],['WhatsApp Business conversations','mock'],['Consented network signals','syn']]],
   ['Data processing',[['Event normalisation (lib/events.js)','impl'],['Payment reconciliation and de-duplication','impl'],['Buyer identity matching','mock'],['Permissions and consent checks','impl'],['Freshness checks','impl']]],
   ['AI understanding',[['Hinglish promise interpretation','ai'],['Dispute and payment-claim detection','ai'],['Structured extraction + deterministic checks','impl']]],
   ['Credit policy engine',[['Signal calculation','impl'],['Band classification','impl'],['Limit and terms recommendation','impl'],['Decision explanation','impl']]],
   ['Merchant action',[['Review · edit · approve','impl'],['Send-time controls (DNC, limits, quiet hours)','impl'],['WhatsApp send / mandate execution','mock']]],
   ['Outcomes',[['Payment received · promise kept or missed','impl'],['Collection failure · dispute resolved','impl']]],
   ['Updated repayment features',[['Next credit recommendation','impl'],['Cross-distributor production network','prop'],['RAY Payment Passport','prop']]]];
  modal({title:'Behind RAY',wide:true,body:`<p class="small muted">How a recommendation is produced, and which parts of this prototype are real.</p><div class="arch mt12">${L.map(([h,items],i)=>`<div class="arch-s"><div class="arch-h"><span class="arch-n">${i+1}</span>${h}</div><div class="arch-i">${items.map(([t,k])=>`<div class="row between gap8"><span class="small">${t}</span>${tag(k)}</div>`).join('')}</div></div>`).join(`<div class="arch-a">${I('down',14,2)}</div>`)}</div>
   <p class="xs muted mt12">The LLM is used in one place: reading buyer messages. Credit limits, bands and terms come from the rule-based policy (${POL.version}), which is deterministic and explainable. Outcome events update buyer signals; no model is trained.</p>`,actions:[{label:'About this demo',fn:()=>A.about()},{label:'Close',cls:'btn-p'}]}); const m=document.querySelector('#modal .modal'); if(m) m.classList.add('xwide'); };

/* ---------- About this demo ---------- */
A.about=()=>{ const st=pfStats();
  const col=(h,cls,items)=>`<div class="ab-c"><div class="ab-h ${cls}">${h}</div>${items.map(x=>`<div class="ab-i">${x}</div>`).join('')}</div>`;
  modal({title:'About this demo',wide:true,body:`<p class="small" style="color:var(--strong)">RAY Credit is a <b>concept prototype</b> for Razorpay Agent Studio, built on synthetic data. It is not a live Razorpay product and connects to no real account, bank or WhatsApp number.</p>
   <div class="ab-g mt12">
    ${col('Working','ok',['Credit policy engine: bands, limits, terms, explanations for all '+st.buyers+' synthetic buyers','Event-driven ledger: payments, failures, promises, disputes update balances and signals','Outcome-informed recommendations with "What changed" and approval','Payment promise editing, validation and collections view','Merchant controls enforced at send time: Do not contact, weekly limit, quiet hours (IST), channels, stale ledger, payment review','Per-buyer network consent: request, accept, decline, revoke, dispute','Live AI reads buyer messages (promise, payment claim, dispute) with Claude, on the viewer’s own Claude account; every answer is checked against the message before you can confirm it ('+esc(aiLabel())+')','Unit, API and browser tests'])}
    ${col('Simulated','sim',['Marg ERP ledger and sync','Razorpay payment events and Smart Collect','Bank-feed transactions (Connected Banking+)','WhatsApp delivery and buyer replies','UPI Autopay / eNACH mandates and debits','<b>Razorpay network repayment signals: synthetic and aggregated</b>','Credit approvals written to a mock ledger','The rule-based message parser, used only when Claude is unavailable or not allowed (labelled, not AI)'])}
    ${col('Proposed','prop',['Production cross-distributor network (needs participation, consent, privacy and legal review, potentially including credit-information regulation)','RAY Payment Passport for retailers','Regulated financing through a lending partner (separate from trade-credit decisions)','WhatsApp Business inbox integration'])}
   </div>
   <div class="row between mt16 wrap gap8" style="border-top:1px solid var(--border-subtle);padding-top:12px"><label class="row gap8 small" style="cursor:pointer"><input type="checkbox" ${S.persist!==false?'checked':''} onchange="S.persist=this.checked;if(!this.checked)persistClear();else persistSave()"> Keep my demo changes in this browser after refresh</label><span class="xs muted">Policy ${POL.version} · build ${BUILD_ID} · ${st.buyers} buyers · ${st.openInvoices.toLocaleString('en-IN')} open invoices (synthetic)</span></div>`,
   actions:[{label:'Behind RAY',fn:()=>A.behind()},{label:'Reset demo',fn:()=>{closeModal();A.reset();}},{label:'Close',cls:'btn-p'}]}); const m=document.querySelector('#modal .modal'); if(m) m.classList.add('xwide'); };

/* ---------- open invoices, straight from the ledger ---------- */
function invTable(id){
  const list=invsOf(id); if(!list.length) return '';
  const pr=openPromise(id);
  const st=i=>{ const b=[]; const d=RayDates.diffDays(S.today,i.due);
    if(i.bal<=0) return '<span class="badge b-g">Paid · verified</span>';
    if(i.bal<i.amt) b.push(`<span class="badge b-n">Part-paid ${inr(i.amt-i.bal)}</span>`);
    if(i.disputed) b.push(`<span class="badge b-a">${inr(i.disputed)} disputed</span>`);
    if(i.claim) b.push('<span class="badge b-n">Payment claimed · unverified</span>');
    if(i.lastFailed) b.push(`<span class="badge b-r">${(sigOf(id).debit.method||'Debit')} failed ${RayDates.fmtShort(i.lastFailed)}</span>`);
    if(pr&&pr.inv===i.inv) b.push(`<span class="badge b-b">Promise ${pr.later&&pr.later.date?'by '+RayDates.fmtShort(pr.later.date):'today'}</span>`);
    b.push(d>0?`<span class="badge ${d>14?'b-r':'b-a'}">${d} day${d===1?'':'s'} overdue</span>`:d===0?'<span class="badge b-a">Due today</span>':`<span class="badge b-n">Due in ${-d} days</span>`);
    return `<span class="row gap4 wrap">${b.join('')}</span>`; };
  return `<div class="card mt16" id="inv-${id}"><div class="row between pad-s" style="border-bottom:1px solid var(--border-subtle)"><span class="h3">Open invoices</span><span class="src led">Ledger · ${curTermsOf(id)}-day terms · ${inr(outOf(id))} outstanding</span></div>
   <table class="table"><thead><tr><th>Invoice</th><th>Date</th><th class="r">Amount</th><th class="r">Due now</th><th>Due date</th><th>Status</th></tr></thead><tbody>
   ${list.map(i=>`<tr><td class="nm">${i.inv}</td><td>${RayDates.fmtShort(i.issued)}</td><td class="r num">${inr(i.amt)}</td><td class="r num nm">${inr(i.bal)}</td><td>${RayDates.fmtShort(i.due)}</td><td>${st(i)}</td></tr>`).join('')}
   </tbody></table></div>`;
}
