const initialRunState = {
  exp: 0,
  runLevel: 1,
  temporaryUpgrades: []
};

const EXP_REQUIREMENT_BASE = 5;
const EXP_REQUIREMENT_GROWTH = 1.6;

export function getExpRequiredForLevel(level) {
  const safeLevel = Math.max(1, level);
  return Math.floor(EXP_REQUIREMENT_BASE * (EXP_REQUIREMENT_GROWTH ** (safeLevel - 1)));
}

export function createRunState() {
  return {
    ...initialRunState,
    temporaryUpgrades: [...initialRunState.temporaryUpgrades]
  };
}

export const runState = createRunState();
