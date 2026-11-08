(() => {
  'use strict';
  const B=BalanceMath,E=EquationMath,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pretty=s=>String(s).replace(/-/g,'−').replace(/\*/g,'×');
  let host=null,board=null,currentId='',work=null,selected=null,busy=false,message='',picks={left:[],right:[]};
  const clearPicks=()=>{picks={left:[],right:[]};};
  function token(t,side,extra=''){const tag=t.operation?'span':'button',size=t.merged?' merged-block':'';const html='<'+tag+(t.operation?'':' type="button" draggable="true"')+' class="balance-block '+(t.kind==='group'?'box-block':t.kind==='x'?'x-block':'one-block')+' '+(t.value?.startsWith('-')?'negative-block':'')+' '+extra+size+(t.operation?' operation-block':'')+'" '+(t.operation?'data-operation-block="true"':'data-btoken="'+t.id+'"')+' data-side="'+side+'" data-kind="'+t.kind+'" data-value="'+esc(t.value||'')+'" aria-label="'+esc((side==='left'?'左盘':'右盘')+' '+B.label(t))+'">'+(t.kind==='group'?'<small>整体盒子</small>':'')+'<span>'+esc(pretty(B.label(t)))+'</span></'+tag+'>';return html; }
  const magnitude=value=>{const r=E.rat(value);return E.str(r.n<0n?E.neg(r):r);};
  function addTools(b){return '<div class="tool-row add-tools"><span class="tool-label">调数量，再放正块或负块；支持分数。每次一整块。</span>'+['x','one'].map(kind=>{const amount=b.pending?.kind==='add'&&b.pending.token.kind===kind?magnitude(b.pending.token.value):'1';return '<span class="amount-tool" data-amount-editor data-amount-kind="'+kind+'"><label for="add-amount-'+kind+'">'+(kind==='x'?'x 块':'常数块')+'</label><span class="amount-controls"><button type="button" data-amount-step="-1" aria-label="'+(kind==='x'?'x块':'常数块')+'数量减1">−</button><input id="add-amount-'+kind+'" data-add-amount="'+kind+'" type="text" maxlength="32" value="'+esc(amount)+'" aria-describedby="add-error-'+kind+'" autocomplete="off"><button type="button" data-amount-step="1" aria-label="'+(kind==='x'?'x块':'常数块')+'数量加1">+</button></span>'+[1,-1].map(sign=>{const value=sign<0?'-'+amount:amount;return tool('add',value,esc(pretty(B.label({kind,value}))),kind);}).join('')+'<small id="add-error-'+kind+'" class="amount-error" role="status"></small></span>';}).join('')+'</div>';}
  const tool=(op,value,label,kind='')=>'<button type="button" draggable="true" class="balance-tool" data-btool="'+op+'" data-kind="'+kind+'" data-value="'+value+'">'+label+'</button>';
  const swapButton=b=>'<button type="button" class="swap-sides" data-baction="swap" title="'+(b.pending?'先在另一盘完成操作，或撤回未同步操作':'整盘交换位置，每块的符号和数量不变')+'" '+(b.pending?'disabled':'')+'>左右对调</button>';
  const groupFocus=b=>(b.left.length&&b.left.every(t=>t.kind==='x')&&b.right.every(t=>t.kind==='one'))||(b.right.length&&b.right.every(t=>t.kind==='x')&&b.left.every(t=>t.kind==='one'));
  function inventory(b){const divide='<div class="division-tools"><span class="tool-label">分成几组？两盘一起分</span>'+[2,3,4,5,6,8].map(n=>tool('divide',String(n),'分'+n+'组')).join('')+'</div>',others=addTools(b)+'<div class="tool-row"><span class="tool-label">选工具，再点方块或盘；也可以拖动</span>'+tool('expand','','拆盒')+tool('split','2','切半')+tool('multiply','2','×2')+tool('multiply','3','×3')+tool('multiply','6','×6')+'</div>',flip='<button type="button" class="flip-sides" data-baction="flip-both" title="'+(b.pending?'先在另一盘完成操作，或撤回未同步操作':work?.type==='expand'?'先完成或收起拆盒实验':'点击一次，两盘每一项同时乘以−1，不移动、不拆分方块')+'" '+(b.pending||work?.type==='expand'?'disabled':'')+'>两边同时 ×(−1)</button>',extra='<details class="extra-tools"><summary>更多倍数与切分</summary><div class="custom-tools"><label>非零整数倍数 <input id="custom-multiplier" type="number" min="-12" max="12" value="4"></label><button data-baction="custom-multiplier">生成倍乘工具</button><span id="custom-tool-result"></span>'+[3,4,6,8].map(n=>tool('split',String(n),'切'+n+'份')).join('')+'</div></details>';return '<div class="balance-inventory">'+(groupFocus(b)?divide+flip+'<details class="secondary-tools"><summary>其他操作：加减、拆盒、切分</summary>'+others+extra+'</details>':others+flip+divide+extra)+'</div>';}
  function grouped(side){if(work?.type!=='divide')return false;const bins=Array.from({length:work.n},()=>[]);for(const t of board[side]){const k=work.assign[t.id];if(!Number.isInteger(k)||k<0||k>=work.n)return false;bins[k].push(t);}const first=B.total(bins[0]);return bins.every(g=>{const p=B.total(g);return E.eq(p.a,first.a)&&E.eq(p.b,first.b);});}
  function guide(b){
    if(work?.type==='divide')return grouped('left')&&grouped('right')?'左右盘已各自分好 '+work.n+' 组，总量不变。点“两边各留一组”，才是两边同时除以 '+work.n+'。':'分组尚未均匀。再点“分'+work.n+'组”即可同时重新均分两盘，也可手动调整同盘组内方块。';
    if(work?.type==='expand')return '先点展开后的x项，再点“x项”空位；常数项同样操作。也可以拖进去。';
    if(b.pending?.kind==='add')return (b.pending.side==='left'?'左':'右')+'盘已放入 '+B.label(b.pending.token)+'。请在'+(b.pending.side==='left'?'右':'左')+'盘也加上同样的量，让天平恢复水平。≟ 表示操作还未同步；倾斜仅提示操作方向，不判断 x 的正负。';
    if(b.pending)return '请在'+(b.pending.side==='left'?'右':'左')+'盘做相同操作，才会一起改变等式。';
    if(B.finishable(b))return 'x已经单独留下。到下面把你的答案代回原方程，检查两边是否相等。';
    if([...b.left,...b.right].some(t=>t.kind==='group'))return '先点“拆盒”，再点紫色的括号盒子，看看每一项怎样展开。';
    if((b.left.length&&b.left.every(t=>t.kind==='x')&&b.right.every(t=>t.kind==='one'))||(b.right.length&&b.right.every(t=>t.kind==='x')&&b.left.every(t=>t.kind==='one')))return '想让每组留下一个x？点“分几组”，或把它拖到左盘、右盘、任意方块上都可以。';
    return '同盘同类块：拖到一起合并，也可依次点击。等量异号块可抵消。要两边同时拿走：先点左边的块，再点右边的块，按“两边一起拿走”。';
  }
  function metalFrame(tilt=0,prefix='live',pending=false){
    return `<svg class="scale-art metal-scale" viewBox="0 0 800 320" preserveAspectRatio="none" aria-hidden="true"><defs>
      <linearGradient id="${prefix}-steel" x1="0" x2="1" y1="0" y2="0"><stop stop-color="#536573"/><stop offset=".18" stop-color="#aebdc7"/><stop offset=".39" stop-color="#f9fcff"/><stop offset=".48" stop-color="#dce5eb"/><stop offset=".58" stop-color="#7c919f"/><stop offset=".78" stop-color="#b4c3cc"/><stop offset="1" stop-color="#415461"/></linearGradient>
      <linearGradient id="${prefix}-beam" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#f6fafc"/><stop offset=".26" stop-color="#d8e3e9"/><stop offset=".48" stop-color="#8297a5"/><stop offset=".55" stop-color="#eef5f8"/><stop offset="1" stop-color="#526876"/></linearGradient>
      <linearGradient id="${prefix}-base" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#e1e9ed"/><stop offset=".42" stop-color="#91a4af"/><stop offset=".48" stop-color="#647985"/><stop offset="1" stop-color="#334956"/></linearGradient>
      <radialGradient id="${prefix}-pivot" cx=".35" cy=".25" r=".8"><stop stop-color="#fff8db"/><stop offset=".4" stop-color="#dfcc90"/><stop offset=".75" stop-color="#a68a46"/><stop offset="1" stop-color="#665025"/></radialGradient>
      <radialGradient id="${prefix}-shadow"><stop stop-color="#183140" stop-opacity=".24"/><stop offset="1" stop-color="#183140" stop-opacity="0"/></radialGradient>
      </defs><ellipse cx="400" cy="309" rx="142" ry="11" fill="url(#${prefix}-shadow)"/>
      <path class="metal-column" d="M365 289 L394 89 Q400 80 406 89 L435 289 Z" fill="url(#${prefix}-steel)" stroke="#607582" stroke-width="2"/>
      <path d="M398 105 L389 279 L399 279 L403 105 Z" fill="#f6fcff" opacity=".55"/><path d="M409 108 L432 287" fill="none" stroke="#405767" stroke-width="2" opacity=".5"/>
      <path class="metal-base" d="M333 281 Q400 270 467 281 L487 300 L487 307 Q400 316 313 307 L313 300 Z" fill="url(#${prefix}-base)" stroke="#4d6371" stroke-width="2"/>
      <path d="M314 300 Q400 308 486 300 M335 282 Q400 274 465 282" fill="none" stroke="#e6f0f5" stroke-width="2" opacity=".8"/>
      <g class="scale-beam" style="transform:rotate(${tilt*3}deg)"><path d="M145 72 Q400 62 655 72 L655 84 Q400 77 145 84 Z" fill="url(#${prefix}-beam)" stroke="#617784" stroke-width="1.5"/>
      <path d="M148 73 Q400 64 652 73" fill="none" stroke="#fff" stroke-width="2" opacity=".9"/><path d="M145 85 V137 M655 85 V137" stroke="#657c8a" stroke-width="5"/><path d="M144 86 V135 M654 86 V135" stroke="#e6f3fa" stroke-width="1.5"/>
      <circle cx="145" cy="79" r="5" fill="url(#${prefix}-steel)" stroke="#597180"/><circle cx="655" cy="79" r="5" fill="url(#${prefix}-steel)" stroke="#597180"/></g>
      <circle class="metal-pivot" cx="400" cy="78" r="23" fill="url(#${prefix}-pivot)" stroke="#6c5933" stroke-width="2"/><path d="M385 65 Q400 53 416 66" fill="none" stroke="#fff8db" stroke-width="2" opacity=".85"/><text class="pivot-mark" x="400" y="79" text-anchor="middle" dominant-baseline="central" font-family="Arial, sans-serif" font-size="30" font-weight="700" textLength="16" lengthAdjust="spacingAndGlyphs" fill="#4d3d19">${pending?'?':'='}</text>
      </svg>`;
  }
  function revealWork(){document.getElementById('balance-message')?.scrollIntoView({block:'start',behavior:'instant'});}
  function draw(q,b,savedWork=null){board=b;if(currentId!==q.id){currentId=q.id;selected=null;message='';clearPicks();}work=B.restoreWork(savedWork,b);syncPicks();const pending=b.pending,view=B.operationView(b);
    return '<section id="balance-lab" data-tilt="'+view.tilt+'" class="'+(work?'has-workshop ':'')+(work?.type==='divide'?'is-dividing ':'')+(groupFocus(b)?'group-focus':'')+'" aria-label="可点击或拖动的代数天平"><div class="balance-top"><span class="balance-tag">点击或拖动 · 两边同步</span><span class="balance-state">'+(pending?'两边操作未同步':'等式保持相等')+'</span>'+swapButton(b)+'</div><div class="balance-scene"><div class="equation-main balance-equation" id="current-equation">'+esc(pretty(B.sceneEquation(b)))+'</div><div class="balance-machine">'+metalFrame(view.tilt,'live',!!pending)+'<div class="balance-pans">'+['left','right'].map(side=>{
      const staged=pending?.side===side&&pending.kind==='remove'?pending.id:null;
      return '<section class="balance-pan '+(pending&&pending.side!==side?'awaiting-pair':'')+'" data-pan="'+side+'" data-bdrop="pan" data-side="'+side+'"><div class="pan-label">'+(side==='left'?'左盘':'右盘')+(work?.type==='divide'?divisionInfo(b,side):'')+'</div>'+(work?.type==='divide'?divisionSide(b,side):'<div class="pan-blocks">'+view[side].map(t=>token(t,side,(t.id===staged?'staged-token ':'')+(picks[side].includes(t.id)?'picked-block':''))).join('')+(!view[side].length?'<span class="empty-pan">0 · 空盘</span>':'')+'</div>')+'<div class="metal-pan-rim" aria-hidden="true"></div></section>';
    }).join('')+'</div><div class="pivot-drop" data-bdrop="center" tabindex="0" role="button" aria-label="'+(pending?'两边操作未同步':'两边已同步')+'；可将分组工具拖到黄色轴心"></div></div></div>'+pickBar()+''+inventory(b)+'<div class="balance-workshop">'+workshop(b)+'</div><div class="balance-message" id="balance-message" aria-live="polite">'+esc(message||guide(b))+'</div><div class="balance-bottom"><button data-baction="cancel">撤回未同步操作 / 收起实验</button><small>同盘同类块可拖叠合并，等量异号块可抵消。倾斜只提示操作未同步，不按隐藏答案判断 x 的正负或实际重量。</small></div></section>';
  }
  function divisionInfo(b,side){const sum=B.total(b[side]),per=E.format({a:E.div(sum.a,E.rat(work.n)),b:E.div(sum.b,E.rat(work.n))});
    return '<span class="pan-division-info"><span class="pan-total">· 总量 <b>'+esc(pretty(E.format(sum)))+'</b></span> <span class="partition-summary">· '+(grouped(side)?work.n+' 组，每组 <b>'+esc(pretty(per))+'</b>':'尚未分匀')+'</span></span>';
  }
  function divisionSide(b,side){const done=grouped(side),name=side==='left'?'左':'右',unassigned=b[side].filter(t=>work.assign[t.id]===undefined);
    return '<div class="pan-division '+(done?'partition-done':'partition-waiting')+'" data-division-side="'+side+'">'+(unassigned.length?'<div class="pan-blocks pan-unassigned" data-bdrop="pan" data-side="'+side+'" aria-label="'+name+'盘尚未分组的方块">'+unassigned.map(t=>token(t,side)).join('')+'</div>':'')+'<div class="buckets pan-buckets'+(work.n>5?' dense-buckets':'')+'" style="--bins:'+work.n+'">'+Array.from({length:work.n},(_,i)=>'<div class="bucket" data-bdrop="bucket" data-side="'+side+'" data-bin="'+i+'" tabindex="0" role="button" aria-label="'+name+'盘第'+(i+1)+'组"><small>第'+(i+1)+'组</small>'+b[side].filter(t=>work.assign[t.id]===i).map(t=>token(t,side)).join('')+'</div>').join('')+'</div></div>';
  }
  function workshop(b){if(!work)return '';if(work.type==='expand'){
      const t=b[work.side].find(t=>t.id===work.id);if(!t){work=null;return '';}
      const p=E.parse(t.expr),values=[E.str(p.a),E.str(p.b)];
      return '<section class="unbox-workshop"><h3>拆盒实验：'+esc(pretty(t.expr))+'</h3><p>先把展开后的 x 项和常数项拖到对应位置；负号和倍数必须作用于整个盒子。</p><div class="unbox-slots">'+['x项','常数项'].map((label,i)=>'<div data-bdrop="expand-slot" data-slot="'+i+'" tabindex="0" role="button">'+label+'<strong>'+ (work.answers[i]==null?'拖入一块':esc(pretty(work.answers[i]+(i===0?'x':''))))+'</strong></div>').join('')+'</div><div class="unbox-pieces">'+values.flatMap((v,i)=>{
        const r=E.rat(v),n=E.str(E.neg(r)),candidates=[...new Set([v,n,i===0?'1':'-1',i===0?'-1':'1'])];const shift=(t.expr.length+i)%candidates.length;
        return [...candidates.slice(shift),...candidates.slice(0,shift)].map(x=>'<button draggable="true" class="piece" data-piece-kind="'+(i===0?'x':'one')+'" data-piece-value="'+x+'">'+esc(pretty(x+(i===0?'x':'')))+'</button>');
      }).join('')+'</div><button class="primary" data-baction="expand-confirm">检查并拆开盒子</button></section>';
    }
    const both=grouped('left')&&grouped('right');
    return '<section class="division-workshop pan-division-controls"><button class="primary" data-baction="take-group" '+(both?'':'disabled')+'>两边各留一组 · 同时除以 '+work.n+'</button><p class="partition-manual">方块一直留在原托盘内。也可点选或拖动方块放进同盘组框，点盘沿可放回；两盘都分好后才各留一组。</p></section>';
  }
  function amountField(field){const editor=field.closest('[data-amount-editor]'),error=editor.querySelector('.amount-error');try{const amount=B.addAmount(field.value);field.setAttribute('aria-invalid','false');error.textContent='';for(const button of editor.querySelectorAll('[data-btool="add"]')){const negative=button.dataset.value.startsWith('-');button.dataset.value=negative?'-'+amount:amount;button.textContent=pretty(B.label({kind:field.dataset.addAmount,value:button.dataset.value}));}return amount;}catch(e){field.setAttribute('aria-invalid','true');error.textContent=e.message;return null;}}
  function stepAmount(button){const field=button.closest('[data-amount-editor]').querySelector('input'),amount=amountField(field);if(!amount)return;const next=E.str(E.add(E.rat(amount),E.rat(button.dataset.amountStep)));try{B.addAmount(next);}catch(e){field.closest('[data-amount-editor]').querySelector('.amount-error').textContent=e.message;return;}field.value=next;amountField(field);}
  function mount(adapter){host=adapter;const root=document.getElementById('balance-lab');if(!root)return;root.addEventListener('dragstart',e=>{
      const payload=source(e.target);if(!payload||busy){e.preventDefault();return;}selected=payload;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-equation-block',JSON.stringify(payload));e.target.classList.add('dragging');
    });
    root.addEventListener('dragend',()=>{selected=null;root.querySelectorAll('.dragging,.drop-hover').forEach(n=>n.classList.remove('dragging','drop-hover'));});
    root.addEventListener('dragover',e=>{const target=e.target.closest('[data-bdrop],[data-btoken]');if(target){e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('drop-hover');}});
    root.addEventListener('dragleave',e=>e.target.closest('[data-bdrop],[data-btoken]')?.classList.remove('drop-hover'));
    root.addEventListener('drop',e=>{e.preventDefault();e.stopPropagation();root.querySelectorAll('.drop-hover').forEach(n=>n.classList.remove('drop-hover'));let data;try{const raw=e.dataTransfer.getData('application/x-equation-block');if(raw.length>600)return;data=JSON.parse(raw);}catch{return;}const target=e.target.closest('[data-btoken],[data-bdrop]');if(target)drop(data,target);});
    root.addEventListener('input',e=>{if(e.target.matches('[data-add-amount]')){selected=null;root.querySelectorAll('.selected-block').forEach(n=>n.classList.remove('selected-block'));amountField(e.target);}});
    root.addEventListener('click',e=>{
      const step=e.target.closest('[data-amount-step]');if(step){e.preventDefault();selected=null;stepAmount(step);return;}
      if(e.target.matches('[data-add-amount]')){selected=null;return;}
      const btn=e.target.closest('[data-baction]');if(btn){e.preventDefault();act(btn.dataset.baction,btn.dataset.side);return;}
      const target=e.target.closest('[data-btoken],[data-bdrop]');const data=source(e.target);
      if(data?.type==='tool'&&data.op==='divide'){e.preventDefault();drop(data,root.querySelector('[data-bdrop="center"]'));return;}
      if(data?.type==='token'&&(!selected||selected.type==='token')&&pickToken(data,e.target.closest('[data-btoken]')))return;
      if(selected?.type==='token'&&target&&!data&&(picks.left.length||picks.right.length)&&!work){clearPicks();selected=null;show(guide(board));refreshPicks();return;}
      if(selected&&target&&!(data?.type==='token'&&selected.type==='token'&&data.id===selected.id)){drop(selected,target);selected=null;return;}
      if(data){selected=data;root.querySelectorAll('.selected-block').forEach(n=>n.classList.remove('selected-block'));e.target.closest('button').classList.add('selected-block');show(data.type==='tool'?(data.op==='expand'?'已选“拆盒”，现在点击紫色的括号盒子。':data.op==='split'?'已选切分工具，现在点击要分开的那一块。':data.op==='multiply'?'已选倍乘工具，现在点击一个盘，再在另一盘做同样的操作。':'已选添加方块，现在点击左盘或右盘。'):data.type==='piece'?'已选展开项，现在点击对应的“x项”或“常数项”空位。':'已选这块。要合并，点同盘同类块；要抵消，点同盘等量异号块。');tokenActions(data);}
    });
    root.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[data-add-amount]')){e.preventDefault();e.stopPropagation();selected=null;amountField(e.target);return;}if(e.key==='Escape'){selected=null;act('cancel');}else if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-bdrop]')&&selected){e.preventDefault();drop(selected,e.target);selected=null;}});
  }
  function source(node){const t=node.closest('[data-btoken]');if(t)return {type:'token',id:t.dataset.btoken,side:t.dataset.side};const tool=node.closest('[data-btool]');if(tool){const field=tool.closest('[data-amount-editor]')?.querySelector('[data-add-amount]');if(field&&!amountField(field)){selected=null;return null;}return {type:'tool',op:tool.dataset.btool,value:tool.dataset.value,kind:tool.dataset.kind};}const piece=node.closest('[data-piece-kind]');if(piece)return {type:'piece',kind:piece.dataset.pieceKind,value:piece.dataset.pieceValue};return null;}
  function syncPicks(){if(!board||work){clearPicks();return;}for(const side of ['left','right'])picks[side]=picks[side].filter(id=>board[side].some(t=>t.id===id));if(board.pending?.kind==='remove'&&!picks[board.pending.side].includes(board.pending.id))picks[board.pending.side].push(board.pending.id);}
  const pickedItems=side=>picks[side].map(id=>board[side].find(t=>t.id===id)).filter(Boolean);
  function pickBar(){const l=pickedItems('left'),r=pickedItems('right');if(!l.length&&!r.length)return '<div class="pick-bar" id="pick-bar" hidden></div>';
    const names=items=>items.map(t=>esc(pretty(B.label(t)))).join('、'),count=(name,items)=>'<span class="pick-count">'+name+'选了 <b>'+items.length+'</b> 块：'+names(items)+'</span>';
    let body;
    if(l.length&&r.length){const base=board.pending?.kind==='remove'?B.abandon(board):board,p=B.removePreview(base,picks.left,picks.right);
      body=count('左边',l)+'<span class="pick-dot">·</span>'+count('右边',r)+'<button type="button" class="pick-primary" data-baction="pick-remove" '+(p.ok?'':'disabled aria-describedby="pick-reason"')+'>'+esc(pretty(p.ok?p.text:'两边一起拿走'))+'</button>'+(p.ok?'<small class="pick-note">'+esc(pretty(p.note||'两边拿走一样多，等式仍成立'))+'</small>':'<small class="pick-note pick-reason" id="pick-reason">'+esc(pretty(p.text))+'</small>');}
    else{const side=l.length?'左边':'右边',other=l.length?'右边':'左边',items=l.length?l:r,single=items.length===1?items[0]:null;
      body=count(side,items)+'<small class="pick-note">再点'+other+'要一起拿走的块'+(single&&single.kind!=='group'?'；点同一边的同类块是合并':'')+'。</small>'+(single?(single.kind==='group'?'<button type="button" data-baction="token-expand">拆开这个盒子</button>':'<button type="button" data-baction="token-split">把这块切成两份</button>'):'');}
    return '<div class="pick-bar" id="pick-bar" role="group" aria-label="两边一起拿走">'+body+'<button type="button" class="pick-clear" data-baction="pick-clear">取消选择</button></div>';
  }
  function refreshPicks(){const root=document.getElementById('balance-lab');if(!root)return;root.querySelectorAll('[data-btoken]').forEach(n=>n.classList.toggle('picked-block',!!picks[n.dataset.side]?.includes(n.dataset.btoken)));root.querySelectorAll('.selected-block').forEach(n=>n.classList.remove('selected-block'));const bar=document.getElementById('pick-bar');if(bar){const tmp=document.createElement('div');tmp.innerHTML=pickBar();bar.replaceWith(tmp.firstElementChild);}}
  /** 点选方块：先点一边，再点另一边即进入“两边一起拿走”；同一边只选了一块时，再点同类块仍是合并/抵消。返回 true 表示已处理。 */
  function pickToken(data,node){if(work||document.getElementById('balance-lab')?.dataset.resultOnly||!['left','right'].includes(data.side))return false;
    const item=board[data.side]?.find(t=>t.id===data.id);if(!item)return false;const otherSide=data.side==='left'?'right':'left',mine=picks[data.side],other=picks[otherSide];
    if(mine.includes(data.id)){picks[data.side]=mine.filter(id=>id!==data.id);selected=null;if(board.pending?.kind==='remove'&&board.pending.id===data.id){commit(B.abandon(board));return true;}show(guide(board));refreshPicks();return true;}
    if(!mine.length&&!other.length){picks[data.side]=[data.id];selected=data;show(item.kind==='group'?'已选这个盒子。可以拆开它，也可以再点另一边的块一起拿走。':'已选这块。再点另一边的块，就能两边一起拿走；点同一边的同类块是合并，点等量异号块是抵消。');refreshPicks();return true;}
    if(!other.length&&mine.length===1&&item.kind!=='group'){const first=board[data.side].find(t=>t.id===mine[0]);if(first&&first.kind===item.kind&&!(board.pending?.kind==='remove'&&board.pending.id===first.id)){clearPicks();selected=null;drop({type:'token',id:first.id,side:data.side},node);return true;}}
    picks[data.side]=[...mine,data.id];selected=null;show(other.length?'两边都选好了，确认后按下面的按钮一起拿走。':'可以继续选；再点'+(otherSide==='left'?'左':'右')+'边要一起拿走的块。');refreshPicks();return true;
  }
  function show(text){message=text;const node=document.getElementById('balance-message');if(node){node.textContent=text;const r=node.getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)node.scrollIntoView({block:'nearest',behavior:'instant'});}}
  function tokenActions(data){if(data?.type==='token'&&!work&&document.getElementById('balance-lab')?.dataset.resultOnly)show('已选 '+B.label(board[data.side].find(t=>t.id===data.id))+'，再点同盘同类块即可合并；也可直接拖叠。');}
  function redraw(){host.redraw(work);}
  async function flipPhase(opening){
    const root=document.getElementById('balance-lab');if(!root)return;root.classList.add('is-animating','is-flipping');const badges=[],animations=[];
    try{for(const pan of root.querySelectorAll('[data-pan]')){const badge=document.createElement('span');badge.className='pan-operation';badge.textContent='×(−1)';badge.setAttribute('aria-hidden','true');pan.append(badge);badges.push(badge);const blocks=pan.querySelectorAll('.balance-block'),nodes=blocks.length?blocks:[pan.querySelector('.pan-label')];for(const node of nodes)if(node)animations.push(node.animate(opening?[{transform:'perspective(500px) rotateY(-90deg)',opacity:.3},{transform:'perspective(500px) rotateY(0)',opacity:1}]:[{transform:'perspective(500px) rotateY(0)',opacity:1},{transform:'perspective(500px) rotateY(90deg)',opacity:.3}],{duration:opening?380:280,easing:'ease-in-out',fill:'forwards'}));}await Promise.all(animations.map(a=>a.finished));}finally{animations.forEach(a=>a.cancel());badges.forEach(n=>n.remove());root.classList.remove('is-flipping');}
  }
  async function commit(next,origin=null,target=null,effect=''){if(busy)return;busy=true;host.busy(true);document.getElementById('balance-lab')?.classList.add('is-animating');
    try{
      const flip=effect==='flip'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;if(flip)await flipPhase(false);
      if(origin&&target&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const a=origin.getBoundingClientRect(),z=target.getBoundingClientRect(),ghost=origin.cloneNode(true);ghost.removeAttribute('id');ghost.className='balance-flight';Object.assign(ghost.style,{position:'fixed',left:a.left+'px',top:a.top+'px',width:a.width+'px',height:a.height+'px',pointerEvents:'none',zIndex:9999});document.body.append(ghost);try{await ghost.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+(z.left-a.left)+'px,'+(z.top-a.top)+'px) scale(.6)',opacity:0.1}],{duration:300,easing:'cubic-bezier(.2,.7,.2,1)'}).finished;}finally{ghost.remove();}}
      message=effect==='flip'||effect==='remove'?next.last:'';selected=null;clearPicks();const oldTilt=B.operationView(board).tilt,newTilt=B.operationView(next).tilt;host.commit(next,work,effect);if(flip)await flipPhase(true);document.querySelector('.balance-result')?.scrollIntoView({block:'nearest',behavior:'instant'});if(oldTilt!==newTilt&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const root=document.getElementById('balance-lab'),anims=[];root?.classList.add('is-animating');for(const side of ['left','right']){const direction=side==='left'?-1:1,n=root?.querySelector('[data-pan="'+side+'"]');if(n)anims.push(n.animate([{transform:'translateY('+oldTilt*direction*12+'px)'},{transform:'translateY('+newTilt*direction*12+'px)'}],{duration:240,easing:'ease-out'}).finished);}const beam=root?.querySelector('.scale-beam');if(beam)anims.push(beam.animate([{transform:'rotate('+oldTilt*3+'deg)'},{transform:'rotate('+newTilt*3+'deg)'}],{duration:240,easing:'ease-out'}).finished);await Promise.all(anims);}
    }catch(error){show(error.message||'操作未完成，请重新尝试。');}finally{busy=false;host.busy(false);document.getElementById('balance-lab')?.classList.remove('is-animating');}
  }
  function drop(data,target){if(busy||!data||!['tool','token','piece'].includes(data.type))return;
    try{
      if(document.getElementById('balance-lab')?.dataset.resultOnly&&(data.type!=='token'||!target.dataset.btoken))throw Error('结果盘可合并同类块，或点击左右对调；请继续完成原式检验。');
      if(data.type==='token'&&work?.type==='divide'&&target.dataset.btoken){if(data.side!==target.dataset.side)throw Error('不能跨盘合并。');const p=B.mergeInWork(board,work,data.side,data.id,target.dataset.btoken),origin=document.querySelector('[data-btoken="'+CSS.escape(data.id)+'"]');work=p.work;commit(p.board,origin,target);return;}
      if(data.type==='token'&&work?.type==='divide')target=target.closest('[data-bdrop="bucket"],[data-bdrop="pan"]')||target;
      if(data.type==='tool'&&['add','multiply'].includes(data.op))target=target.closest('[data-bdrop="pan"]')||target;
      const type=target.dataset.bdrop,side=target.dataset.side,t=target.dataset.btoken;
      if(data.type==='piece'){if(work?.type!=='expand'||type!=='expand-slot')throw Error('把展开项放入拆盒实验的对应位置。');const slot=Number(target.dataset.slot);if((slot===0?'x':'one')!==data.kind)throw Error('x项和常数项不能混放。');E.rat(data.value);work.answers[slot]=data.value;message='继续检查另一项，特别是负号。';redraw();return;}
      if(data.type==='tool'){
        if(data.op==='divide'){if(board.pending)throw Error('先完成或取消双边配对。');if([...board.left,...board.right].some(t=>t.kind==='group'))throw Error('先拆开括号盒子，再把里面的块平均分组。');if(type!=='center'&&!['left','right'].includes(side))throw Error('分组工具可放到任意一边的盘或方块上，也可直接点按钮。');const n=Number(data.value);if(!Number.isInteger(n)||n<2||n>8)throw Error('等分2到8组。');if(work&&work.type!=='divide')throw Error('先完成或收起拆盒实验。');const p=B.partitionBoth(board,n);work=p.work;message='';selected=null;commit(p.board).then(revealWork);return;}
        if(data.op==='expand'){if(!t)throw Error('把拆盒工具拖到一个整体盒子上。');const item=board[side]?.find(x=>x.id===t);if(item?.kind!=='group')throw Error('这个方块已经展开，无需拆盒。');if(board.pending)throw Error('先完成双边配对。');work={type:'expand',side,id:t,answers:[]};message='负号和倍数要作用于每一项。';redraw();return;}
        if(data.op==='split'){if(!t)throw Error('把切分工具拖到要切开的单块上。');const n=B.split(board,side,t,Number(data.value));if(work?.assign)delete work.assign[t];commit(n,target,document.querySelector('[data-pan="'+side+'"]'));return;}
        if(type!=='pan')throw Error('把添加或倍乘工具拖入一个盘中，再到另一盘完成相同操作。');
        if(work)throw Error('请先完成当前拆盒或分组，或收起实验。');
        const next=data.op==='add'?B.add(board,side,data.kind,data.value):data.op==='multiply'?B.multiply(board,side,data.value):null;
        if(next)commit(next,document.querySelector('[data-btool="'+data.op+'"][data-value="'+CSS.escape(data.value)+'"]'),target);return;
      }
      const origin=document.querySelector('[data-btoken="'+CSS.escape(data.id)+'"]');
      if(!['left','right'].includes(data.side)||!board[data.side].some(t=>t.id===data.id))throw Error('请拖动当前盘中的方块。');
      if(type==='bucket'){if(work?.type!=='divide'||data.side!==side)throw Error('只能把块分到它原来所在盘的组中。');work.assign[data.id]=Number(target.dataset.bin);message='继续分配，每组的种类和份数都要相同。';redraw();return;}
      if(type==='pan'&&work?.type==='divide'){if(data.side!==side)throw Error('不能跨盘随意移动方块。');delete work.assign[data.id];redraw();return;}
      if(work)throw Error('请完成或收起当前实验后，再操作盘中零对或移除。');
      if(t){if(side!==data.side)throw Error('只能在同一盘内合并或抵消。要两边一起拿走：分别点选左右两边的块，再按“两边一起拿走”。');const a=board[side].find(x=>x.id===data.id),c=board[side].find(x=>x.id===t);if(a.kind==='group'||c.kind==='group'||a.kind!==c.kind)throw Error('只能合并同类方块：x与x、数字与数字；括号要先拆开。');commit(B.merge(board,side,data.id,t),origin,target);return;}
      throw Error('同类块拖到一起可合并，等量异号块可抵消。要两边一起拿走：分别点选左右两边的块。');
    }catch(e){show(e.message);document.getElementById('balance-message')?.animate([{transform:'translateX(0)'},{transform:'translateX(3px)'},{transform:'translateX(0)'}],{duration:200});}
  }
  function act(action,side){if(busy)return;try{
    if(action==='swap'){clearPicks();const next=B.swap(board),nextWork=work?.type==='expand'?{...work,side:work.side==='left'?'right':'left'}:work;work=B.restoreWork(nextWork,next);selected=null;commit(next);return;}
    if(document.getElementById('balance-lab')?.dataset.resultOnly&&action!=='cancel')throw Error('结果盘只保留合并与左右对调。');
    if(action==='flip-both'){if(work?.type==='expand')throw Error('先完成或收起拆盒实验，再让两边同时乘以−1。');const next=B.flipBoth(board);work=B.restoreWork(work,next);selected=null;commit(next,null,null,'flip');return;}
    if(action==='pick-clear'){clearPicks();selected=null;if(board.pending?.kind==='remove'){commit(B.abandon(board));return;}show(guide(board));refreshPicks();return;}
    if(action==='pick-remove'){const base=board.pending?.kind==='remove'?B.abandon(board):board,next=B.removeBoth(base,picks.left,picks.right);selected=null;commit(next,null,null,'remove');return;}
    if(action.startsWith('token-')){const side=picks.left.length?'left':'right',id=picks[side].length===1&&!picks[side==='left'?'right':'left'].length?picks[side][0]:null;if(!id)throw Error('先点选一个方块。');const target=document.querySelector('[data-btoken="'+CSS.escape(id)+'"]');clearPicks();selected=null;if(action==='token-expand')drop({type:'tool',op:'expand'},target);else if(action==='token-split')drop({type:'tool',op:'split',value:'2'},target);return;}
    if(action==='cancel'){work=null;selected=null;message='';clearPicks();if(board.pending)commit(B.abandon(board));else redraw();return;}
    if(action==='expand-confirm'){if(work?.type!=='expand')return;const n=B.expand(board,work.side,work.id,work.answers);work=null;commit(n);return;}
    if(action==='take-group'){if(work?.type!=='divide')return;const n=B.divide(board,work.n,work.assign);work=null;commit(n);return;}
    if(action==='custom-multiplier'){const n=Number(document.getElementById('custom-multiplier').value);if(!Number.isInteger(n)||!n||n===1||Math.abs(n)>12)throw Error('请输入−12到12的非零整数，且不为1。');document.getElementById('custom-tool-result').innerHTML=tool('multiply',String(n),'×('+n+')');return;}
  }catch(e){show(e.message);}}
  function reset(){work=null;selected=null;message='';clearPicks();}
  function result(b,q=null){if(!b||!B.finishable(b))return '';if(q){board=b;work=null;if(currentId!==q.id){currentId=q.id;selected=null;message='';}}const block=(t,side)=>q?token(t,side):'<span class="balance-block '+(t.kind==='x'?'x-block':'one-block')+(t.value?.startsWith('-')?' negative-block':'')+(t.merged?' merged-block':'')+'" data-result-kind="'+t.kind+'" data-value="'+esc(t.value)+'">'+esc(pretty(B.label(t)))+'</span>';
    return '<section class="balance-result" '+(q?'id="balance-lab" data-result-only="true"':'')+' aria-label="保留的天平求解结果"><div class="balance-result-caption">求解结果 · '+esc(pretty(B.displayEquation(b)))+'<small>这是刚才操作后的盘面；下面仍要检验原方程。</small></div>'+(q?'<div class="result-actions">'+swapButton(b)+'</div>':'')+'<div class="balance-scene">'+metalFrame(0,'result')+'<div class="balance-pans">'+['left','right'].map(side=>'<section class="balance-pan" data-result-pan="'+side+'" '+(q?'data-pan="'+side+'" data-bdrop="pan" data-side="'+side+'"':'')+'><div class="pan-label">'+(side==='left'?'左盘':'右盘')+'</div><div class="pan-blocks">'+(b[side].map(t=>block(t,side)).join('')||'<span class="empty-pan">0 · 空盘</span>')+'</div><div class="metal-pan-rim" aria-hidden="true"></div></section>').join('')+'</div></div>'+(q?'<div class="balance-message" id="balance-message" aria-live="polite">'+esc(message||'仍可把同盘同类块拖到一起合并，也可左右对调；代回原方程检验后才算完成。')+'</div>':'')+'</section>';
  }
  globalThis.BalanceView=Object.freeze({draw,mount,result,reset,isBusy:()=>busy,hasWork:()=>!!work});
})();
