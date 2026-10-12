/* ================= RAZORPAY NETWORK: how a retailer repays every distributor, not just you ================= */
/* The moat. Consented and aggregated: shown only as bands, no other distributor is ever named. */
const NET_LINE = 'Consented and aggregated. No other distributor is ever named.';
const netView = () => netOn();
const netMark = (t='Network changed this') => `<span class="netmark">${I('users',11,2.4)} ${t}</span>`;

/* both recommendations computed by the same engine: with eligible network evidence, and from your data only.
   The switch is the real participation setting; when it is off, network data is not used at all. */
function netCompare(id,opts={}){
  if(!BUY[id]) return '';
  const own=recAlt(id,false), on=netOn(), withN=on?recAlt(id,true):null, used=withN&&withN.networkStep;
  const col=(t,r,active,note)=>`<div class="ncmp-c ${active?'on':''}"><div class="xs muted" style="font-weight:600">${t}</div>${r?`<div class="ncmp-rec mt4">${bandBadge(r.band)} ${inr(r.recommendedLimit)} · ${r.recommendedTerms} days</div><div class="xs muted mt4">Confidence ${r.confidence}${r.riskIndex!=null?` · risk index ${r.riskIndex}`:''}</div>`:''}${note?`<div class="xs mt4" style="color:var(--text)">${note}</div>`:''}</div>`;
  const netNote=!on?'Network off. Turn it on to include consented signals.':!withN.network.eligible?esc(withN.network.reason):withN.networkStep?esc(withN.networkStep.rule):'Network evidence is stable: no adjustment.';
  return `<div class="ncmp ${opts.mob?'mob':''}" id="ncmp-${id}"><div class="row between wrap gap8">${used?netMark():`<span class="xs muted" style="font-weight:600">Network vs your data</span>`}<div class="nseg"><button class="${on?'on':''}" onclick="${on?'':'A.netToggle()'}">Network on</button><button class="${on?'':'on'}" onclick="${on?'A.netToggle()':''}">Your data only</button></div></div>
   <div class="ncmp-g mt8">${col('With Razorpay network',withN&&withN.network.eligible?withN:null,on,withN&&withN.network.eligible?'':netNote)}${col('Your data only',own,!on||!used,'')}</div>${withN&&withN.network.eligible?`<div class="xs muted mt8">${netNote}</div>`:''}
   ${used&&withN.networkStep.kind==='corroborated'?`<div class="small mt8" style="color:var(--strong)">Network changed this: ${inr(own.recommendedLimit)} → <b>${inr(withN.recommendedLimit)}</b>, ${own.recommendedTerms} → ${withN.recommendedTerms} days.</div>`:used?`<div class="small mt8" style="color:var(--strong)">Network changed this: ${own.band} → <b>${withN.band}</b>, limit held at ${inr(withN.recommendedLimit)}.</div>`:''}</div>`;
}
/* ---------- with you vs across the network (buyer profile): the differentiator, computed by the engine ---------- */
/* first month a series is at least `delta` days slower than its own first month (same threshold as the network rule) */
function firstSlowMonth(labels, vals, delta){ if(!labels||!vals||!vals.length) return null; const b=vals[0]; const i=vals.findIndex(v=>v>=b+delta); return i<0?null:{i, label:labels[i]}; }
const MONTHS_FULL={Jan:'January',Feb:'February',Mar:'March',Apr:'April',May:'May',Jun:'June',Jul:'July',Aug:'August',Sep:'September',Oct:'October',Nov:'November',Dec:'December'};
/* why network evidence is or is not used for this buyer: the same gates as lib/policy.js networkEvidence() */
function netGates(id){ const s=sigOf(id), n=s.network, c=POL.network;
  return [
    {k:'part', label:'You take part in the Razorpay network', ok:!!S.ctl.net, val:S.ctl.net?'On':'Off'},
    {k:'consent', label:'Buyer consent', ok:s.consent==='available', val:NET_STATE_LABEL[s.consent]||s.consent},
    {k:'coverage', label:`At least ${c.minCoverage} participating distributors`, ok:!!n&&n.coverage>=c.minCoverage, val:n?`${n.coverage} report this buyer`:'None'},
    {k:'fresh', label:`Signal at most ${c.maxRecencyDays} days old`, ok:!!n&&n.recencyDays<=c.maxRecencyDays, val:n?`${n.recencyDays} days old`:'—'},
    {k:'dispute', label:'Not under buyer dispute', ok:!s.networkDisputed, val:s.networkDisputed?'Buyer asked for a review':'No dispute'}]; }
