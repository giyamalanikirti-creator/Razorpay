/* ================= RAY ENGINE BRIDGE: one source of truth for every surface =================
 * lib/policy.js   evaluateCredit()        recommendations, bands, limits, terms, explanations
 * lib/events.js   applyRepaymentEvent()   ledger balances and the repayment event log
 * lib/guards.js   sendGate()              DNC, weekly limit, quiet hours, channels, stale data
 * lib/promise-rules.js                    interpreter checks + labelled rule-based fallback
 * Every screen (desktop, Ray AI, WhatsApp, mobile) reads recommendations through recOf(id).
 */
const BUILD_ID = '__BUILD__';
const POL = RayPolicy.POLICY;
const BUY = {}; RayData.ALL.forEach(b=>BUY[b.id]=b); BUY.newlife=RayData.NEW_BUYER;
const GEN = RayData.GENERATED;
const isGen = id => !!(BUY[id]&&BUY[id].synthetic);

/* ---------- clock (simulated, Asia/Kolkata) ---------- */
const simMin = () => 9*60 + _clock;
const simNowMs = () => RayDates.istMs(S.today, simMin());
const simDateLabel = () => RayDates.fmtDay(S.today);
const isToday = iso => iso===S.today;

/* ---------- limits, terms, reference ---------- */
function curLimitOf(id){ if(id==='gupta') return S.gupta.limit; if(id==='newlife') return S.newLife?(S.check.limit||0):0; const l=S.limits[id]; return typeof l==='number'?l:(BUY[id]?BUY[id].limit:0); }
function curTermsOf(id){ if(id==='gupta') return S.gupta.curTerms; if(id==='newlife') return S.newLife?(S.check.terms||15):15; return (S.termsOf&&S.termsOf[id])||(BUY[id]?BUY[id].terms:30); }
function refLimitOf(id){ const b=BUY[id]; if(!b) return 0; return Math.max(b.refLimit||0, (S.refRaise&&S.refRaise[id])||0); }
function setLimitValue(id, limit, terms){ const prev=curLimitOf(id);
  if(id==='gupta'){ S.gupta.limit=limit; if(terms) S.gupta.curTerms=terms; }
  else if(id==='newlife'){ S.check.limit=limit; if(terms) S.check.terms=terms; }
  else { S.limits[id]=limit; if(terms){ S.termsOf=S.termsOf||{}; S.termsOf[id]=terms; } }
  if(limit>refLimitOf(id)){ S.refRaise=S.refRaise||{}; S.refRaise[id]=limit; }
  S._limv=(S._limv||0)+1; return prev; }

/* ---------- ledger ---------- */
const invsOf = id => (S.led.invoices[id]||[]);
const invOf = (id,inv) => invsOf(id).find(i=>i.inv===inv);
const outOf = id => invsOf(id).reduce((a,i)=>a+Math.max(0,i.bal),0);
const balOf = (id,inv) => { const i=invOf(id,inv); return i?i.bal:0; };
function recordEvent(e, opts={}){
  const ev=Object.assign({date:S.today, source:'Prototype simulation', actor:M.owner, verification:'n/a'}, e, {at:simNowMs()});
  const r=RayEvents.applyRepaymentEvent(S.led, ev);
  if(!r.ok){ if(!opts.quiet) toast('Not recorded: '+r.error); return r; }
  S.led=r.ledger; engineSync(); return r;
}
const evOf = id => S.led.events.filter(e=>e.buyerId===id);

/* ---------- recommendation (memoised per state signature) ---------- */
let _recCache={}, _recSig='';
function engSig(){ return [S.led.seq, S.led.events.length, S.ctl.net?1:0, S.stale?1:0, S.today, S._limv||0, S.newLife?1:0, JSON.stringify(S.verified), S.bank.st, Object.keys(S.req).filter(k=>S.req[k]).join(',')].join('|'); }
function recordOf(id){ const b=BUY[id]; if(!b) return null;
  return Object.assign({}, b, {limit:curLimitOf(id), terms:curTermsOf(id), refLimit:refLimitOf(id), gstVerified:!!S.verified[id]}); }
function engCtx(id){ const r=typeof creq==='function'?creq(id):null;
  return {today:S.today, now:new Date(simNowMs()).toISOString(), ledgerAgeHours:S.stale?31:1, bankConnected:S.bank.st==='on', request:r&&!S.req[id]?{amount:r.amt, terms:r.reqTerms||null}:null}; }
