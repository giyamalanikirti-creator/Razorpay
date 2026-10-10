/* ================= BANK ACCOUNT via RAZORPAYX CONNECTED BANKING (reconciliation) ================= */
const BANK_NAME = 'ICICI Bank ••4821', BANK_FULL = 'ICICI Bank · Current A/c ••4821';
const AA_TAG = 'Distributor’s own business account · RazorpayX Connected Banking+ · Transaction information for reconciliation';
const aaTag = (cls='') => `<span class="aatag ${cls}">${I('lock',11,2.2)} ${AA_TAG}</span>`;
const CB_TRUST = 'RAY reads transaction information needed for reconciliation. Payment actions still require the appropriate Razorpay banking permissions.';
function BANK_ROWS(){ return [
  {id:'r1', d:'Today', t:'10:37 AM', payer:'guptatraders@okhdfc', ref:'UPI/62739182', amt:19200, st:'matched', to:'gupta', inv:'INV-24891', gupta:true},
  {id:'r2', d:'Today', t:'10:16 AM', payer:'ARORA RETAIL', ref:'NEFT/HDFC92817', amt:42800, st:'matched', to:'arora', inv:'INV-24860'},
  {id:'r3', d:'Today', t:'9:54 AM', payer:'BANSAL GEN STORE', ref:'UPI/92837172', amt:27500, st:'suggested', to:'bansal', inv:'INV-24410'},
  {id:'r4', d:'Today', t:'9:21 AM', payer:'RAJESH K', ref:'UPI/19281721', amt:16700, st:'unid'},
  {id:'r5', d:'Yesterday', t:'4:05 PM', payer:'SKT TRADING CO', ref:'NEFT/SBIN71623', amt:31400, st:'unid'},
  {id:'r6', d:'Yesterday', t:'11:12 AM', payer:'SETHI MART', ref:'UPI/55120934', amt:12400, st:'matched', to:'sethi', inv:'INV-24688'},
]; }
function bankAdj(id){ return (S.adj&&S.adj[id])||0; }
const bankRows = () => S.bank.rows.filter(r=>!r.gupta||S.gupta.paidVia==='bank');
const bankOn = () => S.bank.st==='on';

/* ---------- shared bits ---------- */
function flowSteps(cur){
  const g=[['Razorpay',[[1,'Choose account']]],['Your bank',[[2,'Verify OTP'],[3,'Authorise']]],['Razorpay',[[4,'Sync']]]];
  return `<div class="fsteps">${g.map(([h,st],gi)=>`<div class="fgrp ${gi===1?'aa':''}"><div class="fgh">${h}</div><div class="row gap12">${st.map(([n,l])=>`<span class="fst ${n<cur?'done':n===cur?'cur':''}"><i>${n<cur?I('check',11,3):n}</i>${l}</span>`).join('')}</div></div>`).join('<span class="fsep">'+I('right',14,2)+'</span>')}</div>`;
}
function ladder(){
  const t=[['Instant','Razorpay Smart Collect and payment links','Payment identified and matched instantly'],['Real-time','RazorpayX Current Account','Incoming payments appear as they arrive'],['Connected Banking+','Supported business current account','New credits appear in your bank feed shortly after they arrive']];
  return `<div class="card pad mt16"><div class="h3">How quickly RAY can see a payment</div><div class="ladder mt16">${t.map((x,i)=>`<div class="rung ${i===2?'hl':''}"><span class="rk">${x[0].toUpperCase()}</span><div style="font-weight:600;color:var(--strong);margin-top:6px">${x[1]}</div><div class="small muted mt4">${x[2]}</div>${i===2?'<span class="badge b-b mt8">This setup</span>':''}</div>`).join(`<span class="rarrow">${I('right',16,2)}</span>`)}</div></div>`;
}
function canCannot(){
  const can=['Read transaction information needed for reconciliation','Identify incoming credits','Suggest invoice matches','Learn payer names after you confirm a match','Use confirmed payment timing in your buyers’ repayment history'];
  const cant=['Make payouts or transfers through RAY','Take payment actions without the appropriate Razorpay banking permissions','See accounts you did not connect','Assume every credit is from a buyer','Keep unrelated transactions'];
  return `<div class="grid g2 mt12" style="gap:12px"><div style="padding:14px 16px;border:1px solid var(--border);border-radius:10px;background:#fff"><div class="small" style="font-weight:600;color:var(--g)">RAY can</div>${can.map(x=>`<div class="row gap8 mt8 small" style="align-items:flex-start"><span style="color:var(--g);margin-top:1px">${I('check',14,2.4)}</span>${x}</div>`).join('')}</div><div style="padding:14px 16px;border:1px solid var(--border);border-radius:10px;background:#fff"><div class="small" style="font-weight:600;color:var(--r)">RAY cannot</div>${cant.map(x=>`<div class="row gap8 mt8 small" style="align-items:flex-start"><span style="color:var(--r);margin-top:1px">${I('x',14,2.4)}</span>${x}</div>`).join('')}</div></div>`;
}
A.canCannot=()=>modal({wide:true,title:'What RAY can and can’t do with your bank account',body:canCannot()+`<div class="mt12">${aaTag()}</div>`,actions:[{label:'Got it',cls:'btn-p'}]});

/* ---------- Entry: overview banner ---------- */
function bankEntry(){
  if(S.bank.st==='off') return `<div class="alert info mt16" id="bank-entry"><span class="ic">${I('bank',17)}</span><div class="grow"><h4>3 possible payments may be in your bank account.</h4><div class="small muted">Connect your business bank account so RAY can confirm incoming payments and reconcile invoices.</div></div><button class="btn btn-s btn-sm" onclick="A.bankStart()">Connect bank account</button></div>`;
  if(S.bank.st==='on') return `<div class="alert ok mt16"><span class="ic">${I('bank',17)}</span><div class="grow"><h4>Bank account connected · ${BANK_FULL}</h4><div class="small muted">${S.bank.sugg} suggested matches need your confirmation · last synced ${S.bank.last}</div></div><button class="btn btn-s btn-sm" onclick="A.reviewSugg()">Review suggestions</button></div>`;
  return `<div class="alert neutral mt16"><span class="ic">${I('pause',17)}</span><div class="grow"><h4>Bank feed paused.</h4><div class="small muted">RAY can’t automatically confirm payments received outside Razorpay.</div></div><button class="btn btn-s btn-sm" onclick="go('raahi/controls');setTimeout(()=>document.getElementById('bank').scrollIntoView({behavior:'smooth'}),80)">Manage</button></div>`;
}
A.bankStart=()=>{ A.closeWA&&A.closeWA(); closeModal(); go('raahi/bank'); };

