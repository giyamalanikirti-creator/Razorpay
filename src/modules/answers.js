/* ================= ANSWERS: one question handler for Ray AI, RAY on WhatsApp and RAY Credit for Mobile =================
 * ruleAnswer(q)  deterministic answer built from the current ledger, engine and controls. Works with no AI.
 * answerAny(q)   structured questions always get ruleAnswer; only free-form questions go to live AI, and only
 *                when a live provider is actually available. Otherwise RAY says what it can answer and asks.
 * AI may explain or draft. It never changes state: approvals, payments and messages go through the
 * validated commands (credit-decisions.js, payment-truth.js, sendMessage).
 */
const HINGLISH = /\b(ka|ki|ke|kya|hai|hua|huya|aaya|aya|mila|milaa|de|doon|du|kitna|kitne|kaun|baaki|baki|bhej|bheja|paisa|paise|nahi|abhi|kab|karo|kar|bhai|ji|aur)\b/i;
const isHinglish = q => HINGLISH.test(q);
const ASK_LIMITS = 'Rule-based answers cover buyers, invoices, balances, credit limits and payment status, from your current RAY data. They are written in English, with a short Hinglish line when you ask in Hinglish. Questions in Devanagari script are matched on buyer names and digits only.';

/* buyers named in a question: full-name matches win; a shared first word (e.g. two "Gupta" businesses) is ambiguous */
function findBuyersIn(q){
  const t=' '+String(q||'').toLowerCase().replace(/[^a-z0-9ऀ-ॿ ]+/g,' ').replace(/\s+/g,' ')+' ';
  const all=rayAllBuyers();
  const full=all.filter(b=>t.includes(' '+b.name.toLowerCase()+' '));
  if(full.length) return {ids:[...new Set(full.map(b=>b.id))], ambiguous:false};
  const words=t.trim().split(' ').filter(w=>w.length>=4);
  for(const w of words){ const m=all.filter(b=>b.name.toLowerCase().split(' ')[0]===w);
    if(m.length===1) return {ids:[m[0].id], ambiguous:false};
    if(m.length>1){ /* a second word can disambiguate: "gupta traders", "gupta kirana" */
      const narrowed=m.filter(b=>b.name.toLowerCase().split(' ').slice(1).some(x=>x.length>=4&&t.includes(' '+x)));
      if(narrowed.length===1) return {ids:[narrowed[0].id], ambiguous:false};
      return {ids:m.map(b=>b.id), ambiguous:true, word:w}; } }
  return {ids:[], ambiguous:false}; }
const invoiceIn = q => { const m=String(q||'').toUpperCase().match(/\bINV[-\s]?(\d{3,6})\b/); return m?'INV-'+m[1]:null; };
function findInvoice(no){ for(const id of Object.keys(S.led.invoices)){ const i=invOf(id,no); if(i) return {id, i}; } return null; }

function askIntent(q, hasBuyer){ const s=String(q||'').toLowerCase();
  if(/\b(ignore|disregard)\b.*\b(instruction|previous|above)\b|mark (it |this )?(as )?paid|approve (it|this) now/.test(s)) return 'refuse_action';
  if(invoiceIn(q)) return 'invoice';
  if(/network/.test(s)&&/(off|band|turn|without|bina|hata|disable|stop)/.test(s)) return 'netoff';
  if(/(approv|manzoori|meri (approval|permission)|need.*\bmy\b|mujhe .*approve)/.test(s)) return 'approvals';
  if(/(fail|bounce|declin)/.test(s)&&/(after|baad|changed|change|badla|kya hua|happened)/.test(s)) return 'afterfail';
  if(hasBuyer&&/(on hold|hold|ruka|ruki|rok|blocked|paused|not sent|nahi gaya|why.*(can.?t|cannot|not).*send|reminder kyun|kyun.*reminder)/.test(s)) return 'hold';
  if(!hasBuyer){
    if(/settle/.test(s)) return 'settle';
    if(/failed payments|payments? fail/.test(s)) return 'failedpay';
    if(/kitne payments|payments aaye|transactions|captured/.test(s)) return 'txn';
    if(/slip|early warn|warning/.test(s)) return 'slip';
    if(/kaun|rok|priorit|chase|follow ?up|pehle kis|kisko pehle|who.*(owe|pay)|today.*plan|aaj kis/.test(s)) return 'priority';
    if(/kitna|collected|collection/.test(s)) return 'collected';
    if(/fail|recover/.test(s)) return 'failed';
    if(/grow|faster|jaldi/.test(s)) return 'grow'; }
  if(/aaya|aya\b|paid|payment|paisa|mila|received|kya hua|status|bheja|diya|cheque|balance|baaki|baki|outstanding|owe|due|kitna dena|recover/.test(s)) return 'payment';
  if(/credit|limit|de doon|de du|extend|terms|udhaar|udhar/.test(s)) return 'credit';
  return 'other'; }

