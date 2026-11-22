import { basicCatalog, MessageProcessor, STRICT_VALIDATION } from "@a2ui/web_core/v0_9";

import { A2UI_RENDERER_SCRIPT } from "../vendor/renderer.js";
import {
  A2UI_BASIC_CATALOG_ID,
  A2UI_MESSAGES_ELEMENT_ID,
  A2UI_ROOT_ELEMENT_ID,
  A2UI_VERSION,
} from "./protocol.ts";

export * from "./protocol.ts";

// The basic catalog styles read these; T3's html render bootstrap defines the right-hand sides.
const THEME_CSS = [
  ":root{",
  "--a2ui-color-background:transparent;",
  "--a2ui-color-on-background:var(--foreground);",
  "--a2ui-color-surface:var(--card);",
  "--a2ui-color-on-surface:var(--card-foreground);",
  "--a2ui-color-primary:var(--primary);",
  "--a2ui-color-on-primary:var(--primary-foreground);",
  "--a2ui-color-secondary:var(--secondary);",
  "--a2ui-color-on-secondary:var(--secondary-foreground);",
  "--a2ui-color-border:var(--border);",
  "--a2ui-color-input:var(--background);",
  "--a2ui-color-on-input:var(--foreground);",
  "--a2ui-border-radius:var(--radius);",
  "--a2ui-font-family-monospace:var(--font-mono);",
  "}",
].join("");

interface Envelope {
  readonly version?: unknown;
  readonly createSurface?: { readonly surfaceId?: unknown; readonly catalogId?: unknown };
}

const asEnvelope = (message: unknown): Envelope =>
  typeof message === "object" && message !== null ? (message as Envelope) : {};

/** Problems an agent can fix, in the order the renderer would hit them; empty when the page renders. */
export function validateA2uiMessages(messages: ReadonlyArray<unknown>): ReadonlyArray<string> {
  const problems: Array<string> = [];
  messages.forEach((message, index) => {
    const { version, createSurface } = asEnvelope(message);
    if (version !== A2UI_VERSION) {
      problems.push(`messages[${index}]: version must be "${A2UI_VERSION}".`);
    }
    if (createSurface !== undefined && createSurface.catalogId !== A2UI_BASIC_CATALOG_ID) {
      problems.push(`messages[${index}]: catalogId must be "${A2UI_BASIC_CATALOG_ID}".`);
    }
  });
  if (problems.length > 0) return problems;

  const processor = new MessageProcessor([basicCatalog], undefined, {
    validationConfig: STRICT_VALIDATION,
    reportErrorsOnly: true,
    errorHandler: ({ error }) => {
      const at = typeof error.path === "string" && error.path !== "" ? `${error.path}: ` : "";
      problems.push(`${at}${error.message}`);
    },
  });
  try {
    processor.processMessages(messages as Parameters<typeof processor.processMessages>[0]);
  } catch (cause) {
    problems.push(cause instanceof Error ? cause.message : String(cause));
  } finally {
    processor.dispose();
  }
  if (problems.length > 0) return problems;

  return messages.some((message) => asEnvelope(message).createSurface !== undefined)
    ? []
    : ["Start with a createSurface message."];
}

/** A self-contained page that renders the messages with the basic catalog. */
export function a2uiPageHtml(messages: ReadonlyArray<unknown>): string {
  // `<` cannot appear escaped in JSON, so this keeps agent text from closing the data element.
  const data = JSON.stringify(messages).replaceAll("<", "\\u003c");
  return [
    '<!doctype html><html><head><meta charset="utf-8">',
    `<style>${THEME_CSS}</style></head><body>`,
    `<div id="${A2UI_ROOT_ELEMENT_ID}"></div>`,
    `<script type="application/json" id="${A2UI_MESSAGES_ELEMENT_ID}">${data}</script>`,
    `<script>${A2UI_RENDERER_SCRIPT}</script>`,
    "</body></html>",
  ].join("");
}
