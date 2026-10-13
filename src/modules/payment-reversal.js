/* ================= PAYMENT CORRECTION: reverse a recorded payment with a compensating event =================
 * A recorded payment is never edited or deleted. "Reverse recorded payment" appends PAYMENT_REVERSED, which
 * restores the invoice balance and leaves the original event in the log. lib/events.js enforces the rules
 * (known payment, not already reversed, same buyer and invoice, same amount, reason required, balance cannot
 * exceed the invoice amount). This is a ledger correction, not a refund: no money moves.
 *
 *   recordedPayments(id)    payments recorded in this session for a buyer, with their reversal status
 *   A.payRevStart(eventId)  confirmation: reference, amount, invoice, balance before → after, effect on recovery
 *   payReverse(eventId,...) the one command path (idempotent); every surface re-reads the ledger afterwards
 */
const REV_REASONS = ['Recorded against the wrong invoice or buyer','Amount entered incorrectly','Payment returned or bounced (simulated)','Duplicate entry','Other'];
const isSeedEv = e => String(e.id).startsWith('ev-seed');
const payLive = e => MONEY_IN_T.includes(e.type) && !RayEvents.isReversed(S.led, e.id);
function recordedPayments(id){
  return evOf(id).filter(e=>MONEY_IN_T.includes(e.type)&&!isSeedEv(e)).map(e=>{ const rid=S.led.reversed&&S.led.reversed[e.id]; const rev=rid?S.led.events.find(x=>x.id===rid):null;
    return {e, rev, group:RayEvents.reversalGroup(S.led, e.id)}; }); }

/* what the reversal would do, computed before anything is recorded */
function reversalPreview(eventId){
  const o=RayEvents.findEvent(S.led, eventId); if(!o) return {ok:false, error:'That payment is not in the ledger. Nothing to reverse.'};
  if(!MONEY_IN_T.includes(o.type)) return {ok:false, error:'Only recorded payments can be reversed.'};
  if(RayEvents.isReversed(S.led, eventId)) return {ok:false, error:'This payment was already reversed. Nothing changed.'};
  const group=RayEvents.reversalGroup(S.led, eventId);
  if(group.some(g=>RayEvents.isReversed(S.led,g.id))) return {ok:false, error:'Part of this payment was already reversed. Review the ledger before correcting it again.'};
  const rows=group.map(g=>{ const i=invOf(g.buyerId,g.invoice); return {ev:g, inv:g.invoice, amount:g.amount, before:i?i.bal:0, after:i?i.bal+g.amount:g.amount, invAmt:i?i.amt:null}; });
  const bad=rows.find(r=>r.invAmt!=null&&r.after>r.invAmt+0.5);
  if(bad) return {ok:false, error:`Reversing would take ${bad.inv} above its invoice amount. The ledger needs review before this correction.`};
  const id=o.buyerId, f=typeof FAILS!=='undefined'?FAILS[id]:null, rec=f?recoveryOf(id):null;
  const recAfter=rec&&rows.some(r=>r.inv===rec.inv)?(()=>{ const row=rows.find(r=>r.inv===rec.inv); const recv=Math.max(0,rec.received-row.amount); return row.after<=0?'Recovered in full':recv>0?`${inr(recv)} received · ${inr(row.after)} remaining`:'Open again · recovery needs a step'; })():null;
  return {ok:true, o, id, rows, total:rows.reduce((a,r)=>a+r.amount,0), rec, recAfter}; }

