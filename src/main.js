import { runState } from "./data/runState.js";
import { metaState } from "./data/metaState.js";

const PLAYER_MOVEMENT = {
  BASE_SPEED: 250
};

const ENEMY_SETTINGS = {
  SPEED: 120,
  BASE_HP: 3,
  MAX_ACTIVE: 8,
  INITIAL_SPAWN_INTERVAL_MS: 2000,
  MIN_SPAWN_INTERVAL_MS: 700,
  SPAWN_INTERVAL_DECAY_MS: 80,
  MIN_DISTANCE_FROM_PLAYER: 220,
  EDGE_PADDING: 16,
  RADIUS: 18,
  COLOR: 0xef4444
};
const AUTO_ATTACK = {
  COOLDOWN_MS: 700,
  PROJECTILE_SPEED: 420,
  PROJECTILE_RADIUS: 6,
  PROJECTILE_COLOR: 0xf8fafc
};

const playerStats = {
  moveSpeedMultiplier: 1,
  getMoveSpeed() {
    return PLAYER_MOVEMENT.BASE_SPEED * this.moveSpeedMultiplier;
  }
};

console.log("[State] runState:", runState);
console.log("[State] metaState:", metaState);
console.log("[PlayerStats]", playerStats);

const config = {
  type: Phaser.AUTO,
  width: 960,
  height: 540,
  parent: "game",
  backgroundColor: "#1d1d1d",
  physics: {
    default: "arcade",
    arcade: {
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

const game = new Phaser.Game(config);

let player;
let enemies;
let projectiles;
let cursors;
let keys;
let attackCooldownTimer = 0;
let enemySpawnTimer = 0;
let currentSpawnIntervalMs = ENEMY_SETTINGS.INITIAL_SPAWN_INTERVAL_MS;
let killCount = 0;

function preload() {
}

function create() {
  player = this.add.circle(480, 270, 20, 0x4ade80);

  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);

  enemies = this.physics.add.group();
  spawnEnemy(this);

  projectiles = this.physics.add.group();
  this.physics.add.overlap(projectiles, enemies, onProjectileHitEnemy, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  keys = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });

  enemySpawnTimer = currentSpawnIntervalMs;
}

function update(_time, delta) {
  const speed = playerStats.getMoveSpeed();

  player.body.setVelocity(0);

  if (cursors.left.isDown || keys.left.isDown) {
    player.body.setVelocityX(-speed);
  } else if (cursors.right.isDown || keys.right.isDown) {
    player.body.setVelocityX(speed);
  }

  if (cursors.up.isDown || keys.up.isDown) {
    player.body.setVelocityY(-speed);
  } else if (cursors.down.isDown || keys.down.isDown) {
    player.body.setVelocityY(speed);
  }

  player.body.velocity.normalize().scale(speed);

  updateEnemyChase();
  updateEnemySpawning(delta, this);

  attackCooldownTimer -= delta;
  if (attackCooldownTimer <= 0) {
    fireProjectileAtNearestEnemy(this);
    attackCooldownTimer = AUTO_ATTACK.COOLDOWN_MS;
  }

  removeOutOfBoundsProjectiles();
}

function fireProjectileAtNearestEnemy(scene) {
  const nearestEnemy = getNearestEnemy();
  if (!nearestEnemy) {
    return;
  }

  const direction = new Phaser.Math.Vector2(
    nearestEnemy.x - player.x,
    nearestEnemy.y - player.y
  );
  if (direction.lengthSq() === 0) {
    return;
  }

  direction.normalize().scale(AUTO_ATTACK.PROJECTILE_SPEED);

  const projectile = scene.add.circle(
    player.x,
    player.y,
    AUTO_ATTACK.PROJECTILE_RADIUS,
    AUTO_ATTACK.PROJECTILE_COLOR
  );

  scene.physics.add.existing(projectile);
  projectile.body.setAllowGravity(false);
  projectile.body.setVelocity(direction.x, direction.y);
  projectiles.add(projectile);
}

function onProjectileHitEnemy(projectile, hitEnemy) {
  projectile.destroy();

  const nextHp = hitEnemy.getData("hp") - 1;
  hitEnemy.setData("hp", nextHp);

  if (nextHp <= 0) {
    hitEnemy.destroy();
    killCount += 1;
    console.log("[Combat] killCount:", killCount);
  }
}

function removeOutOfBoundsProjectiles() {
  projectiles.getChildren().forEach((projectile) => {
    if (
      projectile.x < 0 ||
      projectile.x > config.width ||
      projectile.y < 0 ||
      projectile.y > config.height
    ) {
      projectile.destroy();
    }
  });
}

function updateEnemyChase() {
  enemies.getChildren().forEach((enemy) => {
    if (!enemy.active) {
      return;
    }

    const direction = new Phaser.Math.Vector2(player.x - enemy.x, player.y - enemy.y);
    if (direction.lengthSq() > 0) {
      direction.normalize().scale(ENEMY_SETTINGS.SPEED);
      enemy.body.setVelocity(direction.x, direction.y);
    } else {
      enemy.body.setVelocity(0);
    }
  });
}

function updateEnemySpawning(delta, scene) {
  enemySpawnTimer -= delta;

  if (enemySpawnTimer > 0) {
    return;
  }

  if (enemies.countActive(true) < ENEMY_SETTINGS.MAX_ACTIVE) {
    spawnEnemy(scene);
  }

  currentSpawnIntervalMs = Math.max(
    ENEMY_SETTINGS.MIN_SPAWN_INTERVAL_MS,
    currentSpawnIntervalMs - ENEMY_SETTINGS.SPAWN_INTERVAL_DECAY_MS
  );
  enemySpawnTimer = currentSpawnIntervalMs;
}

function spawnEnemy(scene) {
  const spawnPos = getEnemySpawnPosition();
  const enemy = scene.add.circle(
    spawnPos.x,
    spawnPos.y,
    ENEMY_SETTINGS.RADIUS,
    ENEMY_SETTINGS.COLOR
  );

  scene.physics.add.existing(enemy);
  enemy.body.setCollideWorldBounds(true);
  enemy.setData("hp", ENEMY_SETTINGS.BASE_HP);
  enemies.add(enemy);
}

function getNearestEnemy() {
  let nearestEnemy = null;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;

  enemies.getChildren().forEach((enemy) => {
    if (!enemy.active) {
      return;
    }

    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distanceSq = dx * dx + dy * dy;

    if (distanceSq < nearestDistanceSq) {
      nearestDistanceSq = distanceSq;
      nearestEnemy = enemy;
    }
  });

  return nearestEnemy;
}

function getEnemySpawnPosition() {
  const maxTries = 20;
  for (let i = 0; i < maxTries; i += 1) {
    const pos = getRandomEdgePosition();
    const distance = Phaser.Math.Distance.Between(pos.x, pos.y, player.x, player.y);

    if (distance >= ENEMY_SETTINGS.MIN_DISTANCE_FROM_PLAYER) {
      return pos;
    }
  }

  return getRandomEdgePosition();
}

function getRandomEdgePosition() {
  const w = config.width;
  const h = config.height;
  const p = ENEMY_SETTINGS.EDGE_PADDING;
  const side = Phaser.Math.Between(0, 3);

  if (side === 0) {
    return { x: Phaser.Math.Between(p, w - p), y: p };
  }

  if (side === 1) {
    return { x: Phaser.Math.Between(p, w - p), y: h - p };
  }

  if (side === 2) {
    return { x: p, y: Phaser.Math.Between(p, h - p) };
  }

  return { x: w - p, y: Phaser.Math.Between(p, h - p) };
}
