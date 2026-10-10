/* ================= INCOMING CREDIT REQUESTS (WhatsApp Business inbox or forwarded to RAY) ================= */
const CREQ = [
 {id:'gupta', msg:'Bhai ₹50,000 aur credit de do. Payment Monday clear kar dunga.', amt:50000, terms:'Existing dues by Monday', at:'8:52 AM'},
 {id:'arora', msg:'₹80,000 ka stock chahiye, 21 days credit pe.', amt:80000, terms:'21 days credit', reqTerms:21, at:'Yesterday, 6:40 PM'},
 {id:'mehta', msg:'₹30,000 aur bhej do, month end tak clear kar dunga.', amt:30000, terms:'Month end', at:'Yesterday, 4:15 PM'},
];
/* verdict, reasons and suggested terms come from the same engine decision as every other screen */
function reqV(r){ const rec=recOf(r.id), s=sigOf(r.id), v=RayPolicy.requestVerdict(rec,s,{amount:r.amt, terms:r.reqTerms||null});
  const nx=nextOpenInv(r.id), col=r.id==='gupta'?balOf('gupta','INV-24891'):nx?nx.bal:0;
  return Object.assign(v,{rec, reasons:shortReasons(r.id), next:v.verdict==='DO NOT EXTEND YET'?`Collect ${inr(col)} before extending further credit.`:null}); }
const creq = id => CREQ.find(r=>r.id===id);
const reqOpen = () => CREQ.filter(r=>!S.req[r.id]).length;
const reqSrc = () => S.inbox ? 'From connected WhatsApp Business inbox' : 'Forwarded to RAY';
const REQ_DONE_BASE = {kept:'Not extended · current terms kept', follow:'Not extended · follow-up started', extended:'Credit extended', later:'Saved for later'};
const reqDone = d => d==='limit'?`Not extended · limit set to ${inr(S.gupta.limit)} · ${S.gupta.curTerms} days`:d==='offered'?`Offered on ${curTermsOf('mehta')}-day terms`:REQ_DONE_BASE[d]||d;
const REQ_DONE = new Proxy({}, {get:(_,k)=>reqDone(k)});
const verdictChip = r => { const v=reqV(r); return `<span class="verdict v-${v.tone}">${v.verdict}</span>`; };
function reqTerms(r){ const rec=recOf(r.id);
  if(r.id==='gupta') return `<div class="kvline"><span>Recommended limit</span><b class="num">${inr(rec.recommendedLimit)} <span class="xs muted" style="font-weight:500">from ${inr(S.gupta.limit)}</span></b></div>`;
  if(rec.action==='increase') return `<div class="kvline"><span>Suggested total limit</span><b class="num">${inr(rec.recommendedLimit)}</b></div><div class="kvline"><span>Terms</span><b>${rec.recommendedTerms} days</b></div>`;
  return `<div class="kvline"><span>Suggested</span><b class="num">${inr(r.amt)}</b></div><div class="kvline"><span>Terms</span><b>${rec.recommendedTerms} days${rec.recommendedTerms!==curTermsOf(r.id)?` instead of ${curTermsOf(r.id)}`:''}</b></div>`;
}
function reqCard(r){
  const c=chemView(chem(r.id)), d=S.req[r.id], v=reqV(r);
  return `<div class="cr"><div class="row between gap8"><b style="color:var(--strong);font-size:15px">${c.name}</b>${bandBadge(c.band)}</div>
   <div class="cr-src">${I(S.inbox?'chat':'arrowR',12,2)} ${reqSrc()} · ${r.at}</div>
   <div class="cr-msg">“${r.msg}”</div>
   <div class="kvline" style="border-top:0;padding-top:4px"><span>Requested</span><b class="num">${inr(r.amt)}</b></div>
   <div class="mt8"><div class="xs muted" style="font-weight:500">RAY recommendation</div><div class="mt4">${verdictChip(r)}</div></div>
   <div class="mt8">${reqTerms(r)}</div>
   <div class="col gap4 mt8">${v.reasons.map(x=>`<div class="row gap6 small" style="align-items:flex-start"><span style="color:${v.tone==='g'?'var(--g)':'var(--a)'};flex-shrink:0;margin-top:2px">${I(v.tone==='g'?'check':'alert',12,2.4)}</span>${x}</div>`).join('')}</div>
   ${v.next?`<div class="small mt8" style="color:var(--strong);font-weight:500">${v.next}</div>`:''}
   <div class="grow"></div>
   <div class="row between mt12">${d?`<span class="badge ${d==='later'?'b-n':'b-g'}">${reqDone(d)}</span>`:'<span></span>'}<button class="btn ${d?'btn-g':'btn-s'} btn-sm" onclick="go('raahi/request/${r.id}')">${d?'View':'Review decision'}</button></div></div>`;
}
function reqSection(){
  const n=reqOpen();
  return `<div class="card wc mt16" id="creq"><div class="sec-h"><div><div class="row gap8">${stage('APPROVE')}<span class="h2" style="font-size:20px">${n?`${n} buyer${n>1?'s need':' needs'} a credit decision`:'Credit requests are reviewed'}</span></div><div class="small muted mt4">RAY has reviewed their repayment behaviour and prepared recommendations. Nothing is sent to buyers.</div></div>
   <span class="xs muted" style="text-align:right">${S.inbox?`${I('check',12,2.4)} WhatsApp Business inbox connected`:`Forward buyer requests to RAY for analysis.<br><a class="link" onclick="goSec('raahi/controls','inbox-ctl')">Connect business inbox</a>`}</span></div>
   <div class="creq-g">${CREQ.map(reqCard).join('')}</div></div>`;
}

