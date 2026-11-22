import { describe, expect, it } from "vite-plus/test";

import { A2UI_BASIC_CATALOG_ID, a2uiPageHtml, validateA2uiMessages } from "./index.ts";

const surface = (components: ReadonlyArray<Record<string, unknown>>) => [
  { version: "v0.9", createSurface: { surfaceId: "main", catalogId: A2UI_BASIC_CATALOG_ID } },
  { version: "v0.9", updateComponents: { surfaceId: "main", components } },
];

describe("validateA2uiMessages", () => {
  it.each([
    [
      "a bound form with an action",
      surface([
        { id: "root", component: "Column", children: ["name", "go"] },
        { id: "name", component: "TextField", label: "Name", value: { path: "/name" } },
        { id: "label", component: "Text", text: "Save" },
        { id: "go", component: "Button", child: "label", action: { event: { name: "save" } } },
      ]),
      [],
    ],
    [
      "a v1.0 envelope",
      [{ version: "1.0", createSurface: { surfaceId: "main" } }],
      [
        'messages[0]: version must be "v0.9".',
        `messages[0]: catalogId must be "${A2UI_BASIC_CATALOG_ID}".`,
      ],
    ],
    [
      "another catalog",
      [{ version: "v0.9", createSurface: { surfaceId: "main", catalogId: "x" } }],
      [`messages[0]: catalogId must be "${A2UI_BASIC_CATALOG_ID}".`],
    ],
    ["no surface", [], ["Start with a createSurface message."]],
    [
      "no root",
      surface([{ id: "title", component: "Text", text: "Hi" }]),
      ["Missing root component: No component has id='root'"],
    ],
  ])("%s", (_name, messages, problems) => {
    expect(validateA2uiMessages(messages)).toEqual(problems);
  });

  it("names the component a catalog does not have", () => {
    const problems = validateA2uiMessages(
      surface([{ id: "root", component: "Blink", text: "Hi" }]),
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("Unknown component type 'Blink'");
  });
});

describe("a2uiPageHtml", () => {
  it("keeps agent text from closing the data element", () => {
    const html = a2uiPageHtml(surface([{ id: "root", component: "Text", text: "</script><b>" }]));
    expect(html.match(/<\/script>/g)).toHaveLength(2);
    expect(html).toContain("\\u003c/script>\\u003cb>");
  });
});
