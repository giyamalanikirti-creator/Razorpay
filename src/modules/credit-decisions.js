/* ================= CREDIT DECISIONS: one validated command path for every surface =================
 * Dashboard, credit requests, RAY AI, RAY on WhatsApp and RAY Credit for Mobile all go through here.
 *
 *   creditProposal(id)     what RAY recommends, captured at the moment it is shown (with a one-time key)
 *   applyCredit(p, o)      applies exactly the confirmed values, once; records CREDIT_APPROVED / CREDIT_KEPT
 *   undoCredit(id)         restores the complete prior state and records CREDIT_REVERSED (history is kept)
 *
 * Reference values (contract limit and terms), current approved values and RAY's proposal are kept apart:
 * the policy derives proposals from the reference, so an approval never becomes the baseline for a
 * shorter recommendation. Nothing here is buyer-specific.
 */
const DECISION_EVENTS = ['CREDIT_APPROVED','CREDIT_KEPT','CREDIT_REVERSED'];
const TERMS_ALLOWED = [7,14,15,21,30,45,60];
let _pk = 0;
function creditProposal(id){ const r=recOf(id); if(!r) return null;
  return {id, limit:r.recommendedLimit, terms:r.recommendedTerms, band:r.band, confidence:r.confidence, policy:r.policyVersion, action:r.action,
    from:{limit:curLimitOf(id), terms:curTermsOf(id)}, out:outOf(id), key:`cp-${id}-${++_pk}-${S.led.seq}`}; }
/* keep a proposal on screen so the confirm button applies what the merchant saw, not a fresh read */
const PROPOSALS = {};
function holdProposal(p){ PROPOSALS[p.key]=p; return p.key; }
const heldProposal = key => PROPOSALS[key]||null;

/* ---------- snapshot / restore of every piece of state a credit decision touches ---------- */
const capKey = (o,k) => (o&&Object.prototype.hasOwnProperty.call(o,k)) ? {has:true, v:JSON.parse(JSON.stringify(o[k]))} : {has:false};
const putKey = (o,k,c) => { if(c.has) o[k]=JSON.parse(JSON.stringify(c.v)); else delete o[k]; };
const G_KEYS = ['limit','curTerms','rec','prevLimit','prevTerms','approvedVia','approvedAt','kept','alert'];
function creditSnapshot(id){
  S.termsOf=S.termsOf||{}; S.refRaise=S.refRaise||{}; S.refTermsSet=S.refTermsSet||{}; S.dec=S.dec||{};
  const snap={limits:capKey(S.limits,id), termsOf:capKey(S.termsOf,id), refRaise:capKey(S.refRaise,id), refTerms:capKey(S.refTermsSet,id),
    req:capKey(S.req,id), dec:capKey(S.dec,id), later:capKey(S.later,id), view:{limit:curLimitOf(id), terms:curTermsOf(id)}};
  if(id==='gupta') snap.gupta=Object.fromEntries(G_KEYS.map(k=>[k,capKey(S.gupta,k)]));
  if(id==='newlife') snap.newlife={newLife:S.newLife, check:JSON.parse(JSON.stringify(S.check))};
  return snap; }
function creditRestore(id, p){
  putKey(S.limits,id,p.limits); putKey(S.termsOf,id,p.termsOf); putKey(S.refRaise,id,p.refRaise); putKey(S.refTermsSet,id,p.refTerms);
  putKey(S.req,id,p.req); putKey(S.dec,id,p.dec); putKey(S.later,id,p.later);
  if(p.gupta) G_KEYS.forEach(k=>putKey(S.gupta,k,p.gupta[k]));
  if(p.newlife){ S.newLife=p.newlife.newLife; S.check=JSON.parse(JSON.stringify(p.newlife.check)); }
  S._limv=(S._limv||0)+1; }

