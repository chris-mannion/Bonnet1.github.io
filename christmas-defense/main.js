const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statsEl = document.getElementById('stats');
const instructionsEl = document.getElementById('instructions');
const cannonButton = document.getElementById('cannon-button');
const peppermintButton = document.getElementById('peppermint-button');
const mortarButton = document.getElementById('mortar-button');
const levelCompleteEl = document.getElementById('level-complete');
const nextLevelButton = document.getElementById('next-level-button');

// Using a larger, Bloons-style grid to keep sprites visible.
const tileSize = 48;
const pathWidth = 96;
const levels = [
  {
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
    spawnInterval: 1.5,
    maxWaves: 5,
    difficulty: 1,
    darterWaveBonus: 0,
    extraTankWave: 5
  },
  {
    pathPoints: [
      { x: 0, y: 120 },
      { x: 200, y: 120 },
      { x: 200, y: 320 },
      { x: 420, y: 320 },
      { x: 420, y: 520 },
      { x: 650, y: 520 },
      { x: 650, y: 260 },
      { x: 800, y: 260 }
    ],
    spawnInterval: 1.3,
    maxWaves: 5,
    difficulty: 1.25,
    darterWaveBonus: 2,
    extraTankWave: 4
  },
  {
    pathPoints: [
      { x: 0, y: 520 },
      { x: 160, y: 520 },
      { x: 160, y: 200 },
      { x: 360, y: 200 },
      { x: 360, y: 440 },
      { x: 560, y: 440 },
      { x: 560, y: 140 },
      { x: 800, y: 140 }
    ],
    spawnInterval: 1.1,
    maxWaves: 5,
    difficulty: 1.5,
    darterWaveBonus: 4,
    extraTankWave: 3
  }
];
const towerCosts = {
  cannon: 50,
  peppermint: 60,
  mortar: 80
};
let currentTowerType = 'cannon';
const spriteSheet = new Image();
spriteSheet.src = 'sprites.png';
let spriteReady = false;
let spriteW = 0;
let spriteH = 0;
spriteSheet.onload = () => {
  spriteW = spriteSheet.width / 3;
  spriteH = spriteSheet.height / 2;
  spriteReady = spriteW > 0 && spriteH > 0;
};

const state = {
  currentLevelIndex: 0,
  pathPoints: [],
  enemies: [],
  towers: [],
  bullets: [],
  cookies: 80, // 20% tighter starting resources
  lives: 20,
  waveNumber: 1,
  pendingSpawns: [],
  spawnTimer: 2,
  spawnInterval: 1.5,
  maxWaves: 5,
  gameOver: false,
  win: false,
  levelComplete: false,
  blizzardCooldown: 0,
  blizzardDuration: 3
};

function setTowerSelection(type) {
  currentTowerType = type;
  cannonButton.classList.toggle('active', type === 'cannon');
  peppermintButton.classList.toggle('active', type === 'peppermint');
  mortarButton.classList.toggle('active', type === 'mortar');
}

cannonButton.addEventListener('click', () => setTowerSelection('cannon'));
peppermintButton.addEventListener('click', () => setTowerSelection('peppermint'));
mortarButton.addEventListener('click', () => setTowerSelection('mortar'));
nextLevelButton.addEventListener('click', () => advanceLevel());
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'b') {
    triggerBlizzard();
  }
});

