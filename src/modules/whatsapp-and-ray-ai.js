/* ================= RAY AGENTIC DASHBOARD ================= */
const RAY_CHIPS={
  Transactions:['Aaj kitne payments aaye?','Show failed payments today'],
  Settlements:['Next settlement kab hai?','Why was Tuesday’s settlement higher?'],
  'Growing my business':['How can I collect faster from buyers?'],
  Collections:['Gupta Traders ko ₹50,000 aur credit de doon?','Kaun buyers slip kar rahe hain?','Gupta ka payment kya hua?','Mehta ka paisa aaya?','New Life Stores ka credit check karo, GSTIN 03AANFN7781K1Z3','City Mart bol raha hai cheque de diya.','Is hafte kaun paisa rok ke baitha hai?','Is hafte kitna aaya?'],
};
function spark(){const pts=[96,95.4,96.8,96.1,97,95.8,96.5,96.9,96.2,97.1,96.4,96.2];const x=i=>i*(220/11),y=v=>34-(v-95)*12;return `<svg viewBox="0 0 220 40" width="100%" height="40"><path d="${pts.map((v,i)=>`${i?'L':'M'}${x(i)},${y(v)}`).join('')}" fill="none" stroke="#1364f1" stroke-width="1.6"/></svg>`}
function pgRay(){
  const m=S.ray.msgs;
  const back=`<button class="ray-backbtn" onclick="go('${S.rayFrom==='raahi'?S.rayFromRoute:'home'}')">${I('arrowL',16,2)} ${S.rayFrom==='raahi'?'Back to RAY Credit':'Back to Dashboard'}</button>`;
  const rail=`<div class="ray-rail"><button title="Menu" onclick="toast('Chat history')">${I('menu',18)}</button><button title="New chat" onclick="S.ray.msgs=[];S.ray.chip=null;render()">${I('plus',18)}</button></div>`;
  if(!m.length) return `<div class="ray">${rail}${back}<div class="ray-body" id="raybody"><div class="ray-glow"></div><div class="ray-home fadein">
   <div class="hi">Good morning, ${M.first}</div><h1>${clover(30)} What can I do for you today?</h1>
   <div class="mt24" style="position:relative">${composer()}${S.ray.chip?`<div class="sugg">${RAY_CHIPS[S.ray.chip].map(q=>`<button onclick="A.rayAsk(this.dataset.q)" data-q="${esc(q)}">${clover(15)}${esc(q)}</button>`).join('')}</div>`:''}</div>
   <div class="ray-chips">${Object.keys(RAY_CHIPS).map(c=>`<button class="${S.ray.chip===c?'on':''}" onclick="S.ray.chip=S.ray.chip==='${c}'?null:'${c}';render()">${c}</button>`).join('')}</div>
   <div class="ray-cards">
    <div class="ray-card"><div class="small muted" style="font-weight:500">Success Rate</div><div class="mid num mt4">96.2%</div><div class="mt8">${spark()}</div><div class="rf">${clover(15)} Payments health <span style="margin-left:auto">${I('arrowR',15)}</span></div></div>
    <div class="ray-card" style="cursor:pointer" onclick="go('raahi/overview')"><div class="row between"><span class="small" style="font-weight:500;color:#1d6b55">Credit intelligence</span><span class="agent-src"><span class="thumb th-raahi" style="width:12px;height:12px;border-radius:3px"></span>RAY</span></div><div class="mid num mt4">5 <span style="font-size:15px;color:var(--muted);font-weight:500">slipping</span></div><div class="small mt8" style="color:var(--strong)">${decisionsOpen()} credit decision${decisionsOpen()===1?'':'s'} to review</div><div class="xs muted mt4">None overdue yet · 1 reminder paused</div><div class="rf">${clover(15)} See in RAY <span style="margin-left:auto">${I('arrowR',15)}</span></div></div>
    <div class="ray-card"><div class="small muted" style="font-weight:500">Collected Payments</div><div class="mid num mt4">₹1,42,380<span style="font-size:16px">.00</span></div><div class="xs mt4" style="color:var(--g);font-weight:500">↗ 12% above usual</div><div class="rf" style="cursor:pointer" onclick="go('transactions')">${clover(15)} See today’s payments <span style="margin-left:auto">${I('arrowR',15)}</span></div></div>
   </div></div></div></div>`;
  return `<div class="ray">${rail}${back}<div class="ray-body" id="raybody"><div class="ray-glow" style="height:180px;opacity:.7"></div><div class="ray-thread">${m.map(rayMsg).join('')}${S.ray.busy?`<div class="ray-ans"><div class="who">${clover(22)}</div><div class="body">${thinking('Fetching RAY signals from the server')}</div></div>`:''}</div>
   <div class="ray-dock"><div class="inner">${composer(true)}<div class="ray-disc">Ray is AI and can make mistakes. Please check important information.</div></div></div></div></div>`;
}
function composer(dock){return `<div class="composer"><textarea id="rayq" rows="${dock?1:2}" placeholder="${dock?'Ask anything…':'Ask about payments, settlements or your collections'}" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();A.rayAsk(this.value)}" oninput="document.getElementById('raygo').classList.toggle('on',!!this.value.trim())"></textarea><div class="cfoot"><button class="up" onclick="toast('Upload a ledger, statement or invoice (PDF, XLSX)')">${I('plus',15,2)} Upload file</button><button class="go" id="raygo" onclick="A.rayAsk(document.getElementById('rayq').value)">${I('arrowR',16,2.2)}</button></div></div>`}
function rayMsg(x){
  if(x.role==='user') return `<div class="ray-user"><div>${esc(x.text)}</div></div>`;
  return `<div class="ray-ans fadein"><div class="who">${clover(22)}</div><div class="body">${rayAnswer(x)}</div></div>`;
}
function rayKind(q){q=q.toLowerCase();
  if(q.includes('new life')||q.includes('03aanfn7781k1z3')) return 'newlife';
  if(q.includes('city mart')) return 'citycare';
  if(/slip|early|pehle|warning/.test(q)) return 'slip';
  if(q.includes('gupta')&&/aaya|paid|payment aa|received|mila|kya hua/.test(q)) return 'guptapay';
  if(q.includes('mehta')&&/aaya|paid|paisa|mila/.test(q)) return 'mehtapay';
  if(q.includes('gupta')) return 'gupta';
  if(/kaun|rok|priorit|chase|who.*(owe|pay)/.test(q)) return 'priority';
  if(/kitna|aaya|collected|collection/.test(q)) return 'collected';
  if(/settle/.test(q)) return 'settle';
  if(/fail/.test(q)) return 'failed';
  if(/payment|transaction|aaj/.test(q)) return 'txn';
  if(/grow|faster|collect/.test(q)) return 'grow';
  return 'other';
}
A.rayAsk=(q)=>{q=(q||'').trim(); if(!q||S.ray.busy) return; if(!route().startsWith('ray')){go('ray')}
  if(rayKind(q)==='newlife'&&!['result','approved'].includes(S.check.step)) S.check={step:'result',q:'03AANFN7781K1Z3',by:'GSTIN',who:'newlife'};
  S.ray.msgs.push({role:'user',text:q}); S.ray.busy=true; S.ray.chip=null; render(); scrollRay();
  setTimeout(()=>{S.ray.busy=false;S.ray.msgs.push({role:'ray',kind:rayKind(q),id:Date.now()});render();scrollRay()},1700)};
