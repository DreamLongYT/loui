import { mainService } from "./services/main.js";
import { VERSION } from "./constants.js";

console.log(`Starting app v${VERSION}`);
mainService.run();
