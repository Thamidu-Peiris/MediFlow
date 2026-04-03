import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/** Read-only modal (portal) — same overlay behavior as ConfirmDialog */
export default function InfoDialog({ open, title, children, onClose, closeLabel = "Close" }) {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onCloseRef.current?.();
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

    const overlay = (
        <div
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-dialog-title"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="info-dialog-title" className="font-headline text-lg font-bold text-slate-900">
                    {title}
                </h2>
                <div className="mt-3 max-h-[min(60vh,320px)] overflow-y-auto text-sm leading-relaxed text-slate-600">
                    {children}
                </div>
                <div className="mt-6 flex justify-end">
                    <button
                        type="button"
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50"
                        onClick={onClose}
                    >
                        {closeLabel}
                    </button>
                </div>
            </div>
        </div>
    );

    if (typeof document === "undefined" || !document.body) return null;

    return createPortal(overlay, document.body);
}
