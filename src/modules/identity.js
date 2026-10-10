/* ================= BUYER IDENTITY (GSTIN · business name · phone) ================= */
const IDS = {
  gupta:{gst:'03ABCDE1234F1Z5', gs:'Active', gl:'Returns filed on time 12/12 months', ph:'98••••4410', upi:'guptatraders@okhdfc', ext:'Full'},
  newlife:{gst:'03AANFN7781K1Z3', gs:'Active', gl:'Returns filed on time 12/12 months', ph:'98••••7731', upi:'newlifestores@okaxis', ext:'Full'},
  singhms:{gst:null, gs:'Not registered', gl:'No GST data available', ph:'98••••2901', upi:'singhstores@ybl', ext:'Partial'},
  citycare:{gst:'03ABCDE9087K1ZX', gs:'Cancelled', gl:'Cancelled on 12 Aug 2026', ph:'98••••6518', upi:'citymart@okicici', ext:'Full'},
  arora:{upi:'aroraretail@okhdfc'}, mehta:{upi:'mehtaent@ybl'},
};
(function(){ const L='ABCDEFGHJKLMNPQRSTUVWXYZ'; let i=0;
  CHEM.forEach(c=>{ i++; const base=IDS[c.id]||{}; if(IDS[c.id]&&IDS[c.id].gs) return;
    IDS[c.id]=Object.assign({gst:`03AA${L[i%24]}${L[(i*3)%24]}${L[(i*7)%24]}${String(1000+i*613).slice(-4)}${L[(i*5)%24]}1Z${(i*3)%10}`, gs:'Active', gl:`Returns filed on time ${12-(i%3)}/12 months`, ph:`98••••${String(1200+i*577).slice(-4)}`, upi:`${c.id}@oksbi`, ext:'Full'}, base);
  });
})();
const ID_TIP = 'RAY uses GST data to understand business registration and filing behaviour. It is an identity input, never a credit score.';
function idChips(id){
  if(id==='newlife'&&!S.newLife&&!['result','approved'].includes(S.check.step)) return '<span class="idc na">Network check pending consent</span>';
  const d=IDS[id]; if(!d) return '';
  return d.gs==='Active'?'<span class="idc ok">GST ✓</span>':d.gs==='Cancelled'?'<span class="idc bad">GST Cancelled</span>':'<span class="idc na">GST –</span>';
}
function idStatus(s){ return s==='Active'?`<span class="badge b-g">${s}</span>`:s==='Not registered'?`<span class="badge b-n">${s}</span>`:`<span class="badge b-r">${s}</span>`; }
function identityInset(id, opts={}){
  const d=IDS[id]; if(!d) return '';
  const c=chem(id);
  return `<div class="ident ${opts.title?'':'mt20'}">
   ${opts.title?`<div class="ident-h"><span class="lbl" style="color:var(--strong);letter-spacing:.06em">${c.name.toUpperCase()}</span>${opts.by?`<span class="badge b-b">Found by ${opts.by}</span>`:''}<span class="grow"></span><span class="tt">${I('info',15)}<span class="tip" style="white-space:normal;width:280px">${ID_TIP}</span></span></div>`:''}
   <div class="ident-g">
    <div><div class="k">GSTIN ${opts.title?'':`<span class="tt" style="vertical-align:-2px">${I('info',12)}<span class="tip" style="white-space:normal;width:280px">${ID_TIP}</span></span>`}</div><div class="v ${d.gst?'':'muted'}">${d.gst||'Not registered'}</div><div class="mt4">${d.gst?idStatus(d.gs):''}</div><div class="xs muted mt4">${d.gl}</div></div>
    <div><div class="k">Business name</div><div class="v">${c.name}</div></div>
    <div><div class="k">Phone</div><div class="v">${d.ph}</div></div>
    <div><div class="k">UPI ID</div><div class="v">${d.upi}</div></div>
    <div><div class="k">External data</div><div class="mt4">${d.ext==='Full'?'<span class="badge b-g">Available</span>':`<span class="badge b-n">${d.ext}</span>`}</div></div>
   </div>
  </div>`;
}
A.verifyId=id=>{const c=chem(id);
  modal({title:`Mark ${c.name} as verified?`,body:`<p class="muted">GSTIN was cancelled on 12 Aug 2026. Tell RAY what you checked. The policy then stops holding the limit for the GST check; any change still needs your approval.</p><div class="col gap8 mt12">${['Spoke to the owner. Business continues and is re-registering GST','New GSTIN shared. RAY will update it','Could not verify. Keep on Watch'].map((r,i)=>`<button class="radio-card ${i===0?'on':''}" style="padding:12px 14px" onclick="this.parentNode.querySelectorAll('.radio-card').forEach(x=>x.classList.remove('on'));this.classList.add('on')"><span class="radio"></span>${r}</button>`).join('')}</div>`,
   actions:[{label:'Cancel'},{label:'Mark GST status as verified',cls:'btn-p',fn:()=>{closeModal();S.verified[id]=true;recordEvent({type:'GST_VERIFIED', buyerId:id, source:'Merchant check', actor:M.owner},{quiet:true});log({ic:'check',ti:`GST status verified for ${c.name}`,de:`GSTIN cancelled 12 Aug 2026 · checked by merchant · policy re-ran: ${recOf(id).band}, ${inr(recOf(id).recommendedLimit)}`,src:['conv'],who:'Verified by '+M.owner+' · Dashboard',chem:c.name});rr();toast('Marked as verified · recommendation re-evaluated')}}]});
};
/* identifier detection for the universal search: GSTIN, business name or phone */
function detectId(q){
  const raw=(q||'').trim(), v=raw.toUpperCase().replace(/\s/g,'');
  if(!v) return {by:'GSTIN', who:'newlife'};
  if(/^\d{2}[A-Z0-9]{13}$/.test(v)){ const hit=Object.keys(IDS).find(k=>IDS[k].gst===v); return {by:'GSTIN', who:hit||'newlife'}; }
  const digits=v.replace(/[^0-9]/g,'');
  if(digits.length>=4&&/^[0-9X•+]+$/.test(v)){ const hit=Object.keys(IDS).find(k=>IDS[k].ph&&IDS[k].ph.slice(-4)===digits.slice(-4)); return {by:'phone', who:hit||'newlife'}; }
  const n=raw.toLowerCase(); const all=[NEWLIFE,...CHEM]; const hit=all.find(c=>c.name.toLowerCase().includes(n)||n.includes(c.name.toLowerCase().split(' ')[0]));
  return {by:'business name', who:hit?hit.id:'newlife'};
}
