import { getExpRequiredForLevel, runState } from "./data/runState.js";
import { loadPermanentResource, metaState, savePermanentResource } from "./data/metaState.js";

const PLAYER_MOVEMENT = {
  BASE_SPEED: 250
};

const PLAYER_MAX_HP = 10;
const ENEMY_CONTACT_DAMAGE = 1;
const PLAYER_HIT_COOLDOWN_MS = 500;

const ENEMY_SPEED = 120;
const ENEMY_BASE_HP = 3;
const ENEMY_MAX_ACTIVE = 20;
const ENEMY_INITIAL_SPAWN_INTERVAL_MS = 3000;
const ENEMY_MIN_SPAWN_INTERVAL_MS = 800;
const ENEMY_SPAWN_INTERVAL_DECAY_MS = 100;
const ENEMY_MIN_DISTANCE_FROM_PLAYER = 180;
const ATTACK_COOLDOWN_MS = 500;
const PROJECTILE_DAMAGE = 1;
const PROJECTILE_SPEED = 420;
const PROJECTILE_RADIUS = 5;
const EXP_ORB_VALUE = 1;
const EXP_ORB_RADIUS = 6;
const LEVEL_UP_OPTIONS = [
  { id: "move_speed_10", label: "1) Move Speed +10%" },
  { id: "projectile_damage_1", label: "2) Projectile Damage +1" },
  { id: "attack_cooldown_10", label: "3) Attack Cooldown -10%" }
];

