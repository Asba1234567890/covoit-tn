export interface ChargeRequest {
  bookingId: string;
  amount: number; // in smallest currency unit-agnostic decimal form
  currencyCode: string;
}

export interface ChargeResult {
  status: "PAID" | "PENDING" | "FAILED";
  providerReference?: string;
}

export interface PaymentProvider {
  key: string; // "cash", "flouci", "stripe", etc.
  charge(req: ChargeRequest): Promise<ChargeResult>;
  refund(providerReference: string): Promise<{ status: "REFUNDED" | "FAILED" }>;
}

// MVP: cash is the only real provider. Booking and payment status are
// tracked independently (spec §15) so adding an online provider later
// never requires touching the Booking model or its state machine.
export class CashPaymentProvider implements PaymentProvider {
  key = "cash";

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    // Cash is settled in person; the platform just records the intent.
    return { status: "PENDING" };
  }

  async refund(): Promise<{ status: "REFUNDED" | "FAILED" }> {
    // No-op for cash — refunds are handled off-platform and marked manually by admin.
    return { status: "REFUNDED" };
  }
}

export function getPaymentProvider(key: string): PaymentProvider {
  switch (key) {
    case "cash":
      return new CashPaymentProvider();
    default:
      throw new Error(`Unknown payment provider: ${key}`);
  }
}
