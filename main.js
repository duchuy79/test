/* ===== STATE ===== */
const history = [];
let pending = null;
let toolLog = [];

/* ===== UTIL ===== */
function last(arr){ return arr[arr.length-1]; }
function opposite(x){ return x==='B'?'P':'B'; }

/* ===== METHODS ===== */
function trend(hist){
  if(hist.length<4) return null;
  let s=1;
  for(let i=hist.length-2;i>=0;i--){
    if(hist[i]===last(hist)) s++; else break;
  }
  if(s>=3) return {pred:last(hist),conf:0.6+s*0.05};
  return null;
}

function pattern(hist){
  if(hist.length<8) return null;
  for(let l=2;l<=5;l++){
    const pat=hist.slice(hist.length-l).join('');
    let n={B:0,P:0};
    for(let i=0;i<hist.length-l;i++){
      if(hist.slice(i,i+l).join('')===pat){
        const r=hist[i+l];
        if(r) n[r]++;
      }
    }
    if(n.B+n.P>=2)
      return {pred:n.B>n.P?'B':'P',conf:0.6};
  }
  return null;
}

/* ===== ENGINE ===== */
function decide(){
  const list=[trend(history),pattern(history)].filter(Boolean);
  if(!list.length) return {action:'WAIT'};
  list.sort((a,b)=>b.conf-a.conf);
  if(list[0].conf<0.55) return {action:'WAIT'};
  return {action:'PLAY',pred:list[0].pred};
}

/* ===== RENDER ===== */
function render(){
  const d=decide();
  const el=document.getElementById('decision');

  if(d.action==='WAIT'){
    el.className='core-decision wait';
    el.textContent='WAIT';
    pending=null;
  }else{
    el.className='core-decision '+(d.pred==='B'?'banker pulse':'player pulse');
    el.textContent=d.pred==='B'?'BANKER':'PLAYER';
    pending=d.pred;
  }

  const total=history.length||1;
  const b=history.filter(x=>x==='B').length;
  document.getElementById('rateB').textContent=Math.round(b/total*100)+'%';
  document.getElementById('rateP').textContent=Math.round((1-b/total)*100)+'%';
  document.getElementById('barB').style.width=(b/total*100)+'%';
  document.getElementById('barP').style.width=((1-b/total)*100)+'%';

  const wins=toolLog.filter(x=>x==='WIN').length;
  const tr=toolLog.length?Math.round(wins/toolLog.length*100):0;
  const tb=document.getElementById('toolBar');
  document.getElementById('toolRate').textContent=tr+'%';
  tb.style.width=tr+'%';
  tb.className=tr>=55?'good':tr>=50?'mid':'bad';
}

/* ===== MOBILE SAFE BIND ===== */
function bind(id,fn){
  const e=document.getElementById(id);
  e.addEventListener('click',fn);
  e.addEventListener('touchstart',ev=>{
    ev.preventDefault();fn();
  },{passive:false});
}

/* ===== ACTIONS ===== */
bind('btnB',()=>{
  if(pending) toolLog.push(pending==='B'?'WIN':'LOSE');
  history.push('B');
  render();
});

bind('btnP',()=>{
  if(pending) toolLog.push(pending==='P'?'WIN':'LOSE');
  history.push('P');
  render();
});

bind('btnU',()=>{
  history.pop();
  toolLog.pop();
  pending=null;
  render();
});

bind('btnR',()=>{
  history.length=0;
  toolLog.length=0;
  pending=null;
  render();
});

render();
