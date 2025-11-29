const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statsEl = document.getElementById('stats');
const instructionsEl = document.getElementById('instructions');

const tileSize = 40;
const pathWidth = 80;

const state = {
  pathPoints: [
    { x: 0, y: 300 },
    { x: 140, y: 300 },
    { x: 200, y: 200 },
    { x: 340, y: 200 },
    { x: 430, y: 340 },
    { x: 580, y: 340 },
    { x: 660, y: 240 },
    { x: 800, y: 240 }
  ],
  enemies: [],
  towers: [],
  bullets: [],
  cookies: 100,
  lives: 20,
  waveNumber: 1,
  enemiesToSpawn: 5,
  spawnTimer: 2,
  spawnInterval: 1.5,
  maxWaves: 5,
  gameOver: false,
  win: false
};

class Enemy {
  constructor() {
    const start = state.pathPoints[0];
    this.x = start.x;
    this.y = start.y;
    this.pathIndex = 0;
    this.speed = 45 + Math.random() * 15;
    this.maxHp = 10 + (state.waveNumber - 1) * 2;
    this.hp = this.maxHp;
    this.reachedEnd = false;
    this.dead = false;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
      state.cookies += 5;
    }
  }

  update(dt) {
    if (this.dead || this.reachedEnd) return;
    const nextIndex = this.pathIndex + 1;
    if (nextIndex >= state.pathPoints.length) {
      this.reachedEnd = true;
      state.lives -= 1;
      if (state.lives <= 0) {
        state.gameOver = true;
      }
      return;
    }

    const target = state.pathPoints[nextIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) {
      this.pathIndex++;
      return;
    }
    const step = Math.min(dist, this.speed * dt);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;

    if (step >= dist - 0.5) {
      this.pathIndex++;
    }
  }

  draw() {
    const bodySize = 16;
    ctx.fillStyle = '#b0753d';
    ctx.beginPath();
    ctx.arc(this.x, this.y, bodySize * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(this.x - bodySize * 0.45, this.y - bodySize * 0.2, bodySize * 0.9, bodySize * 0.8);
    ctx.fillStyle = '#542e15';
    ctx.fillRect(this.x - 3, this.y - 4, 2, 2);
    ctx.fillRect(this.x + 1, this.y - 4, 2, 2);

    // HP bar
    const barWidth = 20;
    const barHeight = 4;
    const hpRatio = Math.max(this.hp, 0) / this.maxHp;
    ctx.fillStyle = '#411';
    ctx.fillRect(this.x - barWidth / 2, this.y - bodySize * 0.8, barWidth, barHeight);
    ctx.fillStyle = '#1fd11f';
    ctx.fillRect(this.x - barWidth / 2, this.y - bodySize * 0.8, barWidth * hpRatio, barHeight);
  }
}

class Tower {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.range = 110;
    this.fireRate = 1.1;
    this.cooldown = 0;
  }

  update(dt) {
    this.cooldown -= dt;
    if (this.cooldown > 0 || state.gameOver) return;
    const target = state.enemies.find(
      (e) => !e.dead && !e.reachedEnd && distance(e.x, e.y, this.x, this.y) <= this.range
    );
    if (target) {
      state.bullets.push(new Bullet(this.x, this.y, target));
      this.cooldown = 1 / this.fireRate;
    }
  }

  draw() {
    const size = 28;
    ctx.fillStyle = '#fff';
    ctx.fillRect(this.x - size / 2, this.y - size / 2, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x - size / 2, this.y - size / 2, size, size);
    ctx.clip();
    ctx.strokeStyle = '#d22';
    ctx.lineWidth = 6;
    for (let offset = -size; offset <= size; offset += 10) {
      ctx.beginPath();
      ctx.moveTo(this.x - size, this.y - size + offset);
      ctx.lineTo(this.x + size, this.y + offset);
      ctx.stroke();
    }
    ctx.restore();
    ctx.fillStyle = '#222';
    ctx.fillRect(this.x - 5, this.y - size / 2 - 6, 10, 8);
  }
}