function sigOf(id){ const rec=recordOf(id); if(!rec) return null; return RayPolicy.deriveBuyerSignals(rec, S.led, {today:S.today}); }
function evalOf(id, network){ const s=sigOf(id); if(!s) return null; return RayPolicy.evaluateCredit(s, {network}, POL, engCtx(id)); }
function recOf(id){ const sig=engSig(); if(sig!==_recSig){ _recCache={}; _recSig=sig; } if(!_recCache[id]){ _recCache[id]=evalOf(id, !!S.ctl.net); } return _recCache[id]; }
function recAlt(id, network){ const k=id+(network?'#n':'#o'); const sig=engSig(); if(sig!==_recSig){ _recCache={}; _recSig=sig; } if(!_recCache[k]) _recCache[k]=evalOf(id, network); return _recCache[k]; }

/* ---------- decisions: snapshot, what changed, approval ---------- */
const snapOf = r => ({band:r.band, limit:r.recommendedLimit, terms:r.recommendedTerms, action:r.action, risk:r.riskIndex, conf:r.confidence, net:!!r.networkStep, netState:r.network.state, contrib:Object.fromEntries(r.signalContributions.map(c=>[c.key,{p:c.points,o:c.observed,e:c.effect}])), seq:S.led.seq, at:simDateLabel()+', '+RayDates.fmtTime(simMin()), ctl:{net:!!S.ctl.net, stale:!!S.stale}});
function decOf(id){ S.dec=S.dec||{}; if(!S.dec[id]){ const r=recOf(id); if(!r) return null; S.dec[id]={status:'baseline', snap:snapOf(r), hist:[]}; } return S.dec[id]; }
function engInit(){ S.dec={}; ['gupta','chawla','newlife','sethi','arora','mehta','jain','singh','bansal','goyal','citycare','guptak','sharma','kapoor','lifeline','verma','singhms'].forEach(decOf); engineSync(); }
function recChanged(id){ const d=decOf(id), r=recOf(id); if(!d||!r) return false; const s=d.snap; return s.band!==r.band||s.limit!==r.recommendedLimit||s.terms!==r.recommendedTerms; }
function decide(id, status, via){ const d=decOf(id), r=recOf(id); d.hist.unshift({at:simDateLabel()+', '+RayDates.fmtTime(simMin()), from:d.snap, to:snapOf(r), status, via:via||'Dashboard'}); d.snap=snapOf(r); d.status=status; d.by=M.owner; d.via=via; }
const seqNum = e => +(String(e.id).match(/^ev-(\d+)$/)||[0,0])[1];
/* repayment and consent events recorded after the last decision snapshot */
function eventsSince(id){ const d=decOf(id); return evOf(id).filter(e=>seqNum(e)>d.snap.seq); }

/* derived values written back into legacy state so every existing screen reads the engine */
function engineSync(){
  const g=S.gupta, r=recOf('gupta'); if(!r) return;
  g.band=r.band; g.out=outOf('gupta'); g.limitRec=r.recommendedLimit; g.terms=r.recommendedTerms; g.oldest=balOf('gupta','INV-24891');
  if(g.rec!=='open'&&recChanged('gupta')) { g.rec='open'; S.later.gupta=false; }
}

