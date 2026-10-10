/* ================= RECONCILIATION · REVIEW PAYMENT (confirm payment first, chase second) ================= */
const PAYREV = {
  verma:{inv:'INV-24655', amt:26500, due:'5 Oct 2026', dueTxt:'Due today', note:'We found an unmatched ₹26,500 Razorpay credit from yesterday that may be this payment.', possible:{amt:26500, t:'Yesterday, 6:10 PM', from:'UPI · Razorpay Smart Collect', ref:'pay_Q8f2Kx91LmZ4'}, cands:[]},
  lifeline:{inv:'INV-24702', amt:31200, due:'28 Sep 2026', dueTxt:'7 days overdue', note:'We haven’t found a confirmed payment for this invoice yet.', cands:[{amt:31200,t:'Yesterday, 4:32 PM',from:'LIFELINE MART',ref:'NEFT/HDFC81732',conf:'High'},{amt:31000,t:'Yesterday, 1:14 PM',from:'LIFELINE & CO',ref:'UPI/40918276',conf:'Low'}]},
  goyal:{inv:'INV-24611', amt:24100, due:'30 Sep 2026', dueTxt:'5 days overdue', note:'We haven’t found a confirmed payment for this invoice yet.', cands:[]},
  citycare:{inv:'INV-24733', amt:42000, due:'2 Oct 2026', dueTxt:'3 days overdue', note:'Rakesh Sharma recorded a ₹42,000 cheque collection on 3 Oct. It has not appeared in your bank account yet.', sp:{amt:42000, t:'3 Oct · 5:40 PM', from:'Cheque #004512 · recorded by Rakesh Sharma', ref:'Not yet seen in the bank'}, cands:[]},
};
const prS = id => (S.pr[id]=S.pr[id]||{st:null,check:null});
const prPending = id => !!PAYREV[id] && !prS(id).st && !(id==='verma'&&S.vermaMatched);
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
   <div class="field mt12"><label>Payment received on <span class="muted">(optional)</span></label><input class="input" id="pr-date" type="date" value="2026-10-05"></div>
   <div class="field mt8"><label>Add note <span class="muted">(optional)</span></label><input class="input" id="pr-note" placeholder="For example, cash collected by salesperson"></div>
   <div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose()">Cancel</button><button class="btn btn-p" onclick="A.prMarkDo('${id}')">Mark as received</button></div></div>`); };
A.prMarkDo=(id)=>{ const c=chem(id), p=PAYREV[id], n=(document.getElementById('pr-note')||{}).value||''; const st=prS(id); st.st='received'; st.when=null;
  if(S.chase[id]) S.chase[id].st='matched'; if(id==='verma') S.vermaMatched=true; S.adj[id]=(S.adj[id]||0)+p.amt; ledgerPay(id, p.inv, p.amt, {source:'Merchant confirmation', actor:prWho(), ref:'manual-'+p.inv, meta:{attested:'merchant'}});
  log({ic:'check',ti:'Payment marked as received manually',de:`${c.name} · ${p.inv} · ${inr(p.amt)} · merchant confirmed, not verified by RAY${n?' · '+n:''}`,src:[],who:'Marked by '+prWho(),chem:c.name}); prClose(); prRefresh(); toast('Marked as received · merchant confirmed'); };
A.prCheck=(id)=>{ const c=chem(id), st=prS(id);
  if(S.bank.st!=='on') return prOpen(`<div class="pr-sh"><h3>Connect your business bank account to check payments automatically.</h3><p class="small muted mt8">RAY can only check a bank statement when your business bank account is connected through RazorpayX Connected Banking+ or a statement is uploaded.</p><div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose();A.uploadStmt()">Upload bank statement</button><button class="btn btn-p" onclick="prClose();A.closeMobile();A.bankStart()">Connect bank account</button></div></div>`);
  st.check='running'; prRefresh();
  setTimeout(()=>{ st.check='done'; if(!PAYREV[id].cands.length) log({ic:'bank',ti:'Bank statement checked, no match found',de:`${c.name} · ${PAYREV[id].inv} · ${inr(PAYREV[id].amt)} · ${BANK_NAME}`,src:['aa'],who:'RAY'}); prRefresh(); },1300); };
