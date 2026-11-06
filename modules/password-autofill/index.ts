import { requireOptionalNativeModule } from "expo";

// What a login is for. `key` is what links store, `label` is shown to the user.
export type AutofillTarget = {
  key: string;
  label: string;
};

export type AutofillLogin = {
  username: string | null;
  password: string;
};

// `login` is only there when the user asked to save what they typed.
export type AutofillRequest = {
  target: AutofillTarget | null;
  login: AutofillLogin | null;
};

type PasswordAutofillModule = {
  isOpen(): boolean;
  getRequest(): AutofillRequest | null;
  setOfferTitles(titles: Record<string, string>): void;
  getWebsiteTarget(text: string): AutofillTarget | null;
  getInstalledApps(): Promise<AutofillTarget[]>;
  setHiddenInRecents(hidden: boolean): void;
  finishFill(username: string | null, password: string): void;
  cancelFill(): void;
  isProvider(): boolean;
  openProviderSettings(): boolean;
};

// Missing on iOS, on the web and in tests, where autofill does not exist.
const native = requireOptionalNativeModule<PasswordAutofillModule>("PasswordAutofill");

export function isAutofillOpen(): boolean {
  return native?.isOpen() ?? false;
}

export function getAutofillRequest(): AutofillRequest | null {
  return native?.getRequest() ?? null;
}

export function setAutofillOfferTitles(titles: Record<string, string>) {
  native?.setOfferTitles(titles);
}

// Null when the text is not a website address.
export function getWebsiteTarget(text: string): AutofillTarget | null {
  return native?.getWebsiteTarget(text) ?? null;
}

export async function getInstalledApps(): Promise<AutofillTarget[]> {
  return (await native?.getInstalledApps()) ?? [];
}

export function setHiddenInRecents(hidden: boolean) {
  native?.setHiddenInRecents(hidden);
}

export function finishAutofill(username: string | null, password: string) {
  native?.finishFill(username, password);
}

// Closes the window. Used after saving too, because nothing needs to go back to the other app.
export function cancelAutofill() {
  native?.cancelFill();
}

export function isAutofillProvider(): boolean {
  return native?.isProvider() ?? false;
}

export function openAutofillProviderSettings(): boolean {
  return native?.openProviderSettings() ?? false;
}
