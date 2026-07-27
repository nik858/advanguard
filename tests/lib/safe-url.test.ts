import { describe, it, expect } from "vitest";
import { safeHttpUrl } from "@/lib/safe-url";

describe("safeHttpUrl", () => {
  it("keeps https and http URLs", () => {
    expect(safeHttpUrl("https://clinic.com/book")).toBe("https://clinic.com/book");
    expect(safeHttpUrl("http://clinic.com")).toBe("http://clinic.com/");
  });

  it("rejects javascript: URIs", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("JavaScript:alert(1)")).toBeNull();
    expect(safeHttpUrl("  javascript:alert(1)  ")).toBeNull();
  });

  it("rejects data:, vbscript: and file: URIs", () => {
    expect(safeHttpUrl("data:text/html;base64,PHNjcmlwdD4=")).toBeNull();
    expect(safeHttpUrl("vbscript:msgbox(1)")).toBeNull();
    expect(safeHttpUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects unparseable or empty values", () => {
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});
