import { describe, it, expect } from "vitest";
import { canModerate, canOperate } from "@/server/admin/adminAuth";

describe("admin role permissions", () => {
  it("SUPER_ADMIN can moderate and operate", () => {
    expect(canModerate("SUPER_ADMIN")).toBe(true);
    expect(canOperate("SUPER_ADMIN")).toBe(true);
  });

  it("MODERATOR can moderate but not operate", () => {
    expect(canModerate("MODERATOR")).toBe(true);
    expect(canOperate("MODERATOR")).toBe(false);
  });

  it("OPERATIONS can operate but not moderate", () => {
    expect(canModerate("OPERATIONS")).toBe(false);
    expect(canOperate("OPERATIONS")).toBe(true);
  });
});
