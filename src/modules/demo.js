/* ================= GUIDED DEMO =================
 * Navigating to a step never approves credit, creates a mandate, sends a message or records money.
 * When a step needs earlier state, it shows a clearly labelled "Load scenario" button that runs the
 * simulated events explicitly, or opens the action for the presenter to confirm.
 */
function ensureBank(){ if(S.bank.st!=='on'&&S.bank.st!=='paused'){ S.bank.sync=4; completeConnection(); } }
const scrollTo_ = id => setTimeout(()=>{const e=document.getElementById(id); e&&e.scrollIntoView({behavior:'smooth',block:'start'})},160);
const inst = (step, ledger) => { if(!S.inst) S.inst={step:1, ledger:null, auto:'review', bank:S.bank.st==='on'}; S.inst.step=step; if(ledger) S.inst.ledger=ledger; instRender(); };
const installed = () => { if(!S.installed){ S.installed=true; if(S.inst){ S.ctl.auto=S.inst.auto; } S.inst=null; if(!S.act.some(x=>x.ti==='RAY Credit installed from Agent Studio')) log({ic:'agent',ti:'RAY Credit installed from Agent Studio',de:`Marg ERP · bank ${S.bank.st==='on'?'connected':'not connected yet'} · Review first`,src:['led'],who:'Installed by '+M.owner}); } };
const KEEP={modal:1,aa:2,wa:4,mob:8};
const scenario = (text, label, fn) => { S.demoNote={text, label, fn}; };

/* explicit simulated scenario: the outcomes that change Gupta Traders’ recommendation */
function loadOutcomeScenario(){
  const rv=recoveryOf('gupta');
  if(rv&&rv.status==='open'){ const rs=recS('gupta'), v=RayGuards.linkMinimum(RayGuards.LINK_RULES.defaultMin, rv.balance); rs.st='link'; rs.at=nowT(); rs.n=(rs.n||0)+1;
    rs.link={at:rs.at, status:'sent', amount:rv.balance, min:v.value, partial:v.partial, msg:recLinkDraft('gupta').msg, inv:rv.inv, ref:'plink_scn_'+rs.n};
    log({ic:'link',ti:'Partial-payment link sent to Gupta Traders',de:`Scenario loaded by presenter · ${inr(rv.balance)} · ${rv.inv} · minimum ${inr(v.value)} · simulated delivery`,src:['rzp','conv'],who:'Prototype scenario',chem:'Gupta Traders'}); }
  const rv2=recoveryOf('gupta'); if(rv2&&rv2.link&&rv2.status==='action') A.recPay('gupta', Math.min(rv2.link.min, rv2.balance), 'plink_scn_pay_'+rv2.inv);
  if(!openPromise('gupta')){ const bal=balOf('gupta','INV-24891'); const raw=RayPromise.demoParse(GUPTA_REPLY,{outstanding:bal,messageDate:S.today}); const v=RayPromise.validateInterpretation(raw,{message:GUPTA_REPLY,outstanding:bal,messageDate:S.today}).interpretation;
    S.interp.gupta={status:'done',mode:'rule',unavailable:'SCENARIO',input:{buyerId:'gupta',buyerName:'Gupta Traders',message:GUPTA_REPLY,inv:'INV-24891',outstanding:bal,messageDate:S.today},interpretation:v,checks:[],canConfirm:true,fields:{firstAmt:v.promisedAmountNow,firstDate:v.firstPaymentDate,laterAmt:v.promisedAmountLater,laterDate:v.promisedDate}};
    if(!S.gupta.promise) S.gupta.promise='understood'; saveCommitment('gupta',S.interp.gupta.fields,false); }
  A.ocFail('gupta');
  if(openPromise('gupta')) A.ocMiss('gupta');
  S.demoNote=null; goSec('ray-credit/buyer/gupta','wc-gupta');
}
const outcomesRecorded = () => eventsSince('gupta').some(e=>['AUTOPAY_FAILED','PROMISE_MISSED'].includes(e.type));

/* ---------- Judge walkthrough: nine steps. Navigating never approves, pays, reverses or sends; buttons in the note do,
   and only when the presenter clicks them. Every number in a note is read from the current state. ---------- */
