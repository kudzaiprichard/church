import { church, visitFacts } from "@/lib/church";
import { cn } from "@/lib/utils";

import { Reveal } from "./reveal";

/** The four questions a first-time visitor would otherwise have to ask. */
export function VisitFacts() {
  return (
    <dl className="border-foreground/15 grid border-t sm:grid-cols-2">
      {visitFacts.map((fact, index) => (
        <div
          key={fact.heading}
          className={cn(
            "border-foreground/15 border-b px-0 py-7 sm:px-7",
            index % 2 === 0 ? "sm:border-r sm:pl-0" : "",
          )}
        >
          <Reveal delay={index * 70}>
            <dt className="flex items-baseline gap-3">
              <span className="numeric text-muted-foreground text-[0.65rem]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-heading text-lg">{fact.heading}</span>
            </dt>
            <dd className="text-muted-foreground mt-2 pl-8 text-sm leading-relaxed text-pretty">
              {fact.body}
            </dd>
          </Reveal>
        </div>
      ))}
    </dl>
  );
}

/** Where to find us, for the sticky column beside the facts. */
export function VisitContact() {
  return (
    <address className="border-foreground/15 border-t pt-5 font-mono text-xs leading-relaxed not-italic">
      <span className="text-muted-foreground block tracking-[0.15em] uppercase">Find us</span>
      <span className="mt-3 block">
        {church.address.line1}
        <br />
        {church.address.city}, {church.address.country}
      </span>
      <a href={`tel:${church.phone.replace(/\s/g, "")}`} className="mt-3 block underline-offset-4 hover:underline">
        {church.phone}
      </a>
      <a href={`mailto:${church.email}`} className="block underline-offset-4 hover:underline">
        {church.email}
      </a>
    </address>
  );
}
