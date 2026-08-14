import { describe, expect, it } from "vitest";
import { OrbitError } from "../src/errors.js";
import * as v1 from "../src/v1/index.js";
import * as v2 from "../src/v2/index.js";

describe("base64url helpers", () => {
  it("round-trips v2 sample id", () => {
    const id = v2.fromDecimalString("21269121450763675199002670464474546176");
    expect(v2.toBase64UrlString(id)).toBe("EABIpmobcAAQABAAAAAAAA");
    expect(v2.fromBase64UrlString("EABIpmobcAAQABAAAAAAAA")).toBe(id);
  });

  it("round-trips v1 zero and max-shaped values", () => {
    expect(v1.toBase64UrlString(0n)).toBe("AAAAAAAAAAA");
    expect(v1.fromBase64UrlString("AAAAAAAAAAA")).toBe(0n);
    const id = 0x1000_0000_0000_002an;
    expect(v1.fromBase64UrlString(v1.toBase64UrlString(id))).toBe(id);
  });

  it("rejects padded / standard alphabet / wrong length", () => {
    expect(() => v2.fromBase64UrlString("EABIpmobcAAQABAAAAAAAA==")).toThrow(OrbitError);
    expect(() => v2.fromBase64UrlString("EABIpmobcAAQABAAAAAA+/")).toThrow(OrbitError);
    expect(() => v2.fromBase64UrlString("short")).toThrow(OrbitError);
    expect(() => v1.fromBase64UrlString("AAAAAAAAAA")).toThrow(OrbitError);
    try {
      v2.fromBase64UrlString("EABIpmobcAAQABAAAAAAAA==");
    } catch (e) {
      expect((e as OrbitError).code).toBe("INVALID_BASE64URL");
    }
  });
});
