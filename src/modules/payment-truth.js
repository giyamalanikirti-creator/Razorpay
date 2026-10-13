/* ================= PAYMENT TRUTH: one source for balances, recovery status and source checks =================
 * Every surface (desktop, Actions, Overview, mobile, RAY on WhatsApp, Ray AI, Activity) reads payment state
 * through these selectors. They derive from the ledger (S.led) and real connection state, never from
 * screen flags or hardcoded copy.
 *
 *   payCheck(id, inv)     which payment sources were checked, which were unavailable, how fresh, what was found
 *   recoveryOf(id)        a failed automatic collection: amount, received, balance, status (open → completed)
 *   paymentStatus(id)     a buyer's current position: open invoices, recent verified payments, claims, next due
 *   ledgerPay(...)        the only way money is applied: verified source, exact amount ≤ balance, unique reference
 */

/* ---------- payment sources: what RAY actually looked at ---------- */
function paySources(){
  const bankOn=S.bank&&S.bank.st==='on', bankPaused=S.bank&&S.bank.st==='paused';
  return [
    {key:'rzp', label:'Razorpay payments', ok:true, fresh:`checked ${nowLabel()}`},
    {key:'unid', label:'Unmatched Razorpay credits', ok:true, fresh:`checked ${nowLabel()}`},
    {key:'bank', label:'Your bank account (Connected Banking+)', ok:bankOn, fresh:bankOn?`last fetch ${S.bank.last||'today'}`:bankPaused?'paused by you':'not connected', fix:bankOn?null:'A payment by NEFT, a UPI app or cheque into your bank would not show here.'},
    {key:'sp', label:'Salesperson collections (app, simulated)', ok:true, fresh:'synced today'},
    {key:'led', label:'Your ledger (Marg ERP)', ok:!S.stale, fresh:S.stale?'last synced 31 hours ago':'synced 8:45 AM', fix:S.stale?'Payments recorded in Marg since then are not visible.':null},
  ]; }
/* result for one invoice (or the whole buyer when inv is null) */
function payCheck(id, inv){
  const src=paySources(), checked=src.filter(s=>s.ok), unavailable=src.filter(s=>!s.ok);
  const invs=inv?[invOf(id,inv)].filter(Boolean):invsOf(id);
  const paidFull=invs.length>0&&invs.every(i=>i.bal<=0);
  const claim=invs.find(i=>i.claim&&i.bal>0);
  const review=(typeof prPending==='function'&&prPending(id))?(PAYREV[id]||null):null;
  const reviewHere=review&&(!inv||review.inv===inv);
  const found=paidFull?'paid':claim?'claim':reviewHere?'possible':'none';
  return {checked, unavailable, found, claim, review:reviewHere?review:null, complete:unavailable.length===0}; }
/* plain-language line; never says "has not paid", only what was and wasn't seen */
function sourcesLine(id, inv, o={}){
  const c=payCheck(id, inv), what=inv||'this buyer';
  const nm=(x,i)=>{ const t=x.label.replace(/ \(.*\)$/,''); return i&&!/^Razorpay/.test(t)?t[0].toLowerCase()+t.slice(1):t; };
  const list=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
  const chk=list(c.checked.map((x,i)=>nm(x,i)+(x.key==='bank'?` (${x.fresh})`:'')));
  const un=list(c.unavailable.map((x,i)=>`${nm(x,i)} (${x.fresh})`));
  let res;
  if(c.found==='paid') res=`${what} is paid in full in your ledger.`;
  else if(c.found==='claim') res=`The buyer says they paid ${inr(c.claim.claim.amount)}. That is not verified yet, so the balance is unchanged and reminders stay paused.`;
  else if(c.found==='possible') res=`A possible payment needs your review before any reminder.`;
  else if(!inv) res=c.complete?'':`A payment made through ${c.unavailable.map((x,i)=>nm(x,1)).join(' or ')} would not show here.`;
  else { const i=invOf(id,inv), recd=evOf(id).filter(e=>e.invoice===inv&&MONEY_IN_T.includes(e.type)&&!RayEvents.isReversed(S.led,e.id)&&!String(e.id).startsWith('ev-seed')).reduce((a,e)=>a+(e.amount||0),0);
    res=recd&&i?`${inr(recd)} already recorded and verified on ${inv}. No further payment for the remaining ${inr(i.bal)} found in these sources.`:`No matching payment found in these sources.`;
    if(!c.complete) res+=c.unavailable.some(x=>x.key==='bank')?' Bank account not checked. No match in the available sources does not prove the buyer has not paid.':' No match in the available sources does not prove the buyer has not paid.'; }
  const txt=`${o.time===false?'RAY checked':`At ${nowLabel()} RAY checked`} ${chk[0].toLowerCase()==='r'?chk:chk}. ${un?`Not checked: ${un}. `:''}${res}`.trim();
  return o.html===false?txt:esc(txt).replace(/Not checked:/,'<b>Not checked:</b>'); }