/* ---------- Razorpay-native connect flow ---------- */
function bankPage(sub){
  const crumb=`<div class="crumb"><a onclick="go('studio')">Agent Studio</a>${I('right',13,2)}<a onclick="go('raahi/overview')">RAY Credit</a>${I('right',13,2)}<a onclick="go('raahi/activity/bank')">Bank feed</a>${I('right',13,2)}<b>${sub==='sync'?'Sync':'Connect bank account'}</b></div>`;
  if(sub==='auth') return `${crumb}<div style="max-width:720px">${flowSteps(3)}
   <div class="card pad mt20"><div class="row gap12"><span class="banktile">${I('bank',20)}</span><div><div class="h2">Authorise access to ${BANK_FULL}</div><div class="small muted">Step 3 of 4 · approve in your bank’s corporate internet banking</div></div></div>
    <div class="pr-kv mt20"><div><span>Account</span><b>${BANK_FULL}</b></div><div><span>Business</span><b>${M.name}</b></div><div><span>RAY uses</span><b>Transaction information for reconciliation</b></div></div>
    <div class="ol-note mt16"><span style="color:var(--link);flex-shrink:0">${I('lock',14,2)}</span><span>${CB_TRUST}</span></div>
    <div class="row gap8 mt20" id="cb-auth"><button class="btn btn-p" onclick="A.cbAuth()">Authorise in net banking</button><button class="btn btn-g" onclick="go('raahi/bank')">Back</button></div>
    <p class="xs muted mt12">${I('shield',12)} Razorpay never sees your banking password. You approve the connection inside your bank.</p>
   </div><div class="mt12">${aaTag()}</div></div>`;
  if(sub==='sync') return `${crumb}<div style="max-width:760px">${flowSteps(4)}${syncCard()}</div>`;
  const on=S.bank.st==='on';
  const acc=(k,t,s,chip)=>`<div role="button" class="radio-card cb-acc ${S.bank.pick===k||(!S.bank.pick&&k==='icici')?'on':''}" style="padding:14px 16px;align-items:center" onclick="S.bank.pick='${k}';rr()"><span class="radio"></span><span class="banktile" style="width:34px;height:34px">${I('bank',16)}</span><div class="grow"><b style="color:var(--strong)">${t}</b><div class="xs muted">${s}</div></div>${chip}</div>`;
  return `${crumb}<div style="max-width:820px">${flowSteps(1)}
   <div class="card pad mt20 ai-wash"><div class="h1" style="font-size:26px;max-width:600px">Connect bank account</div><p class="sub">Connect your business bank account so RAY can confirm incoming payments and reconcile invoices.</p><span class="badge b-n mt8" style="display:inline-block">Through RazorpayX Connected Banking+</span>
    <div class="col mt20">${[['check','Confirm UPI, NEFT and cheque payments','Buyer payments by PhonePe, Google Pay, Paytm, NEFT and cheque deposits, not just Razorpay links'],['ban','Never chase a buyer who has already paid','Reminders and autopay attempts are held when a matching credit shows up'],['alert','Spot returned or bounced cheques as they appear','RAY flags the reversal entry and reopens the invoice']].map(b=>`<div class="row gap16" style="padding:12px 0;border-top:1px solid var(--border-subtle);align-items:flex-start"><span style="width:34px;height:34px;border-radius:9px;background:#fff;border:1px solid var(--border);display:grid;place-items:center;color:var(--strong)">${I(b[0],17)}</span><div><div style="font-weight:600;color:var(--strong)">${b[1]}</div><div class="small muted">${b[2]}</div></div></div>`).join('')}</div></div>
   <div class="card pad mt16"><div class="h3">How RAY reads your bank</div><div class="small muted mt4">To confirm payments fast enough for reliable follow-ups, RAY uses enterprise-grade data layers.</div>${cbLayers()}</div>
   <div class="card pad mt16"><div class="h3">Choose the account</div><div class="col gap8 mt12">${acc('icici',BANK_FULL,M.name+' · supported for Connected Banking+','<span class="badge b-g">Business account</span>')}${acc('rzpx','RazorpayX Current Account','Open a new current account. Payments appear in real time.','<span class="badge b-n">Real-time</span>')}${acc('upload','Another bank','Upload a bank statement instead. RAY reads the credits and suggests matches.','<span class="badge b-n">Statement</span>')}</div>
</div>
   <div class="card pad mt16 trustbox"><div class="row gap12"><span class="trust-ic">${I('shield',20)}</span><div class="grow"><div style="font-family:var(--display);font-size:19px;font-weight:600;color:var(--strong)">RAY reads transactions. It cannot move money.</div><div class="muted mt4">${CB_TRUST}</div></div><a class="link small" onclick="A.canCannot()">What RAY can and can’t do</a></div><div class="mt12">${aaTag()}</div></div>
   <div class="row gap8 mt20">${on?`<span class="badge b-g">Already connected · ${BANK_NAME}</span><button class="btn btn-s" onclick="go('raahi/activity/bank')">Go to bank feed</button>`:`<button class="btn btn-p" onclick="S.bank.pick==='upload'?A.uploadStmt():S.bank.pick==='rzpx'?toast('Opens RazorpayX Current Account sign-up'):A.cbAuth()">Continue</button><button class="btn btn-g" onclick="history.length>1?history.back():go('raahi/overview')">Not now</button>`}</div></div>`;
}
A.cbAuth=()=>{ const el=document.getElementById('cb-auth'); if(el) el.innerHTML=thinking('Waiting for approval from your bank…'); setTimeout(()=>{ S.bank.sync=0; S.bank.st='syncing'; go('raahi/bank/sync'); },1600); };
function syncCard(){
  const s=S.bank.sync;
  const stages=[['Fetching the last 6 months of credits…','1,284 credits found'],['Matching 1,284 credits to invoices…','1,201 matched automatically'],['Learning payer names and UPI IDs…','37 buyers recognised']];
  return `<div class="card pad mt20"><div class="row gap12"><span class="banktile" style="background:#eaf1fe;color:var(--link)">${I('bank',20)}</span><div class="grow"><div class="h2">${s>=4?'Bank feed ready':'Setting up your bank feed'}</div><div class="small muted">${BANK_FULL} · RazorpayX Connected Banking+</div></div><span class="badge b-g">${I('check',11,2.6)} Connected</span></div>
   <div class="mt20">${stages.map((x,i)=>{const n=i+1; const st=s>n?'done':s===n?'cur':'todo'; return `<div class="row gap12" style="padding:12px 0;border-top:1px solid var(--border-subtle)">${st==='done'?`<span class="sdot done">${I('check',12,3)}</span><span style="font-weight:500;color:var(--strong)">${x[1]}</span>`:st==='cur'?thinking(x[0]):`<span class="sdot"></span><span class="faint">${x[0]}</span>`}</div>`}).join('')}</div>
   ${s>=4?`<div class="grid g3 mt16" style="gap:0;border:1px solid var(--border);border-radius:10px;overflow:hidden">${[['1,201','Matched automatically','var(--g)'],['61','Suggested matches','var(--a)','Need your confirmation'],['22','Unidentified','var(--n)']].map((m,i)=>`<div style="padding:16px 18px;border-left:${i?'1px solid var(--border-subtle)':'0'}"><div class="mid num">${m[0]}</div><div class="small" style="font-weight:600;color:${m[2]}">${m[1]}</div>${m[3]?`<div class="xs muted">${m[3]}</div>`:''}</div>`).join('')}</div>
    <p class="muted mt12">New credits now appear in your bank feed shortly after they arrive.</p>
    <div class="row gap8 mt16"><button class="btn btn-p" onclick="A.reviewSugg()">Review suggestions</button><button class="btn btn-s" onclick="S.bank.filter='All';go('raahi/activity/bank')">Go to bank feed</button></div>`:''}
   <div class="mt16">${aaTag()}</div></div>`;
}
hooks.push(r=>{ if(r==='raahi/bank/sync'&&S.bank.sync===0){ S.bank.sync=1; rr();
  setTimeout(()=>{S.bank.sync=2; if(route()==='raahi/bank/sync') rr();},1700);
  setTimeout(()=>{S.bank.sync=3; if(route()==='raahi/bank/sync') rr();},3300);
  setTimeout(()=>{S.bank.sync=4; completeConnection(); if(route()==='raahi/bank/sync') rr();},4800); } });