function scrollRay(){const b=document.getElementById('raybody'); if(b) b.scrollTop=b.scrollHeight}
function rayAnswer(x){
  const g=S.gupta, risky=g.band==='Risky';
  const srcs=(a)=>`<div class="row gap12 mt8">${a.map(s=>`<span class="src ${s[0]}">${s[1]}</span>`).join('')}</div>`;
  switch(x.kind){
  case 'gupta': {
    const ap=g.rec==='approved';
    return `<p><b>Gupta Traders is on ${risky?'Risky':'Watch'}.</b> ${risky?'I wouldn’t extend more credit right now.':'I’d limit additional exposure for now.'}</p>
    <div class="ray-struct"><div class="rs-h"><b style="color:var(--strong);font-size:15px">Gupta Traders</b>${bandBadge(g.band,true)}<span class="agent-src" style="margin-left:auto"><span class="thumb th-raahi" style="width:12px;height:12px;border-radius:3px"></span>RAY Credit</span></div>
     <div class="xs muted" style="padding:12px 16px 0;font-weight:500">Why</div>
     <div class="rs-why" style="grid-template-columns:repeat(4,1fr)"><div><div class="xs muted">Delay with you</div><div class="num" style="font-weight:600;color:var(--strong);font-size:15px;margin-top:2px">${sigOf('gupta').last3.join('d → ')}d</div></div><div><div class="xs muted">Orders vs exposure</div><div style="font-weight:600;color:var(--strong);font-size:15px;margin-top:2px">${sigOf('gupta').ordersChangePct}% · ${inr(g.out)}</div></div><div><div class="xs muted">Promises</div><div style="font-weight:600;color:var(--strong);font-size:15px;margin-top:2px">${sigOf('gupta').promises.broken} of ${sigOf('gupta').promises.made} missed</div></div><div><div class="xs muted">Confidence</div><div style="font-weight:600;color:var(--g);font-size:15px;margin-top:2px">${recOf('gupta').confidence}</div></div></div>
     <div class="kvline" style="padding:12px 16px"><span>Recommended future limit</span><b class="num">${inr(g.limitRec)} <span class="xs muted" style="font-weight:500">${ap?'already set':'instead of '+inr(g.limit)}</span></b></div><div class="kvline" style="padding:12px 16px"><span>Terms</span><b>${g.terms} days</b></div><div class="kvline" style="padding:12px 16px"><span>Extra ₹50,000 now</span><b>${reqV(creq('gupta')).verdict==='EXTEND'?'Within policy · needs your approval':'Not recommended · needs your approval'}</b></div>
     <div class="rs-f">${ap?`<span class="badge b-g">${I('check',11,2.6)} Future limit ${inr(g.limit)} · ${g.approvedVia}</span>`:''}<button class="btn btn-p btn-sm" style="margin-left:auto" onclick="go('raahi/buyer/gupta')">Review credit recommendation</button></div></div>
    ${srcs([['rzp','Razorpay payment history'],['led','Own ledger'],['conv','Buyer conversations']].concat(recOf('gupta').networkStep?[['net','Razorpay network signal']]:[]))}<div class="xs muted mt8">Same recommendation as the buyer profile · policy ${POL.version}</div>`;}
  case 'newlife': { const r=recOf('newlife'), used=!!r.networkStep, c=sigOf('newlife').consent;
    return `<p>Here’s RAY’s credit check for New Life Stores.</p>
    <div class="ray-struct"><div class="rs-h"><b style="color:var(--strong);font-size:15px">New Life Stores</b>${used?bandBadge(r.band,true):'<span class="badge b-n">NEW BUYER · STARTER</span>'}<span class="agent-src" style="margin-left:auto"><span class="thumb th-raahi" style="width:12px;height:12px;border-radius:3px"></span>RAY Credit</span></div>
     <div class="rs-why" style="grid-template-columns:1fr 1fr"><div><div class="xs muted">Suggested credit limit</div><div class="num" style="font-weight:600;color:var(--strong);font-size:20px;margin-top:2px">${inr(r.recommendedLimit)}</div></div><div><div class="xs muted">Suggested terms</div><div style="font-weight:600;color:var(--strong);font-size:20px;margin-top:2px">${r.recommendedTerms} days</div></div></div>
     <div style="padding:12px 16px;border-top:1px solid var(--border-subtle)"><div class="xs muted" style="font-weight:500">Why</div>${shortReasons('newlife',3).concat(used?[]:[`Network check not used: ${(NET_STATE_LABEL[r.network.state]||'').toLowerCase()}`]).map(x=>`<div class="row gap8 mt8" style="font-size:14.5px"><span style="color:var(--g)">${I('check',14,2.4)}</span>${x}</div>`).join('')}</div>
     <div class="rs-f"><span class="xs muted">${used?'Consented network check used':c==='pending'?'Consent request pending':'Starter policy until the buyer consents'}</span><button class="btn btn-p btn-sm" style="margin-left:auto" onclick="A.netNewLife()">${used?'Review credit terms':'Open credit check'}</button></div></div>
    ${srcs([['','GST public record']].concat(used?[['net','Razorpay network signal']]:[]))}`; }
  case 'guptapay': {
    const g=S.gupta;
    if(g.paidVia==='bank') return `<p><b>Yes. ₹19,200 was received at 10:37 AM and matched to INV-24891.</b></p><p class="small muted">From guptatraders@okhdfc, found in your bank feed.</p><div class="ray-struct"><div class="rs-why" style="grid-template-columns:1fr 1fr"><div><div class="xs muted">Remaining</div><div class="num" style="font-weight:600;color:var(--strong);font-size:17px;margin-top:2px">₹19,200</div></div><div><div class="xs muted">Promise</div><div style="font-weight:600;color:${g.promise==='broken'?'var(--r)':'var(--strong)'};font-size:17px;margin-top:2px">${g.promise==='broken'?'Missed Monday':'Due Monday'}</div></div></div><div class="rs-f"><span class="src aa">${BANK_NAME} · Connected Banking+</span><button class="btn btn-s btn-sm" style="margin-left:auto" onclick="S.bank.filter='All';go('raahi/activity/bank')">View payment</button></div></div>`;
    if(g.paidVia==='sc') return `<p><b>Yes. ₹19,200 came in at 9:34 AM through Razorpay Smart Collect.</b> RAY matched it to INV-24891. ₹19,200 is still due${g.promise==='broken'?'. Monday’s promise was missed':' on Monday'}.</p>`;
    if(g.promise==='saved') return `<p>Not that I can see yet. Gupta Traders promised ₹19,200 today, and nothing has arrived through Razorpay${S.bank.st==='on'?' or your bank feed':''}.</p>${S.bank.st==='on'?'':`<p>He usually pays by Google Pay, which lands in your bank. I can’t read that until you connect it.</p><button class="btn btn-p btn-sm" onclick="A.bankStart()">Connect bank</button>`}`;
    const rc=S.rec.gupta; if(rc.st==='part'||rc.st==='learned') return `<p><b>₹5,000 received through the partial-payment link</b> and matched automatically to INV-24790. ₹15,000 is still due on that invoice. ₹38,400 on INV-24891 is due on 12 Oct through UPI Autopay.</p><button class="btn btn-s btn-sm" onclick="go('raahi/recover/gupta')">View recovery</button>`;
    return `<p><b>₹20,000 against INV-24790 was due on 3 Oct.</b> The UPI Autopay attempt failed due to insufficient balance. ${rc.st==='sent'?'A partial-payment link was sent and RAY is watching for payment.':'I’ve prepared a partial-payment link for your approval.'}</p><p class="small muted">₹38,400 on INV-24891 is due on 12 Oct through UPI Autopay.</p><button class="btn btn-p btn-sm" onclick="go('raahi/recover/gupta')">Review recovery</button>`; }
  case 'mehtapay': return collSt('mehta')==='received'?`<p><b>Yes. ₹30,000 was collected through UPI Autopay at 10:42 AM</b> and matched automatically to INV-24812.</p>`:`<p>Not yet. ₹30,000 against INV-24812 is scheduled for UPI Autopay tomorrow, 6 Oct. The pre-debit notice went to Mehta Enterprises through their UPI app.</p><button class="btn btn-s btn-sm" onclick="go('raahi/collect/mehta')">View collection</button>`;
  case 'citycare': {
    const st=prS('citycare').st;
    if(st) return `<p>City Mart’s INV-24733 is ${PR_ST[st].toLowerCase()}.</p>`;
    return `<p><b>Rakesh Sharma recorded a ₹42,000 cheque from City Mart on 3 Oct.</b></p><p>It hasn’t appeared in your bank account yet, so it may still be clearing. I’ve held reminders for INV-24733 until you review it.</p><button class="btn btn-p btn-sm" onclick="go('raahi/payment/citycare')">Review payment</button>`; }
  case 'slip': { const L=slipLines(); return `<p><b>${L.length} buyer${L.length===1?' is':'s are'} showing weaker repayment behaviour than usual.</b></p><div class="ray-struct"><table class="table"><thead><tr><th>Buyer</th><th>With you</th><th>Signal</th><th>Next due</th></tr></thead><tbody>
     ${L.map(r=>`<tr><td style="white-space:nowrap"><b style="color:var(--strong)">${r.name}</b> ${bandBadge(recOf(r.id).band)}</td><td class="small num" style="white-space:nowrap">${r.you}</td><td class="small">${r.sig}</td><td class="small">${r.due}</td></tr>`).join('')}</tbody></table>
     <div class="rs-f"><span class="xs muted">Same early-warning rule as the Overview · ${netOn()?'includes consented network signals':'your data only'}</span><button class="btn btn-p btn-sm" style="margin-left:auto" onclick="goSec('raahi/actions','grp-early')">Review early warnings</button></div></div>`; }
  case 'priority': {
    const rows=['gupta','sharma','singh','bansal','jain'].map(id=>{const c=CHASE.find(z=>z.id===id),ch=chemView(chem(id)),st=S.chase[id].st;const short={gupta:'Delay worsening + promise missed',sharma:'High amount due',singh:'Promise due today',bansal:'41 days overdue',jain:'9 days later than usual'}[id];return `<tr><td style="white-space:nowrap"><b style="color:var(--strong)">${ch.name}</b> ${bandBadge(ch.band)}</td><td class="r num"><b>${inr(c.amt)}</b></td><td class="small">${short}</td><td class="small" style="white-space:nowrap">${st==='sent'?'<span style="color:var(--g);font-weight:500">Reminder sent</span>':st==='assigned'?'<span style="color:var(--g);font-weight:500">Salesperson assigned</span>':c.ch==='wa'?'WhatsApp':'Salesperson visit'}</td></tr>`}).join('');
    return `<p><b>${lakhs(pfStats().dueThisWeek)} is due this week.</b> I’d prioritise these 5 first.</p><div class="ray-struct"><table class="table"><thead><tr><th>Buyer</th><th class="r">Amount</th><th>Why</th><th>Channel</th></tr></thead><tbody>${rows}</tbody></table><div class="rs-f"><span class="agent-src"><span class="thumb th-raahi" style="width:12px;height:12px;border-radius:3px"></span>RAY · ranked by amount, risk and likelihood of collection</span><button class="btn btn-p btn-sm" style="margin-left:auto" onclick="go('raahi/actions')">Open Actions</button></div></div>`;}
  case 'collected': { const st=pfStats(), got=S.led.events.filter(e=>RayEvents.MONEY_IN.includes(e.type)&&e.verification==='verified').reduce((a,e)=>a+(e.amount||0),0);
    return `<p><b>This week so far: ${lakhs(got)} collected and verified of ${lakhs(st.dueThisWeek)} due.</b> Last week you collected ${lakhs(WEEK.lastCollected)} of ${lakhs(WEEK.lastDue)}, ${WEEK.pct}% of target.</p><div class="ray-struct" style="padding:16px"><div class="progress"><i style="width:${WEEK.pct}%"></i></div><div class="row between mt8 small"><span class="muted">Last week ${lakhs(WEEK.lastCollected)} collected</span><span class="muted">Target ${lakhs(WEEK.lastDue)}</span></div><div class="row gap24 mt16"><div><div class="xs muted">Commitments confirmed</div><div style="font-weight:600;color:var(--strong);font-size:17px">${S.promises.filter(p=>p.status==='confirmed').length}</div></div><div><div class="xs muted">Automatic this week</div><div style="font-weight:600;color:var(--strong);font-size:17px">${lakhs(st.autoThisWeek)}</div></div><div><div class="xs muted">Due this week</div><div style="font-weight:600;color:var(--strong);font-size:17px">${lakhs(st.dueThisWeek)}</div></div></div></div><div class="row gap8"><button class="btn btn-s btn-sm" onclick="goSec('raahi/overview','ov-coll')">Open collections</button></div>`; }
  case 'settle': return `<p><b>₹1,38,920</b> settles today by 5 PM to ICICI Bank ••4821. Saturday’s ₹1,96,410 settled at 4:12 PM.</p><button class="btn btn-s btn-sm" onclick="go('settlements')">View settlements</button>`;
  case 'failed': return `<p>4 payments failed today, all UPI timeouts between 8 and 9 AM. Customers retried 3 of them successfully.</p><button class="btn btn-s btn-sm" onclick="go('transactions')">View payments</button>`;
  case 'txn': return `<p><b>₹1,42,380</b> collected today from 37 captured payments, 12% above your usual Monday. 4 failed, mostly UPI timeouts.</p><button class="btn btn-s btn-sm" onclick="go('transactions')">See today’s payments</button>`;
  case 'grow': return `<p>Start earlier with buyers whose repayment is slipping. RAY’s policy drafts a follow-up 7 days before the due date for Watch buyers, checks payments first, and never sends without your approval. ${pfStats().slipping.length} buyers are on the early-warning list today.</p><button class="btn btn-p btn-sm" onclick="go('raahi/actions')">Open Actions</button>`;
  default: return `<p>I can help with payments, settlements, credit and collections. Try asking about a buyer, for example “Gupta Traders ko ₹50,000 aur credit de doon?”</p>`;
  }
}
A.rayConfirm=(id,v)=>{const x=S.ray.msgs.find(m=>m.id===id); x.confirm=v; render()};
A.rayApprove=(id)=>{approveGuptaDo('Ray AI'); A.rayConfirm(id,false)};

