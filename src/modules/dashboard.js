/* ================= DASHBOARD PAGES ================= */
const PAYS = [
 ['pay_Q8hT2nVb4LmR1a','Malhotra Traders','+91 98140 •• 211',18450,'UPI','9:08 AM'],
 ['pay_Q8hR9kXc1PwN7e','Dhillon Stores','+91 98722 •• 905',32600,'NEFT','8:51 AM'],
 ['pay_Q8hQ4mZa8TyB3s','Grewal Retail','+91 99880 •• 448',9800,'UPI','8:37 AM'],
 ['pay_Q8hO7wLd5VeK2u','City Mart','+91 98155 •• 760',24300,'Card','8:20 AM'],
 ['pay_Q8hM1rJf6XaH9q','Ahuja Store','+91 97810 •• 332',15750,'UPI','8:02 AM'],
 ['pay_Q8hK3pGh2ZcD5w','Khanna Traders','+91 98760 •• 119',21480,'UPI','7:46 AM'],
];
function payTable(rows){
  return `<table class="table"><thead><tr><th>Payment ID</th><th>Customer</th><th class="r">Amount</th><th>Method</th><th>Status</th><th>Created at</th></tr></thead><tbody>${rows.map(p=>`<tr class="click" onclick="toast('Payment ${p[0]} · captured')"><td class="num" style="color:var(--link);font-weight:500">${p[0]}</td><td><div class="nm">${p[1]}</div><div class="xs muted">${p[2]}</div></td><td class="r num nm">${inr(p[3])}</td><td>${p[4]}</td><td><span class="badge b-g">Captured</span></td><td class="muted">Today, ${p[5]}</td></tr>`).join('')}</tbody></table>`;
}
function overviewCards(){
  return `<div class="row between"><div class="row gap8"><span class="h3" style="font-size:17px">Overview</span><button class="link" style="font-size:17px;font-weight:500" onclick="toast('Showing today')">Today ${I('down',16,2)}</button></div><a onclick="toast('Opens Razorpay docs')" class="link" style="font-weight:500">Documentation ${I('ext',15)}</a></div>
  <div class="card pad mt16"><div class="row gap6" style="font-weight:600;color:var(--strong)">Collected Amount <span class="tt">${I('info',15)}<span class="tip">Captured payments today</span></span></div><div class="big mt12 num" style="font-size:44px">₹1,42,380<span style="font-size:24px">.00</span></div><div class="muted mt8" style="font-size:15px">from 37 captured payments</div></div>
  <div class="grid g3 mt16">
   ${[['refresh','Refunds','₹0','.00','0 processed','#1364f1'],['alert','Disputes','₹0','.00','0 open · 0 under-review','#b3261e'],['x','Failed','4','','payments','#b3261e']].map(c=>`<div class="card pad" style="cursor:pointer" onclick="go('transactions')"><div class="row between"><div class="row gap6" style="font-weight:600;color:var(--strong)"><span style="color:${c[5]}">${I(c[0],18)}</span>${c[1]} <span class="tt">${I('info',14)}<span class="tip">Today</span></span></div><span style="color:var(--link)">${I('right',20,2)}</span></div><div class="mid mt12 num">${c[2]}<span style="font-size:17px">${c[3]}</span></div><div class="muted mt4">${c[4]}</div></div>`).join('')}
  </div>`;
}
function pgHome(){
  return `<div class="page fadein">${overviewCards()}
  <div class="tabs mt32"><button class="on">Payments</button><button onclick="go('transactions')">Orders</button></div>
  <div class="card mt16">${payTable(PAYS.slice(0,5))}</div></div>`;
}
function pgTransactions(){
  return `<div class="page fadein">${overviewCards()}
  <div class="tabs mt32"><button class="on">Payments</button><button onclick="toast('Orders · 41 today')">Orders</button></div>
  <div class="row mt16 gap8"><div class="searchbox" style="width:280px">${I('search',16)}<input class="input" placeholder="Search by payment ID or customer"></div><button class="btn btn-s">${I('filter',15)} Filters</button><div class="grow"></div><button class="btn btn-s">${I('dl',15)} Download</button></div>
  <div class="card mt12">${payTable(PAYS)}</div></div>`;
}
function pgSettlements(){
  const rows=[['setl_Q8a1Lp4RkX','Today, 5:00 PM (expected)','₹1,38,920','Scheduled','b-n'],['setl_Q7zK2mQ9wE','Sat, 3 Oct','₹1,96,410','Settled','b-g'],['setl_Q7v8Jn3YtB','Fri, 2 Oct','₹1,52,775','Settled','b-g'],['setl_Q7r1Hc6PuZ','Thu, 1 Oct','₹2,08,300','Settled','b-g']];
  return `<div class="page fadein"><div class="h1">Settlements</div><div class="sub">Funds from captured payments are settled to ICICI Bank ••4821 on a T+1 cycle.</div>
  <div class="card mt24"><table class="table"><thead><tr><th>Settlement ID</th><th>Date</th><th class="r">Amount</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td style="color:var(--link);font-weight:500">${r[0]}</td><td>${r[1]}</td><td class="r nm num">${r[2]}</td><td><span class="badge ${r[4]}">${r[3]}</span></td></tr>`).join('')}</tbody></table></div></div>`;
}
function pgReports(){
  const rc=(t,d)=>`<div class="card" style="padding:22px 24px"><div class="row gap16"><span style="width:44px;height:44px;border-radius:50%;background:var(--blue-tint);color:var(--link);display:grid;place-items:center">${I('bank',22)}</span><span class="h3" style="font-size:16px">${t}</span></div><hr class="hr mt16"><p class="muted mt16" style="font-size:14.5px;line-height:1.6">${d}</p><a class="link mt16" style="font-weight:500" onclick="toast('Report queued · you’ll find it in Downloads')">${I('dl',16)} Download Report</a></div>`;
  return `<div class="page fadein"><div class="row between" style="align-items:flex-start"><div><div class="h1" style="font-size:30px">Reports</div><div class="sub">Generate &amp; schedule reports for all your business transactions, settlements &amp; subscriptions</div></div><div class="row gap16"><a class="link" style="font-weight:500">Documentation ${I('ext',15)}</a><button class="btn btn-s">${I('clock',16)} Schedule report</button><button class="btn btn-p">${I('dl',16)} Download report</button></div></div>
  <div class="tabs mt24"><button class="on">Overview</button><button>Downloads</button><button>Schedules</button></div>
  <div class="row between mt24"><div class="seg"><button class="on">Standard Reports</button><button>Custom Reports</button><button>All Reports</button></div><a class="link" style="font-weight:500;font-size:15px">${I('plus',16)} Create Custom Report</a></div>
  <div class="lbl mt24" style="font-size:13px">Settlements</div>
  <div class="grid mt12" style="grid-template-columns:repeat(2,minmax(0,440px))">${rc('Settlements','This report provides a list of the settlement(s) in selected time range. It does not include details of the transactions that were settled.')}${rc('Settlement Recon','This report provides a detailed list of all transactions (payments, refunds, and adjustments) against every settlement in the selected range.')}</div>
  <div class="lbl mt24" style="font-size:13px">Payments</div>
  <div class="grid mt12" style="grid-template-columns:repeat(2,minmax(0,440px))">${rc('Payments','All payments created in the selected time range, with method, status, fees and tax.')}${rc('Refunds','All refunds processed in the selected time range, with original payment references.')}</div></div>`;
}
function pgPlaceholder(a){
  const names={banking:'Banking+',payroll:'Payroll','payment-links':'Payment Links','payment-pages':'Payment Pages','razorpay-me':'Razorpay.me Link',settings:'Account & Settings',partners:'Partners',company:'Company Registration'};
  return `<div class="page fadein"><div class="h1">${names[a]||'Page'}</div><div class="card pad mt24" style="max-width:640px"><div class="row gap16"><span style="width:40px;height:40px;border-radius:10px;background:var(--canvas);display:grid;place-items:center;color:var(--muted)">${I('info',20)}</span><div><div class="h3">Outside the RAY prototype</div><div class="muted mt4">This part of the dashboard isn’t mocked. Use Agent Studio or Ray AI to continue the demo.</div></div></div><div class="row gap8 mt16"><button class="btn btn-p" onclick="go('studio')">Open Agent Studio</button><button class="btn btn-s" onclick="go('ray')">Open Ray AI</button></div></div></div>`;
}

/* ================= AGENT STUDIO ================= */
const AGENTS = [
 {id:'cart', th:'th-cart', name:'Abandoned Cart Conversion', partners:['superU','nugget'], out:'Recover 25%+ abandoned carts with Voice AI', svc:['rzp','shop','wa'], cats:['Grow Revenue'], desc:'Reaches customers via AI voice call + WhatsApp within 30 minutes of abandonment, pre-creates a payment link, and follows up if the call is missed.'},
 {id:'dispute', th:'th-disp', name:'Dispute Responder', out:'Fight disputes with a 70%+ win rate', svc:['rzp','shop','mail'], cats:['Reduce Losses'], desc:'Auto-responds to chargebacks with optimised evidence to maximise dispute win rates.'},
 {id:'subs', th:'th-sub', name:'Subscription Recovery', out:'Recover 40%+ failed subscription payments', svc:['rzp','mail','wa','sms'], cats:['Grow Revenue','Reduce Losses'], desc:'Analyses failed subscription payments, applies smarter retry logic and triggers targeted customer nudges.'},
 {id:'raahi', th:'th-raahi', name:'RAY Credit', tag:'New', out:'Decide credit using how buyers actually repay across the Razorpay network.', sub:'Network-powered credit intelligence for B2B distributors', svc:['rzp','marg','tally','wa'], cats:['Reduce Losses','Manage Cash','Get Insights']},
 {id:'cash', th:'th-cash', name:'Cashflow Forecaster', out:'Predict cash position 3–7 days ahead', svc:['rzp','bank'], cats:['Manage Cash','Get Insights'], desc:'Predicts your cash position 3–7 days ahead with alerts for payroll risk, shortfalls and payout failures.'},
 {id:'settle', th:'th-set', name:'Settlement Insights', out:'Get a daily settlement summary on WhatsApp', svc:['rzp','wa'], cats:['Get Insights','Manage Cash'], desc:'Sends a daily settlement summary via WhatsApp so you can track payouts without checking dashboards.'},
];
function svc(k){return {rzp:`<span class="svc rzp" title="Razorpay"><img src="${MARK}" alt="" style="height:11px"></span>`,wa:`<span class="svc wa" title="WhatsApp">${I('chat',11,2.4)}</span>`,marg:'<span class="svc marg" title="Marg ERP">M</span>',tally:'<span class="svc tally" title="Tally">T</span>',shop:'<span class="svc shop" title="Store">S</span>',mail:`<span class="svc mail" title="Email">${I('send',10,2.2)}</span>`,sms:'<span class="svc sms" title="SMS">✉</span>',bank:`<span class="svc mail" title="Bank">${I('bank',10,2.2)}</span>`}[k]||''}
function studioTabs(t){return `<div class="row between" style="border-bottom:1px solid var(--divider)"><div class="tabs" style="border:0">${[['home','Home'],['my','My Agents'],['connectors','Connectors']].map(([k,l])=>`<button class="${t===k?'on':''}" onclick="go('studio${k==='home'?'':'/'+k}')">${l}</button>`).join('')}</div><span class="pill-beta">Beta</span></div>`}
const SLIDES=[
 {g:'g1', t:'AI voice call recovers<br>25%+ abandoned carts', th:'th-cart', n:'Abandoned Cart Conversion', id:'cart'},
 {g:'g2', t:'Spot slipping buyers<br>before dues pile up', th:'th-raahi', n:'RAY Credit', id:'raahi', tag:'New'},
 {g:'g3', t:'Predict cashflow 7 days ahead with 85%+ accuracy', th:'th-cash', n:'Cash Flow Prediction', id:'cash'},
];
function pgStudio(t){
  if(t==='raahi') return pgRAYAgent();
  if(t==='my') return `<div class="page fadein">${studioTabs('my')}
   <div class="card mt24"><table class="table"><thead><tr><th>Agent</th><th>Status</th><th>Connected to</th><th>Last action</th><th>Needs approval</th><th></th></tr></thead><tbody>
