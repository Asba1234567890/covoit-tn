import { describe, it, expect } from "vitest";
import { isHttpUrl } from "@/lib/validateUrl";

describe("isHttpUrl", () => {
  it("accepts https URLs", () => {
    expect(isHttpUrl("https://example.com/photo.jpg")).toBe(true);
  });

  it("accepts http URLs", () => {
    expect(isHttpUrl("http://example.com/photo.jpg")).toBe(true);
  });

  it("rejects javascript: URLs", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects data: URLs", () => {
    expect(isHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("rejects malformed strings", () => {
    expect(isHttpUrl("not a url")).toBe(false);
    expect(isHttpUrl("")).toBe(false);
  });

  it("rejects file: URLs", () => {
    expect(isHttpUrl("file:///etc/passwd")).toBe(false);
  });
});
