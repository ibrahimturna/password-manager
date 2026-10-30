export const MAX_TITLE_LENGTH = 100;
export const MAX_USERNAME_LENGTH = 100;
export const MAX_PASSWORD_LENGTH = 256;

// What the user typed in the credential form.
export type CredentialInput = {
  folderId: string;
  title: string;
  username: string;
  password: string;
};

// The cleaned-up values to store.
export type ValidCredential = {
  folderId: string;
  title: string;
  username: string | null; // empty becomes null: "no username"
  password: string;
};

// Why each field was rejected. Codes, not sentences, so the screen can show them in any language.
export type CredentialFieldErrors = {
  title?: "empty" | "too-long";
  username?: "too-long";
  password?: "empty" | "too-long";
};

export type CredentialValidationResult =
  | { ok: true; value: ValidCredential }
  | { ok: false; errors: CredentialFieldErrors };

// Counts characters the way people do: an emoji is 1, not 2.
function characterCount(text: string): number {
  return [...text].length;
}

// Checks every field and reports all problems at once, so the form can mark each field.
export function validateCredential(input: CredentialInput): CredentialValidationResult {
  const title = input.title.trim();
  const username = input.username.trim();
  // The password is NOT trimmed: spaces at the start or end can be part of a real password.
  const password = input.password;

  const errors: CredentialFieldErrors = {};

  if (title === "") {
    errors.title = "empty";
  } else if (characterCount(title) > MAX_TITLE_LENGTH) {
    errors.title = "too-long";
  }

  if (characterCount(username) > MAX_USERNAME_LENGTH) {
    errors.username = "too-long";
  }

  if (password === "") {
    errors.password = "empty";
  } else if (characterCount(password) > MAX_PASSWORD_LENGTH) {
    errors.password = "too-long";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      folderId: input.folderId,
      title,
      username: username === "" ? null : username,
      password,
    },
  };
}
