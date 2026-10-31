// The autofill window writes to the database through its own connection, so the main window's
// copy of the vault goes out of date. Both windows share this JavaScript, so a plain listener
// is enough to tell it.
let listener: (() => void) | null = null;

export function listenForVaultChange(onChange: () => void) {
  listener = onChange;
  return () => {
    if (listener === onChange) listener = null;
  };
}

export function announceVaultChange() {
  listener?.();
}