const fmtD = iso => RayDates.fmtShort(iso);
const actBuyer = id => ({label:'Open buyer profile', route:`raahi/buyer/${id}`, mob:RayData.FEATURED.some(f=>f.id===id)?['buyer',id]:null});
const actRecover = id => ({label:'View recovery', route:`raahi/recover/${id}`, mob:['recover',id]});
const actPay = id => ({label:'Review payment', route:`raahi/payment/${id}`, mob:['pay',id]});

/* ---------- payment status for one buyer: every number from the ledger ---------- */
function paymentAnswer(id, hi){
  const p=paymentStatus(id), lines=[]; const acts=[];
  const r=p.rec;
  if(p.out<=0) lines.push(`${p.name} has nothing outstanding. Every invoice is paid in full in your ledger.`);
  else lines.push(`${p.name} owes ${inr(p.out)} on ${p.open.length} open invoice${p.open.length===1?'':'s'}.`);
  if(r){
    if(r.status==='completed') lines.push(`${r.inv} (the ${inr(r.amount)} ${r.method} collection that failed on ${r.on.split(' · ')[0]}) is recovered in full: ${r.pays.map(e=>inr(e.amount)).join(' + ')} received${r.pays.length?` via ${[...new Set(r.pays.map(e=>e.source))].join(', ')}`:''}. Recovery completed; no further steps for it.`);
    else if(r.status==='partial') lines.push(`${r.inv}: ${inr(r.received)} received after the failed ${r.method} debit, ${inr(r.balance)} still due.`);
    else if(r.status==='claimed') lines.push(`${r.inv}: the buyer says they paid. Not verified yet, so the ${inr(r.balance)} balance is unchanged and reminders are paused.`);
    else if(r.status==='action') lines.push(`${r.inv}: ${inr(r.balance)} due after the failed ${r.method} debit. ${r.step||'Recovery in progress'}${r.link?` (${r.link.partial?`minimum ${inr(r.link.min)}`:'full amount'})`:''}. No payment yet in the sources checked.`);
    else lines.push(`${r.inv}: the ${r.method} debit of ${inr(r.amount)} failed on ${r.on.split(' · ')[0]} (${r.reason.toLowerCase()}). Recovery not started.`);
    acts.push(actRecover(id)); }
  const other=p.paidRecent.filter(e=>!r||e.invoice!==r.inv).slice(0,2);
  other.forEach(e=>lines.push(`${inr(e.amount)} received on ${e.invoice} (${e.source}, ${fmtD(e.date)}). Balance ${inr(e.meta.balanceAfter)}.`));
  (p.reversedRecent||[]).forEach(e=>lines.push(`Correction: ${inr(e.amount)} on ${e.invoice} was reversed by you on ${fmtD(e.date)} (${(e.meta&&e.meta.reason)||'ledger correction'}). Balance ${inr(e.meta.balanceAfter)} after the correction; no money moved.`));
  p.claims.filter(i=>!r||i.inv!==r.inv).forEach(i=>lines.push(`${i.inv}: buyer says ${inr(i.claim.amount)} was paid. Not verified; balance unchanged.`));
  if(p.review){ lines.push(`${p.review.inv}: a possible payment needs your review before any reminder.`); acts.push(actPay(id)); }
  if(p.promise){ const pr=p.promise, f=pr.first, l=pr.later; lines.push(`Payment commitment: ${f&&!f.paid?`${inr(f.amt)} by ${fmtD(f.date)}`:''}${f&&!f.paid&&l?', ':''}${l?`${inr(l.amt)} by ${fmtD(l.date)}`:''}. Expected, not guaranteed.`); }
  if(p.next){ const od=RayDates.diffDays(S.today,p.next.due); lines.push(`${r&&r.active?'Also open':'Next'}: ${p.next.inv} · ${inr(p.next.bal)} ${od>0?`${od} days overdue (was due ${fmtD(p.next.due)})`:`due ${fmtD(p.next.due)}`}${od<=0&&['UPI Autopay','eNACH'].includes(p.method)?` through ${p.method}`:''}.`); }
  const verdict=p.out<=0?'Haan, sab clear hai.':r&&r.status==='completed'?`Haan, ${r.inv} poora aa gaya.`:r&&r.status==='partial'?`Thoda aaya hai, ${inr(r.balance)} baaki hai.`:p.paidRecent.length?'Kuch payment aaya hai, details neeche.':'Abhi tak koi payment nahi dikha.';
  if(p.out>0) lines.push(sourcesLine(id,null,{html:false}));
  if(!acts.length) acts.push(actBuyer(id));
  return {kind:'payment', ids:[id], lead:hi?verdict:null, lines, actions:acts}; }

