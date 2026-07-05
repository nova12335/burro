/* ============================================================
   STATE
============================================================ */
const state = {
  tab:'home',
  quiz:{i:0,score:0,locked:false,streak:0,maxStreak:0,finished:false},
  duel:{phase:'idle',timeoutId:null,drawAt:0,best:Infinity,fails:0,plays:0},
  witch:{draws:0},
  clicks:0, holes:0, sheriffClicks:0, spiderClicks:0,
  idleSeconds:0, lastActivity:Date.now(),
  typedBuffer:'', konamiIndex:0,
  achievements:new Set(),
  soundOn:true, audioCtx:null,
  tumbleweedHits:0,
};
const KONAMI=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

const $=(s,el=document)=>el.querySelector(s);
const $$=(s,el=document)=>[...el.querySelectorAll(s)];
const content=$('#content');
const now=()=>Date.now();

function markActivity(){ state.lastActivity=now(); state.idleSeconds=0; }

/* ============================================================
   ACHIEVEMENTS
============================================================ */
const ACHV = [
 {id:'first_answer', icon:'🎯', name:'Primeiro Tiro', desc:'Responda sua primeira pergunta do quiz.'},
 {id:'streak5', icon:'🥶', name:'Sangue Frio', desc:'Acerte 5 perguntas seguidas no quiz.'},
 {id:'perfect', icon:'👑', name:'Gabarito de Lenda', desc:'Acerte as 25 perguntas do quiz.'},
 {id:'fastdraw', icon:'⚡', name:'Mão Mais Rápida do Oeste', desc:'Reaja em menos de 300ms no duelo rápido.'},
 {id:'nervous', icon:'😬', name:'Atirador Nervoso', desc:'Atire cedo demais 3 vezes no duelo.'},
 {id:'witchfriend', icon:'🔮', name:'Fez as Pazes com a Bruxa', desc:'Puxe uma carta da sorte 5 vezes.'},
 {id:'eldorado', icon:'🌟', name:'Sorte Grande', desc:'Tire a carta rara El Dorado na cabana da bruxa.'},
 {id:'spider', icon:'🕷️', name:'Caçador de Aranhas', desc:'Clique no bicho escondido 3 vezes.'},
 {id:'konami', icon:'🗺️', name:'Decifrador', desc:'Encontre o código antigo das setas.'},
 {id:'magicword', icon:'📜', name:'Sussurro Mágico', desc:'Digite a palavra mágica em qualquer lugar da tela.'},
 {id:'pokesheriff', icon:'👻', name:'Perturbador do Xerife', desc:'Cutuque o xerife fantasma 10 vezes.'},
 {id:'patient', icon:'🌵', name:'Andarilho Paciente', desc:'Fique parado, sem tocar em nada, por 45 segundos.'},
 {id:'holes', icon:'🔫', name:'Colecionador de Buracos', desc:'Deixe 15 buracos de bala na tela.'},
 {id:'tumbleweed', icon:'🌾', name:'Observador do Vento Rodante', desc:'Clique num vento-rolante enquanto ele atravessa a tela.'},
];
const META_ID='legend_alive';

function unlock(id){
  if(state.achievements.has(id)) return;
  state.achievements.add(id);
  const a=ACHV.find(x=>x.id===id);
  if(a){ toast(`🏅 Conquista: ${a.name}`); speak('achievement'); playSound('achv'); }
  renderBountyIfOpen();
  checkMeta();
}
function checkMeta(){
  if(state.achievements.has(META_ID)) return;
  const allDone = ACHV.every(a=>state.achievements.has(a.id));
  if(allDone){
    state.achievements.add(META_ID);
    setTimeout(triggerEscape, 900);
  }
}
function renderBountyIfOpen(){ if(state.tab==='bounty') renderBounty(); }

/* ============================================================
   TOASTS
============================================================ */
function toast(msg){
  const el=document.createElement('div');
  el.className='toast';
  el.innerHTML=`<span>${msg}</span>`;
  $('#toast-area').appendChild(el);
  setTimeout(()=>el.remove(), 3900);
}

