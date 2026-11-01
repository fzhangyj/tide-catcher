const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const frame = document.querySelector('.canvas-frame');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const pauseBtn = document.getElementById('pauseBtn');
const pauseLabel = document.getElementById('pauseLabel');
const centerMessage = document.getElementById('centerMessage');
const canvasHint = document.getElementById('canvasHint');
const statusText = document.getElementById('statusText');
const statusDot = document.querySelector('.status-dot');
const scoreValue = document.getElementById('scoreValue');
const scoreDelta = document.getElementById('scoreDelta');
const comboValue = document.getElementById('comboValue');
const livesValue = document.getElementById('livesValue');
const waveValue = document.getElementById('waveValue');
const stabilityValue = document.getElementById('stabilityValue');
const stabilityMeter = document.getElementById('stabilityMeter');
const tipText = document.getElementById('tipText');
const soundBtn = document.getElementById('soundBtn');
const helpBtn = document.getElementById('helpBtn');
const helpDialog = document.getElementById('helpDialog');
const closeHelp = document.getElementById('closeHelp');
const dialogStart = document.getElementById('dialogStart');

const COLORS = ['#f06a53', '#47c9c1', '#e6ba57'];
let dpr = Math.min(window.devicePixelRatio || 1, 2);
let width = 0;
let height = 0;
let raf = 0;
let lastTime = 0;
let pointerDown = false;
let pointerAngle = 0;
let game = makeGame();

function makeGame() {
  return { active: false, paused: false, over: false, score: 0, combo: 0, lives: 3, stability: 100, wave: 1, elapsed: 0, spawnClock: 0, rotation: -Math.PI / 2, orbs: [], sparks: [], shake: 0, lastDelta: 0 };
}

function resize() {
  const rect = frame.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = rect.width; height = rect.height;
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);

function center() { return { x: width / 2, y: height / 2 }; }
function radius() { return Math.min(width, height) * 0.29; }

function spawnOrb() {
  const c = center();
  const angle = Math.random() * Math.PI * 2;
  const distance = radius() * 1.9;
  game.orbs.push({ angle, distance, speed: 22 + game.wave * 2 + Math.random() * 9, color: Math.floor(Math.random() * COLORS.length), size: 5 + Math.random() * 2, wobble: Math.random() * Math.PI * 2 });
  if (game.orbs.length > 12) game.orbs.shift();
}

function addSpark(x, y, color, burst = 5) {
  for (let i = 0; i < burst; i += 1) game.sparks.push({ x, y, color, life: 1, vx: (Math.random() - .5) * 90, vy: (Math.random() - .5) * 90, size: 1.5 + Math.random() * 2 });
}

function startGame() {
  game = makeGame(); game.active = true; game.spawnClock = .1;
  centerMessage.classList.add('hidden'); canvasHint.style.opacity = '0';
  pauseBtn.disabled = false; restartBtn.disabled = false; statusText.textContent = '潮汐运行中'; statusDot.className = 'status-dot live';
  tipText.textContent = '提示：同色连击越长，光粒越快。';
  updateHud();
}

function finishGame() {
  game.active = false; game.over = true; statusText.textContent = '潮汐已熄灭'; statusDot.className = 'status-dot danger'; pauseBtn.disabled = true;
  centerMessage.classList.remove('hidden'); centerMessage.querySelector('.message-kicker').textContent = 'CURRENT COMPLETE'; centerMessage.querySelector('h2').textContent = `${game.score.toString().padStart(4, '0')} 光点`; centerMessage.querySelector('p:not(.message-kicker)').textContent = '潮汐记住了你的节奏。再来一局，冲击更高连击。'; startBtn.querySelector('span').textContent = '再捕一次'; canvasHint.style.opacity = '0';
}

function togglePause() { if (!game.active && !game.paused) return; game.paused = !game.paused; pauseLabel.textContent = game.paused ? '继续' : '暂停'; statusText.textContent = game.paused ? '潮汐暂停中' : '潮汐运行中'; statusDot.className = game.paused ? 'status-dot' : 'status-dot live'; }

function updateHud() {
  scoreValue.textContent = game.score.toString().padStart(4, '0'); scoreDelta.textContent = `${game.lastDelta >= 0 ? '+' : ''}${game.lastDelta} 本局`; comboValue.textContent = `x${game.combo}`; livesValue.textContent = `${'●'.repeat(game.lives)}${'○'.repeat(3 - game.lives)}`; waveValue.textContent = game.wave;
  stabilityValue.textContent = `${Math.round(game.stability)}%`; stabilityMeter.style.width = `${Math.max(0, game.stability)}%`; stabilityMeter.className = game.stability < 36 ? 'danger' : game.stability < 66 ? 'warn' : '';
}

function setRotation(angle) { game.rotation = angle; }
function angleFromEvent(event) { const rect = canvas.getBoundingClientRect(); const c = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; return Math.atan2(event.clientY - c.y, event.clientX - c.x); }

