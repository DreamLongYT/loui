import { Logger } from "./utils/index.js";
import { Config } from "./types/index.js";

export class App {
  constructor(private config: Config) {}
  start() {
    Logger.info("App started");
  }
}

export class UnusedApp {
  start() { console.log("Unused"); }
}
