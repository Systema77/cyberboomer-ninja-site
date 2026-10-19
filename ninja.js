/* ninja.js — il Cyber Boomer ninja che vive in fondo a ogni pagina di cyberboomer.ninja.
   Ordine del Direttore, 16/10/2026: «fagli fare il ninja»: lancia shuriken, si arrampica con la corda,
   sparisce in una nuvola di fumo, rotola, sgattaiola, si appiattisce, fa il nunchaku. Su tutte le pagine,
   con azioni diverse. Stesso disegno 8-bit delle strisce (ECHO/fumetti/sito/strumenti/ninja.py), vestito nero,
   fascia blu, occhiali quadrati sugli occhi (16/10). Un solo file: CSS e disegno li monta lui. Non tocca mai
   il contenuto. Con «riduci movimento» sta fermo in un angolo. — JUDY
   Dal 19/10/2026 (ordine del Direttore, casella KIROSHI-OR 4) è anche un gioco: se il mouse gli va vicino scappa in
   una nuvola di fumo; se lo prendi (clic o tocco su di lui) resta fermo, tira tre stellette e fa il nunchaku; dopo tre
   buchi fa la linguaccia. Al telefono: tocco vicino = scappa, tocco su di lui = preso. I suoni (fatti in casa da SUONO)
   stanno in /ninja-suoni.json e si caricano solo quando il lettore accende l'interruttore in basso a destra, che parte
   su OFF a ogni pagina: niente cookie, niente memoria. — KIROSHI */
