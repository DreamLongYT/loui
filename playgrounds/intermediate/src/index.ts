import { App } from "./app.js";
import { Config } from "./types/index.js";

const config: Config = { debug: true };
const app = new App(config);
app.start();
