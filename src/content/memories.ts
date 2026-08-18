export type Memory = {
  id: string;
  title: string;
  scene: number;
  date?: string;
  text: string;
  required?: boolean;
};

export const MEMORIES: Memory[] = [
  { id: "tavern_first_hate", title: "The first argument", scene: 1, text: "Why does this girl hate me?\nMaybe because you're annoying?", required: true },
  { id: "warm_clearing", title: "A warm clearing", scene: 2, text: "For a minute, the rain forgot where to fall." },
  { id: "abandoned_reply", title: "An unsent reply", scene: 3, text: "Some words become heavier when no one is there to hear them." },
  { id: "first_light", title: "The first light", scene: 4, text: "They did not fix everything. They just started talking again.", required: true },
  { id: "old_note", title: "He kept it", scene: 4, text: "An old note, written before either of them knew where the story was going.", required: true },
  { id: "festival", title: "A world made brighter", scene: 5, text: "The heart learned that warmth could stay.", required: true },
];