const decStamp = () => simDateLabel()+', '+nowLabel();
/* Apply a decision. p = {id, limit, terms, key, edited?}; o = {kind:'approved'|'kept', via, reason, req, reqAmt, override}.
   Returns {ok, op} or {ok:false, dup|stale|blocked, msg}. Never applies the same key twice. */
function applyCredit(p, o={}){
  const id=p&&p.id, kind=o.kind||'approved', via=o.via||'Dashboard';
  if(!id||!BUY[id]) return {ok:false, msg:'Unknown buyer'};
  if(p.key&&S.opKeys[p.key]) return {ok:false, dup:true, msg:'Already applied. Nothing changed twice.'};
  if(kind==='approved'){
    if(blocked()) return {ok:false, blocked:true, msg:S.paused?'RAY is paused. Resume it before approving.':'Ledger is stale. Sync before approving.'};
    if(!Number.isInteger(p.limit)||p.limit<0||p.limit>100000000) return {ok:false, msg:'Enter a valid limit'};
    if(!TERMS_ALLOWED.includes(p.terms)) return {ok:false, msg:`Terms must be one of ${TERMS_ALLOWED.join(', ')} days`};
    if(!p.edited){ const now=recOf(id);
      if(now.recommendedLimit!==p.limit||now.recommendedTerms!==p.terms) return {ok:false, stale:true, msg:`RAY’s recommendation changed since this was shown (${inr(p.limit)} · ${p.terms} days → ${inr(now.recommendedLimit)} · ${now.recommendedTerms} days). Nothing was changed. Review it again.`}; }
    const d=decOf(id); if(curLimitOf(id)===p.limit&&curTermsOf(id)===p.terms&&d&&d.status==='approved'&&o.req===undefined) return {ok:false, dup:true, msg:'Already applied. The current limit and terms match.'};
  }
  if(p.key) S.opKeys[p.key]=true; /* claimed before any change: a second click finds it taken */
  const prior=creditSnapshot(id), from={limit:curLimitOf(id), terms:curTermsOf(id)};
  if(o.req!==undefined) S.req[id]=o.req;
  if(o.activate) o.activate(); /* e.g. a new buyer becomes active as part of the same, undoable decision */
  let res;
  if(kind==='approved'){
    const inc=p.limit>from.limit;
    setLimitValue(id, p.limit, p.terms);
    if(inc){ S.refTermsSet=S.refTermsSet||{}; S.refTermsSet[id]=p.terms; } /* an approved increase becomes the new reference; a reduction never does */
    res=recordEvent({type:'CREDIT_APPROVED', buyerId:id, source:via, actor:M.owner, meta:{limit:p.limit, terms:p.terms, from:from.limit, fromTerms:from.terms, increase:inc, policy:POL.version, edited:!!p.edited, request:o.reqAmt||null}},{quiet:true});
  } else {
    res=recordEvent({type:'CREDIT_KEPT', buyerId:id, source:via, actor:M.owner, meta:{limit:from.limit, terms:from.terms, reason:o.reason||'', override:o.override||null, request:o.reqAmt||null}},{quiet:true});
  }
  decide(id, kind, via, {limit:curLimitOf(id), terms:curTermsOf(id)});
  if(id==='gupta'){ const g=S.gupta; g.prevLimit=from.limit; g.prevTerms=from.terms;
    if(kind==='approved'){ g.rec='approved'; g.approvedVia=via; g.approvedAt=decStamp(); } else { g.rec='kept'; g.kept=true; g.alert=false; } }
  S.later[id]=false;
  const op={opId:'op-'+((S.creditOps||[]).length+1), id, kind, via, at:decStamp(), prior, from, to:{limit:curLimitOf(id), terms:curTermsOf(id)}, eventId:res&&res.event?res.event.id:null, req:o.req, reversed:false};
  S.creditOps.push(op); engineSync();
  return {ok:true, op}; }

