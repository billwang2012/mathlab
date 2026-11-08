(() => {
  'use strict';
  const M=globalThis.BeginnerMath,KEY='equation-lab-beginner-v1',MODE='equation-lab-mode';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let state=M.create(),root=null,busy=false,locked=false,warning='',message='',voice=null;
  const $=s=>root?.querySelector(s);
  const button=(action,text,cls='',attrs='')=>'<button type="button" data-intro="'+action+'" class="'+cls+'" '+attrs+'>'+text+'</button>';
  const bag=()=>'<svg viewBox="0 0 90 104" aria-hidden="true" class="intro-bag-art"><path d="M29 10 Q45 17 61 10 L56 29 Q81 47 80 79 Q80 97 45 98 Q10 97 10 79 Q9 48 34 29Z" fill="#b4cdd0" stroke="#55777a" stroke-width="2"/><path d="M33 30 Q45 35 57 30 M31 27 Q45 31 60 25 M25 51 Q19 69 25 82 M65 53 Q72 68 65 83" fill="none" stroke="#709799" stroke-width="2.5" stroke-linecap="round"/><path d="M31 27 Q21 27 20 35 M58 27 Q68 24 73 30" fill="none" stroke="#a16b3f" stroke-width="3"/><text x="45" y="75" text-anchor="middle" fill="#34595d" font-size="32" font-family="Georgia">?</text></svg>';
  function bagToken(){return button('bag',bag(), 'intro-bag','aria-label="小袋子，重量还不知道"');}
  function weight(side,id,selectable=true,extra=''){
    const chosen=selectable&&state.selected[side]?.includes(id),attrs=selectable?'data-side="'+side+'" data-id="'+id+'" aria-pressed="'+chosen+'" aria-label="'+(side==='left'?'左':'右')+'盘1克砝码'+(id+1)+(chosen?'，已选中':'')+'"':'';
    return selectable?button('select','<span>1<small>克</small></span><i aria-hidden="true">✓</i>','intro-weight '+(chosen?'chosen ':'')+extra,attrs):'<span class="intro-weight static '+extra+'"><span>1<small>克</small></span></span>';
  }
  function guiding(){return state.hints[state.level]>0||(state.level===0&&state.removed===0);}
  function cue(){
    const s=state,q=M.LEVELS[s.level],l=s.selected.left.length,r=s.selected.right.length;
    if(s.phase==='balance'){
      if(q.bags===2&&s.removed===q.left)return {title:s.level===1||guiding()?'两个袋子一样重，把砝码平均分成两份。':'现在只剩两个袋子了，你准备怎么办？',detail:'右边的砝码还在盘里；可以直接点“分成两份”。',target:s.level===1||guiding()?'group':''};
      if(r>q.left-s.removed)return {title:'右边选得太多了，点一下已选砝码取消。',detail:'左边只有'+(q.left-s.removed)+'个砝码，两边需要选一样多。',target:''};
      if(l||r){if(l&&r&&l===r)return {title:'选好啦，把它们一起拿走。',detail:'两边选中的都是1克砝码；按下面的绿色按钮。',target:'remove'};if(l!==r&&l&&r)return {title:'两边要拿走一样多。',detail:'左边选了'+l+'个，右边选了'+r+'个。再点一次可以取消选择。',target:''};return {title:l?'右边也选'+l+'个一样的砝码。':'左边也选'+r+'个一样的砝码。',detail:'选中的砝码还留在盘里；两边选好后，一起拿走。',target:l?'right':'left'};}
      if(s.level===0&&s.removed===0)return {title:'点一下左边的黄色砝码。',detail:'天平平着，两边一样重。每个黄色砝码都是1克。',target:'left'};

      return {title:guiding()?'两边各选一样多的砝码，再一起拿走。':s.level===2?'想知道每个袋子有多重，你准备先做什么？':'怎样让左边只剩小袋子？',detail:guiding()?'先选左边，再选右边。':'砝码可以点选；再点一次取消。',target:guiding()?'left':''};
    }
    if(s.phase==='groups'){
      const remaining=q.right-s.removed-s.groups[0]-s.groups[1];
      return {title:remaining?'在右盘里，把砝码分成两份。':'分完了，看看两组是不是一样多？',detail:remaining?'袋子留在左盘，砝码留在右盘。点“放入一个砝码”，让右盘两份一样多。':'想调整，点组里的砝码放回右盘。两边各留一份后，就能看一个袋子有多重。',target:remaining?'bin':'group-confirm'};
    }
    if(s.phase==='answer')return {title:'一个小袋子重几克？',detail:'数一数，再把你的答案填进下面的空格。',target:'answer'};
    if(s.phase==='check')return {title:'把你的答案放回原来的天平。',detail:'每个袋子换成'+s.guess+'个1克砝码。数数两边，真的一样重吗？',target:'check'};
    if(s.phase==='done')return {title:'你找到了，还检查过了！',detail:s.level===0?'两边拿走一样多，还是一样重。':s.level===1?'两个袋子一样重，每份也要一样多。':'先让袋子单独留下，再平均分。',target:'next'};
    if(s.phase==='paper')return {title:'不用天平，你能试试这一题吗？',detail:'这次只在空格里填数。不知道也没关系，可以要一点提示。',target:'paper-answer'};
    return {title:'三次实验，你都走过来了。',detail:s.paperDone?'你还独立填写了新的方程答案。':'你可以稍后再试不画天平的小题。',target:''};
  }
  function scale(){
    const q=M.LEVELS[state.level],b=M.board(state),check=['check','done'].includes(state.phase),grouped=q.bags===2&&state.phase==='answer',distributing=state.phase==='groups';
    const bags=grouped?1:b.bags,left=check?q.left:b.left.length,right=check?q.right:grouped?state.groups[0]:b.right.length;
    const leftItems=check?Array.from({length:q.bags},()=>'<span class="intro-replacement" aria-label="一个袋子换成'+state.guess+'个1克砝码">'+Array.from({length:Number(state.guess)},()=>weight('',0,false)).join('')+'</span>').join(''):Array.from({length:bags},(_,i)=>distributing?'<div class="intro-bag-group"><span>第'+(i+1)+'组</span>'+bagToken()+'</div>':bagToken()).join('');
    const can=state.phase==='balance';
    const leftWeights=can?b.left.map(id=>weight('left',id,true)).join(''):Array.from({length:left},()=>weight('',0,false)).join('');
    const rightWeights=distributing?groups():can?b.right.map(id=>weight('right',id,true)).join(''):Array.from({length:right},()=>weight('',0,false)).join('');
    return '<div class="intro-scale '+(check?'checking':'')+(distributing?' intro-distributing':'')+'"><svg class="intro-scale-frame" viewBox="0 0 900 330" preserveAspectRatio="none" aria-hidden="true"><path d="M450 40V285 M406 310L450 258L494 310Z" fill="#d0dcd7" stroke="#749086" stroke-width="5" stroke-linejoin="round"/><path d="M217 48H683" stroke="#617b73" stroke-width="12" stroke-linecap="round"/><circle cx="450" cy="48" r="11" fill="#ead6a2" stroke="#897442" stroke-width="3"/><path d="M217 48L78 247 M217 48L357 247 M683 48L543 247 M683 48L823 247" fill="none" stroke="#a6b8ad" stroke-width="2.5"/><path d="M385 315H515" stroke="#749086" stroke-width="8" stroke-linecap="round"/></svg><div class="intro-pan intro-left" data-intro-pan="left"><div class="intro-objects">'+leftItems+leftWeights+'</div><div class="intro-pan-base">左边'+(check?' · '+q.right+'克':'')+'</div></div><div class="intro-pan intro-right" data-intro-pan="right"><div class="intro-objects">'+rightWeights+'</div><div class="intro-pan-base">右边'+(check?' · '+q.right+'克':'')+'</div></div><span class="intro-level">两边一样重</span></div>';
  }
  function groups(){const remaining=M.LEVELS[state.level].right-state.removed-state.groups[0]-state.groups[1];return '<div class="intro-in-pan-groups"><div class="intro-pool"><div>'+Array.from({length:remaining},()=>weight('',0,false)).join('')+'</div><span>'+(remaining?'右盘还有 '+remaining+' 个未分组':'右盘总量没变，检查两份是否一样多')+'</span></div><div class="intro-bins">'+[0,1].map(i=>'<div class="intro-bin"><div class="intro-bin-heading"><span>第'+(i+1)+'组</span></div><div class="intro-bin-weights">'+Array.from({length:state.groups[i]},(_,j)=>button('return','<span>1<small>克</small></span>','intro-weight','data-bin="'+i+'" aria-label="把第'+(i+1)+'组的第'+(j+1)+'个砝码放回去"')).join('')+'</div>'+button('give','放入一个砝码','intro-give','data-bin="'+i+'" '+(!remaining?'disabled':''))+'</div>').join('')+'</div></div>';}
  function actionArea(){
    const s=state,l=s.selected.left.length,r=s.selected.right.length;
    if(s.phase==='balance'){
      if(M.LEVELS[s.level].bags===2&&s.removed===M.LEVELS[s.level].left)return button('group','分成两份','intro-primary');
      if(l||r)return '<span class="intro-count">左边选了 <b>'+l+'</b> 个 · 右边选了 <b>'+r+'</b> 个</span>'+button('remove','两边一起拿走','intro-primary')+'<span class="intro-micro">选中不改变重量</span>';
      return (s.level===2?button('group','分成两份','intro-secondary'):'')+'<span class="intro-micro">点黄色砝码开始，不需要拖动。</span>';
    }
    if(s.phase==='groups')return button('group-confirm','两边各留一份，看看吧','intro-primary');
    if(s.phase==='answer'||s.phase==='paper')return '<form id="intro-answer-form"><label for="intro-answer">'+(s.phase==='paper'?'x =':'一个袋子重')+'</label><input id="intro-answer" name="introAnswer" inputmode="numeric" autocomplete="off" maxlength="2" aria-label="'+(s.phase==='paper'?'x等于多少':'一个袋子重几克')+'" type="text" pattern="[0-9]{1,2}" required><span>'+(s.phase==='paper'?'':'克')+'</span><button type="submit" class="intro-primary" data-intro="'+(s.phase==='paper'?'paper-answer':'answer')+'">'+(s.phase==='paper'?'检查一下':'放回原来试试')+'</button></form>';
    if(s.phase==='check')return button('check','我数过了，两边一样重','intro-primary');
    if(s.phase==='done')return '<div class="intro-equation-note">'+(s.level===0?'袋子的重量也可以记作 <i>x</i>。':'用方程记下来：')+' <b>'+esc(M.LEVELS[s.level].equation)+' → x = '+s.guess+'</b></div>'+button('next',s.level===2?'试一道不画天平的小题':'下一关','intro-primary');
    if(s.phase==='finish')return button('replay','再玩一遍','intro-primary')+button('advanced','进入进阶练习','intro-secondary');
    return '';
  }
  function render(){
    const c=cue(),s=state,active=document.activeElement,previousFocus=active?.id,focusData=root.contains(active)&&active?.matches('[data-intro]')?{...active.dataset}:null;
    root.innerHTML='<div class="intro-shell"><header class="intro-header"><span class="intro-logo">方程平衡实验室 <small>PC · v1.3.15</small></span><div class="intro-steps" aria-label="三关进度">'+['一起拿走','平均分','自己试'].map((t,i)=>'<span '+(s.level===i?'aria-current="step"':'')+' class="'+(s.done[i]?'complete':'')+'">'+(i+1)+' '+t+'</span>').join('')+'</div>'+button('advanced','进阶练习','intro-link')+'</header><section class="intro-task"><div class="intro-kicker">'+(s.phase==='paper'?'最后一道小挑战':s.phase==='finish'?'今天的探索':M.LEVELS[s.level].title)+'</div><h1>小袋子有多重？</h1><div class="intro-prompt" aria-live="polite"><h2 id="intro-cue">'+esc(c.title)+'</h2><p>'+esc(c.detail||'每个黄色砝码都是1克。')+'</p></div></section><section class="intro-stage" aria-label="天平实验">'+(s.phase==='paper'?'<div class="intro-paper"><span>把今天的方法，用到新题里。</span><strong>x + 3 = 8</strong>'+(s.paperHint?'<p>想一想：两边都减去3，会剩下什么？</p>':'')+'</div>':s.phase==='finish'?'<div class="intro-finish"><b>两边一起拿走 → 平均分 → 放回去检验</b><p>完成游戏不代表已经学会。改天换一道新题，再自己试一次。</p><div>'+s.done.map((v,i)=>'<span>第'+(i+1)+'关 · '+(s.hints[i]?'用过提示':'未点提示')+'</span>').join('')+'</div><p>独立小题：'+(s.paperDone?(s.paperHint?'借助提示完成':'未点提示完成'):'暂时跳过')+'</p></div>':scale())+'</section><div class="intro-feedback" id="intro-feedback" role="status">'+esc(message)+'</div><section class="intro-actions">'+actionArea()+'</section><footer class="intro-footer"><div>'+button('undo','退一步','intro-link',(!s.undo.length&&!s.selected.left.length&&!s.selected.right.length?'disabled':''))+button('hint','给我一点帮助','intro-link')+button('speak','听一遍','intro-link',voice?'':'hidden')+'</div><span id="intro-storage" class="'+(warning?'intro-warning':'')+'">'+esc(warning||'进度只保存在这台电脑')+'</span><div>'+button('restart','重玩这关','intro-link')+button('download','下载离线版','intro-link')+'</div></footer>'+(s.phase==='paper'?button('skip-paper','先跳过这道小题','intro-skip'):'')+(warning?button('clear','清除入门记录后重新保存','intro-link danger'):'')+'</div><dialog id="intro-reset-dialog"><h2>清除三关入门记录？</h2><p>只清除这三关的进度，不影响进阶练习和旧游戏。</p>'+button('cancel-clear','保留记录')+button('confirm-clear','确认清除','danger')+'</dialog>';
    root.setAttribute('aria-busy',String(busy));
    if(c.target==='left'||c.target==='right')$('[data-intro-pan="'+c.target+'"] .intro-weight')?.classList.add('intro-cue-ring');
    if(c.target==='remove'||c.target==='group')$('[data-intro="'+c.target+'"]')?.classList.add('intro-cue-ring');
    if(s.phase==='answer'||s.phase==='paper')$('#intro-answer')?.focus({preventScroll:true});
    else if(previousFocus&&root.querySelector('#'+CSS.escape(previousFocus)))root.querySelector('#'+CSS.escape(previousFocus)).focus({preventScroll:true});
    else if(focusData){const same=[...root.querySelectorAll('[data-intro]:not(:disabled)')].find(b=>['intro','side','id','bin'].every(k=>b.dataset[k]===focusData[k]));(same||$('.intro-actions .intro-primary')||$('.intro-give:not(:disabled)')||$('.intro-weight:not(.static)'))?.focus({preventScroll:true});}
  }
  function persist(){if(locked)return;try{const text=JSON.stringify(M.restore(state));if(text.length>80000)throw Error('记录过长');localStorage.setItem(KEY,text);warning='';}catch{warning='暂时不能保存，但你仍然可以玩。原记录没有被覆盖。';}}
  function show(){document.body.classList.add('beginner-active');root.hidden=false;document.getElementById('app').hidden=true;try{sessionStorage.setItem(MODE,'beginner');}catch{}message='';render();window.scrollTo({top:0,behavior:'instant'});}
  function advanced(){if(busy)return;window.speechSynthesis?.cancel();document.body.classList.remove('beginner-active');root.hidden=true;document.getElementById('app').hidden=false;try{sessionStorage.setItem(MODE,'advanced');}catch{}window.scrollTo({top:0,behavior:'instant'});}
  async function run(action,data={}){
    if(busy)return;
    if(action==='advanced'){advanced();return;}
    if(action==='download'){const a=document.createElement('a');a.href=location.protocol==='file:'?location.href:'方程平衡实验室_离线版.html';a.download='equation-lab-offline.html';a.click();return;}
    if(action==='clear'){$('#intro-reset-dialog').showModal();return;}
    if(action==='cancel-clear'){$('#intro-reset-dialog').close();return;}
    if(action==='confirm-clear'){try{localStorage.removeItem(KEY);locked=false;warning='';state=M.create();persist();render();}catch{message='浏览器目前不允许保存。你仍然可以继续玩。';render();}return;}
    if(action==='speak'){if(voice){const c=cue(),u=new SpeechSynthesisUtterance(c.title+'。'+c.detail);u.voice=voice;u.lang='zh-CN';u.rate=.85;window.speechSynthesis.cancel();window.speechSynthesis.speak(u);}return;}
    if(action==='bag'){message='袋子里的重量还不知道。先看看旁边标着“1克”的黄色砝码。';render();return;}
    try{
      const next=M.act(state,action,data);message='';
      if(['remove','give','check'].includes(action)&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
        busy=true;root.setAttribute('aria-busy','true');root.classList.add('intro-busy');
        const nodes=action==='remove'?[...root.querySelectorAll('.intro-weight.chosen')]:action==='give'?[root.querySelector('.intro-pool .intro-weight')]:[root.querySelector('.intro-scale')];
        await Promise.all(nodes.filter(Boolean).map(node=>node.animate(action==='remove'?[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(30px) scale(.8)'}]:action==='give'?[{opacity:1},{opacity:0,transform:'translateY(20px)'}]:[{opacity:.5},{opacity:1}],{duration:300,easing:'ease-in-out'}).finished));
      }
      state=next;persist();if(action==='hint'){message=state.phase==='paper'?'两边都减去3，试着自己算一算。':state.phase==='groups'?'两个格子最后要一样多；分错了，点里面的砝码放回去。':'先让袋子旁边没有砝码。两边拿走一样多，天平仍然平衡。';}
      render();
    }catch(error){message=error.message||'这一步没有完成，再试一次。';render();}
    finally{busy=false;root.classList.remove('intro-busy');root.setAttribute('aria-busy','false');}
  }
  function init(){
    root=document.getElementById('beginner-root');if(!root)return;
    try{const raw=localStorage.getItem(KEY);if(raw){if(raw.length>80000)throw Error('记录过长');state=M.restore(JSON.parse(raw));}}catch{locked=true;warning='入门记录未能读取，原记录已保留。本次可以玩，但不保存。';}
    const voices=()=>{voice=window.speechSynthesis?.getVoices().find(v=>v.localService&&/^zh/i.test(v.lang))||null;const b=$('[data-intro="speak"]');if(b)b.hidden=!voice;};voices();window.speechSynthesis?.addEventListener('voiceschanged',voices);
    root.addEventListener('click',e=>{const b=e.target.closest('[data-intro]');if(!b||b.disabled)return;e.preventDefault();const action=b.dataset.intro;run(action,{side:b.dataset.side,id:Number(b.dataset.id),bin:Number(b.dataset.bin),value:$('#intro-answer')?.value.trim()||''});});
    root.addEventListener('submit',e=>{if(e.target.id==='intro-answer-form'){e.preventDefault();run(state.phase==='paper'?'paper-answer':'answer',{value:$('#intro-answer').value.trim()});}});
    document.addEventListener('click',e=>{if(e.target.closest('[data-intro-open]')){e.preventDefault();show();}});
    document.addEventListener('keydown',e=>{if(!root.hidden&&busy)e.preventDefault();},true);
    let mode='beginner';try{mode=sessionStorage.getItem(MODE)||mode;}catch{}if(mode==='advanced')advanced();else show();
  }
  globalThis.BeginnerView=Object.freeze({init,show,isBusy:()=>busy});
})();
