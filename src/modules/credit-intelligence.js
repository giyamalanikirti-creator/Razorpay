/* ================= CREDIT INTELLIGENCE: header, Overview, Credit Portfolio, buyer profile ================= */
/* Razorpay network signal is a concept capability: optional, opt-in, never required for a recommendation. */
/* network bands per buyer, straight from the synthetic dataset (aggregated, no distributor names) */
const NET = Object.fromEntries(RayData.ALL.filter(b=>b.network&&b.network.baseLow!=null&&!b.synthetic).map(b=>[b.id,{was:`${b.network.baseLow}–${b.network.baseHigh} days`, now:`${b.network.nowLow}–${b.network.nowHigh} days`, n:b.network.coverage}]).concat([['newlife',{avg:RayData.NEW_BUYER.network.avgDays+' days', n:RayData.NEW_BUYER.network.coverage}]]));
const netOn = () => !!S.ctl.net;
const NET_TIP = 'Uses consented, aggregated repayment behaviour across participating distributors. Other distributors’ names, invoices and transactions are never shown.';
const netLock = () => `<span class="tt" style="vertical-align:-2px">${I('lock',13)}<span class="tip" style="white-space:normal;width:280px">${NET_TIP}</span></span>`;
const conceptChip = () => `<span class="concept">Consented</span>`;
const srcRow = (a) => `<span class="row gap8 wrap">${a.map(s=>`<span class="src ${s[0]}">${s[1]}</span>`).join('')}</span>`;
const stage = s => `<span class="stage">${s}</span>`;
A.netInfo=()=>modal({title:'How the Razorpay network protects data',body:`<p class="muted">RAY learns how a buyer repays other distributors on Razorpay, without revealing who they are.</p><div class="col gap8 mt12">${['Other distributors’ names, invoices and transactions are never shown','Signals are aggregated and privacy-preserving, shown only as bands such as “weakening”','Uses a buyer’s pattern only where that buyer has consented','Participation can be turned off anytime in Controls','Requires merchant participation, privacy safeguards and compliance validation before launch'].map(x=>`<div class="row gap8 small" style="align-items:flex-start"><span style="color:var(--g);margin-top:1px;flex-shrink:0">${I('check',14,2.4)}</span>${x}</div>`).join('')}</div>`,actions:[{label:'Got it',cls:'btn-p',fn:()=>{closeModal(); if(S.inst&&!S.installed) instRender();}}]});

/* portfolio intelligence per buyer: recommended future limit, optional network signal, next step */

function curLimit(c){ return curLimitOf(c.id); }
function pfView(c){
  const NX={'Salesperson visit':'Assign to salesperson','Salesperson follow-up':'Assign to salesperson','Routine reminder':'Send reminder','WhatsApp reminder':'Send reminder','Promise due today':'Send reminder','Collect before supply':'Collect on delivery','Match payment':'Review payment'};
  const r=recOf(c.id), d=decOf(c.id); const out={net:netLabel(r), rec:null, next:NX[c.next]||c.next};
  const pending=['reduce','increase'].includes(r.action)&&(!d||d.status==='baseline'||recChanged(c.id));
  if(pending) out.rec=r.recommendedLimit;
  if(c.synthetic){ out.next=pending?(r.recommendedLimit>c.limit?'Raise limit':'Review credit'):r.action==='terms'?'Review terms':'No action'; return out; }
  if(c.id==='gupta'){ const g=S.gupta; out.next=g.rec==='open'?'Review credit':failOpen('gupta')?'Start recovery':S.chase.gupta.st==='draft'?'Start early follow-up':'Monitor'; return out; }
  if(c.id==='newlife'){ if(c.unchecked){ out.net=NET_STATE_LABEL[sigOf('newlife').consent]||'Pending consent'; out.next='Run credit check'; } else out.next='First order'; return out; }
  if(c.id==='verma') out.next=S.vermaMatched?'Paid · matched':'Review payment';
  if(c.id==='guptak'){ const k=kirS(); out.next=!k.kind?(k.sent?'Waiting for retailer':'Send payment link'):k.kind==='dispute'?'Review dispute':k.commit==='pending'?'Approve payment plan':'Track commitment'; }
  if(c.id==='arora') out.next='No action';
  if(c.id==='mehta') out.next=collSt('mehta')==='received'?'No action':'Autopay tomorrow';
  if(c.id==='chawla') out.next=S.chase.chawla.st==='draft'?'Start early follow-up':'eNACH tomorrow';
  if(['lifeline','goyal'].includes(c.id)) out.next=prPending(c.id)?'Review payment':'No action';
  if(c.id==='citycare') out.next=r.action==='verify'?'Verify GST status':prPending('citycare')?'Review payment':'Send reminder';
  if(pending&&c.id!=='citycare') out.next=c.id==='bansal'?'Collect on delivery':out.rec>c.limit?'Raise limit':'Review credit';
  if(r.action==='terms'&&!pending&&c.id!=='mehta') out.next='Review terms';
  if(invsOf(c.id).some(i=>i.claim&&i.bal>0)) out.next='Reconcile claimed payment';
  if(typeof creq==='function'&&creq(c.id)&&!S.req[c.id]) out.next='Review credit request';
  return out;
}
const netBadge = n => `<span class="badge ${n==='Weakening'?'b-a':n==='Improving'?'b-g':'b-n'}">${n}</span>`;
const trendCell = t => t==='up'?`<span class="trend up">${I('tup',15,2)} Worsening</span>`:t==='down'?`<span class="trend down">${I('tdown',15,2)} Improving</span>`:t==='dispute'?`<span class="badge b-n">${I('receipt',11,2.2)} Dispute</span>`:`<span class="trend flat">${I('minus',15,2)} Stable</span>`;
const guptaDue = () => { const i=invOf('gupta','INV-24891'); if(!i||i.bal<=0) return {badge:'<span class="badge b-g">INV-24891 paid</span>', txt:'Paid', short:'paid'};
  const d=RayDates.diffDays(S.today,i.due); const on=RayDates.fmtShort(i.due); const od=sigOf('gupta').maxOverdueDays, oi=nextDueInv('gupta');
  if(d<=0&&od>0) return {badge:`<span class="badge b-r">${oi.inv} ${od} day${od===1?'':'s'} overdue</span>`, txt:d===0?`due today · ${on}`:`in ${-d} days · ${on}`, short:d===0?'due today':`due in ${-d} days`};
  return d>0?{badge:`<span class="badge b-r">${d} day${d===1?'':'s'} overdue</span>`, txt:`${d} day${d===1?'':'s'} overdue · ${on}`, short:`overdue since ${on}`}:{badge:'<span class="badge b-a">Not overdue yet</span>', txt:d===0?`due today · ${on}`:`in ${-d} days · ${on}`, short:d===0?'due today':`due in ${-d} days`}; };
