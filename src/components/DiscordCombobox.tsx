"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AtSign, Check, ChevronDown, Hash, Search, X } from "lucide-react";

export interface ComboboxOption {
  id: string;
  label: string;
  sublabel?: string | null;
  colorHex?: string | null;
}

interface BaseProps {
  label: string;
  description?: string;
  kind: "role" | "channel";
  options: ComboboxOption[];
  placeholder?: string;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: string[];
  onChange: (next: string[]) => void;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string | null;
  onChange: (next: string | null) => void;
}

export function DiscordCombobox(props: MultiProps | SingleProps) {
  const { label, description, kind, options, placeholder } = props;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(() => {
    if (props.multiple) return props.value || [];
    return props.value ? [props.value] : [];
  }, [props]);

  const optionMap = useMemo(
    () => new Map(options.map((opt) => [opt.id, opt])),
    [options]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.id.includes(q) ||
        (opt.sublabel || "").toLowerCase().includes(q)
    );
  }, [options, search]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function toggleId(id: string) {
    if (props.multiple) {
      const current = props.value || [];
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      props.onChange(next);
    } else {
      props.onChange(props.value === id ? null : id);
      setOpen(false);
    }
  }

  function removeId(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (props.multiple) {
      props.onChange((props.value || []).filter((x) => x !== id));
    } else {
      props.onChange(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="mb-1.5">
        <label className="block text-xs font-semibold text-slate-200">
          {label}
        </label>
        {description && (
          <p className="mt-0.5 text-[11px] text-slate-400">{description}</p>
        )}
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className={`flex min-h-[42px] w-full cursor-pointer flex-wrap items-center justify-between gap-1.5 rounded-xl border px-3 py-1.5 text-xs transition ${
          open
            ? "border-indigo-500 bg-slate-950 ring-2 ring-indigo-500/20"
            : "border-slate-800 bg-slate-950 hover:border-slate-700"
        }`}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {selectedIds.length === 0 ? (
            <span className="text-slate-500">
              {placeholder ||
                (kind === "role" ? "Select role(s)..." : "Select a channel...")}
            </span>
          ) : (
            selectedIds.map((id) => {
              const opt = optionMap.get(id);
              const badgeColor = opt?.colorHex || null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900 px-2 py-0.5 text-xs text-slate-100"
                >
                  {kind === "role" ? (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: badgeColor || "#94a3b8" }}
                    />
                  ) : (
                    <Hash className="h-3 w-3 shrink-0 text-slate-400" />
                  )}
                  <span className="max-w-[180px] truncate">
                    {opt ? opt.label : `Deleted (${id})`}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => removeId(id, e)}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-rose-300"
                    aria-label="Remove selection"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })
          )}
        </div>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-700 bg-[#0e1320] shadow-2xl">
          <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                kind === "role"
                  ? "Search roles by name or ID..."
                  : "Search channels by name or category..."
              }
              className="w-full bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-500">
                No matching {kind}s found in support server.
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = selectedIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleId(opt.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                      isSelected
                        ? "bg-indigo-600/20 text-white"
                        : "text-slate-300 hover:bg-slate-800/80"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      {kind === "role" ? (
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                          style={{
                            backgroundColor: opt.colorHex
                              ? `${opt.colorHex}33`
                              : "rgba(148,163,184,0.2)",
                          }}
                        >
                          <AtSign
                            className="h-2.5 w-2.5"
                            style={{ color: opt.colorHex || "#94a3b8" }}
                          />
                        </span>
                      ) : (
                        <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium">{opt.label}</div>
                        {opt.sublabel && (
                          <div className="truncate text-[10px] text-slate-500">
                            {opt.sublabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden font-mono text-[10px] text-slate-500 sm:inline">
                        {opt.id}
                      </span>
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-600 text-white"
                            : "border-slate-700"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