const CORE = [
 ['Buyer requests more credit', ()=>{ installed(); go('ray-credit/request/gupta'); const r=creq('gupta');
    scenario(`Gupta Traders asks on WhatsApp for ${inr((r||{}).amt||0)} more credit. They owe ${inr(outOf('gupta'))} today on a ${inr(curLimitOf('gupta'))} · ${curTermsOf('gupta')}-day limit. ${simDateLabel()}, ${nowLabel()} IST.`,'',null); }],
 ['RAY explains the evidence and the network comparison', ()=>{ installed(); goSec('ray-credit/buyer/gupta','net'); const o=recAlt('gupta',false), n=recOf('gupta');
    scenario(S.ctl.net&&n.networkStep?`Repayment evidence from your ledger, plus a read-only comparison: your data only ${inr(o.recommendedLimit)} · ${o.recommendedTerms} days vs with eligible network evidence ${inr(n.recommendedLimit)} · ${n.recommendedTerms} days. Switching the preview changes nothing; participation lives in Controls.`:`Repayment evidence from your ledger. Network evidence is not used right now (${esc(n.network.reason||'participation off')}), so the recommendation is ${inr(n.recommendedLimit)} · ${n.recommendedTerms} days from your data only.`,'',null); }],
 ['Merchant reviews and decides', ()=>{ installed(); goSec('ray-credit/request/gupta','req-rec'); const op=lastCreditOp('gupta');
    if(op&&op.kind==='approved') scenario(`Approved: ${inr(curLimitOf('gupta'))} · ${curTermsOf('gupta')} days. Undo restores the previous limit, closes any repayment setup opened for it, and keeps both the approval and the reversal in Activity.`,'Undo the approval',()=>{ S.demoNote=null; A.undoCredit('gupta',null,op.opId); demoRender(); });
    else scenario(`Approve or reject on this page. Approval applies exactly ${inr(recOf('gupta').recommendedLimit)} · ${recOf('gupta').recommendedTerms} days to new invoices only; the ${inr(outOf('gupta'))} already owed keeps its original due dates. Nothing changes until you confirm.`,'Open the approval',()=>{ S.demoNote=null; A.approveGupta(); demoRender(); }); }, KEEP.modal],
 ['Failed ₹20,000 collection → partial-payment link', ()=>{ installed(); go('ray-credit/recover/gupta'); const r=recoveryOf('gupta');
    scenario(!r?'No failed collection on record.':r.status==='completed'?`${r.inv} is already recovered. Use reset (↻) to replay this story.`:r.link?`Link approved: ${inr(r.link.amount)} with a ${inr(r.link.min)} minimum (simulated delivery). Next: the buyer pays part of it.`:`The ${r.method} debit of ${inr(r.amount)} failed (${r.reason.toLowerCase()}). Open the payment link, try a minimum above the balance (rejected inline), then approve sending it. Delivery is simulated.`,
      r&&!r.link&&r.status!=='completed'?'Open the payment link':'',r&&!r.link&&r.status!=='completed'?()=>{ S.demoNote=null; A.recLink('gupta'); demoRender(); }:null); }, KEEP.modal],
 ['Simulated ₹5,000 payment leaves ₹15,000', ()=>{ installed(); go('ray-credit/recover/gupta'); const r=recoveryOf('gupta');
    if(r&&r.link&&r.status!=='completed'&&r.received===0){ const pay=Math.min(5000,r.balance); scenario(`Simulate the buyer paying ${inr(pay)} through the link. It is recorded as a verified payment event; ${inr(r.balance-pay)} stays due.`,`Buyer pays ${inr(pay)} (simulated)`,()=>{ const x=recoveryOf('gupta'); A.recPay('gupta', Math.min(5000,x.balance), 'demo_part_'+x.inv); S.demoNote=null; demoRender(); }); }
    else scenario(!r||!r.link?'Approve the payment link in the previous step first. The walkthrough never sends it for you.':r.status==='completed'?`${r.inv} is already recovered in full.`:`${inr(r.received)} received · ${inr(r.balance)} still due on ${r.inv}.`,'',null); }],
 ['Remaining payment completes recovery', ()=>{ installed(); go('ray-credit/recover/gupta'); const r=recoveryOf('gupta');
    if(r&&r.status!=='completed'&&r.received>0) scenario(`Simulate the buyer paying the remaining ${inr(r.balance)}. The invoice reaches ₹0, recovery completes and remaining steps stop.`,`Buyer pays ${inr(r.balance)} (simulated)`,()=>{ const x=recoveryOf('gupta'); A.recPay('gupta', x.balance, 'demo_full_'+x.inv); S.demoNote=null; demoRender(); });
    else scenario(r&&r.status==='completed'?`${r.inv} recovered in full: ${r.pays.map(e=>inr(e.amount)).join(' + ')}. A recorded payment can still be reversed as a ledger correction under “Payments recorded against this buyer”.`:'Record the partial payment in the previous step first.','',null); }],
 ['Ledger, mobile, WhatsApp and Activity agree', ()=>{ installed(); A.openWA(); setTimeout(()=>A.waSend('Gupta Traders ka payment kya hua?'),300);
    scenario(`RAY on WhatsApp answers from the same ledger (${inr(outOf('gupta'))} outstanding now). Then check mobile and the Activity log.`,'Ask on mobile',()=>{ A.closeWA(); A.openMobile('ask'); setTimeout(()=>A.mobAsk('Gupta Traders ka payment kya hua?'),200);
      scenario('Same answer on mobile. Activity lists every approval, payment and correction with who did it.','Open Activity',()=>{ S.demoNote=null; A.closeMobile(); go('ray-credit/activity'); demoRender(); }); demoRender(); }); }, KEEP.wa],
 ['What changed in RAY’s inputs', ()=>{ installed(); const has=eventsSince('gupta').length>0||recChanged('gupta'); S.howOpen=S.howOpen||{}; S.howOpen.gupta=!has; goSec('ray-credit/buyer/gupta',has?'wc-gupta':'how-gupta'); const r=recOf('gupta');
    scenario(has?`RAY lists the new repayment events since the last decision, which signals moved, and whether the recommendation changed (now ${r.band}, ${inr(r.recommendedLimit)} · ${r.recommendedTerms} days). Events update signals and rerun the same policy; no model is trained.`:`No new repayment events since the last decision, so the inputs are unchanged. The panel shows every signal and rule behind ${inr(r.recommendedLimit)} · ${r.recommendedTerms} days.`,'',null); }],
];
/* ---------- Explore all features (original story, now side-effect free on navigation) ---------- */
const STEPS = [
 ['Razorpay Merchant Dashboard', ()=>go('home')],
 ['RAY Credit in Agent Studio', ()=>{ S.installed=false; go('studio/ray-credit'); }],
 ['Install: connect ledger and bank', ()=>{ S.installed=false; if(route()!=='studio/ray-credit') go('studio/ray-credit'); setTimeout(()=>{ S.inst=null; inst(2,'marg'); },120); }, KEEP.modal],
 ['Overview', ()=>{ ensureBank(); installed(); go('ray-credit/overview'); }],
 ['The Razorpay network: recommendations it changed', ()=>{ installed(); goSec('ray-credit/overview','ov-net'); }],
 ['Gupta Traders asks for ₹75,000 more', ()=>{ installed(); go('ray-credit/request/gupta'); }],
 ['How Gupta pays everyone, not just you', ()=>{ installed(); goSec('ray-credit/request/gupta','req-signals'); }],
 ['Network changed this: compare with your data only', ()=>{ installed(); goSec('ray-credit/request/gupta','ncmp-gupta'); }],
 ['Approve limit and terms', ()=>{ installed(); goSec('ray-credit/request/gupta','req-rec'); if(S.gupta.rec==='open') setTimeout(()=>A.approveGupta(),350); }, KEEP.modal],
 ['Set up repayment: UPI Autopay', ()=>{ installed(); if(S.gupta.rec==='open'){ goSec('ray-credit/request/gupta','req-rec'); setTimeout(()=>A.approveGupta(),300); scenario('Approve the limit first. Repayment setup opens right after you approve.','',null); return; } go('ray-credit/buyer/gupta'); setTimeout(()=>A.repaySetup('gupta',S.gupta.limit,S.gupta.curTerms),200); }, KEEP.modal],
 ['Hidden risk: Chawla Enterprises', ()=>{ installed(); goSec('ray-credit/buyer/chawla','net'); }],
 ['Day-one credit: New Life Stores', ()=>{ installed(); A.netNewLife(); }],
 ['Collection succeeds, matched automatically', ()=>{ installed(); go('ray-credit/collect/mehta'); if(collSt('mehta')==='scheduled') scenario('Run the scheduled UPI Autopay collection (simulated).','Run collection',()=>{ S.demoNote=null; A.collRun('mehta'); demoRender(); }); }],
 ['Autopay fails: smart recovery', ()=>{ installed(); go('ray-credit/recover/gupta'); if(recoveryOf('gupta')&&recoveryOf('gupta').status==='open') setTimeout(()=>A.recLink('gupta'),300); }, KEEP.modal],
 ['Repayment outcomes update the recommendation', ()=>{ installed(); go('ray-credit/recover/gupta'); if(!outcomesRecorded()) scenario('Record the outcomes on the recovery page, or load the simulated sequence.','Load scenario (simulated)',loadOutcomeScenario); else setTimeout(()=>{const e=document.getElementById('wc-gupta'); e&&e.scrollIntoView({behavior:'smooth',block:'center'})},300); }],
 ['Payment review: check bank statement', ()=>{ installed(); go('ray-credit/payment/lifeline'); if(!prS('lifeline').check&&!prS('lifeline').st) setTimeout(()=>A.prCheck('lifeline'),300); }],
 ['Kirana: at-risk invoice', ()=>{ installed(); go('ray-credit/invoice/INV-2048'); }],
 ['Send payment link', ()=>{ installed(); go('ray-credit/invoice/INV-2048'); setTimeout(()=>A.kirSend(),250); }, KEEP.modal],
 ['Kirana: pay part now, balance later', ()=>{ installed(); const k=kirS(); if(!k.sent){ go('ray-credit/invoice/INV-2048'); setTimeout(()=>A.kirSend(),250); scenario('Approve the payment link first; then open the retailer page.','',null); return; } if(!k.kind) k.view='plan'; go('pay/INV-2048'); }, KEEP.modal],
 ['Kirana confirms the plan', ()=>{ installed(); const k=kirS(); if(!k.sent){ go('ray-credit/invoice/INV-2048'); setTimeout(()=>A.kirSend(),250); return; } if(!k.kind){ k.view='plan'; go('pay/INV-2048'); scenario('On the retailer page, the retailer reviews and confirms the plan (simulated payment).','',null); } else { k.view='done'; go('pay/INV-2048'); } }, KEEP.modal],
 ['Distributor sees the commitment', ()=>{ installed(); if(!kirS().kind) scenario('The retailer has not submitted a plan yet.','Load scenario: retailer submits the plan',()=>{ S.demoNote=null; kirSubmitNow(); rr(); demoRender(); }); go('ray-credit/overview'); }],
 ['Approve new terms: forecast updates', ()=>{ installed(); goSec('ray-credit/overview','ov-coll'); if(kirS().commit==='pending') scenario('Approve or reject the proposed date in the Collections card.','',null); }],
 ['RAY on WhatsApp: forward a credit request', ()=>{ installed(); S.wa.msgs=null; A.openWA(); setTimeout(()=>A.waForward(),300); }, KEEP.wa],
 ['RAY Credit for Mobile', ()=>{ installed(); A.openMobile('request','gupta'); }, KEEP.mob],
 ['Controls: network permissions', ()=>{ installed(); goSec('ray-credit/controls','net-ctl'); }],
 ['Reconcile before chasing: Verma Retail', ()=>{ installed(); go('ray-credit/payment/verma'); }],
 ['Read a buyer reply (AI or rule-based fallback)', ()=>{ installed(); goSec('ray-credit/buyer/gupta','ip-card-gupta'); }],
 ['What is real, simulated and tested', ()=>{ installed(); go('ray-credit/checks'); }],
];
const demoList = () => S.demoList==='core'?CORE:STEPS;
A.step=(i,list)=>{ if(list) S.demoList=list; const L=demoList(); const k=L[i][2]||0; closeModal(); S.rs=null; if(S.mob&&S.mob.sheet) S.mob.sheet=null; if(!(k&KEEP.aa)) A.aaClose(); if(!(k&KEEP.wa)) A.closeWA(); if(!(k&KEEP.mob)&&S.mob) A.closeMobile(); S.step=i; S.demoOpen=false; S.demoNote=null; L[i][1](); demoRender(); };
A.next=()=>{ const L=demoList(); A.step(Math.min(L.length-1,S.step+1)); };
A.demoExit=()=>{ S.demoNote=null; S.demoOpen=false; closeModal(); demoRender(); toast('Walkthrough closed · your progress is kept'); };
A.simExpiry=()=>{ ensureBank(); S.bank.expiry=true; log({ic:'clock',ti:'Bank feed consent ends in 7 days',de:'RAY reminded you on WhatsApp · renewal needs your approval',src:['aa'],who:'RAY'});
  if(!S.wa.msgs) waInit(); S.wa.msgs.push({from:'ray',t:'9:00 AM',html:'Your bank feed consent ends in 7 days (5 Oct 2027). Renew it to keep auto-confirming payments.',btns:[{l:'Renew',a:'waRenew'}]}); S.demoOpen=false; demoRender(); A.openWA(); };
