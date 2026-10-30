import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// How long a delete can be undone.
const UNDO_DURATION_MS = 5000;

type PendingUndo = {
  message: string; // e.g. "“Gmail” deleted"
  undo: () => void; // puts the deleted items back
};

type UndoValue = {
  // The last delete while it can still be undone, or null.
  pendingUndo: PendingUndo | null;
  // Call right after a delete. Replaces any older Undo.
  offerUndo: (message: string, undo: () => void) => void;
  runUndo: () => void;
  dismissUndo: () => void;
};

const UndoContext = createContext<UndoValue | null>(null);

// Keeps the last delete for a few seconds so it can be undone.
// Shared because a delete can happen on one screen (e.g. the password form)
// while the Undo bar is shown on another (the home screen).
export function UndoProvider({ children }: { children: ReactNode }) {
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);

  function offerUndo(message: string, undo: () => void) {
    setPendingUndo({ message, undo });
  }

  function runUndo() {
    if (pendingUndo === null) return;
    pendingUndo.undo();
    setPendingUndo(null);
  }

  // useCallback keeps this the same function on every render. The home screen uses it in a
  // focus effect; a new function each render would re-run that effect and end Undo too early.
  const dismissUndo = useCallback(() => setPendingUndo(null), []);

  // Ends the Undo chance after a few seconds. A new delete restarts the timer; the cleanup
  // function cancels the old timer so it cannot end the new Undo early.
  useEffect(() => {
    if (pendingUndo === null) return;
    const timer = setTimeout(() => setPendingUndo(null), UNDO_DURATION_MS);
    return () => clearTimeout(timer);
  }, [pendingUndo]);

  return (
    <UndoContext value={{ pendingUndo, offerUndo, runUndo, dismissUndo }}>{children}</UndoContext>
  );
}

export function useUndo(): UndoValue {
  const value = useContext(UndoContext);
  if (value === null) {
    throw new Error("useUndo must be used inside <UndoProvider>.");
  }
  return value;
}
