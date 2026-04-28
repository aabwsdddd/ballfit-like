const initialRunState = {
  exp: 0,
  runLevel: 1,
  temporaryUpgrades: []
};

export function createRunState() {
  return {
    ...initialRunState,
    temporaryUpgrades: [...initialRunState.temporaryUpgrades]
  };
}

export const runState = createRunState();
