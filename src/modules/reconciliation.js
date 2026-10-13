/* ================= RECONCILIATION · REVIEW PAYMENT (confirm payment first, chase second) ================= */
const PAYREV = {};
const prS = id => (S.pr[id]=S.pr[id]||{st:null,check:null});
const prPending = id => !!PAYREV[id] && PAYREV[id].open!==false && !prS(id).st && !(id==='verma'&&S.vermaMatched);
const PR_ST = {received:'Received · merchant confirmed', matched:'Matched from bank feed', rzp:'Matched to Razorpay payment', scheduled:'Follow-up scheduled', sent:'Reminder sent'};
const prMob = () => !!(document.getElementById('mob-root')&&document.getElementById('mob-root').innerHTML);
const prWho = () => M.owner+' · '+(prMob()?'RAY Credit for Mobile':'Dashboard');
function prMsg(id){ const c=chem(id), p=PAYREV[id], st=prS(id); return st.msg || `Hi ${c.name.split(' ')[0]} ji, ${inr(p.amt)} against ${p.inv} is still showing as pending. If you’ve already paid, please share the payment reference. Otherwise, you can clear it using the link below.`; }
function prStatusBadge(id){ const st=prS(id); if(id==='verma'&&S.vermaMatched&&!st.st) return '<span class="badge b-g">Matched to Razorpay payment</span>'; return st.st?`<span class="badge ${st.st==='scheduled'?'b-b':st.st==='sent'?'b-n':'b-g'}">${PR_ST[st.st]}${st.when?' · '+st.when:''}</span>${st.st==='received'?' <span class="badge b-n">Merchant confirmed</span>':''}`:'<span class="badge b-a">Payment not confirmed</span>'; }
/* sheets render as a modal on desktop and a bottom sheet in RAY Credit for Mobile */
function prOpen(html){ if(prMob()){ S.mob.sheet='pr'; S.mob.prHtml=html; mobRender(); } else modal({title:'',body:html,actions:[]}); }
function prClose(){ if(prMob()){ S.mob.sheet=null; mobRender(); } else closeModal(); }
function prRefresh(){ rr(); if(S.mob) mobRender(); }
A.prMark=(id)=>{ const c=chem(id), p=PAYREV[id];
  prOpen(`<div class="pr-sh"><h3>Mark this invoice as paid?</h3><div class="pr-kv"><div><span>Buyer</span><b>${c.name}</b></div><div><span>Invoice</span><b>${p.inv}</b></div><div><span>Amount</span><b class="num">${inr(p.amt)}</b></div></div>
   <p class="small muted mt12">Use this when you have independently confirmed that the payment was received.</p>
   <div class="field mt12"><label>Payment received on <span class="muted">(optional)</span></label><input class="input" id="pr-date" type="date" value="${S.today}"></div>
   <div class="field mt8"><label>Add note <span class="muted">(optional)</span></label><input class="input" id="pr-note" placeholder="For example, cash collected by salesperson"></div>
   <div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose()">Cancel</button><button class="btn btn-p" onclick="A.prMarkDo('${id}')">Mark as received</button></div></div>`); };
A.prMarkDo=(id)=>{ const c=chem(id), p=PAYREV[id], n=(document.getElementById('pr-note')||{}).value||'';
  const r=ledgerPay(id, p.inv, balOf(id,p.inv), {source:'Merchant confirmation', actor:prWho(), ref:'manual-'+p.inv, meta:{attested:'merchant', note:n}});
  if(!r.ok) return toast(r.error);
  const st=prS(id); st.st='received'; st.when=null; if(id==='verma') S.vermaMatched=true; S.adj[id]=(S.adj[id]||0)+r.event.amount;
  log({ic:'check',ti:'Payment marked as received manually',de:`${c.name} · ${p.inv} · ${inr(r.event.amount)} · merchant confirmed, not verified by RAY · balance ${inr(r.event.meta.balanceBefore)} → ${inr(r.event.meta.balanceAfter)}${n?' · '+n:''}`,src:[],who:'Marked by '+prWho(),chem:c.name}); prClose(); prRefresh(); toast('Marked as received · merchant confirmed'); };
