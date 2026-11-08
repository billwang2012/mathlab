(() => {
  'use strict';
  const LEVELS=Object.freeze([
    Object.freeze({title:'让袋子单独留下',bags:1,left:2,right:5,equation:'x + 2 = 5'}),
    Object.freeze({title:'两个一样重的袋子',bags:2,left:0,right:6,equation:'2x = 6'}),
    Object.freeze({title:'这一次，你来想办法',bags:2,left:2,right:8,equation:'2x + 2 = 8'})
  ]);
  const need=(ok,message)=>{if(!ok)throw Error(message);};
  const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  const copy=s=>structuredClone(s);
  function create(level=0){need(integer(level,0,2),'关卡不存在。');return {level,phase:'balance',removed:0,selected:{left:[],right:[]},groups:[0,0],guess:'',hints:[0,0,0],done:[false,false,false],paperDone:false,paperHint:false,undo:[]};}
  function board(s){const q=LEVELS[s.level];return {bags:q.bags,left:Array.from({length:q.left-s.removed},(_,i)=>i+s.removed),right:Array.from({length:q.right-s.removed},(_,i)=>i+s.removed)};}
  function restore(raw,nested=true){
    if(raw==null){need(nested,'撤销记录不正确。');return create();}
    need(raw&&typeof raw==='object'&&!Array.isArray(raw)&&integer(raw.level,0,2),'入门记录格式不正确。');
    const s=create(raw.level),q=LEVELS[s.level];
    need(['balance','groups','answer','check','done','paper','finish'].includes(raw.phase),'入门步骤不正确。');s.phase=raw.phase;
    need(integer(raw.removed,0,q.left),'拿走的数量不正确。');s.removed=raw.removed;
    need(Array.isArray(raw.groups)&&raw.groups.length===2&&raw.groups.every(n=>integer(n,0,q.right))&&raw.groups[0]+raw.groups[1]<=q.right-s.removed,'分组记录不正确。');s.groups=[...raw.groups];
    need(raw.selected&&typeof raw.selected==='object','点选记录不正确。');const b=board(s);
    for(const side of ['left','right']){const ids=raw.selected[side];need(Array.isArray(ids)&&ids.length<=8&&ids.every(id=>b[side].includes(id))&&new Set(ids).size===ids.length,'选中的砝码不在盘中。');s.selected[side]=[...ids];}
    need(typeof raw.guess==='string'&&/^\d{0,2}$/.test(raw.guess),'答案记录不正确。');s.guess=raw.guess;
    need(Array.isArray(raw.hints)&&raw.hints.length===3&&raw.hints.every(n=>integer(n,0,3)),'提示记录不正确。');s.hints=[...raw.hints];
    need(Array.isArray(raw.done)&&raw.done.length===3&&raw.done.every(v=>typeof v==='boolean'),'完成记录不正确。');s.done=[...raw.done];s.paperDone=raw.paperDone===true;s.paperHint=raw.paperHint===true;
    if(s.phase!=='balance')need(!s.selected.left.length&&!s.selected.right.length,'当前步骤不应有选中砝码。');
    if(s.phase==='balance')need(s.groups.every(n=>n===0)&&s.guess==='','盘面步骤不一致。');
    if(s.phase==='groups')need(q.bags===2&&s.removed===q.left&&s.guess==='','还不能平均分。');
    if(['answer','check','done','paper','finish'].includes(s.phase)){
      need(s.removed===q.left,'袋子旁还有砝码。');
      need(q.bags===1?s.groups.every(n=>n===0):s.groups[0]===s.groups[1]&&s.groups[0]+s.groups[1]===q.right-s.removed,'两组还没有分完。');
    }
    if(['check','done'].includes(s.phase))need(q.bags*Number(s.guess)+q.left===q.right,'检验记录不正确。');
    if(['paper','finish'].includes(s.phase))need(s.level===2&&s.done[2],'还没有进入独立小题。');
    if(s.phase==='finish'&&s.paperDone)need(s.guess==='5','独立小题答案不正确。');
    if(s.phase==='done')need(s.done[s.level],'完成步骤缺少记录。');
    if(nested){need(Array.isArray(raw.undo)&&raw.undo.length<=8,'撤销记录过长。');s.undo=raw.undo.map(u=>{const previous=restore(u,false);need(previous.level===s.level,'撤销记录与关卡不一致。');return previous;});}
    return s;
  }
  function remember(s){const snapshot=copy({...s,undo:[]});s.undo.push(snapshot);s.undo=s.undo.slice(-8);}
  function act(raw,action,data={}){
    const s=restore(raw),q=LEVELS[s.level],b=board(s);
    if(action==='hint'){if(s.phase==='paper')s.paperHint=true;else s.hints[s.level]=Math.min(3,s.hints[s.level]+1);return s;}
    if(action==='undo'){
      if(s.selected.left.length||s.selected.right.length){s.selected={left:[],right:[]};return s;}
      need(s.undo.length,'还没有需要退回的动作。');const previous=s.undo.pop();previous.undo=s.undo;previous.hints=previous.hints.map((n,i)=>Math.max(n,s.hints[i]));previous.paperHint=previous.paperHint||s.paperHint;return previous;
    }
    if(action==='restart'){const n=create(s.level);n.hints=s.hints;n.done=s.done.map((v,i)=>i===s.level?false:v);n.paperHint=s.paperHint;return n;}
    if(action==='select'){
      need(s.phase==='balance','这一步不用选砝码。');need(['left','right'].includes(data.side)&&b[data.side].includes(data.id),'请选择盘里黄色的1克砝码。');
      const ids=s.selected[data.side];s.selected[data.side]=ids.includes(data.id)?ids.filter(id=>id!==data.id):[...ids,data.id];return s;
    }
    if(action==='remove'){
      need(s.phase==='balance','这一步不用拿走砝码。');const l=s.selected.left.length,r=s.selected.right.length;
      need(l>0&&r>0,'两边各选一些黄色砝码，再一起拿走。');need(l===r,'左边选了'+l+'个，右边选了'+r+'个。两边要拿走一样多。');
      s.selected={left:[],right:[]};remember(s);s.removed+=l;if(s.removed===q.left&&q.bags===1)s.phase='answer';return s;
    }
    if(action==='group'){
      need(s.phase==='balance'&&q.bags===2,'现在不用分两份。');need(s.removed===q.left,'袋子旁还有砝码。先从两边拿走一样多，让袋子单独留下。');
      s.selected={left:[],right:[]};remember(s);s.phase='groups';return s;
    }
    if(action==='give'||action==='return'){
      need(s.phase==='groups'&&integer(data.bin,0,1),'请选择一个袋子的格子。');
      if(action==='give')need(s.groups[0]+s.groups[1]<b.right.length,'砝码分完了。想调整，可以点格子里的砝码放回去。');
      else need(s.groups[data.bin]>0,'这个格子还没有砝码。');
      remember(s);s.groups[data.bin]+=action==='give'?1:-1;return s;
    }
    if(action==='group-confirm'){
      need(s.phase==='groups','先把砝码分两份。');need(s.groups[0]+s.groups[1]===b.right.length,'还有砝码剩在上面，把它们分完再看。');need(s.groups[0]===s.groups[1],'两个袋子一样重，每组也要一样多。点格子里的砝码可以放回去。');
      remember(s);s.phase='answer';return s;
    }
    if(action==='answer'||action==='paper-answer'){
      need(s.phase===(action==='answer'?'answer':'paper'),'先完成眼前的一步。');need(typeof data.value==='string'&&/^\d{1,2}$/.test(data.value),'在空格里填一个数，再试试看。');const value=Number(data.value);
      if(action==='answer'){const total=q.bags*value+q.left;need(total===q.right,'放回原来试试：左边是'+total+'克，右边是'+q.right+'克，还不一样。再看看一个袋子对应多少克。');remember(s);s.guess=String(value);s.phase='check';}
      else{need(value+3===8,'这个数加3还不是8，再试一个数。');s.guess=String(value);s.paperDone=true;s.phase='finish';s.undo=[];}return s;
    }
    if(action==='check'){need(s.phase==='check','先把你猜的重量放回去。');remember(s);s.phase='done';s.done[s.level]=true;return s;}
    if(action==='next'){
      need(s.phase==='done','先完成这一关。');if(s.level<2){const n=create(s.level+1);n.hints=s.hints;n.done=s.done;return n;}
      s.phase='paper';s.guess='';s.undo=[];return s;
    }
    if(action==='skip-paper'){need(s.phase==='paper','当前没有独立小题。');s.phase='finish';s.guess='';s.paperDone=false;return s;}
    if(action==='replay'){const n=create();n.hints=s.hints;n.paperHint=s.paperHint;return n;}
    throw Error('请使用画面里的按钮。');
  }
  globalThis.BeginnerMath=Object.freeze({LEVELS,create,board,restore,act});
})();
