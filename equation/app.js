(() => {
  'use strict';
  const E=globalThis.EquationMath,D=globalThis.EquationContent,$=id=>document.getElementById(id),KEY='equation-laboratory-v1';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pretty=s=>String(s).replace(/-/g,'−').replace(/\*/g,'×');
  const find=id=>D.items.find(q=>q.id===id);
  const Store=globalThis.EquationStore,empty=Store.empty;
  let db={version:1,current:'home',states:{}},storageWarning='',storageLocked=false,justStepped=false;
  try { const raw=localStorage.getItem(KEY);if(raw)db=Store.decode(raw); }
  catch{storageLocked=true;storageWarning='旧记录无法读取，原始存档已保留且不会覆盖。本次可练习但不保存；可在概览明确清除后重新保存。';}
  const qnow=()=>find(db.current),snow=()=>db.states[db.current]||(db.states[db.current]=empty());
  function save(){
    if(!storageLocked)try{const encoded=Store.encode(db);localStorage.setItem(KEY,encoded.text);storageWarning='';$('save-status').classList.remove('save-warning');$('save-status').textContent=encoded.trimmed?'进度已保存；记录较大，刷新后不保留撤销':'已保存在本机 · 刷新保留最近5步撤销';}catch(error){storageWarning='本次未覆盖旧存档：'+error.message+' 仍可继续练习。';}
    if(storageWarning){$('save-status').textContent=storageWarning;$('save-status').classList.add('save-warning');}
  }
  const draft=(name,fallback='')=>snow().drafts[name]??fallback;
  function input(name,label,fallback='',type='text',extra=''){return '<div class="field"><label for="f-'+name+'">'+esc(label)+'</label><input id="f-'+name+'" name="'+name+'" type="'+type+'" value="'+esc(draft(name,fallback))+'" maxlength="256" autocomplete="off" spellcheck="false" '+extra+'></div>';}
  function select(name,label,options){const v=draft(name);return '<div class="field"><label for="f-'+name+'">'+esc(label)+'</label><select id="f-'+name+'" name="'+name+'"><option value="">请选择</option>'+options.map(o=>{const [value,text]=Array.isArray(o)?o:[o,o];return '<option value="'+esc(value)+'"'+(v===String(value)?' selected':'')+'>'+esc(text)+'</option>';}).join('')+'</select></div>';}
  const button=(action,text,css='primary')=>'<button type="button" class="'+css+'" data-action="'+action+'">'+esc(text)+'</button>';
  const form=(action,body,label)=>'<form data-submit="'+action+'">'+body+'<div class="form-actions"><button class="primary" type="submit" data-action="'+action+'">'+esc(label)+'</button></div></form>';
  function ordered(list){const shift=[...db.current].reduce((n,c)=>n+c.charCodeAt(0),0)%list.length;return list.slice(shift).concat(list.slice(0,shift));}
  function checkpoint(){const s=snow(),copy=structuredClone({...s,undo:[]});s.undo.push(copy);if(s.undo.length>40)s.undo.shift();}
  function mark(message){snow().done=true;snow().feedback={kind:'success',message};}
  function reject(message){throw Error(message);}
  function feedback(message,kind='error'){snow().feedback={message,kind};save();render();$('feedback')?.scrollIntoView({block:'nearest',behavior:'instant'});}
  function need(condition,message){if(!condition)reject(message);}
  const exact=(a,b)=>{try{return E.eq(E.rat(a),E.rat(b));}catch{return false;}};
  const sameExpression=(a,b)=>{try{const p=E.parse(a),q=E.parse(b);return E.eq(p.a,q.a)&&E.eq(p.b,q.b);}catch{return false;}};
  function navigate(id){BalanceView.reset();db.current=find(id)?id:'home';save();render();window.scrollTo({top:0,behavior:'instant'});$('workspace').focus({preventScroll:true});}
  function renderNav(){
    $('lesson-nav').innerHTML=D.zones.map(z=>'<section class="zone-nav"><button class="zone-toggle" data-zone="'+z.id+'"><span class="zone-letter">'+z.id+'</span><span class="zone-text">'+esc(z.name)+'<small>'+esc(z.chapter)+'</small></span></button><div class="zone-list">'+D.items.filter(q=>q.zone===z.id).map(q=>{const s=db.states[q.id];return '<button data-go="'+q.id+'" class="lesson-link '+(s?.done?(s.hints?'assisted':'done'):'')+'" '+(db.current===q.id?'aria-current="page"':'')+'><i class="status-dot"></i><span>'+esc(q.title)+'</span></button>';}).join('')+'</div></section>').join('');
    $('total-done').textContent=Object.values(db.states).filter(s=>s.done).length+' / '+D.items.length;
  }
  function renderHome(){const all=Object.values(db.states),ind=all.filter(s=>s.done&&!s.hints).length,ass=all.filter(s=>s.done&&s.hints).length;
    $('workspace').innerHTML='<p class="eyebrow">THE EQUATION LAB · CHAPTER 05</p><section class="hero"><div><h1>让相等，带你找到未知数。</h1><p>不是把答案搬到等号另一边。先理解每一个动作，保持两边相等，再把答案送回原题检验。</p></div><div class="hero-symbol" aria-hidden="true">x＝?</div></section><section class="try-balance"><div><b>新体验 · 亲手操作方块天平</b><p>拖走相同的块，把剩下的块平均分组。每一步由你完成。</p></div><button class="primary" data-go="b-move-guided">开始天平实验 →</button></section><div class="stat-row"><div class="stat"><b>'+ind+'</b>无提示完成</div><div class="stat"><b>'+ass+'</b>借助提示完成</div><div class="stat"><b>'+D.items.length+'</b>探索与练习</div></div><section class="map-grid">'+D.zones.map(z=>{const items=D.items.filter(q=>q.zone===z.id),done=items.filter(q=>db.states[q.id]?.done).length;return '<button class="map-card" data-go="'+items[0].id+'"><span class="map-letter">'+z.id+'</span><h2>'+esc(z.name)+'</h2><span class="small">'+esc(z.chapter)+'</span><p>'+esc(z.intro)+'</p><footer>'+done+' / '+items.length+' 已完成 · 进入学习 →</footer><div class="progress-track"><span style="width:'+done/items.length*100+'%"></span></div></button>';}).join('')+'</section><div class="note"><b>建议的学习节奏</b><br>先探索一题，再独立完成变式。遇到困难可以看提示，但别用“看懂了”代替纸笔独立完成。章节地图可自由进入，不强制反复刷已会的题。<br><br>'+esc(D.source)+'<table class="coverage-table"><thead><tr><th>能力</th><th>无提示</th><th>借助提示</th><th>下一步</th></tr></thead><tbody>'+D.zones.map(z=>{const ls=D.items.filter(q=>q.zone===z.id),a=ls.filter(q=>db.states[q.id]?.done&&!db.states[q.id].hints).length,b=ls.filter(q=>db.states[q.id]?.done&&db.states[q.id].hints).length;return '<tr><td>'+esc(z.chapter)+'</td><td>'+a+'</td><td>'+b+'</td><td>隔几天用新题或白纸再检查</td></tr>';}).join('')+'</tbody></table><p>'+esc(D.platform)+' 核心内容内置，不需要登录。</p>'+button('clear','删除本机学习记录','quiet danger')+'</div>';
  }
  function support(q,s){return '<aside class="support"><details><summary>先读一点：本题用到的知识</summary><p>'+esc(q.learn)+'</p></details><h3>我的推理记录</h3><ol id="history">'+s.history.map((h,i)=>'<li><span>'+esc(h.reason)+'</span><b>'+esc(pretty(h.boardNotation?BalanceMath.notationEquation(h.boardNotation):h.equation))+'</b></li>').join('')+s.notes.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ol>'+(!s.history.length&&!s.notes.length?'<p>确认操作后，记录会留在这里。允许不同的正确路线。</p>':'')+button('hint','需要提示 · '+s.hints+'/3','hint-button')+'<div id="hint-content" '+(!s.hints?'hidden':'')+' class="hint-box">'+q.hints.slice(0,s.hints).map((h,i)=>'<p>H'+(i+1)+' · '+esc(h)+'</p>').join('')+'</div><p>本题记录：'+(s.done?(s.hints?'借助提示完成':'无提示完成'):'尚未完成')+'。没有计时或速度排名。</p></aside>';}
  function verifyForm(q){const word=q.type==='word';return '<hr class="splitter"><h2 class="panel-title">最后一步 · 代回原方程</h2><p class="muted math">原方程：'+esc(pretty(q.equation))+'</p>'+form('verify','<div class="verify-grid">'+input('value','我求出的 x')+input('leftValue','代入原方程：左边的值')+input('rightValue','代入原方程：右边的值')+'</div>'+(word?select('reality','实际意义检验',[['valid','符合实际条件，可以作答'],['invalid','虽有方程解，但不符合实际条件']]):''),'检验并完成');}
  function terms(raw,side,canMove){const p=E.parse(raw),canonical=E.format(p);if(raw.replace(/\s/g,'')!==canonical.replace(/\s/g,''))return '<span class="group-expression">'+esc(pretty(raw))+'</span>';
    const values=[];if(p.a.n)values.push(E.format({a:p.a,b:E.rat(0)}));if(p.b.n||!values.length)values.push(E.str(p.b));
    return values.map(t=>'<button type="button" class="term '+(t[0]==='-'?'negative':'')+'" '+(canMove?'draggable="true" data-term="'+esc(t)+'" data-side="'+side+'" title="拖到另一边或点击，预览移项依据"':'disabled')+'>'+esc(pretty(t))+'</button>').join('');
  }
  function solver(q,s){if(!s.history.length)s.history=[{equation:q.equation,reason:'原方程'}];const current=s.history.at(-1).equation,e=E.equation(current),canMove=s.history.filter(h=>h.kind==='add'||h.kind==='sub').length>=2;
    const independent=q.mode==='independent',isolated=E.isIsolated(current)&&(!s.balance||BalanceMath.finishable(s.balance)),board=independent?'':balanceBoard(q,s),shown=board?BalanceMath.sceneEquation(s.balance):current;return '<h2 class="panel-title">'+(independent?'独立书写台':'拖动方块，保持两边相等')+'</h2>'+(board?'':'<div class="equation-main" id="current-equation">'+esc(pretty(shown))+'</div>')+(independent?'':board+'<details class="written-mode" '+(s.written?'open':'')+'><summary>切换到书写辅助 · 自选操作，写下一行</summary><div class="equation-board"><div class="equation-side" data-label="左边" data-drop-side="left">'+terms(e.raw[0],'left',canMove)+'</div><div class="eq-sign">＝</div><div class="equation-side" data-label="右边" data-drop-side="right">'+terms(e.raw[1],'right',canMove)+'</div></div><p class="muted">带符号卡片表示代数量，不是物体重量。'+(canMove?'移项已开放：点击整项或拖到另一边，先看“两边同减”的依据，再自己写下一行。':'先完成两次同步加减，再开放拖动移项。也可始终使用下面的操作。')+'</p>')+
      '<div class="op-row">'+select('op','两边同时做什么',[['add','加上同一个式子'],['sub','减去同一个式子'],['mul','乘以同一个非零数'],['div','除以同一个非零数'],['simplify','各自去括号 / 合并同类项']])+input('arg','操作的数或式子（整理时可空）')+button('preview','预览操作','quiet')+'</div><div id="operation-preview" class="preview" '+(!s.preview?'hidden':'')+'>'+esc(pretty(s.preview||''))+'</div>'+form('step','<div class="next-line">'+input('nextEquation','我算出的下一行方程（例如 2x+2=10）')+'</div>','确认这一步')+'<p class="muted">可用分数，如 -2/3；输入乘法用 * 或省略为2x。每一步必须与所选操作一致。</p>'+(independent?'':'</details>')+(isolated?'<p class="feedback success">未知数已经单独留下。还需代回原式检验，才算完成。</p>':'')+verifyForm(q);
  }
  function balanceBoard(q,s){const source=s.history.at(-1)?.equation||q.equation||'x+3=7';if(!s.history.length)s.history=[{equation:source,reason:'天平实验原式'}];if(!s.balance)s.balance=BalanceMath.create(source);return (q.type==='word'?'<p class="muted">方块适合探索相等关系；本版分组工具限2—8组。若大数或小数系数不便拆分，请展开下方“书写辅助”继续，步骤同样会核验。</p>':'')+BalanceView.draw(q,s.balance,s.balanceWork);}
  function mountBalance(){if(!$('balance-lab'))return;BalanceView.mount({redraw:work=>{snow().balanceWork=BalanceMath.restoreWork(work,snow().balance);render();},busy:locked=>{$('workspace').setAttribute('aria-busy',String(locked));},commit:(next,work,effect)=>{const s=snow(),previous=s.balance,kind=previous?.pending?.kind||(effect==='remove'?'remove':''),changed=JSON.stringify([previous.left,previous.right])!==JSON.stringify([next.left,next.right]),equation=next.pending?s.history.at(-1).equation:BalanceMath.equation(next),safe=BalanceMath.restore(next,equation),safeWork=BalanceMath.restoreWork(work,safe);checkpoint();s.balance=safe;s.balanceWork=safeWork;s.written=false;s.done=false;s.feedback=null;s.preview='';if(!next.pending&&changed){s.history.push({equation,boardNotation:BalanceMath.notation(safe),reason:next.last,kind:({add:'add',remove:'sub',multiply:'mul'}[kind]||'simplify')});s.history=s.history.slice(-60);}save();render();}});}
  function wordModel(q,s){if(s.modelBuilt)return '<p class="muted">已设 x 为'+esc(q.definition)+'。数量关系已核验，可继续解方程。'+button('edit-model','返回数量关系','quiet small')+'</p>'+solver(q,s);
    const body=select('definition','① 设 x 表示什么？',ordered([q.definition,'题目中所有数量都等于x','把已知常数重新命名为x']))+'<h2 class="panel-title">② 用 x 表示其他数量</h2><table class="model-table"><thead><tr><th>数量</th><th>我的表达式</th><th>单位</th></tr></thead><tbody>'+q.fields.map((f,i)=>'<tr><td>'+esc(f.label)+'</td><td><input aria-label="'+esc(f.label)+'" name="quantity'+i+'" value="'+esc(draft('quantity'+i))+'" maxlength="256" autocomplete="off"></td><td>'+esc(f.unit)+'</td></tr>').join('')+'</tbody></table>'+select('relation','③ 哪个相等关系连接这些量？',ordered([q.relation,'把所有已知数字直接相加就是x','两种数量的数值必须都等于x']))+input('modelEquation','④ 我列出的方程');
    return form('model-build',body,'核对模型，进入解方程');
  }
  function choiceView(q){let extra='';if(q.type==='balance')extra='<section class="experiment"><h3>先做一个数值实验：x=4，原式 x+3=7</h3><div class="inline-fields">'+select('experimentSide','操作范围',[['both','左右两边'],['left','只改左边']])+select('experimentOp','操作',[['add','加'],['sub','减'],['mul','乘'],['div','除']])+input('experimentArg','数字','3')+'</div>'+button('experiment','观察变化','quiet')+'<div class="experiment-output" id="experiment-output">'+esc(snow().experiment||'')+'</div><p class="muted">单个数值实验可以发现反例，不能替代一般的等式性质。</p></section>';
    if(q.type==='balance'){const s=snow(),board=balanceBoard(q,s);extra='<p class="muted">先用 x+3=7 的方块实验练习两边配对操作，再判断题干中的说法。单侧动作暂存，不改变正式等式。</p>'+board+'<details class="number-experiment"><summary>展开数值反例实验 · 观察只改一侧或乘0</summary>'+extra+'</details>';}
    if(q.id==='d-plan-compare')extra='<section class="experiment"><h3>改变时长，对比两种总费用</h3><div class="inline-fields">'+input('compareHours','使用时间（非负小时）','2')+button('compare-plans','比较这次费用','quiet')+'</div><div class="experiment-output" id="plan-output">'+esc(snow().comparison||'分别算出A和B，不只比较每小时单价。')+'</div></section>';
    if(q.type==='model'&&q.id==='e-flow')extra='<div class="flow"><span>实际问题</span><i>→</i><span>数量关系</span><i>→</i><span>解方程</span><i>→</i><span>回到现实</span></div>';
    return extra+form('choice',select('choice','我的判断',ordered(q.options))+(q.reasonOptions?select('reason','判断依据',ordered(q.reasonOptions)):''),'确认判断');
  }
  function substitute(q,s){return '<div class="equation-main">'+esc(pretty(q.equation))+'</div><section class="experiment"><div class="inline-fields">'+input('guess','先试一个 x 值')+button('try','观察两边','quiet')+'</div><div class="experiment-output">'+esc(s.trial||'左右两边使用同一个x。')+'</div></section>'+verifyForm(q);}
  function digits(q,power){let sequence=q.whole+q.pre+q.repeat.repeat(10),cut=q.whole.length+power;const before=sequence.slice(0,cut).replace(/^0+(?=\d)/,'')||'0',after=sequence.slice(cut,cut+12);return esc(before)+'.<span class="tail">'+esc(after)+'…</span>';}
  function decimal(q,s){const multiplier=[['1','1倍（原数）'],['10','10倍'],['100','100倍'],['1000','1000倍']];const high=Number(draft('high','1')),low=Number(draft('low','1'));
    return '<div class="decimal-card"><span class="muted">设这个数为 x</span><div class="recurring">x = '+esc(q.whole+'.'+q.pre)+'<span class="overline">'+esc(q.repeat)+'</span></div><span class="muted">横线部分无限循环</span></div><div class="inline-fields">'+select('high','上行倍率',multiplier)+select('low','下行倍率',multiplier)+'</div>'+button('align','移动小数点，观察尾部','quiet')+(s.alignment?'<div class="aligned-lines"><div class="digits">'+high+'x = '+digits(q,Math.log10(high))+'</div><div class="digits">'+low+'x = '+digits(q,Math.log10(low))+'</div><p class="muted">'+esc(s.alignment)+'</p></div>':'')+form('decimal','<hr class="splitter"><h2 class="panel-title">相减：左边系数和右边整数各是多少？</h2><div class="inline-fields">'+input('coefficient','相减后 x 的系数')+input('difference','相减后的整数差')+'</div>'+input('fraction','x = 最简分数'),'核验相减与分数');}
  function tariff(q,s){return '<div class="tier-chart"><div class="tier">前10单位<b>2元 / 单位</b></div><div class="tier">超过10至20的部分<b>3元 / 单位</b></div><div class="tier">超过20的部分<b>5元 / 单位</b></div></div><section class="experiment"><label for="usage-slider">先拖动观察用量与费用</label><input id="usage-slider" type="range" name="exploreUsage" min="0" max="30" step="1" value="'+esc(draft('exploreUsage','0'))+'" style="width:100%"><div class="water-output" id="water-output"></div><p class="muted">只显示探索数值，不替你填写方程。单位与价格均为教学示例。</p></section>'+form('tariff',select('segment','这笔账单属于哪一档？',[['1','0到10单位（含10）'],['2','超过10，到20单位（含20）'],['3','超过20单位']])+input('billEquation','设用量为x，我列的分段方程')+input('usage','解得用量 x ='),'核验方程与区间');}
  function lever(q,s){const raw=Number(draft('distance','2')),distance=Number.isInteger(raw)&&raw>=1&&raw<=8?raw:2,sign=E.lever(q.leftCount,q.leftDistance,q.rightCount,distance),angle=-sign*7;
    const lx=300-q.leftDistance*30,rx=300+distance*30;
    return '<svg viewBox="0 0 600 210" class="lever-svg" role="img" aria-label="木杆左右挂重物，平衡由数量乘距离决定"><path d="M280 178 L300 90 L320 178 Z" fill="#a8b99c"/><g class="lever-beam" style="transform:rotate('+angle+'deg)"><path d="M45 90 H555" stroke="#617b51" stroke-width="7" stroke-linecap="round"/>'+Array.from({length:17},(_,i)=>'<path d="M'+(60+i*30)+' 86 v9" stroke="#ecf0de"/>').join('')+'<path d="M'+lx+' 90 V130 M'+rx+' 90 V130" stroke="#859471" stroke-width="2"/><rect x="'+(lx-22)+'" y="130" width="44" height="35" rx="5" fill="#54744b"/><rect x="'+(rx-22)+'" y="130" width="44" height="35" rx="5" fill="#b8964f"/><text x="'+lx+'" y="154" text-anchor="middle" fill="white" font-size="19">'+q.leftCount+'</text><text x="'+rx+'" y="154" text-anchor="middle" fill="white" font-size="19">'+q.rightCount+'</text></g><text x="300" y="201" text-anchor="middle" font-size="12" fill="#6b7c5c">正的等重物体 · 中点支撑 · 理想模型</text></svg><div class="inline-fields">'+input('distance','实验：右侧距离（1—8格）','2','number','min="1" max="8" step="1"')+button('lever-record','移动并记录一次','quiet')+'</div><div class="observations">'+(s.observations.length?'<table class="model-table"><tbody>'+s.observations.map(x=>'<tr><td>'+esc(x)+'</td></tr>').join('')+'</tbody></table>':'先记录一次实际调整，再写方程。')+'</div>'+form('lever',input('leverEquation','设右侧距离为x，我列的平衡方程')+input('leverAnswer','由方程求得 x =（格）'),'核验平衡条件');}
  function originalQuestion(q){
    let formula='';
    if(['equation','substitute'].includes(q.type))formula=esc(pretty(q.equation));
    else if(q.type==='decimal')formula=esc(q.whole+'.'+q.pre)+'<span class="overline">'+esc(q.repeat)+'</span>…';
    return '<section id="original-question" class="original-question'+(formula?' has-formula':'')+'" data-question-id="'+esc(q.id)+'" aria-labelledby="original-question-label"><h2 id="original-question-label">原题</h2><div class="original-question-body">'+(formula?'<div class="original-equation">'+formula+'</div>':'')+'<p id="stem">'+esc(q.prompt)+'</p></div></section>';
  }
  function updateQuestionInset(){const height=$('original-question')?.getBoundingClientRect().height||0;document.documentElement.style.setProperty('--original-question-inset',height?Math.ceil(height)+12+'px':'0px');}
  const questionObserver=new ResizeObserver(updateQuestionInset);
  function render(){questionObserver.disconnect();renderNav();if(db.current==='home'){renderHome();updateQuestionInset();save();return;}const q=qnow(),s=snow();let body;
    if(s.balance)s.balance=BalanceMath.upgradeTerms(s.balance,!!s.balanceWork||[s.balance.last,...s.history.map(h=>h.reason)].some(text=>/切成|平均分|分成.*组/.test(text||'')));
    if((q.type==='equation'||q.type==='word'&&s.modelBuilt)&&!s.history.length)s.history=[{equation:q.equation,reason:'原方程'}];
    if(s.drafts.fullForm!=='yes')body=LessonView.draw(q,s,{balanceBoard});else if(['concept','balance','model'].includes(q.type))body=choiceView(q);else if(q.type==='substitute')body=substitute(q,s);else if(q.type==='equation')body=solver(q,s);else if(q.type==='word')body=wordModel(q,s);else if(q.type==='decimal')body=decimal(q,s);else if(q.type==='tariff')body=tariff(q,s);else if(q.type==='lever')body=lever(q,s);
    const mode={guided:'引导探索',transfer:'近迁移',independent:'独立书写'}[q.mode]||'互动探索',index=D.items.indexOf(q),next=D.items[index+1];
    $('workspace').innerHTML='<header class="lesson-header"><p class="eyebrow">'+esc(D.zones.find(z=>z.id===q.zone).chapter)+' / '+esc(q.section)+'</p><div class="lesson-top"><h1>'+esc(q.title)+'</h1><div class="lesson-actions">'+button('undo','撤销','quiet')+button('restart','重开本题','quiet')+'</div></div><div class="badges"><span class="badge">'+mode+'</span><span class="badge">第 '+(index+1)+' / '+D.items.length+' 个活动</span><span class="badge">'+(s.hints?'已使用提示':'可以独立尝试')+'</span></div></header>'+originalQuestion(q)+'<div class="lesson-grid"><section class="work-panel '+(justStepped?'just-stepped':'')+'">'+body+'<div id="feedback" aria-live="polite" class="feedback '+esc(s.feedback?.kind||'')+'" '+(!s.feedback?'hidden':'')+'>'+esc(s.feedback?.message||'')+'</div></section>'+support(q,s)+'</div><section id="completion" class="completion" '+(!s.done?'hidden':'')+'><span class="completion-mark">＝</span><div><h3>'+ (s.hints?'借助提示，完成本题':'本题已独立完成')+'</h3><p>下次换一道新题或白纸再检验，不用速度衡量理解。</p></div>'+(next?'<button class="primary" data-go="'+next.id+'">下一题 →</button>':button('home','查看学习记录'))+'</section><div class="next-map">'+(index?'<button class="quiet small" data-go="'+D.items[index-1].id+'">← 上一题</button>':'<span></span>')+button('home','回到学习地图','quiet small')+'</div>';
    document.querySelector('.work-panel').insertAdjacentHTML('beforeend','<div class="lesson-form-mode">'+button('flow-form',s.drafts.fullForm==='yes'?'返回一步一步模式':'切换完整书写表单','quiet')+'</div>');
    updateQuestionInset();questionObserver.observe($('original-question'));
    const flowRoot=document.querySelector('.lesson-flow');if(flowRoot)LessonView.mount(flowRoot,{action,redraw:()=>{save();render();}});
    $('source-note').textContent=D.source;justStepped=false;if(q.type==='tariff'&&$('water-output'))updateWater();mountBalance();const written=document.querySelector('.written-mode');if(written)written.addEventListener('toggle',()=>{if(written.isConnected&&qnow()?.id===q.id){s.written=written.open;save();}});save();
  }
  function updateWater(){try{const n=draft('exploreUsage','0');$('water-output').textContent=n+' 单位 → '+E.str(E.tariff(n))+' 元';}catch{$('water-output').textContent='请输入0到30的实验用量。';}}
  function action(name,data={}){
    if(name==='home'){navigate('home');return;}if(name==='about'){$('source-note').textContent=D.source;$('about-dialog').showModal();return;}
    if(name==='clear'){$('clear-dialog').showModal();return;}
    if(name==='cancel-clear'){$('clear-dialog').close();return;}
    if(name==='confirm-clear'){$('clear-dialog').close();db={version:1,current:'home',states:{}};storageLocked=false;storageWarning='';save();render();return;}
    if(name==='download'){const a=document.createElement('a');a.href=location.protocol==='file:'?location.href:'方程平衡实验室_离线版.html';a.download='方程平衡实验室_离线版.html';a.click();return;}
    if(!qnow())return;const q=qnow(),s=snow();
    if(['restart','undo'].includes(name))BalanceView.reset();
    if(name==='restart'){checkpoint();const undo=s.undo;db.states[q.id]={...empty(),undo,hints:s.hints};save();render();return;}
    if(name==='undo'){if(s.undo.length){const remaining=s.undo,old=remaining.pop();db.states[q.id]={...old,undo:remaining,hints:Math.max(s.hints,old.hints)};save();render();}else feedback('还没有可撤销的确认操作。','info');return;}
    if(name==='hint'){s.hints=Math.min(3,s.hints+1);save();render();return;}
    try {
      if(name.startsWith('flow-')){
        if(name==='flow-next'){need(!s.balance?.pending&&!s.balanceWork,'先完成或收起当前天平实验。');const result=LessonFlow.confirm(q,s);checkpoint();s.flow=result.flow;s.feedback=null;if(result.action){if(q.id==='e-flow')s.drafts.choice=q.answer;action(result.action);return;}}
        else if(name==='flow-back'){checkpoint();s.flow=LessonFlow.rewind(q,s);s.done=false;s.feedback=null;}
        else if(name==='flow-form'){s.drafts.fullForm=s.drafts.fullForm==='yes'?'no':'yes';}
        else if(name==='flow-write'||name==='flow-tiles'){need(!s.balance?.pending&&!s.balanceWork,'先完成或收起当前实验，再切换操作方式。');s.drafts.solveMethod=name==='flow-write'?'write':'tiles';}
        else if(name==='flow-shift'){need(['high','low'].includes(data.field)&&['1','-1'].includes(data.delta),'小数点操作不正确。');const old=Number(draft(data.field,'1')),power=Math.log10(old)+Number(data.delta);need(Number.isInteger(power)&&power>=0&&power<=3,'本实验倍率从1到1000。');s.drafts[data.field]=String(10**power);if(!s.drafts.high)s.drafts.high='1';if(!s.drafts.low)s.drafts.low='1';s.aligned=false;s.alignment='';s.flow={passed:[]};s.done=false;}
        else if(name==='flow-property'){need(q.type==='balance','只在等式性质实验中使用。');checkpoint();const sample=data.sample;s.drafts.propertySample=sample;s.propertySeen=true;
          if(q.id==='a-balance'){need(['left','both'].includes(sample),'先选择实验范围。');s.propertyResult=sample==='left'?'原来取x=4，两边都是7。只让左边减3：左边4，右边7，不再相等。':'原来取x=4，两边都是7。两边都减3：左边4，右边4，仍相等。';}
          else if(q.id==='a-zero'){need(['2','3','4'].includes(sample),'请选择实验值。');const n=Number(sample);s.propertyResult='取x='+n+'：原式左边2×'+n+'='+2*n+'，右边6，'+(n===3?'相等。':'不相等。')+'\n两边乘0后都是0。原来不满足的数也能满足0=0，解的信息丢失了。';}
          else s.propertyResult='除以0没有定义。两边一起做，也不能把没有意义的运算变成合法步骤。';s.feedback=null;
        }
        else if(name==='flow-compare'){need(q.id==='d-plan-compare'&&['2','5','8'].includes(data.value),'先选一个时长。');s.drafts.compareHours=data.value;action('compare-plans');return;}
        else if(name==='flow-usage'){need(q.type==='tariff'&&['5','10','15','20','25'].includes(data.value),'请选择实验用量。');s.drafts.exploreUsage=data.value;s.flowExplored=true;s.feedback=null;}
        else if(name==='flow-distance'){need(q.type==='lever'&&/^[1-8]$/.test(data.value),'距离应为1到8格。');s.drafts.distance=data.value;action('lever-record');return;}
        else if(name==='flow-order'||name==='flow-order-back'){need(q.id==='e-flow','只在建模顺序活动中使用。');let order=draft('flowOrder').split(',').filter(Boolean);if(name==='flow-order'){need(/^[0-3]$/.test(data.value)&&!order.includes(data.value),'每张卡片只用一次。');order.push(data.value);}else order.pop();s.drafts.flowOrder=order.join(',');s.done=false;s.feedback=null;}
        save();render();document.querySelector('.lesson-step-head')?.scrollIntoView({block:'nearest',behavior:'instant'});return;
      }
      if(['step','verify','choice','edit-model'].includes(name)&&s.balance)need(!s.balance.pending&&!BalanceView.hasWork(),'先完成或取消天平中的配对、拆盒或分组实验。');
      if(['choice','verify','decimal','tariff','lever'].includes(name))LessonFlow.prerequisites(q,s);
      if(name==='choice'){
        need(draft('choice')===q.answer,'先核对定义或条件，再作判断。');if(q.reasonOptions)need(draft('reason')===q.reason,'判断对了，还需要选出对应的依据。');checkpoint();s.notes.push(q.explanation||q.reason);mark(q.explanation||'判断和依据都正确。');
      }else if(name==='try'){
        const x=E.rat(draft('guess')),e=E.equation(q.equation),l=E.evaluate(e.left,x),r=E.evaluate(e.right,x);checkpoint();s.trial='左边 = '+E.str(l)+'；右边 = '+E.str(r)+(E.eq(l,r)?'，相等。继续在下方完成检验记录。':'，还不相等。');
      }else if(name==='experiment'){
        const op=draft('experimentOp'),side=draft('experimentSide'),n=E.rat(draft('experimentArg'));need(op&&side,'先选操作及范围。');let l=E.rat(7),r=E.rat(7);const fn={add:E.add,sub:E.sub,mul:E.mul,div:E.div}[op];l=fn(l,n);if(side==='both')r=fn(r,n);checkpoint();s.experiment='原x=4时：左边 '+E.str(l)+'，右边 '+E.str(r)+'。'+(op==='mul'&&!n.n?'注意：乘0使含x的信息消失，不能作为等价求解。':side==='both'?'两边做同一个合法操作，保持相等。':'只改一边通常会破坏相等；若碰巧没变也不能当作一般规则。');
      }else if(name==='compare-plans'){
        const t=E.rat(draft('compareHours','2'));need(t.n>=0n,'时间不能为负。');const a=E.add(E.rat(20),E.mul(E.rat(5),t)),b=E.mul(E.rat(9),t),diff=E.sub(a,b);checkpoint();s.comparison='A：'+E.str(a)+'元；B：'+E.str(b)+'元。'+(!diff.n?'两种方案相同。':diff.n>0n?'这次B更便宜。':'这次A更便宜。');
      }else if(name==='model-build'){
        need(draft('definition')===q.definition,'先明确x表示的量及单位。');q.fields.forEach((f,i)=>need(sameExpression(draft('quantity'+i),f.answer),'“'+f.label+'”的表达式还不正确，请检查题意。'));
        need(draft('relation')===q.relation,'等量关系还没有对上题意。');need(E.equivalent(draft('modelEquation'),q.equation),'所列方程与题目数量关系不一致。');if(q.mode!=='independent')BalanceMath.restore(BalanceMath.create(draft('modelEquation')),draft('modelEquation'));checkpoint();s.modelBuilt=true;s.history=[{equation:draft('modelEquation'),reason:'我建立的模型'}];s.notes.push('设x为'+q.definition+'；'+q.relation);s.feedback={kind:'success',message:'数量关系已核对。现在请解方程，并回到实际条件检验。'};
      }else if(name==='edit-model'){checkpoint();s.modelBuilt=false;s.done=false;s.history=[];s.balance=null;s.balanceWork=null;BalanceView.reset();s.feedback=null;
      }else if(name==='preview'){
        const current=s.history.at(-1)?.equation;need(current,'请先列出方程。');const t=E.transform(current,draft('op'),draft('arg'));s.preview=t.preview;s.feedback=null;
      }else if(name==='step'){
        need(s.history.length<60,'本题步骤较多，可以重开后选更直接的路线。');const current=s.history.at(-1)?.equation;need(current,'请先列方程。');const next=draft('nextEquation'),op=draft('op'),arg=draft('arg'),r=E.checkStep(current,op,arg,next);need(r.ok,r.message);if(q.mode!=='independent')BalanceMath.restore(BalanceMath.create(next),next);
        need(next.replace(/\s/g,'')!==current.replace(/\s/g,''),'这一行还没有变化，请写出整理后的方程或换一个操作。');checkpoint();s.history.push({equation:next,kind:op,reason:op==='simplify'?'分别整理两边':'两边同'+({add:'加',sub:'减',mul:'乘',div:'除'}[op])+' ('+arg+')'});s.balance=null;s.balanceWork=null;BalanceView.reset();s.drafts.nextEquation='';s.preview='';s.feedback={kind:'success',message:'这一步有依据，两边都核对正确。'};s.done=false;justStepped=true;
      }else if(name==='verify'){
        if(s.balance)need(BalanceMath.finishable(s.balance),'先在天平中消去零对和多余项，让x单独留下。');
        if(q.type!=='substitute')need(s.history.length&&E.isIsolated(s.history.at(-1).equation),'先通过合法步骤让x单独留下，再检验。');need(E.verify(q.equation,draft('value'),draft('leftValue'),draft('rightValue')),'解或原方程两边的代入值不正确。请分别计算原式的左边和右边。');
        if(q.type==='word')need(draft('reality')===q.reality,'还要检验实际意义：数量能否为分数，范围、单位是否符合题意？');checkpoint();s.notes.push('x='+draft('value')+'代回原式：左边='+draft('leftValue')+'，右边='+draft('rightValue'));mark(q.type==='word'?q.realityNote:'解已代回原方程，两边相等。');
      }else if(name==='align'){
        const hi=Number(draft('high')),lo=Number(draft('low'));need([1,10,100,1000].includes(hi)&&[1,10,100,1000].includes(lo),'请先选两行的倍率。');need(hi>lo,'上行倍率应大于下行，方便相减。');const highPower=Math.log10(hi),lowPower=Math.log10(lo);checkpoint();s.aligned=lowPower>=q.pre.length&&(highPower-lowPower)%q.repeat.length===0;s.alignment=s.aligned?'循环尾部已对齐。请自己计算相减后的系数、整数差和最简分数。':'尾部还没对齐：先移过非循环部分，再移动完整循环节。';s.done=false;
      }else if(name==='decimal'){
        need(s.aligned,'请先选择两行倍率，并使循环尾部对齐。');const hi=E.rat(draft('high')),lo=E.rat(draft('low')),co=E.sub(hi,lo),value=E.recurring(q.whole,q.pre,q.repeat).value,diff=E.mul(co,value);need(exact(draft('coefficient'),E.str(co)),'两行相减后，x的系数没有算对。');need(exact(draft('difference'),E.str(diff)),'右边整数部分的差没有算对。');need(exact(draft('fraction'),E.str(value)),'请用整数差除以系数，再约分。');need(draft('fraction').replace(/\s/g,'')===E.str(value),'数值正确，请写成最简分数。');checkpoint();s.notes.push(E.str(co)+'x='+E.str(diff)+'，x='+E.str(value));mark('无限循环尾部相同，精确相减得到最简分数。');
      }else if(name==='tariff'){
        const usage=E.rat(draft('usage'));need(usage.n>=0n,'用量不能是负数。');const n=Number(usage.n)/Number(usage.d),segment=n<=10?'1':n<=20?'2':'3';need(draft('segment')===segment,'求出的用量不属于所选区间，请先核对档位。');const expected=segment==='1'?'2x='+q.bill:segment==='2'?'20+3(x-10)='+q.bill:'50+5(x-20)='+q.bill;need(E.equivalent(draft('billEquation'),expected),'分段方程不正确。已经用完的档位按各自价格累加。');need(E.eq(E.tariff(draft('usage')),E.rat(q.bill)),'用量代回实际计费规则，与账单不符。');checkpoint();s.notes.push(draft('billEquation')+'；用量'+draft('usage')+'，总费'+q.bill+'元');mark('方程、用量区间和实际账单三重核验通过。');
      }else if(name==='lever-record'){
        const distance=Number(draft('distance','2'));need(Number.isInteger(distance)&&distance>=1&&distance<=8,'实验距离用1到8的整数格。');checkpoint();const left=q.leftCount*q.leftDistance,right=q.rightCount*distance;s.observations.push('左 '+q.leftCount+'×'+q.leftDistance+'='+left+'；右 '+q.rightCount+'×'+distance+'='+right+' → '+(left===right?'平衡':left>right?'左侧下沉':'右侧下沉'));s.observations=s.observations.slice(-20);
      }else if(name==='lever'){
        need(s.observations.length,'请先调整距离，记录至少一次实验。');need(E.equivalent(draft('leverEquation'),q.leftCount*q.leftDistance+'='+q.rightCount+'x'),'平衡条件必须比较数量与距离的乘积。');need(exact(draft('leverAnswer'),q.answer),'距离还不正确，把它代回两边的乘积检查。');checkpoint();s.notes.push(draft('leverEquation')+'，右侧距离'+draft('leverAnswer')+'格');mark('方程和两侧作用已核验。在模型前提下木杆平衡。');
      }
      save();render();
    }catch(error){feedback(error.message);}
  }
  for(const type of ['click','submit','keydown','input','change'])document.addEventListener(type,event=>{if(BalanceView.isBusy()){event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('click',event=>{
    const go=event.target.closest('[data-go]');if(go){navigate(go.dataset.go);return;}
    const zone=event.target.closest('[data-zone]');if(zone){zone.nextElementSibling.hidden=!zone.nextElementSibling.hidden;return;}
    const term=event.target.closest('[data-term]');if(term){prepareMove(term.dataset.term,term.dataset.side);return;}
    const target=event.target.closest('[data-action]');if(target){event.preventDefault();action(target.dataset.action,target.dataset);}
    if(event.target.closest('.brand')){event.preventDefault();navigate('home');}
  });
  document.addEventListener('submit',event=>{const f=event.target.closest('[data-submit]');if(f){event.preventDefault();action(f.dataset.submit);}});
  function changed(event){const field=event.target;if(!field.closest('#workspace')||!field.name||!qnow())return;const s=snow(),value=field.value.slice(0,512);if(s.drafts[field.name]===value){if(field.name==='exploreUsage'&&event.type==='change'&&s.drafts.fullForm!=='yes'){save();render();}return;}s.drafts[field.name]=value;s.done=false;s.feedback=null;
    if(['op','arg'].includes(field.name)){s.preview='';if($('operation-preview'))$('operation-preview').hidden=true;}
    if(['high','low'].includes(field.name)){s.aligned=false;s.alignment='';document.querySelector('.aligned-lines')?.remove();}
    if($('completion'))$('completion').hidden=true;if($('feedback'))$('feedback').hidden=true;
    LessonFlow.invalidate(qnow(),s,field.name);if(field.name==='guess')s.trial='';if(field.name==='compareHours')s.comparison='';
    if(field.name==='exploreUsage'){s.flowExplored=true;if(s.drafts.fullForm!=='yes'&&event.type==='change'){save();render();return;}if($('water-output'))updateWater();}save();renderNav();
  }
  document.addEventListener('input',changed);document.addEventListener('change',changed);
  function prepareMove(term,side){const s=snow();try{const current=s.history.at(-1).equation,e=E.equation(current);const p=E.parse(term),source=e[side];need(s.history.filter(h=>h.kind==='add'||h.kind==='sub').length>=2,'先完成两次同步加减。');need((p.a.n&&E.eq(p.a,source.a)&&!p.b.n)||(!p.a.n&&E.eq(p.b,source.b)),'只能移动当前一边的完整项。');s.drafts.op='sub';s.drafts.arg=term;s.preview=E.transform(current,'sub',term).preview;s.feedback={kind:'info',message:'移项背后是两边同减这个完整项。请自己计算并确认下一行。'};save();render();}catch(e){feedback(e.message);}}
  document.addEventListener('dragstart',event=>{const t=event.target.closest('[data-term]');if(t)event.dataTransfer.setData('application/json',JSON.stringify({term:t.dataset.term,side:t.dataset.side}));});
  document.addEventListener('dragover',event=>{const target=event.target.closest('[data-drop-side]');if(target){event.preventDefault();target.classList.add('drag-over');}});
  document.addEventListener('dragleave',event=>event.target.closest('[data-drop-side]')?.classList.remove('drag-over'));
  document.addEventListener('drop',event=>{const target=event.target.closest('[data-drop-side]');if(!target)return;event.preventDefault();target.classList.remove('drag-over');try{const data=JSON.parse(event.dataTransfer.getData('application/json'));if(data.side!==target.dataset.dropSide&&['left','right'].includes(data.side)&&typeof data.term==='string'&&data.term.length<40)prepareMove(data.term,data.side);}catch{feedback('只移动当前方程里的项。');}});
  try{render();}catch(error){storageLocked=true;storageWarning='旧记录中的页面无法恢复，原始存档已保留。本次可继续练习但不保存。';db={version:1,current:'home',states:{}};render();}
  BeginnerView.init();
})();