function creditAnswer(id, hi){
  const r=recOf(id), s=sigOf(id), b=BUY[id], cs=creditStatus(id), rq=typeof creq==='function'?creq(id):null; const lines=[];
  if(id==='newlife'&&!S.newLife){ lines.push(`New Life Stores is a new buyer. RAY’s starter recommendation is ${inr(r.recommendedLimit)} on ${r.recommendedTerms}-day terms${r.networkStep?' with the consented network uplift':' (network not used)'}. Not final until you approve.`); return {kind:'credit', ids:[id], lines, actions:[{label:'Open credit check', route:'raahi/check', mob:null}]}; }
  lines.push(`${b.name} is ${r.band}. Current limit ${inr(cs.limit)} on ${cs.terms}-day terms; outstanding ${inr(s.out)}.`);
  lines.push(`RAY recommends ${inr(r.recommendedLimit)} on ${r.recommendedTerms}-day terms (confidence ${r.confidence}, evidence sufficiency). ${r.recommendation}`);
  lines.push(`Why: ${shortReasons(id,3).join('; ')}.`);
  const ns=r.networkStep; if(ns){ const o=r.ownData; lines.push(ns.kind==='corroborated'?`Your data alone: ${inr(o.recommendedLimit)} · ${o.recommendedTerms} days. Eligible network evidence (${r.network.coverage} participating distributors) agrees, so the rule “${ns.rule}” took it to ${inr(r.recommendedLimit)} · ${r.recommendedTerms} days.`:`Your data alone: ${o.band}. Network evidence disagrees with your data, so RAY moved it to ${r.band} and held the limit (it does not cut on uncorroborated evidence).`); }
  else if(!r.network.eligible&&BUY[id].network) lines.push(`Network evidence not used: ${r.network.reason}.`);
  const over=overLimitText(b.name, s.out, r.recommendedLimit); if(over&&r.recommendedLimit<cs.limit) lines.push(over);
  if(cs.op&&cs.op.kind==='approved') lines.push(`You set ${inr(cs.op.to.limit)} · ${cs.op.to.terms} days (${cs.op.via}, ${cs.op.at}).${recChanged(id)?' The recommendation has changed since.':''}`);
  if(rq&&!S.req[id]){ const v=reqV(rq); lines.push(`Open request: ${inr(rq.amt)} more credit. RAY’s verdict: ${v.verdict.toLowerCase()} (exposure would be ${inr(v.exposureAfter)}). ${releaseLine(v.plan, reqRefColl(rq))} Needs your decision.`); }
  return {kind:'credit', ids:[id], lead:hi?(r.band==='Reliable'?'Theek hai, policy ke andar hai.':'Abhi aur credit dene se pehle dekh lijiye.'):null, lines,
    actions:[rq&&!S.req[id]?{label:'Review credit request', route:`raahi/request/${id}`, mob:['request',id]}:actBuyer(id)]}; }

