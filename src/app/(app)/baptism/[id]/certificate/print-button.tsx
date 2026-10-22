"use client";

import { PrinterIcon } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="action-solid inline-flex h-9 cursor-pointer items-center gap-2 rounded-md px-4 text-sm font-semibold"
    >
      <PrinterIcon className="size-4" aria-hidden />
      Print
    </button>
  );
}
