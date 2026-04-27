import { runState } from "./data/runState.js";
import { metaState } from "./data/metaState.js";

const PLAYER_MOVEMENT = {
  BASE_SPEED: 250
};

const ENEMY_SPEED = 120;

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

function preload() {
}

function create() {
  player = this.add.circle(480, 270, 20, 0x4ade80);

  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);

  enemy = this.add.circle(100, 100, 18, 0xef4444);
  this.physics.add.existing(enemy);
  enemy.body.setCollideWorldBounds(true);

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

}