/* ---------- workspace header + page heads ---------- */
function raahiHeader(tab){
  const tabs=[['overview','Overview'],['portfolio','Credit Portfolio'],['actions','Actions',openCount()],['activity','Activity'],['controls','Controls']];
  const on=k=> tab===k || (k==='portfolio'&&['buyer','check'].includes(tab)) || (k==='overview'&&tab==='request') || (k==='actions'&&['payment','collect','recover','invoice'].includes(tab));
  return `<div class="crumb"><a onclick="go('studio')">Agent Studio</a>${I('right',13,2)}<a onclick="go('studio/my')">My Agents</a>${I('right',13,2)}<b>RAY Credit</b></div>
  <div class="vhead"><span class="thumb lg th-raahi"></span>
   <div class="grow"><div class="row gap8"><span class="h1" style="font-size:26px">RAY Credit</span>${S.paused?'<span class="badge b-n">'+I('pause',11,2.4)+' Paused</span>':'<span class="badge b-g"><span class="dot"></span>Active</span>'}<span class="pill-beta">Beta</span></div>
    <div class="row gap16 mt4 wrap"><span class="muted" style="font-size:14.5px">Network-powered credit intelligence for B2B distributors</span>
     <span class="row gap6"><span class="conn-chip">${svc('rzp')}Razorpay<span class="ok"></span></span><span class="conn-chip">${svc('marg')}Marg ERP <span class="xs faint">demo</span><span class="ok" style="${S.stale?'background:#d7962f':''}"></span></span><span class="conn-chip">${svc('wa')}WhatsApp<span class="ok"></span></span>${S.bank.st==='on'?`<span class="conn-chip"><span class="svc" style="background:#eaf1fe;color:var(--link)">${I('bank',11,2.2)}</span>ICICI bank account<span class="ok"></span></span>`:`<button class="conn-chip" style="border-color:#f1dfb8;background:#fffaf0" onclick="A.bankStart()"><span class="svc" style="background:#fff1dc;color:#9a5b00">${I('bank',11,2.2)}</span>Bank not connected · <b style="color:var(--link)">Connect</b></button>`}</span></div></div>
   <div class="row gap8"><button class="btn btn-wa" onclick="A.openWA()">${I('chat',16,2.2)} RAY on WhatsApp</button><button class="btn btn-s" style="padding:0 10px" onclick="popMenu(this,[['hist','View audit trail',()=>go('raahi/activity')],['gear','Controls',()=>go('raahi/controls')],['pause',S.paused?'Resume RAY':'Pause RAY',()=>A.pauseToggle()]],'',true)" data-menu>${I('more',18)}</button></div>
  </div>
  <div class="tabs mt20">${tabs.map(([k,l,n])=>`<button class="${on(k)?'on':''}" onclick="go('raahi/${k}')">${l}${n?`<span class="tcount">${n}</span>`:''}</button>`).join('')}</div>`;
}
function pageHead(t,sub,right=''){ return `<div class="phead mt24"><div class="grow"><div class="h2" style="font-size:22px">${t}</div><div class="sub" style="font-size:14.5px;margin-top:4px">${sub}</div></div>${right?`<div class="row gap8">${right}</div>`:''}</div>`; }
const goSec = (r,id) => { go(r); setTimeout(()=>{const e=document.getElementById(id); e&&e.scrollIntoView({behavior:'smooth',block:'start'})},140); };

