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
  if(!hasBuyer){
    if(/settle/.test(s)) return 'settle';
    if(/failed payments|payments? fail/.test(s)) return 'failedpay';
    if(/kitne payments|payments aaye|transactions|captured/.test(s)) return 'txn';
    if(/slip|early warn|warning/.test(s)) return 'slip';
    if(/kaun|rok|priorit|chase|who.*(owe|pay)|today.*plan|aaj kis/.test(s)) return 'priority';
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
  const over=overLimitText(b.name, s.out, r.recommendedLimit); if(over&&r.recommendedLimit<cs.limit) lines.push(over);
  if(cs.op&&cs.op.kind==='approved') lines.push(`You set ${inr(cs.op.to.limit)} · ${cs.op.to.terms} days (${cs.op.via}, ${cs.op.at}).${recChanged(id)?' The recommendation has changed since.':''}`);
  if(rq&&!S.req[id]){ const v=reqV(rq); lines.push(`Open request: ${inr(rq.amt)} more credit. RAY’s verdict: ${v.verdict.toLowerCase()} (exposure would be ${inr(v.exposureAfter)}). Needs your decision.`); }
  return {kind:'credit', ids:[id], lead:hi?(r.band==='Reliable'?'Theek hai, policy ke andar hai.':'Abhi aur credit dene se pehle dekh lijiye.'):null, lines,
    actions:[rq&&!S.req[id]?{label:'Review credit request', route:`raahi/request/${id}`, mob:['request',id]}:actBuyer(id)]}; }

function invoiceAnswer(no, hi){
  const f=findInvoice(no); if(!f) return {kind:'clarify', lines:[`I can’t find ${no} in your ledger. Check the number, or ask about the buyer by name.`], actions:[]};
  const {id,i}=f, pays=evOf(id).filter(e=>e.invoice===no&&MONEY_IN_T.includes(e.type)&&!String(e.id).startsWith('ev-seed')), lines=[];
  lines.push(`${no} · ${BUY[id].name} · invoice ${inr(i.amt)} · due ${fmtD(i.due)}.`);
  lines.push(i.bal<=0?`Paid in full.`:`${inr(i.bal)} outstanding${i.disputed?` (${inr(i.disputed)} disputed)`:''}${RayDates.diffDays(S.today,i.due)>0?`, ${RayDates.diffDays(S.today,i.due)} days overdue`:''}.`);
  pays.forEach(e=>lines.push(`${inr(e.amount)} received ${fmtD(e.date)} via ${e.source}.`));
  if(i.claim) lines.push(`Buyer says ${inr(i.claim.amount)} was paid. Not verified; balance unchanged.`);
  if(i.bal>0) lines.push(sourcesLine(id,no,{html:false}));
  return {kind:'invoice', ids:[id], lead:hi?(i.bal<=0?'Haan, poora paid hai.':`${inr(i.bal)} baaki hai.`):null, lines, actions:[FAILS[id]&&FAILS[id].inv===no?actRecover(id):actBuyer(id)]}; }

