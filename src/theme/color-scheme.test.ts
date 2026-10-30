import { resolveColorScheme } from "./color-scheme";

describe("resolveColorScheme", () => {
  it("uses the chosen scheme, whatever the phone uses", () => {
    expect(resolveColorScheme("light", "dark")).toBe("light");
    expect(resolveColorScheme("dark", "light")).toBe("dark");
  });

  it("follows the phone when set to device", () => {
    expect(resolveColorScheme("device", "dark")).toBe("dark");
    expect(resolveColorScheme("device", "light")).toBe("light");
  });

  it("falls back to light when the phone reports no scheme", () => {
    expect(resolveColorScheme("device", null)).toBe("light");
  });
});
