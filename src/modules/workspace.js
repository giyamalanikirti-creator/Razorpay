/* ================= RAY CREDIT & COLLECTIONS · workspace ================= */
const blocked = () => S.paused || S.stale;
const draftCount = () => CHASE.filter(c=>S.chase[c.id].st==='draft').length;
const openCount = () => draftCount() + decisionsOpen() + reqOpen() + pendingMatches() + (typeof failCount==='function'?failCount():0) + (typeof kirS==='function'&&kirS().commit==='pending'?1:0);
const gBand = () => S.gupta.band;
function chemView(c){ if(!c) return c; const o=Object.assign({},c); const r=recOf(c.id);
  o.out=outOf(c.id); o.limit=curLimitOf(c.id)||c.limit; if(r) o.band=r.band;
  if(c.id==='newlife'&&!S.newLife){ o.unchecked=true; o.band='Unrated'; o.limit=0; }
  return o; }
function banners(){
  let h='';
  if(S.paused) h+=`<div class="banner paused mt16">${I('pause',18)}<div class="grow"><b style="color:var(--strong)">RAY is paused.</b> <span class="muted">No new actions will be taken. Existing payments continue normally.</span></div><button class="btn btn-s btn-sm" onclick="A.pauseToggle()">Resume RAY</button></div>`;
  if(S.stale) h+=`<div class="banner stale mt16" id="stale"><span style="color:var(--a)">${I('refresh',18)}</span><div class="grow"><b style="color:var(--strong)">Marg data last synced 31 hours ago.</b> <span class="muted">RAY has paused new reminders until the ledger is refreshed.</span></div><button class="btn btn-s btn-sm" onclick="A.sync(this)">Sync now</button></div>`;
  return h;
}
function pgRAY(tab,id){
  if(tab==='bank') return `<div class="page fadein">${bankPage(id)}</div>`;
  if(tab==='buyers') tab='portfolio'; if(tab==='chase') tab='actions';
  const body={overview:vOverview,request:()=>vRequest(id),payment:()=>vPayReview(id),collect:()=>vCollect(id),invoice:()=>vKirInvoice(),recover:()=>vRecover(id),portfolio:vPortfolio,buyer:()=>vProfile(id),check:vCheck,actions:vChase,activity:()=>id==='bank'?vBankFeed():vActivity(),controls:vControls}[tab]||vOverview;
  return `<div class="page fadein">${raahiHeader(tab)}${banners()}${body()}</div>`;
}