function netStory(id, opts={}){
  const b=BUY[id]; if(!b||!b.network) return '';
  const s=sigOf(id), own=recAlt(id,false), withN=recAlt(id,true), live=recOf(id), n=s.network||{}, used=!!live.networkStep, elig=withN.network.eligible;
  const gates=netGates(id), firstFail=gates.find(g=>!g.ok);
  const m=n.monthly, d=POL.network.adverseDeltaDays;
  const netM=m?firstSlowMonth(m.labels,m.net,d):null, ownM=m?firstSlowMonth(m.labels,m.own,d):null;
  const lead=netM&&ownM?ownM.i-netM.i:null;
  const step=withN.networkStep, kind=s.isNew?'new':step?step.kind:'none';
  /* one sentence, computed: what the merchant sees vs what eligible evidence adds */
  const say = kind==='corroborated'?`Your records show ${b.name} slowing down${ownM?` from ${MONTHS_FULL[ownM.label]}`:''}. Eligible network evidence shows the slowdown began earlier${netM?`, in ${MONTHS_FULL[netM.label]}`:''}, across ${n.coverage} other participating distributors${lead>0?` (${lead} month${lead===1?'':'s'} before your ledger)`:''}.`
    : kind==='uncorroborated'?`Your records show ${b.name} paying on time (${s.usual} → ${s.delay} days). Eligible network evidence shows it slowing with ${n.coverage} other participating distributors${netM?` since ${MONTHS_FULL[netM.label]}`:''}. The policy flags a review and holds the limit; it does not cut on evidence your data does not confirm.`
    : kind==='new'?`${b.name} has no repayment history with you. ${elig?`Eligible network evidence shows it paying ${n.coverage} participating distributors in about ${n.avgDays} days, so the starter limit is raised by rule.`:'Without eligible network evidence RAY uses the conservative starter limit.'}`
    : elig?'Eligible network evidence is stable, so it does not change the recommendation.':`Network evidence is not used: ${withN.network.reason||firstFail&&firstFail.label}.`;
  const col=(r)=>`${bandBadge(r.band)}`;
  const diff=(a,b2)=>a!==b2?' class="ns-diff"':'';
  const evidenceOwn=s.isNew?'GST record only (no history with you)':`Your ledger and Razorpay payments with you`;
  const evidenceNet=elig?`${evidenceOwn} + consented, aggregated signals from ${n.coverage} distributors (synthetic)`:`${evidenceOwn} only · network excluded (${esc(withN.network.reason)})`;
  const appr=(()=>{ const d0=decOf(id), cs=typeof creditStatus==='function'?creditStatus(id):null;
    if(s.isNew) return S.newLife?`Approved by you · ${inr(curLimitOf(id))} · ${curTermsOf(id)} days`:'Needs your approval before any credit';
    if(d0&&d0.status==='approved'&&!recChanged(id)) return `Approved by ${d0.by||M.owner}`; if(d0&&d0.status==='kept'&&!recChanged(id)) return 'You kept the current limit';
    return ['none'].includes(live.action)?'Nothing to approve':'Pending your approval · nothing changes until you approve'; })();
  const chain=[
    ['Your repayment history', s.isNew?'No invoices with you yet':`${s.usual}d → ${s.delay}d to pay${ownM?` · ≥${d} days slower from ${ownM.label}`:' · no slowdown'} · ${s.onTimePct!=null?s.onTimePct+'% on time':''}`],
    ['Eligible network signal', elig?(n.avgDays!=null&&n.baseLow==null?`${n.coverage} distributors · about ${n.avgDays}d to pay`:`${n.coverage} distributors · ${n.baseLow}–${n.baseHigh}d → ${n.nowLow}–${n.nowHigh}d${netM?` · slower from ${netM.label}`:''}`):`Excluded · ${esc(withN.network.reason)}`],
    ['Corroboration', !elig?'Not assessed (signal excluded)':kind==='corroborated'?'Agrees with your data':kind==='uncorroborated'?'Disagrees: on time with you':kind==='new'?'No history with you to compare':'Stable elsewhere'],
    ['Policy rule', step?esc(step.rule):kind==='new'&&!elig?`Starter policy ${inr(own.recommendedLimit)} · ${own.recommendedTerms} days`:'No network rule applies'],
    ['Adjustment', step?(step.kind==='uncorroborated'?`${own.band} → ${withN.band} · limit held at ${inr(withN.recommendedLimit)}`:`${inr(own.recommendedLimit)} · ${own.recommendedTerms}d → ${inr(withN.recommendedLimit)} · ${withN.recommendedTerms}d`):'None'],
    ['Your approval', appr]];
  const ctl=!opts.mob?netEvidenceControls(id):'';
  const chart=m&&!opts.compact?lineChart({labels:m.labels,series:[{v:m.net,c:'#7b5fd6',label:'Network',name:`Across ${n.coverage} distributors`,dy:-12},{v:m.own,c:'#d47a1f',hl:ownM?m.own.map((_,i)=>i).filter(i=>i>=ownM.i):[],label:'With you',name:'With you',dy:13}],yMax:30,ticks:[0,10,20,30],fmt:v=>v+'d'}):'';
  return `<div class="card pad netbig mt16 ns" id="net"><div class="row between wrap gap8"><div class="row gap8"><span class="net-ic">${I('users',16,2.2)}</span><span class="h3">${s.isNew?'Day-one credit: your data vs eligible network evidence':'Your ledger vs eligible network evidence'}</span></div><div class="row gap6 wrap">${used?netMark('Network changed this decision'):`<span class="badge b-n">${S.ctl.net?esc(NET_STATE_LABEL[live.network.state]||'Not used'):'Network participation off · comparison only'}</span>`}<span class="badge b-a">Synthetic data · proposed capability</span></div></div>
   <div class="small mt12 ns-say">${say}</div>
   <div style="overflow-x:auto"><table class="table ns-t mt12"><thead><tr><th></th><th>Your ledger only</th><th>With eligible network signals</th></tr></thead><tbody>
    <tr><td>Risk band</td><td>${col(own)}</td><td${diff(own.band,withN.band)}>${col(withN)}</td></tr>
    <tr><td>Credit limit recommendation</td><td class="num">${inr(own.recommendedLimit)}</td><td class="num"${diff(own.recommendedLimit,withN.recommendedLimit)}><b>${inr(withN.recommendedLimit)}</b></td></tr>
    <tr><td>Recommended terms</td><td class="num">${own.recommendedTerms} days</td><td class="num"${diff(own.recommendedTerms,withN.recommendedTerms)}><b>${withN.recommendedTerms} days</b></td></tr>
    <tr><td>Evidence</td><td class="xs">${evidenceOwn}</td><td class="xs">${evidenceNet}</td></tr>
    <tr><td>Confidence (evidence sufficiency)</td><td>${own.confidence}</td><td>${withN.confidence}</td></tr>
   </tbody></table></div>
   <div class="xs muted mt4">Both columns are computed now by the same policy (${POL.version}); no buyer is special-cased. ${S.ctl.net?`RAY is currently using the ${used?'network':'your-ledger'} column.`:'Participation is off, so RAY uses your ledger column; the other column shows what eligible evidence would change.'}</div>
   <ol class="ns-chain mt16">${chain.map(([h,t],i)=>`<li><span class="ns-n">${i+1}</span><div><b>${h}</b><div class="xs muted">${t}</div></div></li>`).join('')}</ol>
   <div class="grid g2 mt16" style="gap:16px;align-items:start"><div><div class="lbl">Why network evidence is ${elig&&S.ctl.net?'included':'excluded'}</div><div class="col gap4 mt8">${gates.map(g=>`<div class="row gap8 small"><span style="color:${g.ok?'var(--g)':'var(--r)'};flex-shrink:0">${I(g.ok?'check':'x',13,2.6)}</span><span class="grow">${g.label}</span><span class="xs muted">${esc(g.val)}</span></div>`).join('')}</div></div>
    ${chart?`<div><div class="row between"><span class="xs muted" style="font-weight:600">Typical days to pay (synthetic, aggregated)</span><span class="legend"><span><i style="background:#7b5fd6"></i>Network</span><span><i style="background:#d47a1f"></i>With you</span></span></div><div class="mt4">${chart}</div></div>`:'<div></div>'}</div>
   ${ctl}
   <details class="ns-reg mt12"><summary class="xs" style="cursor:pointer;font-weight:600">Regulatory and feasibility boundary</summary><div class="xs muted mt8">This is a simulated, proposed capability. Razorpay does not operate a cross-distributor repayment-data product today, and buyer consent alone would not authorise access to another distributor’s transaction data. A real pilot would need: participating-distributor data-sharing agreements; an appropriate legal basis and user permissions; data minimisation (aggregated bands only, no names, invoices or transactions); identity matching with error handling; consent capture, revocation and audit; compliance with privacy and applicable credit-information regulation; fairness checks and a dispute route for buyers; and legal and compliance review before any deployment. No RBI Account Aggregator data is assumed.</div></details>
   <div class="xs muted mt8 row gap4">${I('lock',12)} ${NET_LINE}</div></div>`;
}
/* simulate evidence quality: every button records an event; the recommendation is recomputed from it */
function netEvidenceControls(id){ const s=sigOf(id), n=s.network; if(!n) return '';
  const b=(lbl,fn,cls='btn-g')=>`<button class="btn ${cls} btn-sm" onclick="${fn}">${lbl}</button>`;
  const base=BUY[id].network, changed=n.recencyDays!==base.recencyDays||n.coverage!==base.coverage;
  const consent=s.consent==='available'?b('Buyer revokes consent',`A.consentSim('${id}','revoke')`):s.consent==='pending'?b('Buyer grants consent',`A.consentSim('${id}','grant')`)+b('Buyer declines',`A.consentSim('${id}','deny')`):b('Request consent',`A.consentSim('${id}','request')`,'btn-s');
  return `<div class="ns-ctl mt12"><div class="xs" style="font-weight:600;color:var(--strong)">Try it · simulate consent and evidence quality <span class="muted" style="font-weight:400">(each change is recorded as an event and the recommendation recomputes)</span></div><div class="row gap6 mt8 wrap">
   ${b(S.ctl.net?'Turn network participation off':'Turn network participation on','A.netToggle()',S.ctl.net?'btn-g':'btn-s')}${consent}
   ${s.networkDisputed?b('Close buyer review',`A.consentSim('${id}','resolve')`):s.consent==='available'?b('Buyer disputes the information',`A.consentSim('${id}','dispute')`):''}
   ${n.recencyDays<=POL.network.maxRecencyDays?b(`Signal goes stale (${POL.network.maxRecencyDays+15} days)`,`A.netQuality('${id}','stale')`):''}
   ${n.coverage>=POL.network.minCoverage?b(`Coverage drops to ${POL.network.minCoverage-2}`,`A.netQuality('${id}','coverage')`):''}
   ${changed?b('Restore signal',`A.netQuality('${id}','reset')`,'btn-s'):''}</div></div>`; }