const playerStats = {
  moveSpeedMultiplier: 1,
  projectileDamageBonus: 0,
  attackCooldownMultiplier: 1,
  getMoveSpeed() {
    return PLAYER_MOVEMENT.BASE_SPEED * this.moveSpeedMultiplier;
  },
  getProjectileDamage() {
    return PROJECTILE_DAMAGE + this.projectileDamageBonus;
  },
  getAttackCooldownMs() {
    return ATTACK_COOLDOWN_MS * this.attackCooldownMultiplier;
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
let cursors;
let keys;
let projectiles;
let expOrbs;
let lastAttackTime = 0;
let killCount = 0;
let currentEnemySpawnInterval = ENEMY_INITIAL_SPAWN_INTERVAL_MS;
let enemySpawnTimer;
let lastPlayerHitTime = -PLAYER_HIT_COOLDOWN_MS;
let isRunOver = false;
let gameOverText;
let restartText;
let restartKey;
let levelChoiceKeys;
let levelUpTitleText;
let levelUpOptionTexts = [];
let pendingLevelUpChoices = 0;
let isLevelUpPaused = false;
let activeScene;
let hudText;
let runStartTimeMs = 0;
let hasGrantedGameOverReward = false;
let resultPanel;
let resultText;

function preload() {
}

function create() {
  loadPermanentResource(metaState);
  activeScene = this;
  runStartTimeMs = this.time.now;
  hasGrantedGameOverReward = false;
  player = this.add.circle(480, 270, 20, 0x4ade80);

  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);
  player.setData("maxHp", PLAYER_MAX_HP);
  player.setData("currentHp", PLAYER_MAX_HP);

  enemies = this.physics.add.group();
  spawnEnemy(this);

  projectiles = this.physics.add.group();
  expOrbs = this.physics.add.group();

  this.physics.add.overlap(projectiles, enemies, (projectile, targetEnemy) => {
    projectile.destroy();

    const currentHp = targetEnemy.getData("hp") ?? ENEMY_BASE_HP;
    const nextHp = currentHp - playerStats.getProjectileDamage();
    targetEnemy.setData("hp", nextHp);

    if (nextHp <= 0) {
      spawnExpOrb(this, targetEnemy.x, targetEnemy.y);
      targetEnemy.destroy();
      killCount += 1;
    }
  });

  this.physics.add.overlap(player, expOrbs, (_, expOrb) => {
    if (isRunOver || !expOrb?.active) {
      return;
    }

    expOrb.destroy();
    runState.exp += EXP_ORB_VALUE;
    processRunLevelUps();
    console.log("[RunState] EXP:", runState.exp);
  });

  this.physics.add.overlap(player, enemies, () => {
    if (isRunOver || this.time.now < lastPlayerHitTime + PLAYER_HIT_COOLDOWN_MS) {
      return;
    }

    lastPlayerHitTime = this.time.now;
    const currentHp = player.getData("currentHp") ?? PLAYER_MAX_HP;
    const nextHp = currentHp - ENEMY_CONTACT_DAMAGE;
    player.setData("currentHp", nextHp);

    if (nextHp <= 0) {
      endRun(this);
    }
  });

  scheduleNextEnemySpawn(this);

  cursors = this.input.keyboard.createCursorKeys();

  keys = this.input.keyboard.addKeys({
    up: Phaser.Input.Keyboard.KeyCodes.W,
    down: Phaser.Input.Keyboard.KeyCodes.S,
    left: Phaser.Input.Keyboard.KeyCodes.A,
    right: Phaser.Input.Keyboard.KeyCodes.D
  });

  restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
  levelChoiceKeys = this.input.keyboard.addKeys({
    option1: Phaser.Input.Keyboard.KeyCodes.ONE,
    option2: Phaser.Input.Keyboard.KeyCodes.TWO,
    option3: Phaser.Input.Keyboard.KeyCodes.THREE
  });

  hudText = this.add.text(16, 16, "", {
    fontSize: "20px",
    color: "#ffffff"
  }).setOrigin(0, 0).setDepth(1000);
  updateHudText();
}

function update() {
  updateHudText();

  if (isRunOver) {
    player.body.setVelocity(0);
    if (Phaser.Input.Keyboard.JustDown(restartKey)) {
      restartRun();
    }
    return;
  }

  if (isLevelUpPaused) {
    if (Phaser.Input.Keyboard.JustDown(levelChoiceKeys.option1)) {
      selectLevelUpOption(0);
    } else if (Phaser.Input.Keyboard.JustDown(levelChoiceKeys.option2)) {
      selectLevelUpOption(1);
    } else if (Phaser.Input.Keyboard.JustDown(levelChoiceKeys.option3)) {
      selectLevelUpOption(2);
    }
    return;
  }

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

  enemies.children.each((enemy) => {
    if (!enemy?.active) {
      return;
    }

    const enemyDirectionX = player.x - enemy.x;
    const enemyDirectionY = player.y - enemy.y;
    const enemyDirection = new Phaser.Math.Vector2(enemyDirectionX, enemyDirectionY);

    if (enemyDirection.lengthSq() > 0) {
      enemyDirection.normalize().scale(ENEMY_SPEED);
      enemy.body.setVelocity(enemyDirection.x, enemyDirection.y);
    } else {
      enemy.body.setVelocity(0);
    }
  });

  const nearestEnemy = getNearestActiveEnemy();
  if (nearestEnemy && this.time.now >= lastAttackTime + playerStats.getAttackCooldownMs()) {
    fireProjectile(this, nearestEnemy);
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

function updateHudText() {
  if (!hudText || !player) {
    return;
  }

  const currentHp = Math.max(0, player.getData("currentHp") ?? PLAYER_MAX_HP);
  const maxHp = player.getData("maxHp") ?? PLAYER_MAX_HP;
  const requiredExp = getExpRequiredForLevel(runState.runLevel);
  const gameStatus = isRunOver ? "\nStatus: Game Over" : "";

  hudText.setText(
    `Player HP: ${currentHp} / ${maxHp}\n`
    + `Run Level: ${runState.runLevel}\n`
    + `EXP: ${runState.exp} / ${requiredExp}\n`
    + `killCount: ${killCount}`
    + gameStatus
  );
}

function fireProjectile(scene, targetEnemy) {
  if (!targetEnemy?.active) {
    return;
  }

  const projectile = scene.add.circle(player.x, player.y, PROJECTILE_RADIUS, 0xffffff);
  scene.physics.add.existing(projectile);
  projectiles.add(projectile);

  const direction = new Phaser.Math.Vector2(targetEnemy.x - player.x, targetEnemy.y - player.y);

  if (direction.lengthSq() === 0) {
    projectile.body.setVelocity(0);
    return;
  }

  direction.normalize().scale(PROJECTILE_SPEED);
  projectile.body.setVelocity(direction.x, direction.y);
}

function spawnExpOrb(scene, x, y) {
  if (isRunOver) {
    return null;
  }

  const expOrb = scene.add.circle(x, y, EXP_ORB_RADIUS, 0xfde047);
  scene.physics.add.existing(expOrb);
  expOrbs.add(expOrb);
  return expOrb;
}

function spawnEnemy(scene) {
  if (isRunOver) {
    return null;
  }

  if (enemies.countActive(true) >= ENEMY_MAX_ACTIVE) {
    return null;
  }

  const spawnPoint = getEnemySpawnPoint();
  if (!spawnPoint) {
    return null;
  }

  const enemy = scene.add.circle(spawnPoint.x, spawnPoint.y, 18, 0xef4444);
  scene.physics.add.existing(enemy);
  enemy.body.setCollideWorldBounds(true);
  enemy.setData("hp", ENEMY_BASE_HP);
  enemies.add(enemy);
  return enemy;
}

function getEnemySpawnPoint() {
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const side = Phaser.Math.Between(0, 3);
    let x = 0;
    let y = 0;

    if (side === 0) {
      x = Phaser.Math.Between(0, config.width);
      y = 18;
    } else if (side === 1) {
      x = Phaser.Math.Between(0, config.width);
      y = config.height - 18;
    } else if (side === 2) {
      x = 18;
      y = Phaser.Math.Between(0, config.height);
    } else {
      x = config.width - 18;
      y = Phaser.Math.Between(0, config.height);
    }

    const distanceFromPlayer = Phaser.Math.Distance.Between(x, y, player.x, player.y);
    if (distanceFromPlayer >= ENEMY_MIN_DISTANCE_FROM_PLAYER) {
      return { x, y };
    }
  }

  return null;
}

function scheduleNextEnemySpawn(scene) {
  if (isRunOver) {
    return;
  }

  enemySpawnTimer = scene.time.addEvent({
    delay: currentEnemySpawnInterval,
    callback: () => {
      if (isRunOver) {
        return;
      }

      spawnEnemy(scene);
      currentEnemySpawnInterval = Math.max(
        ENEMY_MIN_SPAWN_INTERVAL_MS,
        currentEnemySpawnInterval - ENEMY_SPAWN_INTERVAL_DECAY_MS
      );
      scheduleNextEnemySpawn(scene);
    }
  });
}

function endRun(scene) {
  if (isRunOver || hasGrantedGameOverReward) {
    return;
  }

  isRunOver = true;
  hasGrantedGameOverReward = true;
  pendingLevelUpChoices = 0;
  hideLevelUpOverlay();
  resumePhysicsIfNeeded(scene);
  player.body.setVelocity(0);

  if (enemySpawnTimer) {
    enemySpawnTimer.remove(false);
    enemySpawnTimer = null;
  }

  enemies.children.each((enemy) => {
    if (enemy?.active) {
      enemy.body.setVelocity(0);
    }
  });

  const survivalTimeSeconds = Math.floor((scene.time.now - runStartTimeMs) / 1000);
  const earnedResource = killCount + Math.floor(survivalTimeSeconds / 10);
  metaState.permanentResource += earnedResource;
  savePermanentResource(metaState);

  const centerX = config.width / 2;
  const centerY = config.height / 2;

  resultPanel = scene.add.rectangle(centerX, centerY, 620, 330, 0x000000, 0.72)
    .setStrokeStyle(2, 0xffffff, 0.35)
    .setDepth(1200);

  gameOverText = scene.add.text(centerX, centerY - 125, "Game Over", {
    fontSize: "48px",
    color: "#ffffff"
  }).setOrigin(0.5).setDepth(1201);

  resultText = scene.add.text(
    centerX,
    centerY - 10,
    `Survival Time: ${survivalTimeSeconds}s\n`
    + `Kills: ${killCount}\n`
    + `Final Level: ${runState.runLevel}\n`
    + `Earned Permanent Resource: +${earnedResource}\n`
    + `Total Permanent Resource: ${metaState.permanentResource}`,
    {
      fontSize: "26px",
      color: "#ffffff",
      align: "center",
      lineSpacing: 8
    }
  ).setOrigin(0.5).setDepth(1201);

  restartText = scene.add.text(centerX, centerY + 128, "Press R to Restart", {
    fontSize: "24px",
    color: "#ffffff"
  }).setOrigin(0.5).setDepth(1201);
}

function restartRun() {
  if (typeof window !== "undefined" && window.location) {
    window.location.reload();
  }
}

function processRunLevelUps() {
  if (isRunOver) {
    return;
  }

  let gainedLevels = 0;
  let requiredExp = getExpRequiredForLevel(runState.runLevel);

  while (runState.exp >= requiredExp) {
    runState.exp -= requiredExp;
    runState.runLevel += 1;
    gainedLevels += 1;
    console.log("[RunState] Level Up:", runState.runLevel, "Remaining EXP:", runState.exp);
    requiredExp = getExpRequiredForLevel(runState.runLevel);
  }

  if (gainedLevels > 0) {
    pendingLevelUpChoices += gainedLevels;
    if (!isLevelUpPaused) {
      showNextLevelUpChoice();
    }
  }
}

function getNearestActiveEnemy() {
  let nearestEnemy = null;
  let nearestDistanceSq = Number.POSITIVE_INFINITY;

  enemies.children.each((enemy) => {
    if (!enemy?.active) {
      return;
    }

    const distanceSq = Phaser.Math.Distance.Squared(player.x, player.y, enemy.x, enemy.y);
    if (distanceSq < nearestDistanceSq) {
      nearestDistanceSq = distanceSq;
      nearestEnemy = enemy;
    }
  });

  return nearestEnemy;
}

function showNextLevelUpChoice() {
  if (isRunOver || pendingLevelUpChoices <= 0 || !activeScene) {
    return;
  }

  isLevelUpPaused = true;
  activeScene.physics.world.pause();
  if (enemySpawnTimer) {
    enemySpawnTimer.paused = true;
  }

  levelUpTitleText = activeScene.add.text(config.width / 2, config.height / 2 - 90, "Level Up!", {
    fontSize: "48px",
    color: "#facc15"
  }).setOrigin(0.5);

  levelUpOptionTexts = LEVEL_UP_OPTIONS.map((option, index) => activeScene.add.text(
    config.width / 2,
    config.height / 2 - 20 + (index * 38),
    option.label,
    {
      fontSize: "26px",
      color: "#ffffff"
    }
  ).setOrigin(0.5));
}

function hideLevelUpOverlay() {
  levelUpTitleText?.destroy();
  levelUpTitleText = null;

  levelUpOptionTexts.forEach((text) => text.destroy());
  levelUpOptionTexts = [];
}

function selectLevelUpOption(optionIndex) {
  if (isRunOver || !isLevelUpPaused) {
    return;
  }

  const selectedOption = LEVEL_UP_OPTIONS[optionIndex];
  if (!selectedOption) {
    return;
  }

  applyTemporaryUpgrade(selectedOption.id);
  runState.temporaryUpgrades.push(selectedOption.id);
  pendingLevelUpChoices = Math.max(0, pendingLevelUpChoices - 1);

  hideLevelUpOverlay();
  if (pendingLevelUpChoices > 0) {
    showNextLevelUpChoice();
    return;
  }

  isLevelUpPaused = false;
  resumePhysicsIfNeeded(activeScene);
}

function applyTemporaryUpgrade(upgradeId) {
  if (upgradeId === "move_speed_10") {
    playerStats.moveSpeedMultiplier *= 1.1;
  } else if (upgradeId === "projectile_damage_1") {
    playerStats.projectileDamageBonus += 1;
  } else if (upgradeId === "attack_cooldown_10") {
    playerStats.attackCooldownMultiplier *= 0.9;
  }
}

function resumePhysicsIfNeeded(scene) {
  if (!scene) {
    return;
  }

  scene.physics.world.resume();
  if (enemySpawnTimer) {
    enemySpawnTimer.paused = false;
  }
}