/* ============================================================
   GHOST SHERIFF — "quase uma IA": escolhe frases de acordo com o contexto,
   preenche variáveis, e reage aos seus próprios stats.
============================================================ */
const SHERIFF = {
  start:["Ah, mais um forasteiro chegando na cidade...","Cuidado por onde pisa, isso aqui não é pra qualquer um.","Já vi muita gente como vc passar por essa cidade. A maioria não voltou."],
  correct:["Bom faro.","Vc não é tão burro quanto parece.","Isso mesmo, parceiro.","Interessante... continue."],
  wrong:["Errado. Aposto que nem sabe segurar um revólver direito.","Isso doeu em mim também.","Hm. Vou anotar isso no seu arquivo."],
  streak:["{n} seguidas! Alguém aqui nasceu pra isso.","Sequência de {n}. Cuidado, a fama sobe rápido por aqui."],
  idle:["Zzz... acorda, forasteiro.","O sol tá quase se pondo e vc só olhando pra tela.","Isso é uma estátua ou um jogador?","Continue parado. Eu tenho todo o tempo do mundo."],
  achievement:["Mais uma pra sua coleção.","O quadro de procurados cresce.","Anotado no seu histórico, forasteiro."],
  secret:["Ah... vc achou. Isso não devia estar aí.","Curioso, hein? Gosto disso.","Poucos reparam nisso. Vc reparou."],
  poked:["Para de me cutucar.","Isso não vai me trazer de volta à vida, sabia?","Mais uma vez e eu conto pro xerife de verdade.","..."],
  ambient:["Esse vento não para de soprar poeira.","Andam dizendo que tem ouro nas colinas.","Fica de olho, as coisas por aqui tem vida própria.","Esse trem das 3 nunca chega no horário.","Alguém pregou esse quadro na parede há muito tempo. Ninguém lembra quem."],
};
let sheriffTimer=null;
function speak(category, vars={}){
  const arr=SHERIFF[category]; if(!arr) return;
  let line=arr[Math.floor(Math.random()*arr.length)];
  Object.keys(vars).forEach(k=> line=line.replaceAll(`{${k}}`, vars[k]));
  const bubble=$('#sheriff-bubble');
  bubble.textContent='';
  bubble.classList.add('show');
  clearTimeout(sheriffTimer);
  let i=0;
  const type=()=>{ bubble.textContent=line.slice(0,i++); if(i<=line.length) setTimeout(type,18); };
  type();
  sheriffTimer=setTimeout(()=>bubble.classList.remove('show'), 4200);
}
$('#sheriff-icon').addEventListener('click', ()=>{
  markActivity();
  state.sheriffClicks++;
  speak('poked');
  playSound('click');
  if(state.sheriffClicks>=10) unlock('pokesheriff');
});

