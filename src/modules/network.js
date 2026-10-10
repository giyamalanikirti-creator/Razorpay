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
/* ---------- with you vs across the network (buyer profile) ---------- */
function netVsYou(id){
  if(!netOn()) return '';
  const r=recOf(id), n=BUY[id]&&BUY[id].network, s=sigOf(id);
  if(!n||!r.network.eligible){ return (id==='gupta'||id==='chawla')&&n?`<div class="card pad mt16" id="net"><div class="row gap8"><span class="net-ic">${I('users',16,2.2)}</span><span class="h3">Network signal not used for this buyer</span><span class="badge b-n">${esc(NET_STATE_LABEL[r.network.state]||'')}</span></div><div class="small muted mt8">${esc(r.network.reason)}. RAY is using your data only. ${NET_LINE}</div></div>`:''; }
  if(id==='gupta'){
    const ch=lineChart({labels:['Apr','May','Jun','Jul','Aug','Sep'],series:[{v:[12,12,12,17,19,27],c:'#7b5fd6',label:'Network',name:`Across ${n.coverage} distributors`,dy:-12},{v:[8,9,8,8,15,24],c:'#d47a1f',hl:[3,4,5],label:'With you',name:'With you',dy:13}],yMax:30,ticks:[0,10,20,30],fmt:v=>v+'d'});
    return `<div class="card pad netbig mt16" id="net"><div class="row between wrap gap8"><div class="row gap8"><span class="net-ic">${I('users',16,2.2)}</span><span class="h3">How Gupta Traders pays everyone, not just you</span></div>${netMark('Network saw it first')}</div>
     <div class="grid g2 mt16" style="gap:16px;align-items:stretch">
      <div class="nvs"><div class="nvs-col"><span class="xs muted" style="font-weight:600">With you</span><b class="num">${s.usual}d → ${s.delay}d</b><span class="xs muted">Slowed in September</span></div><div class="nvs-col net"><span class="xs" style="font-weight:600;color:#5b3fb8">Across ${n.coverage} distributors on Razorpay</span><b class="num">${n.baseLow}–${n.baseHigh}d → ${n.nowLow}–${n.nowHigh}d</b><span class="xs" style="color:#5b3fb8">Slowed in ${n.firstSlowed}</span></div>
       <div class="nvs-say">RAY saw the slowdown <b>about 5 weeks before</b> your own ledger did. Policy effect: ${esc(r.networkStep?r.networkStep.rule:'none')}.</div></div>
      <div><div class="row between"><span class="xs muted" style="font-weight:600">Typical days to pay (synthetic, aggregated)</span><span class="legend"><span><i style="background:#7b5fd6"></i>Network</span><span><i style="background:#d47a1f"></i>With you</span></span></div><div class="mt4">${ch}</div></div>
     </div>
     <div class="xs muted mt8 row gap4">${I('lock',12)} ${NET_LINE} Synthetic data in this prototype.</div></div>`;
  }
  if(id==='chawla') return `<div class="card pad netbig mt16" id="net"><div class="row between wrap gap8"><div class="row gap8"><span class="net-ic">${I('users',16,2.2)}</span><span class="h3">Looks reliable with you. Slipping with others.</span></div>${netMark('Caught by network')}</div>
     <div class="nvs mt16" style="grid-template-columns:1fr 1fr 1.4fr"><div class="nvs-col"><span class="xs muted" style="font-weight:600">With you</span><b class="num">${s.usual}d → ${s.delay}d</b><span class="xs muted">On time · no change</span></div><div class="nvs-col net"><span class="xs" style="font-weight:600;color:#5b3fb8">Across ${n.coverage} distributors on Razorpay</span><b class="num">${n.baseLow}–${n.baseHigh}d → ${n.nowLow}–${n.nowHigh}d</b><span class="xs" style="color:#5b3fb8">Slipping since ${n.firstSlowed}</span></div>
      <div class="nvs-say" style="grid-column:auto">Your ledger alone keeps Chawla Enterprises on ${recAlt('chawla',false).band}. ${r.networkStep?`The policy rule for uncorroborated network evidence moves it to <b>${r.band}</b>, holds the limit and asks for an early follow-up before tomorrow’s ₹27,600 eNACH debit.`:''}</div></div>
     <div class="mt12">${netCompare('chawla')}</div>
     <div class="xs muted mt8 row gap4">${I('lock',12)} ${NET_LINE} Synthetic data in this prototype.</div></div>`;
  return '';
}
/* ---------- Overview: the network in one card ---------- */
function netOverviewCard(){
  if(!netOn()) return `<div class="card pad mt16 netbig"><div class="row between"><div class="row gap8"><span class="net-ic">${I('users',16,2.2)}</span><span class="h3">Razorpay network is off</span></div><button class="btn btn-s btn-sm" onclick="A.netToggle()">Turn on</button></div><div class="small muted mt8">RAY is using your data only, and every recommendation has been recalculated without network evidence. Turn on the network to include consented repayment signals from other distributors on Razorpay.</div></div>`;
  const st=pfStats(); const changed=RayData.FEATURED.map(b=>b.id).filter(id=>recOf(id).networkStep);
  const nl=recOf('newlife'), nlOwn=recAlt('newlife',false);
  const tile=(tag,name,t,s,cta,fn)=>`<div class="ntile"><span class="ntag">${tag}</span><b style="color:var(--strong);font-size:15px">${name}</b><div class="small mt4" style="color:var(--strong);font-weight:500">${t}</div><div class="xs muted mt4">${s}</div><button class="btn btn-s btn-sm mt12" onclick="${fn}">${cta}</button></div>`;
  const g=recOf('gupta'), gO=recAlt('gupta',false), c=recOf('chawla');
  const n=changed.length+(nl.networkStep?1:0);
  return `<div class="card mt16 netbig" id="ov-net" style="padding:0"><div class="sec-h" style="border-bottom:0"><div><div class="row gap8"><span class="net-ic">${I('users',16,2.2)}</span><span class="h2" style="font-size:20px">${n} recommendation${n===1?'':'s'} today ${n===1?'comes':'come'} from how your buyers pay other distributors</span></div><div class="small muted mt4">Razorpay sees repayment across participating distributors. Your own ledger only sees you. ${changed.length?`Network-adjusted: ${changed.map(id=>chem(id).name).join(', ')}${nl.networkStep?', New Life Stores':''}.`:''}</div></div><span class="xs muted" style="text-align:right;white-space:nowrap">${st.netSignals} of your ${st.buyers} buyers<br>have a usable network signal</span></div>
   <div class="ntiles">${g.networkStep?tile('EARLIER WARNING','Gupta Traders',`Slowed with other distributors in ${BUY.gupta.network.firstSlowed}. Your ledger showed it in September.`,`${inr(gO.recommendedLimit)} → ${inr(g.recommendedLimit)} · ${gO.recommendedTerms} → ${g.recommendedTerms} days from consented network evidence.`,'See comparison',"goSec('raahi/buyer/gupta','net')"):tile('EARLIER WARNING','Gupta Traders',esc(g.network.reason||'Network not used'),'Recommendation uses your data only.','View buyer',"go('raahi/buyer/gupta')")}
    ${c.networkStep?tile('HIDDEN RISK','Chawla Enterprises',`Looks reliable with you. Slipping with ${BUY.chawla.network.coverage} other distributors.`,'Moved to Watch, limit held, early follow-up before tomorrow’s ₹27,600 eNACH debit.','See why',"goSec('raahi/buyer/chawla','net')"):tile('HIDDEN RISK','Chawla Enterprises',esc(c.network.reason||'Network not used'),'Reliable on your data alone.','View buyer',"go('raahi/buyer/chawla')")}
    ${nl.networkStep?tile('DAY-ONE CREDIT','New Life Stores',`No history with you. Pays ${BUY.newlife.network.coverage} distributors in about ${BUY.newlife.network.avgDays} days (consented).`,`${inr(nl.recommendedLimit)} starting limit instead of ${inr(nlOwn.recommendedLimit)} from your data alone.`,'Review credit',"A.netNewLife()"):tile('DAY-ONE CREDIT','New Life Stores',`No history with you. ${NET_STATE_LABEL[sigOf('newlife').consent]||'Consent needed'} for a network check.`,`Starter ${inr(nlOwn.recommendedLimit)} · ${nlOwn.recommendedTerms} days until the buyer consents.`,sigOf('newlife').consent==='pending'?'View request':'Request consent',"A.netNewLife()")}</div>
   <div class="net-future"><span class="concept">Proposed capability</span><span>With consent, repayment behaviour across participating suppliers can enrich RAY's credit insights. Network signals here are synthetic. A production network needs participation, consent, privacy and legal review, potentially including credit-information regulation.</span></div>
   <div class="xs muted row gap4" style="padding:0 20px 16px">${I('lock',12)} ${NET_LINE}</div></div>`;
}
A.netNewLife=()=>{ if(!['result','approved'].includes(S.check.step)){ const c=sigOf('newlife').consent; S.check={step:!netOn()?'result':c==='available'?'result':c==='pending'?'waiting':'found',q:'03AANFN7781K1Z3',by:'GSTIN',who:'newlife',core:!netOn()||c!=='available'}; } goSec('raahi/check',S.check.step==='result'?'ncmp-newlife':'idq'); };
/* ---------- WhatsApp + mobile snippets ---------- */
function netMobile(id){
  if(!netOn()) return '';
  const r=recOf(id), n=BUY[id]&&BUY[id].network, s=sigOf(id);
  if(id==='gupta'&&n&&r.network.eligible) return `<div class="mc mt8" style="border-color:#d9cff5;background:#faf8ff"><div class="row between"><b class="mc-t">How Gupta pays everyone</b><span class="mb" style="background:#efeafb;color:#5b3fb8">NETWORK</span></div><div class="mline"><span>With you</span><b>${s.usual}d → ${s.delay}d · Sep</b></div><div class="mline"><span>Across ${n.coverage} distributors</span><b style="color:#5b3fb8">${n.baseLow}–${n.baseHigh}d → ${n.nowLow}–${n.nowHigh}d · ${n.firstSlowed.slice(0,3)}</b></div><div class="mline"><span>Policy effect</span><b>${inr(recAlt(id,false).recommendedLimit)} → ${inr(r.recommendedLimit)}</b></div><div class="xs muted mt8">${NET_LINE}</div></div>`;
  return '';
}