function completeConnection(){
  if(S.bank.ever&&S.bank.st==='on') return;
  S.bank.st='on'; S.bank.ever=true; S.adj.arora=42800;
  log({ic:'shield',ti:`Bank account connected · ${BANK_FULL}`,de:'RazorpayX Connected Banking+ · transaction information for reconciliation · payment actions need separate banking permissions',src:['aa'],who:'Approved by '+M.owner+' · Connected Banking+'});
  log({ic:'match',ti:'First bank sync: 1,284 credits',de:'1,201 matched · 61 suggested · 22 unidentified',src:['aa'],who:'RAY'});
  if(S.coll.arora==='scheduled'){ S.coll.arora='paidbank'; log({ic:'ban',ti:'Autopay attempt cancelled for Arora Retail',de:'₹42,800 already received 10:16 AM by NEFT · matched to INV-24860 from your bank account · RAY does not collect twice',src:['aa'],who:'RAY',chem:'Arora Retail'}); }
  if(S.gupta.promise==='saved') payGupta('bank');
}
function payGupta(via){
  if(['paid','broken'].includes(S.gupta.promise)&&S.gupta.paidVia) return;
  const pr=openPromise('gupta'), bal=balOf('gupta','INV-24891'); const amt=Math.min(bal, (pr&&pr.first&&pr.first.amt)||Math.round(bal/2)); if(!amt) return;
  const r=ledgerPay('gupta','INV-24891',amt,{type:'PAYMENT_RECEIVED', source:via==='bank'?'Bank account (Connected Banking+)':'Razorpay Smart Collect', actor:via==='bank'?'Connected Banking+':'Razorpay', ref:via==='bank'?'UPI/62739182':'pay_GT24891sc'}); if(!r.ok) return;
  if(pr&&pr.first) pr.first.paid=true; const row=S.bank.rows.find(x=>x.gupta); if(row) row.amt=amt;
  S.gupta.promise=S.gupta.promise==='broken'?'broken':'paid'; S.gupta.paidVia=via; S.gupta.paidAmt=amt;
  const left=balOf('gupta','INV-24891');
  log(via==='bank'?{ic:'rupee',ti:`${inr(amt)} received from Gupta Traders`,de:`UPI from guptatraders@okhdfc · matched to INV-24891 · verified · ${inr(left)} remaining`,src:['aa'],who:BANK_NAME+' · Connected Banking+',chem:'Gupta Traders'}
    :{ic:'rupee',ti:`${inr(amt)} received from Gupta Traders`,de:`UPI · Razorpay Smart Collect · auto-matched to INV-24891 · verified · ${inr(left)} remaining`,src:['rzp'],who:'Razorpay',chem:'Gupta Traders'});
  if(S.wa.msgs) waPush({from:'ray',html:`${inr(amt)} received from Gupta Traders${via==='bank'?' (guptatraders@okhdfc, via your bank account)':''} and matched to INV-24891. ${inr(left)} is still due${pr&&pr.later?' by '+RayDates.fmtDay(pr.later.date):''}.`});
  toast(`${inr(amt)} from Gupta Traders matched to INV-24891`);
}
/* legacy overlay hooks kept as no-ops so older entry points stay safe */
A.aaGo=()=>go('raahi/bank/auth');
A.aaRenew=()=>{ A.closeWA&&A.closeWA(); goSec('raahi/controls','bank'); };
A.aaClose=(to)=>{ const r=document.getElementById('aa-root'); if(r) r.innerHTML=''; S.aa=null; if(to) go(to); };
function aaRender(){ const r=document.getElementById('aa-root'); if(r) r.innerHTML=''; }

