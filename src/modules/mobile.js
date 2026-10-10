/* ================= RAY CREDIT FOR MOBILE (inside the Razorpay app) ================= */
/* App tabs: Home · Payments · Products · Support · Account. RAY Credit lives inside the app. */
const RC_SCR=['rc','portfolio','actions','bank','ask','buyer','request','pay','recover','coll'];
A.openMobile=(scr='rc',id=null)=>{ A.closeWA(); closeModal(); if(scr==='home') scr='rc'; if(!S.installed&&RC_SCR.includes(scr)) scr='apphome';
  S.mob={scr,id,tab:'home',sheet:null,chat:S.mob&&S.mob.chat||[],from:'home'}; mobRender(true); waNudge(); };
A.closeMobile=()=>{ S.mob=null; document.getElementById('mob-root').innerHTML=''; waNudge(); };
A.mobGo=(scr,id=null)=>{ const m=S.mob; m.scr=scr; m.id=id; m.sheet=null;
  if(['apphome','payments','products','support','account'].includes(scr)) m.tab=scr==='apphome'?'home':scr;
  if(scr==='studio'||scr==='rcprod') m.tab='products';
  mobRender(); const b=document.querySelector('.mob-body'); if(b) b.scrollTop=0; };
A.mobTab=(t)=>A.mobGo(t==='home'?'apphome':t);
A.mobSheet=(t)=>{ S.mob.sheet=t; mobRender(); };
function mobRender(first){
  const r=document.getElementById('mob-root'); if(!S.mob){ r.innerHTML=''; return; }
  const m=S.mob;
  const nav=[['home','home','Home'],['payments','receipt','Payments'],['products','grid','Products'],['support','chat','Support'],['account','user','Account']].map(([k,ic,l])=>`<button class="${m.tab===k?'on':''}" onclick="A.mobTab('${k}')">${I(ic,20,2)}<span>${l}</span></button>`).join('');
  r.innerHTML=`<div class="wa-back mob-back" ${first?'':'style="animation:none"'} onclick="if(event.target===this)A.closeMobile()"><div class="wa-side"><div class="row gap8" style="color:#9fc3ff;font-weight:600;font-size:13px"><img src="${MARK}" style="width:18px;height:18px;border-radius:4px"> RAY Credit for Mobile</div><h3 class="mt12">Review decisions and act inside the Razorpay app.</h3><p>Built for one buyer, one credit request or one payment at a time. Daily entry from Home, discovery from Products → Agent Studio. Deep portfolio work stays on desktop.</p><p class="small" style="color:#9aa3a8;margin-top:18px">Prototype simulation · same RAY Credit intelligence as desktop and WhatsApp</p></div>
   <button class="wa-close" onclick="A.closeMobile()">${I('x',20,2)}</button>
   <div class="phone" ${first?'':'style="animation:none"'}><div class="screen mob"><div class="wa-island"></div>
    <div class="wa-status" style="background:#fff;color:#111"><span>9:41</span><span class="row gap4" style="font-size:12px">▂▄▆ ${I('pulse',14,2)}</span></div>
    ${mobScreen()}
    <div class="mob-nav">${nav}</div>
    ${m.sheet?mobSheetHtml(m.sheet):''}
   </div></div></div>`;
}
function mobScreen(){
  const m=S.mob;
  return ({apphome:appHome,payments:appPayments,products:appProducts,support:appSupport,account:appAccount,studio:appStudio,rcprod:appRcProd,rc:mobHome,pay:()=>mobPay(m.id),portfolio:mobPortfolio,actions:mobActions,bank:mobBank,ask:mobAsk,buyer:()=>mobBuyer(m.id),request:()=>mobRequest(m.id),recover:()=>mobRecover(m.id),coll:()=>mobColl(m.id)}[m.scr]||appHome)();
}
/* ---------- Razorpay app shell screens (light, as in the Razorpay app) ---------- */
function appHome(){
  const bars=[46,18,14,30,30,26,22];
  return `<div class="mob-body app">
   <div class="row between"><div class="row gap10"><span class="app-av">AD</span><div><div class="xs muted">Good morning</div><div class="app-biz">AGARWAL DISTRIBUTORS</div></div></div><span class="app-ic">${I('mega',18,2)}</span></div>
   <div class="xs muted mt16">Account balance</div><div class="row gap8" style="align-items:center"><span class="app-bal num">₹1,07,751<span>.00</span></span><span class="muted">${I('emoji',16,2)}</span></div>
   <div class="app-me mt12"><div class="grow"><div class="xs" style="color:#b9c3d6">Get paid at your branded Razorpay.me link</div><div style="color:#fff;font-weight:700;font-size:13px">razorpay.me/@agarwaldist</div></div><button onclick="toast('Share link')">${I('ext',13,2)} Share</button></div>
   <div class="app-qa">${[['grid','QR codes'],['link','Payment links'],['page','Payment pages'],['grid','All products']].map(q=>`<button onclick="${q[1]==='All products'?"A.mobTab('products')":`toast('${q[1]}')`}"><span>${I(q[0],17,2)}</span>${q[1]}</button>`).join('')}</div>
   <div class="app-card row between" onclick="A.mobTab('payments')" style="cursor:pointer"><div class="row gap10"><span class="app-pi">${I('settle',16,2)}</span><div><div class="xs muted">Next settlement</div><div style="font-weight:700;color:var(--strong)">₹1,38,920.00</div><div class="xs muted">Today, 5:00 PM · ICICI ••4821</div></div></div>${I('right',16,2)}</div>
   ${S.installed&&failCount()?`<div class="app-card ray-ins" style="border-color:#f3c9c4"><div class="row between"><span class="mob-ray">${clover(13)} RAY Credit</span><span class="mb mb-r">ATTENTION</span></div><div class="mt8" style="font-weight:700;color:var(--strong);font-size:14.5px">${failCount()} collection${failCount()===1?' needs':'s need'} attention</div>${Object.keys(FAILS).filter(failOpen).map(id=>`<div class="mline" style="margin-top:6px"><span><b style="color:var(--strong)">${chem(id).name}</b><br><span class="xs muted">${inr(FAILS[id].amt)} · ${FAILS[id].m==='eNACH'?'eNACH failed':'Autopay failed'}</span></span><b class="num">${inr(FAILS[id].amt)}</b></div>`).join('')}<button class="mbtn p sm mt8" onclick="A.mobGo('recover','${Object.keys(FAILS).find(failOpen)}')">${Object.keys(FAILS).find(failOpen)==='gupta'?'Start recovery':'Review recovery'}</button></div>`:''}
   ${S.installed?`<div class="app-card ray-ins"><div class="row between"><span class="mob-ray">${clover(13)} RAY Credit</span><span class="xs muted">9:00 AM</span></div>
    <div class="mt8" style="font-weight:700;color:var(--strong);font-size:14.5px">${reqOpen()} buyer${reqOpen()===1?' is':'s are'} waiting for credit decisions</div><div class="small muted mt4">5 more are showing weaker repayment behaviour</div>
    <button class="mbtn p sm mt12" onclick="A.mobGo('rc')">Review</button></div>
`
    :`<div class="app-card"><span class="mob-ray">${clover(13)} New in Agent Studio</span><div class="mt8" style="font-weight:700;color:var(--strong)">RAY Credit</div><div class="small muted mt4">Network-powered credit intelligence for B2B distributors</div><button class="mbtn sm mt12" onclick="A.mobGo('rcprod')">Learn more</button></div>`}
   <div class="app-card"><div class="row between"><b style="color:var(--strong)">Payments</b><span class="app-pill">Past 7 days ${I('down',12,2)}</span></div><div class="mt8" style="font-weight:700;color:var(--strong);font-size:17px">₹22,76,621.00</div><div class="xs muted">362 payments</div>
    <div class="app-bars mt12">${bars.map((h,k)=>`<div><i style="height:${h*1.5}px"></i><span>${'MTWTFSS'[k]}</span></div>`).join('')}</div></div>
  </div>`;
}
function appPayments(){
  const st=['Captured','Captured','Failed','Captured','Captured','Captured'];
  return `<div class="mob-body app"><div class="app-seg"><button class="on">Transactions</button><button onclick="toast('Settlements')">Settlements</button></div>
   <div class="row gap6 mt12"><span class="app-pill">${I('cal',12,2)} Past 7 days ${I('down',12,2)}</span><span class="app-pill">${I('filter',12,2)} Filters</span><span class="grow"></span><span class="app-pill">${I('dl',12,2)} Reports</span></div>
   <div class="row between xs muted mt12" style="font-weight:600"><span>TODAY · 5 OCT</span><span>Received ₹1,42,380</span></div>
   ${PAYS.map((p,k)=>`<div class="app-tx"><div class="grow"><div style="font-weight:600;color:var(--strong);font-size:13.5px">${p[1]}</div><div class="xs muted">${p[4]} · ${p[2]} · ${p[5]}</div></div><div style="text-align:right"><div class="num" style="font-weight:700;color:var(--strong)">${inr(p[3])}</div><span class="app-st ${st[k]==='Failed'?'f':''}">${st[k]}</span></div></div>`).join('')}</div>`;
}
function appProducts(){
  const card=(ic,t,s,fn,hl)=>`<button class="app-prod ${hl?'hl':''}" onclick="${fn}"><span class="app-pi">${I(ic,16,2)}</span><b>${t}</b><span>${s}</span></button>`;
  return `<div class="mob-body app"><div class="app-h1">Products</div><div class="xs muted mt12" style="font-weight:700;letter-spacing:.06em">SHARE AND COLLECT</div>
   <div class="app-qr mt8"><span class="app-qrimg">${I('grid',30,1.6)}</span><div class="grow"><div style="font-weight:700;color:var(--strong);font-size:13px">AGARWAL DISTRIBUTORS</div><div class="xs muted">Tap thumbnail to show fullscreen at the counter</div><div class="row gap12 mt8 xs" style="color:var(--link);font-weight:600"><span>${I('ext',12,2)} Share</span><span>${I('plus',12,2)} Add amount</span></div></div></div>
   <div class="app-pgrid mt12">${card('link','Payment links','Collect payments instantly by sharing a simple link',"toast('Payment links')")}${card('grid','QR Codes','Collect payments with a QR code',"toast('QR Codes')")}${card('page','Payment pages','Create a branded page to collect payments online',"toast('Payment pages')")}${card('refresh','Subscriptions','Set up recurring payments and billing',"toast('Subscriptions')")}${card('receipt','Invoices','Send professional invoices and get paid faster',"toast('Invoices')")}${card('agent','Agent Studio','AI agents that work across your Razorpay data',"A.mobGo('studio')",true)}</div></div>`;
}
function appSupport(){ return `<div class="mob-body app"><div class="app-h1">Support</div><div class="app-card mt12">${['Raise a ticket','Chat with us','Help articles'].map(x=>`<div class="mline"><span>${x}</span><b>${I('right',14,2)}</b></div>`).join('')}</div></div>`; }
function appAccount(){ return `<div class="mob-body app"><div class="app-h1">Account</div><div class="app-card mt12"><b style="color:var(--strong)">${M.name}</b><div class="xs muted">${M.owner} · ${M.mid}</div>${['Business profile','Settlement bank account','Team members','App settings'].map(x=>`<div class="mline"><span>${x}</span><b>${I('right',14,2)}</b></div>`).join('')}</div></div>`; }
function appStudio(){
  return `<div class="mob-hdr"><button class="mob-ic" onclick="A.mobTab('products')">${I('arrowL',20,2)}</button><div class="grow"><div class="mob-t">Agent Studio</div></div></div><div class="mob-body">
   <div class="mc" onclick="A.mobGo('rcprod')" style="cursor:pointer"><div class="row between"><span class="row gap8"><span class="thumb th-raahi" style="width:30px;height:30px;border-radius:8px"></span><b style="color:var(--strong)">RAY Credit</b></span>${S.installed?'<span class="mb mb-g">INSTALLED</span>':'<span class="mb mb-n">NEW</span>'}</div><div class="small muted mt8">Decide credit using how buyers actually repay across the Razorpay network.</div></div>
   ${[['th-ab','Abandoned Cart Recovery','Recover carts on WhatsApp'],['th-set','Settlement Insights','Daily settlement summaries']].map(a=>`<div class="mc"><span class="row gap8"><span class="thumb ${a[0]}" style="width:30px;height:30px;border-radius:8px"></span><b style="color:var(--strong)">${a[1]}</b></span><div class="small muted mt8">${a[2]}</div></div>`).join('')}</div>`;
}
function appRcProd(){
  return `<div class="mob-hdr"><button class="mob-ic" onclick="A.mobGo('studio')">${I('arrowL',20,2)}</button><div class="grow"><div class="mob-t">RAY Credit</div></div></div><div class="mob-body">
   <div class="mob-h">RAY Credit</div><div class="small muted mt4">Network-powered credit intelligence for B2B distributors</div>
   <div class="small mt12" style="color:var(--text);line-height:1.5">RAY Credit combines your own ledger and payment history with consented repayment signals across participating Razorpay distributors to recommend credit limits, spot deterioration early, and guide collections.</div>
   <div class="mc mt12">${['Recommend credit limits and terms, with reasons','Spot buyers whose repayment is weakening','Match payments to invoices before anyone is chased'].map(x=>`<div class="row gap8 small mt4" style="align-items:flex-start"><span style="color:var(--g);flex-shrink:0">${I('check',14,2.4)}</span>${x}</div>`).join('')}</div>
   <div class="col gap8 mt12">${S.installed?`<button class="mbtn p" onclick="A.mobGo('rc')">Open RAY Credit</button>`:`<button class="mbtn p" onclick="A.mobSheet('install')">Install</button>`}</div></div>`;
}
function appSupport(){ return `${appTop('Support')}<div class="mob-body"><div class="mc">${['Raise a ticket','Chat with us','Help articles'].map(x=>`<div class="mline"><span>${x}</span><b>${I('right',14,2)}</b></div>`).join('')}</div></div>`; }
function appAccount(){ return `${appTop('Account')}<div class="mob-body"><div class="mc"><b class="mc-t">${M.name}</b><div class="xs muted">${M.owner} · ${M.mid}</div>${['Business profile','Settlement bank account','Team members','App settings'].map(x=>`<div class="mline"><span>${x}</span><b>${I('right',14,2)}</b></div>`).join('')}</div></div>`; }
/* ---------- RAY Credit (inside the app) ---------- */
function rcHdr(sub){
  const m=S.mob, tabs=[['rc','Overview'],['portfolio','Portfolio'],['actions','Actions'],['ask','Ask RAY']];
  const back=m.tab==='products'?"A.mobGo('rcprod')":"A.mobTab('home')", n=mobActionCount();
  return `<div class="mob-hdr" style="border-bottom:0"><button class="mob-ic" onclick="${back}">${I('arrowL',20,2)}</button><div class="grow"><div class="mob-t">RAY Credit</div><div class="xs muted">${sub||'In Razorpay · '+M.name}</div></div><span class="mob-ray">${clover(13)} RAY</span></div>
   <div class="rc-tabs">${tabs.map(([k,l])=>`<button class="${m.scr===k?'on':''}" onclick="A.mobGo('${k}')">${l}${k==='actions'&&n?`<i>${n}</i>`:''}</button>`).join('')}</div>`;
}
const mobActionCount = () => CREQ.filter(r=>!S.req[r.id]).length + Object.keys(FAILS).filter(failOpen).length + Object.keys(PAYREV).filter(prPending).length;
const mrowT = (fn,title,sub,right='') => `<button class="mrow" onclick="${fn}"><div class="grow" style="text-align:left;min-width:0"><div class="mrow-t">${title}</div><div class="mrow-s">${sub}</div></div>${right}${I('right',16,2)}</button>`;
function subHdr(title,back){ return `<div class="mob-hdr"><button class="mob-ic" onclick="A.mobGo('${back}')">${I('arrowL',20,2)}</button><div class="grow"><div class="mob-t">${title}</div><div class="xs muted">RAY Credit</div></div><span class="mob-ray">${clover(13)} RAY</span></div>`; }
const mobBand = b => `<span class="mb ${b==='Watch'?'mb-a':b==='Risky'?'mb-r':b==='Reliable'?'mb-g':'mb-n'}">${b.toUpperCase()}</span>`;
function mobHome(){
  const pr=Object.keys(PAYREV).filter(prPending);
  return `${rcHdr()}<div class="mob-body">
   <div class="mstats mc" style="margin-top:0"><div><b>${lakhs(pfStats().outstanding)}</b><span>Outstanding</span></div><div><b>${lakhs(pfStats().dueThisWeek)}</b><span>Due this week</span></div><div><b>87%</b><span>Collection rate</span></div></div>
   <div class="mc"><div class="row between"><b class="mc-t">Credit requests</b><span class="xs muted">${reqOpen()} need a decision</span></div>
    ${CREQ.map(r=>`<button class="mrow" onclick="A.mobGo('request','${r.id}')"><div class="grow" style="text-align:left"><div style="font-weight:600;color:var(--strong)">${chem(r.id).name}</div><div class="xs muted">Asked for ${inr(r.amt)}</div></div>${S.req[r.id]?'<span class="mb mb-n">DECIDED</span>':((v)=>`<span class="verdict sm v-${v.tone}">${v.verdict}</span>`)(reqV(r))}${I('right',16,2)}</button>`).join('')}</div>
   <div class="mc"><div class="row between"><b class="mc-t">Upcoming collections</b><span class="xs muted">${lakhs(pfStats().autoThisWeek)} this week</span></div>
    ${['arora','mehta','chawla'].map(id=>`<button class="mrow" onclick="A.mobGo('coll','${id}')"><div class="grow" style="text-align:left"><div style="font-weight:600;color:var(--strong)">${chem(id).name}</div><div class="xs muted">${inr(UPCOMING[id].amt)} · ${collMethod(id).m} · due ${UPCOMING[id].due}</div></div>${collSt(id)==='received'||collSt(id)==='paidbank'?'<span class="mb mb-g">PAID</span>':'<span class="mb mb-n">SCHEDULED</span>'}${I('right',16,2)}</button>`).join('')}</div>
   <div class="mc" style="${failCount()?'border-color:#f3c9c4':''}"><div class="row between"><b class="mc-t">Failed collections</b><span class="xs muted">${failCount()} need recovery</span></div>
    ${Object.keys(FAILS).map(id=>`<button class="mrow" onclick="A.mobGo('recover','${id}')"><div class="grow" style="text-align:left"><div style="font-weight:600;color:var(--strong)">${chem(id).name}</div><div class="xs muted">${inr(FAILS[id].amt)} · ${FAILS[id].m==='eNACH'?'eNACH failed':'Autopay failed'}</div></div>${failOpen(id)?'<span class="mb mb-r">RECOVER</span>':'<span class="mb mb-n">IN PROGRESS</span>'}${I('right',16,2)}</button>`).join('')}</div>
   <div class="mc"><div class="row between"><b class="mc-t">Payment review</b><span class="xs muted">${pr.length} to reconcile</span></div>
    ${S.bank.st==='on'?mrowT("A.mobGo('bank')",'Bank feed','ICICI ••4821 connected · 7 new today','<span class="mb mb-g">LIVE</span>'):''}
    ${pr.slice(0,3).map(id=>`<button class="mrow" onclick="A.mobGo('pay','${id}')"><div class="grow" style="text-align:left"><div style="font-weight:600;color:var(--strong)">${chem(id).name}</div><div class="xs muted">${inr(PAYREV[id].amt)} · ${id==='verma'?'Reminder paused':id==='citycare'?'Cheque recorded':'Payment not confirmed'}</div></div>${I('right',16,2)}</button>`).join('')||'<div class="xs muted mt8">All payments reconciled.</div>'}</div>
   ${(()=>{ const L=slipLines(); return `<div class="mc"><div class="row between"><b class="mc-t">${L.length} buyers starting to slip</b><a class="link xs" onclick="A.mobGo('portfolio')">See all</a></div>
    ${L.slice(0,2).map(r=>`<button class="mrow" onclick="A.mobGo('buyer','${r.id}')"><div class="grow" style="text-align:left"><div style="font-weight:600;color:var(--strong)">${r.name}</div><div class="xs muted">${r.you} · ${r.due}</div></div>${mobBand(recOf(r.id).band)}${I('right',16,2)}</button>`).join('')}</div>`; })()}
   ${S.bank.st==='on'?'':`<div class="mc" style="border-color:#c9dafb"><b class="mc-t">Confirm every payment before you chase</b><div class="xs muted mt4">Connect your business bank account so RAY can confirm incoming payments.</div><button class="mbtn p mt8" onclick="A.closeMobile();A.bankStart()">Connect bank account</button></div>`}
  </div>`;
}
function mobRecover(id){ return `${subHdr('Smart recovery','rc')}<div class="mob-body"><div class="mc" style="margin-top:0">${recBody(id,true)}</div></div>`; }
function mobColl(id){ return `${subHdr('Scheduled collection','rc')}<div class="mob-body"><div class="mc" style="margin-top:0">${collBody(id,true)}</div></div>`; }
function mobRequest(id){
  const r=creq(id), c=chemView(chem(id)), g=S.gupta, d=S.req[id], on=netOn();
  const sig=reqSignals(r);
  const v=reqV(r), rr_=v.rec; const rec=v.verdict==='DO NOT EXTEND YET'?['Do not extend additional credit yet.',`Recommended limit ${inr(rr_.recommendedLimit)} · ${rr_.recommendedTerms} days. ${v.next||''}`]:v.verdict==='EXTEND'?[`Extend the ${inr(r.amt)} order.`,`Suggested total limit ${inr(rr_.recommendedLimit)} on ${rr_.recommendedTerms}-day terms.`]:[`Supply ${inr(r.amt)} on shorter terms.`,`${rr_.recommendedTerms} days instead of ${curTermsOf(id)}.`];
  const acts = d?`<div class="mc ok"><b style="color:var(--g)">${REQ_DONE[d]}</b><div class="xs muted mt4">Logged in Activity. RAY has not messaged the buyer.</div></div>`
   : id==='gupta'?`<button class="mbtn p" onclick="A.approveGupta()">Approve ${inr(g.limitRec)} limit · ${g.terms} days</button><button class="mbtn" onclick="A.mobSheet('follow')">Start collection follow-up</button><button class="mbtn" onclick="A.mobSheet('keep')">Keep current terms</button><button class="mbtn g" onclick="A.mobSheet('contact')">Contact buyer</button>`
   : id==='arora'?`<button class="mbtn p" onclick="A.reqDecide('arora','extended')">Extend ${inr(r.amt)} credit</button><button class="mbtn g" onclick="A.mobSheet('contact')">Contact buyer</button>`
   : `<button class="mbtn p" onclick="A.reqDecide('mehta','offered')">Offer ${recOf('mehta').recommendedTerms}-day terms</button><button class="mbtn" onclick="A.reqDecide('mehta','kept')">Keep ${curTermsOf('mehta')}-day terms</button>`;
  return `${subHdr('Credit request','rc')}<div class="mob-body">
   <div class="row between"><div><div class="mob-h">${c.name}</div><div class="xs muted mt4">${reqSrc()} · ${r.at}</div></div>${mobBand(c.band)}</div>
   <div class="mc mt12"><div class="xs muted">Incoming request</div><div class="mob-amt">${inr(r.amt)} additional credit</div><div class="small mt4">Requested terms: <b style="color:var(--strong)">${id==='gupta'?'Payment Monday':r.terms}</b></div><div class="mquote mt8">“${r.msg}”</div></div>
   <div class="mgrid mt8"><div><span>Outstanding</span><b>${inr(c.out)}</b></div><div><span>Limit</span><b>${inr(c.limit)}</b></div><div><span>RAY limit</span><b style="color:var(--link)">${inr(recOf(id).recommendedLimit)}</b></div></div>
   ${id==='gupta'?netMobile('gupta'):''}
   <div class="mc mt8" id="mob-why"><b class="mc-t">Why RAY recommends this</b>${uwMobile(id)}${on?`<div class="xs muted mt8">${I('lock',11)} Network signal is consented and aggregated. No other distributor is shown.</div>`:''}</div>
   <div class="mc mt8 rec-m"><div class="row between"><b class="mc-t">RAY recommendation</b>${verdictChip(r)}</div><div class="mob-say mt8">${rec[0]}</div><div class="small mt4" style="color:var(--strong)">${rec[1]}</div></div>
   <div class="col gap8 mt12">${acts}</div>
   <div class="xs muted mt12" style="text-align:center">RAY never replies to buyers about credit without your approval.</div>
  </div>`;
}
function mobBuyer(id){
  const c=chemView(chem(id)), p=pfView(c), on=netOn(), rq=creq(id);
  const why=recOf(id).signalContributions.filter(x=>x.points>0||(x.key==='network'&&recOf(id).network.eligible)).sort((a,b)=>b.points-a.points).slice(0,4).map(x=>[x.label.replace('Average days to pay vs usual','Payment delay').replace(' (last 3 invoices)',''),x.observed]);
  if(!why.length) why.push(['Days to pay',`${c.usual}d → ${c.delay}d`],['Limit used',Math.round(c.out/Math.max(1,c.limit)*100)+'%'],['Razorpay network signal',on?p.net:'Not enabled']);
  return `${subHdr('Buyer profile','portfolio')}<div class="mob-body">
   <div class="row between"><div class="mob-h">${c.name}</div>${mobBand(c.band)}</div><div class="xs muted mt4">${c.area}, Ludhiana · customer since ${c.since}</div>
   <div class="mgrid mt12"><div><span>Outstanding</span><b>${inr(c.out)}</b></div><div><span>Limit</span><b>${inr(c.limit)}</b></div><div><span>RAY limit</span><b style="color:var(--link)">${p.rec?inr(p.rec):'No change'}</b></div></div>
   ${netMobile(id)}
   <div class="mc mt8"><b class="mc-t">Why</b>${why.map(s=>`<div class="mline"><span>${s[0]}</span><b>${s[1]}</b></div>`).join('')}</div>
   <div class="mc mt8"><div class="row between"><b class="mc-t">Repayment</b>${methodChip(id)}</div>${FAILS[id]?`<div class="mline"><span>${FAILS[id].inv} · ${inr(FAILS[id].amt)}</span><b style="color:var(--r)">${failOpen(id)?'Debit failed':'Recovering'}</b></div>`:''}${PLAN[id]?`<div class="mline"><span>${PLAN[id].inv} · ${inr(PLAN[id].amt)}</span><b>Due ${PLAN[id].d} Oct</b></div>${planSteps(id).map(x=>`<div class="mline"><span class="xs">${dayLbl(x[0])} · ${x[1]}</span><b class="xs" style="font-weight:500">${x[3]?x[3].replace(/<[^>]+>/g,'').trim():''}</b></div>`).join('')}`:''}${FAILS[id]?`<button class="mbtn ${failOpen(id)?'p':''} sm mt8" onclick="A.mobGo('recover','${id}')">${failOpen(id)?'Start recovery':'View recovery'}</button>`:''}</div>
   <div class="col gap8 mt12">${rq&&!S.req[id]?`<button class="mbtn p" onclick="A.mobGo('request','${id}')">Review credit request</button>`:''}${id==='gupta'&&S.gupta.rec==='open'?`<button class="mbtn ${recChanged('gupta')?'p':''}" onclick="A.approveGupta()">Set future limit to ${inr(S.gupta.limitRec)}</button>`:''}${S.chase[id]&&S.chase[id].st==='draft'?`<button class="mbtn ${rq&&!S.req[id]?'':'p'}" onclick="A.mobSheet('follow:${id}')">${ctaLabel(chaseOf(id))}</button>`:''}<button class="mbtn g" onclick="A.closeMobile();go('raahi/buyer/${id}')">Open full profile on desktop</button></div>
  </div>`;
}
function mobPortfolio(){
  const f=S.mob.f||'All', ids=['gupta','chawla','arora','mehta','jain','singh','citycare','bansal','sethi','sharma'];
  const list=ids.map(i=>chemView(chem(i))).filter(c=>f==='All'||c.band===f);
  const k=n=>n>=100000?lakh(n):'₹'+Math.round(n/1000)+'K';
  return `${rcHdr()}<div class="mob-body">
   <div class="mchips">${['All','Watch','Risky','Reliable'].map(b=>`<button class="${f===b?'on':''}" onclick="S.mob.f='${b}';mobRender()">${b}</button>`).join('')}</div>
   ${list.map(c=>{const p=pfView(c), nw=netOn()&&!!recOf(c.id).networkStep; return `<button class="pf-m" onclick="A.mobGo('buyer','${c.id}')"><div class="row between"><b class="pf-n">${c.name}</b>${mobBand(c.band)}</div>
    <div class="row between mt4" style="align-items:baseline"><span class="pf-o">${inr(c.out)} <span>outstanding</span></span>${nw?'<span class="mb" style="background:#efeafb;color:#5b3fb8">NETWORK</span>':''}</div>
    <div class="pf-g"><div><span>Limit</span><b>${k(c.limit)}</b></div><div><span>Recommended</span><b style="${p.rec?'color:var(--link)':''}">${p.rec?k(p.rec):'No change'}</b></div><div><span>Collection</span><b>${collMethod(c.id).m}</b></div></div>
    <div class="pf-x">${p.next}${I('right',14,2)}</div></button>`}).join('')}
  </div>`;
}
function mobActions(){
  const card=(t,rows)=>rows.length?`<div class="mc"><b class="mc-t">${t}</b>${rows.join('')}</div>`:'';
  const cr=CREQ.filter(r=>!S.req[r.id]).map(r=>mrowT(`A.mobGo('request','${r.id}')`,chem(r.id).name,`${inr(r.amt)} requested`,((v)=>`<span class="verdict sm v-${v.tone}">${v.verdict}</span>`)(reqV(r))));
  const up=['mehta','chawla'].filter(id=>!['received','paidbank'].includes(collSt(id))).map(id=>mrowT(`A.mobGo('coll','${id}')`,chem(id).name,`${inr(UPCOMING[id].amt)} · ${collMethod(id).m} · due ${UPCOMING[id].due}`,'<span class="mb mb-n">SCHEDULED</span>'));
  const fl=Object.keys(FAILS).filter(failOpen).map(id=>mrowT(`A.mobGo('recover','${id}')`,chem(id).name,`${inr(FAILS[id].amt)} · ${FAILS[id].reason}`,'<span class="mb mb-r">FAILED</span>'));
  const pr=Object.keys(PAYREV).filter(prPending).map(id=>mrowT(`A.mobGo('pay','${id}')`,chem(id).name,`${inr(PAYREV[id].amt)} · ${PAYREV[id].dueTxt}`,`<span class="mb mb-a">${id==='verma'?'PAUSED':id==='citycare'?'CHEQUE':'UNCONFIRMED'}</span>`));
  const ew=CHASE.filter(c=>c.kind==='Early follow-up'&&S.chase[c.id].st==='draft').map(c=>mrowT(`A.mobSheet('follow:${c.id}')`,chem(c.id).name,`${inr(c.amt)} · ${c.id==='chawla'?'slipping with other distributors':c.id==='gupta'?'due 12 Oct':'due in 3 days'}`,'<span class="mb mb-a">FOLLOW UP</span>'));
  const all=[card('Credit decisions',cr),card('Upcoming collections',up),card('Failed collections',fl),card('Payment review',pr),card('Early warnings',ew)].join('');
  return `${rcHdr()}<div class="mob-body">${all||'<div class="mc">Nothing waiting for you.</div>'}<div class="xs muted mt12" style="text-align:center">One decision at a time. Bulk review stays on desktop.</div></div>`;
}
function mobBank(){
  const b=S.bank;
  if(b.st!=='on') return `${subHdr('Bank feed','rc')}<div class="mob-body"><div class="mc" style="border-color:#c9dafb;margin-top:0"><b class="mc-t">Confirm every payment before you chase</b><div class="small muted mt4">Connect your business bank account through RazorpayX Connected Banking+ so RAY can confirm incoming payments.</div><button class="mbtn p mt12" onclick="A.closeMobile();A.bankStart()">Connect bank account</button></div></div>`;
  const st=r=>r.st==='matched'?'<span class="mb mb-g">MATCHED</span>':r.st==='suggested'?'<span class="mb mb-a">SUGGESTED</span>':r.st==='notrecv'?'<span class="mb mb-n">EXCLUDED</span>':'<span class="mb mb-n">UNIDENTIFIED</span>';
  return `${subHdr('Bank feed','rc')}<div class="mob-body"><div class="mc" style="margin-top:0"><div class="row gap8"><span style="color:var(--g)">${I('bank',18,2)}</span><b class="mc-t">${BANK_FULL}</b></div><div class="xs muted mt4">Last synced ${b.last} · RazorpayX Connected Banking+</div></div>
   <div class="mc">${bankRows().map(r=>`<div class="bk-r"><div class="row between"><b class="num" style="color:var(--strong)">${inr(r.amt)}</b>${st(r)}</div><div class="xs muted mt4">${r.payer} · ${r.d==='Today'?'':'Yest. '}${r.t}</div>${r.st==='matched'&&r.to?`<div class="xs mt4" style="color:var(--strong)">${chem(r.to).name} · ${r.inv}</div>`:''}${r.st==='suggested'?`<div class="row between mt8"><span class="xs" style="color:var(--strong)">Likely ${chem(r.to).name} · ${r.inv}</span><button class="mbtn p sm" style="width:auto;padding:0 14px;height:32px" onclick="A.mobBankConfirm('${r.id}')">Confirm</button></div>`:''}${r.st==='unid'?`<div class="xs mt8" style="color:var(--link);font-weight:600">Assign on desktop</div>`:''}</div>`).join('')}</div></div>`;
}
A.mobBankConfirm=(id)=>{ const r=S.bank.rows.find(x=>x.id===id); bankMatch(r,r.to,r.inv,true); mobRender(); };
/* ---------- RAY conversational view ---------- */
const MOB_Q=['Gupta ko ₹50,000 aur credit de doon?','Gupta ka payment kya hua?','Mehta ka paisa aaya?','Kaun buyers slip kar rahe hain?'];
function mobAnswer(q){ const g=S.gupta; q=q.toLowerCase();
  if(q.includes('mehta')) return collSt('mehta')==='received'?'Yes. ₹30,000 was collected through UPI Autopay at 10:42 AM and matched to INV-24812.':'Not yet. ₹30,000 against INV-24812 is scheduled for UPI Autopay tomorrow, 6 Oct.';
  if(q.includes('gupta')&&/kya hua/.test(q)) return S.rec.gupta.st==='part'||S.rec.gupta.st==='learned'?'₹5,000 came in through the partial-payment link and is matched to INV-24790. ₹15,000 is still due.':`₹20,000 against INV-24790 was due on 3 Oct.\nUPI Autopay attempt failed due to insufficient balance.\n${S.rec.gupta.st==='sent'?'The partial-payment link has been sent.':'I’ve prepared a partial-payment link.'}`;
  if(q.includes('gupta')&&/aaya|paid|payment/.test(q)) return g.paidVia?`Yes. ₹19,200 was received at 10:37 AM and matched to INV-24891. ₹19,200 is still due Monday.`:`Not yet. Nothing from Gupta Traders in Razorpay${S.bank.st==='on'?' or your bank feed':''} today. ₹38,400 is due in 7 days.`;
  if(q.includes('gupta')) return `Gupta Traders is on ${g.band}. ${reqV(creq('gupta')).verdict==='DO NOT EXTEND YET'?'I would not extend additional credit right now.':'Additional credit fits the recommended limit.'}\n\n${guptaWhyLines(3).join(' · ')}.\nRecommended limit ${inr(g.limitRec)} · ${g.terms}-day terms (same as desktop).`;
  if(/slip/.test(q)) { const L=slipLines(); return `${L.length} buyers are showing weaker repayment behaviour than usual: ${L.map(r=>r.name).join(', ')}.`; }
  return MOB_FALLBACK; }
