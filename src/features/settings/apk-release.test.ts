import { findApk, needsApk } from "./apk-release";

const release = {
  tag_name: "v1.0.5-build12",
  assets: [
    { name: "notes.txt", browser_download_url: "https://x/notes.txt", size: 10 },
    {
      name: "password-manager-04302071a912c0e4785a6df9e7a673dca4c71460.apk",
      browser_download_url: "https://x/app.apk",
      size: 74_000_000,
    },
  ],
};

describe("findApk", () => {
  it("reads the version, runtime and download from the release", () => {
    expect(findApk(release)).toEqual({
      version: "1.0.5",
      runtimeVersion: "04302071a912c0e4785a6df9e7a673dca4c71460",
      apkUrl: "https://x/app.apk",
      size: 74_000_000,
    });
  });

  it("finds nothing in a release without an APK", () => {
    expect(findApk({ tag_name: "v1", assets: [] })).toBeNull();
  });
});

describe("needsApk", () => {
  const apk = findApk(release);

  it("asks for the APK when the native code differs", () => {
    expect(needsApk(apk, "ae90bc3c4927caf9e2b3b249b119225e103acb20")).toBe(true);
  });

  it("does not ask when this is already that build", () => {
    expect(needsApk(apk, "04302071a912c0e4785a6df9e7a673dca4c71460")).toBe(false);
  });

  it("does not ask without a release or a known runtime", () => {
    expect(needsApk(null, "abc")).toBe(false);
    expect(needsApk(apk, null)).toBe(false);
  });
});
