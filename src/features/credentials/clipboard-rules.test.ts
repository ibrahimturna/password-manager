import { getClipboardAction } from "./clipboard-rules";

describe("getClipboardAction", () => {
  it("clears the clipboard when it still holds the password", () => {
    expect(getClipboardAction("secret", "secret", 4)).toBe("clear");
  });

  it("leaves something else the user copied", () => {
    expect(getClipboardAction("a shopping list", "secret", 4)).toBe("leave");
  });

  it("tries again when the clipboard reads empty", () => {
    expect(getClipboardAction("", "secret", 2)).toBe("retry");
  });

  it("stops on the last try", () => {
    expect(getClipboardAction("", "secret", 1)).toBe("leave");
  });
});
