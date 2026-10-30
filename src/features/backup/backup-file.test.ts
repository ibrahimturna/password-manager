import {
  createBackupFile,
  getBackupFileName,
  parseBackupContents,
  parseBackupFile,
  toPlainBytes,
} from "./backup-file";

const sealed = { salt: "ab", memory: 65536, passes: 3, parallelism: 1, sealed: "c2VhbGVk" };

const folder = { id: "f1", name: "Banks", parentId: null };
const credential = {
  id: "c1",
  folderId: "f1",
  title: "Bank",
  username: null,
  password: "secret",
  createdAt: 1,
  updatedAt: 2,
};

describe("getBackupFileName", () => {
  it("contains the date", () => {
    expect(getBackupFileName(new Date("2026-10-30T12:00:00Z"))).toBe(
      "password-manager-backup-2026-10-30.pmbackup",
    );
  });
});

describe("toPlainBytes", () => {
  it("turns a Buffer into a plain Uint8Array with the same bytes", () => {
    // Same class name as the real Buffer, which is what the native code trips over.
    class Buffer extends Uint8Array {}

    const bytes = toPlainBytes(new Buffer([1, 2, 3]));

    expect(bytes.constructor.name).toBe("Uint8Array");
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });
});

describe("parseBackupFile", () => {
  it("reads back a created file", () => {
    expect(parseBackupFile(createBackupFile(sealed))).toEqual(sealed);
  });

  it("rejects text that is not JSON", () => {
    expect(parseBackupFile("hello")).toBeNull();
  });

  it("rejects other JSON files", () => {
    expect(parseBackupFile(JSON.stringify(sealed))).toBeNull();
  });

  it("rejects a newer backup version", () => {
    const newer = JSON.parse(createBackupFile(sealed));
    expect(parseBackupFile(JSON.stringify({ ...newer, version: 2 }))).toBeNull();
  });

  it("rejects a file asking for too much memory", () => {
    const greedy = createBackupFile({ ...sealed, memory: 8 * 1024 * 1024 });
    expect(parseBackupFile(greedy)).toBeNull();
  });
});

describe("parseBackupContents", () => {
  it("reads valid contents", () => {
    const text = JSON.stringify({ folders: [folder], credentials: [credential] });
    expect(parseBackupContents(text)).toEqual({ folders: [folder], credentials: [credential] });
  });

  it("rejects a damaged credential", () => {
    const text = JSON.stringify({ folders: [folder], credentials: [{ id: "c1" }] });
    expect(parseBackupContents(text)).toBeNull();
  });

  it("rejects a credential in a missing folder", () => {
    const text = JSON.stringify({ folders: [], credentials: [credential] });
    expect(parseBackupContents(text)).toBeNull();
  });

  it("rejects a folder with a missing parent", () => {
    const text = JSON.stringify({
      folders: [{ ...folder, parentId: "gone" }],
      credentials: [],
    });
    expect(parseBackupContents(text)).toBeNull();
  });
});
