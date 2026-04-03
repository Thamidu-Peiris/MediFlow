import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * In-app confirmation modal (replaces window.confirm) — matches doctor shell slate styling.
 */
export default function ConfirmDialog({
    open,
    title = "Please confirm",
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "primary",
    onConfirm,
    onCancel,
}) {
    const onCancelRef = useRef(onCancel);
    onCancelRef.current = onCancel;

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onCancelRef.current?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    useEffect(() => {
        if (!open || typeof document === "undefined") return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    if (!open) return null;

    const confirmBtnClass =
        variant === "danger"
            ? "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/50"
            : "bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-500/50";

    const overlay = (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            onClick={onCancel}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirm-dialog-title" className="font-headline text-lg font-bold text-slate-900">
                    {title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{message}</p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/80"
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 ${confirmBtnClass}`}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === "undefined" || !document.body) return null;

    return createPortal(overlay, document.body);
}
