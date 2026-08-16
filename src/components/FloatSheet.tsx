import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export function useLightDismiss(
  sheetRef: RefObject<HTMLElement | null>,
  active: boolean,
  onDismiss: () => void,
  extraRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return;
    function onPointer(event: PointerEvent) {
      const node = event.target as Node;
      if (sheetRef.current?.contains(node)) return;
      if (extraRef?.current?.contains(node)) return;
      onDismiss();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [active, extraRef, onDismiss, sheetRef]);
}

export function FloatSheet({
  anchorRef,
  align = "start",
  className,
  children,
  onDismiss,
  testId,
  labelledBy,
  label,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  align?: "start" | "end";
  className?: string;
  children: ReactNode;
  onDismiss: () => void;
  testId?: string;
  labelledBy?: string;
  label?: string;
}) {
  const sheetRef = useRef<HTMLDialogElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const sheet = sheetRef.current;
    if (!anchor || !sheet) return;
    const rect = anchor.getBoundingClientRect();
    const width = sheet.offsetWidth;
    const left =
      align === "end"
        ? Math.min(rect.right - width, window.innerWidth - width - 12)
        : rect.left;
    setPos({
      top: rect.bottom + 6,
      left: Math.max(12, left),
    });
  }, [align, anchorRef]);

  useLightDismiss(sheetRef, true, onDismiss, anchorRef);

  return createPortal(
    <dialog
      ref={sheetRef}
      open
      className={className}
      data-testid={testId}
      aria-labelledby={labelledBy}
      aria-label={label}
      style={{ top: pos.top, left: pos.left }}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
    >
      {children}
    </dialog>,
    document.body,
  );
}
