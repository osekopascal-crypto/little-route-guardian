/** Platform subscription the school pays Pasco Labs, billed per term. */
export const PAYEE = {
  method: "M-Pesa Pochi la Biashara",
  number: "0710368847",
  name: "Pasco Labs",
} as const;

export type Tier = { name: string; maxBuses: number; maxPupils: number; priceKes: number };

export const TIERS: Tier[] = [
  { name: "Starter", maxBuses: 3, maxPupils: 80, priceKes: 25000 },
  { name: "Growth", maxBuses: 7, maxPupils: 200, priceKes: 50000 },
  { name: "Enterprise", maxBuses: 15, maxPupils: 450, priceKes: 95000 },
];

export const PER_BUS_ABOVE_15 = 6000;

/** Picks the smallest tier that fits both bus and pupil counts. */
export function tierFor(buses: number, pupils: number): Tier {
  const fit = TIERS.find((t) => buses <= t.maxBuses && pupils <= t.maxPupils);
  if (fit) return fit;
  return { name: "Custom", maxBuses: buses, maxPupils: pupils, priceKes: Math.max(buses, 16) * PER_BUS_ABOVE_15 };
}
