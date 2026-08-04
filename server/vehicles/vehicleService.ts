import { prisma } from "@/server/db/prisma";

export class VehicleNotFoundError extends Error {}

export async function createVehicle(params: {
  userId: string;
  make: string;
  model: string;
  year?: number;
  color: string;
  licensePlate: string;
  seatsTotal: number;
  photoUrls?: string[];
}) {
  // Ensure the user has a DriverProfile the first time they register a vehicle —
  // this is what "upgrades" a passenger-only account to also be a driver,
  // without needing a separate account (spec §4).
  await prisma.driverProfile.upsert({
    where: { userId: params.userId },
    update: {},
    create: { userId: params.userId },
  });

  const existingCount = await prisma.vehicle.count({ where: { userId: params.userId } });

  return prisma.vehicle.create({
    data: {
      userId: params.userId,
      make: params.make,
      model: params.model,
      year: params.year,
      color: params.color,
      licensePlate: params.licensePlate,
      seatsTotal: params.seatsTotal,
      photoUrls: params.photoUrls ?? [],
      // The first vehicle a driver registers becomes their default automatically.
      isDefault: existingCount === 0,
    },
  });
}

export async function listVehiclesForUser(userId: string) {
  return prisma.vehicle.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });
}

export async function updateVehicle(
  vehicleId: string,
  userId: string,
  params: Partial<{
    make: string;
    model: string;
    year: number | null;
    color: string;
    licensePlate: string;
    seatsTotal: number;
    photoUrls: string[];
  }>
) {
  const existing = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!existing) throw new VehicleNotFoundError("Vehicle not found for this account");

  return prisma.vehicle.update({ where: { id: vehicleId }, data: params });
}

export async function deleteVehicle(vehicleId: string, userId: string) {
  const existing = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!existing) throw new VehicleNotFoundError("Vehicle not found for this account");

  // Never allow deleting a vehicle that still has scheduled rides attached —
  // that would orphan those rides. Driver must cancel the rides first.
  const activeRide = await prisma.ride.findFirst({
    where: { vehicleId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
  });
  if (activeRide) {
    throw new Error("Cancel or complete this vehicle's active rides before deleting it");
  }

  await prisma.vehicle.delete({ where: { id: vehicleId } });

  // If the deleted vehicle was the default, promote the most recently added
  // remaining vehicle so the driver always has exactly one default (or zero).
  if (existing.isDefault) {
    const next = await prisma.vehicle.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
    if (next) {
      await prisma.vehicle.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }
}

export async function setDefaultVehicle(vehicleId: string, userId: string) {
  const existing = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!existing) throw new VehicleNotFoundError("Vehicle not found for this account");

  await prisma.$transaction([
    prisma.vehicle.updateMany({ where: { userId }, data: { isDefault: false } }),
    prisma.vehicle.update({ where: { id: vehicleId }, data: { isDefault: true } }),
  ]);
}