A.prMatch=(id,k)=>{ const c=chem(id), p=PAYREV[id], cd=p.cands[k], st=prS(id); st.st='matched'; st.when=null;
  if(S.chase[id]) S.chase[id].st='matched'; S.adj[id]=(S.adj[id]||0)+p.amt; ledgerPay(id, p.inv, cd.amt, {type:'PAYMENT_RECONCILED', source:'Bank account (Connected Banking+)', actor:prWho(), ref:cd.ref}); S.bank.learned++; S.bank.aliases.unshift([cd.from,c.name,true]);
  log({ic:'match',ti:`Payment matched to ${p.inv} from bank feed`,de:`${c.name} · ${inr(cd.amt)} · ${cd.from} · ${cd.ref} · reminder cancelled · RAY will recognise this payer next time`,src:['aa'],who:'Confirmed by '+prWho(),chem:c.name}); prClose(); prRefresh(); toast(`Matched · reminder for ${c.name} cancelled`); };
A.prReviewCand=(id,k)=>{ const c=chem(id), p=PAYREV[id], cd=p.cands[k];
  prOpen(`<div class="pr-sh"><h3>Is this ${c.name}’s payment?</h3><div class="pr-kv"><div><span>Amount</span><b class="num">${inr(cd.amt)}</b></div><div><span>From</span><b>${cd.from}</b></div><div><span>Received</span><b>${cd.t}</b></div></div><p class="small muted mt12">Low confidence: the amount is ₹${(p.amt-cd.amt).toLocaleString('en-IN')} short of ${p.inv} and the payer name only partly matches.</p><div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose()">Not this buyer</button><button class="btn btn-p" onclick="A.prMatch('${id}',${k})">Match payment</button></div></div>`); };
A.prMatchRzp=(id)=>{ const c=chem(id), p=PAYREV[id]; const st=prS(id); st.st='rzp'; S.vermaMatched=true; if(S.chase[id]) S.chase[id].st='matched';
  log({ic:'match',ti:`Payment matched to ${p.inv}`,de:`${c.name} · ${inr(p.amt)} · Razorpay Smart Collect · reminder cancelled`,src:['rzp'],who:'Confirmed by '+prWho(),chem:c.name}); prRefresh(); toast('Payment matched · reminder cancelled'); };
A.prLater=(id)=>{ const p=PAYREV[id];
  const opts=[['Tomorrow','6 Oct'],['In 3 days','8 Oct'],['On due date of next invoice','12 Oct'],['Choose date','']];
  prOpen(`<div class="pr-sh"><h3>Remind you when?</h3><div class="col gap8 mt12">${opts.map((o,i)=>`<div role="button" class="radio-card pr-opt ${i===1?'on':''}" data-d="${o[1]}" style="padding:11px 14px" onclick="document.querySelectorAll('.pr-opt').forEach(x=>x.classList.remove('on'));this.classList.add('on')"><span class="radio"></span><span class="grow">${o[0]}</span><span class="xs muted">${o[1]||`<input class="input" id="pr-cd" type="date" value="2026-10-09" style="height:30px;width:140px" onclick="event.stopPropagation();document.querySelectorAll('.pr-opt').forEach(x=>x.classList.remove('on'));this.closest('.pr-opt').classList.add('on')">`}</span></div>`).join('')}</div>
   <p class="small mt12" style="color:var(--strong)">${I('lock',12)} RAY will not contact the buyer yet.</p><p class="xs muted mt4">This is a reminder for you. Nothing is sent to ${chem(id).name}.</p>
   <div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose()">Cancel</button><button class="btn btn-p" onclick="A.prLaterDo('${id}')">Set reminder</button></div></div>`); };
A.prLaterDo=(id)=>{ const o=document.querySelector('.pr-opt.on'); let d=o?o.dataset.d:'8 Oct'; if(!d){ const v=(document.getElementById('pr-cd')||{}).value||'2026-10-09'; const dt=new Date(v); d=dt.getDate()+' '+dt.toLocaleString('en-GB',{month:'short'}); }
  const st=prS(id); st.st='scheduled'; st.when=d; if(S.chase[id]&&S.chase[id].st==='draft') S.chase[id].st='skipped';
  log({ic:'cal',ti:`Follow-up scheduled for ${d}`,de:`${chem(id).name} · ${PAYREV[id].inv} · internal reminder · buyer not contacted`,src:[],who:'Set by '+prWho(),chem:chem(id).name}); prClose(); prRefresh(); toast(`Reminder scheduled for ${d}`); };
