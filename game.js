/* GUERRA DOS SEGUNDOS ETERNOS — protótipo v1.0
   Cenário/terminais/poderes são conteúdo provisório (adaptação), geometria gerada no código. */
'use strict';

// ---------- Dados dos heróis (ids estáveis) ----------
const HEROES = {
  jimmy:    {nome:'Jimmy Carter / X',        letra:'J', cor:0x2f6bff, det:0xffd23f, poder:'Rajada Cósmica',  tipo:'energia',    alc:8,  vel:6, pulo:9, voa:true},
  mula:     {nome:'Tony / Mula',             letra:'M', cor:0x2fa84f, det:0x8a8a8a, poder:'Escudo Gigante',  tipo:'escudo',     alc:5,  vel:5, pulo:8, voa:false},
  caracol:  {nome:'Scart / Caracol',         letra:'C', cor:0xff7a1a, det:0xffe14d, poder:'Corrida Veloz',   tipo:'velocidade', alc:0,  vel:7, pulo:8, voa:false},
  star:     {nome:'Star',                    letra:'S', cor:0xffd23f, det:0xffffff, poder:'Pulso de Luz',    tipo:'luz',        alc:8,  vel:6, pulo:9, voa:true},
  elastico: {nome:'Homem Elástico / Victor', letra:'E', cor:0xe23d8b, det:0x7a2bd9, poder:'Braço Esticado',  tipo:'alcance',    alc:22, vel:6, pulo:8, voa:false}
};
const NOMES_TIPO = {luz:'Luz (use Star)', alcance:'Alcance (use Homem Elástico)', energia:'Energia (use Jimmy)'};
const COOLDOWN = 2.5;

// ---------- Estado ----------
const $ = id => document.getElementById(id);
let renderer, scene, camera, clock, hero;
let heroId = 'jimmy', started = false, paused = false, low = false, missionDone = false;
let yaw = 0, pitch = 0.4, vy = 0, jumps = 0, cd = 0, boost = 0, toastT = 0;
const heroes = {}, terminals = [], rings = [], keys = {}, joy = {x: 0, y: 0};

// ---------- Início ----------
function initGame() {
  if (typeof THREE === 'undefined') {
    $('load').innerHTML = '<h2>Não foi possível carregar o motor 3D.<br>Verifique a internet e atualize a página.</h2>';
    return;
  }
  try {
    loadProgress();
    createScene();
    createAcademyLevel();
    createCityLevel();
    createHeroes();
    buildUI();
    bindControls();
    hero = heroes[heroId];
    clock = new THREE.Clock();
    $('load').classList.add('hidden');
    $('menu').classList.remove('hidden');
    requestAnimationFrame(loop);
  } catch (e) {
    $('load').innerHTML = '<h2>Erro ao iniciar o jogo.<br>Atualize a página.</h2><p>' + e.message + '</p>';
  }
}

function createScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd3ff);
  scene.fog = new THREE.Fog(0x8fd3ff, 45, 100);
  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6a8f5a, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 0.7);
  sun.position.set(10, 20, 8);
  scene.add(sun);
  renderer = new THREE.WebGLRenderer({canvas: $('c'), antialias: true});
  resize();
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 200));
}
function resize() {
  renderer.setPixelRatio(low ? 1 : Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}

// ---------- Cenários ----------
const mat = (c, em) => new THREE.MeshLambertMaterial({color: c, emissive: em || 0x000000});
function box(w, h, d, c, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y, z); scene.add(m); return m;
}
function createAcademyLevel() {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), mat(0x6fcf6f));
  g.rotation.x = -Math.PI / 2; scene.add(g);
  box(5, 0.06, 60, 0xe8d9a8, 0, 0.03, -4);            // caminho
  box(18, 0.07, 11, 0x4a90d9, -14, 0.035, 12);        // quadra
  box(0.2, 0.08, 11, 0xffffff, -14, 0.04, 12);
  box(34, 14, 6, 0xd9c7a0, 0, 7, -38);                // prédio principal
  box(34, 1.5, 7, 0xb5483a, 0, 14.5, -38);            // telhado
  box(5, 6, 0.6, 0x3a3f55, 0, 3, -34.8);              // entrada do laboratório
  for (let i = -3; i <= 3; i++) if (i) box(2.2, 3, 0.3, 0x7fd4ff, i * 4.2, 8, -34.9); // janelas
  const T = [[-22,-4],[-26,-16],[22,-6],[27,-20],[-8,-26],[9,-27],[-30,10],[30,8],[18,20],[-20,24],[24,28],[-34,-30],[34,-30]];
  T.forEach(p => {
    const tr = box(0.6, 2.4, 0.6, 0x7a4a2a, p[0], 1.2, p[1]);
    const lf = new THREE.Mesh(new THREE.ConeGeometry(2, 4.5, 8), mat(0x2f9e44));
    lf.position.set(p[0], 4.4, p[1]); scene.add(lf);
  });
  // Terminais de energia (provisórios): cada um reage a um tipo de poder
  addTerminal(-14, -6, 'luz', 0xffd23f);
  addTerminal(20, -22, 'alcance', 0xe23d8b);
  addTerminal(2, -24, 'energia', 0x2f6bff);
}
function addTerminal(x, z, tipo, cor) {
  box(1.4, 1.6, 1.4, cor, x, 0.8, z);
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 12), mat(0x777777));
  orb.position.set(x, 2.3, z); scene.add(orb);
  terminals.push({x, z, tipo, cor, orb, ok: false});
}
// Missão 2 (Blackstone / Ômega-01) ainda NÃO implementada — função reservada para a próxima etapa.
function createCityLevel() {}

