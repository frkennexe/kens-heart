import { BIRTHDAY_LETTER, OLD_NOTE } from "../content/letters";
import { MEMORIES } from "../content/memories";
import { SCENES, sceneById, type Interactable, type Line, type StoryScene } from "../content/story";
import { ASSETS } from "../content/assets";
import { AudioManager } from "./AudioManager";
import { blankSave, SaveManager, type GameSave, type Settings } from "./SaveManager";

const W = 1280;
const H = 720;
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const rgba = (hex: string, alpha: number) => {
  const numeric = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(numeric >> 16) & 255}, ${(numeric >> 8) & 255}, ${numeric & 255}, ${alpha})`;
};

type GameMode = "title" | "playing" | "paused";
type DialogState = { lines: Line[]; index: number; resolve?: () => void };

export class KensHeartGame {
  private readonly root: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly audio = new AudioManager();
  private readonly faySprite = new Image();
  private readonly kenSprite = new Image();
  private readonly tavernHouse = new Image();
  private readonly archiveCottage = new Image();
  private readonly heartCastle = new Image();
  private kenSpriteCanvas?: HTMLCanvasElement;
  private save: GameSave = SaveManager.load() ?? blankSave();
  private mode: GameMode = "title";
  private scene: StoryScene = sceneById(1);
  private player = { x: 180, y: 470, facing: 1, bob: 0 };
  private clickTarget?: { x: number; y: number };
  private keys = new Set<string>();
  private dialog?: DialogState;
  private nearest?: Interactable;
  private lastTime = 0;
  private elapsed = 0;
  private started = false;
  private restored = 0;
  private finalPhase = false;
  private transitioning = false;
  private checkpointFlash = 0;
  private toast = "";
  private toastUntil = 0;
  private shake = 0;
  private readonly ui: Record<string, HTMLElement>;

  constructor(mount: HTMLElement) {
    this.faySprite.src = ASSETS.images.faySprite;
    this.kenSprite.addEventListener("load", () => this.prepareKenSprite());
    this.kenSprite.src = ASSETS.images.kenSprite;
    this.tavernHouse.src = ASSETS.images.tavernHouse;
    this.archiveCottage.src = ASSETS.images.archiveCottage;
    this.heartCastle.src = ASSETS.images.heartCastle;
    mount.innerHTML = `
      <section class="game-shell" aria-label="Ken's Heart">
        <canvas class="world" width="1280" height="720" tabindex="0" aria-label="Playable fantasy world"></canvas>
        <div class="grain"></div><div class="letterbox top"></div><div class="letterbox bottom"></div>
        <div id="sceneFade" class="scene-fade"></div>
        <header class="hud" aria-live="polite">
          <div class="title-pill"><span class="pulse-dot"></span><span id="realmName">THE CROSSROADS</span></div>
          <div id="objective" class="objective"></div>
          <div id="saveMark" class="save-mark">✦ saved</div>
          <button class="icon-button" id="pauseButton" aria-label="Pause game">Ⅱ</button>
        </header>
        <div id="prompt" class="prompt" aria-live="polite"></div>
        <div id="toast" class="toast" aria-live="polite"></div>
        <section id="dialogue" class="dialogue" aria-live="polite">
          <div id="portrait" class="portrait fay">
            <img id="portraitImage" class="portrait-image" alt="Fay" />
            <span id="portraitInitial" class="portrait-initial" hidden>F</span>
          </div>
          <div class="dialogue-copy"><p id="speaker" class="speaker"></p><p id="dialogueText" class="dialogue-text"></p><span class="advance">E / Enter to continue <i>◆</i></span></div>
        </section>
        <section id="titleScreen" class="screen title-screen">
          <div class="title-stars">✦　·　✧　·　✦</div>
          <h1>KEN'S <em>HEART</em></h1>
          <div class="menu-actions">
            <button class="primary" data-action="new">Begin</button>
            <button data-action="continue" id="continueButton">Continue</button>
          </div>
        </section>
        <section id="pauseScreen" class="screen pause-screen" aria-modal="true" role="dialog">
          <p class="eyebrow">A little breathing room</p><h2>PAUSED</h2><p id="pauseObjective" class="pause-objective"></p>
          <div class="menu-actions"><button class="primary" data-action="resume">Resume</button><button data-action="memories">Memories</button><button data-action="settings">Settings</button><button data-action="restart">Restart checkpoint</button><button data-action="title">Return to title</button></div>
        </section>
        <section id="panel" class="panel" aria-modal="true" role="dialog"><button id="panelClose" class="panel-close" aria-label="Close">×</button><div id="panelContent"></div></section>
        <section id="letter" class="letter" aria-modal="true" role="dialog"><article><p id="letterKicker" class="eyebrow"></p><h2 id="letterTitle"></h2><div id="letterBody" class="letter-body"></div><button id="letterClose" class="primary">Close the letter</button></article></section>
        <section id="finalReveal" class="final-reveal" aria-modal="true" role="dialog"><div class="reveal-copy"><p>You were never travelling through a kingdom, Fay.</p><h2>You were travelling through <em>Ken's Heart.</em></h2><p class="birthday">HAPPY BIRTHDAY FAY</p><button id="openBirthdayLetter" class="primary">Open Ken's letter</button></div></section>
        <aside class="mobile-controls" aria-label="Touch controls"><div class="dpad"><button data-key="ArrowUp">▲</button><button data-key="ArrowLeft">◀</button><button data-key="ArrowDown">▼</button><button data-key="ArrowRight">▶</button></div><button id="mobileAction" class="action-orb">✦<span>talk</span></button></aside>
      </section>`;
    this.root = mount;
    this.canvas = this.$(".world") as HTMLCanvasElement;
    const context = this.canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable in this browser.");
    this.ctx = context;
    this.ui = {
      title: this.$("#titleScreen"), pause: this.$("#pauseScreen"), dialogue: this.$("#dialogue"),
      prompt: this.$("#prompt"), objective: this.$("#objective"), realm: this.$("#realmName"),
      toast: this.$("#toast"), panel: this.$("#panel"), panelContent: this.$("#panelContent"),
      letter: this.$("#letter"), letterKicker: this.$("#letterKicker"), letterTitle: this.$("#letterTitle"),
      letterBody: this.$("#letterBody"), final: this.$("#finalReveal"), saveMark: this.$("#saveMark"),
      sceneFade: this.$("#sceneFade"),
      speaker: this.$("#speaker"), dialogueText: this.$("#dialogueText"), portrait: this.$("#portrait"),
      portraitImage: this.$("#portraitImage"), portraitInitial: this.$("#portraitInitial"),
      pauseObjective: this.$("#pauseObjective"), continue: this.$("#continueButton"),
    };
    this.bindEvents();
    this.setScene(1, false);
    this.updateMenu();
    this.ui.title.classList.add("show");
    requestAnimationFrame((time) => this.loop(time));
  }

  private $(selector: string): HTMLElement {
    const element = this.root?.querySelector<HTMLElement>(selector) ?? document.querySelector<HTMLElement>(selector);
    if (!element) throw new Error(`Required element ${selector} is missing.`);
    return element;
  }

  private bindEvents(): void {
    window.addEventListener("resize", () => this.resize());
    document.addEventListener("keydown", (event) => {
      const activeTag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (["input", "select", "button"].includes(activeTag) && event.key !== "Escape") return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
      if (["w", "a", "s", "d", "W", "A", "S", "D", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        this.keys.add(event.key.toLowerCase());
      }
      if (event.key === "e" || event.key === "E" || event.key === "Enter" || event.key === " ") this.action();
      if (event.key === "Escape") this.escape();
    });
    document.addEventListener("keyup", (event) => this.keys.delete(event.key.toLowerCase()));
    this.root.addEventListener("click", (event) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>("button");
      if (!target) return;
      const action = target.dataset.action;
      if (action) this.menuAction(action);
    });
    this.$("#pauseButton").addEventListener("click", () => this.togglePause());
    this.canvas.addEventListener("pointerdown", (event) => {
      this.focusGame();
      if (this.mode !== "playing" || this.dialog || this.ui.letter.classList.contains("show") || this.ui.final.classList.contains("show")) return;
      const rect = this.canvas.getBoundingClientRect();
      this.clickTarget = {
        x: clamp((event.clientX - rect.left) / rect.width * W, 70, 1210),
        y: clamp((event.clientY - rect.top) / rect.height * H, 160, 630),
      };
    });
    this.$("#panelClose").addEventListener("click", () => this.closePanel());
    this.$("#letterClose").addEventListener("click", () => this.closeLetter());
    this.$("#openBirthdayLetter").addEventListener("click", () => {
      this.ui.final.classList.remove("show");
      this.openLetter("A birthday letter", "For Fay, from Ken", BIRTHDAY_LETTER, true);
    });
    this.$("#mobileAction").addEventListener("click", () => this.action());
    this.root.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((button) => {
      const key = button.dataset.key?.toLowerCase();
      if (!key) return;
      const press = (event: PointerEvent) => { event.preventDefault(); this.keys.add(key); };
      const release = (event: PointerEvent) => { event.preventDefault(); this.keys.delete(key); };
      button.addEventListener("pointerdown", press);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("pointerleave", release);
    });
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const density = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(rect.width * density));
    this.canvas.height = Math.max(1, Math.floor(rect.height * density));
  }

  private focusGame(): void {
    this.canvas.focus({ preventScroll: true });
  }

  private prepareKenSprite(): void {
    if (!this.kenSprite.naturalWidth || !this.kenSprite.naturalHeight) return;
    const canvas = document.createElement("canvas");
    canvas.width = this.kenSprite.naturalWidth;
    canvas.height = this.kenSprite.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(this.kenSprite, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < pixels.data.length; index += 4) {
      const red = pixels.data[index]; const green = pixels.data[index + 1]; const blue = pixels.data[index + 2];
      const isFlatGrey = red >= 112 && red <= 148 && Math.abs(red - green) <= 4 && Math.abs(green - blue) <= 4;
      if (isFlatGrey) pixels.data[index + 3] = 0;
    }
    context.putImageData(pixels, 0, 0);
    this.kenSpriteCanvas = canvas;
    const portraitImage = this.ui?.portraitImage as HTMLImageElement | undefined;
    if (portraitImage && this.dialog?.lines[this.dialog.index]?.speaker === "Ken") portraitImage.src = canvas.toDataURL();
  }

  private menuAction(action: string): void {
    if (action === "new") this.startNewGame();
    if (action === "continue") this.continueGame();
    if (action === "resume") this.togglePause(false);
    if (action === "memories") this.openMemories();
    if (action === "settings") this.openSettings();
    if (action === "credits") this.openCredits();
    if (action === "restart") this.restartCheckpoint();
    if (action === "title") this.returnToTitle();
  }

  private async startNewGame(): Promise<void> {
    if (SaveManager.load() && !confirm("Start a new journey? Your saved progress will be replaced.")) return;
    this.save = blankSave();
    this.started = true;
    this.mode = "playing";
    this.ui.title.classList.remove("show");
    this.ui.pause.classList.remove("show");
    this.focusGame();
    await this.audio.unlock();
    this.setScene(1, true);
  }

  private async continueGame(): Promise<void> {
    const loaded = SaveManager.load();
    if (!loaded) return;
    this.save = loaded;
    this.started = true;
    this.mode = "playing";
    this.ui.title.classList.remove("show");
    this.focusGame();
    await this.audio.unlock();
    this.setScene(this.save.sceneId, false);
    this.player = { ...this.save.position, facing: 1, bob: 0 };
    this.showToast("Welcome back, Fay.");
  }

  private returnToTitle(): void {
    this.mode = "title";
    this.dialog = undefined;
    this.closePanel();
    this.closeLetter(false);
    this.ui.pause.classList.remove("show");
    this.ui.title.classList.add("show");
    this.audio.fadeOut();
    this.updateMenu();
  }

  private restartCheckpoint(): void {
    const saved = SaveManager.load();
    if (!saved || !confirm("Restart from the last safe checkpoint?")) return;
    this.save = saved;
    this.setScene(saved.sceneId, false);
    this.player = { ...saved.position, facing: 1, bob: 0 };
    this.togglePause(false);
  }

  private togglePause(force?: boolean): void {
    if (this.mode === "title" || this.dialog || this.ui.letter.classList.contains("show")) return;
    const pause = force ?? this.mode !== "paused";
    this.mode = pause ? "paused" : "playing";
    this.ui.pause.classList.toggle("show", pause);
    this.ui.pauseObjective.textContent = this.scene.objective || "No objective. Just keep walking.";
    if (pause) this.audio.pause();
    else { this.audio.resume(); this.focusGame(); }
  }

  private setScene(id: number, showIntro: boolean): void {
    this.scene = sceneById(id);
    this.save.sceneId = this.scene.id;
    this.player = { ...this.scene.start, facing: 1, bob: 0 };
    this.restored = this.scene.id === 4 ? this.save.completed.filter((id) => id.startsWith("light_") || id === "lake").length : 0;
    this.ui.realm.textContent = this.scene.name;
    this.ui.objective.textContent = this.scene.objective;
    this.audio.setVolume(this.save.settings.musicVolume);
    void this.audio.play(this.scene.mood.audio);
    this.saveNow();
    if (showIntro) window.setTimeout(() => this.openDialogue(this.scene.intro), 650);
  }

  private action(): void {
    if (this.transitioning) return;
    if (this.ui.panel.classList.contains("show")) return;
    if (this.ui.letter.classList.contains("show")) return;
    if (this.ui.final.classList.contains("show")) return;
    if (this.dialog) {
      this.advanceDialogue();
      return;
    }
    if (this.mode !== "playing") return;
    if (this.nearest) this.interact(this.nearest);
  }

  private escape(): void {
    if (this.ui.panel.classList.contains("show")) { this.closePanel(); return; }
    if (this.ui.letter.classList.contains("show")) { this.closeLetter(); return; }
    if (this.ui.final.classList.contains("show")) return;
    if (this.dialog) { this.advanceDialogue(); return; }
    this.togglePause();
  }

  private interact(interactable: Interactable): void {
    if (this.save.completed.includes(interactable.id) && interactable.kind !== "gate" && interactable.id !== "tavern") {
      this.showToast("This memory is safely held in the Archive.");
      return;
    }
    if (interactable.id === "archive_exit" && !this.save.completed.includes("archive")) {
      this.showToast("The glowing page in the Archive is still waiting.");
      return;
    }
    this.openDialogue(interactable.lines ?? [], () => this.resolveInteraction(interactable));
  }

  private resolveInteraction(interactable: Interactable): void {
    if (!this.save.completed.includes(interactable.id)) this.save.completed.push(interactable.id);
    if (interactable.memory && !this.save.memories.includes(interactable.memory)) {
      this.save.memories.push(interactable.memory);
      const memory = MEMORIES.find((item) => item.id === interactable.memory);
      this.showToast(`Memory held: ${memory?.title ?? "Unknown memory"}`);
    }
    if (interactable.after === "restore") {
      this.restored += 1;
      this.shake = 0.5;
      this.showToast("The garden remembers how to grow.");
    }
    if (interactable.after === "bridge") {
      this.ui.objective.innerHTML = "<s>Stay with Fay.</s>";
      this.shake = 1.7;
      this.audio.fadeOut();
      window.setTimeout(() => this.changeScene(3), 1500);
    } else if (interactable.after === "lowest") {
      this.scene.objective = "Follow the distant chime.";
      this.ui.objective.textContent = this.scene.objective;
      this.audio.fadeOut(650);
      window.setTimeout(() => void this.audio.play(this.scene.mood.audio), 2200);
    } else if (interactable.after === "note") {
      this.openLetter("The Archive", "An old note", OLD_NOTE, false);
    } else if (interactable.after === "nextScene") {
      this.changeScene(Math.min(5, this.scene.id + 1));
    } else if (interactable.after === "final") {
      this.finalPhase = true;
      this.save.endingViewed = true;
      this.saveNow();
      this.shake = 0.6;
      window.setTimeout(() => this.ui.final.classList.add("show"), 750);
    }
    this.saveNow();
  }

  private changeScene(nextId: number): void {
    if (this.transitioning) return;
    this.transitioning = true;
    this.showToast(`Chapter ${nextId}: ${sceneById(nextId).name}`);
    this.ui.sceneFade.classList.add("show");
    window.setTimeout(() => {
      this.setScene(nextId, true);
      window.setTimeout(() => {
        this.ui.sceneFade.classList.remove("show");
        this.transitioning = false;
      }, 330);
    }, 420);
  }

  private openDialogue(lines: Line[], resolve?: () => void): void {
    if (!lines.length) { resolve?.(); return; }
    this.dialog = { lines, index: 0, resolve };
    this.ui.dialogue.classList.add("show");
    this.renderDialogueLine();
  }

  private renderDialogueLine(): void {
    if (!this.dialog) return;
    const line = this.dialog.lines[this.dialog.index];
    this.ui.speaker.textContent = line.speaker ?? "Narrator";
    this.ui.dialogueText.textContent = line.text;
    this.ui.dialogue.classList.toggle("cinematic", Boolean(line.cinematic));
    this.ui.portrait.className = `portrait ${(line.speaker ?? "Narrator").toLowerCase()}`;
    const portraitImage = this.ui.portraitImage as HTMLImageElement;
    const portraitInitial = this.ui.portraitInitial;
    const speaker = line.speaker ?? "Narrator";
    const characterSprite = speaker === "Fay" || speaker === "Ken";
    portraitImage.hidden = !characterSprite;
    portraitInitial.hidden = characterSprite;
    if (speaker === "Fay") {
      portraitImage.src = ASSETS.images.faySprite;
      portraitImage.alt = "Fay";
    } else if (speaker === "Ken") {
      portraitImage.src = this.kenSpriteCanvas?.toDataURL() ?? ASSETS.images.kenSprite;
      portraitImage.alt = "Ken";
    } else {
      portraitImage.removeAttribute("src");
      portraitImage.alt = "";
      portraitInitial.textContent = speaker === "Echo" ? "?" : "✦";
    }
  }

  private advanceDialogue(): void {
    if (!this.dialog) return;
    if (this.dialog.index < this.dialog.lines.length - 1) {
      this.dialog.index += 1;
      this.renderDialogueLine();
      return;
    }
    const resolve = this.dialog.resolve;
    this.dialog = undefined;
    this.ui.dialogue.classList.remove("show", "cinematic");
    resolve?.();
  }

  private openLetter(kicker: string, title: string, body: string, final: boolean): void {
    this.ui.letterKicker.textContent = kicker;
    this.ui.letterTitle.textContent = title;
    this.ui.letterBody.innerHTML = body.split("\n\n").map((paragraph) => `<p>${paragraph}</p>`).join("");
    this.$("#letterClose").textContent = final ? "Carry this with you" : "Close the letter";
    this.ui.letter.dataset.final = final ? "true" : "false";
    this.ui.letter.classList.add("show");
  }

  private closeLetter(update = true): void {
    if (!this.ui.letter.classList.contains("show")) return;
    const final = this.ui.letter.dataset.final === "true";
    this.ui.letter.classList.remove("show");
    if (update && final) {
      this.showToast("Quest complete: Ken's Heart. Reward: A lifetime of dealing with him.");
      this.scene.objective = "The heart has a new keeper. Wander the festival.";
      this.ui.objective.textContent = this.scene.objective;
      this.saveNow();
    }
    if (this.mode === "playing") this.focusGame();
  }

  private openMemories(): void {
    const collected = MEMORIES.filter((memory) => this.save.memories.includes(memory.id));
    this.ui.panelContent.innerHTML = `<p class="eyebrow">Memory Archive</p><h2>Things the heart kept</h2><p class="panel-lead">${collected.length} of ${MEMORIES.length} memories collected.</p><div class="memory-grid">${MEMORIES.map((memory) => {
      const found = this.save.memories.includes(memory.id);
      return `<article class="memory-card ${found ? "found" : "locked"}"><span>${found ? "✦" : "◇"}</span><h3>${found ? memory.title : "A memory still hidden"}</h3><p>${found ? memory.text.replace(/\n/g, "<br>") : "Keep exploring the kingdom."}</p></article>`;
    }).join("")}</div>`;
    this.ui.panel.classList.add("show");
  }

  private openSettings(): void {
    const settings = this.save.settings;
    this.ui.panelContent.innerHTML = `<p class="eyebrow">Make this journey yours</p><h2>Settings</h2>
      <label class="setting">Music <output id="musicOutput">${Math.round(settings.musicVolume * 100)}%</output><input id="musicVolume" type="range" min="0" max="1" step="0.05" value="${settings.musicVolume}"></label>
      <label class="setting">Effects <output id="sfxOutput">${Math.round(settings.sfxVolume * 100)}%</output><input id="sfxVolume" type="range" min="0" max="1" step="0.05" value="${settings.sfxVolume}"></label>
      <label class="setting check"><input id="reducedMotion" type="checkbox" ${settings.reducedMotion ? "checked" : ""}> Reduced motion</label>
      <label class="setting check"><input id="screenShake" type="checkbox" ${settings.screenShake ? "checked" : ""}> Screen shake</label>
      <label class="setting">Text speed<select id="textSpeed"><option value="slow">Slow</option><option value="normal">Normal</option><option value="fast">Fast</option><option value="instant">Instant</option></select></label>`;
    (this.$("#textSpeed") as HTMLSelectElement).value = settings.textSpeed;
    const update = () => {
      const music = Number((this.$("#musicVolume") as HTMLInputElement).value);
      const effects = Number((this.$("#sfxVolume") as HTMLInputElement).value);
      this.save.settings = { musicVolume: music, sfxVolume: effects, reducedMotion: (this.$("#reducedMotion") as HTMLInputElement).checked, screenShake: (this.$("#screenShake") as HTMLInputElement).checked, textSpeed: (this.$("#textSpeed") as HTMLSelectElement).value as Settings["textSpeed"] };
      this.$("#musicOutput").textContent = `${Math.round(music * 100)}%`;
      this.$("#sfxOutput").textContent = `${Math.round(effects * 100)}%`;
      this.audio.setVolume(music);
      this.saveNow(false);
    };
    this.ui.panelContent.querySelectorAll("input, select").forEach((element) => element.addEventListener("input", update));
    this.ui.panel.classList.add("show");
  }

  private openCredits(): void {
    this.ui.panelContent.innerHTML = `<p class="eyebrow">Ken's Heart</p><h2>Credits</h2><p class="panel-lead">A birthday journey made by Ken, for Fay.</p><dl class="credits"><dt>World and story</dt><dd>Ken's memories, rendered as a small fantasy RPG.</dd><dt>Bright moments</dt><dd>ElevenLabs_Fading_Memory.mp3</dd><dt>Mysteries</dt><dd>undertale-ost-004-fallen-down-made-with-Voicemod.mp3</dd><dt>Normal scenery</dt><dd>soundreality-wind-blowing-457954.mp3</dd><dt>Art</dt><dd>Original procedural canvas art - replaceable from the asset manifest.</dd></dl>`;
    this.ui.panel.classList.add("show");
  }

  private closePanel(): void {
    this.ui.panel.classList.remove("show");
    if (this.mode === "playing") this.focusGame();
  }

  private updateMenu(): void {
    const present = Boolean(SaveManager.load());
    const button = this.ui.continue as HTMLButtonElement;
    button.disabled = !present;
    button.title = present ? "Resume your saved journey" : "No saved journey yet";
  }

  private saveNow(show = true): void {
    this.save.position = { x: Math.round(this.player.x), y: Math.round(this.player.y) };
    SaveManager.save(this.save);
    if (show) {
      this.checkpointFlash = this.elapsed + 1800;
      this.ui.saveMark.classList.add("show");
      window.setTimeout(() => this.ui.saveMark.classList.remove("show"), 1800);
    }
    this.updateMenu();
  }

  private showToast(message: string): void {
    this.toast = message;
    this.toastUntil = this.elapsed + 3200;
    this.ui.toast.textContent = message;
    this.ui.toast.classList.add("show");
  }

  private loop(time: number): void {
    const delta = Math.min(0.05, (time - this.lastTime || 0) / 1000);
    this.lastTime = time;
    this.elapsed = time;
    this.update(delta);
    this.draw();
    requestAnimationFrame((next) => this.loop(next));
  }

  private update(delta: number): void {
    if (this.mode === "playing" && !this.dialog && !this.transitioning && !this.ui.letter.classList.contains("show") && !this.ui.final.classList.contains("show")) {
      const up = this.keys.has("w") || this.keys.has("arrowup");
      const down = this.keys.has("s") || this.keys.has("arrowdown");
      const left = this.keys.has("a") || this.keys.has("arrowleft");
      const right = this.keys.has("d") || this.keys.has("arrowright");
      let x = Number(right) - Number(left);
      let y = Number(down) - Number(up);
      if (!x && !y && this.clickTarget) {
        x = this.clickTarget.x - this.player.x;
        y = this.clickTarget.y - this.player.y;
        if (Math.hypot(x, y) < 9) this.clickTarget = undefined;
      }
      const length = Math.hypot(x, y);
      if (length) {
        x /= length; y /= length;
        this.player.x = clamp(this.player.x + x * 250 * delta, 70, 1210);
        this.player.y = clamp(this.player.y + y * 250 * delta, 160, 630);
        this.player.facing = x || this.player.facing;
        this.player.bob += delta * 11;
      }
      const reachable = this.scene.interactables.filter((interactable) => distance(this.player, interactable) < 148 && (!this.save.completed.includes(interactable.id) || interactable.kind === "gate" || interactable.id === "ken_heart" || interactable.id === "tavern"));
      this.nearest = reachable.sort((a, b) => distance(this.player, a) - distance(this.player, b))[0];
      this.ui.prompt.classList.toggle("show", Boolean(this.nearest));
      this.ui.prompt.textContent = this.nearest ? `E  ${this.nearest.label}` : "";
    } else {
      this.nearest = undefined;
      this.ui.prompt.classList.remove("show");
    }
    if (this.toastUntil && this.elapsed > this.toastUntil) this.ui.toast.classList.remove("show");
    this.shake = Math.max(0, this.shake - delta * 0.6);
  }

  private draw(): void {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratioX = this.canvas.width / W;
    const ratioY = this.canvas.height / H;
    this.ctx.setTransform(ratioX, 0, 0, ratioY, 0, 0);
    this.ctx.clearRect(0, 0, W, H);
    const shakeAmount = this.save.settings.screenShake && !this.save.settings.reducedMotion ? this.shake * 7 : 0;
    this.ctx.save();
    if (shakeAmount) this.ctx.translate(Math.sin(this.elapsed / 23) * shakeAmount, Math.cos(this.elapsed / 31) * shakeAmount);
    this.drawWorld();
    this.ctx.restore();
  }

  private drawWorld(): void {
    const { mood } = this.scene;
    const sky = this.ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, mood.sky);
    sky.addColorStop(0.6, mood.floor);
    sky.addColorStop(1, "#151725");
    this.ctx.fillStyle = sky;
    this.ctx.fillRect(0, 0, W, H);
    this.drawStars(mood.glow);
    this.drawMountains(mood);
    this.drawGround(mood);
    this.drawSceneLandmarks();
    this.drawParticles();
    this.scene.interactables.forEach((interactable) => this.drawInteractable(interactable));
    if (this.scene.id === 4 && this.restored > 0) this.drawCompanion();
    this.drawPlayer();
    this.drawGuideArrow();
    this.drawVignette(mood.fog);
  }

  private drawStars(color: string): void {
    this.ctx.fillStyle = rgba(color, this.scene.id === 3 ? 0.2 : 0.36);
    for (let i = 0; i < 30; i += 1) {
      const x = (i * 137) % W;
      const y = 40 + ((i * 71) % 250);
      const size = i % 5 === 0 ? 2 : 1;
      this.ctx.fillRect(x, y, size, size);
    }
  }

  private drawMountains(mood: StoryScene["mood"]): void {
    this.ctx.fillStyle = rgba("#070b17", 0.42);
    this.ctx.beginPath();
    this.ctx.moveTo(0, 330);
    for (let x = 0; x <= W; x += 128) this.ctx.lineTo(x, 180 + Math.abs(Math.sin(x / 93)) * 120);
    this.ctx.lineTo(W, 440); this.ctx.lineTo(0, 440); this.ctx.closePath(); this.ctx.fill();
    this.ctx.fillStyle = rgba(mood.glow, 0.06);
    this.ctx.fillRect(0, 310, W, 100);
    this.ctx.strokeStyle = rgba(mood.glow, 0.12);
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 408);
    this.ctx.quadraticCurveTo(330, 370, 650, 410);
    this.ctx.quadraticCurveTo(970, 445, W, 385);
    this.ctx.stroke();
  }

  private drawGround(mood: StoryScene["mood"]): void {
    const ground = this.ctx.createLinearGradient(0, 410, 0, H);
    ground.addColorStop(0, mood.floor);
    ground.addColorStop(1, rgba(mood.floor, 0.62));
    this.ctx.fillStyle = ground;
    this.ctx.fillRect(0, 410, W, H - 410);
    this.ctx.strokeStyle = rgba(mood.accent, 0.28);
    this.ctx.lineWidth = 65;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(-50, 560); this.ctx.bezierCurveTo(210, 490, 370, 610, 595, 520); this.ctx.bezierCurveTo(830, 430, 1010, 570, 1340, 470); this.ctx.stroke();
    this.ctx.strokeStyle = rgba("#e6d2af", 0.1); this.ctx.lineWidth = 4; this.ctx.stroke();
    this.ctx.strokeStyle = rgba(mood.glow, 0.08); this.ctx.lineWidth = 1;
    for (let y = 448; y < H; y += 50) {
      this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.quadraticCurveTo(W * 0.45, y - 13, W, y + 7); this.ctx.stroke();
    }
  }

  private drawSceneLandmarks(): void {
    if (this.scene.id === 1) this.drawTavern();
    if (this.scene.id === 2) this.drawForestAndBridge();
    if (this.scene.id === 3) this.drawAbyss();
    if (this.scene.id === 4) this.drawGardenAndArchive();
    if (this.scene.id === 5) this.drawFestival();
  }

  private drawTavern(): void {
    const c = this.ctx;
    if (this.tavernHouse.complete && this.tavernHouse.naturalWidth > 0) {
      c.save(); c.imageSmoothingEnabled = false; c.drawImage(this.tavernHouse, 630, 135, 390, 356); c.restore();
      return;
    }
    c.fillStyle = "#1b1627"; c.fillRect(675, 220, 285, 270);
    c.fillStyle = "#3c2940"; c.beginPath(); c.moveTo(635, 230); c.lineTo(815, 100); c.lineTo(1000, 230); c.closePath(); c.fill();
    c.strokeStyle = rgba("#ffc989", 0.2); c.lineWidth = 4; c.beginPath(); c.moveTo(640, 230); c.lineTo(815, 104); c.lineTo(995, 230); c.stroke();
    c.fillStyle = rgba("#c68863", 0.18); [710, 765, 870, 925].forEach((x) => c.fillRect(x, 240, 8, 240));
    c.fillStyle = "#ffcf83";
    [720, 840, 915].forEach((x) => { c.fillRect(x, 290, 38, 55); c.fillStyle = rgba("#ffcf83", 0.18); c.beginPath(); c.arc(x + 19, 315, 42, 0, Math.PI * 2); c.fill(); c.fillStyle = "#ffcf83"; });
    c.fillStyle = "#291d31"; c.fillRect(790, 376, 52, 115);
    c.strokeStyle = "#aa7958"; c.lineWidth = 3; c.strokeRect(790, 376, 52, 115);
    c.fillStyle = rgba("#ffdf9e", 0.78); c.fillRect(810, 180, 8, 34); c.beginPath(); c.arc(814, 175, 15, 0, Math.PI * 2); c.fill();
  }

  private drawForestAndBridge(): void {
    const c = this.ctx;
    for (let i = 0; i < 11; i += 1) {
      const x = 50 + i * 118; const y = 345 + (i % 3) * 55;
      c.fillStyle = "#172a29"; c.fillRect(x - 8, y, 16, 170);
      c.fillStyle = i % 2 ? "#2d5047" : "#284237"; c.beginPath(); c.arc(x, y - 15, 52, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = "#111c27"; c.fillRect(912, 360, 250, 210);
    c.strokeStyle = "#94766d"; c.lineWidth = 16; c.beginPath(); c.moveTo(850, 450); c.lineTo(974, 410); c.moveTo(1070, 379); c.lineTo(1170, 355); c.stroke();
    c.strokeStyle = rgba("#d1e7ff", 0.4); c.lineWidth = 3; c.beginPath(); c.moveTo(975, 410); c.lineTo(1040, 490); c.lineTo(1072, 379); c.stroke();
  }

  private drawAbyss(): void {
    const c = this.ctx;
    c.fillStyle = "#06070d"; c.beginPath(); c.ellipse(655, 490, 340, 110, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = rgba("#a39bbd", 0.22); c.lineWidth = 2;
    for (let i = 0; i < 9; i += 1) { const x = 280 + i * 92; c.beginPath(); c.moveTo(x, 400 - (i % 3) * 30); c.lineTo(x + 22, 352 - (i % 5) * 15); c.stroke(); }
    c.fillStyle = "#282637"; [[300, 460], [590, 330], [920, 430], [1090, 300]].forEach(([x, y]) => { c.save(); c.translate(x, y); c.rotate(Math.sin(x) * 0.4); c.fillRect(-20, -36, 40, 72); c.restore(); });
  }

  private drawGardenAndArchive(): void {
    const c = this.ctx;
    const health = clamp(this.restored / 3, 0, 1);
    c.fillStyle = rgba("#79bf72", 0.18 + health * 0.22);
    for (let i = 0; i < 22; i += 1) { const x = (i * 97 + 25) % W; const y = 430 + ((i * 61) % 210); c.beginPath(); c.arc(x, y, 8 + health * 12, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = rgba("#3e73a0", 0.62); c.beginPath(); c.ellipse(770, 480, 140, 56, 0, 0, Math.PI * 2); c.fill();
    if (this.archiveCottage.complete && this.archiveCottage.naturalWidth > 0) {
      c.save(); c.imageSmoothingEnabled = false; c.drawImage(this.archiveCottage, 930, 178, 280, 232); c.restore();
      return;
    }
    c.fillStyle = "#28334b"; c.fillRect(970, 185, 200, 290); c.fillStyle = "#6c5b7e"; c.beginPath(); c.moveTo(940, 190); c.lineTo(1070, 90); c.lineTo(1200, 190); c.closePath(); c.fill();
    c.fillStyle = rgba("#ffeab0", 0.7); [1015, 1090, 1140].forEach((x) => c.fillRect(x, 255, 25, 145));
  }

  private drawFestival(): void {
    const c = this.ctx;
    c.strokeStyle = "#ffd886"; c.lineWidth = 3; c.beginPath(); c.moveTo(72, 220); c.quadraticCurveTo(360, 150, 640, 210); c.quadraticCurveTo(810, 245, 1140, 180); c.stroke();
    for (let i = 0; i < 10; i += 1) { const x = 130 + i * 102; const y = 190 + Math.sin(i) * 15; c.fillStyle = rgba(i % 2 ? "#f0a2a5" : "#fee096", 0.18); c.beginPath(); c.arc(x + 8, y + 12, 28, 0, Math.PI * 2); c.fill(); c.fillStyle = i % 2 ? "#f0a2a5" : "#fee096"; c.fillRect(x, y, 17, 25); }
    if (this.heartCastle.complete && this.heartCastle.naturalWidth > 0) {
      c.save(); c.imageSmoothingEnabled = false; c.drawImage(this.heartCastle, 615, 76, 600, 439); c.restore();
      if (this.finalPhase) this.drawFireworks();
      return;
    }
    c.fillStyle = "#6c405f"; c.fillRect(880, 160, 245, 290); c.fillStyle = "#a85c81"; c.beginPath(); c.moveTo(845, 160); c.lineTo(1002, 35); c.lineTo(1160, 160); c.closePath(); c.fill();
    c.strokeStyle = rgba("#ffd99c", 0.23); c.lineWidth = 4; c.beginPath(); c.moveTo(850, 160); c.lineTo(1002, 39); c.lineTo(1155, 160); c.stroke();
    c.fillStyle = "#ffecab"; c.fillRect(960, 270, 83, 180);
    c.fillStyle = rgba("#ffc3a1", 0.88); c.beginPath(); c.arc(810, 295, 96, 0, Math.PI * 2); c.fill(); c.fillStyle = "#5a8b58"; c.fillRect(798, 295, 22, 210);
    if (this.finalPhase) this.drawFireworks();
  }

  private drawFireworks(): void {
    const c = this.ctx; const t = this.elapsed / 420;
    for (let burst = 0; burst < 4; burst += 1) {
      const cx = 180 + burst * 285; const cy = 150 + (burst % 2) * 65;
      for (let ray = 0; ray < 14; ray += 1) {
        const angle = ray / 14 * Math.PI * 2 + t * 0.2; const size = 28 + ((t * 17 + burst * 13) % 44);
        c.strokeStyle = ray % 2 ? "#ffe69b" : "#ffc0bf"; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(angle) * size, cy + Math.sin(angle) * size); c.stroke();
      }
    }
  }

  private drawParticles(): void {
    const { mood } = this.scene; const c = this.ctx; const factor = this.save.settings.reducedMotion ? 0.35 : 1;
    const count = Math.floor((mood.particle === "rain" ? 88 : 38) * factor);
    c.lineWidth = mood.particle === "rain" ? 1 : 2;
    for (let i = 0; i < count; i += 1) {
      const x = (i * 89 + this.elapsed * (mood.particle === "rain" ? -0.2 : 0.018)) % (W + 80) - 40;
      const y = (i * 57 + this.elapsed * (mood.particle === "rain" ? 0.38 : 0.024)) % (H + 90) - 45;
      if (mood.particle === "rain") { c.strokeStyle = rgba("#c4dcff", 0.38); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 7, y + 16); c.stroke(); }
      else { c.fillStyle = rgba(mood.glow, mood.particle === "ash" ? 0.25 : 0.48); c.beginPath(); c.arc(x, y, mood.particle === "sparkle" && i % 5 === 0 ? 3 : 1.5, 0, Math.PI * 2); c.fill(); }
    }
  }

  private drawInteractable(item: Interactable): void {
    const completed = this.save.completed.includes(item.id); const c = this.ctx; const glow = item.kind === "gate" ? this.scene.mood.accent : this.scene.mood.glow;
    c.save(); c.translate(item.x, item.y);
    this.drawInteractionGlow(item, completed);
    if (item.kind === "npc" || item.kind === "heart") {
      c.fillStyle = rgba(glow, completed ? 0.22 : 0.45); c.beginPath(); c.arc(0, 0, 38, 0, Math.PI * 2); c.fill();
      if (["tavern", "lowest", "ken_heart"].includes(item.id)) {
        c.fillStyle = "rgba(5, 8, 16, 0.28)"; c.beginPath(); c.ellipse(0, 22, 31, 8, 0, 0, Math.PI * 2); c.fill();
        this.drawKenSprite(98, 147, Math.sin(this.elapsed / 340 + item.x) * 0.35);
      } else {
        c.fillStyle = item.kind === "heart" ? "#ffb2ad" : "#5a3a66"; c.fillRect(-13, -18, 26, 43); c.fillStyle = "#f5c2a7"; c.beginPath(); c.arc(0, -29, 13, 0, Math.PI * 2); c.fill();
      }
    } else if (item.kind === "gate") {
      c.strokeStyle = rgba(glow, completed ? 0.35 : 0.86); c.lineWidth = 8; c.beginPath(); c.arc(0, 0, 38, Math.PI, 0); c.stroke(); c.fillStyle = rgba(glow, 0.2); c.fillRect(-39, -1, 78, 55);
    } else if (item.kind === "note") {
      c.fillStyle = "#f8e6bd"; c.fillRect(-25, -32, 50, 64); c.strokeStyle = "#9a795a"; c.strokeRect(-25, -32, 50, 64); c.strokeStyle = "#9a795a"; c.beginPath(); c.moveTo(-15, -11); c.lineTo(15, -11); c.moveTo(-15, 1); c.lineTo(12, 1); c.stroke();
    } else {
      c.fillStyle = rgba(glow, completed ? 0.25 : 0.7); c.beginPath(); c.arc(0, 0, 42 + Math.sin(this.elapsed / 230 + item.x) * 3, 0, Math.PI * 2); c.fill(); c.fillStyle = glow; c.beginPath(); c.moveTo(0, -30); c.lineTo(16, 0); c.lineTo(0, 31); c.lineTo(-16, 0); c.closePath(); c.fill();
    }
    c.restore();
  }

  private drawInteractionGlow(item: Interactable, completed: boolean): void {
    const available = !completed || item.kind === "gate" || item.id === "tavern" || item.id === "ken_heart";
    if (!available) return;
    const c = this.ctx; const pulse = 0.58 + Math.sin(this.elapsed / 210 + item.x * 0.01) * 0.32;
    const y = item.kind === "gate" ? -76 : -96;
    c.save(); c.globalAlpha = pulse;
    c.fillStyle = "rgba(28, 161, 255, 0.2)"; c.beginPath(); c.arc(0, y, 28 + pulse * 10, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#1478d4"; c.fillRect(-7, y - 25, 14, 50); c.fillRect(-25, y - 7, 50, 14); c.fillRect(-15, y - 15, 30, 30);
    c.fillStyle = "#6beeff"; c.fillRect(-5, y - 18, 10, 36); c.fillRect(-18, y - 5, 36, 10); c.fillStyle = "#e4ffff"; c.fillRect(-5, y - 5, 10, 10);
    c.fillStyle = "rgba(12, 118, 207, 0.88)"; c.fillRect(-19, y + 29, 38, 5); c.fillRect(-12, y + 24, 24, 5);
    c.restore();
  }

  private drawCompanion(): void {
    const c = this.ctx; const x = clamp(this.player.x - 52, 70, 1210); const y = clamp(this.player.y + 22, 160, 630);
    const walking = this.keys.size > 0 || Boolean(this.clickTarget);
    const stride = walking ? Math.sin(this.player.bob) : Math.sin(this.elapsed / 430) * 0.15;
    c.save(); c.translate(x, y); c.fillStyle = rgba(this.scene.mood.glow, 0.2); c.beginPath(); c.arc(0, 0, 35, 0, Math.PI * 2); c.fill(); this.drawKenSprite(94, 141, stride); c.restore();
  }

  private drawPlayer(): void {
    const c = this.ctx; const walking = this.keys.size > 0 || Boolean(this.clickTarget); const stride = walking ? Math.sin(this.player.bob) : 0; const bob = stride * 2.2;
    c.save();
    c.translate(this.player.x, this.player.y + bob);
    c.fillStyle = rgba("#0d1020", 0.34);
    c.beginPath(); c.ellipse(0, 29, 31, 9, 0, 0, Math.PI * 2); c.fill();
    if (this.faySprite.complete && this.faySprite.naturalWidth > 0) {
      c.imageSmoothingEnabled = false;
      c.rotate(stride * 0.018);
      c.drawImage(this.faySprite, -29 + stride * 1.5, -69, 58, 87 - Math.abs(stride) * 2);
    } else {
      c.fillStyle = "#d596a2"; c.beginPath(); c.moveTo(-18, 24); c.lineTo(0, -10); c.lineTo(18, 24); c.closePath(); c.fill();
      c.fillStyle = "#f3c3a6"; c.beginPath(); c.arc(0, -16, 14, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#4c294c"; c.beginPath(); c.arc(0, -21, 15, Math.PI, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  private drawGuideArrow(): void {
    if (this.mode !== "playing" || this.dialog) return;
    const target = this.getGuideTarget();
    if (!target) return;
    const c = this.ctx;
    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x) + Math.PI / 2;
    const pulse = 0.72 + Math.sin(this.elapsed / 190) * 0.28;
    const bob = Math.sin(this.elapsed / 240) * 4;
    c.save();
    c.translate(this.player.x, this.player.y - 94 + bob);
    c.rotate(angle);
    c.globalAlpha = pulse;
    c.fillStyle = "rgba(244, 61, 91, 0.24)"; c.beginPath(); c.arc(0, 0, 24, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#df294b"; c.beginPath(); c.moveTo(0, -19); c.lineTo(-12, -1); c.lineTo(-5, -1); c.lineTo(-5, 17); c.lineTo(5, 17); c.lineTo(5, -1); c.lineTo(12, -1); c.closePath(); c.fill();
    c.fillStyle = "#ffd6dc"; c.beginPath(); c.moveTo(0, -13); c.lineTo(-6, -3); c.lineTo(-2, -3); c.lineTo(-2, 10); c.lineTo(2, 10); c.lineTo(2, -3); c.lineTo(6, -3); c.closePath(); c.fill();
    c.restore();
  }

  private getGuideTarget(): Interactable | undefined {
    if (this.scene.id === 5) return this.scene.interactables.find((item) => item.id === "ken_heart");
    const nextStoryStep = this.scene.interactables.find((item) => item.kind !== "gate" && !this.save.completed.includes(item.id));
    if (nextStoryStep) return nextStoryStep;
    return this.scene.interactables.find((item) => item.kind === "gate")
      ?? this.scene.interactables.find((item) => item.after === "nextScene");
  }

  private drawKenSprite(width: number, height: number, stride = 0): void {
    const c = this.ctx;
    const sprite = this.kenSpriteCanvas ?? this.kenSprite;
    if (sprite instanceof HTMLImageElement && (!sprite.complete || sprite.naturalWidth === 0)) {
      c.fillStyle = "#3d3a3a"; c.fillRect(-11, -18, 22, 40); c.fillStyle = "#e6ba9e"; c.beginPath(); c.arc(0, -27, 12, 0, Math.PI * 2); c.fill();
      return;
    }
    c.save();
    c.imageSmoothingEnabled = false;
    c.translate(stride * 1.2, stride * 2);
    c.rotate(stride * 0.012);
    c.drawImage(sprite, -width / 2, -height + 18, width, height - Math.abs(stride) * 2);
    c.restore();
  }

  private drawVignette(fog: number): void {
    const radial = this.ctx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 760);
    radial.addColorStop(0, "rgba(0,0,0,0)"); radial.addColorStop(1, `rgba(2,3,10,${0.28 + fog * 0.6})`);
    this.ctx.fillStyle = radial; this.ctx.fillRect(0, 0, W, H);
  }
}