A.netQuality=(id,k)=>{ const nm=BUY[id].name, meta=k==='stale'?{recencyDays:POL.network.maxRecencyDays+15}:k==='coverage'?{coverage:POL.network.minCoverage-2}:{reset:true};
  const r=recordEvent({type:'NETWORK_SIGNAL_UPDATED', buyerId:id, source:'Razorpay network (simulated)', actor:'Razorpay network', meta}); if(!r.ok) return;
  log({ic:'users',ti:`Network evidence changed · ${nm}`,de:k==='stale'?`Latest signal now ${meta.recencyDays} days old · older than ${POL.network.maxRecencyDays} days, so it is excluded`:k==='coverage'?`Only ${meta.coverage} participating distributors report this buyer · below the minimum of ${POL.network.minCoverage}, so it is excluded`:'Signal restored to the latest synthetic values',src:['net'],who:'Simulated · Razorpay network',chem:nm});
  rr(); toast('Network evidence changed · recommendation recalculated'); };
function netVsYou(id){ return netStory(id); }

/* ---------- Overview: the network in one card ---------- */
function guptaWhen(){ const m=sigOf('gupta').network&&sigOf('gupta').network.monthly, d=POL.network.adverseDeltaDays; const a=m&&firstSlowMonth(m.labels,m.net,d), b=m&&firstSlowMonth(m.labels,m.own,d);
  return a&&b?`Slowed with other distributors in ${MONTHS_FULL[a.label]}. Your ledger showed it in ${MONTHS_FULL[b.label]}.`:'Slowing with other distributors.'; }
