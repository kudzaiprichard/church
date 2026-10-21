import { cn } from "@/lib/utils";

/**
 * A keyboard shortcut, set as keycaps.
 *
 * Hidden below `sm` by default — a shortcut hint is noise on a device with no
 * keyboard to press it on. `always` overrides that for the shortcuts list in
 * the panel footer, which is only ever rendered on a desktop anyway.
 */
export function KbdHint({ keys, always = false }: { keys: string[]; always?: boolean }) {
  return (
    <span
      className={cn(
        "text-muted-foreground items-center gap-0.5",
        always ? "inline-flex" : "hidden sm:inline-flex",
      )}
    >
      {keys.map((key) => (
        <kbd
          key={key}
          className="border-border bg-card text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-md border px-1 font-sans text-[0.65rem] font-medium"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}
