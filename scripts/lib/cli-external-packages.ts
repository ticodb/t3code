// @effect-diagnostics nodeBuiltinImport:off - the pack config calls this synchronously.
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

/** Keep bundler externals and staged runtime dependency roots aligned. */
// Filesystem-loaded externals need dependencies outside the bundle.
const CLI_RUNTIME_EXTERNAL_PREFIXES = [
  // Cursor ships computed Webpack imports and platform helper packages.
  "@cursor/sdk",
  // Playwright reads package.json and browsers.json beside its runtime modules.
  "playwright-core",
  "node-pty",
  "ffi-rs",
  "@yuuang/",
  "@ff-labs/",
  "transcribe-cpp",
  "@transcribe-cpp/",
  "koffi",
  "@koromix/",
  "@napi-rs/keyring",
  "@clerk/electron-passkeys",
  "node-gyp-build",
  "node-addon-api",
  "bufferutil",
  "utf-8-validate",
] as const;

// Match Cursor dependency boundaries so zod does not externalize zod-to-json-schema.
const CURSOR_RUNTIME_DEPENDENCIES = [
  "@bufbuild/protobuf",
  "@connectrpc/connect",
  "@connectrpc/connect-node",
  "@connectrpc/connect-web",
  "@statsig/js-client",
  "@statsig/client-core",
  "zod",
  "undici",
  "@fastify/busboy",
] as const;

export function isRuntimeExternalCliDependency(id: string): boolean {
  return (
    CLI_RUNTIME_EXTERNAL_PREFIXES.some((prefix) => id.startsWith(prefix)) ||
    CURSOR_RUNTIME_DEPENDENCIES.some((name) => id === name || id.startsWith(`${name}/`))
  );
}

/** Use neverBundle: false from alwaysBundle means no opinion and leaves transitive packages bundled. */
export function isExternalCliDependency(id: string, importer?: string): boolean {
  // The external zod is the server's zod 4, so a package built on zod 3 (@a2ui/web_core) bundles its own.
  if ((id === "zod" || id.startsWith("zod/")) && importer !== undefined) {
    if (resolvedZodMajor(importer) === "3") return false;
  }
  return isRuntimeExternalCliDependency(id);
}

export function shouldBundleCliDependency(id: string, importer?: string): boolean {
  if (id.startsWith("node:")) return false;
  return !isExternalCliDependency(id, importer);
}

/** The zod major version a module in the pnpm store resolves, from its package's sibling links. */
function resolvedZodMajor(importer: string): string | undefined {
  const packageLinks = /^(.*[\\/]node_modules[\\/]\.pnpm[\\/][^\\/]+[\\/]node_modules)[\\/]/.exec(
    importer,
  )?.[1];
  if (packageLinks === undefined) return undefined;
  try {
    const manifest = NodeFS.readFileSync(
      NodePath.join(packageLinks, "zod", "package.json"),
      "utf8",
    );
    return /"version":\s*"(\d+)\./.exec(manifest)?.[1];
  } catch {
    return undefined;
  }
}

export function selectCliRuntimeExternalDependencies(
  dependencies: Readonly<Record<string, string>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(dependencies).filter(([name]) => isRuntimeExternalCliDependency(name)),
  );
}

/** regionCount distinguishes a clean bundle from a changed marker format the scan cannot see. */
export function findInlinedExternalPackages(source: string): {
  readonly regionCount: number;
  readonly inlined: ReadonlyArray<string>;
  readonly inlinedPackages: ReadonlyArray<string>;
} {
  // Rolldown marks each inlined module with a `//#region <path>` line; newer
  // releases (vite-plus 1.4) emit a bare `// <path>` line instead.
  const regionPattern = /^\/\/(?:#region)?[ \t]+(\S+)[ \t]*$/gm;
  const packagePattern = /node_modules\/((?:@[^/\s]+\/)?[^/\s]+)\//g;

  let regionCount = 0;
  const inlined = new Set<string>();
  const inlinedPackages = new Set<string>();
  for (const region of source.matchAll(regionPattern)) {
    regionCount += 1;
    const regionPath = region[1] ?? "";
    for (const candidate of regionPath.matchAll(packagePattern)) {
      const name = candidate[1];
      if (name === undefined || name === ".pnpm") continue;
      inlinedPackages.add(name);
      // zod 3 is bundled on purpose for the packages that need it; see isExternalCliDependency.
      if (name === "zod" && /[\\/]\.pnpm[\\/]zod@3\./.test(regionPath)) continue;
      if (isExternalCliDependency(name)) inlined.add(name);
    }
  }

  return {
    regionCount,
    inlined: [...inlined].sort(),
    inlinedPackages: [...inlinedPackages].sort(),
  };
}