function chawlaNext(){ const i=nextDueInv('chawla'), c=recOf('chawla'), d=i?RayDates.diffDays(i.due,S.today):null; const when=d==null?'':d===0?'today':d===1?'tomorrow':`on ${RayDates.fmtShort(i.due)}`;
  return `Moved to ${c.band}, limit held${i?`, early follow-up before ${when}’s ${inr(i.bal-(i.disputed||0))} ${collMethod('chawla').m} debit`:''}.`; }
function netOverviewCard(){
  if(!netOn()) return `<div class="card pad mt16 netbig"><div class="row between"><div class="row gap8"><span class="net-ic">${I('users',16,2.2)}</span><span class="h3">Razorpay network is off</span></div><button class="btn btn-s btn-sm" onclick="A.netToggle()">Turn on</button></div><div class="small muted mt8">RAY is using your data only, and every recommendation has been recalculated without network evidence. Turn on the network to include consented repayment signals from other distributors on Razorpay.</div></div>`;
  const st=pfStats(); const changed=RayData.FEATURED.map(b=>b.id).filter(id=>recOf(id).networkStep);
  const nl=recOf('newlife'), nlOwn=recAlt('newlife',false);
  const tile=(tag,name,t,s,cta,fn)=>`<div class="ntile"><span class="ntag">${tag}</span><b style="color:var(--strong);font-size:15px">${name}</b><div class="small mt4" style="color:var(--strong);font-weight:500">${t}</div><div class="xs muted mt4">${s}</div><button class="btn btn-s btn-sm mt12" onclick="${fn}">${cta}</button></div>`;
  const g=recOf('gupta'), gO=recAlt('gupta',false), c=recOf('chawla');
  const n=changed.length+(nl.networkStep?1:0);
  return `<div class="card mt16 netbig" id="ov-net" style="padding:0"><div class="sec-h" style="border-bottom:0"><div><div class="row gap8"><span class="net-ic">${I('users',16,2.2)}</span><span class="h2" style="font-size:20px">${n} recommendation${n===1?'':'s'} today ${n===1?'comes':'come'} from how your buyers pay other distributors</span></div><div class="small muted mt4">Razorpay sees repayment across participating distributors. Your own ledger only sees you. ${changed.length?`Network-adjusted: ${changed.map(id=>chem(id).name).join(', ')}${nl.networkStep?', New Life Stores':''}.`:''}</div></div><span class="xs muted" style="text-align:right;white-space:nowrap">${st.netSignals} of your ${st.buyers} buyers<br>have a usable network signal</span></div>
   <div class="ntiles">${g.networkStep?tile('EARLIER WARNING','Gupta Traders',guptaWhen(),`${inr(gO.recommendedLimit)} → ${inr(g.recommendedLimit)} · ${gO.recommendedTerms} → ${g.recommendedTerms} days from consented network evidence.`,'See comparison',"goSec('raahi/buyer/gupta','net')"):tile('EARLIER WARNING','Gupta Traders',esc(g.network.reason||'Network not used'),'Recommendation uses your data only.','View buyer',"go('raahi/buyer/gupta')")}
    ${c.networkStep?tile('HIDDEN RISK','Chawla Enterprises',`Looks reliable with you. Slipping with ${BUY.chawla.network.coverage} other distributors.`,chawlaNext(),'See why',"goSec('raahi/buyer/chawla','net')"):tile('HIDDEN RISK','Chawla Enterprises',esc(c.network.reason||'Network not used'),'Reliable on your data alone.','View buyer',"go('raahi/buyer/chawla')")}
    ${nl.networkStep?tile('DAY-ONE CREDIT','New Life Stores',`No history with you. Pays ${BUY.newlife.network.coverage} distributors in about ${BUY.newlife.network.avgDays} days (consented).`,`${inr(nl.recommendedLimit)} starting limit instead of ${inr(nlOwn.recommendedLimit)} from your data alone.`,'Review credit',"A.netNewLife()"):tile('DAY-ONE CREDIT','New Life Stores',`No history with you. ${NET_STATE_LABEL[sigOf('newlife').consent]||'Consent needed'} for a network check.`,`Starter ${inr(nlOwn.recommendedLimit)} · ${nlOwn.recommendedTerms} days until the buyer consents.`,sigOf('newlife').consent==='pending'?'View request':'Request consent',"A.netNewLife()")}</div>
   <div class="net-future"><span class="concept">Proposed capability</span><span>With consent, repayment behaviour across participating suppliers can enrich RAY's credit insights. Network signals here are synthetic. A production network needs participation, consent, privacy and legal review, potentially including credit-information regulation.</span></div>
   <div class="xs muted row gap4" style="padding:0 20px 16px">${I('lock',12)} ${NET_LINE}</div></div>`;
}
A.netNewLife=()=>{ if(!['result','approved'].includes(S.check.step)){ const c=sigOf('newlife').consent; S.check={step:!netOn()?'result':c==='available'?'result':c==='pending'?'waiting':'found',q:'03AANFN7781K1Z3',by:'GSTIN',who:'newlife',core:!netOn()||c!=='available'}; } goSec('raahi/check',S.check.step==='result'?'ncmp-newlife':'idq'); };
/* ---------- WhatsApp + mobile snippets ---------- */
function netMobile(id){
  const b=BUY[id]; if(!b||!b.network) return '';
  const r=recOf(id), own=recAlt(id,false), withN=recAlt(id,true), n=sigOf(id).network||{}, used=!!r.networkStep;
  return `<div class="mc mt8" style="border-color:#d9cff5;background:#faf8ff" id="mob-net-${id}"><div class="row between"><b class="mc-t">Your ledger vs network</b><span class="mb" style="background:#efeafb;color:#5b3fb8">${used?'NETWORK USED':'NOT USED'}</span></div>
   <div class="mline"><span>Your ledger only</span><b>${inr(own.recommendedLimit)} · ${own.recommendedTerms}d</b></div>
   <div class="mline"><span>With eligible network</span><b style="color:#5b3fb8">${withN.network.eligible?`${inr(withN.recommendedLimit)} · ${withN.recommendedTerms}d`:'Excluded'}</b></div>
   <div class="xs muted mt8">${withN.network.eligible?`${n.coverage} participating distributors${n.baseLow!=null?` · ${n.baseLow}–${n.baseHigh}d → ${n.nowLow}–${n.nowHigh}d`:''}`:esc(withN.network.reason)}${S.ctl.net?'':' · participation off'}. Synthetic data. ${NET_LINE}</div></div>`;
}