/* ---------- labels ---------- */
const NET_STATE_LABEL = {off:'Network off', available:'Consent available', pending:'Consent pending', denied:'Consent denied', revoked:'Consent revoked', expired:'Consent expired', none:'No consent', insufficient:'Insufficient coverage', stale:'Signal too old', under_review:'Under buyer review'};
function netLabel(r){ const n=r.network; if(n.eligible) return n.trend==='adverse'?'Weakening':n.trend==='improving'?'Improving':'Stable'; return NET_STATE_LABEL[n.state]||'Not used'; }
function shortReasons(id, n=3){ const r=recOf(id), s=sigOf(id); const out=[];
  const by=k=>r.signalContributions.find(c=>c.key===k);
  if(r.networkStep&&r.networkStep.kind==='uncorroborated') out.push(`On time with you, slipping with ${r.network.coverage} other distributors`);
  else if(r.networkStep) out.push(`Also slowing with ${r.network.coverage} other distributors`);
  if(s.isNew){ if(r.network.eligible&&r.networkStep) out.push(`Pays ${r.network.coverage} distributors in about ${Math.round(r.network.avgDays)} days`); out.push('GSTIN active · returns filed on time'); return out.slice(0,n); }
  const c=r.signalContributions.filter(x=>x.points>0).sort((a,b)=>b.points-a.points);
  for(const x of c){ if(out.length>=n) break;
    if(x.key==='delay') out.push(`Paying ${s.usual}d → ${s.delay}d`);
    else if(x.key==='onTime') out.push(`${s.onTimePct}% of invoices paid on time`);
    else if(x.key==='promises') out.push(`${s.promises.broken} of ${s.promises.made} promises missed`);
    else if(x.key==='orders') out.push(`Orders down ${Math.abs(s.ordersChangePct)}%`);
    else if(x.key==='failures') out.push(`${s.debit.failures60d} ${s.debit.method} failure${s.debit.failures60d===1?'':'s'} in 60 days`);
    else if(x.key==='utilisation') out.push(`${s.utilisationPct}% of reference limit used`);
    else if(x.key==='overdue') out.push(`Oldest invoice ${s.maxOverdueDays} days overdue`);
    else if(x.key==='trajectory') out.push('Slower on each of the last 3 invoices');
    else if(x.key==='gst') out.push('GST registration not active');
  }
  if(!out.length){ if(by('increase')) out.push(s.debit.streak>=6?`${s.debit.streak} on-time ${s.debit.method} collections in a row`:'Pays consistently, no missed promises'); if(r.network.eligible&&r.network.trend!=='adverse') out.push('Pays other distributors on time too'); if(s.delayVsUsual<=0) out.push(`Pays in ${s.delay} days vs ${s.usual} usual`); else out.push('No missed promises'); }
  return out.slice(0,n);
}

/* ---------- portfolio aggregates (from the records, never typed in) ---------- */
let _stCache={sig:'',v:null};
function pfStats(){ const sig=engSig(); if(_stCache.sig===sig) return _stCache.v;
  const st=RayData.stats(S.led, S.today); const bands={Reliable:0,Watch:0,Risky:0}; let netSig=0;
  for(const b of RayData.ALL){ if(outOf(b.id)<=0) continue; const r=recOf(b.id); bands[r.band]=(bands[r.band]||0)+1; if(r.network.eligible) netSig++; }
  const slip=slippingBuyers();
  const att=slip.reduce((a,id)=>a+invsOf(id).filter(i=>i.bal>0&&RayDates.diffDays(i.due,S.today)<=14).reduce((x,i)=>x+i.bal-(i.disputed||0),0),0);
  const v=Object.assign(st,{bands, netSignals:netSig, slipping:slip, attention:att});
  _stCache={sig,v}; return v; }
const lakhs = n => n>=10000000?'₹'+(n/10000000).toFixed(2).replace(/0$/,'')+'Cr':'₹'+(n/100000).toFixed(1).replace(/\.0$/,'')+'L';
/* early warning: own data shows a fresh slowdown, or eligible network evidence shows one */
function slippingBuyers(){ const ids=[];
  for(const b of RayData.FEATURED){ const r=recOf(b.id), s=sigOf(b.id); if(r.band==='Risky') continue;
    const own=s.delayVsUsual>=5&&s.trajectory==='worse'&&s.maxOverdueDays<=7; const net=r.network.eligible&&r.network.trend==='adverse';
    if(own||net) ids.push(b.id); }
  return ids.sort((a,b)=>(recOf(b).riskIndex||0)-(recOf(a).riskIndex||0)); }
const netFirst = id => { const r=recOf(id), s=sigOf(id); return r.network.eligible&&r.network.trend==='adverse'&&(r.networkStep&&r.networkStep.kind==='uncorroborated'||!!(BUY[id].network&&BUY[id].network.firstSlowed)); };

/* ---------- merchant controls at send time ---------- */
function gateState(id, inv){ const due=inv?balOf(id,inv):outOf(id); const i=inv?invOf(id,inv):null;
  const claim=invsOf(id).some(x=>x.claim&&x.bal>0);
  const review=(typeof prPending==='function'&&prPending(id)) || (id==='verma'&&!S.vermaMatched);
  const disputed=inv?(i&&i.disputed||0):invsOf(id).reduce((a,x)=>a+(x.bal>0?(x.disputed||0):0),0);
  return {dueAmount:due, disputed, paid:due<=0, claimPending:claim, unmatchedPending:review, reviewText:review&&(PAYREV[id]||{}).kind!=='unmatched_credit'?((PAYREV[id]||{}).kind==='cheque_recorded'?'A salesperson recorded a cheque that is not in the bank yet. Review it before sending a reminder.':'Payment status is not confirmed yet. Review the payment before sending a reminder.'):null}; }