/* ---------- Bank feed screen (RAY → Activity → Bank feed) ---------- */
function actSeg(w){ return `<div class="seg mt24"><button class="${w==='audit'?'on':''}" onclick="go('raahi/activity')">Audit trail</button><button class="${w==='bank'?'on':''}" onclick="go('raahi/activity/bank')">Bank feed${bankOn()?` <span class="tcount">${S.bank.sugg+S.bank.unid}</span>`:''}</button></div>`; }
function revokedBanner(){
  return `<div class="alert neutral mt16"><span class="ic">${I('pause',17)}</span><div class="grow"><h4>Bank feed paused.</h4><div class="small muted">RAY can’t automatically confirm payments received outside Razorpay.</div></div>${S.bank.st==='paused'?`<button class="btn btn-p btn-sm" onclick="A.bankResume()">Resume</button>`:`<button class="btn btn-s btn-sm" onclick="A.uploadStmt()">${I('dl',14)} Upload statement</button><button class="btn btn-p btn-sm" onclick="A.bankStart()">Reconnect</button>`}</div>`;
}
function vBankFeed(){
  const b=S.bank;
  if(b.st==='off'||b.st==='syncing') return `${actSeg('bank')}<div class="card pad mt16" style="max-width:760px"><div class="row gap12"><span class="banktile">${I('bank',20)}</span><div class="grow"><div class="h2">Bank feed</div><div class="small muted">Not connected</div></div><span class="badge b-n">Not connected</span></div><p class="mt16" style="color:var(--strong)">Connect your business bank account so RAY can confirm incoming payments and reconcile invoices.</p><p class="small muted mt4">Buyer payments by PhonePe, Google Pay, Paytm, NEFT and cheque land in your bank, not in Razorpay, so RAY can’t see them yet.</p><div class="row gap8 mt16"><button class="btn btn-p" onclick="A.bankStart()">Connect bank account</button><span class="xs muted row gap4">${I('lock',12)} RazorpayX Connected Banking+</span></div></div>`;
  const f=b.filter, rows=bankRows().filter(r=>f==='All'||(f==='Matched'&&r.st==='matched')||(f==='Suggested'&&r.st==='suggested')||(f==='Unidentified'&&r.st==='unid'));
  const chip=(k,l,c)=>`<button class="chip ${f===k?'on':''}" onclick="S.bank.filter='${k}';rr()">${l}${c!=null?` <span class="cnt">${c}</span>`:''}</button>`;
  const stc=r=>r.st==='matched'?'<span class="badge b-g">MATCHED</span>':r.st==='suggested'?'<span class="badge b-a">SUGGESTED</span>':r.st==='notrecv'?'<span class="badge b-n">NOT A RECEIVABLE</span>':'<span class="badge b-n">UNIDENTIFIED</span>';
  return `${actSeg('bank')}${b.st!=='on'?revokedBanner():''}
  <div class="card pad mt16"><div class="row gap16 wrap"><span class="banktile">${I('bank',20)}</span><div class="grow"><div class="row gap8"><span class="h2">Bank feed</span>${b.st==='on'?'<span class="badge b-g"><span class="dot"></span>Connected</span>':b.st==='paused'?'<span class="badge b-n">Paused</span>':'<span class="badge b-r">Disconnected</span>'}</div><div class="small muted mt4">${BANK_FULL} · Source: RazorpayX Connected Banking+</div></div>
   <div class="kv"><span class="k">Last synced</span><span style="font-weight:600;color:var(--strong)">${b.last}</span></div><div class="vdiv"></div><div class="kv"><span class="k">Next sync</span><span style="font-weight:600;color:var(--strong)">${b.st==='on'?b.next:'–'}</span></div>
   <button class="btn btn-s" onclick="A.bankSync(this)" ${b.st==='on'?'':'disabled'}>${I('refresh',15)} Sync now</button><button class="btn btn-s" onclick="go('raahi/controls');setTimeout(()=>document.getElementById('bank').scrollIntoView({behavior:'smooth'}),80)">Manage</button></div>
   <div class="mt12">${aaTag()}</div></div>
  <div class="grid mt16 bankgrid" style="grid-template-columns:minmax(0,1fr);align-items:start">
   <div class="card bf-card"><div class="row gap6 pad-s" style="border-bottom:1px solid var(--border-subtle)">${chip('All','All')}${chip('Matched','Matched',1201+(b.sugg<61?61-b.sugg:0))}${chip('Suggested','Suggested',b.sugg)}${chip('Unidentified','Unidentified',b.unid)}<span class="grow"></span><span class="xs muted">Credits only · debits are never shown</span></div>
    <table class="table bf"><thead><tr><th>Time</th><th>Payer</th><th class="r">Amount</th><th>Matched to</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.length?rows.map(r=>{const ch=r.to&&chem(r.to); return `<tr id="row-${r.id}"><td class="small"><span class="muted">${r.d==='Today'?'':'Yest. '}</span>${r.t}</td><td><div class="nm" style="font-family:ui-monospace,Menlo,monospace;font-size:12.5px">${r.payer}</div><div class="xs muted num">${r.ref}</div></td><td class="r num nm">${inr(r.amt)}</td>
     <td>${r.st==='matched'&&ch?`<a onclick="go('raahi/buyer/${r.to}')" style="font-weight:600">${ch.name}</a><div class="xs muted">${r.inv}</div>`:r.st==='suggested'?`<span class="muted">${ch.name}?</span><div class="xs muted">${r.inv}</div>`:'<span class="faint">–</span>'}</td>
     <td>${stc(r)}</td><td class="r">${r.st==='suggested'?`<button class="btn btn-s btn-sm" onclick="A.bankSuggest('${r.id}')" ${b.st==='on'?'':'disabled'}>Confirm</button>`:r.st==='unid'?`<button class="btn btn-s btn-sm" onclick="A.bankAssign('${r.id}')">Assign</button>`:''}</td></tr>`}).join(''):`<tr><td colspan="6"><div class="empty">No credits in this view today.</div></td></tr>`}
    </tbody></table>
    <div class="pad-s small muted" style="border-top:1px solid var(--border-subtle)">Showing today and yesterday · 1,284 credits fetched from the last 6 months · older suggestions are in the Suggested filter</div></div>
</div>`;
}
A.reviewSugg=()=>{ S.bank.filter='Suggested'; go('raahi/activity/bank'); setTimeout(()=>{ if(S.bank.rows.find(r=>r.id==='r3'&&r.st==='suggested')) A.bankSuggest('r3'); },250); };
A.bankSync=(btn)=>{ btn.outerHTML=thinking('Checking '+BANK_NAME+'…'); setTimeout(()=>{ S.bank.fetch.unshift(['10:58 AM','No new credits']); S.bank.last='10:58 AM'; S.bank.next='11:58 AM'; rr(); toast('Synced · no new credits since 10:42 AM'); },1300); };
A.bankSuggest=(id)=>{ const r=S.bank.rows.find(x=>x.id===id), ch=chem(r.to);
  modal({title:'Confirm this match?',body:`<div class="row between" style="padding:14px 16px;border:1px solid var(--border);border-radius:10px"><div><div class="xs muted">Payment</div><div class="mid num">${inr(r.amt)}</div><div class="small muted" style="font-family:ui-monospace,Menlo,monospace">${r.payer} · ${r.ref} · ${r.t}</div></div><span class="src aa">${BANK_NAME} · Connected Banking+</span></div>
   <div class="mt12" style="padding:14px 16px;border:1px solid #cfe0fd;border-radius:10px;background:#f5f9ff"><div class="row between"><span class="ai-tag">${clover(14)} RAY suggests</span><span class="badge b-g">Confidence: High</span></div><div class="h3 mt8" style="font-size:16px">${ch.name}</div><div class="row gap24 mt8"><div><div class="xs muted">Invoice</div><b>${r.inv}</b></div><div><div class="xs muted">Outstanding</div><b class="num">${inr(r.amt)}</b></div></div>
    <div class="xs muted mt12" style="font-weight:600">Why this match</div>${['Exact amount','Similar payer name','Bansal General Store paid from this account previously'].map(x=>`<div class="row gap8 small mt4"><span style="color:var(--g)">${I('check',13,2.4)}</span>${x}</div>`).join('')}</div>
   <p class="xs muted mt12">RAY doesn’t auto-match new payer names. Lower-confidence payments always wait for you.</p>`,
   actions:[{label:'Leave unidentified',cls:'btn-g',fn:()=>{closeModal();r.st='unid';S.bank.sugg--;S.bank.unid++;rr();toast('Left unidentified')}},{label:'Choose another',fn:()=>{closeModal();A.bankAssign(id)}},{label:'Confirm match',cls:'btn-p',fn:()=>{closeModal();bankMatch(r,r.to,r.inv,true)}}]}); };
