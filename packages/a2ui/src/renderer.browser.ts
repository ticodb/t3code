// Runs inside a published A2UI page; scripts/build-renderer.ts bundles it into vendor/renderer.js.
import { basicCatalog } from "@a2ui/lit/v0_9";
import { MessageProcessor } from "@a2ui/web_core/v0_9";
import { injectBasicCatalogStyles } from "@a2ui/web_core/v0_9/basic_catalog";

import { A2UI_ACTION_METHOD, A2UI_MESSAGES_ELEMENT_ID, A2UI_ROOT_ELEMENT_ID } from "./protocol.ts";

const root = document.getElementById(A2UI_ROOT_ELEMENT_ID);
const source = document.getElementById(A2UI_MESSAGES_ELEMENT_ID)?.textContent ?? "[]";
let sent = 0;

injectBasicCatalogStyles();
// Mobile hosts the page as the WebView's top document; web and desktop frame it.
const host = (window as { ReactNativeWebView?: { postMessage: (data: string) => void } })
  .ReactNativeWebView;
const processor = new MessageProcessor([basicCatalog], (action) => {
  const message = {
    jsonrpc: "2.0",
    id: `t3-a2ui-${++sent}`,
    method: A2UI_ACTION_METHOD,
    params: { surfaceId: action.surfaceId, name: action.name, context: action.context },
  };
  // oxlint-disable-next-line unicorn/require-post-message-target-origin -- React Native's bridge takes no target origin.
  if (host !== undefined) host.postMessage(JSON.stringify(message));
  else if (window.parent !== window) window.parent.postMessage(message, "*");
});

// The server validated these messages before publishing the page.
processor.processMessages(JSON.parse(source));
for (const surface of processor.model.surfacesMap.values()) {
  const element = document.createElement("a2ui-surface") as HTMLElement & { surface: unknown };
  element.surface = surface;
  root?.append(element);
}
