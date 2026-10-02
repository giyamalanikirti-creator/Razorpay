/**
 * Deterministic billing calculator.
 *
 * The AI layer only extracts the commercial rule (included seats, seat rate,
 * exclusions). Every rupee figure shown to the merchant comes from this file.
 */

export interface SeatRule {
  includedSeats: number;
  additionalSeatRate: number; // ₹ per seat per month
  excludeContractors: boolean;
}

export interface SeatUsage {
  activeUsers: number;
  contractorUsers: number;
}

export interface SeatBilling {
  billedSeats: number;
  monthlyAmount: number;
}

export interface SeatTrueUp {
  qualifyingSeats: number;
  additionalSeats: number;
  additionalAmount: number;
  currentMonthly: number;
  expectedMonthly: number;
  leakage: number;
  /** true when current billing equals billedSeats × rate, i.e. the rule reproduces Razorpay's own number */
  reconcilesWithRazorpay: boolean;
}

export function computeSeatTrueUp(rule: SeatRule, usage: SeatUsage, billing: SeatBilling): SeatTrueUp {
  const qualifyingSeats = usage.activeUsers - (rule.excludeContractors ? usage.contractorUsers : 0);
  const additionalSeats = Math.max(0, qualifyingSeats - billing.billedSeats);
  const additionalAmount = additionalSeats * rule.additionalSeatRate;
  const currentMonthly = billing.monthlyAmount;
  const expectedMonthly = currentMonthly + additionalAmount;
  return {
    qualifyingSeats,
    additionalSeats,
    additionalAmount,
    currentMonthly,
    expectedMonthly,
    leakage: expectedMonthly - currentMonthly,
    reconcilesWithRazorpay: billing.billedSeats * rule.additionalSeatRate === billing.monthlyAmount,
  };
}