A.prCheck=(id)=>{ const c=chem(id), st=prS(id);
  if(S.bank.st!=='on') return prOpen(`<div class="pr-sh"><h3>Connect your business bank account to check payments automatically.</h3><p class="small muted mt8">RAY can only check a bank statement when your business bank account is connected through RazorpayX Connected Banking+ or a statement is uploaded.</p><div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose();A.uploadStmt()">Upload bank statement</button><button class="btn btn-p" onclick="prClose();A.closeMobile();A.bankStart()">Connect bank account</button></div></div>`);
  st.check='running'; prRefresh();
  setTimeout(()=>{ st.check='done'; if(!PAYREV[id].cands.length) log({ic:'bank',ti:'Bank statement checked, no match found',de:`${c.name} · ${PAYREV[id].inv} · ${inr(PAYREV[id].amt)} · ${BANK_NAME}`,src:['aa'],who:'RAY'}); prRefresh(); },1300); };
A.prMatch=(id,k)=>{ const c=chem(id), p=PAYREV[id], cd=p.cands[k];
  const r=ledgerPay(id, p.inv, cd.amt, {type:'PAYMENT_RECONCILED', source:'Bank account (Connected Banking+)', actor:prWho(), ref:cd.ref}); if(!r.ok) return toast(r.error);
  const st=prS(id); st.st='matched'; st.when=null; S.adj[id]=(S.adj[id]||0)+cd.amt; S.bank.learned++; S.bank.aliases.unshift([cd.from,c.name,true]);
  log({ic:'match',ti:`Payment matched to ${p.inv} from bank feed`,de:`${c.name} · ${inr(cd.amt)} · ${cd.from} · ${cd.ref} · balance ${inr(r.event.meta.balanceBefore)} → ${inr(r.event.meta.balanceAfter)}${r.event.meta.balanceAfter===0?' · reminders for this invoice cancelled':' · '+inr(r.event.meta.balanceAfter)+' still due'} · RAY will recognise this payer next time`,src:['aa'],who:'Confirmed by '+prWho(),chem:c.name}); prClose(); prRefresh(); toast(r.event.meta.balanceAfter===0?`Matched · ${p.inv} paid · reminders cancelled`:`Matched · ${inr(r.event.meta.balanceAfter)} still due`); };
A.prReviewCand=(id,k)=>{ const c=chem(id), p=PAYREV[id], cd=p.cands[k];
  prOpen(`<div class="pr-sh"><h3>Is this ${c.name}’s payment?</h3><div class="pr-kv"><div><span>Amount</span><b class="num">${inr(cd.amt)}</b></div><div><span>From</span><b>${cd.from}</b></div><div><span>Received</span><b>${cd.t}</b></div></div><p class="small muted mt12">Low confidence: the amount is ₹${(p.amt-cd.amt).toLocaleString('en-IN')} short of ${p.inv} and the payer name only partly matches.</p><div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose()">Not this buyer</button><button class="btn btn-p" onclick="A.prMatch('${id}',${k})">Match payment</button></div></div>`); };