/* ================= RAY ON WHATSAPP ================= */
function waInit(){
  const g=S.gupta, items=[];
  items.push({from:'ray',t:'9:00 AM',html:g.alert?`🔴 <b>Gupta Traders</b>\nMissed Monday’s promise. ₹19,200 is overdue.\nRAY now recommends a ${lakhK(g.limitRec)} future limit and ${g.terms}-day terms.`:`🔴 <b>Gupta Traders</b>\n${inr(g.out)} outstanding\nRAY recommends a ${lakhK(g.limitRec)} future limit and ${g.terms}-day terms.`,btns:[{l:'See why',a:'waWhy'},{l:'Review decision',a:'waReviewGupta'}]});
  if(failCount()) items.push({from:'ray',t:'9:00 AM',html:`🔴 <b>${failCount()} automated collection${failCount()===1?' needs':'s need'} recovery</b>${failOpen('gupta')?'\nGupta Traders · ₹20,000 · UPI Autopay failed (insufficient balance)':''}${failOpen('singhms')?'\nSingh Stores · ₹21,600 · eNACH technical decline':''}\nI’ve prepared ${failOpen('gupta')?'a partial-payment link':''}${failOpen('gupta')&&failOpen('singhms')?' and ':''}${failOpen('singhms')?'a retry':''} for your approval.`,btns:[{l:'Review recovery',a:failOpen('gupta')?'waRecover':'waRecoverS'}]});
  if(!S.vermaMatched) items.push({from:'ray',t:'9:00 AM',html:`🟡 <b>Verma Retail</b>\n₹26,500 payment may already have been received.\nReminder paused until the payment is matched.`,btns:[{l:'Review payment',a:'waReviewPay'}]});
  items.push({from:'ray',t:'9:00 AM',html:`🟢 <b>This week</b>\n${lakhs(pfStats().autoThisWeek)} scheduled for automatic collection. Last week: ${lakhs(WEEK.lastCollected)} collected of ${lakhs(WEEK.lastDue)}.`});
  const tail=[]; if(S.inbox){ tail.push(inboxMsg()); S.wa.pendingInbox=false; }
  S.wa.msgs=[{from:'ray',t:'9:00 AM',html:`<span class="wa-hdr">RAY · Morning priorities</span>\nGood morning, ${M.first}. ${items.length} things need your attention.`},...items,...tail];
}
function inboxMsg(){ const g=S.gupta, v=reqV(creq('gupta')); return {from:'ray',t:'9:06 AM',html:`<span class="wa-hdr">From your connected WhatsApp Business inbox</span>\n<b>Gupta Traders is asking for ₹50,000 more credit.</b>\nI reviewed their current exposure and repayment behaviour.\n\nRecommendation: <b>${v.verdict==='DO NOT EXTEND YET'?'Do not extend additional credit yet':v.verdict==='EXTEND'?'Extend':'Review terms'}</b>\n\nWhy\n· ${inr(g.out)} currently outstanding\n${guptaWhyLines(3).map(x=>'· '+x).join('\n')}\n\nRecommended limit: ${inr(g.limitRec)} · ${g.terms} days.\n<i>I have not replied to Gupta Traders.</i>`,btns:[{l:'Review credit decision',a:'waMobile'}]}; }
function waInboxAlert(){ waPush(inboxMsg()); }
A.waForward=()=>{ if(S.wa.busy) return; S.wa.msgs.push({from:'me',fwd:true,who:'Gupta Traders',html:'Bhai ₹50,000 aur credit de do. Monday pura clear kar dunga.',t:waTime()}); waRender();
  waReply(()=>{ const g=S.gupta, v=reqV(creq('gupta')); waPush({from:'ray',html:`I found <b>Gupta Traders</b>. They’re currently on <b>${g.band}</b>.\n\nRequested: ₹50,000\nOutstanding: ${inr(g.out)}\nCurrent limit: ${inr(g.limit)}\nRecommended limit: ${inr(g.limitRec)} · ${g.terms} days\n\n<b>${v.verdict==='DO NOT EXTEND YET'?'I would not extend additional credit right now.':'This fits within the recommended limit.'}</b>\n\nWhy\n${guptaWhyLines(4).map(x=>'· '+x).join('\n')}\n\n${v.next?'Recommended: '+v.next.replace('extending further credit','the next delivery')+'\n':''}<i>I have not replied to the buyer.</i>`,btns:[{l:'Review in Razorpay',a:'waMobile'}]}); },1600); };