function update(dt) {
  if (!game.active || game.paused) return;
  game.elapsed += dt; game.spawnClock -= dt; game.shake = Math.max(0, game.shake - dt * 3);
  if (game.spawnClock <= 0) { spawnOrb(); game.spawnClock = Math.max(.34, .9 - game.wave * .045); }
  if (game.elapsed > game.wave * 18) { game.wave += 1; game.elapsed = 0; }
  const catchRadius = radius() * .82;
  game.orbs.forEach((orb) => { orb.distance -= orb.speed * dt; orb.wobble += dt * 2; });
  game.sparks.forEach((spark) => { spark.x += spark.vx * dt; spark.y += spark.vy * dt; spark.life -= dt * 2.4; });
  game.sparks = game.sparks.filter((s) => s.life > 0);
  for (let i = game.orbs.length - 1; i >= 0; i -= 1) {
    const orb = game.orbs[i];
    if (orb.distance <= catchRadius) {
      const slot = Math.round((((game.rotation + orb.angle) / (Math.PI * 2)) * 3 + 3)) % 3;
      const delta = Math.abs(slot - orb.color);
      const c = center(); const orbX = c.x + Math.cos(orb.angle) * catchRadius; const orbY = c.y + Math.sin(orb.angle) * catchRadius;
      if (delta === 0) { game.combo += 1; game.lastDelta = 10 + game.combo * 2; game.score += game.lastDelta; game.stability = Math.min(100, game.stability + 2.4); addSpark(orbX, orbY, COLORS[orb.color], 8); }
      else { game.combo = 0; game.lastDelta = -8; game.stability -= 22; game.lives -= 1; game.shake = 1; addSpark(orbX, orbY, COLORS[orb.color], 3); if (game.lives <= 0 || game.stability <= 0) finishGame(); }
      game.orbs.splice(i, 1); updateHud();
    }
  }
}

function drawBackground(c) {
  ctx.clearRect(0, 0, width, height);
  ctx.save(); ctx.translate((Math.random() - .5) * game.shake * 5, (Math.random() - .5) * game.shake * 5);
  ctx.strokeStyle = 'rgba(244,240,230,.045)'; ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
  for (let y = 0; y < height; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  const pulse = 1 + Math.sin(performance.now() * .0014) * .018;
  ctx.save(); ctx.translate(c.x, c.y); ctx.scale(pulse, pulse); ctx.rotate(game.rotation * .2);
  [radius() * 1.56, radius() * 1.25, radius() * .92].forEach((r, i) => { ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.strokeStyle = `rgba(71,201,193,${.08 - i * .015})`; ctx.stroke(); });
  ctx.restore(); ctx.restore();
}

function drawRing(c) {
  const r = radius(); ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(game.rotation);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(244,240,230,.2)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * .8, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(244,240,230,.1)'; ctx.lineWidth = 1; ctx.stroke();
  for (let i = 0; i < 3; i += 1) { const a = (Math.PI * 2 / 3) * i; ctx.save(); ctx.rotate(a); ctx.fillStyle = COLORS[i]; ctx.globalAlpha = .96; ctx.beginPath(); ctx.moveTo(r * .98, 0); ctx.lineTo(r * .72, -10); ctx.lineTo(r * .72, 10); ctx.closePath(); ctx.fill(); ctx.restore(); }
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fillStyle = '#14211f'; ctx.fill(); ctx.strokeStyle = 'rgba(244,240,230,.3)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fillStyle = varColor('#e6ba57'); ctx.fill(); ctx.restore();
}

function varColor(color) { return color; }
function drawOrbs(c) { game.orbs.forEach((orb) => { const wobble = Math.sin(orb.wobble) * 2; const x = c.x + Math.cos(orb.angle) * (orb.distance + wobble); const y = c.y + Math.sin(orb.angle) * (orb.distance + wobble); ctx.save(); ctx.shadowColor = COLORS[orb.color]; ctx.shadowBlur = 16; ctx.fillStyle = COLORS[orb.color]; ctx.beginPath(); ctx.arc(x, y, orb.size, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }); }
function drawSparks() { game.sparks.forEach((s) => { ctx.save(); ctx.globalAlpha = Math.max(0, s.life); ctx.fillStyle = s.color; ctx.fillRect(s.x, s.y, s.size, s.size); ctx.restore(); }); }

function render() { const c = center(); drawBackground(c); drawOrbs(c); drawRing(c); drawSparks(); }
function loop(now) { const dt = Math.min(.05, (now - lastTime) / 1000 || 0); lastTime = now; update(dt); render(); raf = requestAnimationFrame(loop); }

canvas.addEventListener('pointerdown', (event) => { pointerDown = true; canvas.setPointerCapture(event.pointerId); pointerAngle = angleFromEvent(event); });
canvas.addEventListener('pointermove', (event) => { if (!pointerDown || !game.active || game.paused) return; const next = angleFromEvent(event); let delta = next - pointerAngle; if (delta > Math.PI) delta -= Math.PI * 2; if (delta < -Math.PI) delta += Math.PI * 2; setRotation(game.rotation + delta); pointerAngle = next; });
canvas.addEventListener('pointerup', () => { pointerDown = false; });
window.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); if (!game.active || game.paused) return; setRotation(game.rotation + (event.key === 'ArrowLeft' ? -.11 : .11)); } if (event.key === ' ' && game.active) { event.preventDefault(); togglePause(); } });

startBtn.addEventListener('click', startGame); restartBtn.addEventListener('click', startGame); pauseBtn.addEventListener('click', togglePause);
soundBtn.addEventListener('click', () => { const on = soundBtn.getAttribute('aria-pressed') === 'true'; soundBtn.setAttribute('aria-pressed', String(!on)); soundBtn.textContent = on ? '静' : '声'; });
helpBtn.addEventListener('click', () => helpDialog.showModal()); closeHelp.addEventListener('click', () => helpDialog.close()); dialogStart.addEventListener('click', () => { helpDialog.close(); startGame(); });

resize(); updateHud(); render(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
