const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = __dirname;

const candidate = fs.readFileSync(path.join(root,'../index.html'),'utf8');

const pricePattern = /const PRICES = (\{[\s\S]*?\n\});/;

function makeContext(search='') {
  const nodes = new Map();
  function element(id) {
    if (!nodes.has(id)) nodes.set(id,{value:'',textContent:'',style:{},children:[],attributes:{},
      addEventListener(){}, querySelector(){return element(id+':swatch');},
      setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];if(k==='href') delete this.href;},
      replaceChildren(){this.children=[];},appendChild(x){this.children.push(x);}});
    return nodes.get(id);
  }
  const data = new Map();
  const ctx=vm.createContext({document:{getElementById:element,createElement:()=>({})},
    localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},
    URL,URLSearchParams,location:{search}});
  vm.runInContext(candidate.match(/<script>([\s\S]*?)<\/script>/)[1],ctx);
  return {ctx,element,data,run:s=>vm.runInContext(s,ctx)};
}
const env=makeContext();
const records=env.run('ATLAS_COLORS');
const prices=env.run('PRICES');
assert.equal(Object.keys(records).length,2272);
assert.equal(Object.values(records).filter(x=>x.palette==='ncs').length,2048);
assert.equal(Object.values(records).filter(x=>x.palette==='fox').length,224);
for(const raw of ['1305-B34G','S 1305-B34G','H491','H4091','S 0602-G92Y','S 1505-B99G','S 0500-Y','S 1002-N','S 0502-Y22','NCS 013','S013','225','0','S 9000-N99','0502','9000','<img src=x onerror=alert(1)>','__proto__','constructor']) {
  assert.equal(env.run(`lookupColor(${JSON.stringify(raw)})`),null,raw);
}
for(const [raw,want] of [['1505b20g','S 1505-B20G'],['ncs s 1505–b20g','S 1505-B20G'],[' 13 ','013'],['1','001'],['224','224'],['9000n','S 9000-N']]) {
  assert.equal(env.run(`lookupColor(${JSON.stringify(raw)}).code`),want,raw);
}
const expectedPrices=[['147,25','220,00','349,58'],['172,17','257,58','409,25'],['197,08','295,08','468,33'],['220,83','330,92','525,67'],['246,23','368,33','584,17'],['272,00','406,00','643,00']];
for (let g=1;g<=6;g++) assert.deepEqual(Array.from(['p25','p5','p10'],k=>prices[g][k]),expectedPrices[g-1]);
for (const row of Object.values(records)) {
  env.element('ncsInput').value=row.code;env.run('calculatePrice()');
  for(const [sz,pid,bid,key,linkKey] of [[2.5,'price25','buyLink25','p25','link25'],[5,'price5','buyLink5','p5','link5'],[10,'price10','buyLink10','p10','link10']]) {
    const button=env.element(bid);
    if(row.group===null || (sz===2.5&&row.blocked25)) assert.equal(button.href,undefined,row.code+' disabled '+sz);
    else {
      assert.equal(env.element(pid).textContent,prices[row.group][key]);
      const url=new URL(button.href);assert.equal(url.searchParams.get('ncs'),row.code);
      assert.equal(url.pathname,new URL(prices[row.group][linkKey]).pathname);
    }
  }
}
for(const [code,group] of [['013',1],['074',1],['S 1505-B20G',1],['S 0300-N',4],['S 9000-N',4],['120',null],['S 5040-R20B',null]]) assert.equal(env.run(`lookupColor(${JSON.stringify(code)}).group`),group);
env.data.set('ncs_recent_v1',JSON.stringify(['1305-B34G','<script>x</script>',13,null,'S 1505-B20G']));
for(const q of ['','0502','9000','1505-b','S 3040','13']) for(const result of env.run(`buildSuggestions(${JSON.stringify(q)})`)) assert(env.run(`lookupColor(${JSON.stringify(result)})`));
env.element('ncsInput').value='1305-B34G';env.run('calculatePrice()');
assert.equal(env.element('result').style.display,'none');
for(const id of ['buyLink25','buyLink5','buyLink10']) assert.equal(env.element(id).href,undefined,'No stale checkout URL');
assert.equal(makeContext('?ncs=1305-B34G').element('result').style.display,'none');
assert.equal(makeContext('?ncs=013').element('result').style.display,'block');
assert.equal(records['S3040-B'].manualReason,'multiple_bases');
console.log('PASS: 2272 unique codes, all group prices, product links, normalized and invalid inputs, manufacturer restrictions, 3-size links, deep links, suggestions, recent-input injection and stale links.');
