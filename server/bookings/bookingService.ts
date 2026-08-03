import { prisma } from "@/server/db/prisma";
import { calculatePrice } from "@/lib/pricing/pricingEngine";
import { notify } from "@/server/notifications/notificationService";

export class InsufficientSeatsError extends Error {}
export class RideNotBookableError extends Error {}
export class DuplicateBookingError extends Error {}
export class NotAuthorizedError extends Error {}

// Uses a serializable transaction with a row lock so two passengers racing
// for the last seat can never both succeed — spec §50 explicitly calls this
// out as a required test case.
export async function createBooking(params: {
  rideId: string;
  passengerId: string;
  seatsRequested: number;
}) {
  const { rideId, passengerId, seatsRequested } = params;

  return prisma.$transaction(async (tx) => {
    // SELECT ... FOR UPDATE equivalent: Prisma doesn't expose row locks
    // directly, so use a raw query to lock the ride row for the duration
    // of this transaction.
    const [ride] = await tx.$queryRaw<Array<{ id: string; seatsAvailable: number; status: string; pricePerSeat: string; driverId: string; departureAt: Date }>>`
      SELECT id, "seatsAvailable", status, "pricePerSeat", "driverId", "departureAt" FROM "Ride" WHERE id = ${rideId} FOR UPDATE
    `;

    if (!ride || ride.status !== "SCHEDULED") {
      throw new RideNotBookableError("Ride is not open for booking");
    }
    if (new Date(ride.departureAt).getTime() < Date.now()) {
      throw new RideNotBookableError("This ride has already departed");
    }
    if (ride.driverId === passengerId) {
      throw new RideNotBookableError("You can't book your own ride");
    }
    if (ride.seatsAvailable < seatsRequested) {
      throw new InsufficientSeatsError("Not enough seats available");
    }

    const existingActiveBooking = await tx.booking.findFirst({
      where: { rideId, passengerId, status: { in: ["PENDING", "ACCEPTED"] } },
    });
    if (existingActiveBooking) {
      throw new DuplicateBookingError("You already have an active booking on this ride");
    }

    await tx.ride.update({
      where: { id: rideId },
      data: { seatsAvailable: { decrement: seatsRequested } },
    });

    const rideRecord = await tx.ride.findUniqueOrThrow({ where: { id: rideId } });
    const bookingMode = rideRecord.bookingMode;

    const booking = await tx.booking.create({
      data: {
        rideId,
        passengerId,
        seatsBooked: seatsRequested,
        status: bookingMode === "INSTANT" ? "ACCEPTED" : "PENDING",
        respondedAt: bookingMode === "INSTANT" ? new Date() : null,
      },
    });

    const price = await calculatePrice(
      Number(rideRecord.pricePerSeat),
      seatsRequested,
      null
    );

    await tx.payment.create({
      data: {
        bookingId: booking.id,
        provider: "cash",
        amountGross: price.passengerTotal,
        platformFee: price.platformFee,
        amountNet: price.driverNet,
        status: "UNPAID",
      },
    });

    return booking;
  }).then(async (booking) => {
    // Notify outside the DB transaction so a notification hiccup never
    // rolls back a successful booking.
    const ride = await prisma.ride.findUniqueOrThrow({ where: { id: rideId } });
    await notify(ride.driverId, "BOOKING_REQUESTED", { bookingId: booking.id, rideId });
    if (booking.status === "ACCEPTED") {
      // Instant-booking mode: the passenger's request is auto-accepted.
      await notify(passengerId, "BOOKING_ACCEPTED", { bookingId: booking.id, rideId, autoAccepted: true });
    }
    return booking;
  });
}

export async function respondToBooking(bookingId: string, decision: "ACCEPTED" | "DECLINED", requestingDriverId: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { ride: true } });
    if (booking.ride.driverId !== requestingDriverId) {
      throw new NotAuthorizedError("Only the ride's driver can respond to this booking");
    }
    if (booking.status !== "PENDING") {
      throw new Error("Booking already responded to");
    }
    if (decision === "DECLINED") {
      await tx.ride.update({
        where: { id: booking.rideId },
        data: { seatsAvailable: { increment: booking.seatsBooked } },
      });
    }
    return tx.booking.update({
      where: { id: bookingId },
      data: { status: decision, respondedAt: new Date() },
    });
  }).then(async (booking) => {
    await notify(booking.passengerId, decision === "ACCEPTED" ? "BOOKING_ACCEPTED" : "BOOKING_DECLINED", {
      bookingId: booking.id,
      rideId: booking.rideId,
    });
    return booking;
  });
}

export async function cancelBooking(bookingId: string, requestingUserId: string, reason?: string) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({ where: { id: bookingId }, include: { ride: true } });

    const isPassenger = booking.passengerId === requestingUserId;
    const isDriver = booking.ride.driverId === requestingUserId;
    if (!isPassenger && !isDriver) {
      throw new NotAuthorizedError("You are not part of this booking");
    }
    if (!["ACCEPTED", "PENDING"].includes(booking.status)) {
      throw new Error("Booking is not in a cancellable state");
    }

    await tx.ride.update({
      where: { id: booking.rideId },
      data: { seatsAvailable: { increment: booking.seatsBooked } },
    });

    return tx.booking.update({
      where: { id: bookingId },
      data: {
        status: isPassenger ? "CANCELLED_BY_PASSENGER" : "CANCELLED_BY_DRIVER",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
  }).then(async (booking) => {
    const ride = await prisma.ride.findUniqueOrThrow({ where: { id: booking.rideId } });
    const notifyUserId = booking.passengerId === requestingUserId ? ride.driverId : booking.passengerId;
    await notify(notifyUserId, "BOOKING_CANCELLED", { bookingId: booking.id, rideId: booking.rideId, reason });
    return booking;
  });
}
