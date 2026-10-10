/* ================= GUIDED DEMO =================
 * Navigating to a step never approves credit, creates a mandate, sends a message or records money.
 * When a step needs earlier state, it shows a clearly labelled "Load scenario" button that runs the
 * simulated events explicitly, or opens the action for the presenter to confirm.
 */
function ensureBank(){ if(S.bank.st!=='on'&&S.bank.st!=='paused'){ S.bank.sync=4; completeConnection(); } }
const scrollTo_ = id => setTimeout(()=>{const e=document.getElementById(id); e&&e.scrollIntoView({behavior:'smooth',block:'start'})},160);
const inst = (step, ledger) => { if(!S.inst) S.inst={step:1, ledger:null, auto:'review', bank:S.bank.st==='on'}; S.inst.step=step; if(ledger) S.inst.ledger=ledger; instRender(); };
const installed = () => { if(!S.installed){ S.installed=true; if(S.inst){ S.ctl.auto=S.inst.auto; } S.inst=null; if(!S.act.some(x=>x.ti==='RAY Credit installed from Agent Studio')) log({ic:'agent',ti:'RAY Credit installed from Agent Studio',de:`Marg (demo connector) · bank ${S.bank.st==='on'?'connected':'not connected yet'} · Review first`,src:['led'],who:'Installed by '+M.owner}); } };
const KEEP={modal:1,aa:2,wa:4,mob:8};
const scenario = (text, label, fn) => { S.demoNote={text, label, fn}; };

/* explicit simulated scenario: the outcomes that change Gupta Traders’ recommendation */
function loadOutcomeScenario(){
  if(!S.rec.gupta.st){ S.rec.gupta.st='sent'; S.rec.gupta.at=nowT(); log({ic:'link',ti:'Partial-payment link sent to Gupta Traders',de:'Scenario loaded by presenter · ₹20,000 · INV-24790 · minimum ₹5,000',src:['rzp','conv'],who:'Prototype scenario',chem:'Gupta Traders'}); }
  if(S.rec.gupta.st==='sent') A.recPay('gupta');
  if(!openPromise('gupta')){ const bal=balOf('gupta','INV-24891'); const raw=RayPromise.demoParse(GUPTA_REPLY,{outstanding:bal,messageDate:S.today}); const v=RayPromise.validateInterpretation(raw,{message:GUPTA_REPLY,outstanding:bal,messageDate:S.today}).interpretation;
    S.interp.gupta={status:'done',mode:'rule',unavailable:'SCENARIO',input:{buyerId:'gupta',buyerName:'Gupta Traders',message:GUPTA_REPLY,inv:'INV-24891',outstanding:bal,messageDate:S.today},interpretation:v,checks:[],canConfirm:true,fields:{firstAmt:v.promisedAmountNow,firstDate:v.firstPaymentDate,laterAmt:v.promisedAmountLater,laterDate:v.promisedDate}};
    if(!S.gupta.promise) S.gupta.promise='understood'; saveCommitment('gupta',S.interp.gupta.fields,false); }
  A.ocFail('gupta');
  if(openPromise('gupta')) A.ocMiss('gupta');
  S.demoNote=null; goSec('raahi/buyer/gupta','wc-gupta');
}
const outcomesRecorded = () => eventsSince('gupta').some(e=>['AUTOPAY_FAILED','PROMISE_MISSED'].includes(e.type));

