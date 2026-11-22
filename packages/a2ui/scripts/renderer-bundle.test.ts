// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFSP from "node:fs/promises";
import { expect, it } from "vite-plus/test";

import { RENDERER_MODULE_PATH, rendererModuleSource } from "./renderer-bundle.ts";

it("vendor/renderer.js is built from the current source (run build:renderer)", async () => {
  expect(await NodeFSP.readFile(RENDERER_MODULE_PATH, "utf8")).toBe(await rendererModuleSource());
});
