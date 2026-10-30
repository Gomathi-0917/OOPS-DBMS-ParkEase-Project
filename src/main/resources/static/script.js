const $=id=>document.getElementById(id);
async function api(path,options={}){const r=await fetch('/api/'+path,{headers:{'Content-Type':'application/json'},...options});const data=await r.json();if(!r.ok)throw Error(data.error||'Request failed');return data}
function show(id,text,error=false){const el=$(id);el.textContent=text;el.classList.toggle('error',error);el.classList.toggle('success',!error&&Boolean(text))}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function date(value){return value?new Date(value).toLocaleString():'-'}
const rates={BIKE:10,CAR:30,TRUCK:60};
let historyData=[];
let toastTimer;
let soundEnabled=true;
let audioContext;
let billLookupTimer;
let billRequestId=0;
let billTicket=null;

function showToast(message,error=false){
  const toast=$('toast');
  toast.textContent=message;
  toast.classList.toggle('error',error);
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove('visible'),3600);
}
function renderHistory(){
  const query=$('historySearch').value.trim().toUpperCase();
  const rows=historyData.filter(x=>String(x.plate).toUpperCase().includes(query));
  $('historyRows').innerHTML=rows.length?rows.map(x=>`<tr><td>#${esc(x.ticketNo)}</td><td><b>${esc(x.plate)}</b></td><td>${esc(x.owner)}</td><td><span class="type-pill type-${esc(String(x.type).toLowerCase())}">${esc(x.type)}</span></td><td>${esc(x.slot)}</td><td>${esc(date(x.entryTime))}</td><td>${esc(date(x.exitTime))}</td><td>${esc(x.hours??'-')}</td><td>${x.charge==null?'-':'Rs. '+Number(x.charge).toFixed(2)}</td><td><span class="status ${esc(String(x.status).toLowerCase())}">${esc(x.status)}</span></td></tr>`).join(''):'<tr><td colspan="10" class="empty-row">No matching tickets found.</td></tr>';
}
function updateOccupancy(slots){
  const occupied=slots.filter(x=>x.occupied).length;
  const progress=$('occupancyProgress');
  progress.style.width=(occupied/20*100)+'%';
  document.querySelector('.progress-track').setAttribute('aria-valuenow',occupied);
  $('occupiedSlots').textContent=occupied;
  const count={BIKE:0,CAR:0,TRUCK:0};
  historyData.filter(x=>x.status==='PARKED').forEach(x=>{const type=String(x.type).toUpperCase();if(Object.prototype.hasOwnProperty.call(count,type))count[type]++});
  $('bikeCount').textContent=count.BIKE;
  $('carCount').textContent=count.CAR;
  $('truckCount').textContent=count.TRUCK;
}
function renderSlots(slots){
  const bySlot=[...slots].sort((a,b)=>a.slot-b.slot);
  const ordered=[];
  for(let row=0;row<4;row++){
    const rowSlots=bySlot.slice(row*5,row*5+5);
    ordered.push(...(row%2?rowSlots.reverse():rowSlots));
  }
  $('slots').innerHTML=ordered.map(x=>{
    const ticket=historyData.find(item=>Number(item.ticketNo)===Number(x.ticketNo));
    const type=ticket?String(ticket.type).toUpperCase():'';
    const letter={BIKE:'B',CAR:'C',TRUCK:'T'}[type]||'';
    const plate=ticket?ticket.plate:x.plate;
    const owner=ticket?ticket.owner:'';
    const entryTime=ticket?date(ticket.entryTime):'';
    const label=x.occupied?`Slot ${x.slot}, occupied by ${type||'vehicle'} ${plate}`:`Slot ${x.slot}, free`;
    const details=x.occupied?`<span class="slot-details" aria-hidden="true"><b class="slot-plate">${esc(plate)}</b><span>Ticket: #${esc(x.ticketNo)}</span><span>Owner: ${esc(owner)}</span><span>Type: ${esc(type.charAt(0)+type.slice(1).toLowerCase())}</span><span>Entry: ${esc(entryTime)}</span></span>`:'';
    return `<div class="slot ${x.occupied?'busy':''} ${type==='TRUCK'?'truck-slot':''}" ${x.occupied?'data-booked-slot role="button" tabindex="0" aria-expanded="false"':''} aria-label="${esc(label)}"><span class="slot-number">${esc(x.slot)}</span><b>${x.occupied?letter:'Free'}</b>${x.occupied?`<small class="slot-ticket">#${esc(x.ticketNo)}</small>`:''}${details}</div>`;
  }).join('');
}
async function refresh(){
  const [slots,summary,history]=await Promise.all([api('slots'),api('summary'),api('history')]);
  historyData=history;
  $('parked').textContent=summary.parked;
  $('freeSlots').textContent=slots.filter(x=>!x.occupied).length;
  $('collection').textContent='Rs. '+Number(summary.collection).toFixed(2);
  updateOccupancy(slots);
  renderSlots(slots);
  renderHistory();
}
function updateClock(){
  const now=new Date();
  $('liveTime').textContent=now.toLocaleTimeString();
  $('liveDate').textContent=now.toLocaleDateString(undefined,{weekday:'short',year:'numeric',month:'short',day:'numeric'});
}
function showTicket(ticketNo,slot){
  $('ticketPanel').hidden=false;
  $('receiptPanel').hidden=true;
  $('resultDialog').setAttribute('aria-labelledby','dialogTitle');
  $('ticketNumber').textContent='#'+ticketNo;
  $('ticketSlot').textContent='Assigned slot: '+slot;
  $('resultDialog').showModal();
}
function showReceipt(ticket,exit){
  const type=String(ticket.type).toUpperCase();
  const rate=rates[type];
  if(!rate)throw Error('Could not determine the rate for this vehicle.');
  $('ticketPanel').hidden=true;
  $('receiptPanel').hidden=false;
  $('resultDialog').setAttribute('aria-labelledby','receiptTitle');
  $('receiptContent').innerHTML=[
    ['Ticket No','#'+esc(exit.ticketNo)],
    ['Plate',esc(exit.plate)],
    ['Type',esc(type.charAt(0)+type.slice(1).toLowerCase())],
    ['Hours',esc(exit.hours)],
    ['Rate','Rs. '+rate.toFixed(2)+' / hr'],
    ['Hours billed',String(exit.billableHours)],
    ...(Number(exit.extraCharge)>0?[['Extra charge','Rs. '+Number(exit.extraCharge).toFixed(2)]]:[]),
    ['Charge','Rs. '+Number(exit.charge).toFixed(2)]
  ].map(([label,value])=>`<div class="receipt-row"><span>${label}</span><b>${value}</b></div>`).join('');
  $('resultDialog').showModal();
}
function playSuccessSound(){
  if(!soundEnabled)return;
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return;
  audioContext=audioContext||new AudioContextClass();
  const start=audioContext.currentTime;
  const oscillator=audioContext.createOscillator();
  const gain=audioContext.createGain();
  oscillator.type='sine';
  oscillator.frequency.setValueAtTime(660,start);
  oscillator.frequency.setValueAtTime(880,start+0.12);
  gain.gain.setValueAtTime(0.001,start);
  gain.gain.exponentialRampToValueAtTime(0.12,start+0.025);
  gain.gain.exponentialRampToValueAtTime(0.001,start+0.34);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(start);
  oscillator.stop(start+0.35);
}
function flowerBlast(onComplete){
  const canvas=$('flowerCanvas');
  const context=canvas.getContext('2d');
  const scale=window.devicePixelRatio||1;
  canvas.width=window.innerWidth*scale;
  canvas.height=window.innerHeight*scale;
  context.scale(scale,scale);
  const colors=['#ff5c8a','#ffb627','#46cba0','#6d7cff','#d36bfa','#ff785a'];
  const particles=Array.from({length:110},()=>({
    x:window.innerWidth*(0.2+Math.random()*0.6),
    y:window.innerHeight*(0.18+Math.random()*0.42),
    vx:(Math.random()-0.5)*8,
    vy:-2-Math.random()*8,
    rotation:Math.random()*Math.PI,
    spin:(Math.random()-0.5)*0.22,
    size:4+Math.random()*6,
    color:colors[Math.floor(Math.random()*colors.length)],
    flower:Math.random()>0.45
  }));
  const started=performance.now();
  function draw(now){
    const elapsed=now-started;
    context.clearRect(0,0,window.innerWidth,window.innerHeight);
    particles.forEach(p=>{
      p.x+=p.vx;
      p.y+=p.vy;
      p.vy+=0.12;
      p.rotation+=p.spin;
      context.save();
      context.translate(p.x,p.y);
      context.rotate(p.rotation);
      context.fillStyle=p.color;
      if(p.flower){
        for(let petal=0;petal<5;petal++){
          context.rotate((Math.PI*2)/5);
          context.beginPath();
          context.ellipse(0,-p.size*0.72,p.size*0.38,p.size*0.72,0,0,Math.PI*2);
          context.fill();
        }
        context.beginPath();
        context.arc(0,0,p.size*0.22,0,Math.PI*2);
        context.fillStyle='#fff3a4';
        context.fill();
      }else{
        context.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.65);
      }
      context.restore();
    });
    if(elapsed<2000)requestAnimationFrame(draw);
    else context.clearRect(0,0,window.innerWidth,window.innerHeight);
  }
  requestAnimationFrame(draw);
  setTimeout(onComplete,2000);
}