/* ---------- Core Journey: signal → intelligence → recommendation → approval → action → outcome → updated decision ---------- */
const CORE = [
 ['Gupta Traders asks for ₹50,000 more credit', ()=>{ installed(); go('raahi/request/gupta'); }],
 ['RAY reviews the repayment signals', ()=>{ installed(); S.howOpen=S.howOpen||{}; S.howOpen.gupta=true; goSec('raahi/request/gupta','how-gupta'); }],
 ['Your data vs consented network evidence', ()=>{ installed(); goSec('raahi/request/gupta','ncmp-gupta'); }],
 ['Approve the new limit and terms', ()=>{ installed(); goSec('raahi/request/gupta','req-rec'); if(S.gupta.rec==='open') setTimeout(()=>A.approveGupta(),350); }, KEEP.modal],
 ['Buyer replies in Hinglish · AI extracts the promise', ()=>{ installed(); if(S.gupta.promise){ goSec('raahi/activity','promise'); return; }
    go('raahi/actions'); scenario('Gupta Traders replies once the follow-up is sent. Send it (you approve), then the reply is interpreted.','Open follow-up',()=>{ S.demoNote=null; demoRender(); A.approveOne('gupta'); setTimeout(()=>{ if(S.gupta.promise) go('raahi/activity'); },4200); }); }],
 ['Record a payment or a collection failure', ()=>{ installed(); S.ocOpen=S.ocOpen||{}; S.ocOpen.gupta=true; goSec('raahi/buyer/gupta','oc-gupta'); }],
 ['Repayment events update the recommendation', ()=>{ installed(); if(!outcomesRecorded()) { goSec('raahi/buyer/gupta','oc-gupta'); scenario('No outcome recorded yet. Load a simulated sequence: ₹5,000 partial payment, a failed Autopay attempt and a missed promise.','Load scenario (simulated)',loadOutcomeScenario); } else goSec('raahi/buyer/gupta','wc-gupta'); }],
 ['You decide what to do', ()=>{ installed(); goSec('raahi/buyer/gupta','wc-gupta'); }],
];

