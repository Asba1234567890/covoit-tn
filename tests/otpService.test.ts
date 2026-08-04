import { describe, it, expect } from "vitest";
import { isValidTunisianPhone } from "@/server/auth/otpService";

describe("isValidTunisianPhone", () => {
  it("accepts a valid Tunisian mobile number", () => {
    expect(isValidTunisianPhone("+21620123456")).toBe(true);
  });

  it("rejects numbers missing the country code", () => {
    expect(isValidTunisianPhone("20123456")).toBe(false);
  });

  it("rejects numbers with the wrong digit count", () => {
    expect(isValidTunisianPhone("+2162012345")).toBe(false); // 7 digits
    expect(isValidTunisianPhone("+216201234567")).toBe(false); // 9 digits
  });

  it("rejects non-Tunisian country codes", () => {
    expect(isValidTunisianPhone("+3312345678")).toBe(false);
  });

  it("rejects non-numeric input", () => {
    expect(isValidTunisianPhone("+216abcdefgh")).toBe(false);
    expect(isValidTunisianPhone("not a phone number")).toBe(false);
  });
});
