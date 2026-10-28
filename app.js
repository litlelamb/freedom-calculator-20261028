(() => {
  'use strict';
  const APP_URL='https://litlelamb.github.io/freedom-calculator-20261028/';
  const $=id=>document.getElementById(id),model=window.FreedomModel;
  let state={...model.defaults},current=null,toastTimer,cardUrl;
  const ids={monthly:'monthly',capital:'capital',children:'children','child-cost':'childCost',health:'health',housing:'housing',assets:'assets',nominal:'nominal',inflation:'inflation'};
  const names={monthly:'月开销',capital:'可用资产',children:'孩子数量',childCost:'每孩预算',health:'医疗预算',housing:'重大开支',assets:'已攒资产',nominal:'名义收益率',inflation:'通胀率'};
  const num=(v,d=2)=>new Intl.NumberFormat('zh-CN',{maximumFractionDigits:d}).format(v);
  const money=v=>v===0?'0 元':Math.abs(v)>=10000?num(v/10000)+' 万元':num(v)+' 元';
  const short=v=>v===0?'0':Math.abs(v)>=10000?num(v/10000)+'万':num(v);
  function resultParts(v,monthly=false){
    if(monthly){if(v>=1e8)return [num(v/1e8),'亿元 / 月'];if(v>=1000000)return [num(v/10000),'万元 / 月'];return [num(Math.floor(v)),'元 / 月'];}
    if(v>=1e12)return [num(v/1e12),'万亿元'];if(v>=1e8)return [num(v/1e8),'亿元'];return [num(v/10000),'万元'];
  }
  function showToast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3400);}
  function pulse(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;$('ticket').classList.remove('pulse');requestAnimationFrame(()=>$('ticket').classList.add('pulse'));}
  function render(animate=false){
    const reverse=state.mode==='reverse';
    $('monthly-section').hidden=reverse;$('reverse-section').hidden=!reverse;$('assets-section').hidden=reverse;
    ['forward','reverse'].forEach(id=>{$(id).classList.toggle('active',state.mode===id);$(id).setAttribute('aria-pressed',String(state.mode===id));});
    $('child-cost-row').hidden=!(Number(state.children)>0);$('child-minus').disabled=Number(state.children)<=0;$('child-plus').disabled=Number(state.children)>=20;
    $('custom-rates').hidden=state.rateMode!=='custom';
    document.querySelectorAll('[data-rate]').forEach(el=>{const yes=el.dataset.rate===state.rateMode;el.classList.toggle('selected',yes);el.setAttribute('aria-pressed',String(yes));});
    document.querySelectorAll('[data-monthly]').forEach(el=>el.classList.toggle('selected',Number(state.monthly)===Number(el.dataset.monthly)));
    document.querySelectorAll('[data-capital]').forEach(el=>el.classList.toggle('selected',Number(state.capital)===Number(el.dataset.capital)));
    $('monthly-range').value=Math.min(50000,Math.max(0,Number(state.monthly)||0));
    document.querySelectorAll('.input-error').forEach(el=>el.classList.remove('input-error'));
    Object.keys(ids).forEach(id=>$(id).removeAttribute('aria-invalid'));
    current=model.calculate(state);
    const customRate=(Number(state.nominal)-Number(state.inflation));
    $('assumption-label').textContent=state.rateMode==='video'?'视频版 · 480 倍':state.rateMode==='cautious'?'稍保守 · 600 倍':'自定义 · 实际 '+num(customRate)+'%';
    $('validation').hidden=current.valid;
    $('save-card').disabled=!current.valid;$('copy-result').disabled=!current.valid;
    $('result-label').textContent=reverse?'这笔钱，每月可以花':'我的自由生活目标';$('mobile-result-label').textContent=reverse?'每月日常预算':'我的自由目标';
    if(!current.valid){
      $('result-value').textContent='—';$('result-unit').textContent='';$('mobile-result-value').textContent='检查输入';$('result-description').textContent=current.reason==='rate'?'实际回报率需要大于 0，才能支持这个保购买力模型。':'先把数字补完整，再看看你的自由生活。';
      ['daily-value','children-value','health-value','housing-value'].forEach(id=>$(id).textContent='—');$('receipt-rate').textContent='—';$('formula-inline').textContent='等待有效的预算与收益假设';$('progress-card').hidden=true;
      if(current.reason==='rate')$('validation').textContent='当名义收益不高于通胀，资产无法一边支付日常开销、一边保持购买力。这个模型下没有有限的自由目标；不代表你不能退休，需要换用允许花本金的规划。';
      else{$('validation').textContent='请检查：'+current.errors.map(key=>names[key]||key).join('、')+'。金额不能留空或为负数，孩子数量须为 0—20 的整数；超大金额也有上限。';for(const [id,key]of Object.entries(ids))if(current.errors.includes(key)){$(id).setAttribute('aria-invalid','true');$(id).classList.add('input-error');}}
      $('insight').textContent='先确定想过的生活，再选择你愿意承担的投资风险。';return;
    }
    const c=current,p=resultParts(reverse?c.affordable:c.target,reverse);
    $('result-value').textContent=p[0];$('result-unit').textContent=p[1];$('mobile-result-value').textContent=p.join(' ');document.querySelector('.result-number').classList.toggle('big',p[0].length>7);
    $('result-description').textContent=reverse?(c.reserveShortfall>0?'这笔钱还不足以覆盖额外预留，暂时没有可用于日常生活的本金。':'先留出 '+money(c.extras)+'，剩下的钱支持你的日常生活。'):'每月花 '+num(c.state.monthly)+' 元，另留 '+money(c.extras)+'给人生的大开销。';
    $('daily-label').textContent=reverse?'可用于日常生活的本金':'日常生活本金';$('daily-value').textContent=money(reverse?Math.max(0,c.available):c.daily);
    $('children-value').textContent=money(c.childBudget);$('health-value').textContent=money(c.healthBudget);$('housing-value').textContent=money(c.capitalBudget);
    $('receipt-rate').textContent='× '+num(c.multiplier);
    $('formula-inline').textContent=reverse?'('+short(c.state.capital*10000)+' − '+short(c.extras)+') ÷ '+num(c.multiplier)+' ＝ '+(c.reserveShortfall>0?'暂无日常预算':num(Math.floor(c.affordable))+' 元 / 月'):num(c.state.monthly)+' × '+num(c.multiplier)+' ＋ '+short(c.childBudget)+' ＋ '+short(c.healthBudget)+' ＋ '+short(c.capitalBudget)+' ＝ '+short(c.target);
    if(reverse&&c.reserveShortfall>0){$('validation').hidden=false;$('validation').textContent='额外预留比现有资产多 '+money(c.reserveShortfall)+'。先调整育儿、医疗或重大开支预算；这里的 0 元不是已经达到自由。';}
    $('progress-card').hidden=reverse||c.assets<=0;
    if(!reverse&&c.assets>0){const achieved=c.assets>=c.target;$('progress-label').textContent='已攒下 '+num(c.progress*100,1)+'%';$('progress-gap').textContent=achieved?'达到本次理论目标':'距目标还差 '+money(c.gap);$('progress-fill').style.width=Math.min(100,c.progress*100)+'%';$('progress-note').textContent=achieved?'达到的是本次假设下的数字，辞职前仍需检查现金流和风险。':'积蓄采用当前输入金额，不包含未来投资收益预测。';}
    $('insight').textContent='在 '+num(c.multiplier)+' 倍假设下，每月少花 100 元，目标就少 '+money(c.multiplier*100)+'。';
    if(animate)pulse();
  }
  for(const [id,key]of Object.entries(ids))$(id).addEventListener('input',()=>{state[key]=$(id).value;render(true);});
  $('monthly-range').addEventListener('input',()=>{state.monthly=$('monthly-range').value;$('monthly').value=state.monthly;render(true);});
  ['forward','reverse'].forEach(id=>$(id).addEventListener('click',()=>{state.mode=id;render(true);}));
  document.querySelectorAll('[data-monthly]').forEach(el=>el.addEventListener('click',()=>{state.monthly=Number(el.dataset.monthly);$('monthly').value=state.monthly;render(true);}));
  document.querySelectorAll('[data-capital]').forEach(el=>el.addEventListener('click',()=>{state.capital=Number(el.dataset.capital);$('capital').value=state.capital;render(true);}));
  document.querySelectorAll('[data-rate]').forEach(el=>el.addEventListener('click',()=>{state.rateMode=el.dataset.rate;render(true);}));
  $('child-minus').addEventListener('click',()=>{state.children=Math.max(0,Math.ceil(Number(state.children)||0)-1);$('children').value=state.children;render(true);});
  $('child-plus').addEventListener('click',()=>{state.children=Math.min(20,Math.floor(Number(state.children)||0)+1);$('children').value=state.children;render(true);});
  $('reset').addEventListener('click',()=>{state={...model.defaults};for(const[id,key]of Object.entries(ids))$(id).value=state[key];$('assumptions').open=false;render(true);showToast('已恢复通用试算起点。');});
  function shareText(){
    if(!current?.valid)return '';
    const c=current,reverse=state.mode==='reverse',parts=resultParts(reverse?c.affordable:c.target,reverse);
    return ['我的自由生活票据 ✳',reverse?'假设有 '+money(c.state.capital*10000)+'，预留大开销后，每月日常预算约 '+parts.join('')+'。':'每月想花 '+num(c.state.monthly)+' 元，我的理论自由目标是 '+parts.join('')+'。','其中额外预留：育儿 '+money(c.childBudget)+'、医疗与照护 '+money(c.healthBudget)+'、重大开支 '+money(c.capitalBudget)+'。',c.reserveShortfall>0?'注意：预留尚缺 '+money(c.reserveShortfall)+'，目前没有可用于日常生活的本金。':'','按实际回报 '+num(c.rate*100)+'% / '+num(c.multiplier)+' 倍测算，金额按今天购买力，非收益承诺。','根据小Lin说视频公式制作，来算算你的：',APP_URL].filter(Boolean).join('\n');
  }
  async function copy(text,message){
    try{if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');await navigator.clipboard.writeText(text);showToast(message);}catch{$('share-text').value=text;$('share-dialog').showModal();$('share-text').focus();$('share-text').select();}
  }
  $('copy-result').addEventListener('click',()=>copy(shareText(),'结果已复制，可以粘贴给朋友了。'));
  $('share-calculator').addEventListener('click',()=>copy('自由，多少钱一份？算算你想过的生活：\n'+APP_URL,'计算器链接已复制，没有附带你的金额。'));
  $('close-dialog').addEventListener('click',()=>$('share-dialog').close());$('select-text').addEventListener('click',()=>{$('share-text').focus();$('share-text').select();showToast('已选中，可用浏览器的复制功能。');});
  $('close-image').addEventListener('click',()=>$('image-dialog').close());
  function drawCard(){
    const c=current;if(!c?.valid)return null;
    const cv=document.createElement('canvas');cv.width=1080;cv.height=1460;const x=cv.getContext('2d'),reverse=state.mode==='reverse';
    function text(t,y,size,color='#172957',align='left',font='sans-serif'){x.fillStyle=color;x.textAlign=align;x.font=`${size>=65?600:400} ${size}px ${font}`;x.fillText(t,align==='center'?540:align==='right'?936:144,y);}
    function line(y,dashed=false,color='#b7c8ef'){x.strokeStyle=color;x.lineWidth=2;x.setLineDash(dashed?[9,9]:[]);x.beginPath();x.moveTo(144,y);x.lineTo(936,y);x.stroke();x.setLineDash([]);}
    function wrap(t,y,max=790,size=26,color='#e2eaff'){let row='',yy=y;x.font=`${size}px sans-serif`;for(const ch of t){if(x.measureText(row+ch).width>max){text(row,yy,size,color);row='';yy+=size*1.6;}row+=ch;}if(row)text(row,yy,size,color);return yy;}
    x.fillStyle='#eef5ff';x.fillRect(0,0,1080,1460);
    text('自由生活实验室  ✳',87,25);text('按自己的活法。',87,24,'#62708e','right');
    x.fillStyle='#3158dc';x.beginPath();x.roundRect(92,130,896,1215,36);x.fill();
    text('一张通往理想生活的票',202,28,'#e2eaff');text('✳',208,46,'#ffffff','right');line(240,false,'#ffffff50');
    text(reverse?'这笔钱，每月可以花':'我的自由生活目标',315,29,'#dbe5ff');
    const parts=resultParts(reverse?c.affordable:c.target,reverse),value=parts[0];let fs=142;x.font=`600 ${fs}px monospace`;while(x.measureText(value).width>770&&fs>45){fs-=3;x.font=`600 ${fs}px monospace`;}
    text(value,488,fs,'#ffffff','left','monospace');text(parts[1],553,39,'#ffffff');
    const desc=reverse?(c.reserveShortfall>0?'额外预算尚缺 '+money(c.reserveShortfall)+'，暂无日常本金。':'资产 '+money(c.state.capital*10000)+'，另留 '+money(c.extras)+'给人生的大开销。'):'每月花 '+num(c.state.monthly)+' 元，另留 '+money(c.extras)+'给人生的大开销。';
    wrap(desc,619);
    x.strokeStyle='#aac3ff';x.lineWidth=3;x.beginPath();x.moveTo(150,811);x.lineTo(930,811);x.moveTo(225,847);x.lineTo(855,847);x.moveTo(310,883);x.lineTo(770,883);x.moveTo(425,811);x.arc(540,811,115,Math.PI,0);x.moveTo(540,669);x.lineTo(540,643);x.moveTo(426,699);x.lineTo(405,676);x.moveTo(654,699);x.lineTo(675,676);x.stroke();
    line(929,true,'#ffffff80');x.fillStyle='#eef5ff';for(const px of [92,988]){x.beginPath();x.arc(px,929,19,0,Math.PI*2);x.fill();}
    text('把自由拆开看看',990,27,'#dbe5ff');text('× '+num(c.multiplier),990,28,'#ffffff','right');
    const rows=[[reverse?'日常可用本金':'日常生活本金',money(reverse?Math.max(0,c.available):c.daily)],['育儿预留',money(c.childBudget)],['医疗与照护',money(c.healthBudget)],['买房、买车等',money(c.capitalBudget)]];
    rows.forEach(([label,amount],i)=>{text(label,1055+i*51,26,'#dbe5ff');text(amount,1055+i*51,27,'#ffffff','right');});
    line(1248,false,'#ffffff50');text('实际回报 '+num(c.rate*100)+'% · 今天的购买力 · 非收益承诺',1299,22,'#dbe5ff');
    text('根据小Lin说视频公式制作 · 非官方计算器',1394,22,'#62708e','center');
    return cv;
  }
  $('save-card').addEventListener('click',async()=>{
    const button=$('save-card');if(!current?.valid)return;button.disabled=true;
    try{const canvas=drawCard();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('export failed');if(cardUrl)URL.revokeObjectURL(cardUrl);cardUrl=URL.createObjectURL(blob);$('card-preview').src=cardUrl;$('card-download').href=cardUrl;$('image-dialog').showModal();}
    catch{showToast('图片生成失败，可先复制文字结果或截屏保存。');}finally{button.disabled=!current?.valid;}
  });
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}}));
  // Only calculator math and explicitly selected sharing run here; no analytics, storage or network upload.
  render();
})();