/* ---------- Explore all features (original story, now side-effect free on navigation) ---------- */
const STEPS = [
 ['Razorpay Merchant Dashboard', ()=>go('home')],
 ['RAY Credit in Agent Studio', ()=>{ S.installed=false; go('studio/raahi'); }],
 ['Install: connect ledger and bank', ()=>{ S.installed=false; if(route()!=='studio/raahi') go('studio/raahi'); setTimeout(()=>{ S.inst=null; inst(2,'marg'); },120); }, KEEP.modal],
 ['Overview', ()=>{ ensureBank(); installed(); go('raahi/overview'); }],
 ['The Razorpay network: recommendations it changed', ()=>{ installed(); goSec('raahi/overview','ov-net'); }],
 ['Gupta Traders asks for ₹50,000 more', ()=>{ installed(); go('raahi/request/gupta'); }],
 ['How Gupta pays everyone, not just you', ()=>{ installed(); goSec('raahi/request/gupta','req-signals'); }],
 ['Network changed this: compare with your data only', ()=>{ installed(); goSec('raahi/request/gupta','ncmp-gupta'); }],
 ['Approve limit and terms', ()=>{ installed(); goSec('raahi/request/gupta','req-rec'); if(S.gupta.rec==='open') setTimeout(()=>A.approveGupta(),350); }, KEEP.modal],
 ['Set up repayment: UPI Autopay', ()=>{ installed(); if(S.gupta.rec==='open'){ goSec('raahi/request/gupta','req-rec'); setTimeout(()=>A.approveGupta(),300); scenario('Approve the limit first. Repayment setup opens right after you approve.','',null); return; } go('raahi/buyer/gupta'); setTimeout(()=>A.repaySetup('gupta',S.gupta.limit,S.gupta.curTerms),200); }, KEEP.modal],
 ['Hidden risk: Chawla Enterprises', ()=>{ installed(); goSec('raahi/buyer/chawla','net'); }],
 ['Day-one credit: New Life Stores', ()=>{ installed(); A.netNewLife(); }],
 ['Collection succeeds, matched automatically', ()=>{ installed(); go('raahi/collect/mehta'); if(collSt('mehta')==='scheduled') scenario('Run the scheduled UPI Autopay collection (simulated).','Run collection',()=>{ S.demoNote=null; A.collRun('mehta'); demoRender(); }); }],
 ['Autopay fails: smart recovery', ()=>{ installed(); go('raahi/recover/gupta'); if(!S.rec.gupta.st) setTimeout(()=>A.recLink('gupta'),300); }, KEEP.modal],
 ['Repayment outcomes update the recommendation', ()=>{ installed(); go('raahi/recover/gupta'); if(!outcomesRecorded()) scenario('Record the outcomes on the recovery page, or load the simulated sequence.','Load scenario (simulated)',loadOutcomeScenario); else setTimeout(()=>{const e=document.getElementById('wc-gupta'); e&&e.scrollIntoView({behavior:'smooth',block:'center'})},300); }],
 ['Payment review: check bank statement', ()=>{ installed(); go('raahi/payment/lifeline'); if(!prS('lifeline').check&&!prS('lifeline').st) setTimeout(()=>A.prCheck('lifeline'),300); }],
 ['Kirana: at-risk invoice', ()=>{ installed(); go('raahi/invoice/INV-2048'); }],
 ['Send payment link', ()=>{ installed(); go('raahi/invoice/INV-2048'); setTimeout(()=>A.kirSend(),250); }, KEEP.modal],
 ['Kirana: pay part now, balance later', ()=>{ installed(); const k=kirS(); if(!k.sent){ go('raahi/invoice/INV-2048'); setTimeout(()=>A.kirSend(),250); scenario('Approve the payment link first; then open the retailer page.','',null); return; } if(!k.kind) k.view='plan'; go('pay/INV-2048'); }, KEEP.modal],
 ['Kirana confirms the plan', ()=>{ installed(); const k=kirS(); if(!k.sent){ go('raahi/invoice/INV-2048'); setTimeout(()=>A.kirSend(),250); return; } if(!k.kind){ k.view='plan'; go('pay/INV-2048'); scenario('On the retailer page, the retailer reviews and confirms the plan (simulated payment).','',null); } else { k.view='done'; go('pay/INV-2048'); } }, KEEP.modal],
 ['Distributor sees the commitment', ()=>{ installed(); if(!kirS().kind) scenario('The retailer has not submitted a plan yet.','Load scenario: retailer submits the plan',()=>{ S.demoNote=null; kirSubmitNow(); rr(); demoRender(); }); go('raahi/overview'); }],
 ['Approve new terms: forecast updates', ()=>{ installed(); goSec('raahi/overview','ov-coll'); if(kirS().commit==='pending') scenario('Approve or reject the proposed date in the Collections card.','',null); }],
 ['RAY on WhatsApp: forward a credit request', ()=>{ installed(); S.wa.msgs=null; A.openWA(); setTimeout(()=>A.waForward(),300); }, KEEP.wa],
 ['RAY Credit for Mobile', ()=>{ installed(); A.openMobile('request','gupta'); }, KEEP.mob],
 ['Controls: network permissions', ()=>{ installed(); goSec('raahi/controls','net-ctl'); }],
];
const demoList = () => S.demoList==='core'?CORE:STEPS;
A.step=(i,list)=>{ if(list) S.demoList=list; const L=demoList(); const k=L[i][2]||0; if(!(k&KEEP.modal)) closeModal(); if(!(k&KEEP.aa)) A.aaClose(); if(!(k&KEEP.wa)) A.closeWA(); if(!(k&KEEP.mob)&&S.mob) A.closeMobile(); S.step=i; S.demoOpen=false; S.demoNote=null; L[i][1](); demoRender(); };
A.next=()=>{ const L=demoList(); A.step(Math.min(L.length-1,S.step+1)); };
A.simExpiry=()=>{ ensureBank(); S.bank.expiry=true; log({ic:'clock',ti:'Bank feed consent ends in 7 days',de:'RAY reminded you on WhatsApp · renewal needs your approval',src:['aa'],who:'RAY'});
  if(!S.wa.msgs) waInit(); S.wa.msgs.push({from:'ray',t:'9:00 AM',html:'Your bank feed consent ends in 7 days (5 Oct 2027). Renew it to keep auto-confirming payments.',btns:[{l:'Renew',a:'waRenew'}]}); S.demoOpen=false; demoRender(); A.openWA(); };