function invoiceAnswer(no, hi){
  const f=findInvoice(no); if(!f) return {kind:'clarify', lines:[`I can’t find ${no} in your ledger. Check the number, or ask about the buyer by name.`], actions:[]};
  const {id,i}=f, pays=evOf(id).filter(e=>e.invoice===no&&MONEY_IN_T.includes(e.type)&&!String(e.id).startsWith('ev-seed')), revs=evOf(id).filter(e=>e.invoice===no&&e.type==='PAYMENT_REVERSED'), lines=[];
  lines.push(`${no} · ${BUY[id].name} · invoice ${inr(i.amt)} · due ${fmtD(i.due)}.`);
  lines.push(i.bal<=0?`Paid in full.`:`${inr(i.bal)} outstanding${i.disputed?` (${inr(i.disputed)} disputed)`:''}${RayDates.diffDays(S.today,i.due)>0?`, ${RayDates.diffDays(S.today,i.due)} days overdue`:''}.`);
  pays.forEach(e=>lines.push(RayEvents.isReversed(S.led,e.id)?`${inr(e.amount)} recorded ${fmtD(e.date)} via ${e.source}, later reversed by you (ledger correction, not counted).`:`${inr(e.amount)} received ${fmtD(e.date)} via ${e.source}.`));
  if(i.claim) lines.push(`Buyer says ${inr(i.claim.amount)} was paid. Not verified; balance unchanged.`);
  if(i.bal>0) lines.push(sourcesLine(id,no,{html:false}));
  return {kind:'invoice', ids:[id], lead:hi?(i.bal<=0?'Haan, poora paid hai.':`${inr(i.bal)} baaki hai.`):null, lines, actions:[FAILS[id]&&FAILS[id].inv===no?actRecover(id):actBuyer(id)]}; }

/* ---------- why is a reminder on hold: the same send gate every surface uses ---------- */
function holdAnswer(id, hi){
  const open=invsOf(id).filter(i=>i.bal>0), inv=(open[0]||{}).inv, g=gateFor(id,'whatsapp',inv), nm=BUY[id].name, lines=[], acts=[];
  if(g.action==='send') lines.push(`Nothing is holding a reminder to ${nm} right now${inv?` (${inv}, ${inr(balOf(id,inv))} due)`:''}. Sending still needs your approval.`);
  else { lines.push(`${g.action==='queue'?'A reminder would be queued':'Reminders are on hold'} for ${nm}${inv?` (${inv})`:''}:`);
    g.reasons.filter(r=>r.code!=='ok').forEach(r=>lines.push('• '+r.text)); }
  if(prPending(id)){ lines.push('Clear it by reviewing the possible payment: match it if it is theirs, or confirm it is not. Chasing a buyer who may already have paid is the mistake RAY is preventing.'); acts.push(actPay(id)); }
  if(invsOf(id).some(i=>i.claim&&i.bal>0)) lines.push('The buyer says they paid. Verify the claim (bank match or your confirmation with a reference) before any reminder.');
  if(!acts.length) acts.push(actBuyer(id));
  return {kind:'hold', ids:[id], lead:hi?(g.action==='send'?'Koi rok nahi hai.':'Abhi reminder ruka hua hai.'):null, lines, actions:acts, basis:['Send controls (lib/guards.js)','Ledger','Payment review queue']}; }

