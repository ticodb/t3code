// @effect-diagnostics nodeBuiltinImport:off globalConsole:off
// Regenerates vendor/renderer.js after a change to src/renderer.browser.ts or the @a2ui versions.
import * as NodeFSP from "node:fs/promises";

import { RENDERER_MODULE_PATH, rendererModuleSource } from "./renderer-bundle.ts";

const source = await rendererModuleSource();
await NodeFSP.writeFile(RENDERER_MODULE_PATH, source);
console.log(`vendor/renderer.js: ${(source.length / 1024).toFixed(0)} KiB`);
