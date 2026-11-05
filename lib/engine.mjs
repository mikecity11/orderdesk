export const products = [
 ['KT-01','Forma electric kettle','Home',49,0,2,'KT-02'],['KT-02','Forma Plus kettle','Home',55,5,3,null],
 ['RC-01','Long grain rice · 5 kg','Grocery',14,30,18,null],['ML-01','Whole milk · carton','Grocery',18,20,12,null],
 ['SH-01','Oxford shirt · blue / L','Clothing',32,8,6,null],['SH-02','Oxford shirt · white / L','Clothing',32,7,4,null],
 ['TW-01','Cotton towel set','Home',24,14,8,null],['HP-01','Wireless headphones','Electronics',79,6,4,null],
 ['OL-01','Olive oil · 1 litre','Grocery',12,19,10,null],['CF-01','Ground coffee · 500 g','Grocery',16,12,8,null],
 ['SN-01','Everyday sneakers · 42','Clothing',58,5,3,null],['TS-01','Cotton T-shirt · M','Clothing',19,15,10,null],
 ['BT-01','Bluetooth speaker','Electronics',45,6,3,null],['CB-01','USB-C charging cable','Electronics',9,20,16,null],
 ['PN-01','Non-stick frying pan','Home',35,7,5,null],['DT-01','Laundry detergent · 2 L','Home',11,17,9,null],
 ['AP-01','Apples · 1 kg','Grocery',5,24,18,null],['BR-01','Wholegrain bread','Grocery',4,18,12,null],
 ['JN-01','Straight jeans · 32','Clothing',44,8,6,null],['CH-01','Fast charger · 30 W','Electronics',22,10,6,null]
].map(([sku,name,department,price,central,riverside,alternative])=>({sku,name,department,price,stock:{central,riverside},alternative}));
const lists=[['KT-01','RC-01','ML-01'],['KT-01','SH-01'],['KT-01','HP-01','TW-01'],['KT-01','CF-01'],['RC-01','AP-01','BR-01'],['JN-01','TS-01'],['BT-01','CB-01'],['PN-01','DT-01','OL-01']];
export function seed(){return {version:1,revision:0,incident:null,inventory:structuredClone(products),orders:lists.map((skus,i)=>({id:`OD-${1041+i}`,customer:['Alex Morgan','Jordan Lee','Sam Taylor','Casey Chen','Robin Blake','Jamie Park','Drew Ellis','Avery James'][i],due:45+i*20,items:skus.map(sku=>({sku,qty:1})),status:'Picking',resolution:null})),events:[],messages:[]};}
export function money(n){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);}
export function total(state,order){return order.items.reduce((s,i)=>s+state.inventory.find(p=>p.sku===i.sku).price*i.qty,0);}
function log(s,actor,text){s.events.unshift({id:crypto.randomUUID(),at:new Date().toISOString(),actor,text});}
export function metrics(s){let affected=s.orders.filter(o=>o.resolution);return {affected:affected.length,recovered:affected.filter(o=>o.status==='Ready to dispatch').length,atRisk:affected.filter(o=>!['Ready to dispatch','Cancelled'].includes(o.status)).reduce((a,o)=>a+total(s,o),0),cost:affected.filter(o=>o.resolution.kind==='transfer'&&o.resolution.manager==='approved').reduce((a,o)=>a+o.resolution.cost,0)};}
export function apply(input,action){const s=structuredClone(input);if(!action||typeof action.type!=='string')throw Error('An action type is required.');
 const actor=action.actor||'Demo operator';
 if(action.type==='report'){
  if(s.incident?.status==='open')throw Error('Resolve the current incident before reporting another.');
  const p=s.inventory.find(p=>p.sku===action.sku);if(!p)throw Error('Choose a valid product.');
  const qty=Number(action.quantity);if(!Number.isInteger(qty)||qty<1||qty>1000)throw Error('Quantity must be a whole number between 1 and 1,000.');
  const affected=s.orders.filter(o=>o.items.some(i=>i.sku===p.sku)&&o.status==='Picking');if(!affected.length)throw Error('No active orders contain this product.');
  s.incident={id:`INC-${s.events.length+101}`,sku:p.sku,quantity:qty,reason:String(action.reason||'Damaged stock').slice(0,500),status:'open',planned:false};
  p.stock.central=0;affected.forEach(o=>o.status='At risk');log(s,actor,`${qty} units of ${p.name} unavailable at Central. ${affected.length} orders placed on hold.`);
 }else if(action.type==='plan'){
  if(!s.incident||s.incident.status!=='open')throw Error('Report a stock incident first.');if(s.incident.planned)throw Error('A recovery plan already exists.');
  const p=s.inventory.find(p=>p.sku===s.incident.sku);let available=p.stock.riverside;const alt=s.inventory.find(x=>x.sku===p.alternative);let altAvailable=alt?.stock.central||0;
  for(const o of [...s.orders].sort((a,b)=>a.due-b.due)){
   if(o.status!=='At risk')continue;const line=o.items.find(i=>i.sku===p.sku);
   if(available>=line.qty){available-=line.qty;p.stock.riverside-=line.qty;o.resolution={kind:'transfer',sku:p.sku,qty:line.qty,cost:6,branch:'pending',manager:'pending',picked:false,reason:'Original item available at Riverside. Earliest delivery promises receive transfer stock first.'};}
   else if(alt&&altAvailable>=line.qty){altAvailable-=line.qty;alt.stock.central-=line.qty;o.resolution={kind:'substitute',sku:alt.sku,qty:line.qty,cost:(alt.price-p.price)*line.qty,customer:'pending',picked:false,reason:`Same product type; ${money((alt.price-p.price)*line.qty)} price difference. Customer consent is required.`};}
   else o.resolution={kind:'partial',sku:p.sku,qty:line.qty,cost:0,customer:'pending',picked:false,reason:'No original or configured compatible replacement remains. Offer removal with an item refund.'};
   o.status='Awaiting approval';
  }
  s.incident.planned=true;log(s,'Recovery planner','Recovery options calculated from inventory and delivery priority. Stock reserved; no transfer or substitution executed.');
 }else{
  const o=s.orders.find(o=>o.id===action.orderId);if(!o||!o.resolution)throw Error('Choose an order with a recovery plan.');const r=o.resolution;
  if(['Ready to dispatch','Cancelled'].includes(o.status))throw Error('This order is already closed.');
  if(action.type==='branch-confirm'){
   if(r.kind!=='transfer'||r.branch!=='pending')throw Error('This transfer does not need confirmation.');r.branch='confirmed';log(s,actor,`${o.id}: Riverside physically confirmed and reserved ${r.qty} unit(s).`);
  }else if(action.type==='manager-approve'){
   if(r.kind!=='transfer'||r.manager!=='pending')throw Error('This transfer does not need manager approval.');r.manager='approved';log(s,actor,`${o.id}: transfer expense ${money(r.cost)} approved.`);
  }else if(action.type==='customer-approve'){
   if(!['substitute','partial'].includes(r.kind)||r.customer!=='pending')throw Error('This order does not need customer approval.');r.customer='approved';log(s,actor,`${o.id}: customer approved ${r.kind==='substitute'?'replacement and '+money(r.cost)+' price difference':'item removal and refund of '+money(s.inventory.find(p=>p.sku===r.sku).price*r.qty)}.`);
  }else if(action.type==='customer-decline'){
   if(r.kind!=='substitute'||r.customer!=='pending')throw Error('Only a pending replacement can be declined.');s.inventory.find(p=>p.sku===r.sku).stock.central+=r.qty;
   o.resolution={kind:'partial',sku:s.incident.sku,qty:r.qty,cost:0,customer:'pending',picked:false,reason:'Customer declined replacement. Reserved replacement released. Item removal and refund now requires approval.'};log(s,actor,`${o.id}: replacement declined; inventory released and recovery replanned to partial fulfilment.`);
  }else if(action.type==='pick'){
   if(!approved(r))throw Error('Required approvals are still missing.');if(r.picked)throw Error('Recovery picking is already complete.');r.picked=true;log(s,actor,`${o.id}: ${r.kind==='partial'?'remaining items packed; refund recorded (demo, no payment processed)':'recovery item received and packed'}.`);
  }else if(action.type==='dispatch'){
   if(!approved(r)||!r.picked)throw Error('Complete approvals and packing before dispatch.');o.status='Ready to dispatch';log(s,actor,`${o.id}: recovery complete; order released for dispatch.`);
  }else throw Error('Unknown action.');
  if(o.status!=='Ready to dispatch')o.status=approved(o.resolution)?'Ready to pick':'Awaiting approval';
  if(s.orders.filter(o=>o.resolution).every(o=>o.status==='Ready to dispatch')){s.incident.status='resolved';log(s,'OrderDesk','All affected orders recovered. Incident resolved.');}
 }
 s.revision++;return s;
}
export function approved(r){return r.kind==='transfer'?r.branch==='confirmed'&&r.manager==='approved':r.customer==='approved';}
export function summary(s){const m=metrics(s);return `OrderDesk ${s.incident?.id||'workspace'}: ${m.affected} affected; ${m.recovered} ready for dispatch; ${money(m.atRisk)} order value still at risk.\n`+s.orders.filter(o=>o.resolution).map(o=>`${o.id}: ${o.resolution.kind}, ${o.status}. ${o.resolution.reason}`).join('\n');}