class Bullet {
  constructor(x, y, target) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.speed = 220;
    this.damage = 5;
    this.dead = false;
  }

  update(dt) {
    if (this.dead) return;
    if (!this.target || this.target.dead || this.target.reachedEnd) {
      this.dead = true;
      return;
    }
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (dist <= step + 1) {
      this.target.takeDamage(this.damage);
      this.dead = true;
      return;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function initGame() {
  state.enemiesToSpawn = state.waveNumber * 5;
  canvas.addEventListener('click', handleCanvasClick);
  updateUI();
  requestAnimationFrame(loop);
}

let lastTime = performance.now();
function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (!state.gameOver) {
    spawnEnemies(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateBullets(dt);
    cleanup();
  }
  updateUI();
}

function spawnEnemies(dt) {
  if (state.enemiesToSpawn > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      state.enemies.push(new Enemy());
      state.enemiesToSpawn -= 1;
      state.spawnTimer = state.spawnInterval;
    }
  } else if (state.enemies.length === 0 && !state.gameOver) {
    if (state.waveNumber >= state.maxWaves) {
      state.gameOver = true;
      state.win = true;
    } else {
      state.waveNumber += 1;
      state.cookies += 30;
      state.enemiesToSpawn = state.waveNumber * 5;
      state.spawnTimer = 2;
    }
  }
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    enemy.update(dt);
  }
}

function updateTowers(dt) {
  for (const tower of state.towers) {
    tower.update(dt);
  }
}

function updateBullets(dt) {
  for (const bullet of state.bullets) {
    bullet.update(dt);
  }
}

function cleanup() {
  state.enemies = state.enemies.filter((e) => !e.dead && !e.reachedEnd);
  state.bullets = state.bullets.filter((b) => !b.dead);
}

function handleCanvasClick(event) {
  if (state.gameOver) return;
  const pos = getCanvasPos(event);
  const tileX = Math.floor(pos.x / tileSize);
  const tileY = Math.floor(pos.y / tileSize);
  const centerX = tileX * tileSize + tileSize / 2;
  const centerY = tileY * tileSize + tileSize / 2;

  if (!isInsideCanvas(centerX, centerY)) return;
  if (isPointOnPath(centerX, centerY)) return;
  if (state.cookies < 50) return;
  if (state.towers.some((t) => Math.abs(t.x - centerX) < tileSize / 2 && Math.abs(t.y - centerY) < tileSize / 2)) {
    return;
  }

  state.towers.push(new Tower(centerX, centerY));
  state.cookies -= 50;
}

function isInsideCanvas(x, y) {
  return x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height;
}

function getCanvasPos(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function isPointOnPath(x, y) {
  for (let i = 0; i < state.pathPoints.length - 1; i++) {
    const a = state.pathPoints[i];
    const b = state.pathPoints[i + 1];
    const dist = pointToSegmentDistance(x, y, a.x, a.y, b.x, b.y);
    if (dist <= pathWidth / 2 + 6) return true;
  }
  return false;
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawPath();
  drawGrid();
  drawWorkshop();
  for (const tower of state.towers) tower.draw();
  for (const enemy of state.enemies) enemy.draw();
  for (const bullet of state.bullets) bullet.draw();
  if (state.gameOver) drawEndText();
}

function drawBackground() {
  ctx.fillStyle = '#f2f7fb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawPath() {
  ctx.lineWidth = pathWidth;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#cbe2f6';
  ctx.beginPath();
  ctx.moveTo(state.pathPoints[0].x, state.pathPoints[0].y);
  for (let i = 1; i < state.pathPoints.length; i++) {
    ctx.lineTo(state.pathPoints[i].x, state.pathPoints[i].y);
  }
  ctx.stroke();

  ctx.lineWidth = pathWidth - 10;
  ctx.strokeStyle = '#b8d2ea';
  ctx.stroke();
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 1;
  for (let x = tileSize; x < canvas.width; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = tileSize; y < canvas.height; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawWorkshop() {
  const end = state.pathPoints[state.pathPoints.length - 1];
  const width = 60;
  const height = 50;
  const x = end.x - width - 10;
  const y = end.y - height / 2;
  ctx.fillStyle = '#fff6cc';
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x + width / 2, y - 25);
  ctx.lineTo(x + width + 5, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8e44ad';
  ctx.fillRect(x + width / 2 - 8, y + height - 20, 16, 20);
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(x + 8, y + 10, 16, 12);
}

function drawEndText() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px "Courier New", monospace';
  const text = state.win ? 'You Win!' : 'Christmas is Ruined!';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function updateUI() {
  statsEl.textContent = `Cookies: ${state.cookies} | Lives: ${state.lives} | Wave: ${state.waveNumber}`;
  instructionsEl.textContent =
    'Click on the snow (not on the path) to place Candy Cane Cannons (50 cookies each). Stop the gingerbread goons from reaching Santa’s Workshop!';
}

initGame();