function bankMatch(r,to,inv,fromSugg){
  const ch=chem(to); r.st='matched'; r.to=to; r.inv=inv||'On account';
  if(fromSugg) S.bank.sugg--; else S.bank.unid--;
  S.adj[to]=(S.adj[to]||0)+r.amt; ledgerPay(to, inv, r.amt, {type:'PAYMENT_RECONCILED', source:'Bank account (Connected Banking+)', actor:M.owner, ref:r.ref}); S.bank.learned++; S.bank.aliases.unshift([r.payer,ch.name,true]);
  log({ic:'match',ti:`${inr(r.amt)} matched to ${ch.name}`,de:`${r.payer} · ${r.ref} · ${r.inv} · RAY will recognise this payer next time`,src:['aa'],who:'Confirmed by '+M.owner+' · Bank feed',chem:ch.name});
  rr(); toast(`Matched · RAY will recognise “${r.payer}” as ${ch.name}`);
}
A.bankAssign=(id)=>{ const r=S.bank.rows.find(x=>x.id===id);
  const sug = r.hint?[{id:r.hint,inv:r.hintInv,why:'Exact amount (₹31,400 buyer invoice open) · “CTY MART” resembles City Mart',conf:'Medium'}]:r.id==='r4'?[{id:'kapoor',inv:'On account',why:'Owner name Rajesh Kapoor · amount doesn’t match an open invoice',conf:'Low'}]:[];
  const list=(q)=>CHEM.filter(c=>!q||c.name.toLowerCase().includes(q.toLowerCase())).slice(0,7).map(c=>`<button class="radio-card as-opt" style="padding:10px 12px" data-id="${c.id}" onclick="A.asPick(this)"><span class="radio"></span><span class="grow">${c.name} <span class="xs muted">· ${c.area}</span></span><span class="xs muted num">${inr(chemView(c).out)} due</span></button>`).join('');
  window._asList=list; window._asRow=id;
  modal({title:'Who made this payment?',body:`<div class="row between" style="padding:12px 14px;border:1px solid var(--border);border-radius:10px"><div><b class="num" style="font-size:16px;color:var(--strong)">${inr(r.amt)}</b> <span class="small muted" style="font-family:ui-monospace,Menlo,monospace">· ${r.payer} · ${r.ref}</span></div><span class="small muted">${r.d}, ${r.t}</span></div>
   ${sug.length?`<div class="lbl mt16">Suggested</div><div class="col gap6 mt8">${sug.map(s=>`<button class="radio-card as-opt" style="padding:10px 12px" data-id="${s.id}" data-inv="${s.inv}" onclick="A.asPick(this)"><span class="radio"></span><span class="grow"><b style="color:var(--strong)">${chem(s.id).name}</b> <span class="xs muted">· ${s.inv}</span><div class="xs muted">${s.why}</div></span><span class="badge ${s.conf==='Medium'?'b-a':'b-n'}">${s.conf}</span></button>`).join('')}</div>`:''}
   <div class="lbl mt16">Search buyer</div><div class="searchbox mt8">${I('search',16)}<input class="input" placeholder="Search buyer" oninput="document.getElementById('as-list').innerHTML=window._asList(this.value)"></div>
   <div class="col gap6 mt8" id="as-list" style="max-height:220px;overflow:auto">${list('')}</div>
   <button class="radio-card as-opt mt8" style="padding:10px 12px" data-id="none" onclick="A.asPick(this)"><span class="radio"></span><span class="grow">Not a buyer payment <span class="xs muted">· for example an own transfer or refund, excluded from matching</span></span></button>`,
   actions:[{label:'Cancel'},{label:'Confirm match',cls:'btn-p',id:'as-ok',disabled:true,fn:()=>{const p=document.querySelector('.as-opt.on'); if(!p) return; closeModal(); const to=p.dataset.id;
     if(to==='none'){ r.st='notrecv'; S.bank.unid--; log({ic:'x',ti:`${inr(r.amt)} marked as not a receivable`,de:`${r.payer} · excluded from buyer matching`,src:['aa'],who:'Decided by '+M.owner+' · Bank feed'}); rr(); toast('Excluded from matching'); return; }
     bankMatch(r,to,p.dataset.inv||'On account',false);}}]}); };
