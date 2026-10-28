(function(root){
  'use strict';
  const defaults=Object.freeze({mode:'forward',monthly:10000,capital:600,children:0,childCost:58,health:30,housing:0,assets:0,rateMode:'video',nominal:4.5,inflation:2});
  const fields={monthly:[0,10000000],capital:[0,10000000],children:[0,20],childCost:[0,1000000],health:[0,1000000],housing:[0,1000000],assets:[0,10000000],nominal:[-100,100],inflation:[-10,100]};
  function calculate(raw){
    const s={...defaults,...raw},errors=[];
    const inactive=new Set(s.mode==='reverse'?['monthly','assets']:['capital']);
    if(s.rateMode!=='custom'){inactive.add('nominal');inactive.add('inflation');}
    if(Number(s.children)===0)inactive.add('childCost');
    for(const [key,[min,max]] of Object.entries(fields)){
      if(inactive.has(key)){s[key]=defaults[key];continue;}
      const value=s[key];
      if(value===''||value===null||typeof value==='boolean'||!Number.isFinite(Number(value))||Number(value)<min||Number(value)>max) errors.push(key);
      else s[key]=Number(value);
    }
    if(!Number.isInteger(s.children)&&!errors.includes('children'))errors.push('children');
    if(!['video','cautious','custom'].includes(s.rateMode))errors.push('rateMode');
    if(!['forward','reverse'].includes(s.mode))errors.push('mode');
    if(errors.length)return {valid:false,reason:'input',errors};
    const rate=s.rateMode==='video'?.025:s.rateMode==='cautious'?.02:(s.nominal-s.inflation)/100;
    const childBudget=s.children*s.childCost*10000,healthBudget=s.health*10000,capitalBudget=s.housing*10000,extras=childBudget+healthBudget+capitalBudget;
    if(rate<=0||!Number.isFinite(12/rate))return {valid:false,reason:'rate',errors:[],rate,extras};
    const multiplier=12/rate,daily=s.monthly*multiplier,target=daily+extras,available=s.capital*10000-extras;
    return {valid:true,state:s,rate,multiplier,childBudget,healthBudget,capitalBudget,extras,daily,target,available,affordable:Math.max(0,available)/multiplier,reserveShortfall:Math.max(0,-available),assets:s.assets*10000,gap:Math.max(0,target-s.assets*10000),progress:target>0?s.assets*10000/target:(s.assets>0?1:0)};
  }
  const api={defaults,fields,calculate};root.FreedomModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
