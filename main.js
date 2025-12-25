/* =====================
   STATE
===================== */
const history = [];
let pending = null;
let toolLog = []; // {result, method, phase}

/* =====================
   HEATMAP
===================== */
const heatMap = {
  TREND:{}, TRANSITION:{}, NOISE:{}, UNKNOWN:{}
};
const METHODS = ['TREND','PATTERN'];

METHODS.forEach(m=>{
  for(const p in heatMap){
    heatMap[p][m] = { w:0, l:0 };
  }
});

/* =====================
   UTIL
===================== */
function last(arr){ return arr[arr.length-1]; }
function opposite(x){ return x==='B'?'P':'B'; }

/* =====================
   PHASE DETECTOR
===================== */
function detectPhase(hist){
  if(hist.length < 6) return 'UNKNOWN';

  let alt = 0;
  for(let i=1;i<hist.length;i++){
    if(hist[i] !== hist[i-1]) alt++;
  }
  const altRate = alt / (hist.length - 1);

  let s = 1;
  const l = last(hist);
  for(let i=hist.length-2;i>=0;i--){
    if(hist[i] === l) s++;
    else break;
  }

  if(s >= 4 && altRate < 0.3) return 'TREND';
  if(altRate > 0.6) return 'NOISE';
  if(s >= 3 && altRate > 0.4) return 'TRANSITION';
  return 'UNKNOWN';
}

/* =====================
   METHODS
===================== */
function trendMethod(hist){
  if(hist.length < 4) return null;
  let s = 1;
  for(let i=hist.length-2;i>=0;i--){
    if(hist[i] === last(hist)) s++;
    else break;
  }
  if(s >= 3){
    return { method:'TREND', pred:last(hist), conf:0.6 + s*0.05 };
  }
  return null;
}

function patternMethod(hist){
  if(hist.length < 8) return null;
  for(let l=2;l<=5;l++){
    const pat = hist.slice(hist.length-l).join('');
    let next = {B:0,P:0};
    for(let i=0;i<hist.length-l;i++){
      if(hist.slice(i,i+l).join('') === pat){
        const r = hist[i+l];
        if(r) next[r]++;
      }
    }
    if(next.B + next.P >= 2){
      return { method:'PATTERN', pred:next.B>next.P?'B':'P', conf:0.6 };
    }
  }
  return null;
}

/* =====================
   HEATMAP BONUS
===================== */
function heatBonus(phase, method){
  const h = heatMap[phase][method];
  const t = h.w + h.l;
  if(t < 5) return 1;
  const r = h.w / t;
  if(r >= 0.6) return 1.1;
  if(r < 0.45) return 0.8;
  return 1;
}

/* =====================
   LOCK TOOL
===================== */
function isLocked(){
  if(toolLog.length < 6) return false;
  const wins = toolLog.filter(x=>x.result==='WIN').length;
  return wins / toolLog.length < 0.45;
}

/* =====================
   ENGINE
===================== */
function decide(){
  const phase = detectPhase(history);

  if(isLocked()){
    return { action:'WAIT', phase, locked:true };
  }

  let list = [
    trendMethod(history),
    patternMethod(history)
  ].filter(Boolean);

  if(!list.length) return { action:'WAIT', phase };

  list.forEach(r=>{
    r.conf *= heatBonus(phase, r.method);
  });

  list.sort((a,b)=>b.conf - a.conf);
  if(list[0].conf < 0.55) return { action:'WAIT', phase };

  return {
    action:'PLAY',
    pred:list[0].pred,
    method:list[0].method,
    phase
  };
}

/* =====================
   RENDER
===================== */
function render(){
  const d = decide();
  const el = document.getElementById('decision');

  if(d.action === 'WAIT'){
    el.className = 'core-decision wait';
    el.textContent = d.locked ? 'LOCK' : 'WAIT';
    pending = null;
  }else{
    el.className =
      'core-decision ' +
      (d.pred === 'B' ? 'banker pulse' : 'player pulse');
    el.textContent = d.pred;
    pending = d;
  }

  // TABLE RATE
  const total = history.length || 1;
  const b = history.filter(x=>x==='B').length;
  const rb = Math.round(b / total * 100);
  document.getElementById('rateB').textContent = rb + '%';
  document.getElementById('rateP').textContent = (100-rb) + '%';
  document.getElementById('barB').style.width = rb + '%';
  document.getElementById('barP').style.width = (100-rb) + '%';

  // TOOL RATE
  const wins = toolLog.filter(x=>x.result==='WIN').length;
  const tr = toolLog.length ? Math.round(wins / toolLog.length * 100) : 0;
  const tb = document.getElementById('toolBar');
  document.getElementById('toolRate').textContent = tr + '%';
  tb.style.width = tr + '%';
  tb.className = tr>=55?'good':tr>=50?'mid':'bad';

  // HISTORY
  const hEl = document.getElementById('history');
  hEl.innerHTML = '';
  history.forEach(v=>{
    const d = document.createElement('div');
    d.className = 'his-item ' + (v==='B'?'his-b':'his-p');
    d.textContent = v;
    hEl.appendChild(d);
  });
}

/* =====================
   MOBILE SAFE BIND
===================== */
function bind(id, fn){
  const e = document.getElementById(id);
  e.addEventListener('click', fn);
  e.addEventListener('touchstart', ev=>{
    ev.preventDefault(); fn();
  }, { passive:false });
}

/* =====================
   ACTIONS
===================== */
bind('btnB', ()=>{
  if(pending){
    const r = pending.pred==='B'?'WIN':'LOSE';
    toolLog.push({result:r,method:pending.method,phase:pending.phase});
    const h = heatMap[pending.phase][pending.method];
    r==='WIN'?h.w++:h.l++;
  }
  history.push('B');
  render();
});

bind('btnP', ()=>{
  if(pending){
    const r = pending.pred==='P'?'WIN':'LOSE';
    toolLog.push({result:r,method:pending.method,phase:pending.phase});
    const h = heatMap[pending.phase][pending.method];
    r==='WIN'?h.w++:h.l++;
  }
  history.push('P');
  render();
});

bind('btnU', ()=>{
  history.pop();
  toolLog.pop();
  pending = null;
  render();
});

bind('btnR', ()=>{
  history.length = 0;
  toolLog.length = 0;
  pending = null;
  for(const p in heatMap){
    for(const m in heatMap[p]){
      heatMap[p][m].w = 0;
      heatMap[p][m].l = 0;
    }
  }
  render();
});

render();
