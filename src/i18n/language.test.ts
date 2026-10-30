import { resolveLanguage } from "./language";

describe("resolveLanguage", () => {
  it("uses the chosen language, whatever the phone's language is", () => {
    expect(resolveLanguage("tr", "en")).toBe("tr");
    expect(resolveLanguage("en", "tr")).toBe("en");
  });

  it("follows a Turkish phone when set to device", () => {
    expect(resolveLanguage("device", "tr")).toBe("tr");
  });

  it("follows an English phone when set to device", () => {
    expect(resolveLanguage("device", "en")).toBe("en");
  });

  it("falls back to English for a language the app does not have", () => {
    expect(resolveLanguage("device", "de")).toBe("en");
  });

  it("falls back to English when the phone reports no language", () => {
    expect(resolveLanguage("device", null)).toBe("en");
  });
});
