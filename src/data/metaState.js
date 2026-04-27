const initialMetaState = {
  permanentResource: 0,
  permanentUpgrades: []
};

export function createMetaState() {
  return {
    ...initialMetaState,
    permanentUpgrades: [...initialMetaState.permanentUpgrades]
  };
}

export const metaState = createMetaState();