const lakhK = n => '₹'+Math.round(n/1000)+'K';
A.openWA=()=>{ if(!S.wa.msgs) waInit(); S.wa.unread=0; closeModal(); waRender(true); waNudge(); };
A.closeWA=()=>{document.getElementById('wa-root').innerHTML=''; if(typeof waNudge==='function') waNudge();};
function waPush(m){ if(!S.wa.msgs) return; m.t=m.t||waTime(); S.wa.msgs.push(m); if(document.getElementById('wa-root').innerHTML) waRender(); else { S.wa.unread=(S.wa.unread||0)+1; waNudge(); } }
let _wat=2; function waTime(){_wat+=1; return `9:${String(_wat).padStart(2,'0')} AM`}
function waRender(first){
  const root=document.getElementById('wa-root');
  const msgs=S.wa.msgs.map((m,i)=>{
    if(m.from==='me'&&m.fwd) return `<div class="wm out"><div class="wa-fwd">${I('arrowR',11,2.4)} Forwarded</div><div class="wa-fwdq"><b>${m.who}</b><br>${m.html}</div><span class="meta">${m.t} <span class="tick">✓✓</span></span></div>`;
    if(m.from==='me') return m.voice?`<div class="wm out"><div class="wa-voice"><span style="color:#54656f">${I('play',16,2)}</span><span class="wave"></span><span style="font-size:11px;color:#667781">0:06</span></div><div style="text-align:right;font-size:11px;color:#667781;margin-top:2px">${m.t} <span style="color:#53bdeb">✓✓</span></div></div>`:`<div class="wm out">${m.html}<span class="meta">${m.t} <span class="tick">✓✓</span></span></div>`;
    return `<div class="wm in">${m.html}<span class="meta">${m.t}</span></div>${m.btns?`<div class="wa-btns ${m.btns.length===2?'two':''}">${m.btns.map(b=>`<button class="${m.used?'used':''}" onclick="A.waBtn(${i},'${b.a}')">${b.l}</button>`).join('')}</div>`:''}`;
  }).join('');
  root.innerHTML=`<div class="wa-back" ${first?'':'style="animation:none"'} onclick="if(event.target===this)A.closeWA()"><div class="wa-side"><div class="row gap8" style="color:#9fe7c4;font-weight:600;font-size:13px">${clover(18)} RAY on WhatsApp</div><h3 class="mt12">Decisions come to the merchant, on the phone they already use.</h3><p>Ask questions, receive alerts, and forward buyer credit requests. RAY reads only what you forward or a connected business inbox, never personal chats. Credit decisions open in Razorpay for review.</p><p class="small" style="color:#9aa3a8;margin-top:18px">Prototype simulation · synthetic chat</p></div>
   <button class="wa-close" onclick="A.closeWA()">${I('x',20,2)}</button>
   <div class="phone" ${first?'':'style="animation:none"'}><div class="screen"><div class="wa-island"></div>
    <div class="wa-status"><span>9:41</span><span class="row gap4" style="font-size:12px">▂▄▆ ${I('pulse',14,2)}</span></div>
    <div class="wa-head"><span style="color:#027eb5">${I('left',24,2.2)}</span><span class="wa-av">RAY</span><div class="grow"><div class="wa-name">Razorpay RAY <svg width="15" height="15" viewBox="0 0 24 24"><path fill="#1d9bf0" d="M12 1l2.6 2.1 3.3-.4 1.1 3.1 3 1.6-.7 3.3 1.7 2.9-2.4 2.3-.2 3.4-3.3.6-1.9 2.8-3.2-1.2-3.2 1.2-1.9-2.8-3.3-.6-.2-3.4L.8 14.6l1.7-2.9-.7-3.3 3-1.6 1.1-3.1 3.3.4z"/><path d="M7.5 12.5l3 3 6-6.5" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="wa-biz">Business Account</div></div><span style="color:#027eb5">${I('video',22,1.8)}</span><span style="color:#027eb5;margin-left:14px">${I('phone',20,1.8)}</span></div>
    <div class="wa-chat" id="wachat"><div class="wa-day"><span>Today</span></div><div class="wa-sys"><span>This is an official business account of Razorpay.</span></div>${msgs}${S.wa.busy?'<div class="wa-typing"><i></i><i></i><i></i></div>':''}</div>
    <div class="wa-try">${['↪ Forward Gupta’s message','Gupta ka payment kya hua?','Mehta ka paisa aaya?','Gupta ko 50,000 aur credit de doon?','Kaun buyers slip kar rahe hain?','City Mart bol raha hai cheque de diya','🎙 Voice note'].map(t=>`<button onclick="A.waTry(this.textContent)">${t}</button>`).join('')}</div>
    <div class="wa-input"><span style="color:#027eb5">${I('plus',24,2)}</span><div class="box"><input id="wain" placeholder="Message" onkeydown="if(event.key==='Enter'){A.waSend(this.value);this.value=''}">${I('emoji',20)}</div><span style="color:#027eb5">${I('cam',22)}</span><button class="mic" onclick="const v=document.getElementById('wain').value;if(v){A.waSend(v)}else A.waTry('🎙 Voice note')">${I('mic',20,2)}</button></div>
   </div></div></div>`;
  const c=document.getElementById('wachat'); c.scrollTop=c.scrollHeight;
}
function waReply(fn,delay=1300){S.wa.busy=true;waRender();setTimeout(()=>{S.wa.busy=false;fn();if(document.getElementById('wa-root').innerHTML)waRender()},delay)}
A.waTry=t=>{ if(t.includes('Voice')) return A.waVoice(); if(t.includes('Forward')) return A.waForward(); A.waSend(t) };
A.waSend=t=>{t=(t||'').trim(); if(!t||S.wa.busy) return; S.wa.msgs.push({from:'me',html:esc(t),t:waTime()}); waRender();
  const q=t.toLowerCase();
  if(/haan|bhejo|send|yes/.test(q)) return waReply(waAskSendAll);
  if(/slip/.test(q)) return waReply(()=>{ const L=slipLines(); waPush({from:'ray',html:`<b>${L.length} buyer${L.length===1?' is':'s are'} showing weaker repayment behaviour than usual.</b>\n${L.map((r,k)=>`${k+1}. ${r.name} · ${r.you} · ${r.sig} · ${r.due}`).join('\n')}`,btns:[{l:'Review in RAY',a:'waReviewEW'}]}); });
  if(q.includes('gupta')&&/kya hua|status/.test(q)) return waReply(()=>{ const r=S.rec.gupta; waPush(r.st==='part'||r.st==='learned'?{from:'ray',html:'₹5,000 came in through the partial-payment link and is matched to INV-24790.\n\nRemaining: ₹15,000\nNext: ₹38,400 on INV-24891 is due 12 Oct through UPI Autopay.',btns:[{l:'View recovery',a:'waRecover'}]}:{from:'ray',html:`₹20,000 against INV-24790 was due on 3 Oct.\n\nUPI Autopay attempt failed due to insufficient balance.\n\n${r.st==='sent'?'The partial-payment link has been sent. I’m watching for the payment.':'I’ve prepared a partial-payment link.'}`,btns:[{l:'Review recovery',a:'waRecover'}]}); });
  if(q.includes('mehta')&&/aaya|paid|paisa|mila/.test(q)) return waReply(()=>waPush(collSt('mehta')==='received'?{from:'ray',html:'Yes. ₹30,000 was collected through UPI Autopay at 10:42 AM and matched to INV-24812.'}:{from:'ray',html:'Not yet. ₹30,000 against INV-24812 is scheduled for UPI Autopay tomorrow, 6 Oct. Mehta Enterprises got the pre-debit notice in their UPI app.',btns:[{l:'View collection',a:'waColl'}]}));
  if(q.includes('gupta')&&/aaya|paid|received|mila/.test(q)) return waReply(()=>{const g=S.gupta; waPush({from:'ray',html:g.paidVia==='bank'?'Yes. ₹19,200 was received at 10:37 AM and matched to INV-24891.\n\nRemaining: ₹19,200\nPromise: due Monday':g.paidVia==='sc'?'Yes. ₹19,200 came in through Razorpay Smart Collect and is matched to INV-24891. ₹19,200 is still due Monday.':S.bank.st==='on'?'Not yet. Nothing from Gupta Traders in Razorpay or your bank feed today.':'Nothing through Razorpay yet. If he paid by GPay or NEFT, it went to your bank. Connect it so I can check.',btns:g.paidVia||S.bank.st==='on'?null:[{l:'Connect',a:'waConnect'}]});});
  if(q.includes('city mart')) return waReply(()=>{const st=prS('citycare').st; waPush({from:'ray',html:st?`City Mart’s INV-24733 is ${PR_ST[st].toLowerCase()}.`:'Rakesh Sharma recorded a ₹42,000 cheque from City Mart on 3 Oct.\nIt hasn’t appeared in your bank account yet, so it may still be clearing. I’ve held reminders until you review it.',btns:st?null:[{l:'Review payment',a:'waReviewCC'}]});});
  if(q.includes('gupta')) return waReply(waGupta);
  if(/kitna|aaya/.test(q)) return waReply(()=>{ const st=pfStats(), got=S.led.events.filter(e=>RayEvents.MONEY_IN.includes(e.type)&&e.verification==='verified').reduce((a,e)=>a+(e.amount||0),0); waPush({from:'ray',html:`<b>This week so far: ${lakhs(got)} collected (verified) of ${lakhs(st.dueThisWeek)} due.</b>\nLast week: ${lakhs(WEEK.lastCollected)} of ${lakhs(WEEK.lastDue)} (${WEEK.pct}%).`}); });
  if(/kaun|rok/.test(q)) return waReply(()=>waPush({from:'ray',html:`${lakhs(pfStats().dueThisWeek)} is due this week. Top 3 to prioritise:\n1. Gupta Traders · ${inr(balOf('gupta','INV-24891'))}\n2. Sharma Supermarket · ₹1.2L\n3. Sandhu Mart · ₹54,000`,btns:[{l:'Review in RAY',a:'waReview'}]}));
  waReply(()=>waPush({from:'ray',html:'I can help with credit, collections and payments. Try “Gupta ko 50,000 aur credit de doon?”'}));
};
function waAskSendAll(){ const n=bulkCounts(); if(!n.wa) return waSendAll(); waPush({from:'ray',html:`This will send <b>${n.wa} WhatsApp reminders</b>, including early follow-ups. ${n.held?'1 reminder stays paused because of an unmatched payment. ':''}Salesperson visits are assigned separately.\n\nSend them?`,btns:[{l:`Send ${n.wa} reminders`,a:'waSendAll'},{l:'Review in RAY',a:'waReview'}]}); }
function waSendAll(){
  const n=bulkCounts();
  if(!n.wa){ waPush({from:'ray',html:`These are already sent${S.wa.sentVia&&S.wa.sentVia!=='RAY on WhatsApp'?`, approved on the ${S.wa.sentVia.toLowerCase()} at ${S.wa.sentAt}`:''}. ${S.chase.verma.st==='held'?'1 reminder is still paused because of a recent unmatched payment.':''}`}); return; }
  if(blocked()){ waPush({from:'ray',html:S.paused?'RAY is paused, so I haven’t sent anything. Resume it from Controls in RAY.':'Marg data last synced 31 hours ago, so I’ve held new reminders until the ledger is refreshed.'}); return; }
  const r=bulkDo('RAY on WhatsApp'); if(onRAY()) render();
  waPush({from:'ray',html:`${r.wa} WhatsApp reminders sent.\n${r.held} reminder paused because I found a recent unmatched payment.`,btns:[{l:'View in RAY',a:'waReview'}]});
}
function waGupta(){
  const g=S.gupta, risky=g.band==='Risky', ap=g.rec==='approved';
  const r=recOf('gupta'); const body=`Gupta Traders is on <b>${g.band}</b>.\n${risky?'I wouldn’t extend more credit right now.':'I’d limit additional exposure for now.'}\n\n<b>Why</b>\n${guptaWhyLines(5).map(x=>'· '+x).join('\n')}\n\nRecommended future limit: ${inr(g.limitRec)}\nTerms: ${g.terms} days · Confidence: ${r.confidence}\n<i>Same recommendation as in RAY Credit · policy ${POL.version}</i>`;
  waPush({from:'ray',html:body+(ap?`\n\n<i>Future limit already set in RAY (${g.approvedVia}).</i>`:''),btns:ap?[{l:'See why',a:'waWhy'}]:[{l:'See why',a:'waWhy'},{l:'Set future limit',a:'waAskLimit'}]});
}
A.waVoice=()=>{ if(S.wa.busy) return; S.wa.msgs.push({from:'me',voice:true,t:waTime()}); waReply(()=>{ const sent=S.chase.singh.st==='sent';
  waPush({from:'ray',html:`<i>Heard: “Sandhu Mart ka payment aaya kya?”</i>\n\nNot yet. Sandhu Mart promised ₹54,000 today.${sent?` The reminder went out at ${S.chase.singh.at}.`:' Their reminder is drafted and waiting for your approval.'} I’ll tell you when it lands.`}) },1800) };
