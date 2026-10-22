"use client";

import { useRouter } from "next/navigation";

import { PAGE_SIZES } from "@/lib/paging";

/**
 * "Show 10 per page". Choosing a size goes back to the first page, since the
 * current page number means something different at a different size.
 */
export function PageSizeSelect({
  size,
  hrefFor,
}: {
  size: number;
  /** One address per size, built on the server with every filter kept. */
  hrefFor: Record<number, string>;
}) {
  const router = useRouter();
  return (
    <label className="text-muted-foreground flex items-center gap-2 text-xs">
      Show
      <select
        value={size}
        onChange={(event) => router.push(hrefFor[Number(event.target.value)], { scroll: false })}
        className="border-input bg-background text-foreground focus-visible:ring-ring h-8 cursor-pointer rounded-md border px-2 text-xs focus-visible:ring-2 focus-visible:outline-none"
      >
        {PAGE_SIZES.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      per page
    </label>
  );
}