/* ---------- recovery of a failed automatic collection (derived from the ledger) ---------- */
const MONEY_IN_T = ['PAYMENT_RECEIVED','PAYMENT_PARTIALLY_RECEIVED','PAYMENT_RECONCILED','AUTOPAY_SUCCEEDED'];
const REC_LABEL = {open:'Debit failed', action:'Recovery in progress', partial:'Part paid', claimed:'Buyer says paid · verify first', completed:'Recovered in full'};
function recoveryOf(id){
  const f=FAILS[id]; if(!f) return null;
  const inv=invOf(id,f.inv), bal=inv?Math.max(0,inv.bal):0, r=(S.rec[id]=S.rec[id]||{st:null});
  const failSeq=Math.max(0,...evOf(id).filter(e=>e.type==='AUTOPAY_FAILED'&&e.invoice===f.inv).map(e=>seqNum(e)||0));
  const pays=evOf(id).filter(e=>e.invoice===f.inv&&MONEY_IN_T.includes(e.type)&&!RayEvents.isReversed(S.led,e.id)&&(seqNum(e)||0)>failSeq&&!String(e.id).startsWith('ev-seed'));
  const received=pays.reduce((a,e)=>a+(e.amount||0),0);
  const status=bal<=0?'completed':inv&&inv.claim?'claimed':received>0?'partial':r.st?'action':'open';
  const step=r.st==='retry'?'Retry scheduled':r.st==='later'?(r.when==='Salesperson visit'?'Salesperson visit assigned':'Follow-up scheduled'):(r.st==='link'||r.st==='sent')?'Payment link sent':null;
  return {id, inv:f.inv, amount:f.amt, balance:bal, received, pays, status, label:status==='partial'?`${inr(received)} received · ${inr(bal)} remaining`:status==='action'?(step||REC_LABEL.action):REC_LABEL[status],
    active:status!=='completed', needsAction:status==='open', link:r.link||null, step, method:f.m, reason:f.reason, on:f.on,
    completedAt:status==='completed'&&pays.length?pays[pays.length-1].date:null, next:status==='completed'?nextOpenInv(id):null}; }
const recoveriesActive = () => Object.keys(FAILS).filter(id=>{ const r=recoveryOf(id); return r&&r.active; });
const recoveriesDone = () => Object.keys(FAILS).filter(id=>{ const r=recoveryOf(id); return r&&!r.active; });
const recoveringAmt = () => recoveriesActive().reduce((a,id)=>a+recoveryOf(id).balance,0);

/* ---------- one evidence source for "has this buyer paid in parts?" (credit assessment, recovery, mobile, answers) ----------
   history: part-paid promises in the buyer's record (merchant-confirmed promise history, last 90 days)
   session: partial payments verified in this session (ledger events, reversed ones excluded) */
function partialEvidence(id){ const s=sigOf(id); if(!s) return {hist:0, session:0, any:false, summary:'None on record'};
  const hist=(s.promises&&s.promises.partial)||0, session=evOf(id).filter(e=>e.type==='PAYMENT_PARTIALLY_RECEIVED'&&!RayEvents.isReversed(S.led,e.id)).length;
  const parts=[]; if(hist) parts.push(`${hist} missed promise${hist===1?' was':'s were'} part-paid in the last 90 days (promise history)`); if(session) parts.push(`${session} partial payment${session===1?'':'s'} verified in this session`);
  return {hist, session, any:hist+session>0, summary:parts.length?parts.join(' · '):'None on record'}; }
const PARTIAL_RATIONALE = 'Allowing partial payment gives the buyer a way to start clearing the outstanding amount.';

