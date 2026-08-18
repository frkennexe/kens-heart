# Ken's Heart

A private birthday fantasy RPG for Fay, built as a static browser game. It is a real playable journey: move with WASD or arrow keys, use E/Enter to interact, and explore five transforming story realms from the muted Crossroads to the Festival of Fay.

## Run it

```bash
pnpm install
pnpm dev
```

Open the local URL Vite prints. For a production-ready static build:

```bash
pnpm build
pnpm preview
```

The `dist/` directory produced by `pnpm build` is ready for GitHub Pages, Netlify, Vercel, or any static host.

### GitHub Pages

This repository includes `.github/workflows/deploy-pages.yml`. After pushing to `main`, open the repository's **Settings → Pages**, select **GitHub Actions** as the publishing source, and the workflow will deploy every later `main` push automatically. The Vite build uses relative asset paths so it works from a project URL such as `https://username.github.io/kens-heart/`.

## Game controls

- Move: `WASD` or arrow keys
- Interact / advance dialogue: `E`, `Enter`, or Space
- Pause: `Esc` or the pause button
- On touch devices: use the on-screen D-pad and talk button

Progress, settings, collected memories, and the ending state are saved locally in the browser. Starting a new game intentionally replaces the local save.

## Customize for Fay

All story data is isolated from mechanics, so personal material can be replaced safely.

| What to change | Path | Notes |
| --- | --- | --- |
| Story beats and interactables | `src/content/story.ts` | Scene dialogue, objectives, map interaction positions, colour/mood settings |
| Memory archive entries | `src/content/memories.ts` | Add or edit titles, dates, and memory text |
| The saved old note and birthday letter | `src/content/letters.ts` | Preserves the original note separately from the final letter |
| Semantic asset mapping | `src/content/assets.ts` | The only source for audio paths and future art asset IDs |
| Bright-moment soundtrack | `public/assets/audio/bright-moment-fading-memory.mp3` | Copied from `ElevenLabs_Fading_Memory.mp3` |
| Mysteries / dark soundtrack | `public/assets/audio/mysteries-undertale.mp3` | Copied from `undertale-ost-004-fallen-down-made-with-Voicemod.mp3` |
| Normal-scenery ambience | `public/assets/audio/normal-scenery-wind.mp3` | Copied from `soundreality-wind-blowing-457954.mp3` |

The current character, object, and environmental art is original procedural Canvas art. It has no external art dependencies. Future images, portraits, sprites, or photos should be added below `public/assets/` and referenced through `src/content/assets.ts` rather than direct paths inside game code.

## Audio and public publishing

The three audio files were supplied for this build and are used exactly as directed. Before making a public GitHub Pages deployment, make sure you hold the necessary redistribution rights for every supplied track, especially the Undertale-derived music file. If a track needs changing, keep the semantic filename or update `src/content/assets.ts`.

## Main path for testing

1. Begin and enter the Tavern, then follow the storm gate.
2. Visit the shared clearing and approach the broken bridge.
3. Listen to the echo, sit beside Ken, then follow the distant chime.
4. Light the garden lanterns, wait at the lake, read the old note, and leave the Archive.
5. Remember the festival, talk to Ken, open the final letter, then continue wandering the festival.

There are no dead-end interactions or combat locks. The Archive and settings remain usable from both the title and pause menus.
