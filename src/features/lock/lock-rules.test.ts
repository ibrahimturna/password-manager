import {
  bytesToHex,
  checkNewPassword,
  hexToBytes,
  parseWrappedKey,
  shouldLock,
  type WrappedKey,
} from "./lock-rules";

const wrappedKey: WrappedKey = {
  salt: "00ff",
  memory: 65536,
  passes: 3,
  parallelism: 1,
  sealed: "c2VhbGVk",
};

describe("parseWrappedKey", () => {
  it("reads a valid record", () => {
    expect(parseWrappedKey(JSON.stringify(wrappedKey))).toEqual(wrappedKey);
  });

  it("returns null when nothing is stored", () => {
    expect(parseWrappedKey(null)).toBeNull();
  });

  it("returns null for damaged data", () => {
    expect(parseWrappedKey("not json")).toBeNull();
    expect(parseWrappedKey("null")).toBeNull();
    expect(parseWrappedKey(JSON.stringify({ ...wrappedKey, memory: "lots" }))).toBeNull();
  });
});

describe("checkNewPassword", () => {
  it("accepts any non-empty password that is repeated correctly", () => {
    expect(checkNewPassword("a", "a")).toBeNull();
  });

  it("rejects an empty password", () => {
    expect(checkNewPassword("", "")).toBe("empty");
  });

  it("rejects a mistyped repeat", () => {
    expect(checkNewPassword("secret", "secrt")).toBe("mismatch");
  });
});

describe("shouldLock", () => {
  it("never locks when the app did not go to the background", () => {
    expect(shouldLock(null, 999_999, "immediately")).toBe(false);
  });

  it("locks immediately with the immediately setting", () => {
    expect(shouldLock(1000, 1000, "immediately")).toBe(true);
  });

  it("waits for the chosen time", () => {
    expect(shouldLock(0, 59_999, "1min")).toBe(false);
    expect(shouldLock(0, 60_000, "1min")).toBe(true);
    expect(shouldLock(0, 299_999, "5min")).toBe(false);
    expect(shouldLock(0, 300_000, "5min")).toBe(true);
  });
});

describe("hex conversion", () => {
  it("converts bytes to hex and back", () => {
    const bytes = new Uint8Array([0, 15, 16, 255]);

    expect(bytesToHex(bytes)).toBe("000f10ff");
    expect(hexToBytes("000f10ff")).toEqual(bytes);
  });
});
