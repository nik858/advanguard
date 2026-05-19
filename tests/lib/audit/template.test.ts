// @vitest-environment node
import { describe, it, expect } from "vitest";
import { renderHtmlTemplate, bodyToHtml } from "@/lib/audit/template";

describe("renderHtmlTemplate", () => {
  const baseVars = {
    body_html: "<p>Hello</p>",
    subject: "Hi",
    first_name: "Alex",
    signature: "Nik",
    domain: "acmedental.com",
  };

  it("substitutes every known placeholder", () => {
    const t = "<h1>{{subject}}</h1><div>{{first_name}}</div><div>{{domain}}</div><div>{{signature}}</div><div>{{body_html}}</div>";
    expect(renderHtmlTemplate(t, baseVars)).toBe(
      "<h1>Hi</h1><div>Alex</div><div>acmedental.com</div><div>Nik</div><div><p>Hello</p></div>",
    );
  });

  it("HTML-escapes non-body variables but trusts body_html", () => {
    const result = renderHtmlTemplate("{{subject}} :: {{body_html}}", {
      ...baseVars,
      subject: "<script>alert(1)</script>",
      body_html: "<p>safe</p>",
    });
    expect(result).toContain("&lt;script&gt;");
    expect(result).toContain("<p>safe</p>");
    expect(result).not.toMatch(/<script[^>]*>/i);
  });

  it("leaves unknown placeholders untouched (fail-safe)", () => {
    const t = "Known: {{subject}} / Unknown: {{wat}}";
    const result = renderHtmlTemplate(t, baseVars);
    expect(result).toContain("Known: Hi");
    expect(result).toContain("{{wat}}");
  });

  it("derives body_html from plain `body` when body_html is not supplied", () => {
    const result = renderHtmlTemplate("{{body_html}}", {
      ...baseVars,
      body_html: undefined,
      body: "Line 1\n\nLine 2",
    });
    expect(result).toBe("<p>Line 1</p><p>Line 2</p>");
  });
});

describe("bodyToHtml", () => {
  it("wraps each paragraph in <p>", () => {
    expect(bodyToHtml("Para 1\n\nPara 2")).toBe("<p>Para 1</p><p>Para 2</p>");
  });

  it("converts single newlines to <br>", () => {
    expect(bodyToHtml("Line A\nLine B")).toBe("<p>Line A<br>Line B</p>");
  });

  it("escapes HTML characters inside the body", () => {
    expect(bodyToHtml("<x>&'\"")).toBe('<p>&lt;x&gt;&amp;\'&quot;</p>');
  });
});
