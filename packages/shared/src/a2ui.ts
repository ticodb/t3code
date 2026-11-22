/** Posted by an A2UI page when the reader triggers a Button action. */
export const A2UI_ACTION_METHOD = "t3/a2ui/action";

const MAX_A2UI_ACTION_MESSAGE_LENGTH = 16_000;

/**
 * The thread message for an action on an A2UI page, or undefined for anything else. The name and
 * context come from the agent's own messages, resolved against what the reader entered.
 */
export function a2uiActionMessage(title: string, data: unknown): string | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const { jsonrpc, method, params } = data as Record<string, unknown>;
  if (jsonrpc !== "2.0" || method !== A2UI_ACTION_METHOD) return undefined;
  if (typeof params !== "object" || params === null) return undefined;
  const { name, context } = params as Record<string, unknown>;
  if (typeof name !== "string" || name.trim() === "") return undefined;
  const filled = typeof context === "object" && context !== null && Object.keys(context).length > 0;
  const message = [
    `${name.trim()} (from ${JSON.stringify(title)})`,
    ...(filled ? ["", "```json", JSON.stringify(context, null, 2), "```"] : []),
  ].join("\n");
  return message.length <= MAX_A2UI_ACTION_MESSAGE_LENGTH ? message : undefined;
}
