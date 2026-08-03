import { prisma } from "@/server/db/prisma";

export interface PriceBreakdown {
  driverAskPerSeat: number;
  seats: number;
  passengerTotal: number;
  platformFee: number;
  driverNet: number;
  commissionPercent: number;
}

const DEFAULT_COMMISSION_PERCENT = 10;
const SETTINGS_CACHE_TTL_MS = 60_000;
let cachedCommission: { value: number; expiresAt: number } | null = null;

async function getCommissionPercent(countryId: string | null): Promise<number> {
  if (cachedCommission && cachedCommission.expiresAt > Date.now()) {
    return cachedCommission.value;
  }
  const setting = await prisma.platformSetting.findFirst({
    where: { key: "commission_percent", countryId: countryId ?? undefined },
  });
  const value = (setting?.value as number | undefined) ?? DEFAULT_COMMISSION_PERCENT;
  cachedCommission = { value, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
  return value;
}

export async function calculatePrice(
  driverAskPerSeat: number,
  seats: number,
  countryId: string | null
): Promise<PriceBreakdown> {
  const commissionPercent = await getCommissionPercent(countryId);
  const base = driverAskPerSeat * seats;
  const platformFee = +(base * (commissionPercent / 100)).toFixed(3);
  const passengerTotal = +(base + platformFee).toFixed(3);
  const driverNet = +base.toFixed(3);

  return {
    driverAskPerSeat,
    seats,
    passengerTotal,
    platformFee,
    driverNet,
    commissionPercent,
  };
}