A.asPick=(el)=>{ document.querySelectorAll('.as-opt').forEach(x=>x.classList.remove('on')); el.classList.add('on'); const b=document.getElementById('as-ok'); if(b) b.disabled=false; };
A.learnedAll=()=>modal({title:`Learned payers · ${S.bank.learned}`,body:`<div class="small muted">Payer identities RAY recognises in your bank feed. Remove any that look wrong.</div><div class="mt12" style="max-height:340px;overflow:auto">${[...S.bank.aliases,...CHEM.filter(c=>!['gupta','arora','sethi','mehta'].includes(c.id)).map(c=>[IDS[c.id].upi,c.name])].slice(0,S.bank.learned).map(p=>`<div class="row gap8" style="padding:8px 0;border-top:1px solid var(--border-subtle)"><span style="font-family:ui-monospace,Menlo,monospace;font-size:12px">${p[0]}</span><span class="faint">${I('arrowR',13,2)}</span><span class="small" style="font-weight:600;color:var(--strong)">${p[1]}</span><button class="btn btn-g btn-sm" style="margin-left:auto" onclick="this.closest('.row').remove()">Remove</button></div>`).join('')}</div>`,actions:[{label:'Done',cls:'btn-p'}]});

/* ---------- Controls → Bank feed ---------- */
function bankControls(){
  const b=S.bank;
  if(b.st==='off'||b.st==='syncing') return `<div class="setrow"><div class="t"><b>Bank feed</b><span>Connect your business bank account so RAY can confirm incoming payments and reconcile invoices.</span></div><span class="badge b-n">Not connected</span></div><button class="btn btn-p mt8" onclick="A.bankStart()">Connect bank account</button>${canCannot()}`;
  const kv=(k,v)=>`<div><div class="xs muted" style="font-weight:500">${k}</div><div style="font-weight:600;color:var(--strong);margin-top:2px">${v}</div></div>`;
  return `${b.st==='revoked'||b.st==='paused'?revokedBanner().replace('mt16',''):''}
   <div class="row gap12 mt12"><span class="banktile">${I('bank',18)}</span><div class="grow"><div class="row gap8"><b style="color:var(--strong)">Bank feed</b>${b.st==='on'?'<span class="badge b-g">Connected</span>':b.st==='paused'?'<span class="badge b-n">Paused</span>':'<span class="badge b-r">Revoked</span>'}</div><div class="small muted">${BANK_FULL}</div></div></div>
   <div class="grid mt16" style="grid-template-columns:repeat(3,1fr);gap:16px;padding:16px;background:#fbfbfc;border:1px solid var(--border-subtle);border-radius:10px">${kv('Connection',b.st==='revoked'?'Disconnected today':'RazorpayX Connected Banking+')}${kv('Last fetch',b.last)}${kv('Next fetch',b.st==='on'?b.next:'–')}${kv('RAY reads','Transaction information')}${kv('Used for','Reconciliation · credits only')}${kv('Payment actions','Need banking permissions')}</div>
   <div class="row gap8 mt16">${b.st==='on'?`<button class="btn btn-s" onclick="A.bankPause()">${I('pause',15)} Pause bank feed</button>`:b.st==='paused'?`<button class="btn btn-s" onclick="A.bankResume()">${I('play',14)} Resume bank feed</button>`:''}${b.st!=='revoked'?`<button class="btn btn-d" onclick="A.bankRevoke()">Disconnect</button>`:''}</div>
   <div class="mt12">${aaTag()}</div>${canCannot()}`;
}
A.bankPause=()=>modal({title:'Pause bank feed?',body:'<p class="muted">RAY will stop checking for new payments until you resume it.</p>',actions:[{label:'Cancel'},{label:'Pause',cls:'btn-p',fn:()=>{closeModal();S.bank.st='paused';log({ic:'pause',ti:'Bank feed paused',de:BANK_NAME+' · no new fetches until resumed',src:['aa'],who:M.owner+' · Dashboard'});rr();toast('Bank feed paused')}}]});
A.bankResume=()=>{S.bank.st='on';log({ic:'play',ti:'Bank feed resumed',de:'Next fetch within the hour',src:['aa'],who:M.owner+' · Dashboard'});rr();toast('Bank feed resumed')};
A.bankRevoke=()=>modal({title:'Disconnect bank account?',body:`<p style="color:var(--strong)">RAY will stop reading new transactions from ${BANK_NAME}.</p><p class="muted mt8">Existing matched payment records will remain attached to their invoices.</p><p class="muted mt8">You can upload statements instead.</p>`,actions:[{label:'Cancel'},{label:'Disconnect',cls:'btn-d',fn:()=>{closeModal();S.bank.st='revoked';log({ic:'ban',ti:'Bank account disconnected',de:BANK_NAME+' · Connected Banking+ access removed · matched records kept',src:['aa'],who:M.owner+' · Dashboard'});rr();toast('Disconnected · RAY has stopped reading '+BANK_NAME)}}]});
A.uploadStmt=()=>{ modal({title:'Upload a statement',body:`<p class="muted">RAY will read the credits and suggest matches. Nothing is connected to your bank.</p><div class="col gap6 mt12">${['PDF bank statement','PhonePe Business export','Paytm for Business export','CSV / XLSX bank export'].map((x,i)=>`<button class="radio-card ${i===0?'on':''}" style="padding:10px 12px" onclick="this.parentNode.querySelectorAll('.radio-card').forEach(y=>y.classList.remove('on'));this.classList.add('on')"><span class="radio"></span>${x}</button>`).join('')}</div>
  <div class="mt12" id="up-drop" style="border:1.5px dashed var(--border);border-radius:10px;padding:22px;text-align:center;color:var(--muted);cursor:pointer" onclick="this.innerHTML='${I('doc',18).replace(/"/g,'&quot;')} <b style=&quot;color:var(--strong)&quot;>Statement_Oct2026.pdf</b> · 312 KB';document.getElementById('up-ok').disabled=false">${I('dl',18)}<div class="small mt4">Click to choose a file</div></div>`,
  actions:[{label:'Cancel'},{label:'Upload',cls:'btn-p',id:'up-ok',disabled:true,fn:()=>{document.querySelector('.modal-b').innerHTML=`<div style="padding:24px 0">${thinking('Reading statement · matching credits…')}</div>`;document.querySelector('.modal-f').style.display='none';
   setTimeout(()=>{log({ic:'doc',ti:'Statement uploaded · Statement_Oct2026.pdf',de:'42 credits · 39 matched · 3 to review',src:['aa'],who:'Uploaded by '+M.owner});document.querySelector('.modal-b').innerHTML='<div class="alert ok" style="border:0;padding:8px 0"><span class="ic">'+I('check',17,2.4)+'</span><div><h4>42 credits read</h4><div class="small muted mt4">39 matched to invoices · 3 need your review in the bank feed.</div></div></div>';const f=document.querySelector('.modal-f');f.style.display='flex';f.innerHTML='<button class="btn btn-p" onclick="closeModal();rr()">Done</button>'},1600)}}]}); };