class Enemy {
  constructor(type = 'gingerbread') {
    this.type = type;
    const start = state.pathPoints[0];
    this.x = start.x;
    this.y = start.y;
    this.pathIndex = 0;
    this.baseSpeed =
      type === 'tank'
        ? 40 + Math.random() * 6
        : type === 'darter'
        ? 120 + Math.random() * 30
        : 45 + Math.random() * 15;
    this.speedMultiplier = 1;
    this.slowTimer = 0;
    const baseHp = (10 + (state.waveNumber - 1) * 2) * 1.2; // 20% tougher
    this.maxHp =
      type === 'tank'
        ? baseHp * 5
        : type === 'darter'
        ? Math.max(4, Math.round(baseHp * 0.35))
        : baseHp;
    this.hp = this.maxHp;
    this.reward = type === 'tank' ? 16 : type === 'darter' ? 2 : 4; // 20% fewer cookies
    this.regenRate = type === 'tank' ? 1 : 0;
    this.reachedEnd = false;
    this.dead = false;
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
      state.cookies += this.reward;
    }
  }

  update(dt) {
    if (this.dead || this.reachedEnd) return;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.speedMultiplier = 1;
      }
    }
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
    const currentSpeed = this.baseSpeed * this.speedMultiplier;
    const step = Math.min(dist, currentSpeed * dt);
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;

    if (step >= dist - 0.5) {
      this.pathIndex++;
    }
    if (this.regenRate > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.regenRate * dt);
    }
  }

  draw() {
    const bodySize = this.type === 'tank' ? 24 : this.type === 'darter' ? 12 : 16;
    const spriteIndex = this.type === 'tank' ? 1 : this.type === 'darter' ? 2 : 0;
    const desiredH = (this.type === 'tank' ? 44 : this.type === 'darter' ? 24 : 32) * 1.2; // 20% larger sprites
    if (!drawSprite(spriteIndex, this.x, this.y, desiredH)) {
      if (this.type === 'tank') {
        ctx.fillStyle = '#f7fbff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, bodySize * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e1eef7';
        ctx.beginPath();
        ctx.arc(this.x, this.y - 10, bodySize * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#355c7d';
        ctx.fillRect(this.x - 3, this.y - 12, 2, 2);
        ctx.fillRect(this.x + 1, this.y - 12, 2, 2);
        ctx.fillStyle = '#d84343';
        ctx.fillRect(this.x - 2, this.y - bodySize * 0.45, 12, 4);
      } else if (this.type === 'darter') {
        ctx.fillStyle = '#f4f9ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, bodySize * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d22';
        ctx.fillRect(this.x - bodySize * 0.4, this.y - bodySize * 0.2, bodySize * 0.8, bodySize * 0.4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - bodySize * 0.35, this.y - bodySize * 0.15, bodySize * 0.7, bodySize * 0.1);
        ctx.fillStyle = '#d22';
        ctx.fillRect(this.x + bodySize * 0.1, this.y - bodySize * 0.6, 8, 3);
        ctx.fillStyle = '#355c7d';
        ctx.fillRect(this.x - 2, this.y - 3, 2, 2);
        ctx.fillRect(this.x + 2, this.y - 3, 2, 2);
      } else {
        ctx.fillStyle = '#b0753d';
        ctx.beginPath();
        ctx.arc(this.x, this.y, bodySize * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(this.x - bodySize * 0.45, this.y - bodySize * 0.2, bodySize * 0.9, bodySize * 0.8);
        ctx.fillStyle = '#542e15';
        ctx.fillRect(this.x - 3, this.y - 4, 2, 2);
        ctx.fillRect(this.x + 1, this.y - 4, 2, 2);
      }
    }

    const barWidth = this.type === 'tank' ? 30 : this.type === 'darter' ? 18 : 20;
    const barHeight = 4 + (this.type === 'tank' ? 1 : 0);
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
    this.type = 'cannon';
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
    if (drawSprite(3, this.x, this.y, 34 * 1.2)) return;
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

class PeppermintTower {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.type = 'peppermint';
    this.range = 130;
    this.slowAmount = 0.5;
    this.slowDuration = 1;
    this.slowedTargets = [];
  }

  update(dt) {
    if (state.gameOver) return;
    this.slowedTargets = [];
    for (const enemy of state.enemies) {
      if (enemy.dead || enemy.reachedEnd) continue;
      if (distance(enemy.x, enemy.y, this.x, this.y) <= this.range) {
        enemy.speedMultiplier = this.slowAmount;
        enemy.slowTimer = this.slowDuration;
        this.slowedTargets.push(enemy);
      }
    }
  }

  draw() {
    if (drawSprite(4, this.x, this.y, 34 * 1.2)) return;
    const width = 14;
    const height = 36;
    ctx.fillStyle = '#f8fffb';
    ctx.fillRect(this.x - width / 2, this.y - height / 2, width, height);
    ctx.strokeStyle = '#d22';
    ctx.lineWidth = 4;
    for (let offset = -height / 2 + 2; offset < height / 2; offset += 8) {
      ctx.beginPath();
      ctx.moveTo(this.x - width / 2, this.y + offset);
      ctx.lineTo(this.x + width / 2, this.y + offset + 6);
      ctx.stroke();
    }
    ctx.fillStyle = '#1a2e1f';
    ctx.fillRect(this.x - width / 4, this.y + height / 2 - 6, width / 2, 8);

    // Frosty beams to slowed enemies
    ctx.strokeStyle = 'rgba(156, 226, 255, 0.7)';
    ctx.lineWidth = 2;
    for (const target of this.slowedTargets) {
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - height / 2);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
  }
}

class CocoaMortar {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.type = 'mortar';
    this.range = 140;
    this.fireRate = 0.5;
    this.cooldown = 0;
    this.splashRadius = 50;
    this.damage = 6;
    this.projectileSpeed = 170;
  }

  update(dt) {
    this.cooldown -= dt;
    if (this.cooldown > 0 || state.gameOver) return;
    const target = state.enemies.find(
      (e) => !e.dead && !e.reachedEnd && distance(e.x, e.y, this.x, this.y) <= this.range
    );
    if (target) {
      state.bullets.push(
        new CocoaShot(this.x, this.y, target.x, target.y, this.damage, this.splashRadius, this.projectileSpeed)
      );
      this.cooldown = 1 / this.fireRate;
    }
  }

  draw() {
    if (drawSprite(5, this.x, this.y, 34 * 1.2)) return;
    const width = 26;
    const height = 18;
    ctx.fillStyle = '#5b3524';
    ctx.fillRect(this.x - width / 2, this.y - height / 2, width, height);
    ctx.fillStyle = '#2d1b13';
    ctx.fillRect(this.x - width / 2, this.y - height / 2 - 6, width, 6);
    ctx.fillStyle = '#b56b39';
    ctx.fillRect(this.x - width / 2 + 4, this.y - height / 2 + 2, width - 8, height / 2);
    ctx.strokeStyle = '#d22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x - width / 2, this.y + height / 2);
    ctx.lineTo(this.x + width / 2, this.y + height / 2);
    ctx.stroke();
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

class CocoaShot {
  constructor(x, y, targetX, targetY, damage, radius, speed) {
    this.x = x;
    this.y = y;
    this.targetX = targetX;
    this.targetY = targetY;
    this.damage = damage;
    this.radius = radius;
    this.speed = speed;
    this.dead = false;
    this.exploding = false;
    this.explosionTimer = 0;
    this.explodeX = targetX;
    this.explodeY = targetY;
  }

  update(dt) {
    if (this.dead) return;
    if (this.exploding) {
      this.explosionTimer -= dt;
      if (this.explosionTimer <= 0) {
        this.dead = true;
      }
      return;
    }

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    if (dist <= step + 1) {
      this.x = this.targetX;
      this.y = this.targetY;
      this.explode();
      return;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  explode() {
    this.exploding = true;
    this.explosionTimer = 0.2;
    this.explodeX = this.x;
    this.explodeY = this.y;
    for (const enemy of state.enemies) {
      if (enemy.dead || enemy.reachedEnd) continue;
      if (distance(enemy.x, enemy.y, this.explodeX, this.explodeY) <= this.radius) {
        enemy.takeDamage(this.damage);
      }
    }
  }

  draw() {
    if (this.exploding) {
      ctx.fillStyle = 'rgba(121, 72, 36, 0.65)';
      ctx.beginPath();
      ctx.arc(this.explodeX, this.explodeY, this.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(212, 102, 54, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.explodeX, this.explodeY, this.radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = '#6a4028';
    ctx.beginPath();
    ctx.arc(this.x, this.y - 6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d8b39a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y - 6, 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function initGame() {
  loadLevel(0);
  setTowerSelection('cannon');
  canvas.addEventListener('click', handleCanvasClick);
  hideLevelComplete();
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
  if (!state.gameOver && !state.levelComplete) {
    spawnEnemies(dt);
    updateEnemies(dt);
    updateTowers(dt);
    updateBullets(dt);
    cleanup();
  }
  if (state.blizzardCooldown > 0) {
    state.blizzardCooldown = Math.max(0, state.blizzardCooldown - dt);
  }
  updateUI();
}

function loadLevel(levelIndex) {
  const level = levels[levelIndex] || levels[levels.length - 1];
  state.currentLevelIndex = levelIndex;
  state.pathPoints = clonePoints(level.pathPoints);
  state.maxWaves = level.maxWaves;
  state.spawnInterval = level.spawnInterval;
  state.enemies = [];
  state.towers = [];
  state.bullets = [];
  state.pendingSpawns = [];
  state.waveNumber = 1;
  state.spawnTimer = 2;
  state.gameOver = false;
  state.win = false;
  state.levelComplete = false;
  hideLevelComplete();
  prepareWave(state.waveNumber);
}

function prepareWave(waveNumber) {
  const def = getWaveDefinition(waveNumber);
  const list = [];
  for (let i = 0; i < def.gingerbread; i++) list.push('gingerbread');
  for (let i = 0; i < def.tanks; i++) list.push('tank');
  for (let i = 0; i < def.darters; i++) list.push('darter');
  state.pendingSpawns = shuffle(list);
  state.spawnTimer = 2;
}

function getWaveDefinition(waveNumber) {
  const level = levels[state.currentLevelIndex];
  let def;
  if (waveNumber === 1) def = { gingerbread: 6, tanks: 0, darters: 0 };
  else if (waveNumber === 2) def = { gingerbread: 9, tanks: 0, darters: 0 };
  else if (waveNumber === 3) def = { gingerbread: 10, tanks: 0, darters: 5 };
  else if (waveNumber === 4) def = { gingerbread: 10, tanks: 1, darters: 6 };
  else {
    const extra = waveNumber - 4;
    def = {
      gingerbread: 12 + extra * 2,
      tanks: 2 + Math.min(3, extra),
      darters: 6 + extra * 3
    };
  }

  // Scale difficulty per level
  def.gingerbread = Math.round(def.gingerbread * level.difficulty);
  def.darters = Math.round(def.darters * level.difficulty);
  def.tanks = Math.max(def.tanks, Math.round(def.tanks * level.difficulty));
  if (waveNumber >= level.extraTankWave) {
    def.tanks += 1;
  }
  if (waveNumber >= 3 && level.darterWaveBonus > 0) {
    def.darters += level.darterWaveBonus;
  }
  return def;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function spawnEnemies(dt) {
  if (state.pendingSpawns.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const type = state.pendingSpawns.shift();
      state.enemies.push(new Enemy(type));
      state.spawnTimer = state.spawnInterval;
    }
  } else if (state.enemies.length === 0 && !state.gameOver) {
    if (state.waveNumber >= state.maxWaves) {
      if (state.currentLevelIndex >= levels.length - 1) {
        state.gameOver = true;
        state.win = true;
      } else {
        state.cookies += 64;
        state.levelComplete = true;
        showLevelComplete();
      }
    } else {
      state.waveNumber += 1;
      state.cookies += 24;
      prepareWave(state.waveNumber);
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
  if (state.gameOver || state.levelComplete) return;
  const pos = getCanvasPos(event);
  const tileX = Math.floor(pos.x / tileSize);
  const tileY = Math.floor(pos.y / tileSize);
  const centerX = tileX * tileSize + tileSize / 2;
  const centerY = tileY * tileSize + tileSize / 2;
  const cost = towerCosts[currentTowerType] || 50;

  if (!isInsideCanvas(centerX, centerY)) return;
  if (isPointOnPath(centerX, centerY)) return;
  if (state.cookies < cost) return;
  if (state.towers.some((t) => Math.abs(t.x - centerX) < tileSize / 2 && Math.abs(t.y - centerY) < tileSize / 2)) {
    return;
  }

  if (currentTowerType === 'peppermint') {
    state.towers.push(new PeppermintTower(centerX, centerY));
  } else if (currentTowerType === 'mortar') {
    state.towers.push(new CocoaMortar(centerX, centerY));
  } else {
    state.towers.push(new Tower(centerX, centerY));
  }
  state.cookies -= cost;
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

function clonePoints(points) {
  return points.map((p) => ({ x: p.x, y: p.y }));
}

function drawSprite(index, x, y, targetHeight) {
  if (!spriteReady || spriteW === 0 || spriteH === 0) return false;
  const col = index % 3;
  const row = Math.floor(index / 3);
  const sx = col * spriteW;
  const sy = row * spriteH;
  const scale = targetHeight / spriteH;
  const dw = spriteW * scale;
  const dh = spriteH * scale;
  ctx.drawImage(spriteSheet, sx, sy, spriteW, spriteH, x - dw / 2, y - dh / 2, dw, dh);
  return true;
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
  const blizzardText = state.blizzardCooldown <= 0 ? 'Ready' : `${state.blizzardCooldown.toFixed(1)}s`;
  statsEl.textContent = `Cookies: ${state.cookies} | Lives: ${state.lives} | Level: ${state.currentLevelIndex + 1}/${levels.length} | Wave: ${state.waveNumber}/${state.maxWaves} | Blizzard: ${blizzardText}`;
  instructionsEl.textContent =
    'Choose a tower, then click on snow (not on the path). Cannons: 50 (damage) | Slowbeam: 60 (slow) | Cocoa Mortar: 80 (splash). Press B for Blizzard slow (cooldown). Clear all 3 levels with changing paths.';
}

function showLevelComplete() {
  levelCompleteEl.classList.remove('hidden');
}

function hideLevelComplete() {
  levelCompleteEl.classList.add('hidden');
}

function advanceLevel() {
  hideLevelComplete();
  loadLevel(state.currentLevelIndex + 1);
}

function triggerBlizzard() {
  if (state.blizzardCooldown > 0 || state.gameOver || state.levelComplete) return;
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.reachedEnd) continue;
    enemy.speedMultiplier = Math.min(enemy.speedMultiplier, 0.4);
    enemy.slowTimer = Math.max(enemy.slowTimer, state.blizzardDuration);
  }
  state.blizzardCooldown = 10;
}

initGame();