/* ============================================================
   SOUND (WebAudio, no files needed)
============================================================ */
function ctx(){
  if(!state.audioCtx){ try{ state.audioCtx=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  return state.audioCtx;
}
function beep(freq,dur,type='square',gain=.05,delay=0){
  if(!state.soundOn) return;
  const c=ctx(); if(!c) return;
  const t=c.currentTime+delay;
  const o=c.createOscillator(), g=c.createGain();
  o.type=type; o.frequency.setValueAtTime(freq,t);
  g.gain.setValueAtTime(gain,t); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t+dur);
}
function playSound(kind){
  if(kind==='click') beep(180,.05,'square',.04);
  if(kind==='correct'){ beep(520,.09,'triangle',.06); beep(780,.12,'triangle',.05,.09); }
  if(kind==='wrong') beep(120,.25,'sawtooth',.06);
  if(kind==='shot') beep(90,.12,'square',.08);
  if(kind==='achv'){ beep(440,.08,'square',.05); beep(660,.08,'square',.05,.08); beep(880,.16,'square',.05,.16); }
  if(kind==='card') beep(300,.1,'sine',.04);
}

/* ============================================================
   CUSTOM CURSOR + BULLET HOLES
============================================================ */
const cursorFx=$('#cursor-fx');
document.addEventListener('mousemove', e=>{
  cursorFx.style.transform=`translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
});
document.addEventListener('click', e=>{
  markActivity();
  state.clicks++;
  if(Math.random()<0.3 && state.holes<40){
    const h=document.createElement('div');
    h.className='hole';
    h.style.left=e.clientX+'px'; h.style.top=e.clientY+'px';
    h.style.setProperty('--rot',(Math.random()*360)+'deg');
    $('#holes-layer').appendChild(h);
    state.holes++;
    playSound('shot');
    if(state.holes>=15) unlock('holes');
  }
});

/* ============================================================
   BACKGROUND DUST PARTICLES
============================================================ */
const canvas=$('#dust'), gctx=canvas.getContext('2d');
function resize(){ canvas.width=innerWidth; canvas.height=innerHeight; }
resize(); addEventListener('resize', resize);
const particles=Array.from({length:70},()=>({
  x:Math.random()*innerWidth, y:Math.random()*innerHeight,
  r:Math.random()*1.6+.4, s:Math.random()*.3+.05, drift:Math.random()*.4-.2
}));
function loopDust(){
  gctx.clearRect(0,0,canvas.width,canvas.height);
  gctx.fillStyle='rgba(230,200,150,0.5)';
  particles.forEach(p=>{
    p.y-=p.s; p.x+=p.drift;
    if(p.y<-5) p.y=innerHeight+5;
    if(p.x<-5) p.x=innerWidth+5; if(p.x>innerWidth+5) p.x=-5;
    gctx.beginPath(); gctx.arc(p.x,p.y,p.r,0,7); gctx.fill();
  });
  requestAnimationFrame(loopDust);
}
loopDust();

/* ============================================================
   TUMBLEWEEDS / CROWS / TRAIN SHAKE / OS NOTIFICATIONS / TITLE FLICKER
============================================================ */
function spawnTumbleweed(){
  const el=document.createElement('div');
  el.className='critter'; el.textContent='🌾';
  el.style.top=(70+Math.random()*20)+'%';
  el.style.left='-40px';
  el.style.transition='left 6s linear, transform 6s linear';
  $('#skyfx').appendChild(el);
  requestAnimationFrame(()=>{
    el.style.left=(innerWidth+40)+'px';
    el.style.transform='rotate(900deg)';
  });
  el.addEventListener('click', ()=>{
    markActivity(); state.tumbleweedHits++;
    toast('🌾 Vc pegou o vento-rolante!'); unlock('tumbleweed'); el.remove();
  });
  setTimeout(()=>el.remove(), 6200);
}
function spawnCrow(){
  const el=document.createElement('div');
  el.className='critter crow'; el.textContent='🐦\u200d⬛';
  el.style.top=(8+Math.random()*15)+'%';
  el.style.left='-30px'; el.style.transition='left 5s linear';
  $('#skyfx').appendChild(el);
  requestAnimationFrame(()=>{ el.style.left=(innerWidth+30)+'px'; });
  setTimeout(()=>el.remove(), 5200);
}
setInterval(()=>{ if(Math.random()<.5) spawnTumbleweed(); }, 14000);
setInterval(()=>{ if(Math.random()<.5) spawnCrow(); }, 11000);

function shakeBoard(){
  const b=$('#board'); b.classList.add('shake');
  setTimeout(()=>b.classList.remove('shake'), 550);
  speak('ambient');
}
setInterval(()=>{ if(Math.random()<.35) shakeBoard(); }, 26000);

const OSNOTIFS=[
  {t:'Sistema', m:'🤠 Alguém está te observando pela janela.'},
  {t:'Rádio da Fronteira', m:'📡 Sinal fraco na pradaria... tente de novo mais tarde.'},
  {t:'Xerife (não fantasma)', m:'🔔 Sua atividade nesta cidade foi registrada.'},
  {t:'Aviso', m:'🐴 Um cavalo desconhecido está parado do lado de fora.'},
];
function spawnNotif(){
  const n=OSNOTIFS[Math.floor(Math.random()*OSNOTIFS.length)];
  const el=document.createElement('div');
  el.className='osnotif';
  el.innerHTML=`<span class="x">✕</span><b>${n.t}</b>${n.m}`;
  el.querySelector('.x').onclick=()=>el.remove();
  $('#notif-area').appendChild(el);
  setTimeout(()=>el.remove(), 6500);
}
setInterval(()=>{ if(Math.random()<.4) spawnNotif(); }, 45000);

const ORIG_TITLE=document.title;
setInterval(()=>{
  if(Math.random()<.3){
    document.title='⚠️ ALGUÉM TE OBSERVA';
    setTimeout(()=>document.title=ORIG_TITLE, 2200);
  }
}, 20000);

/* subtle tilt of the board following the mouse */
addEventListener('mousemove', e=>{
  const b=$('#board'); const r=b.getBoundingClientRect();
  const cx=r.left+r.width/2, cy=r.top+r.height/2;
  const dx=(e.clientX-cx)/r.width, dy=(e.clientY-cy)/r.height;
  b.style.transform=`perspective(900px) rotateY(${dx*3}deg) rotateX(${-dy*3}deg)`;
});

/* ============================================================
   IDLE / KONAMI / MAGIC WORD
============================================================ */
setInterval(()=>{
  state.idleSeconds = Math.round((now()-state.lastActivity)/1000);
  if(state.idleSeconds===12 || state.idleSeconds===30) speak('idle');
  if(state.idleSeconds>=45) unlock('patient');
}, 1000);

document.addEventListener('keydown', e=>{
  markActivity();
  if(e.key===KONAMI[state.konamiIndex]){
    state.konamiIndex++;
    if(state.konamiIndex>=KONAMI.length){
      state.konamiIndex=0; unlock('konami');
      toast('🗺️ Um mapa antigo se revela por um instante...'); speak('secret');
      try{ localStorage.setItem('rbv_map_seen','1'); }catch(_){}
      if(window.__rbv_ambient) window.__rbv_ambient.onOldMap();
    }
  } else { state.konamiIndex = (e.key===KONAMI[0])?1:0; }

  if(e.key.length===1 && /[a-zA-Z]/.test(e.key)){
    state.typedBuffer=(state.typedBuffer+e.key).slice(-14).toLowerCase();
    if(state.typedBuffer.endsWith('eldorado')){
      unlock('magicword'); toast('📜 A palavra mágica ecoa pela pradaria...'); speak('secret');
    }
    if(window.__rbv_ambient) window.__rbv_ambient.onTyped(state.typedBuffer);
  }
});

/* legacy hook, superseded — kept for compatibility with older builds.
   pings nothing, contacts nothing, just touches a local flag.
   see KM's migration notes if this still means anything to you. */
function __legacy_ping_horizon(){
  try{
    var seen = localStorage.getItem('hz_seen')||'0';
    localStorage.setItem('hz_pings', (parseInt(localStorage.getItem('hz_pings')||'0',10)+1).toString());
    return seen;
  }catch(_){ return '0'; }
}

/* ============================================================
   NAV / RENDER SHELL
============================================================ */
const TABS=[
  ['quiz','📜 Quiz'],['duel','🔫 Duelo'],['witch','🔮 Bruxa'],['bounty','🏅 Recompensas'],['secrets','🗝️ Segredos']
];
function navHTML(active){
  return `<div id="navbar">${TABS.map(([id,label])=>
    `<button class="tabbtn ${active===id?'on':''}" data-tab="${id}">${label}</button>`).join('')}</div>`;
}
function bindNav(){
  $$('.tabbtn').forEach(b=> b.onclick=()=>{ markActivity(); goTab(b.dataset.tab); });
}
function goTab(tab){
  state.tab=tab;
  if(tab==='quiz') renderQuiz();
  else if(tab==='duel') renderDuel();
  else if(tab==='witch') renderWitch();
  else if(tab==='bounty') renderBounty();
  else if(tab==='secrets') renderSecrets();
}

/* ============================================================
   HOME
============================================================ */
function renderHome(){
  content.innerHTML=`
    <div class="eyebrow">☆ procurado por conhecimento ☆</div>
    <h1><span class="glitch" data-txt="O Quadro Vivo">O Quadro Vivo</span></h1>
    <p class="sub">Bridger WESTERN — 25 perguntas, um duelo, uma bruxa e um xerife que não devia estar falando com vc. Ridge B Valley tem vida própria. Cutuque o suficiente e descubra.</p>
    <hr class="rope">
    <div class="note">🤠 tudo aqui reage a vc: sua mira, seu tempo parado, até as palavras que vc digita. Fique de olho — coisas se movem quando vc não espera.</div>
    <div class="btnrow"><button class="primary" id="enter">entrar na cidade</button></div>
  `;
  const t=$('h1 .glitch');
  setTimeout(()=>{ t.classList.add('active'); setTimeout(()=>t.classList.remove('active'),400); }, 900);
  $('#enter').onclick=()=>{ markActivity(); speak('start'); goTab('quiz'); };
}

/* ============================================================
   QUIZ
============================================================ */
const qs = [
["Em qual plataforma o Bridger: WESTERN foi lançado?", ["Steam","Roblox","itch.io","Epic Games"], 1],
["Quem é a desenvolvedora do jogo?", ["Rockstar Games","Mojang","BRIDGER INC.","Deltia's Gaming"], 2],
["Em qual região o jogo se passa?", ["Death Valley","Ridge B Valley","Sangre Valley","Copper Valley"], 1],
["Ao criar o personagem, entre quais duas facções o jogador escolhe?", ["Xerife ou Bandido","Outlaw ou Inlaw","Norte ou Sul","Vaqueiro ou Caçador"], 1],
["Atualmente, a escolha de facção...", ["muda completamente o estilo de jogo","não muda nada mecanicamente (ainda)","define seu Stand inicial","bloqueia certas armas"], 1],
["Qual é o nome da moeda do jogo?", ["Dollar","Moola","Gold Coin","Ridge Buck"], 1],
["Qual é considerada a forma mais segura e confiável de ganhar dinheiro no começo do jogo?", ["Duelos PvP","Pescaria","Assaltar trens","Vender cavalos"], 1],
["Onde fica o principal ponto de pesca pra iniciantes?", ["Rio Ridge","Lake Boullier","Swamp Lake","Red River"], 1],
["Pescando, existe uma chance bem pequena (0,5%) de tirar qual item raro?", ["Corpse Part","Arrow Shard","Stand Card","Dog Bane Herb"], 1],
["Qual é o sistema de talentos passivos do jogo, obtido através de uma bruxa?", ["Skills","Cards","Perks","Totems"], 1],
["Onde o jogador vai para conseguir Cards?", ["Outlaw Camp","A cabana da bruxa, no Swamp","Moe's Gun Store","A estação de trem"], 1],
["Qual opção o jogador escolhe pra ler a sorte com a bruxa?", ["\"draw a card\"","\"read my fortune\"","\"cast the bones\"","\"reveal my path\""], 1],
["Qual é o número máximo de slots de Card, alcançado no Tier 3?", ["1","2","3","5"], 2],
["Quanto custa cada Card extra depois do primeiro (que é grátis)?", ["20 Moola","50 Moola","100 Moola","450 Moola"], 1],
["De qual obra as habilidades de \"Stand\" do jogo são inspiradas?", ["Naruto","JoJo's Bizarre Adventure","Bleach","One Piece"], 1],
["Quais são as duas formas principais de conseguir um Stand?", ["Comprar na loja e completar quests","Corpse Parts e pescar Arrow Shards","Duelar com NPCs e votar em enquete","Subir de nível e trocar Moola"], 1],
["O que aparece anunciado no servidor quando um Corpse Part surge no mapa?", ["\"A stand awakens\"","\"It appears once again\"","\"The frontier calls\"","\"Beware the beam\""], 1],
["Qual Stand é apontado como um dos mais difíceis de obter, exigindo 100 kills totais e um killstreak de 10?", ["Star Platinum: The World","King Crimson","D4C","Tusk Act 1"], 2],
["Qual habilidade, ativada pela tecla X, está ligada à precisão de mira?", ["Fists","Ocular Prowess","Quick Dash","Block"], 1],
["Quais três Cards, combinados, aumentam bastante o Ocular PRO (assistência de mira)?", ["High Noon, Evil Eye e FAUX High Noon","Quick Draw, Steady Hand e Third Eye","Dead Aim, True Sight e Iron Will","Sharp Shot, Falcon Eye e Last Stand"], 0],
["O que acontece com seu personagem ao longo do tempo, por morte ou combat logging?", ["Ele fica mais forte","Ele envelhece","Ele perde o Stand automaticamente","Ele muda de facção"], 1],
["Qual erva ajuda a rejuvenescer o personagem?", ["Dogbane (Dog Bane Herb)","Ridge Root","Swamp Moss","Desert Sage"], 0],
["Se o jogador faz \"combat log\" (sai do jogo durante uma luta), o que acontece?", ["Nada, é seguro","Ele envelhece 10 anos instantaneamente","Perde todas as cartas","É banido permanentemente"], 1],
["Para que serve a tecla H no jogo?", ["Abrir o inventário","Invocar/desinvocar o cavalo","Recarregar a arma","Abrir o menu de estatísticas"], 1],
["Onde o jogador pode pagar pra \"rerolar\" e conseguir um cavalo melhor?", ["Moe's Gun Store","A estação de trem em Ridge B County","Lake Boullier","Outlaw Camp"], 1]
];

function renderQuiz(){
  if(state.quiz.finished){ renderQuizResult(); return; }
  const {i,score,streak}=state.quiz;
  const total=qs.length;
  const pct=Math.round(i/total*100);
  const [qtext,opts,correctIdx]=qs[i];
  const showSpider = Math.random()<0.22;
  content.innerHTML = navHTML('quiz') + `
    <div id="progwrap">
      <div id="proglabel"><span>pergunta ${i+1} de ${total}</span><span>acertos: ${score} · sequência: ${streak}</span></div>
      <div id="progbar"><div id="progfill" style="width:${pct}%"></div></div>
    </div>
    <h2 class="q">${qtext}${showSpider?'<span class="hidden-critter" id="spiderbug" style="top:-6px;right:0" title="?">🕷️</span>':''}</h2>
    <div id="opts"></div>
    <div id="feedback"></div>
    <div class="btnrow"><button class="primary" id="nextbtn" disabled>próxima</button></div>
  `;
  bindNav();
  if(showSpider){
    $('#spiderbug').onclick=(e)=>{
      e.stopPropagation(); markActivity(); state.spiderClicks++;
      e.target.remove();
      if(state.spiderClicks>=3) unlock('spider');
      else toast('🕷️ algo se mexeu ali...');
    };
  }
  const optsEl=$('#opts'); const letters=['A','B','C','D'];
  opts.forEach((text,n)=>{
    const el=document.createElement('div'); el.className='opt';
    el.innerHTML=`<span class="letter">${letters[n]}</span><span>${text}</span>`;
    el.addEventListener('click', ()=>pickQuiz(n,correctIdx,el));
    optsEl.appendChild(el);
  });
  $('#nextbtn').onclick=()=>{
    state.quiz.i++;
    if(state.quiz.i>=total){ state.quiz.finished=true; renderQuizResult(); return; }
    renderQuiz();
  };
}
function pickQuiz(n,correctIdx,el){
  if(state.quiz.locked) return;
  markActivity(); state.quiz.locked=true;
  const opts=$$('.opt'); opts.forEach(o=>o.classList.add('disabled'));
  if(state.quiz.i===0) unlock('first_answer');
  if(n===correctIdx){
    el.classList.add('correct'); state.quiz.score++; state.quiz.streak++;
    state.quiz.maxStreak=Math.max(state.quiz.maxStreak,state.quiz.streak);
    $('#feedback').textContent='acertou! bom faro, cowboy.';
    playSound('correct'); speak('correct');
    if(state.quiz.streak===5) { unlock('streak5'); speak('streak',{n:state.quiz.streak}); }
  }else{
    el.classList.add('wrong'); opts[correctIdx].classList.add('correct');
    state.quiz.streak=0;
    $('#feedback').textContent='errou essa — mas segue o rastro.';
    playSound('wrong'); speak('wrong');
  }
  $('#proglabel').innerHTML=`<span>pergunta ${state.quiz.i+1} de ${qs.length}</span><span>acertos: ${state.quiz.score} · sequência: ${state.quiz.streak}</span>`;
  $('#nextbtn').disabled=false;
}
function rankFor(score){
  if(score<=4) return {icon:'🥾',name:'Caipira Perdido',text:'Vc mal sabe distinguir um cavalo de uma mula, mas todo forasteiro começa em algum lugar.'};
  if(score<=9) return {icon:'🐎',name:'Aprendiz de Cowboy',text:'Já sabe onde fica o Lake Boullier — mas Ridge B Valley ainda guarda segredos.'};
  if(score<=14) return {icon:'🔫',name:'Pistoleiro Errante',text:'Vc conhece o jogo de verdade. Falta afiar a mira nos detalhes mais obscuros.'};
  if(score<=19) return {icon:'⭐',name:'Forasteiro Respeitado',text:'Poucos sabem tanto quanto vc. Seu nome já circula pelos becos da fronteira.'};
  if(score<=23) return {icon:'💀',name:'Lenda de Ridge B Valley',text:'Vc domina quase tudo. Poucos duelam com vc e vivem pra contar.'};
  return {icon:'👑',name:'Lenda Absoluta da Fronteira',text:'Gabarito perfeito. Vc não jogou Bridger: WESTERN — vc viveu nele.'};
}
function renderQuizResult(){
  const r=rankFor(state.quiz.score);
  if(state.quiz.score===qs.length) unlock('perfect');
  content.innerHTML = navHTML('quiz') + `
    <div class="eyebrow">☆ veredito do xerife ☆</div>
    <div id="badge">${r.icon}</div>
    <div class="result-name">${r.name}</div>
    <div class="score-line">${state.quiz.score} de ${qs.length} acertos · maior sequência: ${state.quiz.maxStreak}</div>
    <hr class="rope">
    <p class="result-text">${r.text}</p>
    <div class="btnrow"><button class="primary" id="restart">encarar o quiz de novo</button></div>
  `;
  bindNav();
  $('#restart').onclick=()=>{ state.quiz={i:0,score:0,locked:false,streak:0,maxStreak:0,finished:false}; renderQuiz(); };
}

/* ============================================================
   DUEL (quick draw reflex game)
============================================================ */
function renderDuel(){
  clearTimeout(state.duel.timeoutId);
  state.duel.phase='idle';
  content.innerHTML = navHTML('duel') + `
    <h2 class="q">Duelo Rápido</h2>
    <p class="sub" style="margin-bottom:0">Espere o comando "ATIRA!" e clique o mais rápido que puder. Atirar cedo demais é trapaça.</p>
    <div class="duelbox">
      <div class="duelword" id="duelword">pronto?</div>
      <div class="duelhint" id="duelhint">clique em "preparar" pra começar</div>
    </div>
    <div class="stat-row">
      <div><b id="dbest">${state.duel.best===Infinity?'—':state.duel.best+'ms'}</b>melhor tempo</div>
      <div><b id="dplays">${state.duel.plays}</b>duelos</div>
      <div><b id="dfails">${state.duel.fails}</b>trapaças</div>
    </div>
    <div class="btnrow"><button class="primary" id="duelbtn">preparar</button></div>
  `;
  bindNav();
  $('#duelbtn').onclick=()=>duelClick();
}
function duelClick(){
  markActivity();
  const word=$('#duelword'), hint=$('#duelhint'), btn=$('#duelbtn');
  if(state.duel.phase==='idle'){
    state.duel.phase='waiting'; word.textContent='espera...'; hint.textContent='não clique ainda';
    btn.textContent='(espere)';
    const delay=1000+Math.random()*3000;
    state.duel.timeoutId=setTimeout(()=>{
      state.duel.phase='draw'; state.duel.drawAt=now();
      word.textContent='ATIRA! 🔫'; word.style.color='var(--rust)';
      hint.textContent='clica agora!'; btn.textContent='ATIRA!';
      playSound('shot');
    }, delay);
  } else if(state.duel.phase==='waiting'){
    clearTimeout(state.duel.timeoutId);
    state.duel.phase='idle'; state.duel.fails++;
    word.textContent='cedo demais!'; word.style.color='var(--bad)';
    hint.textContent='vc foi baleado por trapacear. tente de novo.'; btn.textContent='preparar';
    playSound('wrong'); speak('wrong');
    $('#dfails').textContent=state.duel.fails;
    if(state.duel.fails>=3) unlock('nervous');
  } else if(state.duel.phase==='draw'){
    const t=now()-state.duel.drawAt;
    state.duel.phase='idle'; state.duel.plays++;
    state.duel.best=Math.min(state.duel.best,t);
    word.style.color='var(--ok)';
    let label = t<250?'RELÂMPAGO':(t<400?'RÁPIDO':(t<600?'NORMAL':'LENTO'));
    word.textContent=`${t}ms — ${label}`;
    hint.textContent='clica em preparar pra duelar de novo'; btn.textContent='preparar';
    $('#dbest').textContent=state.duel.best+'ms'; $('#dplays').textContent=state.duel.plays;
    playSound('correct');
    if(t<300) unlock('fastdraw');
  }
}

/* ============================================================
   WITCH / FORTUNE CARDS
============================================================ */
const CARDS=[
  {name:'Arrow Shard', icon:'🏹', text:'Um fragmento de flecha pescado no lago. Guarde-o — ele chama Stands famintos.'},
  {name:'Dog Bane Herb', icon:'🌿', text:'A erva que atrasa o relógio do seu corpo. Boa pra quem já viu velhice demais.'},
  {name:'Corpse Part', icon:'🦴', text:'Pertence a alguém que não devia mais existir. O servidor inteiro vai saber que vc o achou.'},
  {name:'High Noon', icon:'🕛', text:'Uma carta de mira certeira. Combine com outras duas e sua pontaria vira lenda.'},
  {name:'Evil Eye', icon:'👁️', text:'Ela enxerga o que vc ainda não viu. Use com cuidado — olhos assim cobram um preço.'},
  {name:'Iron Will', icon:'🛡️', text:'Uma vontade que não quebra fácil. Vc aguenta mais do que pensa.'},
  {name:'El Dorado', icon:'🌟', rare:true, text:'A cidade dourada perdida. Ninguém tira essa carta duas vezes na vida.'},
];
function renderWitch(){
  content.innerHTML = navHTML('witch') + `
    <h2 class="q">A Cabana da Bruxa</h2>
    <p class="sub" style="margin-bottom:0">"draw a card" — puxe uma carta e deixe que ela decida seu destino na fronteira.</p>
    <div id="cardwrap" style="display:flex;justify-content:center"><div class="card" id="thecard"><div class="cicon">🔮</div><div class="cname">???</div></div></div>
    <div class="cardtext" id="cardtext" style="text-align:center">clique em "puxar carta" pra revelar sua sorte.</div>
    <div class="btnrow"><button class="primary" id="drawbtn">puxar uma carta</button></div>
    <div class="score-line">cartas puxadas: ${state.witch.draws}</div>
  `;
  bindNav();
  $('#drawbtn').onclick=()=>drawCard();
}
function drawCard(){
  markActivity();
  const rare = Math.random()<0.05;
  const card = rare ? CARDS.find(c=>c.rare) : CARDS.filter(c=>!c.rare)[Math.floor(Math.random()*(CARDS.length-1))];
  const el=$('#thecard');
  el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip');
  if(card.rare) el.classList.add('rare'); else el.classList.remove('rare');
  playSound('card');
  setTimeout(()=>{
    el.innerHTML=`<div class="cicon">${card.icon}</div><div class="cname">${card.name}</div>`;
    $('#cardtext').textContent=card.text;
  }, 250);
  state.witch.draws++;
  content.querySelector('.score-line').textContent=`cartas puxadas: ${state.witch.draws}`;
  if(state.witch.draws>=5) unlock('witchfriend');
  if(card.rare) unlock('eldorado');
}

/* ============================================================
   BOUNTY BOARD (achievements)
============================================================ */
function renderBounty(){
  const unlocked=state.achievements;
  content.innerHTML = navHTML('bounty') + `
    <h2 class="q">Quadro de Recompensas</h2>
    <div class="bcount">${[...unlocked].filter(id=>id!==META_ID).length} / ${ACHV.length} encontradas</div>
    <div class="bgrid">${ACHV.map(a=>{
      const got=unlocked.has(a.id);
      return `<div class="bcard ${got?'':'locked'}">
        <span class="bicon">${got?a.icon:'❔'}</span>
        <span class="bname">${got?a.name:'??? não encontrada'}</span>
        ${got?a.desc:'Continue explorando a cidade pra descobrir.'}
      </div>`;
    }).join('')}</div>
    ${unlocked.has(META_ID)?'<div class="note">👑 Vc já libertou o forasteiro. O quadro se foi — mas os arquivos permanecem.</div>':''}
  `;
  bindNav();
}

/* ============================================================
   SECRETS (hints, not spoilers)
============================================================ */
function renderSecrets(){
  content.innerHTML = navHTML('secrets') + `
    <h2 class="q">Boatos da Cidade</h2>
    <p class="sub" style="margin-bottom:0">Ninguém confirma nada disso. Mas dizem por aí...</p>
    <ul class="secretlist">
      <li>Existe um código antigo, digitado com as setas do teclado, que termina em duas letras.</li>
      <li>Uma palavra mágica, digitada em qualquer lugar da tela, ecoa por Ridge B Valley.</li>
      <li>O xerife fantasma não gosta de ser cutucado demais. Ele reclama depois de um tempo.</li>
      <li>Um bicho pequeno se esconde de vez em quando nas perguntas do quiz.</li>
      <li>Ficar parado por tempo demais, sem tocar em nada, pode não ser tão seguro por aqui.</li>
      <li>O vento que rola pela tela esconde algo — se vc for rápido o bastante pra clicar nele.</li>
      <li>Quantos buracos de bala vc consegue deixar na tela antes que alguém perceba?</li>
      <li>A bruxa guarda uma carta que só aparece pra sortudos de verdade.</li>
      <li>Se vc encontrar tudo que existe por aqui... o quadro inteiro pode não aguentar.</li>
    </ul>
    <div class="note">🗝️ ${[...state.achievements].filter(id=>id!==META_ID).length}/${ACHV.length} boatos confirmados até agora.</div>
  `;
  bindNav();
}

/* ============================================================
   ESCAPE FINALE
============================================================ */
function triggerEscape(){
  toast('👑 Algo está acontecendo com o quadro...');
  speak('secret');
  const b=$('#board');
  setTimeout(()=>{
    b.classList.add('escaping');
    playSound('achv');
    setTimeout(()=>{ $('#finalOverlay').style.display='flex'; }, 2500);
  }, 1600);
}

/* ============================================================
   BOOT
============================================================ */
renderHome();
setInterval(()=>{ if(Math.random()<.25 && state.tab!=='home') speak('ambient'); }, 38000);