A.prMatchRzp=(id)=>{ const c=chem(id), p=PAYREV[id], pos=p&&p.possible; if(!pos) return;
  if(RayEvents.refInUse(S.led, pos.ref)) { prRefresh(); return toast(`${pos.ref} is already matched to ${p.inv}. Nothing applied twice.`); }
  const r=ledgerPay(id, p.inv, pos.amt, {type:'PAYMENT_RECONCILED', source:'Razorpay Smart Collect', actor:prWho(), ref:pos.ref}); if(!r.ok) return toast(r.error);
  const st=prS(id); st.st='rzp'; if(id==='verma') S.vermaMatched=true;
  log({ic:'match',ti:`Payment matched to ${p.inv}`,de:`${c.name} · ${inr(pos.amt)} · Razorpay Smart Collect · ${pos.ref} · balance ${inr(r.event.meta.balanceBefore)} → ${inr(r.event.meta.balanceAfter)}${r.event.meta.balanceAfter===0?' · reminders cancelled':''}`,src:['rzp'],who:'Confirmed by '+prWho(),chem:c.name}); prRefresh(); toast(r.event.meta.balanceAfter===0?'Payment matched · reminder cancelled':`Matched · ${inr(r.event.meta.balanceAfter)} still due`); };
A.prLater=(id)=>{ const p=PAYREV[id];
  const nx=nextOpenInv(id), T=S.today;
  const opts=[['Tomorrow',RayDates.fmtShort(RayDates.addDays(T,1))],['In 3 days',RayDates.fmtShort(RayDates.addDays(T,3))],['On due date of next invoice',nx?RayDates.fmtShort(nx.due):RayDates.fmtShort(RayDates.addDays(T,7))],['Choose date','']];
  prOpen(`<div class="pr-sh"><h3>Remind you when?</h3><div class="col gap8 mt12">${opts.map((o,i)=>`<div role="button" class="radio-card pr-opt ${i===1?'on':''}" data-d="${o[1]}" style="padding:11px 14px" onclick="document.querySelectorAll('.pr-opt').forEach(x=>x.classList.remove('on'));this.classList.add('on')"><span class="radio"></span><span class="grow">${o[0]}</span><span class="xs muted">${o[1]||`<input class="input" id="pr-cd" type="date" value="${RayDates.addDays(S.today,4)}" style="height:30px;width:140px" onclick="event.stopPropagation();document.querySelectorAll('.pr-opt').forEach(x=>x.classList.remove('on'));this.closest('.pr-opt').classList.add('on')">`}</span></div>`).join('')}</div>
   <p class="small mt12" style="color:var(--strong)">${I('lock',12)} RAY will not contact the buyer yet.</p><p class="xs muted mt4">This is a reminder for you. Nothing is sent to ${chem(id).name}.</p>
   <div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose()">Cancel</button><button class="btn btn-p" onclick="A.prLaterDo('${id}')">Set reminder</button></div></div>`); };
A.prLaterDo=(id)=>{ const o=document.querySelector('.pr-opt.on'); let d=o?o.dataset.d:RayDates.fmtShort(RayDates.addDays(S.today,3)); if(!d){ const v=(document.getElementById('pr-cd')||{}).value||RayDates.addDays(S.today,4); const dt=new Date(v); d=dt.getDate()+' '+dt.toLocaleString('en-GB',{month:'short'}); }
  const st=prS(id); st.st='scheduled'; st.when=d; if(S.chase[id]&&S.chase[id].st==='draft') S.chase[id].st='skipped';
  log({ic:'cal',ti:`Follow-up scheduled for ${d}`,de:`${chem(id).name} · ${PAYREV[id].inv} · internal reminder · buyer not contacted`,src:[],who:'Set by '+prWho(),chem:chem(id).name}); prClose(); prRefresh(); toast(`Reminder scheduled for ${d}`); };
function prPossible(id){ const p=PAYREV[id], st=prS(id);
  if(id==='verma'&&!S.vermaMatched) return {amt:p.amt, src:'Razorpay credit'};
  if(S.bank.st==='on'&&p.cands.length&&p.cands[0].conf==='High') return {amt:p.cands[0].amt, src:'bank credit'};
  if(p.sp) return {amt:p.sp.amt, msg:`Rakesh Sharma recorded a ${inr(p.sp.amt)} cheque collection from ${chem(id).name} on ${DS('2026-10-03')}.`};
  return null; }