/* ---------- No-chase rule ---------- */
function preSendChecks(){
  const b=S.bank, held=CHASE.filter(c=>S.chase[c.id].st==='held').length;
  const it=(ok,l,s)=>`<span class="row gap6 small"><span style="color:${ok===true?'var(--g)':ok==='warn'?'var(--a)':'var(--faint)'}">${I(ok===true?'check':ok==='warn'?'pause':'minus',14,2.4)}</span><span style="font-weight:500;color:var(--strong)">${l}</span>${s?`<span class="muted">${s}</span>`:''}</span>`;
  return `<div class="row gap16 wrap" style="padding:12px 16px;border:1px solid var(--border);border-radius:10px;background:#fff;margin-top:12px"><span class="xs muted" style="font-weight:600;text-transform:uppercase;letter-spacing:.04em">Before any reminder, RAY checks</span>
   ${it(true,'Razorpay payments','')}
   ${b.st==='on'?it(true,'Bank account','· ICICI ••4821'):`<span class="row gap6 small"><span class="faint">${I('minus',14,2.4)}</span><span style="font-weight:500;color:var(--strong)">Bank account</span><a class="small" onclick="A.bankStart()">Connect</a></span>`}
   ${it(held?'warn':true,'Unidentified credits',held?`· ${held} reminder paused`:'· none')}
   ${it(true,'Salesperson collections','')}</div>`;
}
A.sendAnyway=(id)=>{const ch=chem(id), c=CHASE.find(x=>x.id===id);
  modal({title:`Send reminder anyway to ${ch.name}?`,body:`<p style="color:var(--strong)">RAY found an unmatched ₹26,500 payment from yesterday that may already cover this.</p><p class="muted mt8">If it’s theirs, you’ll be chasing a buyer who has already paid. Review the payment first if you can.</p>`,actions:[{label:'Cancel'},{label:'Review payment',fn:()=>{closeModal();goSec('raahi/actions','grp-check')}},{label:'Send reminder anyway',cls:'btn-d',id:'send-anyway',fn:()=>{closeModal();S.chase[id].st='sent';S.chase[id].at=nowT();log({ic:'send',ti:`Reminder sent anyway to ${ch.name}`,de:`Override · unmatched ₹26,500 credit still unreviewed · ${inr(c.amt)}`,src:['conv'],who:'Approved by '+M.owner+' · Dashboard',chem:ch.name});rr();toast('Reminder sent · override logged')}}]});};

/* ---------- Connect bank account: choose account → verify OTP → authorise → sync (Razorpay-native) ---------- */
function otpBoxes(id){return `<div class="aa-otp" id="${id}" style="justify-content:flex-start">${[0,1,2,3,4,5].map(()=>`<input maxlength="1" inputmode="numeric" oninput="if(this.value&&this.nextElementSibling)this.nextElementSibling.focus()">`).join('')}</div>`}
function fillOtp(id){document.querySelectorAll('#'+id+' input').forEach((e,i)=>{if(!e.value)e.value='482915'[i]})}
const CB_ACCTS=[['icici','ICICI Bank','Current A/c ••4821'],['rbl','RBL Bank','Current A/c ••0392'],['axis','Axis Bank','Current A/c ••7715']];
const CB_LAYERS=[['bank','Direct partner bank APIs','Through RazorpayX Connected Banking+, secure API integrations with partner banks like ICICI, RBL and Axis stream live transaction data and balance updates, without polling delays.'],['zap','RazorpayX Current Account','Payments into a RazorpayX Current Account appear in real time.'],['shield','Natively embedded payment gateway','Online collections live inside Razorpay’s payment ecosystem, so successful payments are recognised instantly at the infrastructure level.']];
function cbLayers(){ return `<div class="col gap8 mt8">${CB_LAYERS.map(x=>`<div class="row gap10 small" style="align-items:flex-start"><span class="cb-ic">${I(x[0]==='zap'?'pulse':x[0],14,2)}</span><div><b style="color:var(--strong)">${x[1]}</b><div class="muted mt4">${x[2]}</div></div></div>`).join('')}</div>`; }
function cbDots(step){ const st=['pick','otp','auth','sync'], n=st.indexOf(step==='done'?'sync':step)+(step==='done'?1:0);
  return `<div class="inst-dots">${['Choose account','Verify OTP','Authorise','Sync'].map((l,i)=>`<span class="inst-d ${i<n?'done':i===n?'cur':''}"><i>${i<n?I('check',11,3):i+1}</i>${l}</span>`).join('<em></em>')}</div>`; }
