import { prisma } from "@/server/db/prisma";

export async function createVehicle(params: {
  userId: string;
  make: string;
  model: string;
  color: string;
  licensePlate: string;
  seatsTotal: number;
}) {
  // Ensure the user has a DriverProfile the first time they register a vehicle —
  // this is what "upgrades" a passenger-only account to also be a driver,
  // without needing a separate account (spec §4).
  await prisma.driverProfile.upsert({
    where: { userId: params.userId },
    update: {},
    create: { userId: params.userId },
  });

  return prisma.vehicle.create({
    data: {
      userId: params.userId,
      make: params.make,
      model: params.model,
      color: params.color,
      licensePlate: params.licensePlate,
      seatsTotal: params.seatsTotal,
    },
  });
}

export async function listVehiclesForUser(userId: string) {
  return prisma.vehicle.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}
