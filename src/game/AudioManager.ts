import { ASSETS, type AudioAssetId } from "../content/assets";

export class AudioManager {
  private readonly tracks = {} as Record<AudioAssetId, HTMLAudioElement>;
  private active?: AudioAssetId;
  private unlocked = false;
  private volume = 0.55;
  private fadeFrame?: number;

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
    if (!this.active) return;
    const track = this.tracks[this.active];
    track.volume = 0;
    await track.play().catch(() => undefined);
    this.fadeIn(track);
  }

  async play(key: AudioAssetId): Promise<void> {
    if (this.active === key) return;
    if (this.fadeFrame) cancelAnimationFrame(this.fadeFrame);
    const old = this.active ? this.tracks[this.active] : undefined;
    const next = this.tracks[key];
    this.active = key;
    next.volume = 0;
    if (this.unlocked) await next.play().catch(() => undefined);
    const duration = 900;
    const started = performance.now();
    const fade = (time: number) => {
      const progress = Math.max(0, Math.min(1, (time - started) / duration));
      next.volume = this.volume * progress;
      if (old) old.volume = this.volume * (1 - progress);
      if (progress < 1) this.fadeFrame = requestAnimationFrame(fade);
      else if (old) {
        old.pause();
        old.currentTime = 0;
      }
    };
    this.fadeFrame = requestAnimationFrame(fade);
  }

  private fadeIn(track: HTMLAudioElement, duration = 900): void {
    if (this.fadeFrame) cancelAnimationFrame(this.fadeFrame);
    const started = performance.now();
    const fade = (time: number) => {
      const progress = Math.max(0, Math.min(1, (time - started) / duration));
      track.volume = this.volume * progress;
      if (progress < 1) this.fadeFrame = requestAnimationFrame(fade);
    };
    this.fadeFrame = requestAnimationFrame(fade);
  }

  fadeOut(duration = 700): void {
    if (!this.active) return;
    if (this.fadeFrame) cancelAnimationFrame(this.fadeFrame);
    const old = this.tracks[this.active];
    const activeKey = this.active;
    const startVolume = old.volume;
    const started = performance.now();
    const fade = (time: number) => {
      const progress = Math.max(0, Math.min(1, (time - started) / duration));
      old.volume = startVolume * (1 - progress);
      if (progress < 1) this.fadeFrame = requestAnimationFrame(fade);
      else {
        old.pause();
        old.currentTime = 0;
        if (this.active === activeKey) this.active = undefined;
      }
    };
    this.fadeFrame = requestAnimationFrame(fade);
  }

  pause(): void {
    if (this.active) this.tracks[this.active].pause();
  }

  resume(): void {
    if (this.active && this.unlocked) void this.tracks[this.active].play().catch(() => undefined);
  }

  destroy(): void {
    if (this.fadeFrame) cancelAnimationFrame(this.fadeFrame);
    Object.values(this.tracks).forEach((track) => track.pause());
  }
}