function prPossible(id){ const p=PAYREV[id], st=prS(id);
  if(id==='verma'&&!S.vermaMatched) return {amt:p.amt, src:'Razorpay credit'};
  if(S.bank.st==='on'&&p.cands.length&&p.cands[0].conf==='High') return {amt:p.cands[0].amt, src:'bank credit'};
  if(p.sp) return {amt:p.sp.amt, msg:`Rakesh Sharma recorded a ${inr(p.sp.amt)} cheque collection from ${chem(id).name} on 3 Oct.`};
  return null; }
A.prSend=(id,edit)=>{ const c=chem(id), p=PAYREV[id];
  prOpen(`<div class="pr-sh"><h3>Send reminder</h3><div class="small muted mt4">To: <b style="color:var(--strong)">${c.name}</b> · WhatsApp via RAY</div>
   ${edit?`<textarea class="textarea mt12" id="pr-msg" rows="4">${esc(prMsg(id))}</textarea>`:`<div class="wa-preview mt12"><div class="wa-bubble">${esc(prMsg(id))}<span class="lnk">${LINK(id)}</span></div></div>`}
   <div class="xs muted mt8">Before sending, RAY checks Razorpay payment history, your connected bank feed, recent unidentified credits and salesperson-logged collections.</div>
   <div class="pr-btns mt16"><button class="btn btn-g" onclick="prClose()">Cancel</button>${edit?`<button class="btn btn-s" onclick="prS('${id}').msg=document.getElementById('pr-msg').value;A.prSend('${id}')">Save message</button>`:`<button class="btn btn-s" onclick="A.prSend('${id}',true)">Edit message</button>`}<button class="btn btn-p" onclick="${edit?`prS('${id}').msg=document.getElementById('pr-msg').value;`:''}A.prSendCheck('${id}')">Send reminder</button></div></div>`); };
A.prSendCheck=(id)=>{ const pos=prPossible(id); if(!pos) return A.prSendDo(id,false);
  prOpen(`<div class="pr-sh"><span class="badge b-a">REMINDER PAUSED</span><h3 class="mt8">Possible payment found</h3><p class="small mt8" style="color:var(--strong)">${pos.msg||`We found an unmatched ${inr(pos.amt)} ${pos.src} received yesterday.`}</p><p class="xs muted mt4">If it is ${chem(id).name}’s, you would be chasing a buyer who has already paid.</p>
   <div class="pr-btns mt16"><button class="btn btn-s" onclick="A.prAnyway('${id}')">Send reminder anyway</button><button class="btn btn-p" onclick="prClose();${id==='verma'?'':`A.prCheck('${id}')`}">Review payment</button></div></div>`); };
A.prAnyway=(id)=>prOpen(`<div class="pr-sh"><h3>Send the reminder anyway?</h3><p class="small mt8" style="color:var(--strong)">A possible payment from ${chem(id).name} is still unreviewed. This override will be logged.</p><div class="pr-btns mt16"><button class="btn btn-s" onclick="prClose()">Cancel</button><button class="btn btn-d" onclick="A.prSendDo('${id}',true)">Yes, send reminder</button></div></div>`);
A.prSendDo=(id,override)=>{ const c=chem(id), p=PAYREV[id], st=prS(id); st.st='sent'; st.when=nowT(); if(S.chase[id]){ S.chase[id].st='sent'; S.chase[id].at=st.when; }
  log({ic:'send',ti:`Reminder sent to ${c.name}`,de:`WhatsApp · ${inr(p.amt)} · ${p.inv} · payment link ${LINK(id)}${override?' · override: possible payment unreviewed':''}`,src:['conv'],who:'Approved by '+prWho(),chem:c.name}); prClose(); prRefresh(); toast('Reminder sent to '+c.name); };
