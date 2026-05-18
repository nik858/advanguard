// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { wrapSelection, unwrapAroundSelection, isSelectionWrappedBy } from "@/lib/richtext/selection";

function setup(html: string, anchorStart: number, focusEnd: number): { host: HTMLElement; range: Range } {
  const host = document.createElement("div");
  host.innerHTML = html;
  document.body.appendChild(host);
  const range = document.createRange();
  const text = host.firstChild as Text;
  range.setStart(text, anchorStart);
  range.setEnd(text, focusEnd);
  return { host, range };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("wrapSelection", () => {
  it("wraps a text selection in <strong>", () => {
    const { host, range } = setup("hello world", 0, 5);
    wrapSelection(range, "strong");
    expect(host.innerHTML).toBe("<strong>hello</strong> world");
  });

  it("wraps a text selection in <em>", () => {
    const { host, range } = setup("hello world", 6, 11);
    wrapSelection(range, "em");
    expect(host.innerHTML).toBe("hello <em>world</em>");
  });

  it("wraps with attributes", () => {
    const { host, range } = setup("hello", 0, 5);
    wrapSelection(range, "span", { style: "color:#1c7fff" });
    expect(host.innerHTML).toBe('<span style="color:#1c7fff">hello</span>');
  });
});

describe("unwrapAroundSelection", () => {
  it("removes a <strong> wrapper around the selected range", () => {
    const host = document.createElement("div");
    host.innerHTML = "<strong>hello</strong> world";
    document.body.appendChild(host);
    const range = document.createRange();
    const inside = host.querySelector("strong")!.firstChild as Text;
    range.setStart(inside, 0);
    range.setEnd(inside, 5);
    unwrapAroundSelection(range, "strong");
    expect(host.innerHTML).toBe("hello world");
  });

  it("removes a <span style> wrapper", () => {
    const host = document.createElement("div");
    host.innerHTML = '<span style="color:#1c7fff">hello</span>';
    document.body.appendChild(host);
    const range = document.createRange();
    const inside = host.querySelector("span")!.firstChild as Text;
    range.setStart(inside, 0);
    range.setEnd(inside, 5);
    unwrapAroundSelection(range, "span");
    expect(host.innerHTML).toBe("hello");
  });
});

describe("isSelectionWrappedBy", () => {
  it("returns true when the range sits inside the named tag", () => {
    const host = document.createElement("div");
    host.innerHTML = "<strong>hello</strong>";
    document.body.appendChild(host);
    const range = document.createRange();
    const inside = host.querySelector("strong")!.firstChild as Text;
    range.setStart(inside, 0);
    range.setEnd(inside, 5);
    expect(isSelectionWrappedBy(range, "strong", host)).toBe(true);
  });

  it("returns false when the range is in plain text", () => {
    const { host, range } = setup("hello", 0, 5);
    expect(isSelectionWrappedBy(range, "strong", host)).toBe(false);
  });

  it("returns false when the range crosses past the wrapper boundary", () => {
    const host = document.createElement("div");
    host.innerHTML = "<strong>hello</strong> world";
    document.body.appendChild(host);
    const range = document.createRange();
    const inside = host.querySelector("strong")!.firstChild as Text;
    const after = inside.parentElement!.nextSibling as Text;
    range.setStart(inside, 0);
    range.setEnd(after, 3);
    expect(isSelectionWrappedBy(range, "strong", host)).toBe(false);
  });
});
