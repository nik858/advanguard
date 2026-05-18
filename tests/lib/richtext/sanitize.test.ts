// @vitest-environment node
import { describe, it, expect } from "vitest";
import { sanitizeRichText } from "@/lib/richtext/sanitize";

describe("sanitizeRichText", () => {
  it("passes plain text through unchanged", () => {
    expect(sanitizeRichText("Hello world")).toBe("Hello world");
  });

  it("preserves allowed canonical tags: strong, em, u, br", () => {
    expect(sanitizeRichText("<strong>bold</strong> <em>italic</em> <u>under</u><br>next")).toBe(
      "<strong>bold</strong> <em>italic</em> <u>under</u><br>next",
    );
  });

  it("normalises <b> -> <strong> and <i> -> <em>", () => {
    expect(sanitizeRichText("<b>bold</b> <i>italic</i>")).toBe(
      "<strong>bold</strong> <em>italic</em>",
    );
  });

  it("preserves span with allowed hex color style", () => {
    expect(sanitizeRichText('<span style="color:#1c7fff">blue</span>')).toBe(
      '<span style="color:#1c7fff">blue</span>',
    );
  });

  it("normalises rgb() color to hex when matching the palette", () => {
    expect(sanitizeRichText('<span style="color: rgb(28, 127, 255)">blue</span>')).toBe(
      '<span style="color:#1c7fff">blue</span>',
    );
    expect(sanitizeRichText('<span style="color: rgb(255, 255, 255)">w</span>')).toBe(
      '<span style="color:#ffffff">w</span>',
    );
  });

  it("normalises <font color=...> to <span style=color> when palette-valid", () => {
    expect(sanitizeRichText('<font color="#1c7fff">b</font>')).toBe(
      '<span style="color:#1c7fff">b</span>',
    );
    expect(sanitizeRichText('<font color="rgb(28,127,255)">b</font>')).toBe(
      '<span style="color:#1c7fff">b</span>',
    );
  });

  it("strips <font color> with color outside the palette", () => {
    expect(sanitizeRichText('<font color="#abcdef">x</font>')).toBe("x");
  });

  it("strips tags outside the allowlist but keeps inner text", () => {
    expect(sanitizeRichText("<div><p>hi</p></div>")).toBe("hi");
    expect(sanitizeRichText('<a href="evil">click</a>')).toBe("click");
  });

  it("strips disallowed attributes on allowed tags", () => {
    expect(sanitizeRichText('<strong onclick="alert(1)">x</strong>')).toBe("<strong>x</strong>");
    expect(sanitizeRichText('<em class="foo" id="bar">y</em>')).toBe("<em>y</em>");
  });

  it("strips span when color hex is not in palette", () => {
    expect(sanitizeRichText('<span style="color:#abcdef">x</span>')).toBe("x");
  });

  it("strips span with no recognised color attribute", () => {
    expect(sanitizeRichText('<span style="font-size:99px">x</span>')).toBe("x");
  });

  it("keeps the color from a multi-declaration style attribute when palette-valid", () => {
    expect(sanitizeRichText('<span style="color:#1c7fff;background:red">x</span>')).toBe(
      '<span style="color:#1c7fff">x</span>',
    );
  });

  it("strips inner text of dangerous content-tags (script, style)", () => {
    expect(sanitizeRichText("hello <script>evil</script> world")).toBe("hello  world");
    expect(sanitizeRichText("a<style>body{}</style>b")).toBe("ab");
  });

  it("handles nested allowed tags correctly", () => {
    expect(sanitizeRichText("<strong><em>bi</em></strong>")).toBe("<strong><em>bi</em></strong>");
  });

  it("handles empty input", () => {
    expect(sanitizeRichText("")).toBe("");
  });

  it("preserves unicode", () => {
    expect(sanitizeRichText("Café <strong>déjà</strong> vu — ✓")).toBe(
      "Café <strong>déjà</strong> vu — ✓",
    );
  });

  it("normalises uppercase hex to lowercase", () => {
    expect(sanitizeRichText('<span style="color:#FFCE1E">y</span>')).toBe(
      '<span style="color:#ffce1e">y</span>',
    );
  });
});