// ---------- Heróis ----------
function createHeroes() {
  for (const id in HEROES) {
    const h = HEROES[id], g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 1.1, 12), mat(h.cor)); body.position.y = 0.95;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), mat(0xffd9b0)); head.position.y = 1.9;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.43, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(h.det)); hair.position.y = 1.97;
    const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.5, 10), mat(h.det)); legs.position.y = 0.25;
    const logo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), mat(h.det, h.det)); logo.position.set(0, 1.2, 0.48);
    g.add(body, head, hair, legs, logo);
    const r = id === 'mula' ? 0.3 : 0.14, len = id === 'elastico' ? 1.5 : 0.9; // braços: Mula grosso, Elástico longo
    [-1, 1].forEach(s => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), mat(h.cor));
      arm.position.set(s * 0.68, 1.1, 0); arm.rotation.z = s * 0.15; g.add(arm);
    });
    g.visible = false; g.position.set(0, 0, 18); scene.add(g); heroes[id] = g;
  }
}
function selectHero(id) { // tela de seleção
  heroId = id;
  document.querySelectorAll('.card').forEach(c => c.classList.toggle('on', c.dataset.id === id));
}
function switchHero(id) { // durante a partida, sem reiniciar a fase
  if (id === heroId && hero.visible) return;
  const old = hero; hero = heroes[id]; heroId = id;
  hero.position.copy(old.position); hero.rotation.y = old.rotation.y;
  old.visible = false; hero.visible = true;
  boost = 0; cd = 0; updateHUD(); saveProgress();
  toast(HEROES[id].nome);
}

// ---------- Missão ----------
function startMission() {
  Object.values(heroes).forEach(h => h.visible = false);
  hero = heroes[heroId]; hero.visible = true; hero.position.set(0, 0, 18); hero.rotation.y = Math.PI;
  yaw = 0; pitch = 0.4; vy = 0; cd = 0; boost = 0;
  terminals.forEach(t => {t.ok = false; t.orb.material.color.setHex(0x777777); t.orb.material.emissive.setHex(0);});
  $('sel').classList.add('hidden');
  showDialog('Missão 1: O Despertar do Núcleo 205',
    'Academia Kronos. Três terminais de energia estão adormecidos.\n\nCada terminal tem a cor de um herói e reage a um tipo de poder. Explore o pátio, troque de herói e use o PODER perto de cada terminal.',
    () => {started = true; paused = false; $('hud').classList.remove('hidden'); updateHUD(); updateMission();});
}
function updateMission() {
  const n = terminals.filter(t => t.ok).length;
  $('obj').textContent = 'Ative os terminais: ' + n + '/' + terminals.length;
  $('bar').style.width = (n / terminals.length * 100) + '%';
  if (n === terminals.length && started) completeMission();
}
function completeMission() {
  started = false; missionDone = true; saveProgress();
  $('hud').classList.add('hidden');
  showDialog('Missão completa!',
    'Os três terminais brilham ao mesmo tempo… e o Núcleo 205 entra em colapso. Era 17 de setembro de 1998.\n\nA origem dos poderes dos heróis está ligada a esse momento.\n\nMissão 2 (Proteger Blackstone) chega na próxima etapa.',
    () => {$('menu').classList.remove('hidden');});
}

