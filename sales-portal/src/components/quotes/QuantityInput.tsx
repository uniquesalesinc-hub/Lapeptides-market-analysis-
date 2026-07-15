"use client";

import { useEffect, useState } from "react";

/**
 * A quantity `<input type="number">` that doesn't fight the user while they're editing.
 * A plain controlled input bound straight to the numeric value snaps back to "1" the instant
 * the field is cleared (empty string -> Number("") -> 0 -> coerced to 1), so selecting "25"
 * and typing "5" to replace it produces "15" instead — the coercion re-renders "1" into the
 * field before the next keystroke lands. This keeps its own text buffer so the field can go
 * through an empty/intermediate state, and only commits (and clamps to >= 1) on blur or once
 * the typed text is itself a valid positive integer.
 */
export function QuantityInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (next: number) => void;
  className?: string;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit(raw: string) {
    const parsed = Math.max(1, Math.floor(Number(raw)) || 1);
    setText(String(parsed));
    if (parsed !== value) onChange(parsed);
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={1}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const parsed = Number(raw);
        if (raw !== "" && Number.isInteger(parsed) && parsed >= 1) onChange(parsed);
      }}
      onBlur={(e) => commit(e.target.value)}
      className={className ?? "input-field w-24 text-center"}
    />
  );
}
