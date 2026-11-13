import { describe, expect, it } from "vitest";
import { normalizePhone, sanitizeCell } from "./import-pupils";

describe("sanitizeCell", () => {
  it("strips formula prefixes", () => {
    expect(sanitizeCell("=HYPERLINK(\"x\")")).toBe("HYPERLINK(\"x\")");
    expect(sanitizeCell("+254700")).toBe("254700");
    expect(sanitizeCell("@SUM")).toBe("SUM");
    expect(sanitizeCell("-=cmd")).toBe("cmd");
  });
  it("keeps normal names", () => {
    expect(sanitizeCell("  Wanjiku ")).toBe("Wanjiku");
  });
});


it("Kenyan phone formats match the same parent", () => {
  expect(normalizePhone("0712 345 678")).toBe("254712345678");
  expect(normalizePhone("+254712345678")).toBe("254712345678");
  expect(normalizePhone("712345678")).toBe("254712345678");
  expect(normalizePhone("")).toBeNull();
});
