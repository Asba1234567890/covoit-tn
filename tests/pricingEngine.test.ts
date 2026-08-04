import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockPrisma } from "./mocks/prisma";

const mockPrisma = vi.hoisted(() => ({ current: null as any }));

vi.mock("@/server/db/prisma", () => ({
  get prisma() {
    return mockPrisma.current;
  },
}));

// pricingEngine caches the commission percent in module-scope state for 60s.
// Reset the module registry between tests so each test gets a fresh cache
// instead of leaking the previous test's commission value.
async function freshCalculatePrice() {
  vi.resetModules();
  const mod = await import("@/lib/pricing/pricingEngine");
  return mod.calculatePrice;
}

describe("calculatePrice", () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    prisma = createMockPrisma();
    mockPrisma.current = prisma;
  });

  it("falls back to the 10% default commission when no PlatformSetting exists", async () => {
    prisma.platformSetting.findFirst.mockResolvedValue(null);
    const calculatePrice = await freshCalculatePrice();

    const price = await calculatePrice(10, 2, null);

    expect(price.passengerTotal).toBe(22); // 20 base + 10% fee
    expect(price.platformFee).toBe(2);
    expect(price.driverNet).toBe(20);
    expect(price.commissionPercent).toBe(10);
  });

  it("uses the configured commission percent when set", async () => {
    prisma.platformSetting.findFirst.mockResolvedValue({ value: 15 });
    const calculatePrice = await freshCalculatePrice();

    const price = await calculatePrice(20, 1, "country_1");

    expect(price.commissionPercent).toBe(15);
    expect(price.driverNet).toBe(20);
    expect(price.platformFee).toBe(3);
    expect(price.passengerTotal).toBe(23);
  });

  it("scales linearly with seat count", async () => {
    prisma.platformSetting.findFirst.mockResolvedValue({ value: 10 });
    const calculatePrice = await freshCalculatePrice();

    const one = await calculatePrice(10, 1, null);
    const three = await calculatePrice(10, 3, null);

    expect(three.driverNet).toBeCloseTo(one.driverNet * 3, 3);
  });

  it("caches the commission percent instead of querying on every call", async () => {
    prisma.platformSetting.findFirst.mockResolvedValue({ value: 12 });
    const calculatePrice = await freshCalculatePrice();

    await calculatePrice(10, 1, null);
    await calculatePrice(10, 1, null);

    expect(prisma.platformSetting.findFirst).toHaveBeenCalledTimes(1);
  });
});