/* ---------- desktop credit request page ---------- */
function reqFlow(r){
  const c=chemView(chem(r.id)), on=netOn(), rec=recOf(r.id), s=sigOf(r.id);
  const netTxt=!on?'Not enabled':rec.network.eligible?(rec.network.trend==='adverse'?`Weakening across ${rec.network.coverage} participating distributors`:`Stable across ${rec.network.coverage} participating distributors`):esc(rec.network.reason);
  const match={gupta:'matched by phone 98••••4410',arora:'matched by phone 98••••3127',mehta:'matched by business name'}[r.id];
  const rows=[`${c.name} · ${match}`,`${inr(r.amt)} · ${r.terms}`,`${rec.band} · limit ${inr(c.limit)} · recommended ${inr(rec.recommendedLimit)} · ${rec.recommendedTerms} days`,`${s.last3.join('d → ')}d across the last 3 invoices · usual ${s.usual}d`,`${s.onTimePaid} of ${s.invoicesPaid} paid on time in 6 months`,netTxt,`${inr(s.out)} across ${s.openInvoices} open invoice${s.openInvoices===1?'':'s'}${s.maxOverdueDays?` · oldest ${s.maxOverdueDays}d overdue`:''}`,s.debit.method==='Manual'?'Manual payments':`${s.debit.method} · ${s.debit.attempts-s.debit.failures6m} of ${s.debit.attempts} debits succeeded · ${s.debit.failures6m} failed in 6 months`];
  const labels=['Identified the buyer','Extracted amount and terms','Checked Credit Portfolio','Checked repayment history','Checked Razorpay payment behaviour','Checked network repayment behaviour, where consent exists','Checked open invoices and exposure','Checked collection reliability'];
  return `<div class="flow">${labels.map((l,i)=>`<div class="fl"><span class="fl-d">${I('check',11,3)}</span><div class="grow"><div class="small" style="font-weight:600;color:var(--strong)">${l}</div><div class="xs muted">${rows[i]}</div></div></div>`).join('')}<div class="fl last"><span class="fl-d ai">${clover(13)}</span><div class="grow"><div class="small" style="font-weight:600;color:var(--strong)">Prepared a recommendation for you</div><div class="xs muted">Policy ${POL.version}. You review it and decide. RAY does not reply to the buyer.</div></div></div></div>`;
}
function reqSignals(r){
  const on=netOn(), rec=recOf(r.id), s=sigOf(r.id);
  const net=!on?'Not enabled':rec.network.eligible?`<span style="color:${rec.network.trend==='adverse'?'var(--a)':'var(--g)'}">${netLabel(rec)}</span>`:NET_STATE_LABEL[rec.network.state];
  return [['Payment delay',`${s.usual}d → ${s.delay}d`,'led'],['Razorpay network signal',net,'net'],['Promises',s.promises.made?`${s.promises.broken} missed`:'None missed','conv'],['Orders',s.ordersChangePct<=-10?`Down ${-s.ordersChangePct}%`:s.ordersChangePct>=10?`Up ${s.ordersChangePct}%`:'Steady','led']];
}
function vRequest(id){
  const r=creq(id); if(!r) return '<div class="empty">Request not found</div>';
  const c=chemView(chem(id)), d=S.req[id], g=S.gupta, v=reqV(r), rec=v.rec;
  const after=`If extended, exposure would be ${inr(v.exposureAfter)} against ${v.exposureAfter>rec.recommendedLimit?'RAY’s recommended':'a'} ${inr(rec.recommendedLimit)} limit.`;
  const say=v.verdict==='DO NOT EXTEND YET'?'Do not extend additional credit yet.':v.verdict==='EXTEND'?`Extend the ${inr(r.amt)} order on ${rec.recommendedTerms}-day terms.`:`Supply ${inr(r.amt)}, but on ${rec.recommendedTerms}-day terms instead of ${curTermsOf(id)}.`;
  const btns = d ? `<div class="alert ok mt16"><span class="ic">${I('check',17,2.4)}</span><div class="grow"><h4>${reqDone(d)}</h4><div class="small muted">Logged in Activity. RAY has not messaged the buyer. You decide what to tell them.</div></div><button class="btn btn-g btn-sm" onclick="S.req['${id}']=null;rr()">Undo</button></div>`
   : id==='gupta' ? `<div class="row gap8 mt16 wrap"><button class="btn btn-p" onclick="A.approveGupta()" ${blocked()?'disabled':''}>Approve ${inr(g.limitRec)} limit · ${g.terms}-day terms</button><button class="btn btn-s" onclick="A.reqDecide('gupta','follow')">Start collection follow-up</button><button class="btn btn-s" onclick="A.reqDecide('gupta','kept')">Keep current terms</button><button class="btn btn-g" onclick="A.reqDecide('gupta','extended')">Extend anyway</button></div><div class="xs muted mt8">After you approve limit and terms, RAY asks how Gupta Traders should repay.</div>`
   : v.verdict==='EXTEND' ? `<div class="row gap8 mt16 wrap"><button class="btn btn-p" onclick="A.reqDecide('${id}','extended')" ${blocked()?'disabled':''}>Extend ${inr(r.amt)} credit</button><button class="btn btn-g" onclick="A.reqDecide('${id}','later')">Review later</button></div>`
   : `<div class="row gap8 mt16 wrap"><button class="btn btn-p" onclick="A.reqDecide('${id}','offered')" ${blocked()?'disabled':''}>Offer ${inr(r.amt)} on ${rec.recommendedTerms}-day terms</button><button class="btn btn-s" onclick="A.reqDecide('${id}','kept')">Keep ${curTermsOf(id)}-day terms</button></div>`;
  return `<div class="crumb mt20" style="margin-bottom:0"><a onclick="go('raahi/overview')">${I('arrowL',14,2)} Overview</a></div>
  <div class="card pad mt16"><div class="row between" style="align-items:flex-start"><div><span class="lbl">Credit request</span><div class="row gap8 mt4"><span class="h1" style="font-size:24px">${c.name}</span>${bandBadge(c.band,true)}</div><div class="muted mt4">${I(S.inbox?'chat':'arrowR',13,2)} ${reqSrc()} · ${r.at}</div></div><a class="link small" onclick="go('raahi/buyer/${id}')">Open buyer profile</a></div>
   <div class="row gap24 mt20" style="align-items:stretch"><div class="kv"><span class="k">Requested</span><span class="v num">${inr(r.amt)}</span><span class="xs muted">${r.terms}</span></div><div class="vdiv"></div><div class="kv"><span class="k">Current outstanding</span><span class="v num">${inr(c.out)}</span></div><div class="vdiv"></div><div class="kv"><span class="k">Current credit limit</span><span class="v num">${inr(c.limit)}</span></div><div class="vdiv"></div><div class="kv"><span class="k">RAY recommended limit</span><span class="v num" style="color:var(--link)">${inr(rec.recommendedLimit)}</span><span class="xs muted">${rec.recommendedTerms} days · ${rec.band}</span></div></div></div>
  <div class="grid g2 mt16" style="align-items:start">
   <div class="card pad"><div class="row between"><span class="h3">Buyer message</span><span class="xs muted">${reqSrc()}</span></div>
    <div class="wa-preview mt12"><div class="wa-bubble in" style="max-width:100%">${r.msg}<span class="meta">${r.at.replace('Yesterday, ','')}</span></div></div>
    <div class="lbl mt16">RAY extracted</div>
    <div class="ext mt8"><div><span class="k">Buyer</span><b>${c.name}</b></div><div><span class="k">Credit requested</span><b class="num">${inr(r.amt)}</b></div><div><span class="k">${r.reqTerms?'Requested terms':'Promise'}</span><b>${r.terms}</b></div><div><span class="k">Matched by</span><b>${id==='mehta'?'Business name':'Phone number'}</b></div></div></div>
   <div class="card pad"><div class="row between"><span class="h3">How RAY processed it</span><span class="ai-tag">${clover(14)} RAY</span></div><div class="mt12">${reqFlow(r)}</div></div>
  </div>
  <div class="card pad mt16" id="req-signals"><div class="row between"><div class="row gap8">${stage('ASSESS')}<span class="h3">Why RAY recommends this</span></div></div>
   ${uwPanel(id)}</div>
  <div class="card pad mt16 rec" id="req-rec"><div class="row between"><div class="row gap8">${stage('APPROVE')}<span class="h3">RAY recommendation</span></div>${verdictChip(r)}</div>
   <div class="say mt12">${say}</div>
   <div class="rec-lines mt8"><div><span class="muted">Recommended limit</span><b class="num">${inr(rec.recommendedLimit)}</b></div><div><span class="muted">Terms</span><b class="num">${rec.recommendedTerms} days</b></div></div>
   ${v.next?`<div class="small mt4" style="color:var(--strong);font-weight:500">${v.next.replace('extending further credit','the next delivery')}</div>`:''}
   <div class="xs muted mt8">${after} Confidence: ${rec.confidence}.</div>
   ${!d?`<div class="mt12">${netCompare(id)}</div>`:''}
   ${btns}
   <div class="xs muted mt12 row gap4">${I('lock',12)} RAY never replies to buyers about credit decisions without your approval.</div></div>
  ${howPanel(id)}`;
}
A.reqDecide=(id,k)=>{ const c=chem(id), r=creq(id), v=reqV(r), rec=v.rec;
  const done=(msg)=>{ S.req[id]=k; log({ic:k==='extended'||k==='offered'?'check':'shield',ti:`Credit request from ${c.name}: ${reqDone(k).toLowerCase()}`,de:`${inr(r.amt)} requested on WhatsApp · RAY recommended ${v.verdict.toLowerCase()} · policy ${POL.version} · buyer not messaged by RAY`,src:['conv','led'],who:'Decided by '+M.owner+' · '+(document.getElementById('mob-root')&&document.getElementById('mob-root').innerHTML?'RAY Credit for Mobile':'Dashboard'),chem:c.name}); rr(); if(typeof mobRender==='function') mobRender(); toast(msg||'Decision logged · RAY has not messaged the buyer'); };
  if(k==='later'){ S.req[id]='later'; rr(); toast('Saved for later'); return; }
  if(k==='extended'&&v.verdict!=='EXTEND') return modal({title:`Extend ${inr(r.amt)} to ${c.name} anyway?`,body:`<p style="color:var(--strong)">RAY recommends against this. Exposure would rise to ${inr(v.exposureAfter)}, above the ${inr(rec.recommendedLimit)} recommended limit.</p><p class="muted small mt8">${shortReasons(id).join(' · ')}. Your override will be logged with the recommendation it overrides.</p>`,actions:[{label:'Cancel'},{label:'Extend anyway',cls:'btn-d',fn:()=>{closeModal();recordEvent({type:'CREDIT_KEPT', buyerId:id, source:'Dashboard', actor:M.owner, meta:{override:'extended against recommendation', amount:r.amt}},{quiet:true});decide(id,'kept');done('Override logged · credit extended')}}]});
  if(k==='extended') return modal({title:`Extend ${inr(r.amt)} credit to ${c.name}?`,body:`<div class="kvline" style="border:0"><span>Credit limit</span><b class="num">${inr(curLimitOf(id))} → ${inr(rec.recommendedLimit)}</b></div><div class="kvline"><span>Terms</span><b>${rec.recommendedTerms} days</b></div><div class="kvline"><span>Exposure after order</span><b class="num">${inr(v.exposureAfter)}</b></div><p class="xs muted mt12">Updated in your ledger after you confirm. RAY will not message ${c.name}. You confirm the order with them.</p>`,actions:[{label:'Cancel'},{label:`Extend ${inr(r.amt)} credit`,cls:'btn-p',fn:()=>{closeModal();const was=curLimitOf(id), L=rec.recommendedLimit, T=rec.recommendedTerms;setLimitValue(id,L,T);recordEvent({type:'CREDIT_APPROVED', buyerId:id, source:'Dashboard', actor:M.owner, meta:{limit:L, terms:T, from:was, increase:L>was, policy:rec.policyVersion, request:r.amt}},{quiet:true});decide(id,'approved');done(`${c.name} limit raised to ${inr(L)}`);setTimeout(()=>A.repaySetup(id,L,T),350)}}]});
  if(k==='offered') return modal({title:`Offer ${inr(r.amt)} to ${c.name} on ${rec.recommendedTerms}-day terms?`,body:`<p class="muted">${shortReasons(id).join(' · ')}. Shorter terms keep exposure in check while you keep supplying.</p><p class="xs muted mt8">RAY will not message the buyer. You share the terms with them.</p>`,actions:[{label:'Cancel'},{label:`Offer on ${rec.recommendedTerms}-day terms`,cls:'btn-p',fn:()=>{closeModal();const T=rec.recommendedTerms;setLimitValue(id,curLimitOf(id),T);recordEvent({type:'CREDIT_APPROVED', buyerId:id, source:'Dashboard', actor:M.owner, meta:{limit:curLimitOf(id), terms:T, increase:false, policy:rec.policyVersion}},{quiet:true});decide(id,'approved');done();setTimeout(()=>A.repaySetup(id,curLimitOf(id),T),350)}}]});
  if(k==='follow'){ done('Not extended · follow-up drafted'); if(S.chase.gupta.st==='draft') setTimeout(()=>A.approveOne('gupta'),200); return; }
  done();
};
/* ---------- WhatsApp Business inbox (proposed authorised integration) ---------- */
A.inboxConnect=()=>modal({title:'Connect WhatsApp Business inbox?',body:`<p class="muted">Prototype concept for an authorised business integration. RAY Credit can analyse messages received through this connected business inbox.</p>
  <div class="grid g2 mt12" style="gap:12px"><div class="perm"><div class="small" style="font-weight:600;color:var(--g)">RAY Credit can</div>${['Read incoming buyer messages in this connected business inbox','Identify credit requests','Prepare recommendations'].map(x=>`<div class="row gap8 mt8 small" style="align-items:flex-start"><span style="color:var(--g);flex-shrink:0;margin-top:1px">${I('check',13,2.4)}</span>${x}</div>`).join('')}</div>
  <div class="perm"><div class="small" style="font-weight:600;color:var(--r)">RAY Credit cannot</div>${['Read personal WhatsApp conversations','Access other WhatsApp accounts','Message buyers about sensitive credit decisions without your approval'].map(x=>`<div class="row gap8 mt8 small" style="align-items:flex-start"><span style="color:var(--r);flex-shrink:0;margin-top:1px">${I('x',13,2.4)}</span>${x}</div>`).join('')}</div></div>
  <div class="kvline mt12"><span>Business number</span><b class="num">+91 98••••4410</b></div>`,
  actions:[{label:'Cancel'},{label:'Connect business inbox',cls:'btn-p',fn:()=>{closeModal();S.inbox=true;log({ic:'chat',ti:'WhatsApp Business inbox connected',de:'+91 98••••4410 · incoming buyer messages only · personal chats never accessed',src:['conv'],who:'Approved by '+M.owner+' · Controls'});
   if(S.wa.msgs) waInboxAlert(); else S.wa.pendingInbox=true; S.wa.unread=(S.wa.unread||0)+1; rr(); waNudge(); toast('Business inbox connected · RAY found 1 new credit request');}}]});
