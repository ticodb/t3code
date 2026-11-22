import { describe, expect, it } from "vite-plus/test";

import { a2uiActionMessage } from "./a2ui.ts";

describe("a2uiActionMessage", () => {
  const action = (params: unknown) => ({ jsonrpc: "2.0", method: "t3/a2ui/action", params });

  it("names the action and page, with any resolved context as JSON", () => {
    expect(a2uiActionMessage("Migrations", action({ name: "run", context: { batch: 50 } }))).toBe(
      'run (from "Migrations")\n\n```json\n{\n  "batch": 50\n}\n```',
    );
    expect(a2uiActionMessage("Migrations", action({ name: " skip ", context: {} }))).toBe(
      'skip (from "Migrations")',
    );
  });

  it("ignores other messages and oversized context", () => {
    expect(a2uiActionMessage("M", action({ name: "" }))).toBeUndefined();
    expect(a2uiActionMessage("M", { method: "t3/a2ui/action", params: { name: "x" } })).toBe(
      undefined,
    );
    expect(
      a2uiActionMessage("M", action({ name: "run", context: { note: "x".repeat(20_000) } })),
    ).toBeUndefined();
  });
});