A.payRevStart=(eventId)=>{ const p=reversalPreview(eventId); if(!p.ok) return toast(p.error);
  const o=p.o, nm=BUY[p.id].name;
  modal({title:'Reverse recorded payment?',body:`<div class="pr-kv" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div><span>Buyer</span><b>${esc(nm)}</b></div><div><span>Reference</span><b style="word-break:break-all">${esc(o.ref||o.id)}</b></div><div><span>Recorded</span><b>${RayDates.fmtShort(o.date)} · ${esc(o.source||'')}</b></div></div>
    <table class="table mt12 rev-t"><thead><tr><th>Invoice</th><th class="r">Amount reversed</th><th class="r">Balance now</th><th class="r">After correction</th></tr></thead><tbody>${p.rows.map(r=>`<tr><td>${r.inv}</td><td class="r num">${inr(r.amount)}</td><td class="r num">${inr(r.before)}</td><td class="r num"><b>${inr(r.after)}</b></td></tr>`).join('')}</tbody></table>
    ${p.rows.length>1?`<div class="xs muted mt4">This bank credit was split across ${p.rows.length} invoices, so all parts are reversed together.</div>`:''}
    ${p.recAfter?`<div class="kvline mt8"><span>Recovery of ${p.rec.inv}</span><b>${esc(p.rec.label)} → ${esc(p.recAfter)}</b></div>`:''}
    <div class="field mt12"><label for="rev-reason">Why is this being corrected?</label><select class="select" id="rev-reason">${REV_REASONS.map(x=>`<option>${x}</option>`).join('')}</select></div>
    <div class="field mt8"><label for="rev-note">Note <span class="muted">(optional)</span></label><input class="input" id="rev-note" maxlength="140" placeholder="For example, entered against INV-24891 by mistake"></div>
    <div class="ol-note mt12"><span style="color:var(--a);flex-shrink:0">${I('info',15,2)}</span><span>This corrects the ledger. It is not a refund and moves no money. The original payment stays in the audit log; a PAYMENT_REVERSED event is added. Balances, recovery, reminders and the credit recommendation are recalculated.</span></div>
    <div class="xs mt8" id="rev-err" role="alert" style="color:var(--r);font-weight:600"></div>`,
   actions:[{label:'Cancel'},{label:`Reverse ${inr(p.total)}`,cls:'btn-d',id:'rev-confirm',fn:()=>{ const reason=(document.getElementById('rev-reason')||{}).value||REV_REASONS[4], note=((document.getElementById('rev-note')||{}).value||'').trim();
     const r=payReverse(eventId, reason+(note?' · '+note:''), prMob()?'RAY Credit for Mobile':'Dashboard'); if(!r.ok){ const e=document.getElementById('rev-err'); if(e) e.textContent=r.error; else toast(r.error); return; }
     closeModal(); rr(); if(S.mob) mobRender(); toast(`Payment reversed · ${r.rows.map(x=>`${x.inv} ${inr(x.after)} due`).join(' · ')}`); }}]}); };

/* the one command path. Idempotent: a second call for the same payment changes nothing. */
function payReverse(eventId, reason, via){
  S.opKeys=S.opKeys||{}; const key='rev:'+eventId;
  const p=reversalPreview(eventId); if(!p.ok) return Object.assign(p,{dup:S.opKeys[key]?true:undefined});
  if(S.paused) return {ok:false, error:'RAY is paused. Resume it in Controls to correct the ledger.'};
  if(!reason||String(reason).trim().length<3) return {ok:false, error:'Choose a reason for the correction.'};
  /* validate every part first, so a split payment is reversed all-or-nothing */
  for(const r of p.rows){ const err=RayEvents.validate(S.led, revEvent(r.ev, reason, via)); if(err) return {ok:false, error:err}; }
  const done=[];
  for(const r of p.rows){ const res=recordEvent(revEvent(r.ev, reason, via),{quiet:true}); if(!res.ok) return {ok:false, error:res.error, partial:done}; done.push(Object.assign({}, r, {after:res.event.meta.balanceAfter, rev:res.event})); }
  S.opKeys[key]=done.map(d=>d.rev.id);
  afterReversal(p.id, p.o, done, reason);
  return {ok:true, rows:done, buyerId:p.id}; }
const revEvent = (o, reason, via) => ({type:'PAYMENT_REVERSED', date:S.today, buyerId:o.buyerId, invoice:o.invoice, amount:o.amount, verification:'n/a', source:'Merchant correction ('+(via||'Dashboard')+')', actor:M.owner, meta:{reverses:o.id, reason:String(reason).slice(0,200), originalRef:o.ref||null, originalType:o.type}});