function ruleAnswer(q, surface){
  const hi=isHinglish(q), f=findBuyersIn(q), intent=askIntent(q, f.ids.length>0);
  const say=(o)=>Object.assign({mode:'rule', label:'Rule-based answer from your current RAY data', q, intent}, o);
  if(intent==='refuse_action') return say({kind:'refuse', lines:['I can’t change anything from a chat message. Payments are marked paid only when a payment is verified, and approvals happen on the review screens where you confirm the exact values.'], actions:[{label:'Open today’s plan', route:'raahi/actions', mob:['actions']}]});
  if(intent==='invoice') return say(invoiceAnswer(invoiceIn(q), hi));
  if(f.ambiguous) return say({kind:'clarify', lines:[`Which “${f.word[0].toUpperCase()+f.word.slice(1)}” do you mean? ${f.ids.map(id=>BUY[id].name).join(' or ')}?`], choices:f.ids.map(id=>({id, label:BUY[id].name})), actions:[]});
  const id=f.ids[0];
  if(id&&intent==='payment') return say(paymentAnswer(id, hi));
  if(id&&(intent==='credit'||intent==='other')) return say(intent==='credit'?creditAnswer(id, hi):Object.assign(creditAnswer(id, hi),{lines:paymentAnswer(id,false).lines.slice(0,1).concat(creditAnswer(id,false).lines.slice(0,2))}));
  if(intent==='payment'&&!id) return say({kind:'clarify', lines:['Which buyer or invoice? For example “Gupta Traders ka payment kya hua?” or “INV-24891 status”.'], actions:[]});
  if(intent==='credit'&&!id) return say({kind:'clarify', lines:['Which buyer? For example “Sethi Mart ka limit badha doon?”.'], actions:[{label:'Open credit portfolio', route:'raahi/portfolio', mob:['portfolio']}]});
  if(intent==='slip'){ const L=slipLines(); return say({kind:'slip', lines:[`${L.length} buyer${L.length===1?' is':'s are'} paying slower than usual:`].concat(L.map(r=>`${r.name}: ${r.you}, ${r.sig}, ${r.due}`)), actions:[{label:'Review early warnings', route:'raahi/actions', mob:['portfolio']}]}); }
  if(intent==='priority'){ const T=planTop(3); return say({kind:'priority', lines:[`${lakhs(pfStats().dueThisWeek)} is due this week. Top ${T.length} to act on:`].concat(T.map((c,k)=>`${k+1}. ${(BUY[c.id]||{}).name} · ${inr(c.amt)} · ${c.kind.toLowerCase()}`)), actions:[{label:'Open today’s plan', route:'raahi/actions', mob:['actions']}]}); }
  if(intent==='collected'){ const got=S.led.events.filter(e=>MONEY_IN_T.includes(e.type)&&e.verification==='verified'&&!String(e.id).startsWith('ev-seed')).reduce((a,e)=>a+(e.amount||0),0);
    return say({kind:'collected', lines:[`Verified in this session: ${inr(got)} across ${S.led.events.filter(e=>MONEY_IN_T.includes(e.type)&&!String(e.id).startsWith('ev-seed')).length} payment${got?'s':''}. Due this week: ${lakhs(pfStats().dueThisWeek)}.`, `Last week: ${lakhs(WEEK.lastCollected)} of ${lakhs(WEEK.lastDue)} (${WEEK.pct}%). Synthetic history.`], actions:[{label:'Open today’s plan', route:'raahi/actions', mob:['actions']}]}); }
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
    return {mode:'ai', answer:String(j.answer||'').slice(0,900), actions, flags:rayCheckAmounts(String(j.answer||''), seen), label:`AI answer · ${j.model||AI.model} · from your RAY data · amounts checked`}; }
  catch(e){ return {fallback:true, note:'Live AI timed out or could not be reached'}; } }
async function answerAny(q, surface){
  const rb=ruleAnswer(q, surface);
  if(rb.kind!=='unsupported') return rb;
  const live=AI.configured?await askLiveServer(q, surface):claudeLive()?await askRay(q, surface):null;
  if(live&&!live.fallback&&live.answer) return Object.assign({mode:'ai', label:live.label||'AI answer · Claude · from your RAY data · amounts checked', lines:[live.answer], actions:live.actions||[], flags:live.flags||[]});
  return Object.assign(rb, live&&live.note?{note:live.note}:{}); }

/* ---------- renderers (same content, three surfaces) ---------- */
const ansText = a => [a.lead].concat(a.lines||[]).filter(Boolean).join('\n');
function ansHtml(a){ return `${a.lead?`<p><b>${esc(a.lead)}</b></p>`:''}${(a.lines||[]).map((l,i)=>`<p class="${i?'mt8':''}">${esc(l)}</p>`).join('')}
  ${(a.flags||[]).map(f=>`<div class="xs mt4" style="color:#9a5b00">${I('alert',12,2)} ${esc(f)}</div>`).join('')}
  ${a.choices&&a.choices.length?`<div class="row gap8 mt12 wrap">${a.choices.map(c=>`<button class="btn btn-s btn-sm" onclick="A.rayAsk(${esc(JSON.stringify(c.label+' '+(a.intent==='credit'?'ka limit?':'ka payment kya hua?')))})">${esc(c.label)}</button>`).join('')}</div>`:''}
  ${a.actions&&a.actions.length?`<div class="row gap8 mt12 wrap">${a.actions.map(x=>`<button class="btn btn-s btn-sm" onclick="go('${x.route}')">${esc(x.label)}</button>`).join('')}</div>`:''}
  <div class="row gap8 mt12"><span class="agent-src" data-mode="${a.mode}">${clover(11)} ${esc(a.label)}${a.note?` · ${esc(a.note)}`:''}</span></div>`; }