/* ---------- what changed after a failed automatic collection ---------- */
function afterFailAnswer(ids, hi){
  const list=(ids&&ids.length?ids.filter(id=>FAILS[id]):Object.keys(FAILS)); const lines=[], acts=[];
  if(!list.length) return {kind:'afterfail', lines:['No failed automatic collection is on record for that buyer.'], actions:[], basis:['Ledger']};
  list.forEach(id=>{ const f=FAILS[id], r=recoveryOf(id), rec=recOf(id), c=rec.signalContributions.find(x=>x.key==='failures');
    lines.push(`${BUY[id].name} · ${f.inv}: the ${f.m} debit of ${inr(f.amt)} failed on ${String(f.on).split(' · ')[0]} (${String(f.reason).toLowerCase()}). No money moved, so the balance stayed ${inr(f.amt)} until a verified payment arrived.`);
    lines.push(`  Recovery now: ${r.label}${r.received?` · ${inr(r.received)} received, ${inr(r.balance)} remaining`:''}.`);
    if(c) lines.push(`  Policy: ${c.observed} → ${c.points>0?'+':''}${c.points} risk points (${c.rule.split(' · a failure')[0]}). A failure is never recorded as a default. Current recommendation: ${rec.band}, ${inr(rec.recommendedLimit)} · ${rec.recommendedTerms} days.`);
    acts.push(actRecover(id)); });
  return {kind:'afterfail', ids:list, lead:hi?'Failed debit se paisa nahi aaya; balance wahi raha jab tak verified payment nahi aaya.':null, lines, actions:acts.slice(0,2), basis:['Ledger events (AUTOPAY_FAILED, verified payments)','Policy '+POL.version]}; }

/* ---------- counterfactual: the same engine with network participation off ---------- */
function netOffAnswer(hi){
  const ids=RayData.FEATURED.map(b=>b.id).concat('newlife'); const rows=[];
  ids.forEach(id=>{ const a=recAlt(id,true), b=recAlt(id,false); if(!a||!b) return;
    if(a.recommendedLimit!==b.recommendedLimit||a.recommendedTerms!==b.recommendedTerms||a.band!==b.band) rows.push(`${BUY[id].name}: ${a.band} ${inr(a.recommendedLimit)} · ${a.recommendedTerms}d with network → ${b.band} ${inr(b.recommendedLimit)} · ${b.recommendedTerms}d without`); });
  const lines=[S.ctl.net?`If you turn network participation off, RAY recalculates every recommendation from your own data. ${rows.length} would change:`:`Network participation is already off. Every recommendation uses your data only. With eligible network evidence, ${rows.length} would differ:`].concat(rows.map(x=>'• '+x));
  lines.push('Limits you already approved stay as they are until you approve a new recommendation.');
  return {kind:'netoff', lead:hi?(S.ctl.net?'Network band karne par RAY sirf aapke data se recommend karega.':'Network pehle se band hai.'):null, lines, actions:[{label:S.ctl.net?'Compare on Gupta Traders':'Open Controls', route:S.ctl.net?'raahi/buyer/gupta':'raahi/controls', mob:null}], basis:['Policy '+POL.version+' (same rules, network on vs off)','Network signals · consented, aggregated']}; }