function demoRender(){
  const r=document.getElementById('demo-root'); const L=demoList(); const cur=S.demoList||'all';
  const nav=`<div class="row gap6 mt8 wrap demo-nav"><span class="xs muted">Step ${S.step+1} of ${L.length}${cur==='core'?' · judge walkthrough':''}</span><span class="grow"></span><button class="btn btn-g btn-sm" id="demo-prev" ${S.step<=0?'disabled':''} onclick="A.step(Math.max(0,S.step-1))">${I('arrowL',12,2)} Previous</button><button class="btn btn-s btn-sm" id="demo-next" ${S.step>=L.length-1?'disabled':''} onclick="A.next()">Next ${I('arrowR',12,2)}</button><button class="btn btn-g btn-sm" id="demo-exit" onclick="A.demoExit()">Exit</button></div>`;
  const note=S.demoNote?`<div class="demo-note"><div class="xs" style="font-weight:600;color:var(--muted)">${esc(L[S.step]?L[S.step][0]:'')}</div><div class="small mt4" style="color:var(--strong)">${S.demoNote.text}</div>${S.demoNote.fn&&S.demoNote.label?`<button class="btn btn-p btn-sm mt8" id="demo-act" onclick="(S.demoNote&&S.demoNote.fn)&&S.demoNote.fn()">${S.demoNote.label}</button>`:''}${nav}<button class="x" aria-label="Close note" onclick="S.demoNote=null;demoRender()">${I('x',14)}</button></div>`:'';
  const list=(arr,key)=>arr.map((s,i)=>`<button class="${cur===key&&i===S.step?'cur':''}" onclick="A.step(${i},'${key}')"><span class="k">${i+1}</span><span>${s[0]}</span></button>`).join('');
  r.innerHTML=`${note}${S.demoOpen?`<div class="demo"><div class="dh"><b>Explore RAY Credit</b><div class="xs" style="margin-top:2px;opacity:.8">One intelligence layer, across every surface.</div><div class="col gap6 mt8"><button class="surf-b" onclick="A.surf('desk')">Open Desktop</button><button class="surf-b" onclick="A.surf('wa')">Open RAY on WhatsApp</button><button class="surf-b" onclick="A.surf('mob')">Open RAY Credit for Mobile</button></div><p class="mt8">Prototype for Razorpay Agent Studio · sample portfolio (Agarwal Distributors, Ludhiana). Not a live Razorpay product. <a class="link" style="color:inherit;text-decoration:underline" onclick="A.about()">About this prototype</a></p></div>
   <div class="ds"><h6>Main story · 8 steps</h6>${list(CORE,'core')}
   <h6>Explore all features</h6>${list(STEPS,'all')}
   <h6>Extras</h6><button class="sim" onclick="goSec('ray-credit/controls','net-ctl')"><span class="k">N</span><span>Network participation (Controls)</span></button><button class="sim" onclick="go('ray-credit/invoice/INV-2048')"><span class="k">K</span><span>Kirana payment link journey · Gupta Kirana Store</span></button><button class="sim" onclick="go('ray-credit/buyer/sethi')"><span class="k">L</span><span>Positive outcome · Sethi Mart increase rule</span></button><button class="sim" onclick="go('ray-credit/payment/citycare')"><span class="k">S</span><span>Salesperson cheque · City Mart</span></button><button class="sim" onclick="goSec('ray-credit/controls','inbox-ctl');setTimeout(A.inboxConnect,200)"><span class="k">I</span><span>Connect WhatsApp Business inbox</span></button><button class="sim" onclick="S.installed=false;rr();A.openMobile('apphome');setTimeout(()=>A.mobGo('products'),50)"><span class="k">P</span><span>Mobile discovery · Products → Agent Studio</span></button><button class="sim" onclick="A.behind()"><span class="k">B</span><span>Behind RAY · architecture</span></button>
   <h6>Reset</h6><button onclick="A.resetAsk()"><span class="k">${I('refresh',11,2.4)}</span><span>Reset this workspace</span></button></div></div>`:''}`;
}
hooks.push(()=>demoRender());

/* Presenter shortcuts (no on-screen clutter): → / N next step · ← previous · Shift+D story panel · Esc close */
document.addEventListener('keydown',e=>{ const t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable)) return;
  if(e.key==='ArrowRight'||e.key==='n'||e.key==='N'){ if(e.key==='N'&&e.shiftKey) return; e.preventDefault(); A.next(); }
  else if(e.key==='ArrowLeft'){ e.preventDefault(); A.step(Math.max(0,S.step-1)); }
  else if((e.key==='D'||e.key==='d')&&e.shiftKey){ S.demoOpen=!S.demoOpen; demoRender(); }
  else if(e.key==='Escape'&&(S.demoOpen||S.demoNote)){ S.demoOpen=false; S.demoNote=null; demoRender(); } });
