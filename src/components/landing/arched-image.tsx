import Image, { type StaticImageData } from "next/image";

import { cn } from "@/lib/utils";

type ArchedImageProps = {
  src: StaticImageData | string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

/**
 * A photograph set into a lancet opening. The arch is a real clip path rather
 * than a large border-radius — a dome reads as a bubble, a lancet reads as
 * architecture, and the difference is the whole point.
 */
export function ArchedImage({ src, alt, className, priority, sizes }: ArchedImageProps) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="border-foreground/25 relative aspect-[3/4.4] overflow-hidden border"
        style={{ clipPath: "url(#lancet-clip)" }}
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes ?? "(min-width: 640px) 22rem, 80vw"}
          className="object-cover"
        />
      </div>

      {/* The sill the opening sits on — weighty enough to carry the window
          rather than reading as a stray rule beneath it. */}
      <div className="bg-foreground/[0.09] border-foreground/25 mx-[-7%] h-4 border-x border-b" />
      <div className="bg-foreground/[0.05] mx-[-3%] h-2.5" />
    </div>
  );
}