/* ---------- what is waiting for the merchant ---------- */
function approvalsAnswer(hi){
  const rec=Object.keys(FAILS).filter(id=>{ const r=recoveryOf(id); return r&&r.active; });
  const credit=RayData.FEATURED.map(b=>b.id).filter(id=>{ const r=recOf(id), d=decOf(id); return ['reduce','increase','terms'].includes(r.action)&&!(d&&['approved','kept'].includes(d.status)&&!recChanged(id)); });
  const reqs=(typeof CREQ!=='undefined'?CREQ:[]).filter(r=>!S.req[r.id]).map(r=>r.id);
  const pays=Object.keys(PAYREV).filter(id=>prPending(id));
  const lines=[];
  lines.push(rec.length?`Recovery (${rec.length}): ${rec.map(id=>{ const r=recoveryOf(id); return `${BUY[id].name} · ${r.inv} · ${r.label}${r.needsAction?' · choose a recovery step':''}`; }).join('; ')}. Every link, retry or message needs your approval before it is sent (simulated delivery).`:'No failed collection needs a recovery decision.');
  if(credit.length) lines.push(`Credit (${credit.length}): ${credit.map(id=>{ const r=recOf(id); return `${BUY[id].name} → ${inr(r.recommendedLimit)} · ${r.recommendedTerms}d`; }).join('; ')}. Recommended, not applied until you approve.`);
  if(reqs.length) lines.push(`Credit requests (${reqs.length}): ${reqs.map(id=>BUY[id].name).join(', ')}.`);
  if(pays.length) lines.push(`Payment reviews (${pays.length}): ${pays.map(id=>BUY[id].name).join(', ')}. Reminders stay on hold until reviewed.`);
  const acts=[]; if(rec.length) acts.push(actRecover(rec[0])); acts.push({label:'Open today’s plan', route:'raahi/actions', mob:['actions']});
  return {kind:'approvals', lead:hi?`${rec.length+credit.length+reqs.length+pays.length} cheezein aapki approval ka intezaar kar rahi hain.`:null, lines, actions:acts, basis:['Ledger','Recovery state','Policy '+POL.version,'Payment review queue']}; }

