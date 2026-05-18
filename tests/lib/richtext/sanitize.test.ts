// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { sanitizeRichText } from "@/lib/richtext/sanitize";

describe("sanitizeRichText", () => {
  it("passes plain text through unchanged", () => {
    expect(sanitizeRichText("Hello world")).toBe("Hello world");
  });

  it("preserves allowed tags: strong, em, u, br", () => {
    expect(sanitizeRichText("<strong>bold</strong> <em>italic</em> <u>under</u><br>next")).toBe(
      "<strong>bold</strong> <em>italic</em> <u>under</u><br>next",
    );
  });

  it("preserves span with allowed color style from the palette", () => {
    expect(sanitizeRichText('<span style="color:#1c7fff">blue</span>')).toBe(
      '<span style="color:#1c7fff">blue</span>',
    );
  });

  it("strips tags outside the allowlist but keeps inner text", () => {
    expect(sanitizeRichText("<script>alert(1)</script>danger")).toBe("danger");
    expect(sanitizeRichText("<div><p>hi</p></div>")).toBe("hi");
    expect(sanitizeRichText('<a href="evil">click</a>')).toBe("click");
  });

  it("strips disallowed attributes on allowed tags", () => {
    expect(sanitizeRichText('<strong onclick="alert(1)">x</strong>')).toBe("<strong>x</strong>");
    expect(sanitizeRichText('<em class="foo" id="bar">y</em>')).toBe("<em>y</em>");
  });

  it("strips span style that is not a palette color", () => {
    expect(sanitizeRichText('<span style="color:#abcdef">x</span>')).toBe("<span>x</span>");
    expect(sanitizeRichText('<span style="font-size:99px">x</span>')).toBe("<span>x</span>");
    expect(sanitizeRichText('<span style="color:#1c7fff;background:red">x</span>')).toBe(
      "<span>x</span>",
    );
  });

  it("handles nested allowed tags correctly", () => {
    expect(sanitizeRichText("<strong><em>bi</em></strong>")).toBe("<strong><em>bi</em></strong>");
  });

  it("strips inner text of dangerous content-tags (script, style)", () => {
    expect(sanitizeRichText("hello <script>evil</script> world")).toBe("hello  world");
    expect(sanitizeRichText("a<style>body{}</style>b")).toBe("ab");
  });

  it("handles empty input", () => {
    expect(sanitizeRichText("")).toBe("");
  });

  it("preserves unicode", () => {
    expect(sanitizeRichText("Café <strong>déjà</strong> vu — ✓")).toBe(
      "Café <strong>déjà</strong> vu — ✓",
    );
  });

  it("normalizes color hex to lowercase before matching", () => {
    expect(sanitizeRichText('<span style="color:#FFCE1E">y</span>')).toBe(
      '<span style="color:#ffce1e">y</span>',
    );
  });
});