/* ---------- Broken promise alert ---------- */
function brokenAlert(compact){
  if(!S.gupta.alert) return '';
  const p=S.promises.filter(x=>x.buyerId==='gupta'&&x.status==='missed').slice(-1)[0], d=decOf('gupta'), r=recOf('gupta');
  const due=p&&p.later?p.later.date:null, still=p?balOf('gupta',p.inv):S.gupta.oldest;
  const prevBand=(d.hist.find(h=>h.status==='approved')||{to:{band:'Watch'}}).to.band||'Watch';
  return `<div class="alert risk mt20"><span class="ic">${I('alert',18)}</span><div class="grow">
   <div class="row between wrap gap8"><h4>Gupta Traders missed a payment promise</h4><span class="xs muted">${simDateLabel()}</span></div>
   <div class="row gap24 mt12 wrap">
    <div class="kv"><span class="k">Still outstanding</span><span class="v num">${inr(still)}</span></div>
    <div class="kv"><span class="k">Band now</span><span class="row gap6" style="height:28px">${prevBand!==r.band?bandBadge(prevBand)+I('arrowR',14,2):''}${bandBadge(r.band)}</span></div>
    <div class="kv grow"><span class="k">Recommendation</span><span style="font-weight:600;color:var(--strong);height:28px;display:flex;align-items:center">Future limit ${inr(S.gupta.limit)} → ${inr(r.recommendedLimit)} · ${r.recommendedTerms}-day terms</span></div>
   </div>
   <div class="mt12" style="padding:12px 14px;background:#fff;border:1px solid var(--border);border-radius:8px"><span class="xs muted" style="font-weight:500">Next order</span><div style="font-weight:600;color:var(--strong);margin-top:2px">Collect ${inr(still)} still due on INV-24891 before delivery.</div><div class="xs muted mt4">${I('lock',12)} Supply is never paused automatically.</div></div>
   ${compact?'':`<div class="xs muted mt12">${due?`Promise for ${RayDates.fmtDay(due)} recorded as missed. `:''}The policy re-ran on the new evidence; see “What changed since the last decision”.</div>`}
   <div class="row gap8 mt16">${compact?`<button class="btn btn-p btn-sm" onclick="go('raahi/buyer/gupta')">Review credit</button>`:`<button class="btn btn-p btn-sm" onclick="A.approveGupta()" ${blocked()?'disabled':''}>Set future limit to ${inr(r.recommendedLimit)}</button>`}<button class="btn btn-s btn-sm" onclick="A.keepLimit()">Keep current limit</button></div>
  </div></div>`;
}
/* ---------- Overview cards ---------- */
function lineChart({labels,series,yMax,ticks,fmt,baseline,h=190,unit=''}){
  const W=560,H=h,l=44,r=70,t=14,b=28,iw=W-l-r,ih=H-t-b;
  const x=i=>l+(labels.length===1?iw/2:i*iw/(labels.length-1)), y=v=>t+ih-(v/yMax)*ih;
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block">`;
  ticks.forEach(v=>{s+=`<line x1="${l}" x2="${W-r}" y1="${y(v)}" y2="${y(v)}" stroke="#eef0f2"/><text x="${l-8}" y="${y(v)+4}" text-anchor="end">${fmt(v)}</text>`});
  labels.forEach((lb,i)=>{s+=`<text x="${x(i)}" y="${H-8}" text-anchor="middle">${lb}</text>`});
  if(baseline){s+=`<rect x="${l}" y="${y(baseline.hi)}" width="${iw}" height="${y(baseline.lo)-y(baseline.hi)}" fill="#1aa36f" opacity=".07"/><line x1="${l}" x2="${W-r}" y1="${y(baseline.v)}" y2="${y(baseline.v)}" stroke="#1d8a63" stroke-dasharray="4 4" stroke-width="1.2"/><text x="${W-r+6}" y="${y(baseline.v)+4}" style="fill:#1d6b55;font-weight:500">${baseline.label}</text>`}
  series.forEach(se=>{const d=se.v.map((v,i)=>`${i?'L':'M'}${x(i)},${y(v)}`).join('');s+=`<path d="${d}" fill="none" stroke="${se.c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
   se.v.forEach((v,i)=>{ if(se.hl&&!se.hl.includes(i)) return; s+=`<circle cx="${x(i)}" cy="${y(v)}" r="4.5" fill="${se.c}" stroke="#fff" stroke-width="2"/>`});
   if(se.label){const i=se.v.length-1; s+=`<text x="${x(i)+10}" y="${y(se.v[i])+4+(se.dy||0)}" style="fill:#3b4247;font-weight:600">${se.label}</text>`}});
  labels.forEach((lb,i)=>{const tip=lb+' · '+series.map(se=>(se.name?se.name+' ':'')+fmt(se.v[i])+unit).join(' · '); s+=`<rect class="hit" data-tip="${tip}" x="${x(i)-iw/(labels.length*2)}" y="${t}" width="${iw/labels.length}" height="${ih}" fill="transparent"/>`});
  return `<div class="chart">${s}</svg><div class="tipc"></div></div>`;
}
hooks.push(()=>{document.querySelectorAll('.chart').forEach(ch=>{const tip=ch.querySelector('.tipc');ch.querySelectorAll('rect.hit').forEach(rc=>{rc.addEventListener('mouseenter',()=>{const b=rc.getBoundingClientRect(),cb=ch.getBoundingClientRect();tip.textContent=rc.dataset.tip;tip.style.left=(b.left-cb.left+b.width/2)+'px';tip.style.top=(30)+'px';tip.style.opacity=1});rc.addEventListener('mouseleave',()=>tip.style.opacity=0)})})});

/* ---------- Promise history + buyer activity ---------- */
function chemActivity(name){
  const items=S.act.filter(a=>a.chem===name||(a.ti||'').includes(name)).slice(0,6);
  if(!items.length) return '';
  return `<div class="card mt16"><div class="row between pad-s" style="border-bottom:1px solid var(--border-subtle)"><span class="h3">Activity</span><a class="link small" onclick="go('raahi/activity')">View all</a></div><div class="feed">${items.map(feedItem).join('')}</div></div>`;
}
/* ---------- Buyer profile · any buyer ---------- */
function vProfileGeneric(id){
  const c=chemView(chem(id)); if(!c) return '<div class="empty">Not found</div>';
  const back=`<div class="crumb mt20" style="margin-bottom:0"><a onclick="go('raahi/portfolio')">${I('arrowL',14,2)} Credit Portfolio</a></div>`;
  if(c.unchecked){ const r=recOf('newlife'); return `${back}<div class="card pad mt16" style="max-width:640px"><span class="lbl">Buyer profile</span><div class="row gap8 mt4"><span class="h1" style="font-size:24px">${c.name}</span><span class="badge b-n">New buyer · Unrated</span></div><div class="xs muted mt8">Network check: ${NET_STATE_LABEL[sigOf('newlife').consent]||'consent needed'}</div><p class="muted mt8">First order requested. RAY’s starter recommendation is ${inr(r.recommendedLimit)} on ${r.recommendedTerms}-day terms; a consented network check can change it. Not final until you approve.</p><button class="btn btn-p mt16" onclick="go('raahi/check')">Run credit check</button></div>${howPanel('newlife')}`; }
  const ids=IDS[c.id]||{}, ver=S.verified[c.id], gstBad=ids.gs==='Cancelled'||(BUY[c.id]&&BUY[c.id].gst==='cancelled'), on=netOn();
  const r=recOf(c.id), s=sigOf(c.id), p=pfView(c), lim=c.limit;
  const sk=src=>/network/i.test(src)?'net':/Razorpay/.test(src)?'rzp':/conversation/i.test(src)?'conv':/GST/.test(src)?'gst':'led';
  const pick=c.band==='Reliable'?['delay','onTime','promises','utilisation','streak','network']:null;
  let sig=(pick?r.signalContributions.filter(x=>pick.includes(x.key)&&(x.key!=='network'||r.network.eligible)):r.signalContributions.filter(x=>x.points>0||(x.key==='network'&&r.network.eligible)||x.key==='gst').sort((a,b)=>b.points-a.points))
    .map(x=>[x.label,`${x.observed}${x.points?` · ${x.points>0?'+':''}${x.points} pts`:x.key==='network'?' · '+x.effect:''}`,sk(x.source)]);
  if(on&&!r.network.eligible&&BUY[c.id]&&BUY[c.id].network) sig.push(['No network signal used for this buyer',r.network.reason,'none']);
  const srcN={led:['led','Own ledger'],rzp:['rzp','Razorpay payment history'],conv:['conv','Buyer conversations'],gst:['','GST public record'],net:['net','Razorpay network signal'],none:['','Not used']};
  const warn = gstBad ? (ver?`<div class="alert neutral mt16"><span class="ic">${I('check',17)}</span><div class="grow"><h4>GST status verified by you</h4><div class="muted small">GSTIN was cancelled on 12 Aug 2026. You confirmed the business is still operating. RAY re-checks GST status weekly.</div></div></div>`
      :`<div class="alert warn mt16"><span class="ic">${I('alert',17)}</span><div class="grow"><h4>GSTIN cancelled on 12 Aug 2026. Verify before extending further credit.</h4><div class="muted small">RAY has not blocked credit or supply. The policy holds ${c.name}’s limit until you verify.</div></div><button class="btn btn-s btn-sm" onclick="A.verifyId('${c.id}')">Mark GST status as verified</button></div>`) : '';
  const extra = c.id==='verma'&&!S.vermaMatched?unmatchedAlert():'';
  const noGst = !ids.gst&&!c.synthetic?`<div class="alert neutral mt16"><span class="ic">${I('info',17)}</span><div class="grow"><div style="color:var(--strong);font-weight:500">This buyer is not GST-registered. Credit recommendations use the remaining available ledger, payment and conversation signals.</div><div class="row gap12 mt8 wrap"><span class="src led">Own ledger</span><span class="src rzp">Razorpay payment history</span><span class="src conv">Buyer conversations</span></div></div></div>`:'';
  const synth = c.synthetic?`<div class="alert neutral mt16"><span class="ic">${I('info',17)}</span><div class="grow small"><b style="color:var(--strong)">Generated synthetic record.</b> <span class="muted">One of ${RayData.GENERATED.length} seeded background buyers. Evaluated by the same policy engine as the scenario buyers. No real merchant, phone number or GSTIN.</span></div></div>`:'';
  const ch=CHASE.find(x=>x.id===c.id), chOpen=ch&&S.chase[c.id].st==='draft';
  let say=r.recommendation;
  if(gstBad&&!ver) say=`Verify ${c.name}’s GST status before extending further credit. Current terms continue meanwhile.`;
  if(c.id==='arora'&&creq('arora')&&!S.req.arora&&r.action==='increase') say=`Raise the future limit to ${inr(r.recommendedLimit)} to cover the requested ₹80,000 order on ${r.recommendedTerms}-day terms.`;
  const rq=creq(c.id)&&!S.req[c.id];
  const lines=`<div class="kvline"><span>Future credit limit</span><b class="num">${p.rec?`${inr(p.rec)} <span class="xs muted" style="font-weight:500">from ${inr(lim)}</span>`:`${inr(r.recommendedLimit)} <span class="xs muted" style="font-weight:500">${r.recommendedLimit===lim?'no change':'decided'}</span>`}</b></div><div class="kvline"><span>Terms for new credit</span><b class="num">${r.recommendedTerms} days${r.recommendedTerms!==curTermsOf(c.id)?` <span class="xs muted" style="font-weight:500">from ${curTermsOf(c.id)}</span>`:''}</b></div><div class="kvline"><span>Next step</span><b>${p.next}</b></div><div class="kvline"><span>Confidence</span><b>${r.confidence}</b></div>`;
  let btns='';
  if(rq) btns=`<button class="btn btn-p" onclick="go('raahi/request/${c.id}')">Review credit request</button><button class="btn btn-g" onclick="toast('Saved for later')">Review later</button>`;
  else if(gstBad&&!ver) btns=`<button class="btn btn-p" onclick="A.verifyId('${c.id}')">Mark GST status as verified</button><button class="btn btn-g" onclick="toast('Saved for later')">Review later</button>`;
  else if(p.rec||(r.action==='terms'&&(decOf(c.id).status==='baseline'||recChanged(c.id)))) btns=`<button class="btn btn-p" onclick="A.setLimit('${c.id}')" ${blocked()?'disabled':''}>${p.rec?`Set future limit to ${inr(p.rec)}`:`Apply ${r.recommendedTerms}-day terms`}</button><button class="btn btn-s" onclick="A.keepLimitG('${c.id}')">Keep current ${p.rec?'limit':'terms'}</button><button class="btn btn-g" onclick="toast('Saved for later')">Review later</button>`;
  else if(chOpen) btns=`<button class="btn btn-p" onclick="A.actOn('${c.id}')">${ctaLabel(ch)}</button><button class="btn btn-g" onclick="toast('Saved for later')">Review later</button>`;
  return `${back}${warn}${extra}${synth}
  <div class="card pad mt16"><span class="lbl">Buyer profile</span><div class="row gap8 mt4"><span class="h1" style="font-size:24px">${c.name}</span>${bandBadge(c.band)}${c.isNew?'<span class="pill-new">New</span>':''}</div><div class="muted mt4">Customer since ${c.since} · ${c.area}, Ludhiana</div>
   <div class="row gap24 mt20" style="align-items:stretch"><div class="kv"><span class="k">Outstanding</span><span class="v num">${inr(c.out)}</span>${bankAdj(c.id)?`<span class="xs" style="color:var(--g);font-weight:500">${inr(bankAdj(c.id))} matched from bank feed</span>`:''}</div><div class="vdiv"></div><div class="kv"><span class="k">Current limit</span><span class="v num">${inr(lim)}</span></div><div class="vdiv"></div><div class="kv"><span class="k">Recommended future limit</span><span class="v num" style="${p.rec?'color:var(--link)':''}">${p.rec?inr(p.rec):'No change'}</span></div><div class="vdiv"></div><div class="kv"><span class="k">Avg. days to pay</span><span class="v num">${s.delay} days</span></div><div class="vdiv"></div><div class="kv"><span class="k">Collection method</span><span style="height:28px;display:flex;align-items:center">${methodChip(c.id)}</span>${collMethod(c.id).max?`<span class="xs muted">Up to ${inr(collMethod(c.id).max)}</span>`:''}</div>${on?`<div class="vdiv"></div><div class="kv"><span class="k">Razorpay network signal</span><span style="height:28px;display:flex;align-items:center">${netBadge(p.net)}</span></div>`:''}</div></div>
  ${noGst}
  ${netVsYou(c.id)}
  ${whatChangedCard(c.id)}
  ${FAILS[c.id]?`<div class="alert ${failOpen(c.id)?'risk':'neutral'} mt16"><span class="ic">${I('alert',17)}</span><div class="grow"><div class="row gap8 wrap">${stage('RECOVER')}<h4>${FAILS[c.id].m} debit failed on ${FAILS[c.id].on.split(' · ')[0]} · ${inr(FAILS[c.id].amt)}</h4></div><div class="small muted mt4">${FAILS[c.id].reason}. ${failOpen(c.id)?FAILS[c.id].rec:recStatus(c.id).replace(/<[^>]+>/g,'')}</div></div><button class="btn btn-s btn-sm" onclick="go('raahi/recover/${c.id}')">${failOpen(c.id)?'Review retry':'View'}</button></div>`:''}
  <div class="grid g-21 mt16"><div class="card pad"><div class="row between"><span class="h2" style="font-size:18px">${c.band==='Reliable'&&!gstBad?'Repayment behaviour':'Why RAY is concerned'}</span><span class="ai-tag">${clover(14)} RAY</span></div><div class="mt16">${sig.map((x,i)=>`<div class="signal"><span class="n" style="${c.band==='Reliable'&&!gstBad?'background:var(--g-bg);color:var(--g)':''}${x[2]==='gst'?';background:var(--r-bg);color:var(--r)':''}">${i+1}</span><div class="grow"><h5>${x[0]}</h5><div class="small muted mt4">${esc(x[1])}</div></div><span class="src ${srcN[x[2]][0]}">${srcN[x[2]][1]}</span></div>`).join('')}</div></div>
   <div class="card pad rec"><span class="lbl">Recommended</span><div class="say mt12">${say}</div>${p.rec&&p.rec<lim?overLimitNote(c.out,p.rec):''}<div class="mt16">${lines}</div>${btns?`<div class="row gap8 mt20 wrap">${btns}</div>`:''}<div class="xs muted mt12 row gap4">${I('lock',12)} RAY never changes a limit or pauses supply without your approval.</div></div></div>
  ${howPanel(c.id)}
  ${c.id==='guptak'?`<div class="alert info mt16"><span class="ic">${I('receipt',17)}</span><div class="grow"><h4>INV-2048 · ${inr(balOf('guptak','INV-2048'))} · ${Math.max(0,RayDates.diffDays(S.today,'2026-10-02'))} days overdue</h4><div class="small muted">${kirS().kind?COMMIT_ST[kirS().commit]+' · '+PAY_ST[kirS().pay]:'RAY recommends a payment link with a payment-plan option.'}</div></div><button class="btn btn-p btn-sm" onclick="go('raahi/invoice/INV-2048')">Open invoice</button></div>`:''}
  ${PLAN[c.id]?`<div class="mt16">${planCard(c.id)}</div>`:''}
  ${invTable(c.id)}
  ${outcomeCard(c.id)}
  ${interpCard(c.id)}
  ${c.synthetic?'':`<div class="card pad mt16"><div class="row between"><span class="h3">Business identity</span><span class="xs muted">Identity input, never a credit score</span></div>${identityInset(c.id)}</div>`}
  ${chemActivity(c.name)}`;
}
function unmatchedAlert(){
  return `<div class="alert warn mt16"><span class="ic">${I('pause',17)}</span><div class="grow"><div class="row gap8"><span class="badge b-a">REMINDER PAUSED</span><span class="xs muted">Verma Retail · ₹26,500 due today</span></div><div class="small mt8" style="color:var(--strong)">We found a recent ₹26,500 credit that may belong to Verma Retail. Confirm it before sending a reminder.</div><div class="xs muted mt4">Checked: Razorpay payments · bank feed · unidentified credits · salesperson collections</div></div><button class="btn btn-p btn-sm" onclick="go('raahi/payment/verma')">Review payment</button><button class="btn btn-s btn-sm" onclick="A.sendAnyway('verma')">Send reminder anyway</button></div>`;
}

/* ---------- New buyer check ---------- */
const ID_EX=['03AANFN7781K1Z3','Gupta Traders','98XXXX4410'];
function vCheck(){
  const c=S.check, st=c.step;
  const found = st!=='input' && st!=='looking';
  const known = st==='known';
  return `<div class="crumb mt20" style="margin-bottom:0"><a onclick="go('raahi/portfolio')">${I('arrowL',14,2)} Credit Portfolio</a></div>
  <div style="max-width:1000px">
  ${pageHead('Check a new buyer','Get a recommended credit limit and terms before the first order.')}
  <div class="card pad mt20"><div class="field"><label>Enter buyer’s GSTIN, business name or phone</label><div class="row gap8"><input class="input" id="idq" style="max-width:380px;font-variant-numeric:tabular-nums;letter-spacing:.03em" placeholder="${ID_EX[0]}" value="${esc(c.q||'')}" ${found?'disabled':''} onkeydown="if(event.key==='Enter')A.lookup()"><button class="btn btn-p" onclick="A.lookup()" ${found?'disabled':''}>Check buyer</button>${found?`<button class="btn btn-g" onclick="S.check={step:'input',q:''};rr()">New search</button>`:''}</div><span class="xs muted">Use whichever identifier you have, for example 03ABCDE1234F1Z5, Gupta Traders or 98XXXX4410. RAY looks up public GST records first. The optional network check needs the buyer’s consent.</span></div>
   ${st==='looking'?`<div class="mt16">${thinking('Looking up GST records…')}</div>`:''}
   ${found?`<div class="mt20">${identityInset(c.who,{title:true,by:c.by})}</div>`:''}
  </div>
  ${known?`<div class="alert info mt16"><span class="ic">${I('user',17)}</span><div class="grow"><h4>${chem(c.who).name} is already your buyer</h4><div class="small muted">RAY already tracks its repayment behaviour. Open the profile for its band, limit and signals.</div></div><button class="btn btn-p btn-sm" onclick="go('raahi/buyer/${c.who}')">View profile</button></div>`:''}
  ${found&&!known?consentBlock():''}
  ${['result','approved'].includes(st)?checkResult():''}
  </div>`;
}
hooks.push(r=>{ clearInterval(window._phT); if(r==='raahi/check'){ let i=0; window._phT=setInterval(()=>{const el=document.getElementById('idq'); if(!el||el.disabled){return} i=(i+1)%ID_EX.length; el.placeholder=ID_EX[i];},1800);} });
function consentBlock(){
  const st=S.check.step, c=sigOf('newlife').consent;
  if(S.check.core&&!['found','waiting'].includes(st)) return c==='denied'?`<div class="row gap8 mt16"><span class="badge b-n">${I('ban',11,2.4)} New Life Stores declined consent · network not used</span><button class="btn btn-g btn-sm" onclick="A.consentSim('newlife','request');S.check.step='waiting';rr()">Ask again</button></div>`:!netOn()?`<div class="row gap8 mt16"><span class="badge b-n">Razorpay network is off · your data only</span></div>`:'';
  if(st==='found') return `<div class="card pad mt16"><div class="row gap12"><span class="badge b-a">${I('lock',11,2.4)} Consent required</span>${S.check.declined?'<span class="xs muted">Previously declined or revoked</span>':''}</div><p class="mt12" style="font-size:15px;color:var(--strong)">New Life Stores has no history with you. With its consent, RAY can use how it repays other distributors on Razorpay (aggregated, synthetic in this prototype) to recommend a starting limit.</p><p class="small muted mt8">We’ll send a consent request on WhatsApp to its registered number (98••••7731). It can decline or withdraw anytime. Without it, RAY recommends the ${inr(POL.newBuyer.starter)} starter limit from GST and order data.</p><div class="row gap8 mt16"><button class="btn btn-p" onclick="A.sendConsent()">Send consent request</button><button class="btn btn-g" onclick="S.check.step='result';S.check.core=true;rr()">Continue with my data only</button></div></div>`;
  if(st==='waiting') return `<div class="card pad mt16"><div class="row gap12"><span class="badge b-a">${I('clock',11,2.4)} Consent pending</span><span class="xs muted">Sent ${S.check.sentAt||'just now'} on WhatsApp</span></div><div class="mt12">${thinking('Waiting for New Life Stores to respond…')}</div><div class="row gap8 mt12 wrap"><span class="xs muted">Prototype: the buyer’s reply is simulated.</span><button class="btn btn-s btn-sm" onclick="A.consentReply(true)">Simulate: buyer accepts</button><button class="btn btn-g btn-sm" onclick="A.consentReply(false)">Simulate: buyer declines</button></div></div>`;
  if(st==='analysing') return `<div class="card pad mt16"><div class="row gap12"><span class="badge ${S.check.core?'b-n':'b-g'}">${S.check.core?'Consent declined':I('check',11,2.6)+' Consent approved via WhatsApp'}</span></div><div class="mt16">${thinking(S.check.core?'Calculating a starter recommendation from your data…':'Applying consented network evidence…')}</div></div>`;
  return c==='available'?`<div class="row gap8 mt16"><span class="badge b-g">${I('check',11,2.6)} Consent approved via WhatsApp</span><button class="btn btn-g btn-sm" onclick="A.consentSim('newlife','revoke')">Simulate: buyer revokes consent</button></div>`:'';
}
function checkResult(){
  const ap=S.check.step==='approved', r=recOf('newlife'), L=nlLimit(), T=nlTerms(), core=!r.networkStep;
  const sig=r.signalContributions.map(x=>[x.label, x.observed+(x.effect?' · '+x.effect:''), x.key==='network'?'net':x.key==='gst'?'':'led', x.source]);
  sig.push(['Requested order fits typical first orders','₹42,000 first order vs ₹35,000 to ₹60,000 for similar new buyers','led','Own ledger']);
  return `<div class="card pad mt12 fadein ai-wash"><div class="row between"><div class="row gap8"><span class="h2">New Life Stores</span>${core?'<span class="badge b-n">NEW BUYER · STARTER LIMIT</span>':bandBadge(r.band,true)}</div><span class="ai-tag">${clover(15)} RAY</span></div>
   <div class="row gap24 mt20" style="align-items:stretch"><div class="kv"><span class="k">Recommended credit limit</span><span class="v num" style="font-size:28px">${inr(L)}</span>${S.check.edited?`<span class="xs muted">Edited by you · RAY: ${inr(r.recommendedLimit)}</span>`:''}</div><div class="vdiv"></div><div class="kv"><span class="k">Recommended terms</span><span class="v num" style="font-size:28px">${T} days</span></div><div class="vdiv"></div><div class="kv"><span class="k">Confidence</span><span class="v" style="font-size:20px">${r.confidence}</span></div></div>
   <div class="mt20"><div class="lbl">Why RAY recommends this</div>
    ${sig.map((x,i)=>`<div class="signal"><span class="n" style="background:var(--g-bg);color:var(--g)">${i+1}</span><div class="grow"><h5>${x[0]}</h5><div class="small muted mt4">${esc(x[1])}</div></div><span class="src ${x[2]}">${x[3]}</span></div>`).join('')}</div>
   <div class="mt16">${netCompare('newlife')}</div>
   <div class="alert neutral mt16" style="padding:12px 14px"><span class="ic" style="width:28px;height:28px">${I('shield',15)}</span><div class="small grow"><b style="color:var(--strong)">Illustrative policy, not a formal credit score.</b> <span class="muted">Credit bureau data is not used.</span></div></div>
   ${ap?`<div class="alert ok mt16"><span class="ic">${I('check',17,2.4)}</span><div class="grow"><h4>Credit terms approved</h4><div class="small muted">${inr(S.check.limit)} · ${S.check.terms} days · added to Marg ERP and your Credit Portfolio.</div></div><button class="btn btn-s btn-sm" onclick="S.cf.band='All';go('raahi/portfolio')">View in Credit Portfolio</button></div>`
     :`<div class="row gap8 mt20"><button class="btn btn-p" onclick="A.approveTerms()" ${blocked()?'disabled':''}>Extend ${inr(L)} credit</button><button class="btn btn-s" onclick="A.editTerms()">Edit</button><button class="btn btn-g" onclick="toast('Saved for later')">Review later</button></div>`}
  </div>${howPanel('newlife')}`;
}
/* ---------- ACTIONS (execution layer) ---------- */
const SP = ['Rakesh Sharma','Suresh Kumar'];
const GATE_SHORT={dnc:'Do not contact',frequency:'Weekly limit reached',channel:'Channel off',paid:'Nothing due',claim:'Claim to reconcile',unmatched:'Review payment first',dispute:'In dispute',stale:'Ledger stale',paused:'RAY paused'};
function ctaLabel(c){ return c.kind==='Early follow-up'?'Start early follow-up':c.kind==='Collect before supply'?'Collect on delivery':c.ch==='sm'?'Assign to salesperson':'Send reminder'; }
function chaseStatus(c){
  const st=S.chase[c.id], s=st.st;
  if(s==='sent') return `<span class="state-line" style="color:var(--g)">${I('check',15,2.4)} ${c.kind==='Early follow-up'?'Follow-up sent':'Sent'}${st.at?' '+st.at:''}</span>`;
  if(s==='assigned') return `<span class="state-line" style="color:var(--g)">${I('user',15,2)} Assigned to ${(S.chaseTo[c.id]||'salesperson').split(' ')[0]}</span>`;
  if(s==='skipped') return `<span class="state-line muted">${I('x',14,2)} Dismissed <a class="small" onclick="event.stopPropagation();A.chaseSet('${c.id}','draft')">Undo</a></span>`;
  if(s==='held') return `<span class="badge b-a">${I('pause',11,2.4)} Reminder paused</span>`;
  if(s==='scheduled') return `<span class="state-line" style="color:var(--link)">${I('clock',15,2)} Scheduled ${st.at||'10:00 AM'}</span>`;
  if(s==='queued') return `<span class="state-line" style="color:#9a5b00">${I('clock',15,2)} Queued · quiet hours until ${st.at}</span>`;
  if(s==='matched') return `<span class="state-line" style="color:var(--g)">${I('check',15,2.4)} Paid · matched</span>`;
  if(s==='paidbank') return `<span class="state-line" style="color:var(--g)">${I('bank',15,2)} Paid · found in bank feed</span>`;
  const g=c.ch==='wa'?gateFor(c.id,'whatsapp',chaseInv(c.id)):gateFor(c.id,'salesperson');
  if(g.action==='block'&&!['paused','stale'].includes(g.code)) return `<span class="badge b-n" title="${esc(gateNote(g))}">${I('ban',11,2.4)} ${GATE_SHORT[g.code]||'Blocked'}</span>`;
  return `<button class="btn ${c.kind==='Early follow-up'?'btn-p':'btn-s'} btn-sm" onclick="event.stopPropagation();A.approveOne('${c.id}')" ${blocked()?'disabled':''}>${ctaLabel(c)}</button>`;
}
function chaseBody(c){
  const st=S.chase[c.id], ch=chem(c.id), sm=c.ch==='sm';
  if(st.st==='held') return `<div style="grid-column:1/-1">${unmatchedAlert().replace('mt16','')}</div>`;
  if(st.st==='matched') return `<div style="grid-column:1/-1" class="small muted">₹26,500 matched to INV-24655. No reminder needed. Verma Retail is paid up for this week.</div>`;
  const left = sm ? `<div class="small muted" style="font-weight:500;margin-bottom:6px">Task for salesperson</div><div style="padding:14px 16px;border:1px solid var(--border);border-radius:10px;background:#fbfbfc"><div class="row gap8">${I('truck',16)}<b style="color:var(--strong)">Salesperson visit</b><span class="xs muted">· ${ch.area} route · ${c.kind==='Collect before supply'?'next delivery':'today'}</span></div><div class="mt8" style="color:var(--strong)">${c.note}</div>${st.st==='assigned'?`<div class="xs muted mt8">Assigned to ${S.chaseTo[c.id]} · Salesperson</div>`:''}</div>`
   : st.editing ? `<div class="small muted" style="font-weight:500;margin-bottom:6px">Edit message</div><textarea class="textarea" id="ed-${c.id}" rows="4">${esc(st.msg)}</textarea><div class="row gap8 mt8"><button class="btn btn-p btn-sm" onclick="A.saveEdit('${c.id}')">Save</button><button class="btn btn-g btn-sm" onclick="S.chase['${c.id}'].editing=false;render()">Cancel</button></div>`
   : `<div class="small muted" style="font-weight:500;margin-bottom:6px">Draft WhatsApp message · sent via RAY after you approve</div><div class="wa-preview"><div class="wa-bubble">${esc(st.msg)}<span class="lnk">${LINK(c.id)}</span><span class="meta">${st.st==='sent'?(st.at||'9:14 AM')+' ✓✓':'Draft'}</span></div>${c.id==='gupta'&&S.gupta.promise?`<div class="wa-bubble in mt8">Aadha abhi bhej raha hoon, baaki Monday pakka.<span class="meta">9:21 AM</span></div>`:''}</div>`;
  const why = `<div class="small muted" style="font-weight:500;margin-bottom:6px">Why now</div><div style="color:var(--strong);font-weight:500">${c.reason}</div>${c.id==='sharma'?'<div class="small muted mt4">₹1.2L instalment of INV-24117 agreed for this week.</div>':''}
   <div class="small muted mt8">${ch.band==='Reliable'?'Reliable buyer, friendly routine tone.':ch.band==='Watch'?'Watch: polite, specific, no pressure.':'Risky: in-person conversation, no threats.'} ${c.ch==='wa'?'Payment link included.':''}</div>
   <div class="row gap8 mt8 wrap"><span class="src led">Own ledger</span><span class="src rzp">Razorpay payment history</span>${c.net&&netOn()?'<span class="src net">Razorpay network signal</span>':''}${c.risk?'<span class="src conv">Buyer conversations</span>':''}</div>
   ${st.st==='draft'?(()=>{ const g=sm?gateFor(c.id,'salesperson'):gateFor(c.id,'whatsapp',chaseInv(c.id)); return g.action!=='send'?`<div class="small mt8" style="color:${g.action==='queue'?'#9a5b00':'var(--r)'};font-weight:500">${I(g.action==='queue'?'clock':'ban',13,2)} ${esc(gateNote(g))}</div>`:''; })():''}
   ${c.id==='gupta'&&S.gupta.promise&&!['saved','paid','broken'].includes(S.gupta.promise)?`<button class="btn btn-s btn-sm mt12" onclick="go('raahi/activity')">${clover(14)} See how RAY read the reply</button>`:''}
   ${st.st==='draft'?`<div class="row gap8 mt16 wrap">${sm?'':`<button class="btn btn-s btn-sm" onclick="S.chase['${c.id}'].editing=true;render()">${I('edit',14)} Edit message</button>`}<button class="btn btn-g btn-sm" onclick="A.chaseSet('${c.id}','skipped')">Dismiss</button><button class="btn btn-g btn-sm" onclick="S.chase['${c.id}'].open=false;rr();toast('Saved for later')">Review later</button><button class="btn btn-p btn-sm" onclick="A.approveOne('${c.id}')" ${blocked()?'disabled':''}>${ctaLabel(c)}</button></div>`:''}`;
  return `<div>${left}</div><div>${why}</div>`;
}
function chaseRow(c,i){ const ch=chemView(chem(c.id)), st=S.chase[c.id]; return `<div class="chase" id="chase-${c.id}">
   <div class="chase-h" onclick="S.chase['${c.id}'].open=!S.chase['${c.id}'].open;render()"><span class="rank">${i+1}</span>
    <div><div class="row gap8"><span class="nm" style="font-weight:600;color:var(--strong)">${ch.name}</span>${bandBadge(ch.band)}</div><div class="xs muted mt4">${ch.area}</div></div>
    <div class="num" style="font-weight:600;color:var(--strong);font-size:15px">${inr(c.amt)}</div>
    <div class="small" style="color:var(--text)"><span class="kind k-${(c.kind||'').split(' ')[0].toLowerCase()}">${c.kind||''}</span> ${c.reason}</div>
    <div><span class="chan"><span class="cdot ${c.ch==='wa'?'wa':'sm'}">${I(c.ch==='wa'?'chat':'truck',12,2.2)}</span>${c.ch==='wa'?'WhatsApp':'Salesperson visit'}</span></div>
    <div class="row gap8">${st.open&&st.st==='draft'?'':chaseStatus(c)}<span style="color:var(--faint);transform:rotate(${st.open?180:0}deg);transition:transform .15s">${I('down',16,2)}</span></div></div>
   ${st.open?`<div class="chase-b">${chaseBody(c)}</div>`:''}</div>`; }
function aRow(i,{id,name,band,area,amt,kind,kc,reason,chan,chanIc,right}){ return `<div class="chase" ${id?`id="${id}"`:''}><div class="chase-h" style="cursor:default"><span class="rank">${i+1}</span>
   <div><div class="row gap8"><span class="nm" style="font-weight:600;color:var(--strong)">${name}</span>${band?bandBadge(band):''}</div><div class="xs muted mt4">${area||''}</div></div>
   <div class="num" style="font-weight:600;color:var(--strong);font-size:15px">${amt}</div>
   <div class="small" style="color:var(--text)"><span class="kind ${kc||''}">${kind}</span> ${reason}</div>
   <div><span class="chan"><span class="cdot sm">${I(chanIc,12,2.2)}</span>${chan}</span></div>
   <div class="row gap8">${right}</div></div></div>`; }
const doneLine = t => `<span class="state-line" style="color:var(--g)">${I('check',15,2.4)} ${t}</span>`;
function creditActionRows(){
  const g=S.gupta, ck=['result','approved'].includes(S.check.step);
  return [
   ...CREQ.map((r,k)=>{const c=chemView(chem(r.id)), d=S.req[r.id]; return aRow(k,{id:'act-req-'+r.id,name:c.name,band:c.band,area:reqSrc(),amt:inr(r.amt),kind:'Credit request',kc:'k-credit',reason:(v=>`${v.verdict==='EXTEND'?'Extend':v.verdict==='REVIEW TERMS'?'Review terms':'Do not extend yet'} · ${(v.reasons[0]||'').toLowerCase()}`)(reqV(r)),chan:'WhatsApp request',chanIc:'chat',right:d?doneLine(REQ_DONE[d]):`<button class="btn btn-s btn-sm" onclick="go('raahi/request/${r.id}')">Review decision</button>`});}),
   aRow(3,{name:'New Life Stores',band:ck?'Reliable':null,area:ck?'New buyer · checked':'New buyer · Unrated',amt:inr(nlLimit()),kind:'New credit',kc:'k-credit',reason:ck?`Credit check complete · ${inr(nlLimit())} on ${nlTerms()}-day terms`:`Starter ${inr(recOf('newlife').recommendedLimit)} · ${recOf('newlife').recommendedTerms} days · network check needs consent · not final until you approve`,chan:'Credit decision',chanIc:'shield',
     right:S.newLife?doneLine('Credit terms approved'):`<button class="btn btn-s btn-sm" onclick="go('raahi/check')">${ck?'Review credit terms':'Run credit check'}</button>`}),
  ].join('');
}
function matchRows(){
  const b=S.bank, rows=[];
  ['verma','lifeline','goyal','citycare'].forEach(pid=>{ const p=PAYREV[pid], c=chemView(chem(pid)), st=prS(pid), done=!prPending(pid);
    const kind=done?'Reviewed':pid==='verma'?'Reminder paused':pid==='citycare'?'Cheque recorded':'Payment not confirmed';
    const why=done?(st.st?PR_ST[st.st]:'Matched to Razorpay payment'):pid==='verma'?'A recent ₹26,500 Razorpay credit may already cover this':pid==='citycare'?'Salesperson recorded a ₹42,000 cheque on 3 Oct · not yet in the bank':`${p.dueTxt} · confirm payment before sending a reminder`;
    rows.push(aRow(rows.length,{id:'act-pr-'+pid,name:c.name,band:c.band,area:p.inv,amt:inr(p.amt),kind,kc:done?'k-credit':'k-held',reason:why,chan:'Reconciliation',chanIc:'match',right:done?doneLine(st.st?PR_ST[st.st]:'Matched')+`<button class="btn btn-g btn-sm" onclick="go('raahi/payment/${pid}')">View</button>`:`<button class="btn btn-p btn-sm" onclick="go('raahi/payment/${pid}')">Review payment</button>`})); });
  if(!b.ever) rows.push(aRow(rows.length,{name:'3 possible payments',area:'Outside Razorpay',amt:'₹75,600',kind:'Bank account',kc:'k-held',reason:'Buyers may have paid by UPI apps, NEFT or cheque into your bank. Connect your business bank account to confirm.',chan:'Bank account',chanIc:'bank',right:`<button class="btn btn-s btn-sm" onclick="A.bankStart()">Connect bank account</button>`}));
  else ['r3','r5','r4'].forEach((rid,i)=>{ const r=b.rows.find(x=>x.id===rid); const who=r.to?chem(r.to).name:'Unknown payer';
    rows.push(aRow(rows.length,{name:r.st==='matched'?chem(r.to).name:who,area:r.payer,amt:inr(r.amt),kind:r.st==='suggested'?'Suggested match':r.st==='matched'?'Matched':r.st==='notrecv'?'Excluded':'Unmatched credit',kc:r.st==='matched'?'k-credit':'k-held',reason:r.st==='suggested'?`${r.payer} · ${r.ref} · likely ${r.inv}`:r.st==='matched'?`${r.inv} · RAY will recognise this payer next time`:r.st==='notrecv'?'Marked as not a buyer payment':`${r.payer} · ${r.ref} · no confident match yet`,chan:'Bank account',chanIc:'bank',
     right:r.st==='suggested'?`<button class="btn btn-p btn-sm" onclick="A.bankSuggest('${rid}')" ${b.st==='on'?'':'disabled'}>Confirm payment match</button>`:r.st==='unid'?`<button class="btn btn-s btn-sm" onclick="A.bankAssign('${rid}')">Review payment</button>`:doneLine(r.st==='matched'?'Matched':'Excluded')})); });
  return rows.join('');
}
function vChase(){
  const n=bulkCounts();
  const early=CHASE.filter(c=>['Early follow-up','Promise due'].includes(c.kind)), up=CHASE.filter(c=>['Salesperson visit','Due reminder'].includes(c.kind)), missed=CHASE.filter(c=>c.kind==='Collect before supply');
  const grp=(id,st,t,s,cnt,body)=>`<div class="grp-h" id="${id}"><div class="row gap8">${stage(st)}<span class="h3">${t}</span>${cnt?`<span class="tcount">${cnt}</span>`:''}</div><div class="small muted mt4">${s}</div></div>${body}`;
  const openIn=a=>a.filter(c=>S.chase[c.id].st==='draft').length, prN=['verma','lifeline','goyal','citycare'].filter(prPending).length;
  const autoN=Object.keys(UPCOMING).filter(id=>!['received','paidbank'].includes(collSt(id))).length;
  return `${pageHead('Actions','Credit decisions, collections and payment reviews across your buyers',`<div class="col gap4" style="align-items:flex-end"><button class="btn btn-p" onclick="A.approveAll()" ${n.wa&&!blocked()?'':'disabled'} id="approve-all">Review &amp; send ${n.wa} reminder${n.wa===1?'':'s'}</button><span class="xs muted">${n.wa} ready to send${n.held?` · ${n.held} not included (payment review or your controls)`:''}</span></div>`)}
  <div class="row gap12 mt8 small muted"><span>Credit decision → collection → recovery → reconciliation</span><span class="faint">·</span><span class="row gap4">${I('lock',12)} Nothing is sent or changed until you approve</span></div>
  ${preSendChecks()}
  ${S.outbox.some(o=>['scheduled','queued'].includes(o.status))?`<div class="banner mt12" style="background:#f4f8ff;border-color:#d6e4fd">${I('clock',18)}<div class="grow small"><b style="color:var(--strong)">${S.outbox.filter(o=>['scheduled','queued'].includes(o.status)).length} message(s) waiting to send.</b> <span class="muted">Demo clock ${simDateLabel()}, ${nowLabel()} IST. Controls are checked again when they go out.</span></div><button class="btn btn-s btn-sm" onclick="A.advanceToMs(Math.min(...S.outbox.filter(o=>['scheduled','queued'].includes(o.status)).map(o=>o.sendAt)))">Prototype: advance clock to send time</button></div>`:''}
  ${grp('grp-credit','APPROVE','Credit Decisions','Incoming buyer requests and new credit decisions. Every recommendation shows its reasons.',reqOpen()+(S.newLife?0:1),creditActionRows())}
  ${grp('grp-upcoming','COLLECT','Upcoming Collections','Automatic collections within authorised mandates, manual collections due this week, and payment commitments you confirmed.',autoN+openIn(up),upcomingRows()+up.map((c,k)=>chaseRow(c,k+Object.keys(UPCOMING).length)).join('')+commitRows(Object.keys(UPCOMING).length+up.length))}
  ${grp('grp-failed','RECOVER','Failed Collections','Failed automatic debits and missed payments. RAY recommends a staged recovery, never an automatic block.',failCount()+openIn(missed)+(kirS().kind?0:1),failedRows()+kirActionRow(Object.keys(FAILS).length)+missed.map((c,k)=>chaseRow(c,k+Object.keys(FAILS).length+1)).join(''))}
  ${grp('grp-check','RECONCILE','Payment Review','Confirm payment first, chase second. RAY checks Razorpay, your bank account, unmatched credits and salesperson collections.',pendingMatches(),matchRows()+claimRows(9))}
  ${grp('grp-early','MONITOR','Early Warnings','Buyers whose repayment is starting to slip, before any invoice is overdue.',openIn(early),early.map(chaseRow).join(''))}`;
}

/* ---------- Activity ---------- */
function feedItem(a){
  const tone=a.ic==='alert'?'color:var(--r);background:var(--r-bg)':a.ic==='check'||a.ic==='send'?'color:var(--g);background:var(--g-bg)':a.ic==='rupee'?'color:var(--link);background:var(--blue-tint)':'';
  const srcN={led:'Own ledger',rzp:'Razorpay payment history',conv:'Buyer conversations',net:'Razorpay network signal',lend:'Partner data',aa:BANK_NAME+' · Connected Banking+'};
  return `<div class="fi"><span class="when">${a.d}<br><span class="faint">${a.t}</span></span><span class="fic" style="${tone}">${I(a.ic,15,2)}</span><div><div class="ft">${a.ti}</div><div class="fd">${a.de||''}</div><div class="who">${(a.src||[]).map(s=>`<span class="src ${s}">${srcN[s]}</span>`).join('')}<span>${a.who||''}</span></div></div>${a.st?`<span class="badge b-b">${a.st}</span>`:'<span></span>'}</div>`;
}
function loopSteps(){
  const p=S.gupta.promise; const order=['new','reading','understood','saved','paid','plan'];
  const idx={new:1,reading:1,understood:2,saved:3,paid:5,broken:5}[p]??0;
  const steps=['Buyer replies','RAY understands','You verify','Payment arrives','Matched to invoice','RAY learns'];
  return `<div class="loop">${steps.map((s,i)=>`${i?`<span class="ln ${i<=idx?'done':''}"></span>`:''}<span class="st ${i<idx||(i===idx&&idx===5)?'done':i===idx?'cur':''}"><i>${i<idx||(idx===5)?I('check',11,3):''}</i>${s}</span>`).join('')}</div>`;
}
function promisePanel(){
  const p=S.gupta.promise; if(!p) return '';
  const st=S.interp.gupta, g=S.gupta, pr=S.promises.filter(x=>x.key==='gupta'&&x.status!=='replaced').slice(-1)[0];
  let right='';
  if(!st||st.status!=='done') right=`<div style="padding:24px 0">${thinking(AI.configured?`Interpreting with ${AI.model} · matching to open invoices…`:'Interpreting the reply · matching to open invoices…')}</div>`;
  else {
   right=interpPanel('gupta',{buyerId:'gupta'});
   if(p==='saved') right+=`<div class="mt12">${thinking(S.bank.st==='on'?`Watching Smart Collect and your bank feed for ${inr(pr&&pr.first&&pr.first.amt||0)}…`:`Watching Razorpay Smart Collect for ${inr(pr&&pr.first&&pr.first.amt||0)}…`)}</div>${S.bank.st==='on'?'':`<div class="alert info mt12" style="padding:12px 14px"><span class="ic" style="width:28px;height:28px">${I('bank',15)}</span><div class="grow small"><b style="color:var(--strong)">Gupta ji usually pays by Google Pay, straight to your bank.</b> <span class="muted">RAY can’t see that yet. Connect your bank so it can confirm the payment automatically.</span></div><button class="btn btn-s btn-sm" onclick="A.bankStart()">Connect bank</button></div>`}`;
   else if(p==='paid'||p==='broken') right+=`<div class="event mt12"><span class="ic">${I('rupee',17,2)}</span><div class="grow"><div style="font-weight:600;color:var(--strong)">${inr(g.paidAmt||0)} received <span class="xs muted" style="font-weight:500">${g.paidVia==='bank'?'· UPI from guptatraders@okhdfc':'· UPI · Razorpay Smart Collect'}</span></div><div class="small">${g.paidVia==='bank'?'Matched':'Auto-matched'} to <b>INV-24891</b> · verified ${g.paidVia==='bank'?'<span class="src aa" style="margin-left:6px">'+BANK_NAME+' · Connected Banking+</span>':''}</div></div><span class="badge b-g">Received</span></div>
    <div class="mt12" style="border:1px solid var(--border);border-radius:10px;padding:12px 14px;background:#fff"><div class="row between"><span class="small muted" style="font-weight:500">Plan updated</span>${g.paidVia==='bank'?`<span class="src aa">${BANK_NAME} · Connected Banking+</span>`:'<span class="src rzp">Razorpay payment trail</span>'}</div><div class="row gap24 mt8"><div><div class="xs muted">Remaining</div><div class="num" style="font-weight:600;color:var(--strong);font-size:16px">${inr(g.oldest)}</div></div><div><div class="xs muted">Promise</div><div style="font-weight:600;color:${p==='broken'?'var(--r)':'var(--strong)'};font-size:16px">${pr&&pr.later?(p==='broken'?'Missed '+RayDates.fmtDay(pr.later.date):'Due '+RayDates.fmtDay(pr.later.date)):'No balance date'}</div></div><div><div class="xs muted">Next reminder</div><div style="font-weight:600;color:var(--strong);font-size:16px">${p==='broken'?'Held · review action':pr&&pr.later?RayDates.fmtShort(pr.later.date)+', 10 AM':'Not scheduled'}</div></div></div></div>`;
  }
  return `<div class="card mt16" id="promise"><div class="row between pad-s" style="border-bottom:1px solid var(--border-subtle)"><div class="row gap8"><span class="ai-tag">${clover(15)}</span><span class="h3">Reply from Gupta Traders</span><span class="xs muted">WhatsApp · 9:21 AM</span></div>${bandBadge(S.gupta.band)}</div>
   <div class="pad-s">${loopSteps()}<div class="grid" style="grid-template-columns:330px 1fr;gap:24px;align-items:start">
    <div class="wa-preview"><div class="wa-bubble">${esc(S.chase.gupta.msg)}<span class="lnk">${LINK('gupta')}</span><span class="meta">${S.chase.gupta.at||'9:14 AM'} ✓✓</span></div><div class="wa-bubble in mt8" style="font-size:14.5px">${esc(GUPTA_REPLY)}<span class="meta">9:21 AM</span></div></div>
    <div>${right}</div></div></div></div>`;
}
function vActivity(){
  const needs=[];
  if(S.gupta.alert) needs.push(brokenAlert(true));
  if(S.gupta.promise) needs.push(promisePanel());
  if(!S.vermaMatched) needs.push(unmatchedAlert());
  return `${pageHead('Activity','Every RAY action and outcome, with its reason, data source and who approved it.',`<button class="btn btn-s" onclick="toast('Audit log exported as CSV')">${I('dl',15)} Export</button>`)}
  ${actSeg('audit')}
  ${needs.length?`<div class="lbl mt24">Needs your review</div>${needs.join('')}`:''}
  <div class="lbl mt32">What RAY learned</div><div class="mt12">${outcomesCard()}</div>
  <div class="lbl mt32">Audit trail</div><div class="card mt12 feed">${S.act.map(feedItem).join('')}</div>`;
}

/* ---------- Controls ---------- */
function vControls(){
  const c=S.ctl;
  const tg=(k,on)=>`<button class="toggle ${on?'on':''}" onclick="S.ctl.${k}=!S.ctl.${k};render();toast('${k==='voice'?'Voice calls':k==='wa'?'WhatsApp':k==='sm'?'Salesperson tasks':'Network signal'} ${on?'turned off':'turned on'}')"></button>`;
  return `${pageHead('Controls','What RAY is allowed to do, and the data it can use.')}<div class="card pad mt16">
  <div class="settings-sec"><div class="sh"><h3>Autonomy</h3><p>Decide what RAY may do without asking you first.</p></div><div class="col gap8">
   <button class="radio-card ${c.auto==='review'?'on':''}" onclick="S.ctl.auto='review';render()"><span class="radio"></span><div><b style="color:var(--strong)">Recommend and draft</b> <span class="badge b-n" style="margin-left:6px">Recommended</span><div class="muted small mt4">RAY drafts actions. You approve before anything is sent or changed.</div></div></button>
   <button class="radio-card ${c.auto==='routine'?'on':''}" onclick="A.routineMode()"><span class="radio"></span><div><b style="color:var(--strong)">Act on routine reminders</b><div class="muted small mt4">Allow RAY to send low-risk routine reminders to Reliable buyers. Credit limits, supply and bulk messages still need you.</div></div></button>
   <div class="mt12" style="padding:14px 16px;background:var(--canvas);border-radius:10px"><div class="small" style="font-weight:600;color:var(--strong)">Always needs your approval</div><div class="lockg">${['Changing credit limits','Changing payment terms','Stopping or pausing supply','Bulk communication','Any lending or financial commitment','Joining Razorpay network signal','Consequential actions on Risky buyers'].map(x=>`<div class="lockline">${I('lock',15)}${x}</div>`).join('')}</div></div></div></div>
  <div class="settings-sec" id="coll-ctl"><div class="sh"><h3>Collections and recovery</h3><p>How RAY collects and recovers, always within mandates buyers have authorised.</p></div><div>
   <div class="setrow"><div class="t"><b>Watch, Risky and high-value accounts</b><span>RAY prepares each recovery step. You approve before anything is sent.</span></div><span class="badge b-b">Review first</span></div>
   <div class="setrow"><div class="t"><b>Routine accounts</b><span>${c.auto==='routine'?'Automatic follow-up within your weekly limits and quiet hours.':'Turn on routine automation to let RAY follow up automatically within your limits.'}</span></div>${c.auto==='routine'?'<span class="badge b-g">Automatic within limits</span>':`<button class="btn btn-s btn-sm" onclick="A.routineMode()">Allow automatic follow-up</button>`}</div>
   <div class="setrow"><div class="t"><b>Payment plans on payment links</b><span>Retailers can propose a later date for part of an invoice. Dates within ${K_AUTO_DAYS} days are confirmed under these rules; dates up to ${K_MAX_DAYS} days need your approval.</span></div><span class="badge b-n">${K_AUTO_DAYS}d auto · ${K_MAX_DAYS}d max</span></div>
   <div class="setrow"><div class="t"><b>Partial payments on recovery links</b><span>Buyers can pay part of a failed collection through a Razorpay Payment Link.</span></div><span class="badge b-n">Allowed · minimum ₹5,000</span></div>
   <div class="setrow"><div class="t"><b>Automatic debits</b><span>Only through UPI Autopay or eNACH mandates the buyer authorised, up to the authorised maximum.</span></div><span class="row gap6 small muted">${I('lock',13)} Fixed</span></div></div></div>
  <div class="settings-sec" id="bank"><div class="sh"><h3>Bank account</h3><p>Connect your business bank account through RazorpayX Connected Banking+ so RAY can confirm incoming payments and reconcile invoices.</p></div><div>${bankControls()}</div></div>
  <div class="settings-sec"><div class="sh"><h3>Communication</h3><p>Limits apply on every channel, including RAY on WhatsApp.</p></div><div>
   <div class="setrow"><div class="t"><b>Maximum reminders per buyer</b><span>Counted across WhatsApp and salesperson tasks</span></div><select class="select" onchange="S.ctl.max=this.value;rr();toast('Weekly limit: '+this.value)">${['1 per week','2 per week','3 per week'].map(o=>`<option ${c.max===o?'selected':''}>${o}</option>`).join('')}</select></div>
   <div class="setrow"><div class="t"><b>Quiet hours</b><span>No messages are sent in this window (IST). Messages approved inside it are queued. Demo clock now ${nowLabel()}.</span></div><div class="row gap8"><select class="select" id="qh-f" onchange="S.ctl.qf=this.value;rr();toast('Quiet hours '+S.ctl.qf+'–'+S.ctl.qt+' IST')">${['6 PM','7 PM','8 PM','9 PM','10 PM','11 PM'].map(o=>`<option ${c.qf===o?'selected':''}>${o}</option>`).join('')}</select><span class="muted">–</span><select class="select" id="qh-t" onchange="S.ctl.qt=this.value;rr();toast('Quiet hours '+S.ctl.qf+'–'+S.ctl.qt+' IST')">${['7 AM','8 AM','9 AM','10 AM','11 AM'].map(o=>`<option ${c.qt===o?'selected':''}>${o}</option>`).join('')}</select></div></div>
   <div class="setrow"><div class="t"><b>Allowed channels</b><span>Turning a channel off blocks it everywhere: single sends, bulk sends, scheduled messages and RAY on WhatsApp.</span></div><div class="row gap20"><label class="row gap8" style="cursor:pointer" onclick="S.ctl.wa=!S.ctl.wa;render()"><span class="cbx ${c.wa?'on':''}">${c.wa?I('check',12,3):''}</span>WhatsApp</label><label class="row gap8" style="cursor:pointer" onclick="S.ctl.sm=!S.ctl.sm;render()"><span class="cbx ${c.sm?'on':''}">${c.sm?I('check',12,3):''}</span>Salesperson task</label></div></div>
   <div class="setrow"><div class="t"><b>Voice calls</b><span>${c.voice?'On':'Off'} · AI voice calls to buyers</span></div>${tg('voice',c.voice)}</div></div></div>
  <div class="settings-sec"><div class="sh"><h3>Do not contact</h3><p>RAY will never message these buyers, on any channel or in bulk. Blocked attempts are logged. Salesperson tasks still work.</p></div><div>
   <div class="row gap8"><div class="searchbox grow" style="max-width:360px">${I('search',16)}<input class="input" id="dnc" list="dnc-list" placeholder="Search or add buyer"><datalist id="dnc-list">${CHEM.map(x=>`<option value="${x.name}">`).join('')}</datalist></div><button class="btn btn-s" onclick="A.dncAdd(document.getElementById('dnc').value)">Add</button></div>
   <div class="row gap8 mt12 wrap">${c.dnc.map((n,i)=>`<span class="conn-chip" style="padding:0 6px 0 10px">${n}<button onclick="S.ctl.dnc.splice(${i},1);render()" style="color:var(--faint);display:grid">${I('x',14,2)}</button></span>`).join('')}</div></div></div>
  <div class="settings-sec" id="data-perm"><div class="sh"><h3>Data &amp; permissions</h3><p>What RAY Credit reads, and what it is allowed to use.</p></div><div>
   ${[['tally','Tally Prime','Ledgers and vouchers','<span class="badge b-n">Not connected</span>'],['marg','Marg ERP','Invoices, ledgers, credit limits · demo connector · must sync within 24 hours for recommendations and sends',S.stale?'<span class="row gap6"><span class="badge b-a">Last synced 31 hours ago</span><button class="btn btn-s btn-sm" onclick="A.sync(this)">Sync now</button></span>':'<span class="row gap6"><span class="badge b-g">Synced 8:45 AM</span><button class="btn btn-g btn-sm" onclick="A.toggleStale()" title="Prototype">Simulate delayed sync</button></span>'],['rzp','Razorpay Smart Collect','Payments and auto-matching','<span class="badge b-g">Connected</span>'],['wa','WhatsApp','Reminders and replies via RAY','<span class="badge b-g">Connected</span>']].map(r=>`<div class="setrow"><div class="row gap12">${svc(r[0]).replace('class="svc','style="width:28px;height:28px;border-radius:7px;font-size:12px" class="svc')}<div class="t"><b>${r[1]}</b><span>${r[2]}</span></div></div>${r[3]}</div>`).join('')}
   <div class="setrow" id="inbox-ctl" style="align-items:flex-start"><div class="row gap12" style="align-items:flex-start"><span class="svc" style="width:28px;height:28px;border-radius:7px;background:#e7f8ef;color:#128c4b">${I('chat',14,2)}</span><div class="t"><b>WhatsApp Business inbox <span class="badge b-n" style="margin-left:4px">Proposed integration</span></b>${S.inbox?`<span>Connected · +91 98••••4410</span><div class="perm-mini mt8"><div><div class="xs" style="font-weight:600;color:var(--g)">Permissions</div>${['Read incoming buyer messages in this connected business inbox','Identify credit requests','Prepare recommendations'].map(x=>`<div class="xs mt4">${I('check',11,2.4)} ${x}</div>`).join('')}</div><div><div class="xs" style="font-weight:600;color:var(--r)">RAY cannot</div>${['Read personal WhatsApp conversations','Access other WhatsApp accounts','Message buyers about sensitive credit decisions without your approval'].map(x=>`<div class="xs mt4">${I('x',11,2.4)} ${x}</div>`).join('')}</div></div>`:`<span>Connect your business inbox to identify incoming buyer credit requests. RAY cannot access your personal WhatsApp chats. Until then, forward buyer requests to RAY for analysis.</span>`}</div></div>${S.inbox?`<div class="row gap8"><span class="badge b-g">Connected</span><button class="btn btn-g btn-sm" onclick="A.inboxDisconnect()">Disconnect</button></div>`:`<div class="row gap8"><span class="badge b-n">Not connected</span><button class="btn btn-s btn-sm" onclick="A.inboxConnect()">Connect business inbox</button></div>`}</div>
   <div class="setrow" id="net-ctl"><div class="row gap12"><span class="svc" style="width:28px;height:28px;border-radius:7px;background:#efeafb;color:#6a4fc4">${I('users',14,2)}</span><div class="t"><b>Razorpay network signal</b><span>Your participation. Each buyer’s consent, coverage and signal age are checked separately before network evidence can change a decision. Synthetic and aggregated in this prototype; production use needs consent, privacy and legal review, potentially including credit-information regulation.</span></div></div><div class="row gap8"><span class="badge ${c.net?'b-g':'b-n'}">${c.net?'Available · on':'Available'}</span><button class="btn btn-s btn-sm" onclick="A.netPerms()">Review permissions</button></div></div></div></div>
  <div class="settings-sec" id="fin-ctl"><div class="sh"><h3>Trade credit and financing</h3><p>RAY Credit manages your own trade-credit terms. It is not a lender.</p></div><div><div class="small" style="color:var(--text)">If invoice advances, working capital loans or financed buyer credit are offered, they are <b style="color:var(--strong)">provided by a regulated lending partner</b>, through a separate consent and lending journey. Ordinary credit decisions for your buyers never need a lender.</div><div class="row gap6 mt8 xs muted">${I('lock',12)} Any lending or financial commitment always needs your approval.</div></div></div>
  <div class="settings-sec"><div class="sh"><h3>Activity &amp; audit</h3><p>Every action shows its reason, source and approval.</p></div><div><button class="btn btn-s" onclick="go('raahi/activity')">${I('hist',16)} View every RAY action</button></div></div>
  <div class="settings-sec"><div class="sh"><h3>Pause RAY</h3><p>Stops new RAY actions immediately. Existing payments continue normally.</p></div><div>${S.paused?`<div class="row gap12"><span class="badge b-n">${I('pause',11,2.4)} Paused</span><button class="btn btn-s" onclick="A.pauseToggle()">Resume RAY</button></div>`:`<button class="btn btn-d" onclick="A.pauseToggle()">${I('pause',15)} Pause RAY</button>`}</div></div>
  </div>`;
}

A.dncAdd=(v)=>{ v=String(v||'').trim(); if(!v) return; const b=RayData.ALL.find(x=>x.name.toLowerCase()===v.toLowerCase()); if(!b){ toast('No buyer named “'+v+'”'); return; } if(S.ctl.dnc.map(x=>x.toLowerCase()).includes(b.name.toLowerCase())) return toast(b.name+' is already on the list');
  S.ctl.dnc.push(b.name); log({ic:'ban',ti:`${b.name} added to Do not contact`,de:'RAY will not message this buyer on any channel · salesperson tasks still allowed',src:[],who:M.owner+' · Controls',chem:b.name}); rr(); toast(b.name+' added to Do not contact'); };