function gateFor(id, channel='whatsapp', inv){
  const b=BUY[id]||{id,name:id};
  return RayGuards.sendGate({buyer:{id, name:b.name}, channel,
    controls:{paused:S.paused, wa:S.ctl.wa, sm:S.ctl.sm, dnc:S.ctl.dnc, maxPerWeek:parseInt(S.ctl.max)||2, quietFrom:S.ctl.qf, quietTo:S.ctl.qt},
    ledger:{stale:S.stale, ageHours:31}, state:gateState(id, inv), sentLog:S.outbox, now:simNowMs()}); }
function outboxAdd(e){ const o=Object.assign({id:'ob-'+(S.outbox.length+1), at:simNowMs()}, e); S.outbox.push(o); return o; }
/* run a send through the gate; returns {ok, queued, blocked, reason} and records it */
function trySend(id, {channel='whatsapp', kind='reminder', inv, msg, via, scheduleAt}={}){
  if(scheduleAt){ const g=gateFor(id, channel, inv); if(g.action==='block') { logBlocked(id,g,channel); return {blocked:true, gate:g}; }
    const o=outboxAdd({buyerId:id, channel, kind, inv, msg, status:'scheduled', sendAt:scheduleAt, via}); return {scheduled:true, item:o}; }
  const g=gateFor(id, channel, inv);
  if(g.action==='send'){ const o=outboxAdd({buyerId:id, channel, kind, inv, msg, status:'sent', via}); return {ok:true, item:o, gate:g}; }
  if(g.action==='queue'){ const o=outboxAdd({buyerId:id, channel, kind, inv, msg, status:'queued', sendAt:g.queueUntil, via}); return {queued:true, item:o, gate:g}; }
  logBlocked(id,g,channel); return {blocked:true, gate:g}; }
function logBlocked(id,g,channel){ log({ic:'ban',ti:`Message to ${(BUY[id]||{}).name||id} not sent`,de:g.reasons[g.reasons.length-1].text,src:[],who:'RAY controls',chem:(BUY[id]||{}).name}); }
const gateNote = g => g.reasons.length?g.reasons[g.reasons.length-1].text:'';
/* deliver scheduled / queued messages whose time has come, re-checking every control at execution time */
function runOutbox(){ const now=simNowMs(); let sent=0, blocked=0;
  S.outbox.filter(o=>['scheduled','queued'].includes(o.status)&&o.sendAt<=now).forEach(o=>{ const g=gateFor(o.buyerId,o.channel,o.inv);
    if(g.action==='send'){ o.status='sent'; o.at=now; sent++; if(S.chase[o.buyerId]&&['scheduled','queued'].includes(S.chase[o.buyerId].st)){ S.chase[o.buyerId].st='sent'; S.chase[o.buyerId].at=nowLabel(); }
      log({ic:'send',ti:`Scheduled message sent to ${BUY[o.buyerId].name}`,de:`WhatsApp · controls re-checked at send time`,src:['conv'],who:'RAY · approved earlier by '+M.owner,chem:BUY[o.buyerId].name}); }
    else if(g.action==='block'){ o.status='blocked'; o.reason=gateNote(g); blocked++; if(S.chase[o.buyerId]) S.chase[o.buyerId].st='draft'; logBlocked(o.buyerId,g,o.channel); } });
  return {sent, blocked}; }
const nowLabel = () => RayDates.fmtTime(simMin());
A.advanceToMs=(ms)=>{ const p=RayDates.istParts(ms); if(RayDates.diffDays(p.date,S.today)>0) advanceDate(p.date); _clock=Math.max(_clock,p.min-9*60); const r=runOutbox(); rr(); toast(`Demo clock moved to ${simDateLabel()}, ${nowLabel()} IST${r.sent?` · ${r.sent} message${r.sent===1?'':'s'} sent`:''}${r.blocked?` · ${r.blocked} blocked at send time`:''}`); };
A.advanceClock=(toMin)=>{ const cur=simMin(); if(toMin<=cur){ toast('Already past that time'); return; } _clock=toMin-9*60; const r=runOutbox(); rr(); toast(`Demo clock moved to ${nowLabel()} IST${r.sent?` · ${r.sent} scheduled message${r.sent===1?'':'s'} sent`:''}${r.blocked?` · ${r.blocked} blocked at send time`:''}`); };

