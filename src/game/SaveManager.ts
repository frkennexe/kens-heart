export type Settings = {
  musicVolume: number;
  sfxVolume: number;
  reducedMotion: boolean;
  textSpeed: "slow" | "normal" | "fast" | "instant";
  screenShake: boolean;
};

export type GameSave = {
  version: 1;
  sceneId: number;
  position: { x: number; y: number };
  completed: string[];
  memories: string[];
  endingViewed: boolean;
  settings: Settings;
};

const KEY = "kens-heart-save-v1";

export const DEFAULT_SETTINGS: Settings = {
  musicVolume: 0.55,
  sfxVolume: 0.65,
  reducedMotion: false,
  textSpeed: "normal",
  screenShake: true,
};

export const blankSave = (): GameSave => ({
  version: 1,
  sceneId: 1,
  position: { x: 180, y: 470 },
  completed: [],
  memories: [],
  endingViewed: false,
  settings: { ...DEFAULT_SETTINGS },
});

export class SaveManager {
  static load(): GameSave | null {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) ?? "null") as GameSave | null;
      if (!parsed || parsed.version !== 1 || !Number.isFinite(parsed.sceneId)) return null;
      return { ...blankSave(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
    } catch {
      return null;
    }
  }

  static save(value: GameSave): void {
    localStorage.setItem(KEY, JSON.stringify(value));
  }

  static clear(): void {
    localStorage.removeItem(KEY);
  }
}
