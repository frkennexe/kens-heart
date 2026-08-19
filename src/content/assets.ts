/**
 * One semantic asset manifest. Replace a value here instead of hunting through game code.
 * The three supplied audio files are deliberately named after their in-game use.
 */
export const ASSETS = {
  audio: {
    normalScenery: "./assets/audio/normal-scenery-wind.mp3",
    mysteries: "./assets/audio/mysteries-undertale.mp3",
    brightMoment: "./assets/audio/bright-moment-fading-memory.mp3",
  },
  images: {
    faySprite: "./assets/images/fay-pixel.png",
    kenSprite: "./assets/images/ken-source.png",
    tavernHouse: "./assets/images/tavern-house.png",
    archiveCottage: "./assets/images/archive-cottage.png",
    heartCastle: "./assets/images/heart-castle.png",
  },
  placeholders: {
    fayPortrait: "./assets/images/fay-pixel.png",
    kenPortrait: "./assets/images/ken-source.png",
    memoryCrystal: "procedural:crystal",
  },
} as const;

export type AudioAssetId = keyof typeof ASSETS.audio;
