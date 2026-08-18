import "./styles/game.css";
import { KensHeartGame } from "./game/KensHeartGame";

const mount = document.querySelector<HTMLElement>("#app");
if (!mount) throw new Error("Game mount point is missing.");

new KensHeartGame(mount);
