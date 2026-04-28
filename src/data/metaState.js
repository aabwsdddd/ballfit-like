const initialMetaState = {
  permanentResource: 0,
  permanentUpgrades: []
};

const META_STATE_STORAGE_KEY = "ballfit-like-save";

export function createMetaState() {
  return {
    ...initialMetaState,
    permanentUpgrades: [...initialMetaState.permanentUpgrades]
  };
}

export const metaState = createMetaState();

export function loadPermanentResource(targetMetaState = metaState) {
  if (typeof window === "undefined" || !window.localStorage) {
    targetMetaState.permanentResource = 0;
    return targetMetaState.permanentResource;
  }

  try {
    const rawSave = window.localStorage.getItem(META_STATE_STORAGE_KEY);
    if (!rawSave) {
      targetMetaState.permanentResource = 0;
      return targetMetaState.permanentResource;
    }

    const parsedSave = JSON.parse(rawSave);
    const loadedPermanentResource = Number(parsedSave?.permanentResource);
    targetMetaState.permanentResource = Number.isFinite(loadedPermanentResource)
      ? Math.max(0, Math.floor(loadedPermanentResource))
      : 0;
  } catch (error) {
    console.warn("[MetaState] Failed to load permanent resource save.", error);
    targetMetaState.permanentResource = 0;
  }

  return targetMetaState.permanentResource;
}

export function savePermanentResource(sourceMetaState = metaState) {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }

  try {
    const saveData = {
      permanentResource: Math.max(0, Math.floor(sourceMetaState.permanentResource ?? 0))
    };
    window.localStorage.setItem(META_STATE_STORAGE_KEY, JSON.stringify(saveData));
    return true;
  } catch (error) {
    console.warn("[MetaState] Failed to save permanent resource.", error);
    return false;
  }
}
