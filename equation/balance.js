(() => {
  'use strict';
  const E=EquationMath,R=E.rat,Z=R(0),O=R(1),sides=['left','right'];
  const fail=m=>{throw Error(m);},need=(c,m)=>{if(!c)fail(m);};
  const copy=b=>structuredClone(b),validSide=s=>need(sides.includes(s),'请选择左盘或右盘。');
  const same=(p,q)=>E.eq(p.a,q.a)&&E.eq(p.b,q.b);
  const tokenPoly=t=>t.kind==='group'?E.parse(t.expr):{a:t.kind==='x'?R(t.value):Z,b:t.kind==='one'?R(t.value):Z};
  const total=ts=>ts.reduce((p,t)=>{const q=tokenPoly(t);return {a:E.add(p.a,q.a),b:E.add(p.b,q.b)};},{a:Z,b:Z});
  const equation=b=>E.format(total(b.left))+' = '+E.format(total(b.right));
  function notation(b){return Object.fromEntries(sides.map(side=>{const runs=[];for(const t of b[side]){if(t.kind==='group'){runs.push({kind:'group',expr:t.expr});continue;}const value=R(t.value),last=runs.at(-1);if(b.representation!=='terms'&&last&&last.kind===t.kind&&last.term===t.term&&(last.value.n<0n)===(value.n<0n))last.value=E.add(last.value,value);else runs.push({kind:t.kind,term:t.term,value});}return [side,runs.map(t=>t.kind==='group'?t.expr:E.format({a:t.kind==='x'?t.value:Z,b:t.kind==='one'?t.value:Z}))];}));}
  function notationEquation(n){return sides.map(side=>n[side].map((raw,i)=>{const s=raw.trim().replace(/[−－]/g,'-'),negative=s.startsWith('-'),body=s.replace(/^[+-]/,'');return (i?(negative?' - ':' + '):negative?'-':'')+body;}).join('')||'0').join(' = ');}
  const displayEquation=b=>notationEquation(notation(b));
  function operationView(board){const b=copy(board);b.tilt=0;if(b.pending?.kind==='add'){const p=b.pending;b[p.side].push({...p.token,id:'operation-add',term:'operation-add',operation:true});b.tilt=(p.side==='left'?-1:1)*(R(p.token.value).n<0n?-1:1);}return b;}
  const sceneEquation=b=>displayEquation(operationView(b)).replace(' = ',b.pending?.kind==='add'?' ≟ ':' = ');
  function restoreNotation(raw,source){need(raw&&typeof raw==='object'&&!Array.isArray(raw),'盘面方程记录不正确。');const expected=E.equation(source),out={};for(const side of sides){need(Array.isArray(raw[side])&&raw[side].length<=96,'盘面方程记录不正确。');let sum={a:Z,b:Z};out[side]=raw[side].map(term=>{need(typeof term==='string'&&term.length<=256,'盘面项记录不正确。');const p=E.parse(term);sum={a:E.add(sum.a,p.a),b:E.add(sum.b,p.b)};return term;});need(same(sum,expected[side]),'盘面显示记录与对应方程不一致。');}return out;}
  function addToken(b,side,kind,value,term='t'+b.next){const r=R(value);if(!r.n)return;b[side].push({id:'t'+b.next++,kind,value:E.str(r),term});}
  function appendExpression(b,side,expr){const p=E.parse(expr);addToken(b,side,'x',E.str(p.a));addToken(b,side,'one',E.str(p.b));}
  function terms(s){s=s.replace(/\s/g,'').replace(/[−－]/g,'-').replace(/×/g,'*').replace(/÷/g,'/').replace(/（/g,'(').replace(/）/g,')');let depth=0,start=0,out=[];
    for(let i=0;i<s.length;i++){const c=s[i];if(c==='(')depth++;if(c===')')depth--;if(i&&depth===0&&(c==='+'||c==='-')&&!'+-*/('.includes(s[i-1])){out.push(s.slice(start,i));start=i;}}
    out.push(s.slice(start));return out.filter(Boolean);
  }
  function create(source){const e=E.equation(source),b={left:[],right:[],next:1,pending:null,last:'',representation:'terms'};
    sides.forEach((side,i)=>{for(const term of terms(e.raw[i])){
      if(term.includes('(')){b[side].push({id:'t'+b.next++,kind:'group',expr:term.replace(/^\+/, '')});}
      else appendExpression(b,side,term);
    }});return b;
  }
  const get=(b,side,id)=>{validSide(side);const t=b[side].find(t=>t.id===id);need(t,'这块已经不在盘中，请重新拖动。');return t;};
  const ready=b=>need(!b.pending,'先在另一盘完成配对，或取消暂存操作。');
  function remove(board,side,id){const b=copy(board),t=get(b,side,id);need(t.kind!=='group','先拆开整体盒子，再选取其中方块。');
    if(!b.pending){b.pending={kind:'remove',side,id,token:copy(t)};b.last='已暂存一块，另一盘还需要拿走同种同量的块。';return b;}
    const p=b.pending;need(p.kind==='remove'&&p.side!==side,'请在另一盘拿走同样的块。');need(p.token.kind===t.kind&&E.eq(R(p.token.value),R(t.value)),'两盘拿走的块必须同种、同量、符号相同。');
    b[p.side]=b[p.side].filter(x=>x.id!==p.id);b[side]=b[side].filter(x=>x.id!==id);b.pending=null;b.last='两边同时减去 '+label(t)+'；等式保持不变。';return b;
  }
  function removeMatched(board,side,id){const p=board.pending;need(p?.kind==='remove'&&p.side!==side,'先在另一盘暂存要拿走的块。');const b=copy(board),t=get(b,side,id);need(t.kind!=='group'&&t.kind===p.token.kind,'两边必须拿走同种方块，盒子要先拆开。');const value=R(t.value),amount=R(p.token.value),ratio=E.div(amount,value);need(ratio.n>0n&&ratio.n<=ratio.d,'这块必须符号相同，并且有足够的量。');if(E.eq(value,amount))return remove(board,side,id);const staged=get(b,p.side,p.id);need(staged.kind===p.token.kind&&staged.value===p.token.value,'暂存块不一致。');t.value=E.str(E.sub(value,amount));b[p.side]=b[p.side].filter(x=>x.id!==p.id);b.pending=null;b.last='两边同时拿走 '+label(p.token)+'；这块还剩 '+label(t)+'。';return b;}
  function removePlan(board,leftIds,rightIds){ready(board);need(Array.isArray(leftIds)&&Array.isArray(rightIds)&&leftIds.length&&rightIds.length,'两边都要选中要拿走的块。');need(leftIds.length+rightIds.length<=192,'选中的块太多。');
    const picked={left:leftIds,right:rightIds},items={};for(const side of sides){need(new Set(picked[side]).size===picked[side].length,'同一块不能重复选。');items[side]=picked[side].map(id=>get(board,side,id));need(items[side].every(t=>t.kind!=='group'),'先拆开整体盒子，再选取其中方块。');}
    const l=total(items.left),r=total(items.right);if(same(l,r))return {mode:'all',picked,amount:l};
    const a=items.left[0],c=items.right[0];
    if(items.left.length===1&&items.right.length===1&&a.kind===c.kind){const av=R(a.value),cv=R(c.value);if(av.n!==0n&&(av.n<0n)===(cv.n<0n)){const mag=v=>v.n<0n?E.neg(v):v,big=E.sub(mag(cv),mag(av)).n>0n?'right':'left',small=big==='left'?'right':'left',bt=items[big][0],st=items[small][0];return {mode:'part',picked,amount:st,big,bigToken:bt,rest:{kind:bt.kind,value:E.str(E.sub(R(bt.value),R(st.value)))}};}}
    fail('两边拿走的量必须相同：左边 '+E.format(l)+'，右边 '+E.format(r)+'。');
  }
  function removePreview(board,leftIds,rightIds){try{const p=removePlan(board,leftIds,rightIds);return p.mode==='all'?{ok:true,text:'两边一起拿走 '+E.format(p.amount),note:''}:{ok:true,text:'两边各拿走 '+label(p.amount),note:(p.big==='left'?'左边 ':'右边 ')+label(p.bigToken)+' 留下 '+label(p.rest)};}catch(e){return {ok:false,text:e.message,note:''};}}
  function removeBoth(board,leftIds,rightIds){const p=removePlan(board,leftIds,rightIds),b=copy(board);
    if(p.mode==='all'){for(const side of sides){const drop=new Set(p.picked[side]);b[side]=b[side].filter(t=>!drop.has(t.id));}b.last='两边同时减去 '+E.format(p.amount)+'；等式保持不变。';return b;}
    const small=p.big==='left'?'right':'left';b[small]=b[small].filter(t=>t.id!==p.amount.id);get(b,p.big,p.bigToken.id).value=p.rest.value;b.last='两边同时拿走 '+label(p.amount)+'；'+(p.big==='left'?'左':'右')+'边这块还剩 '+label(p.rest)+'。';return b;
  }
  function addAmount(value){const r=R(value);need(r.n>0n,'数量必须大于0；正负号由方块决定。');need(r.n<=10000n*r.d,'每块数量不能超过10000。');const text=E.str(r);need(text.length<=32,'数量太精细，请使用更简单的分数。');return text;}
  function addValue(value){const r=R(value);addAmount(E.str(r.n<0n?E.neg(r):r));return E.str(r);}
  function adjustPendingAdd(board,side,amount){validSide(side);need(board.pending?.kind==='add'&&board.pending.side===side,'只能调节刚放上、尚未配对的加块。');const magnitude=R(addAmount(amount)),b=copy(board);b.pending.token.value=E.str(R(b.pending.token.value).n<0n?E.neg(magnitude):magnitude);b.last='已将新放入的块调为 '+label(b.pending.token)+'；另一盘也需要加上相同的量。';return b;}
  function add(board,side,kind,value){validSide(side);need(['x','one'].includes(kind),'只能添加x块或常数块。');const valueString=addValue(value);const b=copy(board);
    if(!b.pending){b.pending={kind:'add',side,token:{kind,value:valueString}};b.last='准备添加 '+label(b.pending.token)+'，再拖一块相同的到另一盘。';return b;}
    const p=b.pending;need(p.kind==='add'&&p.side!==side,'请在另一盘添加相同的块。');need(p.token.kind===kind&&p.token.value===valueString,'两边添加的块必须同种、同量、符号相同。');
    sides.forEach(s=>{const id='t'+b.next++;b[s].push({id,term:id,kind,value:valueString,...(!E.eq(R(valueString),O)&&!E.eq(R(valueString),R(-1))?{merged:true}:{})});});b.pending=null;b.last='两边同时加上 '+label(p.token)+'。相反符号的同种块可在同一盘内拖叠抵消。';limits(b);return b;
  }
  function cancel(board,side,id,target){ready(board);const b=copy(board),a=get(b,side,id),c=get(b,side,target);need(id!==target&&a.kind!=='group'&&a.kind===c.kind,'只有同一盘中同类且符号相反的两块才能抵消。');need(!E.add(R(a.value),R(c.value)).n,'这两块大小不同，不能组成零对。');b[side]=b[side].filter(t=>t.id!==id&&t.id!==target);b.last=label(a)+' 与 '+label(c)+' 是零对，在同一盘内抵消。';return b;}
  function merge(board,side,id,target){ready(board);const b=copy(board),a=get(b,side,id),c=get(b,side,target);need(id!==target&&a.kind!=='group'&&a.kind===c.kind,'只能合并同一盘中的两个同类方块。');const av=R(a.value),cv=R(c.value);need(av.n!==0n&&cv.n!==0n,'零块无需合并。');if(!E.add(av,cv).n)return cancel(board,side,id,target);const mergedId='t'+b.next++,t={id:mergedId,term:mergedId,kind:a.kind,value:E.str(E.add(av,cv)),merged:true},index=Math.min(b[side].findIndex(t=>t.id===id),b[side].findIndex(t=>t.id===target));b[side]=b[side].filter(t=>t.id!==id&&t.id!==target);b[side].splice(index,0,t);b.last=label(a)+' 与 '+label(c)+' 合成 '+label(t)+'，只合并这两块，总量不变。';return b;}
  function swap(board){ready(board);const b=copy(board);[b.left,b.right]=[b.right,b.left];b.last='左右两盘整体对调：方程两边交换，每块的符号和数量都不变。';return b;}
  function mergeInWork(board,rawWork,side,id,target){const work=restoreWork(rawWork,board);need(work?.type==='divide','只有分组实验可在组内合并。');need(work.assign[id]===work.assign[target],'请合并同一组内的块，或都尚未分组的块；不能跨组自动搬动。');const b=merge(board,side,id,target),assign={...work.assign},bin=assign[id];delete assign[id];delete assign[target];if(bin!==undefined&&b.next>board.next)assign['t'+board.next]=bin;return {board:b,work:restoreWork({...work,assign},b)};}
  function flipBoth(board){ready(board);const b=copy(board);for(const side of sides)for(const t of b[side]){if(t.kind==='group')t.expr='-('+t.expr+')';else t.value=E.str(E.neg(R(t.value)));}b.last='两边同时乘以 −1：每块都变号，括号盒子整体变号；等式仍成立。这是代数变号，不是负重量。';return b;}
  function multiply(board,side,value){validSide(side);const factor=R(value);need(factor.n!==0n,'乘0会丢失原方程信息，不能等价求解。');need(!E.eq(factor,O),'乘1没有变化。');need((factor.d===1n&&factor.n>=-12n&&factor.n<=12n),'倍乘工具支持−12到12的非零整数。');const b=copy(board),v=E.str(factor);
    if(!b.pending){b.pending={kind:'multiply',side,value:v};b.last='准备乘 '+v+'，把同一倍数工具拖到另一盘。';return b;}
    need(b.pending.kind==='multiply'&&b.pending.side!==side&&b.pending.value===v,'两边必须使用同一个倍数。');
    sides.forEach(s=>{const old=b[s];b[s]=[];old.forEach(t=>{if(t.kind==='group')b[s].push({id:'t'+b.next++,kind:'group',expr:v+'*('+t.expr+')'});else addToken(b,s,t.kind,E.str(E.mul(R(t.value),factor)),t.term||null);});});
    b.pending=null;b.last='两边的每一块、每个盒子都乘 '+v+'。'+(factor.n<0n?'负号作用于整个对象，不是负重量。':'没有分母的常数也要乘。');limits(b);return b;
  }
  function expand(board,side,id,answers){ready(board);const b=copy(board),t=get(b,side,id);need(t.kind==='group','只有整体盒子需要拆开。');const p=E.parse(t.expr);need(Array.isArray(answers)&&answers.length===2,'请分别组装x项和常数项。');need(E.eq(R(answers[0]),p.a)&&E.eq(R(answers[1]),p.b),'展开还不正确：外面的倍数与负号必须作用于每一项。');const index=b[side].findIndex(x=>x.id===id),before=b[side].slice(0,index),after=b[side].slice(index+1);b[side]=[];addToken(b,side,'x',E.str(p.a));addToken(b,side,'one',E.str(p.b));b[side]=[...before,...b[side],...after];b.last='拆开 '+t.expr+'：'+E.format(p)+'。每一项都接受外面的倍数与符号。';limits(b);return b;}
  function split(board,side,id,parts){ready(board);need(Number.isInteger(parts)&&parts>=2&&parts<=8,'切分份数应是2到8的整数。');const b=copy(board),t=get(b,side,id);need(t.kind!=='group','先拆盒再切分方块。');const value=E.str(E.div(R(t.value),R(parts))),pieces=Array.from({length:parts},()=>{const id='t'+b.next++;return {id,term:id,kind:t.kind,value};});b[side].splice(b[side].findIndex(x=>x.id===id),1,...pieces);b.last='把 '+label(t)+' 切成 '+parts+' 份，每份 '+label({kind:t.kind,value})+'，总量没有变化。';limits(b);return b;}
  function divide(board,n,assign){ready(board);need(Number.isInteger(n)&&n>=2&&n<=8,'平均分成2到8组。');const b=copy(board);
    sides.forEach(s=>{need(!b[s].some(t=>t.kind==='group'),'先把括号盒子拆开，再分配其中的方块。');const buckets=Array.from({length:n},()=>[]);for(const t of b[s]){const k=assign[t.id];need(Number.isInteger(k)&&k>=0&&k<n,'每块都要分配到一组，不能丢掉。');buckets[k].push(t);}const target=total(buckets[0]);need(buckets.every(g=>same(total(g),target)),'同一盘的每组必须同种同量；需要时先切分单位块。');b[s]=buckets[0];});
    b.last='两盘分别平均分成 '+n+' 组，再各取一组：两边同除以 '+n+'。';return b;
  }
  function abandon(board){const b=copy(board);b.pending=null;b.last='取消未配对操作，正式等式没有变化。';return b;}
  function finishable(b){if(b.pending||[...b.left,...b.right].some(t=>t.kind==='group'))return false;const isolated=(l,r)=>l.length>0&&l.every(t=>t.kind==='x'&&R(t.value).n>0n)&&E.eq(total(l).a,O)&&r.every(t=>t.kind==='one')&&(!r.length||r.every(t=>R(t.value).n>0n)||r.every(t=>R(t.value).n<0n));return isolated(b.left,b.right)||isolated(b.right,b.left);}
  function label(t){if(t.kind==='group')return t.expr;const v=R(t.value);if(t.kind==='one')return (v.n>=0n?'+':'')+E.str(v);return E.eq(v,O)?'+x':E.eq(v,R(-1))?'−x':(v.n>0n?'+':'')+E.str(v)+'x';}
  function limits(b){need(b.left.length<=96&&b.right.length<=96,'方块较多，请先抵消或整理，再继续添加。');}
  function restore(raw,source){need(raw&&typeof raw==='object'&&Number.isSafeInteger(raw.next)&&raw.next>0,'天平记录不正确。');const b=copy(raw),ids=new Set();for(const s of sides){need(Array.isArray(b[s])&&b[s].length<=96,'盘中方块记录不正确。');for(const t of b[s]){need(/^t\d+$/.test(t.id)&&!ids.has(t.id),'方块编号重复或不合法。');ids.add(t.id);need(Number(t.id.slice(1))<b.next,'方块编号越界。');need(['x','one','group'].includes(t.kind),'方块类型错误。');if(t.merged!=null)need(typeof t.merged==='boolean','合并块记录不正确。');if(t.term!=null)need(typeof t.term==='string'&&/^t\d+$/.test(t.term)&&Number(t.term.slice(1))<b.next,'方块原项标识不正确。');tokenPoly(t);}}
    const a=E.equation(equation(b)),expected=E.equation(source);need(same(a.left,expected.left)&&same(a.right,expected.right),'天平与当前等式不一致。');
    if(b.pending){const p=b.pending;validSide(p.side);need(['add','remove','multiply'].includes(p.kind),'暂存操作错误。');if(p.kind==='remove'){const t=get(b,p.side,p.id);need(t.kind===p.token.kind&&t.value===p.token.value,'暂存块不一致。');}else if(p.kind==='add'){need(['x','one'].includes(p.token?.kind),'暂存块错误。');p.token.value=addValue(p.token.value);}else R(p.value);}
    b.last=typeof b.last==='string'?b.last.slice(0,1000):'';return b;
  }
  function restoreWork(raw,b){if(raw==null)return null;ready(b);need(raw&&typeof raw==='object','实验草稿不正确。');
    if(raw.type==='divide'){need(Number.isInteger(raw.n)&&raw.n>=2&&raw.n<=8,'分组数量不正确。');need(raw.assign&&typeof raw.assign==='object'&&!Array.isArray(raw.assign),'分组记录不正确。');const ids=new Set([...b.left,...b.right].map(t=>t.id)),assign={};for(const [id,k]of Object.entries(raw.assign)){need(ids.has(id)&&Number.isInteger(k)&&k>=0&&k<raw.n,'分组方块编号或组号不正确。');assign[id]=k;}return {type:'divide',n:raw.n,assign};}
    need(raw.type==='expand','实验类型不正确。');const t=get(b,raw.side,raw.id);need(t.kind==='group'&&Array.isArray(raw.answers)&&raw.answers.length<=2,'拆盒记录不正确。');const answers=Array.from({length:2},(_,i)=>raw.answers[i]==null?null:E.str(R(raw.answers[i])));return {type:'expand',side:raw.side,id:raw.id,answers};
  }
  function partition(board,rawWork,side){
    ready(board);validSide(side);const work=restoreWork(rawWork,board);need(work?.type==='divide','先选择分成几组。');
    need(![...board.left,...board.right].some(t=>t.kind==='group'),'先拆开括号盒子，再平均分。');
    const b=copy(board),assign={...work.assign},before=total(b[side]),parts=new Map();
    for(const t of b[side]){delete assign[t.id];const value=R(t.value),key=t.kind+':'+(value.n<0n?'-':'+'),old=parts.get(key);parts.set(key,{kind:t.kind,value:E.add(old?.value||Z,value)});}
    b[side]=[];
    for(let k=0;k<work.n;k++)for(const {kind,value}of parts.values()){if(!value.n)continue;const t={id:'t'+b.next++,kind,value:E.str(E.div(value,R(work.n)))};b[side].push(t);assign[t.id]=k;}
    need(same(total(b[side]),before),'分组后总量必须保持不变。');limits(b);
    b.last='把'+(side==='left'?'左':'右')+'盘平均分成 '+work.n+' 组，总量仍是 '+E.format(before)+'；尚未取走任何一组。';
    return {board:b,work:restoreWork({type:'divide',n:work.n,assign},b)};
  }
  function partitionBoth(board,n){let p={board,work:{type:'divide',n,assign:{}}};for(const side of sides)p=partition(p.board,p.work,side);p.board.last='左右两盘各自平均分成 '+n+' 组，总量不变；两边各留一组后才是同时除以 '+n+'。';return p;}
  function upgradeTerms(board,preservePieces=false){if(board.representation==='terms')return board;const b=copy(board);b.representation='terms';if(preservePieces||b.pending?.kind==='remove')return b;for(const side of sides){const out=[];for(const t of b[side]){const last=out.at(-1);if(t.kind!=='group'&&t.term&&last?.term===t.term&&last.kind===t.kind&&(R(last.value).n<0n)===(R(t.value).n<0n))last.value=E.str(E.add(R(last.value),R(t.value)));else out.push(t);}b[side]=out;}return b;}
  globalThis.BalanceMath=Object.freeze({create,upgradeTerms,equation,notation,notationEquation,displayEquation,operationView,sceneEquation,restoreNotation,remove,removeMatched,removePreview,removeBoth,add,addAmount,adjustPendingAdd,cancel,merge,mergeInWork,swap,flipBoth,multiply,expand,split,divide,partition,partitionBoth,abandon,finishable,label,restore,restoreWork,total});
})();