function ruleAnswer(q, surface){
  const hi=isHinglish(q), f=findBuyersIn(q), intent=askIntent(q, f.ids.length>0);
  const say=(o)=>Object.assign({mode:'rule', label:'Rule-based answer from your current RAY data', q, intent, basis:o.kind==='template'?['Static sample data']:o.kind==='credit'?['Ledger','Policy '+POL.version].concat(S.ctl.net?['Network · consented, aggregated']:[]):['Ledger · verified events only']}, o);
  if(intent==='refuse_action') return say({kind:'refuse', lines:['I can’t change anything from a chat message. Payments are marked paid only when a payment is verified, and approvals happen on the review screens where you confirm the exact values.'], actions:[{label:'Open today’s plan', route:'raahi/actions', mob:['actions']}]});
  if(intent==='invoice') return say(invoiceAnswer(invoiceIn(q), hi));
  if(intent==='netoff') return say(netOffAnswer(hi));
  if(intent==='approvals') return say(approvalsAnswer(hi));
  if(intent==='afterfail'&&!f.ambiguous) return say(afterFailAnswer(f.ids, hi));
  if(f.ambiguous){ const feat=new Set(RayData.FEATURED.map(b=>b.id)), ids=f.ids.slice().sort((a,b)=>(feat.has(b)?1:0)-(feat.has(a)?1:0)), top=ids.slice(0,3), more=ids.length-top.length;
    return say({kind:'clarify', lines:[`Which “${f.word[0].toUpperCase()+f.word.slice(1)}” do you mean? ${top.map(id=>BUY[id].name).join(' or ')}${more?`, or one of ${more} other${more===1?'':'s'} with that name (use the full name)`:''}? ${ids.length} buyers match, so I won’t pick one.`], choices:top.map(id=>({id, label:BUY[id].name})), actions:[]}); }
  const id=f.ids[0];
  if(id&&intent==='hold') return say(holdAnswer(id, hi));
  if(id&&intent==='payment') return say(paymentAnswer(id, hi));
  if(id&&(intent==='credit'||intent==='other')) return say(intent==='credit'?creditAnswer(id, hi):Object.assign(creditAnswer(id, hi),{lines:paymentAnswer(id,false).lines.slice(0,1).concat(creditAnswer(id,false).lines.slice(0,2))}));
  if(intent==='payment'&&!id) return say({kind:'clarify', lines:['Which buyer or invoice? For example “Gupta Traders ka payment kya hua?” or “INV-24891 status”.'], actions:[]});
  if(intent==='credit'&&!id) return say({kind:'clarify', lines:['Which buyer? For example “Sethi Mart ka limit badha doon?”.'], actions:[{label:'Open credit portfolio', route:'raahi/portfolio', mob:['portfolio']}]});
  if(intent==='slip'){ const L=slipLines(); return say({kind:'slip', lines:[`${L.length} buyer${L.length===1?' is':'s are'} paying slower than usual:`].concat(L.map(r=>`${r.name}: ${r.you}, ${r.sig}, ${r.due}`)), actions:[{label:'Review early warnings', route:'raahi/actions', mob:['portfolio']}]}); }
  if(intent==='priority'){ const T=planTop(3); return say({kind:'priority', lines:[`${lakhs(pfStats().dueThisWeek)} is due this week. Top ${T.length} to act on:`].concat(T.map((c,k)=>`${k+1}. ${(BUY[c.id]||{}).name} · ${inr(c.amt)} · ${c.kind.toLowerCase()}`)), actions:[{label:'Open today’s plan', route:'raahi/actions', mob:['actions']}]}); }
  if(intent==='collected'){ const live=S.led.events.filter(e=>MONEY_IN_T.includes(e.type)&&e.verification==='verified'&&!RayEvents.isReversed(S.led,e.id)&&!String(e.id).startsWith('ev-seed')), got=live.reduce((a,e)=>a+(e.amount||0),0);
    return say({kind:'collected', lines:[`Verified in this session: ${inr(got)} across ${live.length} payment${live.length===1?'':'s'}. Due this week: ${lakhs(pfStats().dueThisWeek)}.`, `Last week: ${lakhs(WEEK.lastCollected)} of ${lakhs(WEEK.lastDue)} (${WEEK.pct}%).`], actions:[{label:'Open today’s plan', route:'raahi/actions', mob:['actions']}]}); }
  if(intent==='failed'){ const act=recoveriesActive(); return say({kind:'failed', lines:act.length?[`${act.length} failed automatic collection${act.length===1?'':'s'} still open:`].concat(act.map(x=>`${BUY[x].name} · ${FAILS[x].inv} · ${recoveryOf(x).label}`)):['No failed automatic collections are open.'].concat(recoveriesDone().map(x=>`${BUY[x].name} · ${FAILS[x].inv} recovered in full.`)), actions:act.length?[actRecover(act[0])]:[]}); }
  if(intent==='txn') return say({kind:'template', label:'Sample dashboard data (static, not from your ledger)', lines:['₹1,42,380 collected today from 37 captured payments. 4 failed, mostly UPI timeouts.'], actions:[{label:'See today’s payments', route:'transactions', mob:null}]});
  if(intent==='failedpay') return say({kind:'template', label:'Sample dashboard data (static, not from your ledger)', lines:['4 payments failed today, all UPI timeouts between 8 and 9 AM. Customers retried 3 of them successfully.'], actions:[{label:'View payments', route:'transactions', mob:null}]});
  if(intent==='grow') return say({kind:'grow', lines:[`Start earlier with buyers whose repayment is slipping. RAY’s policy drafts a follow-up ${S.pol.watchLead} days before the due date for Watch buyers, checks payments first, and never sends without your approval. ${pfStats().slipping.length} buyers are on the early-warning list today.`], actions:[{label:'Open today’s plan', route:'raahi/actions', mob:['actions']}]});
  if(intent==='settle') return say({kind:'template', label:'Sample dashboard data (static, not from your ledger)', lines:['₹1,38,920 settles today by 5 PM to ICICI Bank ••4821. Saturday’s ₹1,96,410 settled at 4:12 PM.'], actions:[{label:'View settlements', route:'settlements', mob:null}]});
  return say({kind:'unsupported', lines:[`I couldn’t match that to a buyer, invoice, balance, credit limit or payment status, so I won’t guess.`, `Try “Gupta Traders ka payment kya hua?”, “INV-24891 status”, “Sethi Mart ka limit?” or “Kaun buyers slip kar rahe hain?”.`, ASK_LIMITS], actions:[]}); }

