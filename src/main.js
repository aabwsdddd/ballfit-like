import { runState } from "./data/runState.js";
import { metaState } from "./data/metaState.js";

const PLAYER_MOVEMENT = {
  BASE_SPEED: 250
};

const ENEMY_SPEED = 120;
const ATTACK_COOLDOWN_MS = 500;
const PROJECTILE_SPEED = 420;
const PROJECTILE_RADIUS = 5;

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
let cursors;
let keys;
let projectiles;
let lastAttackTime = 0;

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

  this.physics.add.overlap(projectiles, enemy, (projectile, targetEnemy) => {
    projectile.destroy();
    targetEnemy.destroy();
    enemy = null;
  });

  cursors = this.input.keyboard.createCursorKeys();

  keys = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });
}

function update() {
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

  if (enemy?.active && this.time.now >= lastAttackTime + ATTACK_COOLDOWN_MS) {
    fireProjectile(this);
    lastAttackTime = this.time.now;
  }

  projectiles.children.each((projectile) => {
    if (
      projectile.x < -PROJECTILE_RADIUS ||
      projectile.x > config.width + PROJECTILE_RADIUS ||
      projectile.y < -PROJECTILE_RADIUS ||
      projectile.y > config.height + PROJECTILE_RADIUS
    ) {
      projectile.destroy();
    }
  });

}

function fireProjectile(scene) {
  if (!enemy?.active) {
    return;
  }

  const projectile = scene.add.circle(player.x, player.y, PROJECTILE_RADIUS, 0xffffff);
  scene.physics.add.existing(projectile);
  projectiles.add(projectile);

  const direction = new Phaser.Math.Vector2(enemy.x - player.x, enemy.y - player.y);

  if (direction.lengthSq() === 0) {
    projectile.body.setVelocity(0);
    return;
  }

  direction.normalize().scale(PROJECTILE_SPEED);
  projectile.body.setVelocity(direction.x, direction.y);
}
