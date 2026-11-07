// New APKs are published as GitHub releases by .github/workflows/release.yml. The asset's name
// carries the build's runtime version (its native fingerprint), so one request tells the app
// whether its own native code is out of date.
const LATEST_RELEASE_URL =
  "https://api.github.com/repos/ibrahimturna/password-manager/releases/latest";
const APK_NAME = /^password-manager-([0-9a-f]+)\.apk$/;

export type ApkRelease = {
  version: string;
  runtimeVersion: string;
  apkUrl: string;
  size: number;
};

// The parts of GitHub's release response that are used.
type GitHubRelease = {
  tag_name: string;
  assets: { name: string; browser_download_url: string; size: number }[];
};

export function findApk(release: GitHubRelease): ApkRelease | null {
  for (const asset of release.assets) {
    const runtimeVersion = APK_NAME.exec(asset.name)?.[1];
    if (runtimeVersion !== undefined) {
      return {
        version: release.tag_name.replace(/^v/, "").replace(/-build\d+$/, ""),
        runtimeVersion,
        apkUrl: asset.browser_download_url,
        size: asset.size,
      };
    }
  }
  return null;
}

// shortcut: any other runtime counts as newer, because the latest release is always the newest
// build. A hand-installed build that is newer than the latest release would be offered a
// downgrade; publish builds only through the release workflow to avoid that.
export function needsApk(release: ApkRelease | null, installedRuntime: string | null): boolean {
  return release !== null && installedRuntime !== null && release.runtimeVersion !== installedRuntime;
}

// Null when there is no release yet or GitHub cannot be reached.
export async function getLatestApk(): Promise<ApkRelease | null> {
  const response = await fetch(LATEST_RELEASE_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) return null;
  return findApk((await response.json()) as GitHubRelease);
}