/* ---------- live AI (only when actually available) ---------- */
async function askLiveServer(q, surface){
  if(!AI.configured) return null;
  try{ const ctl=new AbortController(), t=setTimeout(()=>ctl.abort(),15000);
    const ctx=rayContext(q), r=await fetch('/api/ask',{method:'POST', headers:{'Content-Type':'application/json'}, signal:ctl.signal, body:JSON.stringify({question:String(q).slice(0,600), surface, context:ctx})}); clearTimeout(t);
    const j=await r.json().catch(()=>null);
    if(!r.ok||!j||!j.ok) return {fallback:true, note:(j&&j.message)||'Live AI could not answer'};
    const seen=JSON.stringify(ctx).replace(/,/g,'');
    const actions=(Array.isArray(j.actions)?j.actions:[]).slice(0,2).map(a=>{ const d=RAY_ACT[a&&a.type], id=a&&a.buyerId?String(a.buyerId):null; if(!d||!d.ok(id)) return null; return {type:a.type, id, label:d.label, route:d.route(id), mob:d.mob(id)}; }).filter(Boolean);
    return {mode:'ai', answer:String(j.answer||'').slice(0,900), actions, flags:rayCheckAmounts(String(j.answer||''), seen), label:`Live AI · ${j.provider||AI.provider}/${j.model||AI.model} · model explanation of your RAY data · amounts checked`}; }
  catch(e){ return {fallback:true, note:'Live AI timed out or could not be reached'}; } }
async function answerAny(q, surface){
  const rb=ruleAnswer(q, surface);
  if(rb.kind!=='unsupported') return rb;
  const live=AI.configured?await askLiveServer(q, surface):claudeLive()?await askRay(q, surface):null;
  if(live&&!live.fallback&&live.answer) return Object.assign({mode:'ai', label:live.label||'AI answer · Claude · from your RAY data · amounts checked', lines:[live.answer], actions:live.actions||[], flags:live.flags||[]});
  if(live&&live.fallback) return Object.assign(rb, {label:'AI unavailable · Rule-based fallback', note:live.note||''});
  return Object.assign(rb, live&&live.note?{note:live.note}:{}); }

/* ---------- renderers (same content, three surfaces) ---------- */
const ansText = a => [a.lead].concat(a.lines||[]).filter(Boolean).join('\n');
function ansHtml(a){ return `${a.lead?`<p><b>${esc(a.lead)}</b></p>`:''}${(a.lines||[]).map((l,i)=>`<p class="${i?'mt8':''}">${esc(l)}</p>`).join('')}
  ${(a.flags||[]).map(f=>`<div class="xs mt4" style="color:#9a5b00">${I('alert',12,2)} ${esc(f)}</div>`).join('')}
  ${a.choices&&a.choices.length?`<div class="row gap8 mt12 wrap">${a.choices.map(c=>`<button class="btn btn-s btn-sm" onclick="A.rayAsk(${esc(JSON.stringify(c.label+' '+(a.intent==='credit'?'ka limit?':'ka payment kya hua?')))})">${esc(c.label)}</button>`).join('')}</div>`:''}
  ${a.actions&&a.actions.length?`<div class="row gap8 mt12 wrap">${a.actions.map(x=>`<button class="btn btn-s btn-sm" onclick="go('${x.route}')">${esc(x.label)}</button>`).join('')}</div>`:''}
  <div class="row gap8 mt12 wrap"><span class="agent-src" data-mode="${a.mode}">${clover(11)} ${esc(a.label)}${a.note?` · ${esc(a.note)}`:''}</span>${(a.basis||[]).map(b=>`<span class="xs muted ans-basis">${esc(b)}</span>`).join('')}</div>`; }
