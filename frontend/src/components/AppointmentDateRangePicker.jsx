import { useEffect, useMemo, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import "react-day-picker/style.css";

function parseYmd(s) {
  if (!s || typeof s !== "string") return undefined;
  const d = new Date(`${s.slice(0, 10)}T12:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function dateToYmd(d) {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Modern calendar popover for inclusive YYYY-MM-DD range.
 */
export default function AppointmentDateRangePicker({ fromYmd, toYmd, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = useMemo(() => {
    const from = parseYmd(fromYmd);
    if (!from) return undefined;
    const to = toYmd ? parseYmd(toYmd) : undefined;
    if (toYmd && to) return { from, to };
    return { from, to: undefined };
  }, [fromYmd, toYmd]);

  const label = useMemo(() => {
    const f = parseYmd(fromYmd);
    const t = parseYmd(toYmd);
    if (!f) return "Select date range";
    if (!toYmd || fromYmd === toYmd) return format(f, "MMM d, yyyy");
    if (!t) return `${format(f, "MMM d, yyyy")} → …`;
    return `${format(f, "MMM d, yyyy")} – ${format(t, "MMM d, yyyy")}`;
  }, [fromYmd, toYmd]);

  const handleSelect = (range) => {
    if (!range?.from) {
      onChange({ from: "", to: "" });
      return;
    }
    if (range.to) {
      onChange({ from: dateToYmd(range.from), to: dateToYmd(range.to) });
      setOpen(false);
      return;
    }
    onChange({ from: dateToYmd(range.from), to: "" });
  };

  const handleClear = () => {
    onChange({ from: "", to: "" });
  };

  return (
    <div className="relative" ref={wrapRef}>
      <label className="mb-1 block text-xs font-medium text-slate-500">Appointment date range</label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex w-full min-h-[46px] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm shadow-sm transition-all hover:border-slate-300 hover:bg-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400/25"
      >
        <span className="material-symbols-outlined shrink-0 text-slate-400 text-[22px]">calendar_month</span>
        <span className="min-w-0 flex-1 truncate font-medium text-slate-800">{label}</span>
        <span className="material-symbols-outlined shrink-0 text-slate-400 text-xl transition-transform" style={{ transform: open ? "rotate(180deg)" : "none" }}>
          expand_more
        </span>
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-1.5 w-fit max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-200/90 bg-white p-2 shadow-lg shadow-slate-900/10 md:left-auto md:right-0"
          role="dialog"
          aria-label="Choose appointment date range"
        >
          <div
            className="appointment-drp-root text-[13px] leading-tight"
            style={{
              "--rdp-accent-color": "#334155",
              "--rdp-accent-background-color": "#e2e8f0",
              "--rdp-day-height": "28px",
              "--rdp-day-width": "28px",
              "--rdp-day_button-height": "26px",
              "--rdp-day_button-width": "26px",
              "--rdp-day_button-border-radius": "6px",
              "--rdp-nav-height": "2rem",
              "--rdp-nav_button-height": "1.5rem",
              "--rdp-nav_button-width": "1.5rem",
              "--rdp-months-gap": "0.75rem",
              "--rdp-weekday-padding": "0.25rem 0",
            }}
          >
            <DayPicker
              mode="range"
              selected={selected}
              onSelect={handleSelect}
              numberOfMonths={1}
              defaultMonth={selected?.from}
              showOutsideDays
              className="!p-0"
            />
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md bg-slate-800 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-900"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