A.prSend=(id,edit)=>{ const c=chem(id), p=PAYREV[id];
  prOpen(`<div class="pr-sh"><h3>Send reminder</h3><div class="small muted mt4">To: <b style="color:var(--strong)">${c.name}</b> · WhatsApp via RAY</div>
   ${edit?`<textarea class="textarea mt12" id="pr-msg" rows="4">${esc(prMsg(id))}</textarea>`:`<div class="wa-preview mt12"><div class="wa-bubble">${esc(prMsg(id))}<span class="lnk">${LINK(id)}</span></div></div>`}
   <div class="xs muted mt8">${sourcesLine(id,p.inv)}</div><div class="xs muted mt4">${I('info',12)} Delivery is simulated in this prototype.</div>
   <div class="pr-btns mt16"><button class="btn btn-g" onclick="prClose()">Cancel</button>${edit?`<button class="btn btn-s" onclick="prS('${id}').msg=document.getElementById('pr-msg').value;A.prSend('${id}')">Save message</button>`:`<button class="btn btn-s" onclick="A.prSend('${id}',true)">Edit message</button>`}<button class="btn btn-p" onclick="${edit?`prS('${id}').msg=document.getElementById('pr-msg').value;`:''}A.prSendCheck('${id}')">Send reminder</button></div></div>`); };
A.prSendCheck=(id)=>{ const pos=prPossible(id); if(!pos) return A.prSendDo(id,false);
  prOpen(`<div class="pr-sh"><span class="badge b-a">REMINDER PAUSED</span><h3 class="mt8">Possible payment found</h3><p class="small mt8" style="color:var(--strong)">${pos.msg||`We found an unmatched ${inr(pos.amt)} ${pos.src} received yesterday.`}</p><p class="xs muted mt4">If it is ${chem(id).name}’s, you would be chasing a buyer who has already paid.</p>
   <div class="pr-btns mt16"><button class="btn btn-s" onclick="A.prAnyway('${id}')">Send reminder anyway</button><button class="btn btn-p" onclick="prClose();${id==='verma'?'':`A.prCheck('${id}')`}">Review payment</button></div></div>`); };
A.prAnyway=(id)=>A.overrideStart(id);
/* ---------- overriding a possible-payment warning: one flow for desktop, mobile and the payment-review sheet ----------
   Only the "possible unmatched payment" pause can be overridden, and only with a reason and an explicit confirmation.
   Do not contact, paused automation, a stale ledger, a paid invoice, an unverified buyer claim, channel and weekly
   limits and quiet hours still apply (sendGate re-checks every one at send time). The balance never changes. */