function cbRender(){
  const f=S.cbf; if(!f) return; const a=CB_ACCTS.find(x=>x[0]===f.acct)||CB_ACCTS[0], name=`${a[1]} · ${a[2]}`;
  let body='', acts=[];
  if(f.step==='pick'){
    body=`<div class="h3" style="font-size:16px">Choose the account RAY should read</div><p class="muted mt4">Business current accounts with partner banks connect through RazorpayX Connected Banking+.</p>
     <div class="col gap8 mt12">${CB_ACCTS.map(x=>`<div role="button" class="radio-card ${f.acct===x[0]?'on':''}" style="padding:12px 14px;align-items:center" onclick="S.cbf.acct='${x[0]}';cbRender()"><span class="radio"></span><span class="banktile" style="width:32px;height:32px">${I('bank',15)}</span><div class="grow"><b style="color:var(--strong)">${x[1]}</b><div class="xs muted">${x[2]} · ${M.name}</div></div>${x[0]==='icici'?'<span class="badge b-g">Found for this business</span>':'<span class="badge b-n">Partner bank</span>'}</div>`).join('')}
      <div role="button" class="radio-card" style="padding:12px 14px;align-items:center" onclick="toast('Opens RazorpayX Current Account sign-up')"><span class="radio"></span><span class="banktile" style="width:32px;height:32px;background:#eaf1fe;color:var(--link)">${I('bank',15)}</span><div class="grow"><b style="color:var(--strong)">RazorpayX Current Account</b><div class="xs muted">Open one in minutes · payments appear in real time</div></div></div></div>
     <div class="field mt16"><label>Mobile number registered with your bank</label><input class="input num" value="+91 98••••7720" style="max-width:240px"></div>`;
    acts=[{label:'Cancel',fn:()=>A.cbCancel()},{label:'Send OTP',cls:'btn-p',id:'cb-next',fn:()=>{S.cbf.step='otp';cbRender()}}];
  } else if(f.step==='otp'){
    body=`<div class="h3" style="font-size:16px">Verify with ${a[1]}</div><p class="muted mt4">Enter the 6-digit OTP sent by ${a[1]} to +91 98••••7720 to link ${a[2]}.</p>
     <div class="mt16">${otpBoxes('cbotp')}</div><button class="link small mt12" onclick="this.textContent='OTP resent to +91 98••••7720';this.disabled=true">Resend OTP</button>
     <div class="xs muted mt12 row gap4">${I('lock',12)} The OTP comes from your bank. Razorpay never sees your banking password.</div>`;
    acts=[{label:'Back',fn:()=>{S.cbf.step=f.ctx==='page'?'otp':'pick';if(f.ctx==='page'){A.cbCancel();return} cbRender()}},{label:'Verify',cls:'btn-p',id:'cb-next',fn:()=>{fillOtp('cbotp');setTimeout(()=>{S.cbf.step='auth';cbRender()},450)}}];
  } else if(f.step==='auth'){
    body=`<div class="h3" style="font-size:16px">Authorise RAY Credit to read this account</div>
     <div class="pr-kv mt12" style="grid-template-columns:1fr 1fr"><div><span>Account</span><b>${name}</b></div><div><span>Connection</span><b>RazorpayX Connected Banking+</b></div><div><span>RAY reads</span><b>Live transaction feed and balance updates</b></div><div><span>Used for</span><b>Confirming payments before follow-ups and reconciling invoices</b></div></div>
     <div class="ol-note mt12"><span style="color:var(--link);flex-shrink:0">${I('lock',14,2)}</span><span>${CB_TRUST} You can disconnect anytime from Controls.</span></div>`;
    acts=[{label:'Cancel',fn:()=>A.cbCancel()},{label:'Authorise',cls:'btn-p',id:'cb-next',fn:()=>A.cbAuthorise()}];
  } else if(f.step==='sync'){
    body=`<div style="padding:22px 0">${thinking(`Connecting to ${a[1]} through Connected Banking+ · fetching the last 6 months of credits…`)}</div>`; acts=[];
  } else if(f.step==='done'){
    body=`<div class="alert ok"><span class="ic">${I('bank',17)}</span><div class="grow"><h4>${name} connected</h4><div class="small muted">1,284 credits fetched · 1,201 matched automatically · RAY now checks this account before every follow-up.</div></div></div>`;
    acts=[{label:'Continue',cls:'btn-p',id:'cb-next',fn:()=>{S.cbf=null; if(S.inst){ S.inst.step=3; instRender(); } else closeModal(); }}];
  }
  modal({wide:true,title:'Connect bank account',body:cbDots(f.step)+body,actions:acts,onclose:()=>A.cbCancel(true)});
}
A.cbStart=(ctx,acct)=>{ S.cbf={ctx,step:ctx==='page'?'otp':'pick',acct:acct||'icici'}; cbRender(); };
A.cbCancel=(closed)=>{ const ctx=S.cbf&&S.cbf.ctx; S.cbf=null; if(!closed) closeModal(); if(ctx==='inst'&&S.inst){ instRender(); } };
A.cbAuthorise=()=>{ const f=S.cbf;
  if(f.ctx==='page'){ S.cbf=null; closeModal(); S.bank.sync=0; S.bank.st='syncing'; go('raahi/bank/sync'); return; }
  f.step='sync'; cbRender(); setTimeout(()=>{ if(!S.cbf) return; S.bank.sync=4; completeConnection(); if(S.inst) S.inst.bank=true; S.cbf.step='done'; cbRender(); },1800); };
A.cbAuth=()=>A.cbStart('page',S.bank.pick&&S.bank.pick!=='upload'&&S.bank.pick!=='rzpx'?S.bank.pick:'icici');