const MOB_FALLBACK='I can help with credit, collections and payments. Try asking about a buyer.';
A.mobAsk=(q)=>{ const m=S.mob; m.chat.push({me:true,t:q}); const ans=mobAnswer(q);
  if(ans===MOB_FALLBACK){ const c={t:'',pending:true}; m.chat.push(c); mobRender();
    askRay(q,'mob').then(res=>{ c.pending=false; if(res.fallback) c.t=ans+(res.note?'\n\n'+res.note:''); else { c.t=res.answer+(res.flags.length?'\n\n'+res.flags.join(' '):''); c.acts=res.actions.filter(a=>a.mob); c.ai=true; }
      if(S.mob===m) mobRender(); const b=document.querySelector('.mob-body'); if(b) b.scrollTop=b.scrollHeight; }); }
  else m.chat.push({t:ans,link:q.toLowerCase().includes('gupta')&&!/aaya|kya hua/.test(q.toLowerCase()),rec:q.toLowerCase().includes('gupta')&&/kya hua/.test(q.toLowerCase())});
  mobRender(); const b=document.querySelector('.mob-body'); if(b) b.scrollTop=b.scrollHeight; const i=document.querySelector('.ask-in'); if(i) i.focus(); };
function mobAsk(){
  const m=S.mob;
  return `${rcHdr()}<div class="mob-body ask-body"><div class="ask-intro"><span class="mob-ray">${clover(13)} RAY</span><div class="small muted mt8">Ask about any buyer, payment or credit decision.</div></div>
   ${m.chat.map(c=>c.me?`<div class="ask-me">${esc(c.t)}</div>`:`<div class="ask-ray">${c.pending?thinking('Checking your data…'):esc(c.t).replace(/\n/g,'<br>')}${(c.acts||[]).map(a=>`<button class="link xs mt8" style="display:block" onclick="A.mobGo('${a.mob[0]}','${a.mob[1]||''}')">${esc(a.label)}</button>`).join('')}${c.ai?`<div class="xs muted mt8">${clover(10)} Answered by Claude from your RAY data</div>`:''}${c.link?`<button class="link xs mt8" style="display:block" onclick="A.mobGo('request','gupta')">Review credit request</button>`:''}${c.rec?`<button class="link xs mt8" style="display:block" onclick="A.mobGo('recover','gupta')">Review recovery</button>`:''}</div>`).join('')}
   ${m.chat.length?'':`<div class="xs muted mt16" style="font-weight:600;letter-spacing:.04em">TRY ASKING</div><div class="col gap6 mt8">${MOB_Q.map(q=>`<button class="ask-chip" onclick="A.mobAsk(this.textContent)">${q}</button>`).join('')}</div>`}</div>
   <div class="ask-bar"><input class="ask-in" placeholder="Ask RAY…" onkeydown="if(event.key==='Enter'&&this.value.trim()){A.mobAsk(this.value.trim())}"><button class="ask-send" onclick="const i=document.querySelector('.ask-in');if(i.value.trim())A.mobAsk(i.value.trim())">${I('send',16,2.2)}</button></div>`;
}
/* ---------- bottom sheets ---------- */
function mobSheetHtml(t){
  const [k,id]=t.split(':'); let h='';
  if(k==='follow'){ const bid=id||'gupta', st=S.chase[bid];
    h=`<b class="mc-t">Start collection follow-up?</b><div class="xs muted mt4">${chem(bid).name} · WhatsApp via RAY · payment link included</div><div class="mquote mt8">${esc(st.msg)}</div><div class="xs muted mt8">RAY checked Razorpay payments${S.bank.st==='on'?', your bank feed':''} and salesperson collections. No matching payment found.</div><button class="mbtn p mt12" onclick="A.mobFollow('${bid}')">Send follow-up</button>`; }
  else if(k==='keep') h=`<b class="mc-t">Keep current terms?</b><div class="small mt8">Gupta Traders stays at ${inr(S.gupta.limit)} on ${S.gupta.curTerms}-day terms. The ₹50,000 request is not extended. RAY will not message the buyer.</div><button class="mbtn p mt12" onclick="A.mobSheet(null);A.reqDecide('gupta','kept')">Keep current terms</button>`;
  else if(k==='contact') h=`<b class="mc-t">Contact ${chem(S.mob.id||'gupta').name}</b><div class="col gap8 mt12"><button class="mbtn" onclick="A.mobSheet(null);toast('Calling +91 98••••4410')">${I('phone',16,2)} Call +91 98••••4410</button><button class="mbtn" onclick="A.mobSheet(null);toast('Opening your WhatsApp chat')">${I('chat',16,2)} Message on WhatsApp</button></div><div class="xs muted mt8">You talk to the buyer. RAY does not share its recommendation with them.</div>`;
  else if(k==='match') h=`<b class="mc-t">Confirm this payment?</b><div class="mgrid mt8" style="grid-template-columns:1fr 1fr"><div><span>Amount</span><b>₹26,500</b></div><div><span>Received</span><b>Yesterday 6:10 PM</b></div></div><div class="small mt8">RAY suggests <b>Verma Retail · INV-24655</b>. Exact amount, payer seen before.</div><button class="mbtn p mt12" onclick="A.mobMatch()">Confirm match</button><button class="mbtn g mt8" onclick="A.mobSheet(null)">Not this buyer</button>`;
  else if(k==='install') h=`<b class="mc-t">Install RAY Credit</b><div class="col gap6 mt12 small">${['Connect ledger · Marg (demo connector)','Connect bank account · ICICI ••4821, Connected Banking+','Choose mode · Review first'].map((x,i)=>`<div class="row gap8"><span class="mb mb-n">${i+1}</span>${x}</div>`).join('')}</div><div class="xs muted mt8">Sensitive decisions always require approval.</div><button class="mbtn p mt12" onclick="A.mobInstall()">Install RAY Credit</button>`;
  if(k==='pr') h=S.mob.prHtml||'';
  return `<div class="msheet-bg" onclick="if(event.target===this)A.mobSheet(null)"><div class="msheet"><span class="msheet-grip"></span>${h}</div></div>`;
}
function mobPay(id){ return `${subHdr('Review payment','actions')}<div class="mob-body"><div class="mc" style="margin-top:0">${prBody(id,true)}</div></div>`; }
A.mobInstall=()=>{ ensureBank(); S.installed=true; log({ic:'agent',ti:'RAY Credit installed from the Razorpay app',de:'Marg (demo connector) · bank connected · Review first',src:['led'],who:'Installed by '+M.owner+' · RAY Credit for Mobile'}); S.mob.sheet=null; S.mob.tab='products'; A.mobGo('rc'); rr(); toast('RAY Credit is ready'); };
A.mobFollow=(id)=>{ const c=chaseOf(id), ch=chem(id); S.chase[id].st='sent'; S.chase[id].at=nowT(); log({ic:'send',ti:`Early follow-up sent to ${ch.name}`,de:`WhatsApp · ${inr(c.amt)} · payment link ${LINK(id)}`,src:['conv'],who:'Approved by '+M.owner+' · RAY Credit for Mobile',chem:ch.name});
  if(id==='gupta'&&!S.req.gupta){ S.req.gupta='follow'; log({ic:'shield',ti:'Credit request from Gupta Traders: not extended · follow-up started',de:'₹50,000 requested on WhatsApp · RAY recommended do not extend yet · buyer not messaged by RAY',src:['conv','led'],who:'Decided by '+M.owner+' · RAY Credit for Mobile',chem:'Gupta Traders'}); }
  S.mob.sheet=null; rr(); mobRender(); toast('Follow-up sent to '+ch.name); if(id==='gupta') guptaReplySoon(); };
