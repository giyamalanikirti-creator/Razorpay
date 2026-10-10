/* ================= RAY CREDIT & COLLECTIONS · AGENT STUDIO DETAIL PAGE + INSTALL ================= */
function pgRAYAgent(){
  const inst=S.installed;
  const chip=(k,l)=>`<span class="ag-chip">${svc(k)}${l}</span>`;
  const steps=[
   ['Request credit','A buyer asks for credit','Requests arrive from a connected WhatsApp Business inbox or are forwarded to RAY.'],
   ['Assess','How they pay you, and everyone else','Repayment across distributors on Razorpay, plus your own ledger, collection reliability, exposure and seasonal context. Every limit is explained.'],
   ['Approve limit & terms','You decide','RAY recommends a limit and terms with reasons. Nothing changes without your approval.'],
   ['Set repayment method','How the buyer will repay','UPI Autopay, eNACH mandate or manual payment links, authorised by the buyer.'],
   ['Monitor','Spot risk early','Detect slower payments, broken promises and falling orders before invoices are overdue.'],
   ['Collect','On the agreed schedule','Pre-due reminders, then automatic collection on the due date within the authorised mandate.'],
   ['Recover if needed','Smart recovery','A failed debit starts a staged plan with partial-payment links, never an automatic default.'],
   ['Reconcile','Confirm payment first','Match payments across Razorpay and your connected bank account before anyone is chased.'],
   ['Learn','Outcomes improve decisions','Successful and failed collections update each buyer’s repayment record.'],
   ['Next credit decision','A better next call','RAY raises or lowers the next recommendation based on how the buyer actually repaid.']];
  const capsNote='';
  const caps=['Read invoice and ledger history','Read Razorpay payment history','Explainable credit assessment','Recommend credit limits and terms','Set up UPI Autopay and eNACH collection','Pre-due reminders','Collect within authorised mandates','Recover failed collections','Partial-payment links','Detect early payment risk','Understand payment promises','Reconcile through a connected bank account','Learn from repayment outcomes','Maintain audit trail','Learn repayment across distributors on Razorpay'];
  return `<div class="page fadein" style="max-width:1080px">
  <div class="crumb"><a onclick="go('studio')">Agent Studio</a>${I('right',13,2)}<b>RAY Credit</b></div>
  <div class="row gap10"><span class="h1" style="font-size:30px">RAY Credit</span><span class="ag-beta">Beta</span>${inst?'<span class="badge b-g"><span class="dot"></span>Installed</span>':''}</div>
  <div class="muted mt4" style="font-size:15px">Network-powered credit intelligence for B2B distributors</div>
  <div class="row gap8 mt12 wrap">${chip('rzp','Razorpay')}${chip('marg','Marg / Tally')}${chip('wa','WhatsApp')}<span class="faint">·</span><span class="ag-free">${I('spark',12,2)} Free access during beta</span></div>
  <div class="row gap8 mt20">${inst?`<button class="btn btn-p" onclick="go('raahi/overview')">Open agent</button><button class="btn btn-s" onclick="go('raahi/controls')">Settings</button>`:`<button class="btn btn-p" id="install-raahi" onclick="A.installRAY()">Install Agent</button>`}</div>
  <hr class="hr mt24">
  <div class="ag-body">
   <div class="ag-head mt24">Decide credit using how buyers actually repay across the Razorpay network.</div>
   <p class="ag-p mt16">RAY Credit combines your own ledger and payment history with consented repayment signals across participating Razorpay distributors to recommend credit limits, spot deterioration early, and guide collections.</p>
   <div class="h3 mt24" style="font-size:17px">Why only Razorpay</div><div class="grid g3 mt12" style="gap:12px">${[['Earlier warning','A buyer who starts paying other distributors late shows up weeks before your ledger does.'],['Hidden risk','A buyer who is on time with you but falling behind elsewhere is flagged before the next order.'],['Day-one credit','A new buyer with no history with you gets a limit based on how they pay everyone else.']].map(x=>`<div class="ag-why"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div><p class="small muted mt12">${I('lock',12)} Consented and aggregated. No other distributor is ever named. RAY complements Razorpay’s Receivables Agent with this credit layer.</p>
   <p class="small muted mt12">For B2B distributors that repeatedly sell to buyers on trade credit.</p>

   <div class="h3 mt32" style="font-size:17px">How it works</div><div class="mt12">${lifecycle({},{compact:true})}</div>
   <div class="vstep card mt12">${steps.map((s,i)=>`<div class="vs-it"><div class="vs-rail"><span class="vs-dot"></span>${i<steps.length-1?'<span class="vs-line"></span>':''}</div><div class="vs-c"><div class="row gap8"><span class="vs-t">${s[0]}</span><span class="vs-n">Step ${i+1}</span></div><div class="vs-s">${s[1]}</div><div class="vs-d">${s[2]}</div></div></div>`).join('')}</div>

   <div class="h3 mt32" style="font-size:17px">Capabilities</div>
   <div class="row gap8 mt12 wrap">${caps.map(c=>`<span class="ag-cap">${c}</span>`).join('')}</div>

   <div class="h3 mt32" style="font-size:17px">Built for trust</div>
   ${agentCanCant()}
   <p class="small muted mt16">You stay in control. RAY recommends and explains. You decide what happens next.</p>
   ${useAnywhere()}
  </div></div>`;
}
function agentCanCant(){
  const can=['Recommend credit limits and payment terms, with reasons','Spot buyers whose repayment behaviour is starting to weaken','Learn how a buyer repays other distributors on Razorpay, with consent, to warn earlier and extend credit faster','Collect within authorised mandates, recover failed payments, and learn from every repayment outcome'];
  const cant=['Change credit limits, pause supply, or take sensitive actions without your approval','Read personal WhatsApp chats or conversations you have not explicitly shared or authorised','Reveal another distributor’s identity, invoices, or individual transactions','Debit beyond a mandate the buyer authorised, move money using bank access, or lend directly. Any financing comes from a regulated lending partner'];
  const col=(h,items,ok)=>`<div class="ag-cc"><div class="ag-cch" style="color:${ok?'var(--g)':'var(--r)'}">${h}</div>${items.map(x=>`<div class="row gap10 mt12" style="align-items:flex-start"><span style="color:${ok?'var(--g)':'var(--r)'};margin-top:1px;flex-shrink:0">${I(ok?'check':'x',16,2.4)}</span><span style="color:var(--text)">${x}</span></div>`).join('')}</div>`;
  return `<div class="grid g2 mt12" style="gap:16px;align-items:stretch">${col('RAY can',can,true)}${col('RAY cannot',cant,false)}</div>`;
}
/* ---------- install flow: ledger → bank → mode ---------- */
A.installRAY=()=>{ S.inst={step:1, ledger:null, auto:'review', bank:S.bank.st==='on'}; instRender(); };
const svcSm = k => svc(k).replace('class="svc','style="width:30px;height:30px;border-radius:8px;font-size:13px" class="svc');
function instRender(){
  const s=S.inst; const dots=['Connect ledger','Connect bank account','Choose mode'].map((l,i)=>`<span class="inst-d ${i+1<s.step?'done':i+1===s.step?'cur':''}"><i>${i+1<s.step?I('check',11,3):i+1}</i>${l}</span>`).join('<em></em>');
  let body='', acts=[];
  if(s.step===1){
    const opt=(k,l,d,ic)=>`<button class="radio-card ${s.ledger===k?'on':''}" style="padding:14px 16px;align-items:center" onclick="S.inst.ledger='${k}';instRender()"><span class="radio"></span>${ic}<div class="grow"><b style="color:var(--strong)">${l}</b><div class="xs muted">${d}</div></div>${s.ledger===k&&k!=='xls'?'<span class="badge b-g">'+I('check',11,2.6)+' Connected</span>':''}</button>`;
    body=`<div class="h3" style="font-size:16px">Connect ledger</div><p class="muted mt4">Connect your receivables data so RAY can understand invoices, dues, and repayment history.</p><div class="col gap8 mt16">${opt('tally','Tally','Ledgers and vouchers',svcSm('tally'))}${opt('marg','Marg','Demo connector · 1,184 open invoices found',svcSm('marg'))}${opt('xls','Upload file','Excel or CSV receivables report',`<span class="svc mail" style="width:30px;height:30px;border-radius:8px">${I('doc',14,2)}</span>`)}</div>`;
    acts=[{label:'Cancel'},{label:'Continue',cls:'btn-p',disabled:!s.ledger,fn:()=>{S.inst.step=2;instRender()}}];
  } else if(s.step===2){
    const yes=s.choice!=='no';
    const li=(ic,t,d)=>`<div class="row gap10 small mt8" style="align-items:flex-start"><span class="cb-ic">${I(ic,14,2)}</span><div><b style="color:var(--strong)">${t}</b><div class="muted mt4">${d}</div></div></div>`;
    if(s.bank){ body=`<div class="h3" style="font-size:16px">Connect bank account</div><div class="alert ok mt12"><span class="ic">${I('bank',17)}</span><div class="grow"><h4>${BANK_FULL} connected</h4><div class="small muted">Through RazorpayX Connected Banking+ · 1,284 credits fetched · RAY checks this account before every follow-up.</div></div></div>`;
      acts=[{label:'Back',fn:()=>{S.inst.step=1;instRender()}},{label:'Continue',cls:'btn-p',fn:()=>{S.inst.step=3;instRender()}}]; }
    else {
    body=`<div class="h3" style="font-size:16px">Connect bank account</div><p class="muted mt4">Should RAY check your business bank account before it recommends any follow-up?</p>
     <div class="col gap8 mt12">
      <div role="button" class="radio-card ${yes?'on':''}" style="padding:14px 16px;align-items:flex-start" onclick="S.inst.choice='yes';instRender()"><span class="radio" style="margin-top:2px"></span><div class="grow"><div class="row gap8"><b style="color:var(--strong)">Yes, connect my bank account</b><span class="badge b-n">Recommended</span></div>
       <div class="small mt4" style="color:var(--text)">RAY confirms payments in your bank before any follow-up, so follow-ups are more accurate and it never chases a buyer who has already paid.</div>
       ${yes?`<div class="cb-box mt12"><div class="xs" style="font-weight:700;color:var(--strong);letter-spacing:.03em">HOW RAY READS YOUR BANK</div>${cbLayers()}<div class="xs muted mt8 row gap4">${I('lock',12)} ${CB_TRUST}</div></div>`:''}</div></div>
      <div role="button" class="radio-card ${yes?'':'on'}" style="padding:14px 16px;align-items:flex-start" onclick="S.inst.choice='no';instRender()"><span class="radio" style="margin-top:2px"></span><div class="grow"><b style="color:var(--strong)">No, not now</b>
       <div class="small mt4" style="color:var(--text)">RAY still works, but follow-ups are less accurate. Payments made by NEFT, RTGS, IMPS or UPI apps straight into your bank are only seen when a buyer shares a UTR or your ledger syncs.</div>
       ${yes?'':`<div class="cb-box mt12"><div class="xs" style="font-weight:700;color:var(--strong);letter-spacing:.03em">WITHOUT A BANK CONNECTION, RAY READS</div>
        ${li('shield','Razorpay payment rails','Payment links, payment pages and invoices paid through Razorpay are tracked instantly through real-time webhooks.')}
        ${li('doc','Intelligent Reconciliation (UTR matching)','When a buyer shares a UTR number or a bank screenshot, RAY scans it, cross-checks your ledger and marks the invoice as paid.')}
        ${li('refresh','ERP and accounting sync','Receivables ageing from Tally, Marg, Zoho Books or QuickBooks, updated when a payment clears.')}
        ${li('truck','Salesperson collections','Cash and cheques your team records in the field.')}
        <div class="ol-note mt12"><span style="color:var(--a);flex-shrink:0">${I('info',14,2)}</span><span>With <b>Yes</b>, RAY can check your bank before every follow-up, so it never chases a buyer who has already paid and its follow-ups are more accurate.</span></div></div>`}</div></div>
     </div>`;
    acts=[{label:'Back',fn:()=>{S.inst.step=1;instRender()}},{label:yes?'Continue to connect':'Continue without bank',cls:'btn-p',id:'inst-bank',fn:()=>{ if(yes) A.cbStart('inst','icici'); else { S.inst.step=3; instRender(); } }}];
    }
  } else if(s.step===3){
    body=`<div class="h3" style="font-size:16px">Choose mode</div><p class="muted mt4">Choose how much RAY can do automatically.</p><div class="col gap8 mt16"><button class="radio-card ${s.auto==='review'?'on':''}" onclick="S.inst.auto='review';instRender()"><span class="radio"></span><div><b style="color:var(--strong)">Review first</b> <span class="badge b-n" style="margin-left:6px">Recommended</span><div class="muted small mt4">RAY prepares recommendations. You approve actions.</div></div></button><button class="radio-card ${s.auto==='routine'?'on':''}" onclick="S.inst.auto='routine';instRender()"><span class="radio"></span><div><b style="color:var(--strong)">Routine automation</b><div class="muted small mt4">Allow low-risk routine actions after you configure limits.</div></div></button></div>
     <div class="xs muted mt12 row gap4">${I('lock',12)} Sensitive decisions always require approval.</div>`;
    acts=[{label:'Back',fn:()=>{S.inst.step=2;instRender()}},{label:'Install RAY Credit',cls:'btn-p',fn:()=>A.installDo()}];
  }
  modal({wide:true,title:'Install RAY Credit',body:`<div class="inst-dots">${dots}</div>${body}`,actions:acts});
}
A.instBank=()=>A.cbStart('inst','icici');
A.installDo=()=>{ const s=S.inst;
  document.querySelector('.modal-b').innerHTML=`<div style="padding:22px 0">${thinking('Reading 1,184 open invoices · building 642 credit profiles…')}</div>`; document.querySelector('.modal-f').style.display='none';
  setTimeout(()=>{ closeModal(); S.installed=true; S.ctl.auto=s.auto; S.inst=null;
    log({ic:'agent',ti:'RAY Credit installed from Agent Studio',de:`${s.ledger==='tally'?'Tally':s.ledger==='xls'?'Receivables upload':'Marg (demo connector)'} connected · bank ${S.bank.st==='on'?'connected':'not connected yet'} · ${s.auto==='review'?'Review first':'Routine automation'}`,src:['led'],who:'Installed by '+M.owner});
    go('raahi/overview'); toast('RAY Credit is ready · 642 credit profiles built'); },1800); };