/* the latest decision for a buyer that can still be undone */
const lastCreditOp = id => (S.creditOps||[]).slice().reverse().find(o=>o.id===id&&!o.reversed) || null;
function undoCredit(id, via='Dashboard'){
  const op=lastCreditOp(id); if(!op) return {ok:false, msg:'Nothing to undo'};
  const was={limit:curLimitOf(id), terms:curTermsOf(id)};
  creditRestore(id, op.prior);
  op.reversed=true; op.reversedAt=decStamp();
  const res=recordEvent({type:'CREDIT_REVERSED', buyerId:id, source:via, actor:M.owner, meta:{reverses:op.eventId, opId:op.opId, kind:op.kind, undone:was, restored:{limit:curLimitOf(id), terms:curTermsOf(id)}}},{quiet:true});
  /* a buyer whose decision is undone is open for review again, with the prior decision record restored */
  const d=decOf(id); if(d) d.hist.unshift({at:decStamp(), from:d.snap, to:d.snap, status:'reversed', via, applied:{limit:curLimitOf(id), terms:curTermsOf(id)}});
  engineSync();
  return {ok:true, op, event:res&&res.event}; }

/* plain-language guardrail when a future limit is below what the buyer already owes */
function overLimitText(name, out, limit){ const d=out-limit; if(d<=0) return null;
  return `${name} owes ${inr(out)} today, ${inr(d)} more than this future limit. The full ${inr(out)} stays due on the existing invoices and their original due dates; nothing is written off. Deliveries are not stopped automatically. New orders on credit need your approval until the balance is back under ${inr(limit)}.`; }

/* ---------- UI commands (one per surface, same rules) ---------- */
function creditConfirmModal(id, opts={}){
  const p=opts.p||creditProposal(id), c=BUY[id], key=holdProposal(p), r=recOf(id), over=overLimitText(c.name, p.out, p.limit);
  if(!opts.p&&p.limit===p.from.limit&&p.terms===p.from.terms&&!recChanged(id)) return toast('Nothing to approve · the current limit already matches RAY’s recommendation');
  modal({title:`Set ${c.name}’s future credit limit to ${inr(p.limit)}?`,body:`
   <div class="kvline" style="border:0"><span>Current</span><b class="num">${inr(p.from.limit)} · ${p.from.terms} days</b></div>
   <div class="kvline"><span>After you confirm</span><b class="num" id="cp-to">${inr(p.limit)} · ${p.terms} days</b></div>
   <div class="kvline"><span>Applies to</span><b>New invoices only</b></div>
   <div class="kvline"><span>Reference (contract)</span><b class="num" style="font-weight:500">${inr(refLimitOf(id))} · ${refTermsOf(id)} days <span class="xs muted">· RAY’s proposal is derived from this, never from the last approval</span></b></div>
   <div class="kvline"><span>Why</span><b style="font-weight:500;text-align:right;max-width:62%">${shortReasons(id).join(' · ')}</b></div>
   ${over?`<div class="ol-note mt12"><span style="color:var(--a);flex-shrink:0">${I('info',15,2)}</span><span>${over}</span></div>`:`<div class="ol-note mt12"><span style="color:var(--g);flex-shrink:0">${I('check',15,2.4)}</span><span>Outstanding is within the proposed limit. Existing supply is not paused automatically.</span></div>`}
   <div class="xs muted mt12">${r.band} · confidence ${r.confidence} (evidence sufficiency) · policy ${r.policyVersion}. Exactly these values are applied once. You can undo it; the undo is logged too.</div>`,
   actions:[{label:'Cancel'},{label:`Set future limit to ${inr(p.limit)}`,cls:'btn-p',id:'set-limit',disabled:blocked(),fn:(btn)=>{ if(btn) btn.disabled=true; closeModal(); creditApprove(key, opts.via||(typeof prMob==='function'&&prMob()?'RAY Credit for Mobile':'Dashboard'), opts); }}]}); }
