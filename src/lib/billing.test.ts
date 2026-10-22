import { describe, expect, it } from "vitest";
import { tierFor } from "./billing";
import { parseCoords } from "./locate";

describe("tierFor", () => {
  it("Starter for up to 3 buses / 80 pupils is KES 25,000", () => expect(tierFor(3, 80).priceKes).toBe(25000));
  it("Growth for 5 buses is KES 50,000", () => expect(tierFor(5, 150).priceKes).toBe(50000));
  it("Enterprise for 12 buses is KES 95,000", () => expect(tierFor(12, 400).priceKes).toBe(95000));
  it("16+ buses at KES 6,000 per bus", () => expect(tierFor(20, 600).priceKes).toBe(120000));
});

describe("parseCoords", () => {
  it("reads @lat,lng links", () =>
    expect(parseCoords("https://www.google.com/maps/@-1.151659,36.8015,17z")).toEqual({ lat: -1.151659, lng: 36.8015 }));
  it("reads plain pairs", () => expect(parseCoords("-1.15, 36.80")).toEqual({ lat: -1.15, lng: 36.8 }));
});