A.inboxDisconnect=()=>{ S.inbox=false; log({ic:'ban',ti:'WhatsApp Business inbox disconnected',de:'RAY no longer reads incoming buyer messages · forward requests to RAY instead',src:[],who:M.owner+' · Controls'}); rr(); toast('Business inbox disconnected'); };
A.netPerms=()=>modal({title:'Razorpay network signal',body:`<p class="muted">Use consented, aggregated repayment behaviour across participating distributors to identify risk earlier.</p><div class="col gap6 mt12 small">${['Other distributors’ names, invoices and transactions are never shown','Shown only as aggregated bands such as “weakening”','Used only for buyers who have consented','You can turn this off anytime'].map(x=>`<div class="row gap8" style="align-items:flex-start"><span style="color:var(--g);margin-top:1px;flex-shrink:0">${I('check',14,2.4)}</span>${x}</div>`).join('')}</div><div class="setrow mt16" style="border-top:1px solid var(--border-subtle);padding-top:14px"><div class="t"><b>Use network signal</b><span>${S.ctl.net?'On for buyers who have consented':'Off'}</span></div><span class="badge ${S.ctl.net?'b-g':'b-n'}">${S.ctl.net?'On':'Off'}</span></div>`,actions:[{label:'Close'},{label:S.ctl.net?'Turn off':'Turn on with consent',cls:S.ctl.net?'btn-s':'btn-p',fn:()=>{closeModal();A.netToggle()}}]});
