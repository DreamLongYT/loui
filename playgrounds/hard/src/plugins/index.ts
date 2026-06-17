import { register } from "./base.js";
import "./unused-plugin.js"; // This is imported but does nothing

register("plugin-a");

// Unused export in a side-effect file
export const PLUGIN_VERSION = "1.0.0";
