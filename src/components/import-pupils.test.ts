import { describe, expect, it } from "vitest";
import { sanitizeCell } from "./import-pupils";

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