/* consequences, applied the same way whichever surface reversed it */
function afterReversal(id, o, rows, reason){
  const nm=BUY[id].name;
  /* a commitment marked paid by this payment is open again; a "kept" outcome is reopened with an event */
  (S.promises||[]).filter(p=>p.buyerId===id&&rows.some(r=>r.inv===p.inv)).forEach(p=>{
    if(p.first&&p.first.paid&&(p.first.paidEv?rows.some(r=>r.ev.id===p.first.paidEv):p.first.amt===o.amount)) p.first.paid=false;
    if(p.status==='kept'){ const k=evOf(id).filter(e=>e.type==='PROMISE_KEPT'&&e.meta&&e.meta.promiseId===p.id).pop();
      if(k) recordEvent({type:'PROMISE_REOPENED', buyerId:id, invoice:p.inv, source:'Payment correction', actor:'RAY', meta:{reverses:k.id, promiseId:p.id}},{quiet:true}); p.status='confirmed'; } });
  if(id==='gupta'&&S.gupta.paidVia&&rows.some(r=>r.inv==='INV-24891')&&balOf('gupta','INV-24891')>0){ S.gupta.promise=S.gupta.promise==='broken'?'broken':'saved'; S.gupta.paidVia=null; S.gupta.paidAmt=0; }
  /* a payment review that this payment closed is open again: reminders stay on hold until it is reviewed */
  if(typeof PAYREV!=='undefined'&&PAYREV[id]&&rows.some(r=>r.inv===PAYREV[id].inv)){ const st=prS(id); if(['received','matched','rzp'].includes(st.st)) st.st=null; if(id==='verma') S.vermaMatched=false; }
  if(S.adj&&S.adj[id]) S.adj[id]=Math.max(0,S.adj[id]-rows.reduce((a,r)=>a+r.amount,0));
  if(S.chase&&S.chase[id]&&['matched','paidbank'].includes(S.chase[id].st)&&outOf(id)>0) S.chase[id].st='draft';
  if(S.coll&&['paidbank','received'].includes(S.coll[id])&&outOf(id)>0) delete S.coll[id];
  if(typeof KIR!=='undefined'&&id===KIR.id&&S.kir&&S.kir.pay==='received'&&balOf(id,KIR.inv)>0){ S.kir.pay='initiated'; if(S.kir.outcome==='kept') S.kir.outcome=null; }
  const tot=rows.reduce((a,r)=>a+r.amount,0);
  log({ic:'undo',ti:`Payment reversed · ${nm}`,de:`${o.ref||o.id} · ${inr(tot)} · ${rows.map(r=>`${r.inv} ${inr(r.before)} → ${inr(r.after)}`).join(' · ')} · ${reason} · original payment kept in the log · ledger correction, not a refund`,src:['led'],who:'Corrected by '+M.owner,chem:nm});
  if(S.wa&&S.wa.msgs) waPush({from:'ray',html:`Ledger correction: the ${inr(tot)} payment ${esc(o.ref||'')} from ${esc(nm)} was reversed by you (${esc(reason)}). ${rows.map(r=>`${r.inv}: ${inr(r.after)} due again`).join('; ')}. No money moved.`});
}

/* ---------- the list that every desktop surface shows (buyer profile, recovery, Activity) ---------- */
function paymentsCard(id, opts={}){
  const list=recordedPayments(id); if(!list.length&&!opts.always) return '';
  const rows=list.slice().reverse().map(({e,rev})=>`<tr id="payrow-${e.id}"><td class="small">${RayDates.fmtShort(e.date)}</td><td class="small">${e.invoice}</td><td class="r num ${rev?'rev-x':''}">${inr(e.amount)}</td><td class="xs muted" style="max-width:220px">${esc(e.source||'')}<div style="word-break:break-all">${esc(e.ref||e.id)}</div></td>
    <td>${rev?`<span class="badge b-n">Reversed ${RayDates.fmtShort(rev.date)}</span><div class="xs muted mt4">${esc((rev.meta&&rev.meta.reason)||'')}</div>`:`<span class="badge b-g">Applied · verified</span>`}</td>
    <td class="r">${rev?'':`<button class="btn btn-g btn-sm" id="rev-${e.id}" onclick="A.payRevStart('${e.id}')">${I('undo',12,2)} Reverse recorded payment</button>`}</td></tr>`).join('');
  return `<div class="card mt16" id="pays-${id}"><div class="row between pad-s" style="border-bottom:1px solid var(--border-subtle)"><div class="row gap8"><span class="h3">${opts.title||'Recorded payments'}</span><span class="badge b-n">Ledger · this session</span></div><span class="xs muted">Corrections add a PAYMENT_REVERSED event; nothing is deleted</span></div>
   ${list.length?`<div style="overflow-x:auto"><table class="table"><thead><tr><th>Date</th><th>Invoice</th><th class="r">Amount</th><th>Source · reference</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`:'<div class="pad-s small muted">No payments recorded in this session.</div>'}</div>`; }
function allPaymentsCard(){
  const ids=[...new Set(S.led.events.filter(e=>MONEY_IN_T.includes(e.type)&&!isSeedEv(e)).map(e=>e.buyerId))];
  if(!ids.length) return `<div class="card pad mt12 small muted" id="pays-all">No payments recorded in this session yet. Payments you record (or simulate) appear here, each with a way to reverse it if it was recorded by mistake.</div>`;
  return `<div id="pays-all">${ids.map(id=>paymentsCard(id,{title:`Recorded payments · ${esc(BUY[id].name)}`})).join('')}</div>`; }
