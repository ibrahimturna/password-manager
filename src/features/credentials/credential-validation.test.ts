import {
  type CredentialInput,
  MAX_PASSWORD_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_USERNAME_LENGTH,
  validateCredential,
} from "./credential-validation";

// A valid input; each test changes only the field it cares about.
const validInput: CredentialInput = {
  folderId: "banks",
  title: "Bank",
  username: "demo_user",
  password: "fake-password",
};

describe("validateCredential", () => {
  it("accepts a valid credential", () => {
    expect(validateCredential(validInput)).toEqual({
      ok: true,
      value: { folderId: "banks", title: "Bank", username: "demo_user", password: "fake-password" },
    });
  });

  it("trims the title and username", () => {
    const result = validateCredential({ ...validInput, title: "  Bank ", username: " demo " });

    expect(result.ok && result.value.title).toBe("Bank");
    expect(result.ok && result.value.username).toBe("demo");
  });

  it("does not trim the password, because spaces can be part of it", () => {
    const result = validateCredential({ ...validInput, password: " secret " });

    expect(result.ok && result.value.password).toBe(" secret ");
  });

  it("stores an empty username as null", () => {
    const result = validateCredential({ ...validInput, username: "   " });

    expect(result.ok && result.value.username).toBeNull();
  });

  it("rejects an empty or space-only title", () => {
    expect(validateCredential({ ...validInput, title: "  " })).toEqual({
      ok: false,
      errors: { title: "empty" },
    });
  });

  it("rejects an empty password", () => {
    expect(validateCredential({ ...validInput, password: "" })).toEqual({
      ok: false,
      errors: { password: "empty" },
    });
  });

  it("accepts each field at exactly its maximum length", () => {
    const result = validateCredential({
      ...validInput,
      title: "t".repeat(MAX_TITLE_LENGTH),
      username: "u".repeat(MAX_USERNAME_LENGTH),
      password: "p".repeat(MAX_PASSWORD_LENGTH),
    });

    expect(result.ok).toBe(true);
  });

  it("rejects fields that are one character too long", () => {
    expect(
      validateCredential({
        ...validInput,
        title: "t".repeat(MAX_TITLE_LENGTH + 1),
        username: "u".repeat(MAX_USERNAME_LENGTH + 1),
        password: "p".repeat(MAX_PASSWORD_LENGTH + 1),
      }),
    ).toEqual({
      ok: false,
      errors: { title: "too-long", username: "too-long", password: "too-long" },
    });
  });

  it("reports every problem at once", () => {
    expect(validateCredential({ ...validInput, title: "", password: "" })).toEqual({
      ok: false,
      errors: { title: "empty", password: "empty" },
    });
  });
});
