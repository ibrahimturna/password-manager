import { parseSetting } from "./settings-values";

const allowed = ["device", "light", "dark"] as const;

describe("parseSetting", () => {
  it("returns a stored value that is allowed", () => {
    expect(parseSetting("dark", allowed, "device")).toBe("dark");
  });

  it("uses the fallback when nothing is stored", () => {
    expect(parseSetting(null, allowed, "device")).toBe("device");
  });

  it("uses the fallback for an unknown value", () => {
    expect(parseSetting("purple", allowed, "device")).toBe("device");
  });
});
