/* ================= PROTOTYPE CHECKS: only tests that actually ran, policy separate from journeys =================
 *  1. Policy checks       pure rules on synthetic inputs (runChecks in workspace.js), run now in this browser
 *  2. Journey checks      the 12 reported journeys, run now in this browser through the same commands the
 *                         buttons call, on a sandboxed copy of the demo state (your state is restored after)
 *  3. Recorded runs       node unit tests and Playwright browser journeys, run in development; embedded at
 *                         build time with their date and build id. Shown as recorded, never as live.
 */
const TEST_RUNS = __TESTRUNS__;
const J = {};
function journeyChecks(){
  const saved=JSON.stringify(S), savedClock=_clock, keep={render, waRender, mobRender, toast, modal, closeModal};
  const out=[]; const ok=(c,d)=>({pass:!!c, detail:d||''});
  const run=(id,name,f)=>{ try{ const r=f(); out.push(Object.assign({id,name},r)); }catch(e){ out.push({id,name,pass:false,detail:'Error: '+e.message}); } };
  /* quiet sandbox: same commands, no rendering, no toasts, no modals */
  window.render=()=>{}; window.waRender=()=>{}; window.mobRender=()=>{}; window.toast=()=>{}; window.modal=()=>{}; window.closeModal=()=>{};
  const fresh=()=>{ S=S0(); _clock=12; _recCache={}; _recSig=''; engInit(); syncChase(true); S.installed=true; };
  try{
    fresh();
    let p, key, res;
    run('J1','Approve ₹60,000 · 14 days applies exactly those values',()=>{ p=creditProposal('gupta'); key=holdProposal(p); res=creditApprove(key,'Checks',{setup:false});
      return ok(res&&res.ok&&p.limit===60000&&p.terms===14&&curLimitOf('gupta')===60000&&curTermsOf('gupta')===14, `proposal ${inr(p.limit)} · ${p.terms}d → applied ${inr(curLimitOf('gupta'))} · ${curTermsOf('gupta')}d`); });
    run('J2','Re-evaluating after approval does not compound (stays 14 days)',()=>{ const v=[1,2,3].map(()=>{ _recCache={}; _recSig=''; engineSync(); const r=recOf('gupta'); return r.recommendedLimit+'/'+r.recommendedTerms; });
      return ok(v.every(x=>x==='60000/14')&&!recChanged('gupta'), v.join(', ')); });
    run('J4','Confirming the same proposal twice applies once',()=>{ const r2=creditApprove(key,'Checks',{setup:false}); const n=evOf('gupta').filter(e=>e.type==='CREDIT_APPROVED').length; return ok(r2&&!r2.ok&&n===1, `second confirm: ${r2&&r2.msg} · approvals recorded: ${n}`); });
    run('J3','Undo restores limit, terms, request and decision; audit keeps both events',()=>{ undoCredit('gupta','Checks'); const t=evOf('gupta').map(e=>e.type);
      return ok(curLimitOf('gupta')===100000&&curTermsOf('gupta')===30&&S.gupta.rec==='open'&&!S.req.gupta&&decOf('gupta').status==='baseline'&&t.includes('CREDIT_APPROVED')&&t[t.length-1]==='CREDIT_REVERSED', `${inr(curLimitOf('gupta'))} · ${curTermsOf('gupta')}d · ${S.gupta.rec} · events ${t.slice(-2).join(', ')}`); });
    run('J5','Failed ₹20,000 → ₹5,000 partial leaves ₹15,000',()=>{ A.recSend('gupta'); A.recPay('gupta',5000,'chk-pay-1'); const r=recoveryOf('gupta'); return ok(r.balance===15000&&r.received===5000&&r.status==='partial', `${r.status} · received ${inr(r.received)} · balance ${inr(r.balance)}`); });
    run('J6','Paying the ₹15,000 balance completes the recovery everywhere',()=>{ A.recPay('gupta',15000,'chk-pay-2'); const r=recoveryOf('gupta'); syncChase(true);
      const row=recoveryOverviewRow((...a)=>a.join(' ')); return ok(r.status==='completed'&&!recoveriesActive().includes('gupta')&&failCount()===0&&!/Recovering ₹0/.test(row)&&/recovered in full/i.test(row), `${r.status} · active ${recoveriesActive().length} · overview: ${row.replace(/<[^>]+>/g,'').slice(0,60)}`); });
    run('J7','WhatsApp, mobile and Ray AI answers match the ledger',()=>{ const a=ruleAnswer('Gupta Traders ka payment kya hua?','wa'), wa=waAns(a).html, mb=ansText(mobAnswer('Gupta Traders ka payment kya hua?'));
      return ok(/recovered in full/.test(wa)&&/recovered in full/.test(mb)&&!/₹15,000 still due/.test(wa+mb)&&wa.includes(inr(outOf('gupta'))), `owes ${inr(outOf('gupta'))} · ${a.lines[1]||''}`.slice(0,140)); });
    run('J8','Overpayment and a repeated payment reference are rejected',()=>{ const a=ledgerPay('gupta','INV-24891',99999,{ref:'chk-over'}), b=ledgerPay('gupta','INV-24891',1000,{ref:'chk-pay-1x'}), c=ledgerPay('gupta','INV-24891',1000,{ref:'chk-pay-1x'});
      return ok(!a.ok&&b.ok&&!c.ok&&balOf('gupta','INV-24891')===37400, `over: ${a.error} · repeat: ${c.error}`); });
    fresh();
    run('J9','Invalid minimums are rejected; an edited minimum and message persist to the link',()=>{ const bad=['','abc','0','-5','25000','5000.5'].map(x=>RayGuards.linkMinimum(x,20000).ok);
      const rs=recS('gupta'); rs.draftMin='10000'; rs.draftMsg='Gupta ji, thoda bhi bhej sakte hain.'; A.recSend('gupta'); const L=recS('gupta').link, o=S.outbox.filter(x=>x.kind==='payment_link').slice(-1)[0];
      return ok(bad.every(x=>!x)&&L&&L.min===10000&&/thoda bhi/.test(L.msg)&&o&&o.payload.min===10000&&/minimum ₹10,000/.test(S.act[0].de), `link minimum ${L&&inr(L.min)} · outbox ${o&&inr(o.payload.min)}`); });
    run('J10','With the bank not connected, no screen claims a bank check',()=>{ S.bank.st='off'; const t=sourcesLine('gupta','INV-24790',{html:false});
      return ok(/Not checked: Your bank account/.test(t)&&!/RAY checked[^.]*bank/.test(t)&&/does not mean the buyer has not paid/.test(t), t.slice(0,140)); });
    run('J11','A verified full payment cancels the scheduled reminder',()=>{ const c=CHASE.find(x=>x.ch==='wa'&&x.invs&&x.invs.length===1&&gateFor(x.id,'whatsapp',x.invs[0].inv).action==='send'); const inv=c.invs[0].inv;
      trySend(c.id,{inv, msg:'x', via:'Checks', scheduleAt:simNowMs()+3600e3}); ledgerPay(c.id, inv, balOf(c.id,inv), {ref:'chk-full-'+c.id});
      const o=S.outbox.filter(x=>x.buyerId===c.id).slice(-1)[0]; return ok(o.status==='cancelled', `${BUY[c.id].name} · ${inv} · reminder ${o.status}`); });
    run('J12','Do not contact, pause, stale ledger and quiet hours hold at every send path',()=>{ S.ctl.dnc=['Gupta Traders','Gupta Kirana Store'];
      const links=()=>S.outbox.filter(o=>o.kind==='payment_link'&&o.status!=='blocked').length, n0=links(); const a=sendMessage('gupta',{msg:'x',quiet:true}).gate.code; A.recSend('gupta'); const b=links()===n0?'none':'sent', k=kirDoSend(true), kc=k&&k.gate&&k.gate.code;
      S.ctl.dnc=[]; S.paused=true; const pz=sendMessage('chawla',{msg:'x',quiet:true}).gate.code, cp=creditApprove(holdProposal(creditProposal('gupta')),'Checks',{setup:false}).ok;
      S.paused=false; S.stale=true; const st=sendMessage('chawla',{msg:'x',quiet:true}).gate.code; S.stale=false; _clock=21*60-9*60; const q=sendMessage('chawla',{msg:'x',quiet:true}).queued;
      return ok(a==='dnc'&&b==='none'&&kc==='dnc'&&pz==='paused'&&cp===false&&st==='stale'&&q===true, `dnc ${a} · link ${b} · retailer ${kc} · paused ${pz}/${cp} · stale ${st} · quiet ${q?'queued':'sent'}`); });
  } finally {
    S=JSON.parse(saved); _clock=savedClock; Object.assign(window, keep); _recCache={}; _recSig=''; engineSync(); syncChase(true);
  }
  return out; }

