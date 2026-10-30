import { createKeptState } from "./kept-state";

describe("createKeptState", () => {
  it("returns the fallback for an unknown key", () => {
    expect(createKeptState().read("name", "start")).toBe("start");
  });

  it("returns a stored null instead of the fallback", () => {
    const kept = createKeptState();
    kept.write("folder", null);
    expect(kept.read<string | null>("folder", "start")).toBeNull();
  });

  it("deletes a value when its screen closes normally", () => {
    const kept = createKeptState();
    kept.write("name", "draft");
    kept.forget("name");
    expect(kept.read("name", "start")).toBe("start");
  });

  it("keeps values when screens close because of a lock", () => {
    const kept = createKeptState();
    kept.write("name", "draft");
    kept.startLocking();
    kept.forget("name");
    expect(kept.read("name", "start")).toBe("draft");
  });

  it("deletes values again after unlocking", () => {
    const kept = createKeptState();
    kept.write("name", "draft");
    kept.startLocking();
    kept.finishUnlocking();
    kept.forget("name");
    expect(kept.read("name", "start")).toBe("start");
  });

  it("gives back the open screens in order, once", () => {
    const kept = createKeptState();
    kept.addRoute("/settings");
    kept.addRoute("/master-password");
    kept.startLocking();
    kept.removeRoute("/master-password");
    kept.removeRoute("/settings");
    expect(kept.takeRoutes()).toEqual(["/settings", "/master-password"]);
    expect(kept.hasRoutes()).toBe(false);
  });

  it("removes a screen that closed normally", () => {
    const kept = createKeptState();
    kept.addRoute("/settings");
    kept.removeRoute("/settings");
    expect(kept.hasRoutes()).toBe(false);
  });
});