A.mobMatch=()=>{ S.vermaMatched=true; S.chase.verma.st='matched'; log({ic:'match',ti:'₹26,500 matched to INV-24655',de:'Verma Retail · reminder cancelled, no longer due',src:['rzp','led'],who:'Confirmed by '+M.owner+' · RAY Credit for Mobile',chem:'Verma Retail'}); S.mob.sheet=null; rr(); mobRender(); toast('Payment matched · reminder cancelled'); };

/* ---------- prototype surface switcher (demo navigation only) ---------- */
function surfRender(){
  const r=document.getElementById('surf-root'); if(!r) return;
  const wa=!!document.getElementById('wa-root').innerHTML, mob=!!S.mob, cur=mob?'mob':wa?'wa':'desk';
  r.innerHTML=`<div class="surf"><span class="surf-l" onclick="A.about()" title="About this demo: what is real and what is simulated">Concept prototype ${I('info',11,2.2)}</span><button class="${cur==='desk'&&!['raahi/checks','raahi/how'].includes(route())?'on':''}" onclick="A.surf('desk')">Desktop</button><button class="${cur==='wa'?'on':''}" onclick="A.surf('wa')">RAY on WhatsApp</button><button class="${cur==='mob'?'on':''}" onclick="A.surf('mob')">RAY Credit for Mobile</button><button class="${cur==='desk'&&route()==='raahi/how'?'on':''}" onclick="A.surf('desk');go('raahi/how')">How it works</button><button class="${cur==='desk'&&route()==='raahi/checks'?'on':''}" onclick="A.surf('desk');go('raahi/checks')">Checks</button></div>`;
}
A.surf=(k)=>{ if(k==='desk'){ A.closeWA(); A.closeMobile(); } else if(k==='wa') A.openWA(); else { if(!S.installed){ S.installed=true; ensureBank(); rr(); } A.openMobile('rc'); } surfRender(); };
hooks.push(()=>surfRender());
