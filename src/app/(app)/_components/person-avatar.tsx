import { cn } from "@/lib/utils";

/**
 * A person's photo, or their initials when they have none. Decorative — the
 * name always sits beside it — so it is hidden from assistive technology.
 */
export function PersonAvatar({
  person,
  className,
  muted,
}: {
  person: { firstName: string; lastName: string; avatarUrl: string | null };
  className?: string;
  muted?: boolean;
}) {
  const box = cn("size-9 shrink-0 rounded-full", className);

  if (person.avatarUrl) {
    return (
      // A plain img: avatars are 512 px files from the storage bucket.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={person.avatarUrl} alt="" aria-hidden className={cn(box, "object-cover")} />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        box,
        "grid place-items-center text-xs font-bold",
        muted ? "bg-muted text-muted-foreground" : "bg-secondary text-primary",
      )}
    >
      {`${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase()}
    </span>
  );
}
