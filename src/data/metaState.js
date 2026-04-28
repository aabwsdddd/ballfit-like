const META_STATE_STORAGE_KEY = "ballfit-like-save";

const initialPermanentUpgrades = {
  startingHp: 0,
  startingDamage: 0,
  resourceGain: 0
};

const initialMetaState = {
  permanentResource: 0,
  permanentUpgrades: initialPermanentUpgrades
};

function createPermanentUpgrades(upgrades = initialPermanentUpgrades) {
  return {
    startingHp: Math.max(0, Math.floor(Number(upgrades?.startingHp) || 0)),
    startingDamage: Math.max(0, Math.floor(Number(upgrades?.startingDamage) || 0)),
    resourceGain: Math.max(0, Math.floor(Number(upgrades?.resourceGain) || 0))
  };
}

export function createMetaState() {
  return {
    permanentResource: initialMetaState.permanentResource,
    permanentUpgrades: createPermanentUpgrades(initialMetaState.permanentUpgrades)
  };
}

export const metaState = createMetaState();

export function resetPermanentResource(targetMetaState = metaState) {
  targetMetaState.permanentResource = initialMetaState.permanentResource;
  targetMetaState.permanentUpgrades = createPermanentUpgrades(initialMetaState.permanentUpgrades);

  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  try {
    window.localStorage.removeItem(META_STATE_STORAGE_KEY);
    return true;
  } catch (error) {
    console.warn("[MetaState] Failed to reset permanent resource save.", error);
    return false;
  }
}

export function loadPermanentResource(targetMetaState = metaState) {
  if (typeof window === "undefined" || !window.localStorage) {
    targetMetaState.permanentResource = 0;
    targetMetaState.permanentUpgrades = createPermanentUpgrades();
    return targetMetaState.permanentResource;
  }

  try {
    const rawSave = window.localStorage.getItem(META_STATE_STORAGE_KEY);
    if (!rawSave) {
      targetMetaState.permanentResource = 0;
      targetMetaState.permanentUpgrades = createPermanentUpgrades();
      return targetMetaState.permanentResource;
    }

    const parsedSave = JSON.parse(rawSave);
    const loadedPermanentResource = Number(parsedSave?.permanentResource);
    targetMetaState.permanentResource = Number.isFinite(loadedPermanentResource)
      ? Math.max(0, Math.floor(loadedPermanentResource))
      : 0;
    targetMetaState.permanentUpgrades = createPermanentUpgrades(parsedSave?.permanentUpgrades);
  } catch (error) {
    console.warn("[MetaState] Failed to load permanent resource save.", error);
    targetMetaState.permanentResource = 0;
    targetMetaState.permanentUpgrades = createPermanentUpgrades();
  }

  return targetMetaState.permanentResource;
}

export function savePermanentResource(sourceMetaState = metaState) {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  try {
    const saveData = {
      permanentResource: Math.max(0, Math.floor(sourceMetaState.permanentResource ?? 0)),
      permanentUpgrades: createPermanentUpgrades(sourceMetaState.permanentUpgrades)
    };
    window.localStorage.setItem(META_STATE_STORAGE_KEY, JSON.stringify(saveData));
    return true;
  } catch (error) {
    console.warn("[MetaState] Failed to save permanent resource.", error);
    return false;
  }
}