/* ---------- AI status (server tells us honestly whether a model is configured) ---------- */
const AI = {checked:false, configured:false, provider:null, model:null, reachable:false, claude:null, claudeChecked:false, claudeOff:null};
/* Live AI through the page's own Claude access (artifact `sample` capability, on the viewer's Claude account). */
let _claudeP=null;
function claudeSample(){ if(_claudeP) return _claudeP;
  _claudeP=(async()=>{ try{ const c=window.claude; AI.claude=(c&&typeof c.use==='function')?await c.use('sample'):null; }catch(e){ AI.claude=null; }
    AI.claudeChecked=true; if(route().startsWith('raahi')||route().startsWith('ray')) render(); return AI.claude; })();
  return _claudeP; }
const claudeLive = () => !!AI.claude && !AI.claudeOff;
function aiCheck(){ claudeSample(); if(AI.checked) return; AI.checked=true; if(location.protocol==='file:') return;
  fetch('/api/parse-promise',{method:'GET'}).then(r=>r.ok?r.json():null).then(j=>{ if(j&&typeof j.configured==='boolean'){ AI.reachable=true; AI.configured=j.configured; AI.provider=j.provider; AI.model=j.model; if(route().startsWith('raahi')) render(); } }).catch(()=>{}); }
const aiLabel = () => claudeLive()?'Live AI · Claude':AI.configured?`Live AI · ${AI.model}`:AI.claudeOff?(UNAVAIL[AI.claudeOff]||'Live AI off'):!AI.claudeChecked?'Connecting to Claude…':AI.reachable?'AI not configured on this deployment':'Live AI off · open in Claude to use it';

/* ---------- persistence (optional, per browser) ---------- */
const PERSIST_KEY='ray-credit-demo-v2';
function persistSave(){ try{ if(S.persist===false) return; localStorage.setItem(PERSIST_KEY, JSON.stringify({build:BUILD_ID, clock:_clock, wat:typeof _wat!=='undefined'?_wat:2, S})); }catch(e){} }
function persistLoad(){ try{ const raw=localStorage.getItem(PERSIST_KEY); if(!raw) return false; const j=JSON.parse(raw); if(!j||j.build!==BUILD_ID||!j.S) return false;
  const base=S0(); S=Object.assign(base, j.S); _clock=j.clock||12; if(typeof _wat!=='undefined') _wat=j.wat||2;
  /* in-flight UI states cannot survive a refresh: settle them */
  S.mob=null; S.rs=null; S.ray.busy=false; S.wa.busy=false; S.demoOpen=false; S.demoNote=null;
  if(S.check&&S.check.step==='looking') S.check.step='input'; if(S.check&&S.check.step==='analysing') S.check.step='result';
  Object.keys(S.coll||{}).forEach(k=>{ if(S.coll[k]==='progress') S.coll[k]='scheduled'; });
  Object.values(S.interp||{}).forEach(x=>{ if(x.status==='loading') x.status='idle'; });
  if(['new','reading'].includes(S.gupta.promise)) S.gupta.promise='understood';
  return true; }catch(e){ return false; } }
function persistClear(){ try{ localStorage.removeItem(PERSIST_KEY); }catch(e){} }
hooks.push(()=>{ clearTimeout(window._psT); window._psT=setTimeout(persistSave,300); });

function engBoot(){ if(!persistLoad()) engInit(); else engineSync(); syncChase(true); const dc=document.getElementById('datechip'); if(dc) dc.textContent=S.date; aiCheck(); }
/* apply a verified payment to the ledger (clamped to the open balance, de-duplicated by reference) */
function ledgerPay(id, inv, amt, o={}){ const i=(inv&&invOf(id,inv))||nextOpenInv(id); if(!i||i.bal<=0||!amt) return {ok:false};
  return recordEvent({type:o.type||'PAYMENT_RECEIVED', buyerId:id, invoice:i.inv, amount:Math.min(amt,i.bal), verification:'verified', source:o.source||'Razorpay', actor:o.actor||'Razorpay', ref:o.ref||null, meta:o.meta||{}},{quiet:true}); }
/* 30-day collections forecast: rule-based, not a prediction model */
function forecast30(){ const end=RayDates.addDays(S.today,30); let t=0; for(const b of RayData.ALL){ const r=recOf(b.id); if(!r||r.band!=='Reliable') continue; for(const i of invsOf(b.id)){ if(i.bal>0&&RayDates.diffDays(i.due,S.today)>=0&&RayDates.diffDays(end,i.due)>=0) t+=i.bal-(i.disputed||0); } }
  S.promises.filter(p=>p.status==='confirmed'&&p.buyerId!=='guptak').forEach(p=>{ if(p.later&&p.later.date&&RayDates.diffDays(end,p.later.date)>=0) t+=p.later.amt||0; }); return t; }
