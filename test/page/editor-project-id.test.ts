import { describe, expect, it } from "vitest";
import { parseEditorProjectId } from "../../src/page/editor-project-id";

const ID = "0123456789abcdef01234567";

describe("parseEditorProjectId", () => {
  it("returns the id for an editor page path", () => {
    expect(parseEditorProjectId(`/project/${ID}`)).toBe(ID);
  });

  it("returns undefined for the project dashboard", () => {
    expect(parseEditorProjectId("/project")).toBeUndefined();
  });

  it("returns undefined for a sub-page of a project", () => {
    expect(parseEditorProjectId(`/project/${ID}/detacher`)).toBeUndefined();
  });

  it("returns undefined for an id that is not 24 characters", () => {
    expect(parseEditorProjectId(`/project/${ID.slice(1)}`)).toBeUndefined();
  });
});