${S.installed?`   <tr class="click" onclick="go('raahi/overview')"><td><div class="row gap8"><span class="thumb th-raahi"></span><span class="nm">RAY Credit</span></div></td><td>${S.paused?'<span class="badge b-n">Paused</span>':'<span class="badge b-g"><span class="dot"></span>Active</span>'}</td><td><div class="row gap4">${svc('rzp')}${svc('marg')}${svc('wa')}</div></td><td class="muted">Today, 9:02 AM · Recommended actions prepared</td><td><span class="badge b-b">${12-Object.values(S.chase).filter(c=>c.st!=='draft'&&c.st!=='held').length} items</span></td><td>${I('right',18)}</td></tr>`:''}
   <tr class="click" onclick="toast('Settlement Insights · next summary at 7 PM on WhatsApp')"><td><div class="row gap8"><span class="thumb th-set"></span><span class="nm">Settlement Insights</span></div></td><td><span class="badge b-g"><span class="dot"></span>Active</span></td><td><div class="row gap4">${svc('rzp')}${svc('wa')}</div></td><td class="muted">Yesterday, 7:00 PM · Daily summary sent</td><td class="muted">–</td><td>${I('right',18)}</td></tr>
   </tbody></table></div></div>`;
  if(t==='connectors'){
    const cs=[['rzp','Razorpay Payments','Payments, Smart Collect, payment links',true,'Connected'],['marg','Marg ERP','Invoices, ledgers and credit limits',true,'Connected · synced 8:45 AM'],['wa','WhatsApp Business','Messages via RAY’s verified Razorpay account',true,'Connected'],['tally','Tally Prime','Ledgers and vouchers',false,'Not connected'],['shop','Shopify','Orders and carts',false,'Not connected'],['mail','Gmail','Invoice emails',false,'Not connected']];
    return `<div class="page fadein">${studioTabs('connectors')}<div class="sub mt20">Connect the systems your agents can read from. Agents only act on what you approve.</div><div class="grid g3 mt20">${cs.map(c=>`<div class="card pad-s"><div class="row gap8">${svc(c[0]).replace('class="svc','style="width:32px;height:32px;border-radius:8px;font-size:14px" class="svc')}<div class="grow"><div class="h3">${c[1]}</div><div class="xs muted">${c[2]}</div></div></div><div class="row between mt16"><span class="small" style="color:${c[3]?'var(--g)':'var(--muted)'};font-weight:500">${c[4]}</span><button class="btn btn-s btn-sm" onclick="toast('${c[3]?'Manage '+c[1]:'Connect flow isn’t part of this prototype'}')">${c[3]?'Manage':'Connect'}</button></div></div>`).join('')}</div></div>`;
  }
  const f=S.studio.filter; const list=AGENTS.filter(a=>!f||a.cats.includes(f));
  return `<div class="page fadein">${studioTabs('home')}
  <div class="hero-wrap" id="hero"><div class="hero-track" style="transform:translateX(calc(${-S.studio.slide} * (72% + 16px)))">
   ${SLIDES.map((s,i)=>`<div class="hero ${s.g}" onclick="${s.id==='raahi'?"go('studio/raahi')":`A.agent('${s.id==='cash'?'cash':s.id}')`}"><h2>${s.t}</h2><div class="who"><span class="thumb ${s.th}"></span>${s.n}${s.tag?` <span class="pill-beta">${s.tag}</span>`:''}</div></div>`).join('')}
  </div>
  <button class="hero-nav" style="left:12px" onclick="A.slide(-1)">${I('left',16,2)}</button>
  <button class="hero-nav" style="left:calc(72% - 23px)" onclick="A.slide(1)">${I('right',16,2)}</button></div>
  <div class="hero-dots">${SLIDES.map((s,i)=>`<i class="${i===S.studio.slide?'on':''}"></i>`).join('')}</div>
  <div class="h2 mt32" style="font-size:20px">Explore Agents</div>
  <div class="row gap8 mt16">${['Reduce Losses','Grow Revenue','Get Insights','Manage Cash'].map(c=>`<button class="chip ${f===c?'on':''}" onclick="A.sfilter('${c}')">${c}</button>`).join('')}</div>
  <div class="grid g3 mt20">${list.map(a=>`<button class="agent-card" onclick="${a.id==='raahi'?"go('studio/raahi')":`A.agent('${a.id}')`}" ${a.id==='raahi'?'id="card-raahi"':''}>
    <div class="row gap8"><span class="thumb ${a.th}"></span><span class="an">${a.name}</span>${(a.partners||[]).map(p=>`<span class="partner">${p}</span>`).join('')}${a.id==='raahi'&&S.installed?'<span class="badge b-g">Installed</span>':a.tag?`<span class="pill-beta">${a.tag}</span>`:''}</div>
    <div class="ao">${a.out}</div>${a.sub?`<div class="small muted mt4">${a.sub}</div>`:''}
    <div class="af">${a.svc.map(svc).join('')}<span style="margin-left:auto;color:var(--faint)">${I('right',17)}</span></div></button>`).join('')}</div>
  </div>`;
}
A.slide=d=>{S.studio.slide=(S.studio.slide+d+SLIDES.length)%SLIDES.length; render()};
A.sfilter=c=>{S.studio.filter=S.studio.filter===c?null:c; render()};
A.agent=id=>{const a=AGENTS.find(x=>x.id===id)||AGENTS[0]; modal({title:a.name, body:`<div class="row gap8"><span class="thumb ${a.th}"></span><span class="badge b-g">Free access during beta</span></div><p class="mt12" style="font-size:15px;color:var(--strong);font-weight:600">${a.out}</p><p class="muted mt8">${a.desc||''}</p><div class="row gap4 mt16">${a.svc.map(svc).join('')}</div>`, actions:[{label:'Close'},{label:'Install Agent',cls:'btn-p',fn:()=>{closeModal();toast(a.name+' · install request sent')}}]})};
