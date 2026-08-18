import { ASSETS, type AudioAssetId } from "../content/assets";

export class AudioManager {
  private readonly tracks = {} as Record<AudioAssetId, HTMLAudioElement>;
  private active?: AudioAssetId;
  private unlocked = false;
  private volume = 0.55;

  constructor() {
    (Object.keys(ASSETS.audio) as AudioAssetId[]).forEach((key) => {
      const audio = new Audio(ASSETS.audio[key]);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;
      this.tracks[key] = audio;
    });
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.active) this.tracks[this.active].volume = volume;
  }

  async unlock(): Promise<void> {
    this.unlocked = true;
    if (this.active) await this.tracks[this.active].play().catch(() => undefined);
  }

  async play(key: AudioAssetId, immediate = false): Promise<void> {
    if (this.active === key) return;
    const old = this.active ? this.tracks[this.active] : undefined;
    const next = this.tracks[key];
    this.active = key;
    next.volume = immediate ? this.volume : 0;
    if (this.unlocked) await next.play().catch(() => undefined);
    if (immediate) {
      if (old) {
        old.pause();
        old.currentTime = 0;
      }
      return;
    }
    const duration = 900;
    const started = performance.now();
    const fade = (time: number) => {
      const progress = Math.min(1, (time - started) / duration);
      next.volume = this.volume * progress;
      if (old) old.volume = this.volume * (1 - progress);
      if (progress < 1) requestAnimationFrame(fade);
      else if (old) {
        old.pause();
        old.currentTime = 0;
      }
    };
    requestAnimationFrame(fade);
  }

  pause(): void {
    if (this.active) this.tracks[this.active].pause();
  }

  resume(): void {
    if (this.active && this.unlocked) void this.tracks[this.active].play().catch(() => undefined);
  }

  destroy(): void {
    Object.values(this.tracks).forEach((track) => track.pause());
  }
}