$('historySearch').addEventListener('input',renderHistory);
$('parkForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const button=$('parkForm').querySelector('button');
  button.disabled=true;
  try{
    const type=document.querySelector('input[name="vehicleType"]:checked').value;
    const result=await api('park',{method:'POST',body:JSON.stringify({type,owner:$('owner').value,plate:$('plate').value})});
    show('parkResult',`Parked successfully - Ticket #${result.ticketNo} - Slot ${result.slot}`);
    showToast(`Vehicle parked successfully. Ticket #${result.ticketNo}`);
    $('ticket').value=result.ticketNo;
    $('parkForm').reset();
    document.querySelector('input[name="vehicleType"][value="Car"]').checked=true;
    try{await refresh()}catch(error){showToast('Parked successfully, but the live overview could not refresh: '+error.message,true)}
    flowerBlast(()=>showTicket(result.ticketNo,result.slot));
  }catch(error){
    show('parkResult',error.message,true);
    showToast(error.message,true);
  }finally{button.disabled=false}
});
function scheduleBillUpdate(){
  clearTimeout(billLookupTimer);
  const requestId=++billRequestId;
  billTicket=null;
  $('openPaymentDetails').disabled=true;
  $('payNow').disabled=true;
  $('billStatus').textContent='';
  $('billDetails').replaceChildren();
  const ticketNo=Number($('ticket').value);
  const hours=Number($('hours').value);
  if(!$('ticket').value||!$('hours').value||!Number.isInteger(ticketNo)||ticketNo<1||!Number.isInteger(hours)||hours<1){
    $('billPanel').hidden=true;
    return;
  }
  $('billPanel').hidden=false;
  $('billStatus').textContent='Checking ticket...';
  billLookupTimer=setTimeout(()=>loadBillPreview(ticketNo,hours,requestId),250);
}
async function loadBillPreview(ticketNo,hours,requestId){
  try{
    const history=await api('history');
    if(requestId!==billRequestId||ticketNo!==Number($('ticket').value)||hours!==Number($('hours').value))return;
    const ticket=history.find(item=>Number(item.ticketNo)===ticketNo&&item.status==='PARKED');
    if(!ticket)throw Error('No active vehicle found for this ticket number.');
    const type=String(ticket.type).toUpperCase();
    const rate=rates[type];
    if(!rate)throw Error('Could not determine the rate for this vehicle.');
    const billableHours=Math.min(hours,8);
    const base=rate*billableHours;
    const surcharge=hours>8?100:0;
    const total=base+surcharge;
    const rows=[
      ['Vehicle type',type.charAt(0)+type.slice(1).toLowerCase()],
      ['Plate',ticket.plate],
      ['Rate per hour','Rs. '+rate.toFixed(2)],
      ['Hours entered',String(hours)],
      ['Hours billed',String(billableHours)],
      ...(surcharge?[['Over-8-hour surcharge','Rs. '+surcharge.toFixed(2)]]:[]),
      ['Total amount','Rs. '+total.toFixed(2)]
    ];
    $('billDetails').innerHTML=rows.map(([label,value],index)=>`<div class="bill-row ${index===rows.length-1?'bill-total':''}><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('');
    $('billStatus').textContent='Ticket verified';
    billTicket=ticket;
    $('openPaymentDetails').disabled=false;
    $('payNow').disabled=false;
  }catch(error){
    if(requestId!==billRequestId)return;
    $('billStatus').textContent=error.message;
    $('billStatus').classList.add('bill-error');
  }
}
$('exitForm').addEventListener('input',()=>{
  $('billStatus').classList.remove('bill-error');
  scheduleBillUpdate();
});
$('exitForm').addEventListener('submit',event=>{
  event.preventDefault();
  scheduleBillUpdate();
});
$('slots').addEventListener('click',event=>{
  const slot=event.target.closest('[data-booked-slot]');
  document.querySelectorAll('.slot.details-open').forEach(item=>{
    if(item!==slot){item.classList.remove('details-open','details-dismissed');item.setAttribute('aria-expanded','false')}
  });
  if(slot){
    const open=slot.classList.contains('details-open');
    slot.classList.toggle('details-open',!open);
    slot.classList.toggle('details-dismissed',open);
    slot.setAttribute('aria-expanded',String(!open));
    event.stopPropagation();
  }
});
document.addEventListener('click',event=>{
  if(!event.target.closest('[data-booked-slot]')){
    document.querySelectorAll('.slot.details-open').forEach(slot=>{
      slot.classList.remove('details-open','details-dismissed');
      slot.setAttribute('aria-expanded','false');
    });
  }
});
$('slots').addEventListener('pointerout',event=>{
  const slot=event.target.closest('[data-booked-slot]');
  if(slot&&(!event.relatedTarget||!slot.contains(event.relatedTarget)))slot.classList.remove('details-dismissed');
});
$('slots').addEventListener('keydown',event=>{
  if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-booked-slot]')){
    event.preventDefault();
    event.target.click();
  }
});
$('openPaymentDetails').addEventListener('click',()=>{
  if(!billTicket)return;
  $('paymentDialogStatus').textContent='';
  $('paymentDialog').showModal();
});
$('closePaymentDetails').addEventListener('click',()=>$('paymentDialog').close());
$('paymentDialog').addEventListener('click',event=>{if(event.target===$('paymentDialog'))$('paymentDialog').close()});
document.querySelectorAll('input[name="paymentMethod"]').forEach(input=>input.addEventListener('change',()=>{
  const instructions={Cash:'Pay cash at the parking counter.',UPI:'Scan the QR or pay at the counter.',Card:'Pay by card at the parking counter.'};
  $('selectedPaymentHint').textContent=instructions[document.querySelector('input[name="paymentMethod"]:checked').value];
}));
$('payNow').addEventListener('click',async()=>{
  const ticket=billTicket;
  const ticketNo=Number($('ticket').value);
  const hours=Number($('hours').value);
  if(!ticket||ticketNo!==Number(ticket.ticketNo)||!Number.isInteger(hours)||hours<1){
    $('paymentDialogStatus').textContent='Ticket details changed. Verify the bill again.';
    $('paymentDialog').close();
    scheduleBillUpdate();
    return;
  }
  $('payNow').disabled=true;
  $('openPaymentDetails').disabled=true;
  $('paymentDialogStatus').textContent='Completing simulated payment...';
  try{
    const result=await api('exit',{method:'POST',body:JSON.stringify({ticketNo,hours})});
    show('exitResult',`Payment successful - ${result.plate} - Rs. ${Number(result.charge).toFixed(2)} (${result.billableHours} billable hours${hours>8?', plus Rs. 100 surcharge':''})`);
    showToast('Payment successful. Receipt is ready.');
    playSuccessSound();
    $('exitForm').reset();
    billTicket=null;
    $('billPanel').hidden=true;
    $('paymentDialog').close();
    $('paymentDialogStatus').textContent='';
    showReceipt(ticket,result);
    try{await refresh()}catch(error){showToast('Payment succeeded, but the live overview could not refresh: '+error.message,true)}
  }catch(error){
    $('paymentDialogStatus').textContent=error.message;
    $('payNow').disabled=false;
    $('openPaymentDetails').disabled=false;
    show('exitResult',error.message,true);
    showToast(error.message,true);
  }
});
$('refresh').addEventListener('click',()=>refresh().catch(error=>showToast(error.message,true)));
$('soundToggle').addEventListener('click',()=>{
  soundEnabled=!soundEnabled;
  $('soundToggle').textContent='Sound: '+(soundEnabled?'On':'Off');
  $('soundToggle').setAttribute('aria-pressed',String(soundEnabled));
});
$('dialogClose').addEventListener('click',()=>$('resultDialog').close());
$('ticketDone').addEventListener('click',()=>$('resultDialog').close());
$('printReceipt').addEventListener('click',()=>window.print());
$('resultDialog').addEventListener('click',event=>{if(event.target===$('resultDialog'))$('resultDialog').close()});
const sourceCategories={
  Frontend:['index.html','style.css','script.js'],
  Backend:['Vehicle.java','Car.java','Bike.java','Truck.java','VehicleType.java','Chargeable.java','Ticket.java','ParkingLot.java','ParkingService.java','ParkingFullException.java','ParkingController.java','ParkEaseApplication.java'],
  Database:['application.properties'],
  Schema:['schema.sql']
};
let currentSource='';
let sourceRequest=0;
function renderSourceLines(source){
  const code=$('sourceCode');
  const lines=source.split(/\r?\n/);
  const fragment=document.createDocumentFragment();
  lines.forEach((line,index)=>{
    const row=document.createElement('span');
    row.className='code-line';
    const number=document.createElement('span');
    number.className='line-number';
    number.textContent=String(index+1);
    const content=document.createElement('span');
    content.className='line-content';
    content.textContent=line||' ';
    row.append(number,content);
    fragment.append(row);
  });
  code.replaceChildren(fragment);
}
async function loadSource(name,button){
  const requestId=++sourceRequest;
  document.querySelectorAll('#codeFileTabs button').forEach(tab=>tab.setAttribute('aria-selected',String(tab===button)));
  $('codeFileName').textContent=name;
  $('codeViewerStatus').textContent='Loading source...';
  $('copySource').disabled=true;
  currentSource='';
  $('sourceCode').replaceChildren();
  try{
    const response=await fetch('/api/source?'+new URLSearchParams({name}));
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'Unable to load source file.');
    if(requestId!==sourceRequest)return;
    currentSource=data.content;
    renderSourceLines(currentSource);
    $('copySource').disabled=false;
    $('codeViewerStatus').textContent='';
  }catch(error){
    if(requestId!==sourceRequest)return;
    $('codeViewerStatus').textContent=error.message;
  }
}
function renderCodeViewer(category){
  const categoryTabs=$('codeCategoryTabs');
  const fileTabs=$('codeFileTabs');
  categoryTabs.replaceChildren();
  fileTabs.replaceChildren();
  Object.keys(sourceCategories).forEach(name=>{
    const tab=document.createElement('button');
    tab.type='button';
    tab.className='code-category-tab';
    tab.role='tab';
    tab.textContent=name;
    tab.setAttribute('aria-selected',String(name===category));
    tab.addEventListener('click',()=>renderCodeViewer(name));
    categoryTabs.append(tab);
  });
  sourceCategories[category].forEach((name,index)=>{
    const tab=document.createElement('button');
    tab.type='button';
    tab.className='code-file-tab';
    tab.role='tab';
    tab.textContent=name;
    tab.setAttribute('aria-selected',String(index===0));
    tab.addEventListener('click',()=>loadSource(name,tab));
    fileTabs.append(tab);
  });
  const firstFile=fileTabs.querySelector('button');
  if(firstFile)loadSource(firstFile.textContent,firstFile);
}
$('openCodeViewer').addEventListener('click',()=>{
  $('codeDialog').showModal();
  renderCodeViewer('Frontend');
});
$('closeCodeViewer').addEventListener('click',()=>$('codeDialog').close());
$('codeDialog').addEventListener('click',event=>{if(event.target===$('codeDialog'))$('codeDialog').close()});
$('copySource').addEventListener('click',async()=>{
  if(!currentSource)return;
  try{
    await navigator.clipboard.writeText(currentSource);
    $('codeViewerStatus').textContent='Copied '+$('codeFileName').textContent+' to clipboard.';
  }catch(error){
    $('codeViewerStatus').textContent='Could not copy source: '+error.message;
  }
});
updateClock();
setInterval(updateClock,1000);
refresh().catch(error=>showToast(error.message,true));
