"use client";

import { useEffect, useState } from "react";
import { buttonClasses } from "@/lib/ui";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  defaultReason?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

// Shared replacement for window.confirm()/window.prompt() — those are
// unstyled OS dialogs that break from the app's own component library on
// every other screen. requireReason turns this into the prompt() case
// (admin moderation reasons); otherwise it's a plain yes/no confirm().
export default function ConfirmDialog({
  open,
  title,
  message,
  requireReason = false,
  reasonPlaceholder = "Reason",
  defaultReason = "",
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState(defaultReason);

  // The component stays mounted while closed (it just renders null), so
  // pre-fill the reason field fresh each time it opens rather than once at mount —
  // matches prompt()'s behavior of offering a default value on every call.
  useEffect(() => {
    if (open) setReason(defaultReason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function confirm() {
    if (requireReason && !reason.trim()) return;
    onConfirm(requireReason ? reason.trim() : undefined);
    setReason("");
  }

  function cancel() {
    setReason("");
    onCancel();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-card bg-white p-5 shadow-card">
        <p className="font-display text-base font-bold text-ink">{title}</p>
        {message && <p className="mt-1 text-sm text-ink-secondary">{message}</p>}
        {requireReason && (
          <textarea
            className="mt-3 w-full rounded-control border border-neutral-200 px-3 py-2 text-sm"
            rows={3}
            placeholder={reasonPlaceholder}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        )}
        <div className="mt-4 flex gap-2">
          <button
            className={buttonClasses(destructive ? "destructive" : "primary", "flex-1")}
            disabled={requireReason && !reason.trim()}
            onClick={confirm}
          >
            {confirmLabel}
          </button>
          <button className={buttonClasses("secondary", "flex-1")} onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