// ---------- Poderes e interação ----------
function dist(t) {return Math.hypot(hero.position.x - t.x, hero.position.z - t.z);}
function activateHeroPower() {
  if (!started || paused || cd > 0) return;
  const h = HEROES[heroId]; cd = COOLDOWN;
  spawnRing(h.cor, h.alc || 3);
  if (h.tipo === 'velocidade') {boost = 4; toast('Corrida veloz!'); return;}
  let hit = false;
  terminals.forEach(t => {
    if (!t.ok && t.tipo === h.tipo && dist(t) <= h.alc) {
      t.ok = true; t.orb.material.color.setHex(t.cor); t.orb.material.emissive.setHex(t.cor); hit = true;
    }
  });
  if (hit) {toast('Terminal ativado!'); updateMission();}
  else toast(h.poder + ': nada reagiu aqui');
}
function interactWithObject() {
  if (!started || paused) return;
  const t = terminals.find(t => !t.ok && dist(t) < 5);
  toast(t ? 'Este terminal reage a: ' + NOMES_TIPO[t.tipo] : 'Nada para interagir aqui');
}
function spawnRing(cor, raio) {
  if (low) return;
  const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 32), new THREE.MeshBasicMaterial({color: cor, transparent: true, side: THREE.DoubleSide}));
  m.rotation.x = -Math.PI / 2; m.position.copy(hero.position); m.position.y += 0.3;
  scene.add(m); rings.push({m, life: 0, raio});
}

// ---------- Atualização por quadro ----------
function updateMovement(dt) {
  const h = HEROES[heroId];
  let jx = joy.x + (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
  let jy = joy.y + (keys.s ? 1 : 0) - (keys.w ? 1 : 0);
  const l = Math.hypot(jx, jy);
  if (l > 1) {jx /= l; jy /= l;}
  const sp = h.vel * (boost > 0 ? 2 : 1);
  const mx = -Math.sin(yaw) * (-jy) + Math.cos(yaw) * jx;
  const mz = -Math.cos(yaw) * (-jy) - Math.sin(yaw) * jx;
  const p = hero.position;
  p.x = Math.max(-45, Math.min(45, p.x + mx * sp * dt));
  p.z = Math.max(-33, Math.min(45, p.z + mz * sp * dt));
  if (l > 0.1) hero.rotation.y = Math.atan2(mx, mz);
  vy -= 22 * dt; p.y += vy * dt;
  if (p.y <= 0) {p.y = 0; vy = 0; jumps = 0;}
  boost -= dt; cd -= dt;
}
function jump() {
  if (!started || paused) return;
  const h = HEROES[heroId];
  if (hero.position.y <= 0.01) {vy = h.pulo; jumps = 1;}
  else if (h.voa && jumps < 2) {vy = 7; jumps = 2;} // voo curto (segundo impulso)
}
function updateCamera() {
  const p = hero.position, d = 9, cp = Math.cos(pitch);
  camera.position.set(p.x + Math.sin(yaw) * cp * d, p.y + 2 + Math.sin(pitch) * d, p.z + Math.cos(yaw) * cp * d);
  camera.lookAt(p.x, p.y + 1.5, p.z);
}
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if (started && !paused) {
    updateMovement(dt);
    $('cdbar').style.width = (100 - Math.max(0, cd) / COOLDOWN * 100) + '%';
    const near = terminals.find(x => !x.ok && dist(x) < 5);
    $('hint').classList.toggle('hidden', !near);
    if (near) $('hint').textContent = 'Terminal de ' + NOMES_TIPO[near.tipo];
    terminals.forEach(x => {x.orb.position.y = 2.3 + (x.ok ? 0.25 : Math.sin(t * 2) * 0.1);});
  } else if (!started) { // menu: câmera gira devagar
    yaw += dt * 0.15;
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; r.life += dt;
    r.m.scale.setScalar(1 + r.life * r.raio * 2); r.m.material.opacity = Math.max(0, 1 - r.life * 2);
    if (r.life > 0.5) {scene.remove(r.m); rings.splice(i, 1);}
  }
  if (toastT > 0 && (toastT -= dt) <= 0) $('toast').classList.add('hidden');
  updateCamera();
  renderer.render(scene, camera);
}