A.waBtn=(i,a)=>{ const m=S.wa.msgs[i]; if(m.used) return; m.used=true;
  const label=(m.btns.find(b=>b.a===a)||{}).l;
  /* every RAY on WhatsApp link opens RAY Credit inside the Razorpay app */
  const MOBLINK={waReview:['actions'],waReviewEW:['portfolio'],waReviewGupta:['buyer','gupta'],waWhy:['buyer','gupta'],waReviewPay:['pay','verma'],waReviewPromise:['actions'],waEditFollow:['buyer','gupta'],waConnect:['bank'],waReviewCC:['pay','citycare'],waRecover:['recover','gupta'],waRecoverS:['recover','singhms'],waColl:['coll','mehta'],waMobile:['request','gupta'],waAskLimit:['buyer','gupta'],waFollow:['request','gupta']};
  if(MOBLINK[a]){ m.used=false; if(!S.installed){ S.installed=true; rr(); } A.openMobile(...MOBLINK[a]); return; }
  if(a==='waRenew'){ A.aaRenew(); return; }
  S.wa.msgs.push({from:'me',html:esc(label),t:waTime()}); waRender();
  if(a==='waSendAll') return waReply(waSendAll);
  if(a==='waFollow') return waReply(()=>{ const st=S.chase.gupta; if(st.st!=='draft'){ waPush({from:'ray',html:`The early follow-up to Gupta Traders already went out at ${st.at||'9:14 AM'}.`}); return; } waPush({from:'ray',html:`Here’s the early follow-up for Gupta Traders:\n\n<i>“${esc(st.msg)}”</i>\n\nSend it now?`,btns:[{l:'Send follow-up',a:'waFollowSend'},{l:'Edit in RAY',a:'waEditFollow'}]}); });
  if(a==='waFollowSend') return waReply(()=>{ if(S.chase.gupta.st==='draft'){ const t=nowT(); S.chase.gupta.st='sent'; S.chase.gupta.at=t; log({ic:'send',ti:'Early follow-up sent to Gupta Traders',de:`WhatsApp · ₹38,400 · payment link ${LINK('gupta')}`,src:['conv'],who:'Approved by '+M.owner+' · RAY on WhatsApp',chem:'Gupta Traders'}); if(onRAY()) render(); guptaReplySoon(); } waPush({from:'ray',html:'Sent. I’ll tell you when Gupta Traders replies.'}); });
  if(a==='waAskLimit') return waReply(()=>{ const g=S.gupta, over=g.out-g.limitRec; waPush({from:'ray',html:`Please confirm: set Gupta Traders’ <b>future limit to ${inr(g.limitRec)}</b> on ${g.terms}-day terms?\n\n${over>0?`They are ${inr(over)} above it today, so any new credit request will need your approval. `:''}Existing supply is not paused.`,btns:[{l:'Confirm',a:'waApproveGupta'},{l:'Cancel',a:'waCancel'}]}); });
  if(a==='waCancel') return waReply(()=>waPush({from:'ray',html:'No change made.'}));
  if(a==='waApproveGupta') return waReply(()=>{ if(S.gupta.rec!=='approved') approveGuptaDo('RAY on WhatsApp'); waPush({from:'ray',html:`Done. Gupta Traders’ future limit is ${inr(S.gupta.limit)} on ${S.gupta.terms}-day terms. Logged in Activity.\nSupply continues. Nothing is paused automatically.`}); });
  if(a==='waConfirmPromise') return waReply(()=>{ if(['new','reading','understood'].includes(S.gupta.promise)){S.gupta.promise='understood'; A.confirmPromise();} waPush({from:'ray',html:'Promise saved: ₹19,200 today, ₹19,200 by Monday, 12 Oct. I’ll watch for the payment.'}); });
};


/* ---------- shared answer helpers (all numbers from the engine and the ledger) ---------- */
function slipLines(){ return pfStats().slipping.map(id=>{ const s=sigOf(id), r=recOf(id), i=nextDueInv(id); const d=i?RayDates.diffDays(i.due,S.today):0;
  return {id, name:chem(id).name, you:`${s.usual}d → ${s.delay}d`, sig:r.networkStep&&r.networkStep.kind==='uncorroborated'?`on time with you, slipping with ${r.network.coverage} other distributors`:r.networkStep?'also slowing with other distributors':'slower than usual', due:i?`${inr(i.bal-(i.disputed||0))} ${d<0?`${-d}d overdue`:d===0?'due today':d===1?'due tomorrow':'due '+RayDates.fmtShort(i.due)}`:'nothing due'}; }); }
function guptaWhyLines(n=4){ return shortReasons('gupta',n); }
