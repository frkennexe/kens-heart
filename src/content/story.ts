import type { AudioAssetId } from "./assets";

export type Mood = {
  sky: string;
  floor: string;
  accent: string;
  glow: string;
  fog: number;
  rain: number;
  particle: "dust" | "rain" | "ash" | "firefly" | "sparkle";
  audio: AudioAssetId;
};

export type Line = { speaker?: "Fay" | "Ken" | "Narrator" | "Echo"; text: string; cinematic?: boolean };

export type Interactable = {
  id: string;
  label: string;
  x: number;
  y: number;
  kind: "npc" | "crystal" | "gate" | "light" | "note" | "heart";
  lines?: Line[];
  memory?: string;
  after?: "nextScene" | "bridge" | "lowest" | "restore" | "note" | "final";
};

export type StoryScene = {
  id: number;
  name: string;
  realm: string;
  objective: string;
  mood: Mood;
  start: { x: number; y: number };
  intro: Line[];
  interactables: Interactable[];
};

export const SCENES: StoryScene[] = [
  {
    id: 1,
    name: "THE CROSSROADS",
    realm: "Tavern of Strangers",
    objective: "Find the source of the voices.",
    start: { x: 180, y: 470 },
    mood: { sky: "#292448", floor: "#30374a", accent: "#b9885d", glow: "#ffd79c", fog: 0.26, rain: 0, particle: "dust", audio: "normalScenery" },
    intro: [
      { speaker: "Narrator", text: "This is the story of a heart that forgot what warmth felt like.", cinematic: true },
      { speaker: "Narrator", text: "And the girl who accidentally found her way inside.", cinematic: true },
    ],
    interactables: [
      { id: "tavern", label: "Enter the Tavern", x: 620, y: 460, kind: "npc", memory: "tavern_first_hate", lines: [
        { speaker: "Ken", text: "hi fayyyy how u doinn.." },
        { speaker: "Fay", text: "m good" },
        { speaker: "Ken", text: "being dry again?" },
        { speaker: "Fay", text: "im js like that" },
        { speaker: "Narrator", text: "??? Bond formed.", cinematic: true },
      ] },
      { id: "crossroads_exit", label: "Follow the gathering storm", x: 1110, y: 475, kind: "gate", after: "nextScene", lines: [
        { speaker: "Narrator", text: "It was not exactly love at first sight." },
        { speaker: "Narrator", text: "Maybe love at first hate.", cinematic: true },
      ] },
    ],
  },
  {
    id: 2,
    name: "THE WITHERING KINGDOM",
    realm: "Forest of Echoes - Rain Village - Broken Bridge",
    objective: "Stay with Fay.",
    start: { x: 140, y: 480 },
    mood: { sky: "#172334", floor: "#263839", accent: "#57786e", glow: "#9db4a5", fog: 0.44, rain: 1, particle: "rain", audio: "mysteries" },
    intro: [{ speaker: "Narrator", text: "The paths ran close together, divided by old thorns and older pain.", cinematic: true }],
    interactables: [
      { id: "clearing", label: "Visit the shared clearing", x: 560, y: 330, kind: "crystal", memory: "warm_clearing", lines: [
        { speaker: "Ken", text: "You're going to be okay." },
        { speaker: "Fay", text: "You don't know that." },
        { speaker: "Ken", text: "No. But I can stay until you are." },
      ] },
      { id: "bridge", label: "Approach the broken bridge", x: 1030, y: 330, kind: "gate", after: "bridge", lines: [
        { speaker: "Narrator", text: "Fay crossed toward a shadowed gate. Ken stayed on the near side.", cinematic: true },
        { speaker: "Narrator", text: "QUEST FAILED.", cinematic: true },
      ] },
    ],
  },
  {
    id: 3,
    name: "THE ABYSS",
    realm: "Severed Path - Ash Field",
    objective: "",
    start: { x: 170, y: 420 },
    mood: { sky: "#090b15", floor: "#151620", accent: "#49455e", glow: "#b7b0de", fog: 0.72, rain: 0, particle: "ash", audio: "mysteries" },
    intro: [{ speaker: "Narrator", text: "There were no directions left. Only the way forward.", cinematic: true }],
    interactables: [
      { id: "echo", label: "Listen to the echo", x: 500, y: 350, kind: "crystal", memory: "abandoned_reply", lines: [
        { speaker: "Echo", text: "Maybe we were never supposed to be friends." },
        { speaker: "Echo", text: "Fine." },
      ] },
      { id: "lowest", label: "Sit beside Ken", x: 805, y: 440, kind: "npc", after: "lowest", lines: [
        { speaker: "Fay", text: "What am I supposed to do?" },
        { speaker: "Ken", text: "Nothing." },
        { speaker: "Ken", text: "This part already happened." },
      ] },
      { id: "chime", label: "Follow the distant chime", x: 1120, y: 250, kind: "light", after: "nextScene", lines: [{ speaker: "Narrator", text: "A tiny light insisted on existing.", cinematic: true }] },
    ],
  },
  {
    id: 4,
    name: "THE FIRST LIGHT",
    realm: "Garden Between Us - The Archive",
    objective: "Follow the lights.",
    start: { x: 150, y: 480 },
    mood: { sky: "#4c4271", floor: "#40534f", accent: "#7bc67a", glow: "#ffe79f", fog: 0.16, rain: 0.2, particle: "firefly", audio: "brightMoment" },
    intro: [{ speaker: "Narrator", text: "The first flower was not a miracle. It was only proof that the world had not given up.", cinematic: true }],
    interactables: [
      { id: "light_one", label: "Light the first lantern", x: 390, y: 430, kind: "light", memory: "first_light", after: "restore", lines: [{ speaker: "Fay", text: "We are talking again." }, { speaker: "Ken", text: "Yeah. Weird, right?" }] },
      { id: "light_two", label: "Light the second lantern", x: 630, y: 280, kind: "light", after: "restore", lines: [{ speaker: "Ken", text: "When did we stop hating each other?" }, { speaker: "Fay", text: "No idea." }, { speaker: "Ken", text: "Damn. That's unfortunate." }] },
      { id: "lake", label: "Wait at the lake", x: 810, y: 430, kind: "heart", after: "restore", lines: [{ speaker: "Ken", text: "...I think I like you." }, { speaker: "Fay", text: "YAYAYYAYAYAYYAY." }] },
      { id: "archive", label: "Read the old note", x: 1050, y: 260, kind: "note", memory: "old_note", after: "note", lines: [{ speaker: "Narrator", text: "An old note. Written before either of them knew where this story was going.", cinematic: true }] },
      { id: "archive_exit", label: "Leave the Archive", x: 1130, y: 510, kind: "gate", after: "nextScene", lines: [{ speaker: "Narrator", text: "He kept it. All this time.", cinematic: true }] },
    ],
  },
  {
    id: 5,
    name: "KEN'S HEART",
    realm: "The Heart Castle - Festival of Fay",
    objective: "Find Ken beneath the glowing tree.",
    start: { x: 150, y: 470 },
    mood: { sky: "#845887", floor: "#5b855c", accent: "#f69c83", glow: "#fff1ac", fog: 0.03, rain: 0, particle: "sparkle", audio: "brightMoment" },
    intro: [{ speaker: "Narrator", text: "The kingdom had become too bright to be a dream of ruins.", cinematic: true }],
    interactables: [
      { id: "festival", label: "Remember the festival", x: 490, y: 340, kind: "crystal", memory: "festival", lines: [{ speaker: "Narrator", text: "The flowers opened as she passed, like the world had been waiting for her." }] },
      { id: "ken_heart", label: "Talk to Ken", x: 945, y: 330, kind: "heart", after: "final", lines: [
        { speaker: "Ken", text: "You walked through the bad memories, stupid memories, painful memories... and the ones I would live again." },
        { speaker: "Ken", text: "There is one thing I never showed you." },
        { speaker: "Narrator", text: "The castle doors opened. The whole world inhaled light.", cinematic: true },
      ] },
    ],
  },
];

export const sceneById = (id: number) => SCENES.find((scene) => scene.id === id) ?? SCENES[0];
