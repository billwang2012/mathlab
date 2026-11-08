(() => {
  'use strict';
  const fail = message => { throw new Error(message); };
  const abs = n => n < 0n ? -n : n;
  const gcd = (a,b) => { a=abs(a);b=abs(b);while(b){[a,b]=[b,a%b];}return a||1n; };
  function fraction(n,d=1n) {
    if(!d) fail('不能除以0。');
    if(d<0n){n=-n;d=-d;}const g=gcd(n,d);n/=g;d/=g;
    if(abs(n).toString().length>80 || d.toString().length>80) fail('数值过大，请使用本章范围内的数字。');
    return {n,d};
  }
  function rat(value) {
    if(value&&typeof value.n==='bigint') return fraction(value.n,value.d);
    const s=String(value).trim().replace(/[−－]/g,'-');
    if(s.length>32) fail('数字太长。');
    if(s.includes('/')){const p=s.split('/');if(p.length!==2)fail('分数格式不正确。');return div(rat(p[0]),rat(p[1]));}
    if(!/^[+-]?(?:\d+(?:\.\d{1,8})?|\.\d{1,8})$/.test(s))fail('请输入整数、小数或分数，例如 -2/3。');
    const [whole,tail='']=s.replace(/^[+-]/,'').split('.');return fraction(BigInt((whole||'0')+tail)*(s[0]==='-'?-1n:1n),10n**BigInt(tail.length));
  }
  const add=(a,b)=>fraction(a.n*b.d+b.n*a.d,a.d*b.d);
  const neg=a=>fraction(-a.n,a.d);
  const sub=(a,b)=>add(a,neg(b));
  const mul=(a,b)=>fraction(a.n*b.n,a.d*b.d);
  const div=(a,b)=>fraction(a.n*b.d,a.d*b.n);
  const eq=(a,b)=>a.n===b.n&&a.d===b.d;
  const str=a=>a.d===1n?String(a.n):a.n+'/'+a.d;
  const Z=rat(0),O=rat(1);
  const poly=(a=Z,b=Z)=>({a,b});
  const plus=(p,q)=>poly(add(p.a,q.a),add(p.b,q.b));
  const scale=(p,r)=>poly(mul(p.a,r),mul(p.b,r));
  const same=(p,q)=>eq(p.a,q.a)&&eq(p.b,q.b);
  function parse(source) {
    const s=String(source).trim().replace(/[−－]/g,'-').replace(/×/g,'*').replace(/÷/g,'/').replace(/（/g,'(').replace(/）/g,')');
    if(!s||s.length>256)fail('表达式为空或过长。');
    if(!/^[\d.x+*/()\s-]+$/.test(s))fail('只使用数字、x、括号和 + - * /，不要输入其他字母或乘方。');
    const tokens=s.match(/(?:\d+(?:\.\d+)?|\.\d+)|[x+*/()-]/g)||[];
    if(tokens.join('')!==s.replace(/\s/g,''))fail('数字或小数点格式不正确。');
    if(tokens.length>120)fail('表达式过长。');
    let i=0,depth=0;
    function atom(){
      if(++depth>16)fail('括号嵌套太深。');
      const t=tokens[i++];let p;
      if(t==='+'||t==='-'){p=atom();if(t==='-')p=scale(p,rat(-1));}
      else if(t==='x')p=poly(O,Z);
      else if(t==='('){p=sum();if(tokens[i++]!==')')fail('括号没有配对。');}
      else if(t&&/^(?:\d|\.)/.test(t))p=poly(Z,rat(t));
      else fail('表达式缺少数字或括号。');
      depth--;return p;
    }
    function product(){
      let p=atom();
      while(i<tokens.length){
        let op=tokens[i];
        if(op==='*'||op==='/')i++;else if(op==='x'||op==='(')op='*';else break;
        const q=atom();
        if(op==='/'){if(q.a.n)fail('本章操作台不接受未知数作分母。');p=scale(p,div(O,q.b));}
        else {if(p.a.n&&q.a.n)fail('相乘后出现二次项，超出一元一次范围。');p=poly(add(mul(p.a,q.b),mul(q.a,p.b)),mul(p.b,q.b));}
      }return p;
    }
    function sum(){let p=product();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],q=product();p=plus(p,op==='-'?scale(q,rat(-1)):q);}return p;}
    const p=sum();if(i!==tokens.length)fail('表达式格式不完整。');return p;
  }
  function equation(s){const parts=String(s).split('=');if(parts.length!==2||!parts.every(p=>p.trim()))fail('方程需要且只能有一个等号。');return {left:parse(parts[0]),right:parse(parts[1]),raw:parts.map(p=>p.trim())};}
  function format(p){
    let s='';if(p.a.n)s=eq(p.a,O)?'x':eq(p.a,rat(-1))?'-x':str(p.a)+'x';
    if(p.b.n)s+=(s?(p.b.n<0n?' - ':' + '):p.b.n<0n?'-':'')+str(fraction(abs(p.b.n),p.b.d));return s||'0';
  }
  function solve(s){const {left:l,right:r}=equation(s),a=sub(l.a,r.a),b=sub(r.b,l.b);return !a.n?{kind:b.n?'none':'identity'}:{kind:'unique',value:div(b,a)};}
  function equivalent(s,t){const a=solve(s),b=solve(t);return a.kind===b.kind&&(a.kind!=='unique'||eq(a.value,b.value));}
  function transform(s,op,arg=''){
    const e=equation(s);let {left,right}=e;let preview;
    if(op==='simplify')preview='合并或展开两边，但不改变任何一边的值。';
    else if(op==='add'||op==='sub'){
      const p=parse(arg);if(!p.a.n&&!p.b.n)fail('加减0不会让方程前进一步，请选择有作用的操作。');
      const change=op==='sub'?scale(p,rat(-1)):p;left=plus(left,change);right=plus(right,change);
      const symbol=op==='sub'?'-':'+';preview=e.raw.map(x=>'('+x+') '+symbol+' ('+arg+')').join(' = ');
    }else if(op==='mul'||op==='div'){
      const p=parse(arg);if(p.a.n)fail('本章只允许两边同乘或同除一个非零常数。');
      if(!p.b.n)fail(op==='mul'?'两边乘0会丢失原方程的信息，不能作为等价求解步骤。':'不能除以0。');
      if(eq(p.b,O))fail('乘除1不会改变方程，请换一个操作。');
      const factor=op==='div'?div(O,p.b):p.b;left=scale(left,factor);right=scale(right,factor);
      preview=e.raw.map(x=>'('+x+') '+(op==='mul'?'×':'÷')+' ('+arg+')').join(' = ');
    }else fail('请选择合法操作。');
    return {left,right,preview,text:format(left)+' = '+format(right)};
  }
  function checkStep(s,op,arg,next){try{const t=transform(s,op,arg),n=equation(next);return {ok:same(t.left,n.left)&&same(t.right,n.right),message:'下一行必须准确表示你所选的这一步；检查两边、括号和每一项。',expected:t.text};}catch(e){return {ok:false,message:e.message};}}
  function evaluate(p,x){return add(mul(p.a,x),p.b);}
  function verify(original,value,left,right){try{const e=equation(original),x=rat(value),l=evaluate(e.left,x),r=evaluate(e.right,x);return eq(l,r)&&eq(l,rat(left))&&eq(r,rat(right));}catch{return false;}}
  function isIsolated(s){try{const e=equation(s),[l,r]=e.raw.map(x=>x.replace(/\s/g,''));if(l==='x'){rat(r);return true;}if(r==='x'){rat(l);return true;}return false;}catch{return false;}}
  function recurring(whole,pre,repeat){
    for(const s of [whole,repeat])if(!/^\d{1,6}$/.test(String(s)))fail('整数部分和循环节需要1到6位数字。');
    if(!/^\d{0,6}$/.test(String(pre)))fail('非循环部分最多6位数字。');
    const low=10n**BigInt(pre.length),high=low*10n**BigInt(repeat.length);
    const difference=BigInt(whole+pre+repeat)-BigInt(whole+pre);
    return {low:str(fraction(low)),high:str(fraction(high)),coefficient:str(fraction(high-low)),difference:String(difference),value:fraction(difference,high-low)};
  }
  function tariff(s){let q=rat(s);if(q.n<0n)fail('用量不能为负。');let total=Z;
    for(const [limit,rate]of [[10,2],[10,3]]){const chunk=q.n>BigInt(limit)*q.d?rat(limit):q;total=add(total,mul(chunk,rat(rate)));q=sub(q,chunk);}
    return add(total,mul(q,rat(5)));
  }
  const lever=(ln,ld,rn,rd)=>Math.sign(ln*ld-rn*rd);
  globalThis.EquationMath=Object.freeze({rat,add,sub,mul,div,eq,str,neg,parse,equation,format,solve,equivalent,transform,checkStep,evaluate,verify,isIsolated,recurring,tariff,lever});
})();