/* ---------- counts shared by Overview and Actions ---------- */
function decisionsOpen(){ return [!S.newLife, S.gupta.rec==='open'].filter(Boolean).length; }
function unsafeCount(){ return (S.vermaMatched?0:1)+(S.jainReviewed?0:1); }
function bankPending(){ return S.bank.ever ? S.bank.rows.filter(r=>['r3','r4','r5'].includes(r.id)&&['suggested','unid'].includes(r.st)).length : 3; }
function pendingMatches(){ return ['verma','lifeline','goyal','citycare'].filter(prPending).length+bankPending(); }
function reviewCount(){ return ['verma','lifeline','goyal','citycare'].filter(prPending).length; }

/* ---------- OVERVIEW: network first, then the credit lifecycle in four cards ---------- */
function vOverview(){
  const p=reviewCount(), on=netOn(), st=pfStats(), slip=st.slipping, nf=slip.filter(netFirst).length;
  const k=(v,l,s,extra='')=>`<div class="kpi"><div class="small muted" style="font-weight:500">${l}</div><div class="kpi-v num">${v}</div><div class="xs muted">${s}</div>${extra}</div>`;
  const ewText=id=>{ const s=sigOf(id), r=recOf(id), n=BUY[id].network; if(r.networkStep&&r.networkStep.kind==='uncorroborated') return [`On time with you · slipping with ${n.coverage} other distributors`,'Caught by network'];
    return [`Paying you ${s.usual} → ${s.delay} days${r.networkStep&&n&&n.firstSlowed?' · slowed with other distributors first':r.networkStep?' · also slowing elsewhere':''}`, r.networkStep&&n&&n.firstSlowed?'Network saw it first':r.networkStep?'Network agrees':'']; };
  const dueTxt=id=>{ const i=nextDueInv(id); if(!i) return 'Nothing due'; const d=RayDates.diffDays(i.due,S.today); return `${inr(i.bal-(i.disputed||0))} ${d<0?`${-d}d overdue`:d===0?'due today':d===1?'due tomorrow':'due '+RayDates.fmtShort(i.due)}`; };
  const row=(id,ic,tone,t,s,btn)=>`<div class="ov-row" ${id?`id="${id}"`:''}><span class="ov-ic" style="${tone}">${I(ic,16,2)}</span><div class="grow"><div style="font-weight:600;color:var(--strong)">${t}</div><div class="small muted mt4">${s}</div></div>${btn}</div>`;
  const mehta=collSt('mehta')==='received';
  const commits=S.promises.filter(x=>x.status==='confirmed'), cAmt=commits.reduce((a,x)=>a+((x.first&&!x.first.paid&&x.first.amt)||0)+((x.later&&x.later.amt)||0),0);
  const collected=S.led.events.filter(e=>RayEvents.MONEY_IN.includes(e.type)&&e.verification==='verified').reduce((a,e)=>a+(e.amount||0),0);
  const top=slip.slice(0,3), rest=slip.slice(3);
  return `${brokenAlert(true)}
  ${pageHead('Overview',on?'Credit decisions powered by how your buyers repay across Razorpay':'Credit decisions, collections and payment status across your buyers')}
  <div class="card kpis mt16">
   ${k(lakhs(st.outstanding),'Credit outstanding',`${st.buyers} buyers · ${st.openInvoices.toLocaleString('en-IN')} open invoices · synced 8:45 AM`)}
   ${k(lakhs(st.dueThisWeek),'Due this week',`${RayDates.fmtDay(S.today)} to ${RayDates.fmtDay(RayDates.addDays(S.today,6))}`)}
   ${k(lakhs(st.attention),'Exposure needing attention',`Due within 14 days from ${slip.length} slipping buyer${slip.length===1?'':'s'}`)}
   ${k(WEEK.pct+'%','Collection rate',`Last week · ${lakhs(WEEK.lastCollected)} of ${lakhs(WEEK.lastDue)}${collected?` · ${lakhs(collected)} collected today`:''}`,`<div class="progress mt8"><i style="width:${WEEK.pct}%"></i></div>`)}
  </div>
  ${kirNotif()}
  ${netOverviewCard()}
  ${reqSection()}
  <div class="card mt16" id="ov-ew"><div class="sec-h"><div><div class="row gap8">${stage('MONITOR')}<span class="h3" style="font-size:17px">${slip.length} buyer${slip.length===1?' is':'s are'} starting to slip</span></div><div class="small muted mt4">${on&&nf?`${nf} of ${slip.length} were flagged from the Razorpay network before your own data showed it.`:'Repayment slowing against each buyer’s own usual pattern.'}</div></div><button class="btn btn-s btn-sm" onclick="goSec('raahi/actions','grp-early')">Review early warnings</button></div>
   ${top.map(id=>{ const [t,nm]=ewText(id); return `<div class="ov-row" style="padding:12px 20px;cursor:pointer" onclick="go('raahi/buyer/${id}')"><div style="width:240px;flex-shrink:0;white-space:nowrap"><b style="color:var(--strong)">${chem(id).name}</b> ${bandBadge(recOf(id).band)}</div><div class="grow small" style="color:var(--text)">${t}</div>${nm?netMark(nm):''}<div class="small" style="font-weight:600;color:var(--strong);white-space:nowrap;width:160px;text-align:right">${dueTxt(id)}</div>${I('right',16,2)}</div>`; }).join('')}
   ${rest.length?`<div class="xs muted" style="padding:10px 20px;border-top:1px solid var(--border-subtle)">Also: ${rest.map(id=>chem(id).name).join(', ')} · <a class="link" onclick="goSec('raahi/actions','grp-early')">see all ${slip.length}</a></div>`:''}</div>
  <div class="card mt16" id="ov-coll"><div class="sec-h"><div><div class="row gap8">${stage('COLLECT')}<span class="h3" style="font-size:17px">Collections this week</span></div><div class="small muted mt4">Collected within authorised mandates, recovered when a debit fails, and reconciled before anyone is chased.</div></div></div>
   ${row('ov-up','refresh','background:var(--blue-tint);color:var(--link)',`${lakhs(st.autoThisWeek)} scheduled for automatic collection`,`${st.autoDebitsThisWeek} debits within authorised mandates · ${mehta?'Mehta Enterprises collected and matched automatically':'Mehta Enterprises ₹30,000 tomorrow'} · ${collSt('arora')==='paidbank'?'Arora Retail paid by NEFT, autopay cancelled':'Arora Retail today'}`,`<button class="btn btn-s btn-sm" onclick="goSec('raahi/actions','grp-upcoming')">View collections</button>`)}
   ${commits.length?row('ov-commit','cal','background:var(--blue-tint);color:var(--link)',`${commits.length} payment commitment${commits.length===1?'':'s'} confirmed · ${inr(cAmt)} expected`,commits.map(x=>`${chem(x.buyerId).name}${x.later&&x.later.date?' by '+RayDates.fmtShort(x.later.date):''}`).join(' · ')+' · expected, not guaranteed',`<button class="btn btn-s btn-sm" onclick="goSec('raahi/actions','grp-upcoming')">View</button>`):''}
   ${row('ov-fail','alert',failOpen('gupta')?'background:var(--r-bg);color:var(--r)':'background:var(--n-bg);color:var(--n)',failOpen('gupta')?'Gupta Traders · ₹20,000 · UPI Autopay failed':`Gupta Traders · recovering ${inr(balOf('gupta','INV-24790'))}`,failOpen('gupta')?'Insufficient balance · RAY recommends a payment link that allows partial payment':recStatus('gupta').replace(/<[^>]+>/g,''),failOpen('gupta')?`<button class="btn btn-p btn-sm" onclick="go('raahi/recover/gupta')">Start recovery</button>`:`<button class="btn btn-s btn-sm" onclick="go('raahi/recover/gupta')">View recovery</button>`)}
   ${kirOverviewRow()}
   ${row('ov-pay','match',p?'background:#fff1dc;color:#9a5b00':'background:var(--g-bg);color:var(--g)',p?`${p} payment${p===1?' needs':'s need'} reconciliation`:'Payments reconciled',p?`${['verma','lifeline','goyal','citycare'].filter(prPending).map(i=>chem(i).name).join(', ')} · confirm payment first, chase second${S.bank.st==='on'?'':' · bank account not connected'}`:'Nothing to review',`<button class="btn btn-s btn-sm" onclick="goSec('raahi/actions','grp-check')">Review payments</button>`)}
   ${kirForecastRow()}</div>
  <div class="mt16">${outcomesCard()}</div>`;
}
function useAnywhere(){ return `<div class="card mt16"><div class="sec-h"><div><div class="h3">Use RAY anywhere</div><div class="small muted mt4">The same RAY Credit intelligence on desktop, mobile and WhatsApp.</div></div></div>
   <div class="grid g2" style="gap:0"><div class="any"><span class="any-ic wa">${I('chat',20,2.2)}</span><div class="grow"><b>RAY on WhatsApp</b><div class="small muted mt4">Ask questions, receive alerts, and share buyer credit requests.</div></div><button class="btn btn-s btn-sm" onclick="A.openWA()">Open WhatsApp</button></div>
   <div class="any" style="border-left:1px solid var(--border-subtle)"><span class="any-ic mob">${I('phone',20,2)}</span><div class="grow"><b>RAY Credit for Mobile</b><div class="small muted mt4">Review credit decisions and act from the Razorpay app.</div></div><button class="btn btn-s btn-sm" onclick="A.openMobile('rc')">Open Mobile App</button></div></div></div>`; }
