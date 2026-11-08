(() => {
  'use strict';
  const ids=new Set(EquationContent.items.map(q=>q.id)),limit=600000;
  const empty=()=>({drafts:{},history:[],notes:[],undo:[],hints:0,done:false,modelBuilt:false,observations:[]});
  function state(raw,nested=true){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('学习记录格式不正确');
    const s=empty();
    s.drafts=Object.fromEntries(Object.entries(raw.drafts||{}).filter(([k,v])=>/^[a-zA-Z0-9]{1,40}$/.test(k)&&!['constructor','prototype'].includes(k)&&typeof v==='string'&&v.length<=512).slice(0,100));
    for(const [key,values]of [['high',['1','10','100','1000']],['low',['1','10','100','1000']]])if(s.drafts[key]&&!values.includes(s.drafts[key]))throw Error('实验倍率记录不正确');
    for(const [key,min,max]of [['exploreUsage',0,30]])if(s.drafts[key]!==undefined){const n=Number(s.drafts[key]);if(!Number.isInteger(n)||n<min||n>max)throw Error('实验范围记录不正确');}
    s.hints=Number.isInteger(raw.hints)?Math.max(0,Math.min(3,raw.hints)):0;s.done=raw.done===true;s.modelBuilt=raw.modelBuilt===true;
    if(Array.isArray(raw.history))s.history=raw.history.slice(-60).map(h=>{if(!h||typeof h.equation!=='string'||h.equation.length>256)throw Error('方程记录不合法');EquationMath.equation(h.equation);return {equation:h.equation,...(h.boardNotation!=null?{boardNotation:BalanceMath.restoreNotation(h.boardNotation,h.equation)}:{}),reason:String(h.reason||'').slice(0,256),kind:['add','sub','mul','div','simplify'].includes(h.kind)?h.kind:undefined};});
    for(const key of ['notes','observations'])if(Array.isArray(raw[key]))s[key]=raw[key].filter(t=>typeof t==='string').slice(-40).map(t=>t.slice(0,512));
    for(const key of ['preview','alignment','trial','experiment','comparison'])if(typeof raw[key]==='string')s[key]=raw[key].slice(0,1500);
    s.aligned=raw.aligned===true;s.written=raw.written===true;
    if(raw.flow!=null)s.flow=LessonFlow.restore(raw.flow);s.flowExplored=raw.flowExplored===true;s.propertySeen=raw.propertySeen===true;if(typeof raw.propertyResult==='string')s.propertyResult=raw.propertyResult.slice(0,1500);
    if(raw.balance!=null){if(!s.history.length)throw Error('天平缺少对应方程');s.balance=BalanceMath.restore(raw.balance,s.history.at(-1).equation);s.balanceWork=BalanceMath.restoreWork(raw.balanceWork,s.balance);}
    if(raw.feedback&&typeof raw.feedback.message==='string')s.feedback={message:raw.feedback.message.slice(0,1000),kind:['success','error','info'].includes(raw.feedback.kind)?raw.feedback.kind:'info'};
    if(nested&&Array.isArray(raw.undo))s.undo=raw.undo.slice(-5).map(u=>state(u,false));
    return s;
  }
  function sanitize(raw){if(!raw||raw.version!==1||!raw.states||typeof raw.states!=='object'||Array.isArray(raw.states))throw Error('记录版本或结构不正确');return {version:1,current:ids.has(raw.current)?raw.current:'home',states:Object.fromEntries(Object.entries(raw.states).filter(([id])=>ids.has(id)).map(([id,s])=>[id,state(s)]))};}
  function encode(db){const safe=sanitize(db);let text=JSON.stringify(safe),trimmed=false;if(text.length>limit){for(const s of Object.values(safe.states))s.undo=[];text=JSON.stringify(safe);trimmed=true;}if(text.length>limit)throw Error('学习记录过大，本次未覆盖旧存档。请导出记录后再清理。');return {text,trimmed};}
  function decode(raw){if(typeof raw!=='string'||raw.length>2000000)throw Error('旧记录过大，已保留原始内容，未覆盖。');return sanitize(JSON.parse(raw));}
  globalThis.EquationStore=Object.freeze({empty,encode,decode,limit});
})();