/* ---------- shared body (desktop page and mobile screen) ---------- */
function prBody(id,mob){
  const c=chemView(chem(id)), p=PAYREV[id], st=prS(id), bankOn=S.bank.st==='on', done=st.st||(id==='verma'&&S.vermaMatched);
  const btn=(cls,lbl,fn)=>mob?`<button class="mbtn ${cls==='btn-p'?'p':cls==='btn-g'?'g':''}" onclick="${fn}">${lbl}</button>`:`<button class="btn ${cls}" onclick="${fn}">${lbl}</button>`;
  const res = st.check==='running' ? `<div class="pr-res">${thinking('Checking connected bank account…')}</div>`
   : st.check==='done' ? (p.cands.length ? `<div class="pr-res"><b style="color:var(--strong)">We found ${p.cands.length} possible payments.</b>${p.cands.map((cd,k)=>`<div class="pr-cand"><div class="grow"><div class="row gap8"><b class="num" style="color:var(--strong);font-size:16px">${inr(cd.amt)}</b><span class="badge ${cd.conf==='High'?'b-g':'b-n'}">Match confidence: ${cd.conf}</span></div><div class="xs muted mt4">${cd.t} · From <b style="color:var(--text)">${cd.from}</b> · Ref ${cd.ref}</div></div>${done?'':cd.conf==='High'?btn('btn-p','Match payment',`A.prMatch('${id}',${k})`):btn('btn-s','Review',`A.prReviewCand('${id}',${k})`)}</div>`).join('')}</div>`
      : `<div class="pr-res"><b style="color:var(--strong)">We couldn’t find a matching payment in your connected bank account.</b>${p.sp?'<div class="xs muted mt4">The cheque recorded by Rakesh Sharma may still be clearing.</div>':''}${done?'':`<div class="pr-btns mt8" style="justify-content:flex-start">${btn('btn-s','Remind later',`A.prLater('${id}')`)}${btn('btn-s','Send reminder',`A.prSend('${id}')`)}</div>`}</div>`) : '';
  const spCard = p.sp&&!done ? `<div class="pr-cand mt12"><div class="grow"><div class="row gap8"><b class="num" style="color:var(--strong)">${inr(p.sp.amt)}</b><span class="badge b-a">Salesperson collection</span></div><div class="xs muted mt4">${p.sp.t} · ${p.sp.from} · ${p.sp.ref}</div></div></div>`:'';
  const possible = id==='verma'&&!S.vermaMatched ? `<div class="pr-cand mt12"><div class="grow"><div class="row gap8"><b class="num" style="color:var(--strong)">${inr(p.possible.amt)}</b><span class="badge b-a">Possible payment</span></div><div class="xs muted mt4">${p.possible.t} · ${p.possible.from} · ${p.possible.ref}</div></div>${btn('btn-s','Match payment',`A.prMatchRzp('${id}')`)}</div>`:'';
  const actions = done ? `<div class="alert ok mt12" style="padding:12px 14px"><span class="ic" style="width:28px;height:28px">${I('check',15,2.4)}</span><div class="grow small"><b style="color:var(--strong)">${prStatusBadge(id).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}</b><div class="muted">Logged in Activity.</div></div>${st.st?`<button class="btn btn-g btn-sm" onclick="S.pr['${id}']={st:null,check:null};${id==='verma'?'S.vermaMatched=false;S.chase.verma.st=\'held\';':S.chase[id]?`S.chase['${id}'].st='draft';`:''}delete S.adj['${id}'];prRefresh()">Undo</button>`:''}</div>`
   : `<div class="pr-acts ${mob?'mob':''}">${btn('btn-s','Mark as received',`A.prMark('${id}')`)}${btn(bankOn?'btn-p':'btn-s','Check bank statement',`A.prCheck('${id}')`)}${btn('btn-s','Remind later',`A.prLater('${id}')`)}${btn('btn-g','Send reminder',`A.prSend('${id}')`)}</div>`;
  return `<div class="pr-kv ${mob?'mob':''}"><div><span>Buyer</span><b>${c.name}</b></div><div><span>Invoice</span><b>${p.inv}</b></div><div><span>Amount</span><b class="num">${inr(p.amt)}</b></div><div><span>Due</span><b>${p.due}</b><em>${p.dueTxt}</em></div></div>
   <div class="row gap8 mt12 wrap"><span class="xs muted" style="font-weight:600">Status</span>${prStatusBadge(id)}</div>
   <div class="pr-note mt12"><span class="ai-tag">${clover(13)} RAY</span><span class="small" style="color:var(--strong)">${p.note}</span></div>
   ${possible}${spCard}${res}${actions}
   <div class="xs muted mt12 row gap4">${I('shield',12)} RAY checks available payment sources before recommending a reminder. Confirm payment first, chase second.</div>`;
}
function vPayReview(id){
  if(!PAYREV[id]) return '<div class="empty">Not found</div>';
  return `<div class="crumb mt20" style="margin-bottom:0"><a onclick="goSec('raahi/actions','grp-check')">${I('arrowL',14,2)} Reconciliation · Payment review</a></div>
   <div style="max-width:900px">${pageHead('Review payment','Confirm whether the buyer has already paid before anyone is chased.')}<div class="card pad mt16">${prBody(id,false)}</div></div>`;
}