/* ---------- CREDIT PORTFOLIO ---------- */
A.actOn=(id)=>{ CHASE.forEach(c=>S.chase[c.id].open=(c.id===id)||!!c.held); go('raahi/actions'); setTimeout(()=>{const e=document.getElementById('chase-'+id); e&&e.scrollIntoView({behavior:'smooth',block:'center'})},140); };

function allChems(){ return [chemView(NEWLIFE),...CHEM.map(chemView),...GENV.map(chemView)]; }
function chemRows(){
  let list=allChems(); const on=netOn();
  const f=S.cf; if(f.band!=='All') list=list.filter(c=>c.band===f.band&&!c.unchecked);
  if(f.q) list=list.filter(c=>c.name.toLowerCase().includes(f.q.toLowerCase()));
  list.sort((a,b)=>(a.id==='newlife'?-2e9:(a.synthetic?0:-1e9)-a.out)-(b.id==='newlife'?-2e9:(b.synthetic?0:-1e9)-b.out));
  if(!list.length) return `<tr><td colspan="8"><div class="empty">No buyers match these filters.</div></td></tr>`;
  const lim=(f.page||1)*40, shown=list.slice(0,lim); let divider=false;
  const rows=shown.map(c=>{
   const p=pfView(c); let pre='';
   if(c.synthetic&&!divider){ divider=true; pre=`<tr class="pf-div"><td colspan="8"><span class="xs muted">Other buyers · generated synthetic records (seeded) · same policy engine</span></td></tr>`; }
   const cell1=`<td><div class="row gap8"><span class="nm">${c.name}</span>${c.isNew?'<span class="pill-new">New</span>':''}${c.synthetic?'<span class="xs faint">generated</span>':''}${S.ctl.dnc.map(x=>x.toLowerCase()).includes(c.name.toLowerCase())?`<span class="tt">${I('ban',13)}<span class="tip">Do not contact</span></span>`:''}</div><div class="row gap6 mt4">${c.synthetic?'':idChips(c.id)}<span class="xs muted">${c.area}</span></div></td>`;
   const nx=`<td><span class="link small" style="font-weight:600">${p.next}</span></td>`;
   const fl=FAILS[c.id]&&failOpen(c.id), u=UPCOMING[c.id];
   const netc=`<td>${methodChip(c.id, fl?['Failed '+FAILS[c.id].on.split(', ')[1].split(' · ')[0],'r-txt']:u&&!['received','paidbank'].includes(collSt(c.id))?['Next debit '+u.due]:c.id==='gupta'?['Next debit 12 Oct']:null)}</td>`;
   if(c.unchecked) return pre+`<tr class="click" onclick="go('raahi/check')">${cell1}<td><span class="badge b-n">Unrated</span></td><td class="r muted">–</td><td class="r muted">–</td><td class="r"><span class="small muted">${inr(recOf('newlife').recommendedLimit)} starter</span></td><td class="muted">–</td>${netc}${nx}</tr>`;
   const rec=(p.rec?`<span class="num" style="font-weight:600;color:var(--link)">${inr(p.rec)}</span>`:'<span class="small muted">No change</span>')+(on&&recOf(c.id).networkStep?`<div class="mt4">${netMark('Network')}</div>`:'');
   return pre+`<tr class="click" onclick="go('raahi/buyer/${c.id}')">${cell1}<td>${bandBadge(c.band)}</td><td class="r num nm">${inr(c.out)}</td><td class="r num">${inr(c.limit)}</td><td class="r">${rec}</td><td>${trendCell(c.trend)}</td>${netc}${nx}</tr>`});
  return rows.join('')+(list.length>lim?`<tr><td colspan="8" style="text-align:center"><button class="btn btn-s btn-sm" onclick="event.stopPropagation();S.cf.page=(S.cf.page||1)+1;render()">Show 40 more · ${list.length-lim} remaining</button></td></tr>`:'');
}
function vPortfolio(){
  const all=allChems(), on=netOn(), st=pfStats(); const cnt=b=>b==='All'?all.length:all.filter(c=>c.band===b&&!c.unchecked).length;
  return `${pageHead('Credit Portfolio',netOn()?'Exposure, repayment and collection method for every buyer, with network signals where buyers have consented.':'Monitor credit exposure and repayment behaviour across your buyers.',`<button class="btn btn-p" onclick="go('raahi/check')">${I('plus',16,2)} Check new buyer</button>`)}
  <div class="card mt20" id="pf-table"><div class="sec-h"><div><div class="h3">All buyers</div><div class="small muted mt4">Every row is evaluated by the same policy engine (${POL.version}). Recommended limits are pending your approval.</div></div>
    <div class="row gap8"><div class="searchbox" style="width:180px">${I('search',16)}<input class="input" placeholder="Search buyer" value="${esc(S.cf.q)}" oninput="S.cf.q=this.value;S.cf.page=1;document.getElementById('chem-body').innerHTML=chemRows()"></div>${['All','Reliable','Watch','Risky'].map(b=>`<button class="chip ${S.cf.band===b?'on':''}" onclick="S.cf.band='${b}';S.cf.page=1;render()">${b} <span class="cnt">${cnt(b)}</span></button>`).join('')}</div></div>
   <table class="table pf"><thead><tr><th>Buyer</th><th>Risk band</th><th class="r">Outstanding</th><th class="r">Current limit</th><th class="r">Recommended limit</th><th>Repayment trend</th><th>Collection method</th><th>Next action</th></tr></thead><tbody id="chem-body">${chemRows()}</tbody></table></div>
  <div class="row between mt12 wrap gap8"><span class="small muted">${st.buyers} buyers with open dues · ${st.openInvoices.toLocaleString('en-IN')} open invoices · ${lakhs(st.outstanding)} outstanding · all synthetic: ${RayData.FEATURED.length} scenario buyers + ${RayData.GENERATED.length} generated · Marg ERP (demo connector) 8:45 AM</span><span class="row gap12">${srcRow([['led','Own ledger'],['rzp','Razorpay payment history'],['conv','Buyer conversations']])}${on?'<span class="src net">Razorpay network signal</span>':''}${S.bank.ever?'<span class="src aa">Bank account via Connected Banking+</span>':''}</span></div>`;
}
/* ---------- BUYER PROFILE · Gupta Traders ---------- */
function guptaSignals(){
  const s=sigOf('gupta'), r=recOf('gupta'), n=BUY.gupta.network;
  const out=[];
  if(r.network.eligible&&r.networkStep) out.push([`Slowed with ${n.coverage} other distributors first`,`Typical days to pay elsewhere ${n.baseLow}–${n.baseHigh} → ${n.nowLow}–${n.nowHigh} since ${n.firstSlowed}`,'About 5 weeks earlier',[['net','Razorpay network']]]);
  if(s.debit.failures60d||s.partialPayments) out.push(['Collection reliability',`${s.debit.failures60d} ${s.debit.method} failure${s.debit.failures60d===1?'':'s'} in 60 days${s.partialPayments?` · ${s.partialPayments} partial payment${s.partialPayments===1?'':'s'} (not counted against them)`:''}`,`${s.debit.failures6m} in 6 months`,[['rzp','Razorpay payment history']]]);
  out.push(['Payment behaviour deteriorated across the last 3 invoices','Each invoice was paid later than the one before',s.trajectory==='worse'?'3 of 3 slower':'Mixed',[['rzp','Razorpay payment history']]]);
  out.push(['Average payment delay increased',`Usual delay for this buyer was ${s.usual} days`,`${s.usual} → ${s.delay} days`,[['led','Own ledger'],['rzp','Smart Collect']]]);
  out.push(['Order volume fell while exposure stayed high',`Monthly orders ${lakh(s.ordersPrev)} → ${lakh(s.ordersNow)}`,`${s.ordersChangePct}% orders · ${inr(s.out)} owed`,[['led','Own ledger']]]);
  out.push(['Promise behaviour suggests near-term risk',`${s.promises.kept} kept, ${s.promises.broken} missed${s.promises.partial?`, ${s.promises.partial} part-paid`:''} · merchant-confirmed promises only`,`${s.promises.broken} of ${s.promises.made} missed`,[['conv','Buyer conversations']]]);
  return out;
}
function guptaWhyCard(){
  const g=S.gupta, r=recOf('gupta'), ap=g.rec==='approved'&&!recChanged('gupta'), on=netOn();
  const base=ap?g.prevLimit:g.limit, baseT=ap?g.prevTerms:g.curTerms;
  return `<div class="card pad why-card" id="why"><div class="row between"><div class="row gap8">${stage('ASSESS')}<span class="h2" style="font-size:19px">Why RAY changed its recommendation</span></div><span class="ai-tag">${clover(14)} RAY</span></div>
   <div class="small muted mt4">${guptaSignals().length} signals, weighed by the illustrative policy (${POL.version}). Risk index ${r.ownData.score} puts Gupta Traders on ${r.ownData.band}.</div>
   <div class="sig-list mt12">${guptaSignals().map((s,i)=>`<div class="sig"><span class="sig-n">${i+1}</span><div class="grow"><div class="sig-t">${s[0]}</div><div class="xs muted">${s[1]}</div></div><div class="sig-f num">${s[2]}</div><div class="sig-s">${srcRow(s[3])}</div></div>`).join('')}</div>
   <div class="sig-join"><span class="ln"></span><span class="xs muted">No single signal decides. Each adds points; the total sets the band. <a class="link" onclick="S.howOpen=S.howOpen||{};S.howOpen.gupta=true;goSec('raahi/buyer/gupta','how-gupta')">See every rule</a></span><span class="ln"></span></div>
   <div class="rec-box"><div class="row between"><span class="row gap8">${stage('APPROVE')}<b style="color:var(--strong)">RAY recommendation</b></span><span class="badge ${r.confidence==='High'?'b-g':'b-n'}">Confidence: ${r.confidence}</span></div>
    <div class="rec-lines mt8"><div><span class="muted">Future credit limit</span><b class="num">${inr(base)} <span class="arr">→</span> ${inr(r.recommendedLimit)}</b></div><div><span class="muted">Payment terms</span><b class="num">${baseT} days <span class="arr">→</span> ${r.recommendedTerms} days</b></div></div>
    <div class="xs muted mt8">${r.networkStep&&r.networkStep.kind==='corroborated'?`Your data alone: ${inr(r.ownData.recommendedLimit)} · ${r.ownData.recommendedTerms} days. Consented network evidence that agrees: −${Math.round(POL.limits.networkCut*100)}% and one step shorter terms.`:`Based on your ledger, Razorpay payment history and merchant-confirmed promises${on?'':' (Razorpay network off)'}.`}</div></div>
   <div class="xs faint mt12">${on?NET_LINE:'Razorpay network is off. This recommendation uses your data and Razorpay payment history only.'} An illustrative policy, not a formal credit score.</div></div>`;
}
function vProfile(id){
  if(id!=='gupta') return vProfileGeneric(id);
  const g=S.gupta, ap=g.rec==='approved'&&!recChanged('gupta'), gd=guptaDue();
  const delay=lineChart({labels:['Apr','May','Jun','Jul','Aug','Sep'],series:[{v:[8,9,8,8,15,24],c:'#d47a1f',hl:[3,4,5],label:'24 days',name:''}],yMax:30,ticks:[0,10,20,30],fmt:v=>v+'d',baseline:{v:8.5,lo:8,hi:9,label:'Usual 8–9d'},unit:''});
  const od=lineChart({labels:['Apr','May','Jun','Jul','Aug','Sep'],series:[{v:[1.20,1.22,1.18,1.05,0.94,0.84],c:'#1364f1',label:'Orders',name:'Orders',dy:-9},{v:[0.74,0.76,0.77,0.79,0.78,0.784],c:'#8a96a0',label:'Dues',name:'Dues',dy:9}],yMax:1.5,ticks:[0,0.5,1,1.5],fmt:v=>v===0?'₹0':'₹'+(+v).toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+'L'});
  const outcome=(g.promise==='paid')?`<div class="alert ok mt16" id="outcome"><span class="ic">${I('match',17,2)}</span><div class="grow"><div class="row gap8">${stage('LEARN')}<h4>Repayment outcome recorded</h4></div><div class="small muted mt4">${inr(g.paidAmt||19200)} received ${g.paidVia==='bank'?'from guptatraders@okhdfc':'through Razorpay Smart Collect'} and matched to INV-24891 after the early follow-up. ${inr(g.oldest)} still due${openPromise('gupta')&&openPromise('gupta').later?' by '+RayDates.fmtDay(openPromise('gupta').later.date):''}. RAY added this outcome to Gupta Traders’ repayment record.</div></div>${g.paidVia==='bank'?'<span class="src aa">Bank account via Connected Banking+</span>':'<span class="src rzp">Razorpay payment history</span>'}</div>`:'';
  return `<div class="crumb mt20" style="margin-bottom:0"><a onclick="go('raahi/portfolio')">${I('arrowL',14,2)} Credit Portfolio</a></div>
  ${brokenAlert(false)}${outcome}
  <div class="card pad mt16"><div class="row between" style="align-items:flex-start"><div><span class="lbl">Buyer profile</span><div class="row gap8 mt4"><span class="h1" style="font-size:24px">Gupta Traders</span>${bandBadge(g.band)}${gd.badge}</div><div class="muted mt4">Customer since May 2024 · 2.4 years · Model Town, Ludhiana</div></div></div>
   <div class="row gap24 mt20" style="align-items:stretch">
    <div class="kv"><span class="k">Outstanding</span><span class="v num">${inr(g.out)}</span><span class="xs muted">${Math.round(g.out/g.limit*100)}% of current limit</span></div><div class="vdiv"></div>
    <div class="kv"><span class="k">Current limit</span><span class="v num">${inr(g.limit)}</span><span class="xs muted">${ap?'Set today · '+g.curTerms+'-day terms':g.curTerms+'-day terms'}</span></div><div class="vdiv"></div>
    <div class="kv"><span class="k">Recommended future limit</span><span class="v num" style="color:var(--link)">${inr(g.limitRec)}</span><span class="xs muted">${ap?'Applied':'Pending your approval'}</span></div><div class="vdiv"></div>
    <div class="kv"><span class="k">Recommended terms</span><span class="v num">${g.terms} days</span><span class="xs muted">From ${ap?g.prevTerms:g.curTerms} days</span></div><div class="vdiv"></div>
    <div class="kv"><span class="k">Next due</span><span class="v num">${inr(g.oldest)}</span><span class="xs" style="color:${g.alert?'var(--r)':'var(--a)'};font-weight:500">${gd.txt}</span></div><div class="vdiv"></div>
    <div class="kv"><span class="k">Collection method</span><span style="height:28px;display:flex;align-items:center">${methodChip('gupta')}</span><span class="xs muted">Up to ${inr(collMethod('gupta').max)}</span></div>
   </div></div>
  ${netVsYou('gupta')}
  ${whatChangedCard('gupta')}
  ${failOpen('gupta')||S.rec.gupta.st?`<div class="alert ${failOpen('gupta')?'risk':'neutral'} mt16"><span class="ic">${I(failOpen('gupta')?'alert':'refresh',17)}</span><div class="grow"><div class="row gap8 wrap">${stage('RECOVER')}<h4>${failOpen('gupta')?'UPI Autopay failed on 3 Oct · ₹20,000 · insufficient balance':'Recovery in progress · INV-24790'}</h4></div><div class="small muted mt4">${failOpen('gupta')?'Not marked as defaulted. RAY recommends a payment link that allows partial payment.':recStatus('gupta').replace(/<[^>]+>/g,'')+'. Credit decision kept under review.'}</div></div><button class="btn ${failOpen('gupta')?'btn-p':'btn-s'} btn-sm" onclick="go('raahi/recover/gupta')">${failOpen('gupta')?'Start recovery':'View recovery'}</button></div>`:''}
  <div class="grid g-21 mt16">${guptaWhyCard()}${recCard()}</div>
  ${howPanel('gupta')}
  <div class="mt16">${planCard('gupta')}</div>
  ${invTable('gupta')}
  ${outcomeCard('gupta')}
  ${interpCard('gupta')}
`;
}
function overLimitNote(out,lim){ const d=out-lim; return d>0?`<div class="ol-note mt12"><span style="color:var(--a);flex-shrink:0">${I('info',15,2)}</span><span>Currently <b class="num">${inr(d)}</b> above the proposed limit. RAY will flag any additional credit request for approval. Existing supply is not paused automatically.</span></div>`:`<div class="ol-note mt12"><span style="color:var(--g);flex-shrink:0">${I('check',15,2.4)}</span><span>Outstanding is within the proposed limit. Existing supply is not paused automatically.</span></div>`; }
function recCard(){
  const g=S.gupta, risky=g.band==='Risky';
  const foot=`<div class="xs muted mt12 row gap4">${I('lock',12)} RAY never changes a limit or pauses supply without your approval.</div>`;
  const what=`<div class="lbl mt16">If you approve</div><div class="col gap8 mt8 small">${[`Future limit ${inr(g.limitRec)} on ${g.terms}-day terms for new invoices`,'Any additional credit request is flagged for your approval','Follow-up starts 7 days before each due date',risky?`Collect ${inr(g.oldest)} before the next delivery`:'Existing deliveries continue as usual'].map(x=>`<div class="row gap8" style="align-items:flex-start"><span style="color:var(--link);margin-top:2px;flex-shrink:0">${I('check',13,2.4)}</span><span>${x}</span></div>`).join('')}</div>`;
  if(g.rec==='approved') return `<div class="card pad rec"><div class="row between"><span class="lbl">Your decision</span><span class="badge b-g">${I('check',11,2.6)} Future limit set</span></div>
   <div class="say mt12">Future limit ${inr(g.limit)} · ${g.curTerms}-day terms.</div>
   ${overLimitNote(g.out,g.limit)}
   <div class="xs muted mt12">Set by ${M.owner} · ${g.approvedVia||'Dashboard'} · ${g.approvedAt||'5 Oct'}</div>
   <button class="btn btn-g btn-sm mt8" onclick="A.undoGupta()">Undo</button>${foot}</div>`;
  if(g.rec==='kept') return `<div class="card pad rec"><div class="row between"><span class="lbl">Your decision</span><span class="badge b-n">Current limit kept</span></div><div class="say mt12">You kept ${inr(g.limit)} on ${g.curTerms}-day terms.</div><div class="muted small mt8">RAY recorded this as an override and will learn from the outcome. It keeps watching Gupta Traders.</div><button class="btn btn-s btn-sm mt16" onclick="S.gupta.rec='open';rr()">Show recommendation again</button>${foot}</div>`;
  return `<div class="card pad rec"><div class="row between"><span class="lbl">Your decision</span>${S.later.gupta?'<span class="badge b-n">Saved for later</span>':''}</div>
   <div class="mt12">${netCompare('gupta')}</div>
   <div class="say mt12">${risky?`Lower the future limit to ${inr(g.limitRec)} and collect ${inr(g.oldest)} before the next delivery.`:'Keep supplying, with lower future exposure, shorter terms and earlier follow-up.'}</div>
   ${overLimitNote(g.out,g.limitRec)}
   ${what}
   <div class="col gap8 mt20"><button class="btn btn-p" onclick="A.approveGupta()" ${blocked()?'disabled':''}>Set future limit to ${inr(g.limitRec)}</button><div class="row gap8"><button class="btn btn-s grow" onclick="A.keepLimit()">Keep current limit</button><button class="btn btn-g grow" onclick="S.later.gupta=true;rr();toast('Saved for later · stays in Credit decisions')">Review later</button></div></div>
   ${foot}</div>`;
}

/* ---------- RAY on WhatsApp nudge ---------- */
function waNudge(){
  if(typeof surfRender==='function') surfRender();
  const r=document.getElementById('wa-nudge'); if(!r) return;
  const open=!!document.getElementById('wa-root').innerHTML||!!document.getElementById('mob-root').innerHTML, aa=!!document.getElementById('aa-root').innerHTML;
  if(open||aa){ r.innerHTML=''; return; }
  const u=S.wa.unread;
  r.innerHTML=`<button class="wa-nudge ${u?'pulse':''}" onclick="A.openWA()" aria-label="RAY on WhatsApp">${I('chat',22,2.2)}${u?`<i class="wcnt">${u}</i>`:''}<span class="wtip">RAY on WhatsApp${u?` · morning brief`:''}</span></button>`;
}
hooks.push(()=>waNudge());