let _checks=null;
function recRunCard(r){ if(!r) return '';
  const same=r.build===BUILD_ID, when=r.ranAt?new Date(r.ranAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}):'unknown time';
  const fails=(r.cases||[]).filter(c=>!c.pass);
  return `<div class="card mt12" style="overflow:hidden"><div class="pad-s row gap8 wrap" style="border-bottom:1px solid var(--border-subtle)"><span class="h3">${esc(r.suite)}</span><span class="badge ${r.failed?'b-r':'b-g'}">${r.passed} of ${r.total} passed</span><span class="badge ${same?'b-g':'b-a'}">${same?'Same build as this page':'Recorded on an earlier build'}</span><span class="xs muted" style="margin-left:auto">Ran ${esc(when)} IST · build ${esc(r.build||'?')} · ${esc(r.file)}</span></div>
    ${fails.length?fails.map(c=>`<div class="row gap12" style="padding:10px 18px;border-top:1px solid var(--border-subtle)"><span style="color:var(--r)">${I('x',15,2.6)}</span><div class="grow small"><b style="color:var(--strong);font-weight:500">${c.journey?`[${esc(c.journey)}] `:''}${esc(c.name)}</b>${c.detail?`<div class="xs muted">${esc(c.detail)}</div>`:''}</div></div>`).join(''):`<div class="pad-s small muted">No failures in this run.${r.groups?' '+r.groups.map(g=>`${esc(g.name)} ${g.passed}/${g.total}`).join(' · '):''}</div>`}
    <details class="pad-s" style="border-top:1px solid var(--border-subtle)"><summary class="small" style="cursor:pointer;font-weight:600">All ${r.total} cases</summary><div class="mt8">${(r.cases||[]).map(c=>`<div class="xs row gap6" style="padding:3px 0"><span style="color:${c.pass?'var(--g)':'var(--r)'}">${I(c.pass?'check':'x',12,2.6)}</span><span>${c.journey?`[${esc(c.journey)}] `:''}${esc(c.name)}</span></div>`).join('')}</div></details></div>`; }