function creditApprove(key, via, opts={}){
  const p=heldProposal(key); if(!p) return toast('This confirmation expired. Open it again.');
  const req=opts.req!==undefined?opts.req:(typeof creq==='function'&&creq(p.id)&&!S.req[p.id]&&via!=='Ray AI'?'limit':undefined); /* approving a limit answers the buyer's open request */
  const res=applyCredit(p, {kind:'approved', via, req, reqAmt:opts.reqAmt, activate:opts.activate});
  if(!res.ok){ toast(res.msg); if(res.stale) rr(); return res; }
  const c=BUY[p.id], o=res.op;
  log({ic:'check',ti:`${c.name}: future limit set to ${inr(o.to.limit)} · ${o.to.terms}-day terms`,de:`Was ${inr(o.from.limit)} · ${o.from.terms} days · ${p.band} · policy ${p.policy} · applies to new invoices · supply continues`,src:['led',recOf(p.id).network.eligible?'net':'rzp','conv'],who:`Approved by ${M.owner} · ${via}`,chem:c.name, op:o.opId});
  rr(); toast(`Future limit set to ${inr(o.to.limit)} · ${o.to.terms}-day terms · logged`);
  if(opts.setup!==false&&(via==='Dashboard'||via==='RAY Credit for Mobile')&&!S.mand[p.id]) setTimeout(()=>{ if(!lastCreditOp(p.id)||lastCreditOp(p.id).opId!==o.opId) return; A.repaySetup(p.id,o.to.limit,o.to.terms); },350);
  return res; }
function creditKeep(id, reason, via='Dashboard', extra={}){
  const res=applyCredit({id, key:extra.key}, {kind:'kept', via, reason, req:extra.req, reqAmt:extra.reqAmt, override:extra.override});
  if(!res.ok){ toast(res.msg); return res; }
  const c=BUY[id];
  log({ic:'check',ti:extra.title||`Kept current limit for ${c.name}`,de:`Merchant override · ${inr(curLimitOf(id))} · ${curTermsOf(id)} days${reason?` · reason: ${reason}`:''} · recorded with the recommendation it overrides`,src:['conv'],who:`Decided by ${M.owner} · ${via}`,chem:c.name, op:res.op.opId});
  rr(); toast(extra.toast||'Current limit kept · override recorded'); return res; }
A.undoCredit=(id, via)=>{ const res=undoCredit(id, via||(typeof prMob==='function'&&prMob()?'RAY Credit for Mobile':'Dashboard'));
  if(!res.ok) return toast(res.msg);
  const c=BUY[id], o=res.op;
  log({ic:'refresh',ti:`${c.name}: decision undone`,de:`Back to ${inr(curLimitOf(id))} · ${curTermsOf(id)} days${o.req!==undefined?' · credit request reopened':''} · original approval kept in the audit trail, reversal recorded`,src:['led'],who:`${M.owner} · ${via||'Dashboard'}`,chem:c.name, op:o.opId});
  rr(); if(typeof mobRender==='function'&&S.mob) mobRender(); toast(`Undone · ${inr(curLimitOf(id))} · ${curTermsOf(id)} days restored`); };
/* decision status for any buyer, read by every surface */
function creditStatus(id){ const op=lastCreditOp(id), d=decOf(id);
  return {op, status:op?op.kind:'open', changed:recChanged(id), limit:curLimitOf(id), terms:curTermsOf(id), refLimit:refLimitOf(id), refTerms:refTermsOf(id)}; }
function undoBar(id, mob){ const op=lastCreditOp(id); if(!op) return '';
  const t=op.kind==='approved'?`${inr(op.to.limit)} · ${op.to.terms} days set ${op.at}`:`Override recorded ${op.at}`;
  return mob?`<button class="mbtn" onclick="A.undoCredit('${id}')">Undo · ${t}</button>`
    :`<div class="row gap8 mt8 wrap"><button class="btn btn-g btn-sm" id="undo-${id}" onclick="A.undoCredit('${id}')">${I('refresh',13)} Undo</button><span class="xs muted">${t} · ${op.via}</span></div>`; }
