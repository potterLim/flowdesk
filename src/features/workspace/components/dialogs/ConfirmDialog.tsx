import { Database, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useDialogControls } from "../../hooks/useDialogControls";

export function ConfirmDialog({
  isOpen,
  title,
  detail,
  confirmLabel,
  variant = "danger",
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  title: string;
  detail: string;
  confirmLabel: string;
  variant?: "danger" | "warning";
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <ConfirmDialogContent
      title={title}
      detail={detail}
      confirmLabel={confirmLabel}
      variant={variant}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function ConfirmDialogContent({
  title,
  detail,
  confirmLabel,
  variant,
  onCancel,
  onConfirm,
}: {
  title: string;
  detail: string;
  confirmLabel: string;
  variant: "danger" | "warning";
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const isMountedRef = useRef(true);
  const generatedDialogId = useId();
  const dialogTitleId = `${generatedDialogId}-title`;
  const dialogDetailId = `${generatedDialogId}-detail`;
  const Icon = variant === "danger" ? Trash2 : Database;
  const iconClass = variant === "danger" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  const confirmClass =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-strong)]";
  const confirmingLabel = variant === "danger" ? "Deleting..." : "Working...";
  const handleCancel = useCallback(() => {
    if (!isConfirming) {
      onCancel();
    }
  }, [isConfirming, onCancel]);
  const dialogRef = useDialogControls<HTMLDivElement>(true, handleCancel);
  const handleConfirm = useCallback(() => {
    if (isConfirming) {
      return;
    }

    setIsConfirming(true);

    void Promise.resolve(onConfirm()).finally(() => {
      if (isMountedRef.current) {
        setIsConfirming(false);
      }
    });
  }, [isConfirming, onConfirm]);

  useEffect(() => {
    const focusFrame = window.requestAnimationFrame(() => cancelButtonRef.current?.focus());

    return () => window.cancelAnimationFrame(focusFrame);
  }, []);

  useEffect(
    () => () => {
      isMountedRef.current = false;
    },
    [],
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm"
      onMouseDown={handleCancel}
    >
      <div
        ref={dialogRef}
        role={variant === "danger" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDetailId}
        aria-busy={isConfirming}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-[460px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.24)]"
      >
        <div className="px-5 pt-5">
          <div className={clsx("flex h-10 w-10 items-center justify-center rounded-lg", iconClass)}>
            <Icon size={18} />
          </div>
          <h2 id={dialogTitleId} className="mt-4 text-[17px] font-semibold text-[var(--color-ink)]">
            {title}
          </h2>
          <p id={dialogDetailId} className="mt-2 text-[13px] leading-6 text-[var(--color-muted)]">
            {detail}
          </p>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-app-bg)] px-5 py-4">
          <button
            ref={cancelButtonRef}
            type="button"
            autoFocus
            onClick={handleCancel}
            disabled={isConfirming}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirming}
            className={clsx(
              "h-9 rounded-md px-3 text-[13px] font-semibold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-65",
              confirmClass,
            )}
          >
            {isConfirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
