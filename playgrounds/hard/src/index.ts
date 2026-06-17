import { Registry } from "./core/registry.js";
import "./plugins/index.js"; // Side-effect import

const registry = new Registry();
console.log(registry.get("core"));
