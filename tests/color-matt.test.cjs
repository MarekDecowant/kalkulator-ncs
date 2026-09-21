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
    if (!nodes.has(id)) nodes.set(id,{value:'',textContent:'',style:{},children:[],attributes:{},listeners:{},
      addEventListener(type,listener){(this.listeners[type] ||= []).push(listener);}, querySelector(){return element(id+':swatch');},
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
    if(row.group===null) assert.equal(button.href,undefined,row.code+' disabled '+sz);
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
for (const code of ['001','002','S 0500-N']) {
  env.element('ncsInput').value=code;env.run('calculatePrice()');
  assert(env.element('buyLink25').href,code+' available in 2.5L');
  assert.equal(env.element('price25').textContent,prices[env.run(`lookupColor(${JSON.stringify(code)}).group`)].p25);
}
assert(!candidate.includes('Niedostępne 2,5 l'));
assert(!candidate.includes('Baza Atlas wyklucza'));
assert(Object.values(records).every(row=>!('blocked25' in row)));
// Quantity advice: both coat choices, Polish decimals, pack boundaries and invalid input.
for (const [area,coats,litres,order] of [['35',1,2.5,2.5],['35',2,5,5],['70',1,5,5],['70',2,10,10],[' 42,5 ',2,85/14,7.5],['42.5',2,85/14,7.5],['70.001',2,140.002/14,12.5],['140',2,20,20],['0,01',1,0.01/14,2.5]]) {
  const q=env.run(`calculatePaintQuantity(${JSON.stringify(area)},${coats})`);
  assert.equal(q.litres,litres);
  assert.equal(q.orderLitres,order);
  assert.equal(q.packs.reduce((sum,p)=>sum+p.size*p.count,0),order);
  assert(order>=litres && order-litres<2.5);
}
assert.equal(JSON.stringify(env.run('calculatePaintQuantity("42,5",2).packs')),JSON.stringify([{size:5,count:1},{size:2.5,count:1}]));
for (const raw of ['', ' ', '0', '-2', 'NaN', 'Infinity', '1e5', '42m2', '1,2,3', '1.2.3', '<script>', '9'.repeat(400)]) {
  assert.equal(env.run(`calculatePaintQuantity(${JSON.stringify(raw)},2)`),null,raw);
}
for (const coats of [0,3,-1,1.5]) assert.equal(env.run(`calculatePaintQuantity('35',${coats})`),null);

// Optional fields cannot block color lookup, alter prices or leave stale advice.
assert.equal(env.element('paintQuantityResult').hidden,true);
env.element('ncsInput').value='013';env.run('calculatePrice()');
const purchaseIds=['price25','price5','price10','buyLink25','buyLink5','buyLink10'];
const purchaseState=()=>JSON.stringify(purchaseIds.map(id=>({text:env.element(id).textContent,href:env.element(id).href})));
const before=purchaseState();
env.element('paintCoats').value='2';
env.element('paintArea').value='42,5';
env.element('paintArea').listeners.input[0]();
assert.equal(env.element('paintQuantityResult').hidden,false);
assert.equal(env.element('paintLitres').textContent,'Orientacyjne zużycie: 6,08 l');
assert.match(env.element('paintPacks').textContent,/1 × 5 l \+ 1 × 2,5 l/);
env.element('paintCoats').value='1';env.element('paintCoats').listeners.change[0]();
assert.equal(env.element('paintLitres').textContent,'Orientacyjne zużycie: 3,04 l');
assert.equal(purchaseState(),before);
env.element('ncsInput').value='1305-B34G';env.run('calculatePrice()');
assert.equal(env.element('paintQuantityResult').hidden,false,'Advice survives unavailable color');
env.element('paintArea').value='-1';env.element('paintArea').listeners.input[0]();
assert.equal(env.element('paintQuantityResult').hidden,true);
assert.equal(env.element('paintLitres').textContent,'');
assert.equal(env.element('paintArea').attributes['aria-invalid'],'true');
env.element('ncsInput').value='013';env.run('calculatePrice()');
assert.equal(purchaseState(),before,'Invalid optional area does not block pricing');
env.element('paintArea').value='';env.element('paintArea').listeners.input[0]();
assert.equal(env.element('paintQuantityResult').hidden,true);
assert.equal(env.element('paintAreaError').textContent,'');
assert.equal(env.element('paintArea').attributes['aria-invalid'],undefined);
assert.equal(purchaseState(),before);
const colorForm=candidate.match(/<form id="calcForm"[\s\S]*?<\/form>/)[0];
assert(!colorForm.includes('paintArea'));
assert(!candidate.match(/<input[^>]+id="paintArea"[^>]*>/)[0].includes('required'));
assert.match(candidate,/<option value="2" selected>2 warstwy<\/option>/);
console.log('PASS: 2272 codes, unchanged group prices, 3-size links, validation, deep links and independent optional paint advice (1/2 coats, decimals, rounding, packaging, blank/invalid inputs and events).');
