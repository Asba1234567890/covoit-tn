import { vi } from "vitest";

// Minimal hand-rolled mock of the subset of the Prisma client used by the
// service layer under test. $transaction just invokes the callback with a
// mock `tx` that shares the same method stubs as the top-level client,
// mirroring how the real functions call tx.<model>.<method>(...) inside a
// transaction and prisma.<model>.<method>(...) outside one.
export function createMockPrisma() {
  const model = () => ({
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    upsert: vi.fn(),
  });

  const prisma: any = {
    ride: model(),
    booking: model(),
    payment: model(),
    vehicle: model(),
    driverProfile: model(),
    user: model(),
    session: model(),
    otpRequest: model(),
    notification: model(),
    platformSetting: model(),
    recurringRide: model(),
    review: model(),
    blockedUser: model(),
    verification: model(),
    $queryRaw: vi.fn(),
    $transaction: vi.fn(async (arg: any) => {
      if (Array.isArray(arg)) return Promise.all(arg);
      return arg(prisma); // tx shares the same stubs as the top-level client
    }),
  };

  return prisma;
}