function demoRender(){
  const r=document.getElementById('demo-root'); const L=demoList(); const cur=S.demoList||'all';
  const note=S.demoNote?`<div class="demo-note"><div class="small" style="color:var(--strong)">${S.demoNote.text}</div>${S.demoNote.fn?`<button class="btn btn-p btn-sm mt8" onclick="(S.demoNote&&S.demoNote.fn)&&S.demoNote.fn()">${S.demoNote.label}</button>`:''}<button class="x" onclick="S.demoNote=null;demoRender()">${I('x',14)}</button></div>`:'';
  const list=(arr,key)=>arr.map((s,i)=>`<button class="${cur===key&&i===S.step?'cur':''}" onclick="A.step(${i},'${key}')"><span class="k">${i+1}</span><span>${s[0]}</span></button>`).join('');
  r.innerHTML=`${note}${S.demoOpen?`<div class="demo"><div class="dh"><b>Explore RAY Credit</b><div class="xs" style="margin-top:2px;opacity:.8">One intelligence layer, across every surface.</div><div class="col gap6 mt8"><button class="surf-b" onclick="A.surf('desk')">Open Desktop</button><button class="surf-b" onclick="A.surf('wa')">Open RAY on WhatsApp</button><button class="surf-b" onclick="A.surf('mob')">Open RAY Credit for Mobile</button></div><p class="mt8">Concept prototype for Razorpay Agent Studio · synthetic merchant data (Agarwal Distributors, Ludhiana). Not a live Razorpay product. <a class="link" style="color:inherit;text-decoration:underline" onclick="A.about()">About this demo</a></p></div>
   <div class="ds"><h6>Try RAY Credit: Core Journey</h6>${list(CORE,'core')}
   <h6>Explore all features</h6>${list(STEPS,'all')}
   <h6>Extras</h6><button class="sim" onclick="A.netToggle()"><span class="k">N</span><span>${S.ctl.net?'Turn off':'Turn on'} the Razorpay network</span></button><button class="sim" onclick="go('raahi/invoice/INV-2048')"><span class="k">K</span><span>Kirana payment link journey · Gupta Kirana Store</span></button><button class="sim" onclick="go('raahi/buyer/sethi')"><span class="k">L</span><span>Positive outcome · Sethi Mart increase rule</span></button><button class="sim" onclick="go('raahi/payment/citycare')"><span class="k">S</span><span>Salesperson cheque · City Mart</span></button><button class="sim" onclick="goSec('raahi/controls','inbox-ctl');setTimeout(A.inboxConnect,200)"><span class="k">I</span><span>Connect WhatsApp Business inbox</span></button><button class="sim" onclick="S.installed=false;rr();A.openMobile('apphome');setTimeout(()=>A.mobGo('products'),50)"><span class="k">P</span><span>Mobile discovery · Products → Agent Studio</span></button><button class="sim" onclick="A.behind()"><span class="k">B</span><span>Behind RAY · architecture</span></button>
   <h6>Reset</h6><button onclick="A.reset()"><span class="k">${I('refresh',11,2.4)}</span><span>Reset demo to Monday 9 AM</span></button></div></div>`:''}`;
}
hooks.push(()=>demoRender());

/* Presenter shortcuts (no on-screen clutter): → / N next step · ← previous · Shift+D story panel · Esc close */
document.addEventListener('keydown',e=>{ const t=e.target; if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT'||t.isContentEditable)) return;
  if(e.key==='ArrowRight'||e.key==='n'||e.key==='N'){ if(e.key==='N'&&e.shiftKey) return; e.preventDefault(); A.next(); }
  else if(e.key==='ArrowLeft'){ e.preventDefault(); A.step(Math.max(0,S.step-1)); }
  else if((e.key==='D'||e.key==='d')&&e.shiftKey){ S.demoOpen=!S.demoOpen; demoRender(); }
  else if(e.key==='Escape'&&S.demoOpen){ S.demoOpen=false; demoRender(); } });