const OVR_REASONS=['Buyer confirmed on a call that this credit is not theirs','The possible match is for a different invoice','Salesperson confirmed the payment is still pending','Other'];
function overrideEvidence(id){ const p=PAYREV[id], pos=p&&(p.possible||(p.cands&&p.cands[0])); return pos?`${inr(pos.amt)} ${pos.from||pos.src||'credit'}${pos.t?' · '+pos.t:''}${pos.ref?' · '+pos.ref:''}`:'A possible payment is waiting for review'; }
A.overrideStart=(id)=>{ const c=chem(id), p=PAYREV[id], inv=(p&&p.inv)||chaseInv(id); const g=gateFor(id,'whatsapp',inv,{override:'unmatched'});
  if(!prPending(id)) return toast('No possible-payment warning to override for '+c.name);
  const other=g.action==='block'?gateNote(g):'';
  prOpen(`<div class="pr-sh"><span class="badge b-a">OVERRIDE A POSSIBLE-PAYMENT WARNING</span><h3 class="mt8">Send a reminder to ${c.name} anyway?</h3>
   <div class="pr-kv mt8"><div><span>Invoice</span><b>${inv}</b></div><div><span>Due in ledger</span><b class="num">${inr(balOf(id,inv))}</b></div><div><span>Unresolved evidence</span><b>${esc(overrideEvidence(id))}</b></div></div>
   <p class="small mt12" style="color:var(--strong)">RAY paused this reminder because a payment that may cover this invoice has not been reviewed. If it is the buyer’s payment, this reminder chases someone who has paid. The balance does not change.</p>
   ${other?`<div class="alert warn mt12" style="padding:10px 12px"><span class="ic" style="width:26px;height:26px">${I('ban',14)}</span><div class="small grow"><b style="color:var(--strong)">Still blocked:</b> ${esc(other)} The override does not bypass this.</div></div>`:''}
   <div class="field mt12"><label for="ovr-reason">Reason for overriding</label><select class="select" id="ovr-reason"><option value="">Choose a reason</option>${OVR_REASONS.map(x=>`<option>${x}</option>`).join('')}</select></div>
   <div class="field mt8"><label for="ovr-note">Note <span class="muted">(required for “Other”)</span></label><input class="input" id="ovr-note" maxlength="140"></div>
   <label class="row gap8 mt12 small" style="cursor:pointer;align-items:flex-start"><input type="checkbox" id="ovr-ok" style="margin-top:3px"> <span>I am overriding a possible-payment warning. The reason, invoice and unresolved payment evidence will be logged with my name.</span></label>
   <div class="xs mt8" id="ovr-err" role="alert" style="color:var(--r);font-weight:600"></div>
   <div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose()">Cancel</button><button class="btn btn-p" onclick="prClose();go('ray-credit/payment/${id}')">Review payment instead</button><button class="btn btn-d" id="ovr-send" ${other?'disabled':''} onclick="A.overrideSend('${id}')">Send with override</button></div></div>`); };
A.overrideSend=(id)=>{ const c=chem(id), p=PAYREV[id], inv=(p&&p.inv)||chaseInv(id), reason=(document.getElementById('ovr-reason')||{}).value||'', note=((document.getElementById('ovr-note')||{}).value||'').trim(), ok=(document.getElementById('ovr-ok')||{}).checked, err=document.getElementById('ovr-err');
  const fail=m=>{ if(err) err.textContent=m; else toast(m); };
  if(!reason) return fail('Choose a reason for overriding the warning.'); if(reason==='Other'&&note.length<5) return fail('Add a short note for “Other”.'); if(!ok) return fail('Confirm that you are overriding a possible-payment warning.');
  const why=reason+(note?' · '+note:''), it=S.chase[id];
  const r=sendMessage(id,{kind:'reminder', inv, msg:(prS(id).msg)||(it&&it.msg)||prMsg(id), via:prWho(), override:'unmatched', quiet:true});
  const result=r.ok?'sent (simulated delivery)':r.queued?'queued for the end of quiet hours':'blocked: '+gateNote(r.gate);
  log({ic:r.ok||r.queued?'send':'ban',ti:`Possible-payment warning overridden · ${c.name}`,de:`${inv} · ${inr(balOf(id,inv))} due · unresolved evidence: ${overrideEvidence(id)} · reason: ${why} · reminder ${result} · balance unchanged`,src:['conv'],who:'Override by '+prWho(),chem:c.name});
  if(!r.ok&&!r.queued){ prClose(); prRefresh(); return toast('Not sent: '+gateNote(r.gate)); }
  const st=prS(id); st.override={at:nowT(), reason:why}; if(it){ it.st=r.queued?'queued':'sent'; it.at=nowT(); } /* the payment review stays open: later reminders are paused again until it is resolved */
  prClose(); prRefresh(); toast(`Reminder ${r.queued?'queued':'sent (simulated)'} · override and reason logged`); };