function vChecks(){
  if(!_checks){ const t0=performance.now(); const pol=runChecks(), jr=journeyChecks(); _checks={at:nowLabel(), pol, jr, ms:Math.round(performance.now()-t0)}; }
  const pc=_checks.pol.flatMap(g=>g.cases), pp=pc.filter(c=>c.pass).length, jp=_checks.jr.filter(c=>c.pass).length;
  const badge=(p,t)=>`<span class="badge ${p===t?'b-g':'b-r'}">${p} of ${t} pass</span>`;
  const runs=TEST_RUNS||{};
  return `${pageHead('Prototype checks','Only tests that actually ran are shown. Policy checks and journey checks run now in your browser; development suites show their last recorded run.',`<button class="btn btn-s" id="checks-rerun" onclick="_checks=null;rr();toast('Checks run again')">${I('refresh',15)} Run again</button>`)}
   <div class="card pad-s mt16 row gap12 wrap"><span class="small"><b style="color:var(--strong)">Run in this browser at ${_checks.at} IST</b> · ${_checks.ms} ms</span>${badge(pp,pc.length)}<span class="xs muted">policy checks</span>${badge(jp,_checks.jr.length)}<span class="xs muted">journey checks</span><span class="xs muted" style="margin-left:auto">Build ${BUILD_ID}</span></div>
   <div class="h2 mt24" style="font-size:18px">1 · Journey checks <span class="xs muted" style="font-weight:500">run now · same commands the buttons call · on a copy of your demo state, which is restored afterwards</span></div>
   <div class="card mt12" style="overflow:hidden" id="checks-journeys">${_checks.jr.map(c=>`<div class="row gap12" style="padding:11px 18px;border-top:1px solid var(--border-subtle);align-items:flex-start"><span style="color:${c.pass?'var(--g)':'var(--r)'};margin-top:1px">${I(c.pass?'check':'x',15,2.6)}</span><div class="grow"><div class="small" style="color:var(--strong);font-weight:500"><span class="xs muted">${c.id}</span> ${esc(c.name)}</div>${c.detail?`<div class="xs muted mt4 num">${esc(c.detail)}</div>`:''}</div></div>`).join('')}</div>
   <div class="h2 mt24" style="font-size:18px">2 · Policy checks <span class="xs muted" style="font-weight:500">run now · pure rules on synthetic inputs</span></div>
   ${_checks.pol.map(g=>`<div class="card mt12" style="overflow:hidden"><div class="pad-s" style="border-bottom:1px solid var(--border-subtle)"><div class="row gap8"><span class="h3">${esc(g.name)}</span><span class="badge ${g.cases.every(c=>c.pass)?'b-g':'b-r'}">${g.cases.filter(c=>c.pass).length}/${g.cases.length}</span></div><div class="small muted mt4">${esc(g.about)}</div></div>
     ${g.cases.map(c=>`<div class="row gap12" style="padding:11px 18px;border-top:1px solid var(--border-subtle);align-items:flex-start"><span style="color:${c.pass?'var(--g)':'var(--r)'};margin-top:1px">${I(c.pass?'check':'x',15,2.6)}</span><div class="grow"><div class="small" style="color:var(--strong);font-weight:500">${esc(c.name)}</div>${c.detail?`<div class="xs muted mt4 num">${esc(c.detail)}</div>`:''}</div></div>`).join('')}</div>`).join('')}
   <div class="h2 mt24" style="font-size:18px">3 · Recorded development runs <span class="xs muted" style="font-weight:500">not run in your browser · shown as last recorded</span></div>
   ${runs.unit||runs.e2e||runs.smoke?[runs.unit,runs.e2e,runs.smoke].map(recRunCard).join(''):'<div class="card pad mt12 small muted">No recorded runs are embedded in this build. Run <code>npm run test:all</code> to record them.</div>'}
   <div class="card pad mt16"><div class="h3">Not tested here</div><div class="small muted mt8">Live AI answers and live AI reading of replies (no provider key on this deployment, so the live path did not run). Real WhatsApp delivery, real bank feeds, Marg sync, mandates and debits (all simulated). Replies in Devanagari script: the rule-based reader catches digits and buyer names but not dates or Hindi number words. Visual layout is checked by eye, not by these tests.</div></div>`;
}