(function(){
  'use strict';
  if (document.getElementById('cb-ninja')) return;
  var ridotto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var U = (window.innerWidth <= 420) ? 2.5 : 3;          // lato del blocco in px
  var COL = {K:'#25252C', L:'#4A4A56', B:'#5C7CFF', H:'#FFFFFF', G:'#0C0A0C', S:'#8C8CA0', P:'#E8609A'};
  var BORDO = '#A89DA4';                                  // contorno chiaro: sul nero si legge
  // 14 x 17 — K vestito, L luce, B fascia e cintura, H occhi, G montatura degli occhiali, P lingua
  var FERMO = ["....KKKKK.....","...KLKKKKK....","..KKKKKKKKK...","..KKKKKKKKK.BB","..BBBBBBBBBBB.","..GHHGBGHHG..B","..KKKKKKKKK...","...KKKKKKK....",".....KKK......","...KKKKKKKK...","..KKLKKKKKKK..",".KK.KKKKKKK.KK",".KK.KKKKKKK.KK","....BBBBBBB...","....KKK.KKK...","....KKK.KKK...","...KKKK.KKKK.."];
  function varia(base, righe){ var g = base.slice(); Object.keys(righe).forEach(function(k){ g[+k] = righe[k]; }); return g; }
  var PASSO   = varia(FERMO, {14:"....KKK..KKK..", 15:"...KKK....KKK.", 16:"..KKKK....KKKK"});
  var BRACCIO = varia(FERMO, {10:"..KKLKKKKKKKKK", 11:".KK.KKKKKKK...", 12:".KK.KKKKKKK..."});
  var BRACCIA = varia(FERMO, {9:".K.KKKKKKKK.K.", 10:".KKKLKKKKKKKK.", 11:"..K.KKKKKKK.K.", 12:"....KKKKKKK..."});
  var LINGUA  = varia(FERMO, {6:"..KKKKPPKKK...", 7:"...KKKPPKK...."});
  var PRESO   = BRACCIO;
  var QUATTO  = ["....KKKKK.....","...KLKKKKK....","..KKKKKKKKK.BB","..BBBBBBBBBBB.","..GHHGBGHHG..B","..KKKKKKKKK...","...KKKKKKKKK..","..KKLKKKKKKKK.",".KK.KKKKKKKKKK",".K..BBBBBBB...","...KKKK.KKKK..","..KKK.....KKK."];
  var PALLA   = ["...KKKKKK....","..KKBBBBKK...",".KKBGHHGBKK..",".KKBBBBBBKK..","KKKKKKKKKKKK.","KKLKKKKKKKKK.",".KKKKKKKKKK..",".KKBBBBBBKK..","..KKKKKKKK...","...KKKKKK...."];
  function sprite(grid){
    var h = grid.length, w = grid[0].length, ol = U/3, o = '';
    grid.forEach(function(r,y){ r.split('').forEach(function(c,x){ if(c!=='.') o += '<rect x="'+(x*U-ol)+'" y="'+(y*U-ol)+'" width="'+(U+2*ol)+'" height="'+(U+2*ol)+'" fill="'+BORDO+'"/>'; }); });
    grid.forEach(function(r,y){ r.split('').forEach(function(c,x){ if(c!=='.') o += '<rect x="'+(x*U)+'" y="'+(y*U)+'" width="'+U+'" height="'+U+'" fill="'+COL[c]+'"/>'; }); });
    return '<svg width="'+(w*U)+'" height="'+(h*U)+'" viewBox="'+(-ol)+' '+(-ol)+' '+(w*U+2*ol)+' '+(h*U+2*ol)+'" shape-rendering="crispEdges">'+o+'</svg>';
  }
  var ALT = 17*U, LARG = 14*U;
  var css = '#cb-ninja{position:fixed;left:0;bottom:0;width:'+LARG+'px;height:'+ALT+'px;z-index:4;cursor:pointer;touch-action:manipulation;transition:left 1.2s linear,bottom .6s ease-out,transform .5s ease;transform-origin:50% 100%}'
    + '#cb-ninja .cb-s{position:absolute;left:0;bottom:0;width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center}'
    + '#cb-ninja .cb-s svg{display:block}'
    + '#cb-ninja.sx{transform:scaleX(-1)}'
    + '#cb-ninja.piatto{transform:scaleY(.12)}#cb-ninja.piatto.sx{transform:scaleX(-1) scaleY(.12)}'
    + '#cb-ninja.rotola .cb-s{animation:cb-rotola .5s linear infinite;transform-origin:50% 60%}'
    + '#cb-ninja.sgattaiola .cb-s{animation:cb-punta .5s ease-in-out infinite}'
    + '#cb-ninja.nunchaku .cb-n{display:block}'
    + '#cb-ninja .cb-n{display:none;position:absolute;left:'+(13*U)+'px;bottom:'+(5*U)+'px;width:'+(8*U)+'px;height:'+(8*U)+'px;transform-origin:0 50%;animation:cb-gira .25s linear infinite}'
    + '#cb-shuriken{position:fixed;z-index:4;pointer-events:none;width:'+(6*U)+'px;height:'+(6*U)+'px;transition:left 1.1s cubic-bezier(.2,.8,.4,1),bottom 1.1s ease-in;animation:cb-gira .18s linear infinite}'
    + '#cb-corda{position:fixed;z-index:3;pointer-events:none;width:'+U+'px;top:0;background:repeating-linear-gradient(to bottom,'+BORDO+' 0 '+(2*U)+'px,transparent '+(2*U)+'px '+(3*U)+'px);height:0;transition:height .9s ease-out}'
    + '.cb-fumo{position:fixed;z-index:5;pointer-events:none;border-radius:50%;background:'+BORDO+';opacity:.85;animation:cb-fumo 1.1s ease-out forwards}'
    + '.cb-fumetto{position:fixed;z-index:6;pointer-events:none;background:#EFE6EB;color:#0C0A0C;font:700 12px "Courier New",Courier,monospace;padding:3px 7px;border:2px solid #0C0A0C;white-space:nowrap}'
    + '#cb-suono{position:fixed;right:10px;bottom:10px;z-index:6;font:700 12px "Courier New",Courier,monospace;line-height:1;color:#EFE6EB;background:#161216;border:2px solid #A89DA4;box-shadow:3px 3px 0 #0C0A0C;padding:5px 8px;cursor:pointer}'
    + '#cb-suono[aria-pressed="true"]{color:#0C0A0C;background:#5C7CFF;border-color:#EFE6EB}'
    + '#cb-suono:focus-visible{outline:2px solid #5C7CFF;outline-offset:2px}'
    + '@keyframes cb-rotola{to{transform:rotate(360deg)}}@keyframes cb-gira{to{transform:rotate(360deg)}}'
    + '@keyframes cb-punta{0%,100%{transform:translateY(0)}50%{transform:translateY(-'+U+'px)}}'
    + '@keyframes cb-fumo{0%{transform:scale(.3);opacity:.9}100%{transform:scale(2.6);opacity:0}}'
    + '@media print{#cb-ninja,#cb-shuriken,#cb-corda,.cb-fumo,.cb-fumetto,#cb-suono{display:none}}'
    + '@media (prefers-reduced-motion: reduce){#cb-ninja,#cb-ninja *,#cb-shuriken,#cb-corda,.cb-fumo{animation:none !important;transition:none !important}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var el = document.createElement('div'); el.id = 'cb-ninja'; el.setAttribute('aria-hidden','true');
  el.innerHTML = '<div class="cb-s"></div><svg class="cb-n" viewBox="0 0 24 24"><rect x="0" y="10" width="9" height="4" fill="'+COL.K+'" stroke="'+BORDO+'" stroke-width="1"/><path d="M9 12 h6" stroke="'+COL.S+'" stroke-width="1.5" stroke-dasharray="1.5 1.5" fill="none"/><rect x="15" y="10" width="9" height="4" fill="'+COL.K+'" stroke="'+BORDO+'" stroke-width="1"/></svg>';
  var scena = el.firstChild;
  function posa(g){ scena.innerHTML = sprite(g); }
  posa(FERMO);
  document.body.appendChild(el);
  var x = 12; el.style.left = x + 'px';
  function largMax(){ return Math.max(40, window.innerWidth - LARG - 12); }
  function dorme(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function vai(nx, ms){ x = Math.max(8, Math.min(largMax(), nx)); el.style.transitionDuration = (ms/1000)+'s,.6s,.5s'; el.classList.toggle('sx', false); el.style.left = x+'px'; }
  function verso(nx){ el.classList.toggle('sx', nx < x); }

  function fumo(cx, cy, n){
    for (var i=0;i<(n||5);i++){ var f = document.createElement('span'); f.className='cb-fumo'; var d = (14+Math.random()*16)*U/3;
      f.style.width=f.style.height=d+'px'; f.style.left=(cx+(Math.random()-.5)*LARG)+'px'; f.style.bottom=(cy+Math.random()*ALT*.7)+'px'; f.style.animationDelay=(Math.random()*.2)+'s';
      document.body.appendChild(f); setTimeout(function(e){ e.remove(); }, 1400, f); }
  }

  // ── i numeri del ninja ──────────────────────────────────────────────
  var ultimo = '';
  var gag = {
    cammina: function(){ var nx = Math.random()*largMax(); verso(nx); var ms = Math.abs(nx-x)*12+400; var passo = true;
      var t = setInterval(function(){ posa(passo?PASSO:FERMO); passo=!passo; }, 220); el.style.left = (x=nx)+'px'; el.style.transitionDuration=(ms/1000)+'s,.6s,.5s';
      return dorme(ms).then(function(){ clearInterval(t); posa(FERMO); }); },
    shuriken: function(){ posa(BRACCIO); var destra = x < window.innerWidth/2; el.classList.toggle('sx', !destra);
      return dorme(350).then(function(){ var s = document.createElement('div'); s.id='cb-shuriken';
        s.innerHTML='<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z" fill="#EFE6EB" stroke="'+COL.K+'" stroke-width="1.2"/><circle cx="12" cy="12" r="2.2" fill="'+COL.B+'"/></svg>';
        s.style.left=(x+(destra?LARG:-6*U))+'px'; s.style.bottom=(10*U)+'px'; document.body.appendChild(s); void s.offsetWidth;
        s.style.left=(destra? window.innerWidth-7*U : 8)+'px'; s.style.bottom=(window.innerHeight*0.5)+'px';
        return dorme(1150).then(function(){ s.style.transition='opacity .4s'; s.style.opacity='0'; posa(FERMO); return dorme(450).then(function(){ s.remove(); }); }); }); },
    rotola: function(){ var nx = x + (x < window.innerWidth/2 ? 1 : -1)*Math.min(260, largMax()/2); posa(PALLA); el.classList.add('rotola');
      el.style.transitionDuration='1.3s,.6s,.5s'; el.style.left=(x=Math.max(8,Math.min(largMax(),nx)))+'px';
      return dorme(1350).then(function(){ el.classList.remove('rotola'); posa(FERMO); }); },
    sgattaiola: function(){ var nx = Math.random()*largMax(); verso(nx); posa(QUATTO); el.classList.add('sgattaiola');
      var ms = Math.abs(nx-x)*22+600; el.style.transitionDuration=(ms/1000)+'s,.6s,.5s'; el.style.left=(x=nx)+'px';
      return dorme(ms).then(function(){ el.classList.remove('sgattaiola'); posa(FERMO); el.classList.toggle('sx', Math.random()<.5); return dorme(500); }); },
    appiattisce: function(){ el.classList.add('piatto'); return dorme(1600).then(function(){ el.classList.remove('piatto'); return dorme(400); }); },
    nunchaku: function(){ posa(BRACCIO); el.classList.add('nunchaku'); return dorme(2200).then(function(){ el.classList.remove('nunchaku'); posa(FERMO); }); },
    arrampica: function(){ var corda = document.createElement('div'); corda.id='cb-corda'; corda.style.left=(x+LARG/2)+'px'; document.body.appendChild(corda); void corda.offsetWidth;
      corda.style.height=(window.innerHeight-ALT)+'px';
      return dorme(900).then(function(){ var su = true; var t = setInterval(function(){ posa(su?BRACCIA:BRACCIO); su=!su; }, 260);
        el.style.transitionDuration='1.2s,2.6s,.5s'; el.style.bottom=(window.innerHeight+ALT)+'px';
        return dorme(2700).then(function(){ clearInterval(t); corda.style.height='0px'; return dorme(900).then(function(){ corda.remove();
          el.style.transitionDuration='0s,0s,0s'; el.style.opacity='0'; el.style.bottom='0px'; x = Math.random()*largMax(); el.style.left=x+'px'; void el.offsetWidth;
          el.style.transitionDuration='1.2s,.6s,.5s'; posa(FERMO); fumo(x, 0, 4); el.style.opacity='1'; return dorme(900); }); }); }); },
    fumo: function(){ fumo(x, 0, 6); return dorme(250).then(function(){ el.style.opacity='0'; return dorme(1800).then(function(){
      x = Math.random()*largMax(); el.style.transitionDuration='0s,.6s,.5s'; el.style.left=x+'px'; void el.offsetWidth; el.style.transitionDuration='1.2s,.6s,.5s';
      fumo(x, 0, 4); el.style.opacity='1'; return dorme(700); }); }); }
  };
  var nomi = Object.keys(gag);
  var occupato = false;                                   // vero durante un numero, una fuga o una presa
  function prossima(){ var n; do { n = nomi[Math.floor(Math.random()*nomi.length)]; } while (n === ultimo); ultimo = n; return n; }
  function giro(){
    if (document.hidden || occupato) return dorme(1500).then(giro);
    var n = prossima(); occupato = true;
    return Promise.resolve(gag[n]()).then(function(){ occupato = false; return dorme(3500 + Math.random()*5000); }).then(giro);
  }

  // ── i suoni: 5 file di SUONO dentro /ninja-suoni.json, caricati solo quando il lettore accende ──
  var suoni = null, suonoOn = false, carico = null;
  var VOL = {scappa:1, preso:.9, shuriken:.7, nunchaku:.9, beffa:.7};   // i file hanno picchi diversi: qui l'equilibrio
  function carica(){
    if (carico) return carico;
    carico = fetch('/ninja-suoni.json').then(function(r){ return r.json(); }).then(function(j){ suoni = {};
      Object.keys(VOL).forEach(function(n){ if (typeof j[n] === 'string') { var a = new Audio('data:audio/mpeg;base64,'+j[n]); a.preload = 'auto'; a.volume = VOL[n]; suoni[n] = a; } });
      return suoni; }).catch(function(){ suoni = null; carico = null; });
    return carico;
  }
  function suona(n){ if (!suonoOn || !suoni || !suoni[n]) return; try { var a = suoni[n]; a.currentTime = 0; var p = a.play(); if (p && p.catch) p.catch(function(){}); } catch(e){} }

  // ── il gioco: scappa, preso, linguaccia ─────────────────────────────
  var buchi = 0, ultimaFuga = 0;
  function rett(){ return el.getBoundingClientRect(); }
  function centro(){ var r = rett(); return {x: r.left + r.width/2, y: r.top + r.height/2}; }
  function fermaQui(){ var r = rett(); x = r.left; el.style.transitionDuration='0s,0s,0s'; el.style.left = x+'px'; el.style.bottom = '0px'; void el.offsetWidth; el.style.transitionDuration='1.2s,.6s,.5s'; }
  function fumetto(t, ms){ var b = document.createElement('div'); b.className='cb-fumetto'; b.textContent = t;
    b.style.left = Math.max(4, Math.min(window.innerWidth-80, x+LARG))+'px'; b.style.bottom = (ALT+10)+'px'; document.body.appendChild(b); setTimeout(function(){ b.remove(); }, ms||1200); }
  function ricompare(lontanoDa){
    var nx, i = 0; do { nx = Math.random()*largMax(); i++; } while (lontanoDa != null && Math.abs(nx+LARG/2-lontanoDa) < 150 && i < 20 && largMax() > 300);
    x = nx; el.style.transitionDuration='0s,.6s,.5s'; el.style.left = x+'px'; el.classList.toggle('sx', Math.random()<.5); void el.offsetWidth; el.style.transitionDuration='1.2s,.6s,.5s';
    fumo(x, 0, 4); el.style.opacity='1';
  }
  function fuggi(daX){
    if (occupato || ridotto) return; var ora = Date.now(); if (ora-ultimaFuga < 700) return; ultimaFuga = ora; occupato = true; buchi++;
    fermaQui(); fumo(x, 0, 5); suona('scappa'); el.style.opacity='0';
    dorme(450).then(function(){ ricompare(daX);
      if (buchi >= 3){ buchi = 0; return dorme(300).then(function(){ posa(LINGUA); fumetto('BLEAH!', 1300); suona('beffa'); return dorme(1300); }).then(function(){ posa(FERMO); }); }
    }).then(function(){ occupato = false; });
  }
  function lancia(){ suona('shuriken'); return gag.shuriken(); }
  function preso(){
    if (occupato || ridotto) return; occupato = true; buchi = 0;
    fermaQui(); posa(PRESO); fumetto('PRESO!', 900); suona('preso');
    dorme(700).then(lancia).then(function(){ return dorme(300); }).then(lancia).then(function(){ return dorme(300); }).then(lancia)
      .then(function(){ return dorme(300); })
      .then(function(){ posa(BRACCIO); el.classList.add('nunchaku'); suona('nunchaku'); setTimeout(function(){ suona('nunchaku'); }, 700); setTimeout(function(){ suona('nunchaku'); }, 1400); return dorme(2200); })
      .then(function(){ el.classList.remove('nunchaku'); posa(FERMO); fumo(x, 0, 5); suona('scappa'); el.style.opacity='0'; return dorme(500); })
      .then(function(){ ricompare(null); occupato = false; });
  }
  window.__ninja = { fai: function(n){ return gag[n] && gag[n](); }, fuggi: fuggi, preso: preso, libero: function(){ return !occupato; }, pose: {FERMO:FERMO,PASSO:PASSO,BRACCIO:BRACCIO,BRACCIA:BRACCIA,QUATTO:QUATTO,PALLA:PALLA,LINGUA:LINGUA}, posa: posa };
  if (ridotto) { el.style.left = '12px'; return; }

  el.addEventListener('pointerdown', function(e){ e.preventDefault(); e.stopPropagation(); preso(); });
  document.addEventListener('pointermove', function(e){ if (e.pointerType === 'touch' || occupato) return; var c = centro(); if (Math.hypot(e.clientX-c.x, e.clientY-c.y) < 70) fuggi(e.clientX); }, {passive:true});
  document.addEventListener('pointerdown', function(e){ if (occupato) return; var c = centro(); if (Math.hypot(e.clientX-c.x, e.clientY-c.y) < 90) fuggi(e.clientX); }, {passive:true});

  var btn = document.createElement('button'); btn.id = 'cb-suono'; btn.type = 'button'; btn.setAttribute('aria-pressed','false'); btn.setAttribute('aria-label','Suoni del ninja'); btn.title = 'Suoni del ninja'; btn.textContent = '♪ OFF';
  btn.addEventListener('click', function(){ suonoOn = !suonoOn; btn.setAttribute('aria-pressed', String(suonoOn)); btn.textContent = suonoOn ? '♪ ON' : '♪ OFF';
    if (suonoOn) carica().then(function(){ suona('preso'); }); });
  document.body.appendChild(btn);

  // entra in scena da una nuvola di fumo, poi comincia il suo giro
  el.style.opacity = '0';
  dorme(1200).then(function(){ x = 24 + Math.random()*Math.min(200, largMax()); el.style.transitionDuration='0s,.6s,.5s'; el.style.left=x+'px'; void el.offsetWidth; el.style.transitionDuration='1.2s,.6s,.5s'; fumo(x,0,5); el.style.opacity='1'; return dorme(3000); }).then(giro);
})();