A.prSendDo=(id,override)=>{ const c=chem(id), p=PAYREV[id], st=prS(id);
  const r=sendMessage(id,{kind:'reminder', inv:p.inv, msg:prMsg(id), via:prWho(), override:override?'unmatched':undefined});
  if(!r.ok&&!r.queued){ prClose(); prRefresh(); return; }
  st.st='sent'; st.when=r.queued?RayDates.fmtTime(RayDates.istParts(r.item.sendAt).min):nowT(); if(S.chase[id]){ S.chase[id].st=r.queued?'queued':'sent'; S.chase[id].at=st.when; }
  log({ic:'send',ti:`Reminder ${r.queued?'queued':'sent'} to ${c.name}`,de:`WhatsApp · simulated delivery · ${inr(balOf(id,p.inv))} · ${p.inv} · payment link ${LINK(id)}${override?' · override: possible payment unreviewed':''}`,src:['conv'],who:'Approved by '+prWho(),chem:c.name}); prClose(); prRefresh(); toast(`Reminder ${r.queued?'queued (quiet hours)':'sent (simulated)'} to ${c.name}`); };
/* ---------- shared body (desktop page and mobile screen) ---------- */
function prBody(id,mob){
  const c=chemView(chem(id)), p=PAYREV[id], st=prS(id), bankOn=S.bank.st==='on', done=st.st||(id==='verma'&&S.vermaMatched);
  const btn=(cls,lbl,fn)=>mob?`<button class="mbtn ${cls==='btn-p'?'p':cls==='btn-g'?'g':''}" onclick="${fn}">${lbl}</button>`:`<button class="btn ${cls}" onclick="${fn}">${lbl}</button>`;
  const res = st.check==='running' ? `<div class="pr-res">${thinking('Checking connected bank account…')}</div>`
   : st.check==='done' ? (p.cands.length ? `<div class="pr-res"><b style="color:var(--strong)">We found ${p.cands.length} possible payments.</b>${p.cands.map((cd,k)=>`<div class="pr-cand"><div class="grow"><div class="row gap8"><b class="num" style="color:var(--strong);font-size:16px">${inr(cd.amt)}</b><span class="badge ${cd.conf==='High'?'b-g':'b-n'}">Match confidence: ${cd.conf}</span></div><div class="xs muted mt4">${cd.t} · From <b style="color:var(--text)">${cd.from}</b> · Ref ${cd.ref}</div></div>${done?'':cd.conf==='High'?btn('btn-p','Match payment',`A.prMatch('${id}',${k})`):btn('btn-s','Review',`A.prReviewCand('${id}',${k})`)}</div>`).join('')}</div>`
      : `<div class="pr-res"><b style="color:var(--strong)">We couldn’t find a matching payment in your connected bank account.</b>${p.sp?'<div class="xs muted mt4">The cheque recorded by Rakesh Sharma may still be clearing.</div>':''}${done?'':`<div class="pr-btns mt8" style="justify-content:flex-start">${btn('btn-s','Remind later',`A.prLater('${id}')`)}${btn('btn-s','Send reminder',`A.prSend('${id}')`)}</div>`}</div>`) : '';
  const spCard = p.sp&&!done ? `<div class="pr-cand mt12"><div class="grow"><div class="row gap8"><b class="num" style="color:var(--strong)">${inr(p.sp.amt)}</b><span class="badge b-a">Salesperson collection</span></div><div class="xs muted mt4">${p.sp.t} · ${p.sp.from} · ${p.sp.ref}</div></div></div>`:'';
  const possible = id==='verma'&&!S.vermaMatched ? `<div class="pr-cand mt12"><div class="grow"><div class="row gap8"><b class="num" style="color:var(--strong)">${inr(p.possible.amt)}</b><span class="badge b-a">Possible payment</span></div><div class="xs muted mt4">${p.possible.t} · ${p.possible.from} · ${p.possible.ref}</div></div>${btn('btn-s','Match payment',`A.prMatchRzp('${id}')`)}</div>`:'';
  const actions = done ? `<div class="alert ok mt12" style="padding:12px 14px"><span class="ic" style="width:28px;height:28px">${I('check',15,2.4)}</span><div class="grow small"><b style="color:var(--strong)">${prStatusBadge(id).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}</b><div class="muted">Logged in Activity.</div></div>${st.st==='scheduled'?`<button class="btn btn-g btn-sm" onclick="S.pr['${id}']={st:null,check:null};${S.chase[id]?`S.chase['${id}'].st='draft';`:''}log({ic:'refresh',ti:'Follow-up reminder removed',de:'${c.name} · ${p.inv}',src:[],who:prWho()});prRefresh()">Undo</button>`:''}</div>`
   : `<div class="pr-acts ${mob?'mob':''}">${btn('btn-s','Mark as received',`A.prMark('${id}')`)}${btn(bankOn?'btn-p':'btn-s','Check bank statement',`A.prCheck('${id}')`)}${btn('btn-s','Remind later',`A.prLater('${id}')`)}${btn('btn-g','Send reminder',`A.prSend('${id}')`)}</div>`;
  return `<div class="pr-kv ${mob?'mob':''}"><div><span>Buyer</span><b>${c.name}</b></div><div><span>Invoice</span><b>${p.inv}</b></div><div><span>Amount</span><b class="num">${inr(p.amt)}</b></div><div><span>Due</span><b>${p.due}</b><em${(invOf(id,p.inv)||{}).bal===0?' style="color:var(--g)"':''}>${(invOf(id,p.inv)||{}).bal===0?'Paid in full':p.dueTxt}</em></div></div>
   <div class="row gap8 mt12 wrap"><span class="xs muted" style="font-weight:600">Status</span>${prStatusBadge(id)}</div>
   <div class="pr-note mt12"><span class="ai-tag">${clover(13)} RAY</span><span class="small" style="color:var(--strong)">${done?prOutcome(id):p.note}</span></div>
   ${possible}${spCard}${res}${actions}
   <div class="xs muted mt12 row gap4" style="align-items:flex-start">${I('shield',12)} <span>${done?'Confirm payment first, chase second.':sourcesLine(id,p.inv)}</span></div>`;
}
/* what happened, in one sentence, once the review is resolved (replaces the "possible payment" note) */
function prOutcome(id){ const p=PAYREV[id], st=prS(id), i=invOf(id,p.inv), bal=i?i.bal:0;
  const ev=(S.led.events||[]).filter(e=>e.buyerId===id&&e.invoice===p.inv&&RayEvents.MONEY_IN.includes(e.type)&&!RayEvents.isReversed(S.led,e.id)).slice(-1)[0];
  const tail=bal===0?'Nothing is due on this invoice, so its reminder is cancelled.':`${inr(bal)} is still due on ${p.inv}; reminders continue for that amount only.`;
  if(ev) return `${ev.type==='PAYMENT_RECONCILED'?'Matched':'Recorded'}: ${inr(ev.amount)} from ${ev.source}${ev.ref&&!/^manual-/.test(ev.ref)?` (${ev.ref})`:''} applied to ${p.inv}. Balance ${inr(ev.meta.balanceBefore)} → ${inr(ev.meta.balanceAfter)}. ${tail}`;
  if(st.st==='scheduled') return `No payment recorded yet. You chose to review this again on ${st.when}; RAY has not contacted the buyer.`;
  if(st.st==='sent') return `No payment recorded yet. A reminder for ${inr(bal)} was sent (simulated delivery).`;
  return p.note; }
function vPayReview(id){
  if(!PAYREV[id]) return '<div class="empty">Not found</div>';
  return `<div class="crumb mt20" style="margin-bottom:0"><a onclick="goSec('ray-credit/actions','grp-check')">${I('arrowL',14,2)} Reconciliation · Payment review</a></div>
   <div style="max-width:900px">${pageHead('Review payment','Confirm whether the buyer has already paid before anyone is chased.')}<div class="card pad mt16">${prBody(id,false)}</div></div>`;
}
