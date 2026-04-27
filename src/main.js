import { runState } from "./data/runState.js";
import { metaState } from "./data/metaState.js";

const PLAYER_MOVEMENT = {
  BASE_SPEED: 250
};

const ENEMY_SPEED = 120;
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
let enemy;
let projectiles;
let cursors;
let keys;
let attackCooldownTimer = 0;

function preload() {
}

function create() {
  player = this.add.circle(480, 270, 20, 0x4ade80);

  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);

  enemy = this.add.circle(100, 100, 18, 0xef4444);
  this.physics.add.existing(enemy);
  enemy.body.setCollideWorldBounds(true);

  projectiles = this.physics.add.group();
  this.physics.add.overlap(projectiles, enemy, onProjectileHitEnemy, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  keys = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });
}

function update(_time, delta) {
  const speed = playerStats.getMoveSpeed();
  const enemySpeed = ENEMY_SPEED;

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

  if (enemy?.active) {
    const enemyDirectionX = player.x - enemy.x;
    const enemyDirectionY = player.y - enemy.y;
    const enemyDirection = new Phaser.Math.Vector2(enemyDirectionX, enemyDirectionY);

    if (enemyDirection.lengthSq() > 0) {
      enemyDirection.normalize().scale(enemySpeed);
      enemy.body.setVelocity(enemyDirection.x, enemyDirection.y);
    } else {
      enemy.body.setVelocity(0);
    }
  }

  attackCooldownTimer -= delta;
  if (attackCooldownTimer <= 0) {
    fireProjectileAtNearestEnemy(this);
    attackCooldownTimer = AUTO_ATTACK.COOLDOWN_MS;
  }

  removeOutOfBoundsProjectiles();
}

function fireProjectileAtNearestEnemy(scene) {
  if (!enemy?.active) {
    return;
  }

  const direction = new Phaser.Math.Vector2(enemy.x - player.x, enemy.y - player.y);
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
  hitEnemy.destroy();
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