/* ---------- a buyer's current payment position (used by every answer surface) ---------- */
function paymentStatus(id){
  const b=BUY[id]; if(!b) return null;
  const open=invsOf(id).filter(i=>i.bal>0).sort((a,c)=>RayDates.toN(a.due)-RayDates.toN(c.due));
  const paidRecent=evOf(id).filter(e=>MONEY_IN_T.includes(e.type)&&!RayEvents.isReversed(S.led,e.id)&&!String(e.id).startsWith('ev-seed')).slice(-4).reverse();
  const reversedRecent=evOf(id).filter(e=>e.type==='PAYMENT_REVERSED').slice(-2).reverse();
  const rec=recoveryOf(id), claims=open.filter(i=>i.claim), check=payCheck(id,null);
  const next=open.find(i=>!i.claim&&!(rec&&rec.active&&i.inv===rec.inv))||null, pr=typeof openPromise==='function'?openPromise(id):null;
  return {id, name:b.name, out:outOf(id), open, paidRecent, reversedRecent, rec, claims, check, next, promise:pr, method:collMethod(id).m, review:check.review}; }

/* ---------- the only way money is applied ---------- */
function ledgerPay(id, inv, amt, o={}){
  const i=inv?invOf(id,inv):nextOpenInv(id);
  if(!i) return {ok:false, error:'Invoice not found'};
  if(i.bal<=0) return {ok:false, error:`${i.inv} is already paid in full. Nothing recorded.`};
  const a=Math.round(Number(amt));
  if(!isFinite(a)||a<=0) return {ok:false, error:'Amount must be a positive number'};
  if(a>i.bal) return {ok:false, error:`${inr(a)} is more than the ${inr(i.bal)} still due on ${i.inv}. Nothing recorded.`};
  if(!o.ref) return {ok:false, error:'A payment reference is required, so the same payment cannot be applied twice'};
  if(RayEvents.refInUse(S.led, o.ref)) return {ok:false, dup:true, error:`Payment ${o.ref} was already applied. Nothing recorded twice.`};
  const r=recordEvent({type:o.type||'PAYMENT_RECEIVED', buyerId:id, invoice:i.inv, amount:a, verification:'verified', source:o.source||'Razorpay', actor:o.actor||'Razorpay', ref:o.ref, meta:o.meta||{}},{quiet:true});
  if(r.ok) afterPayment(id, r.event);
  return r.ok?r:Object.assign(r,{error:r.error}); }
/* consequences of a verified payment, applied the same way whichever surface recorded it */
function afterPayment(id, e){
  const i=invOf(id,e.invoice), cleared=outOf(id)<=0, invPaid=i&&i.bal<=0;
  let cancelled=0;
  (S.outbox||[]).forEach(o=>{ if(o.buyerId!==id||!['scheduled','queued'].includes(o.status)) return;
    if(cleared||(invPaid&&o.inv===e.invoice)){ o.status='cancelled'; o.reason=`${e.invoice} paid · reminder cancelled`; cancelled++; } });
  const ch=S.chase&&S.chase[id];
  if(ch&&['scheduled','queued'].includes(ch.st)&&(cleared||(invPaid&&chaseInv(id)===e.invoice))) ch.st='draft';
  if(cancelled) log({ic:'x',ti:`${cancelled} scheduled reminder${cancelled===1?'':'s'} cancelled · ${BUY[id].name}`,de:`${e.invoice} paid · nothing will be sent for it`,src:['rzp'],who:'RAY controls',chem:BUY[id].name});
  return {cancelled}; }

/* a bank credit can cover several invoices: allocate oldest first (preferred invoice first). Rejected as a whole
   if it exceeds everything outstanding, so no money is ever applied to a balance that does not exist. */
function ledgerPayAllocate(id, amt, prefer, o={}){
  const a=Math.round(Number(amt)); if(!isFinite(a)||a<=0) return {ok:false, error:'Amount must be a positive number'};
  if(!o.ref) return {ok:false, error:'A payment reference is required'};
  if(RayEvents.refInUse(S.led, o.ref)||RayEvents.refInUse(S.led, o.ref+'#1')) return {ok:false, dup:true, error:`Payment ${o.ref} was already applied. Nothing recorded twice.`};
  const plan=RayEvents.allocate(S.led, id, a, prefer);
  if(plan.unallocated>0) return {ok:false, error:`${inr(a)} is more than the ${inr(outOf(id))} ${BUY[id].name} owes. Nothing recorded; review it as an unidentified credit.`};
  const parts=[]; for(const [k,pt] of plan.parts.entries()){ const r=ledgerPay(id, pt.invoice, pt.amount, Object.assign({}, o, {ref:plan.parts.length===1?o.ref:`${o.ref}#${k+1}`, meta:Object.assign({}, o.meta||{}, plan.parts.length>1?{allocation:o.ref, part:k+1, parts:plan.parts.length}:{})})); if(!r.ok) return Object.assign(r,{parts}); parts.push(r.event); }
  return {ok:true, parts, event:parts[parts.length-1]}; }
