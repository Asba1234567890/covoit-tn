import { describe, it, expect } from "vitest";
import { formatDistance, formatDuration } from "@/lib/formatRoute";

describe("formatDistance", () => {
  it("returns null for missing values", () => {
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(undefined)).toBeNull();
  });

  it("formats meters under 1km", () => {
    expect(formatDistance(450)).toBe("450 m");
  });

  it("formats kilometers, rounded", () => {
    expect(formatDistance(215400)).toBe("215 km");
  });
});

describe("formatDuration", () => {
  it("returns null for missing values", () => {
    expect(formatDuration(null)).toBeNull();
  });

  it("formats minutes only under an hour", () => {
    expect(formatDuration(25 * 60)).toBe("25 min");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(2 * 3600 + 10 * 60)).toBe("2h 10min");
  });

  it("formats whole hours without a minutes suffix", () => {
    expect(formatDuration(3 * 3600)).toBe("3h");
  });
});
