"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Quantity field that tolerates being fully cleared while typing, so "20" can be selected or
 * backspaced away and retyped as "53" without the field snapping back to a number on every
 * keystroke. Complete numbers commit immediately (live cart repricing stays live); an empty or
 * partial value is held as a local draft and reverts to the last committed value on blur if
 * nothing valid was typed. External changes (steppers, tier-band clicks) sync in when the
 * field is not focused.
 */
export function QtyInput({
  value,
  min = 1,
  onCommit,
  className,
  ...rest
}: {
  value: number;
  min?: number;
  onCommit: (next: number) => void;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft}
      onFocus={(e) => {
        focused.current = true;
        e.target.select();
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        setDraft(raw);
        if (raw !== "") {
          const parsed = Number.parseInt(raw, 10);
          if (!Number.isNaN(parsed)) onCommit(Math.max(min, parsed));
        }
      }}
      onBlur={() => {
        focused.current = false;
        const parsed = Number.parseInt(draft, 10);
        if (draft === "" || Number.isNaN(parsed)) setDraft(String(value));
        else setDraft(String(Math.max(min, parsed)));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className={className}
      {...rest}
    />
  );
}
