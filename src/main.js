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
let cursors;
let keys;

function preload() {
}

function create() {
  player = this.add.circle(480, 270, 20, 0x4ade80);

  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);

  cursors = this.input.keyboard.createCursorKeys();

  keys = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });
}

function update() {
  const speed = 250;

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
}