// ---------- Interface ----------
function buildUI() {
  const cards = $('cards'), hb = $('heroes');
  for (const id in HEROES) {
    const h = HEROES[id], hex = '#' + h.cor.toString(16).padStart(6, '0');
    const c = document.createElement('div');
    c.className = 'card'; c.dataset.id = id;
    c.innerHTML = '<div class="face" style="background:' + hex + '"></div><b>' + h.nome + '</b><br>' + h.poder;
    c.onclick = () => selectHero(id);
    cards.appendChild(c);
    const b = document.createElement('button');
    b.textContent = h.letra; b.style.background = hex; b.dataset.id = id;
    b.onpointerdown = e => {e.preventDefault(); switchHero(id);};
    hb.appendChild(b);
  }
  selectHero(heroId);
  $('btn-play').onclick = () => {$('menu').classList.add('hidden'); $('sel').classList.remove('hidden');};
  $('btn-start').onclick = startMission;
  $('btn-ctrl').onclick = () => showDialog('Controles',
    'Joystick (esquerda): andar\nArrastar à direita: girar câmera\nPULO: pular (Jimmy e Star dão um segundo impulso no ar)\nPODER: poder do herói ativo\nAGIR: ver o que um terminal precisa\nLetras coloridas: trocar de herói\n\nTeclado: WASD, Espaço (pulo), Q (poder), E (agir), 1-5 (heróis)', () => {});
  $('btn-about').onclick = () => showDialog('Sobre',
    'Guerra dos Segundos Eternos — protótipo v1.0.\nPersonagens, cenário e terminais são provisórios, feitos com formas 3D simples.', () => {});
  const fx = () => {low = !low; resize(); ['btn-fx', 'btn-fx2'].forEach(i => $(i).textContent = 'Reduzir efeitos: ' + (low ? 'SIM' : 'NÃO'));};
  $('btn-fx').onclick = fx; $('btn-fx2').onclick = fx;
  $('bpause').onclick = pauseGame;
  $('bres').onclick = () => {paused = false; $('pause').classList.add('hidden');};
  $('bhome').onclick = () => {started = false; paused = false; $('pause').classList.add('hidden'); $('hud').classList.add('hidden'); $('menu').classList.remove('hidden');};
}
function updateHUD() {
  const h = HEROES[heroId];
  $('hname').textContent = h.nome; $('hpower').textContent = 'Poder: ' + h.poder;
  document.querySelectorAll('#heroes button').forEach(b => b.classList.toggle('on', b.dataset.id === heroId));
}
function showDialog(title, text, cb) {
  $('dt').textContent = title; $('dx').textContent = text;
  $('dlg').classList.remove('hidden');
  $('dok').onclick = () => {$('dlg').classList.add('hidden'); if (cb) cb();};
}
function pauseGame() {if (!started) return; paused = true; $('pause').classList.remove('hidden');}
function toast(msg) {const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); toastT = 2;}

// ---------- Controles ----------
function bindControls() {
  const joyEl = $('joy'), knob = $('knob'); let jid = null;
  const setJoy = e => {
    const r = joyEl.getBoundingClientRect(), R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R); const l = Math.hypot(dx, dy);
    if (l > R) {dx *= R / l; dy *= R / l;}
    joy.x = dx / R; joy.y = dy / R;
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  };
  joyEl.onpointerdown = e => {e.preventDefault(); jid = e.pointerId; joyEl.setPointerCapture(jid); setJoy(e);};
  joyEl.onpointermove = e => {if (e.pointerId === jid) setJoy(e);};
  const endJoy = e => {if (e.pointerId === jid) {jid = null; joy.x = joy.y = 0; knob.style.transform = '';}};
  joyEl.onpointerup = endJoy; joyEl.onpointercancel = endJoy;

  const look = $('look'); let lid = null, lx = 0, ly = 0;
  look.onpointerdown = e => {e.preventDefault(); lid = e.pointerId; look.setPointerCapture(lid); lx = e.clientX; ly = e.clientY;};
  look.onpointermove = e => {
    if (e.pointerId !== lid) return;
    yaw -= (e.clientX - lx) * 0.006; pitch = Math.max(0.1, Math.min(1.1, pitch + (e.clientY - ly) * 0.004));
    lx = e.clientX; ly = e.clientY;
  };
  look.onpointerup = look.onpointercancel = e => {if (e.pointerId === lid) lid = null;};

  const press = (id, fn) => {$(id).onpointerdown = e => {e.preventDefault(); fn();};};
  press('bj', jump); press('bp', activateHeroPower); press('bi', interactWithObject);

  addEventListener('keydown', e => {
    const k = e.key.toLowerCase(); keys[k] = true;
    if (k === ' ') jump(); if (k === 'q') activateHeroPower(); if (k === 'e') interactWithObject();
    const ids = Object.keys(HEROES); if (k >= '1' && k <= '5' && started) switchHero(ids[k - 1]);
  });
  addEventListener('keyup', e => {keys[e.key.toLowerCase()] = false;});
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('touchmove', e => e.preventDefault(), {passive: false});
}

// ---------- Salvar / carregar (localStorage) ----------
function saveProgress() {
  try {localStorage.setItem('gse_save', JSON.stringify({hero: heroId, m1: missionDone}));} catch (e) {}
}
function loadProgress() {
  try {
    const s = JSON.parse(localStorage.getItem('gse_save') || 'null');
    if (s && HEROES[s.hero]) {heroId = s.hero; missionDone = !!s.m1;}
  } catch (e) {}
}

window.addEventListener('load', initGame);
