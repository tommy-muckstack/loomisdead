"use client";
import { useEffect } from "react";
// On phones the compare table is long: keep the first feature group open, collapse the rest (tap a heading to open it).
export function PbCollapse() {
  useEffect(() => {
    if (!window.matchMedia("(max-width:900px)").matches) return;
    document.querySelectorAll<HTMLDetailsElement>(".pb-tbl details.pb-grp").forEach((d, i) => { if (i > 0) d.open = false; });
  }, []);
  return null;
}
