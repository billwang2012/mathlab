(() => {
'use strict';
const E=EquationMath,need=(v,m)=>{if(!v)throw Error(m);},d=(s,k)=>s.drafts?.[k]||'';
const numeric=(a,b)=>{try{return E.eq(E.rat(a),E.rat(b));}catch{return false;}};
const expression=(a,b)=>{try{const p=E.parse(a),q=E.parse(b);return E.eq(p.a,q.a)&&E.eq(p.b,q.b);}catch{return false;}};
const stage=(id,title,fields=[id],action='')=>({id,title,fields,action});
function solved(q,s){try{return E.isIsolated(s.history.at(-1)?.equation||'')&&(!s.balance||BalanceMath.finishable(s.balance))&&!s.balanceWork;}catch{return false;}}
function verify(q){return [stage('value','先填你求出的 x'),stage('sides','同时代入原式两边，比较计算结果',['leftValue','rightValue'],q.type==='word'?'':'verify'),...(q.type==='word'?[stage('reality','回到题目，答案有实际意义吗？',undefined,'verify')]:[])];}
function steps(q,s){
 if(q.type==='concept')return [stage('choice','先判断它属于哪一类'),stage('reason','你判断的依据是什么？',undefined,'choice')];
 if(q.type==='balance')return [stage('property','先亲手看一看变化',['propertySample']),stage('choice','根据刚才的观察作判断',undefined,'choice')];
 if(q.type==='model')return q.id==='e-flow'?[stage('flowOrder','依次点击卡片，排出建模过程',undefined,'choice')]:[...(q.id==='d-plan-compare'?[stage('compare','比较不同使用时长的费用',['compareHours'])]:[]),stage('choice','哪一种判断符合题目条件？',undefined,'choice')];
 if(q.type==='word'&&!s.modelBuilt)return [stage('definition','先给 x 一个明确的含义'),...q.fields.map((f,i)=>stage('quantity'+i,'用 x 表示：'+f.label)),stage('relation','用哪两个量相等来连接？'),stage('modelEquation','根据数量关系写出方程',undefined,'model-build')];
 if(q.type==='equation'||q.type==='word')return solved(q,s)?verify(q):[stage('solve','每次只做一个你能解释的操作',[],'')];
 if(q.type==='substitute')return [stage('trial','先试一个数，观察两边',['guess']),...verify(q)];
 if(q.type==='decimal')return [stage('align','移动两行小数点，让尾巴一样',['high','low']),stage('coefficient','相减后还剩多少个 x？'),stage('difference','右边的整数相减是多少？'),stage('fraction','用整数差除以系数，再约分',undefined,'decimal')];
 if(q.type==='tariff')return [stage('explore','先看看每一档怎样累计收费',['exploreUsage']),stage('segment','账单落在哪个费用区间？'),stage('billEquation','只把新增用量按新价格计算'),stage('usage','解出的用量还在这一档吗？',undefined,'tariff')];
 if(q.type==='lever')return [stage('observe','点击刻度，把右边重物移一移',['distance']),stage('leverEquation','怎样把数量与距离连成方程？'),stage('leverAnswer','算出距离，再代回两边检查',undefined,'lever')];
 throw Error('此活动暂未配置学习步骤。');
}
function context(q,s){return JSON.stringify([q.id,s.modelBuilt===true,s.history?.at(-1)?.equation||'',s.aligned===true]);}
function signature(q,s,ls,i){return JSON.stringify([context(q,s),ls.slice(0,i+1).flatMap(x=>x.fields.map(k=>[k,d(s,k)])),s.flowExplored===true,s.propertySeen===true]);}
function restore(raw){if(raw==null)return {passed:[]};need(raw&&Array.isArray(raw.passed)&&raw.passed.length<=20,'分步记录不正确。');return {passed:raw.passed.map(x=>{need(x&&typeof x.id==='string'&&/^[a-zA-Z][a-zA-Z0-9]{0,30}$/.test(x.id)&&typeof x.signature==='string'&&x.signature.length<12000,'分步记录不正确。');return {id:x.id,signature:x.signature};})};}
function current(q,s){const ls=steps(q,s),saved=restore(s.flow).passed;let index=0;for(;index<ls.length-1;index++){if(saved[index]?.id!==ls[index].id||saved[index]?.signature!==signature(q,s,ls,index))break;}return {...ls[index],index,total:ls.length};}
function validate(q,s,step){const id=step.id,v=d(s,id);
 if(id==='solve')need(solved(q,s),'先让 x 单独留下，再检验。');
 else if(id==='choice')need(v===q.answer,'先看题目条件，再选一张卡片。这个判断还不正确。');
 else if(id==='reason')need(v===q.reason,'判断对了，但这个理由还不对应。再检查等号、未知数和次数。');
 else if(id==='property')need(s.propertySeen,'先点击一次实验按钮，观察变化。');
 else if(id==='compare')need(!!s.comparison,'先点击一个时长，比较这次两种费用。');
 else if(id==='flowOrder')need(v==='0,1,2,3','先从实际问题出发，再找数量关系、求解，最后回到现实检验。');
 else if(id==='definition')need(v===q.definition,'x应该表示题目中需要求出的一个量，还要有单位。');
 else if(/^quantity\d+$/.test(id)){const f=q.fields[Number(id.slice(8))];need(expression(v,f.answer),'“'+f.label+'”还没表示正确，检查题目中的倍数、总量与单位。');}
 else if(id==='relation')need(v===q.relation,'这个相等关系没有连接题目中的数量，请再看“总共、相同、配套”等条件。');
 else if(id==='modelEquation')need(E.equivalent(v,q.equation),'所列方程还没有表达刚才的相等关系。');
 else if(id==='trial')need(!!s.trial,'先填一个试验值，点击“放进去看看”。');
 else if(id==='value'){const e=E.equation(q.equation),x=E.rat(v);need(E.eq(E.evaluate(e.left,x),E.evaluate(e.right,x)),'这个数代回原式，两边还不一样。重新检查求解或试值。');}
 else if(id==='sides'){const e=E.equation(q.equation),x=E.rat(d(s,'value'));for(const side of ['left','right'])need(numeric(d(s,side+'Value'),E.str(E.evaluate(e[side],x))),'原式'+(side==='left'?'左':'右')+'边的代入结果未填写或计算不正确，请检查对应栏的负号和括号。');}
 else if(id==='reality')need(v===q.reality,'再看数量能否为分数、范围和单位是否合理，不能随意四舍五入。');
 else if(id==='align'){const hi=Number(d(s,'high')),lo=Number(d(s,'low'));need([1,10,100,1000].includes(hi)&&[1,10,100,1000].includes(lo)&&hi>lo&&s.aligned&&Math.log10(lo)>=q.pre.length&&(Math.log10(hi)-Math.log10(lo))%q.repeat.length===0,'先移动并观察，让小数点后的循环尾巴完全一样。');}
 else if(['coefficient','difference','fraction'].includes(id)){const co=E.sub(E.rat(d(s,'high')),E.rat(d(s,'low'))),value=E.recurring(q.whole,q.pre,q.repeat).value,expected=id==='coefficient'?co:id==='difference'?E.mul(co,value):value;need(numeric(v,E.str(expected)),'这一步还没有算对，看看两行相减时什么保留下来。');if(id==='fraction')need(v.replace(/\s/g,'')===E.str(value),'数值正确，再把它写成最简分数。');}
 else if(id==='explore')need(s.flowExplored,'先点一个用量或拖动滑块，看看三档费用怎样累计。');
 else if(id==='segment'){const bill=E.rat(q.bill),seg=E.sub(bill,E.rat(20)).n<=0n?'1':E.sub(bill,E.rat(50)).n<=0n?'2':'3';need(v===seg,'先比账单与20元、50元两个界限。边界20属于第一档，50属于第二档。');}
 else if(id==='billEquation'){const seg=d(s,'segment'),eq=seg==='1'?'2x='+q.bill:seg==='2'?'20+3(x-10)='+q.bill:'50+5(x-20)='+q.bill;need(E.equivalent(v,eq),'已经用完的档位先累计，只有超过部分用新的单价。');}
 else if(id==='usage')need(E.rat(v).n>=0n&&numeric(E.str(E.tariff(v)),q.bill),'这个用量代入分档收费后，与账单不相同。');
 else if(id==='observe')need(s.observations?.length,'先点击一个刻度并记录观察。');
 else if(id==='leverEquation')need(E.equivalent(v,q.leftCount*q.leftDistance+'='+q.rightCount+'x'),'比较左边的数量×距离与右边的数量×距离。');
 else if(id==='leverAnswer')need(numeric(v,q.answer),'代回两侧的数量×距离，看看是否相等。');
 else throw Error('找不到这一步的检查方法。');
}
function confirm(q,s){const step=current(q,s);validate(q,s,step);const ls=steps(q,s),passed=restore(s.flow).passed.slice(0,step.index);passed.push({id:step.id,signature:signature(q,s,ls,step.index)});return {flow:{passed},action:step.action,index:step.index};}
function rewind(q,s){const at=current(q,s).index;return {passed:restore(s.flow).passed.slice(0,Math.max(0,at-1))};}
function invalidate(q,s,name){const ls=steps(q,s),at=ls.findIndex(x=>x.fields.includes(name));if(at>=0&&s.flow)s.flow.passed=s.flow.passed.slice(0,at);}
function prerequisites(q,s){const id=q.type==='substitute'?'trial':q.type==='balance'?'property':q.id==='d-plan-compare'?'compare':q.id==='e-flow'?'flowOrder':q.type==='tariff'?'explore':q.type==='decimal'?'align':q.type==='lever'?'observe':null;if(id)validate(q,s,{id});}
globalThis.LessonFlow=Object.freeze({steps,current,confirm,restore,rewind,invalidate,solved,validate,prerequisites});
})();
