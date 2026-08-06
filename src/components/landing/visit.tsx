import { church, services, visitFacts } from "@/lib/church";

import { Reveal } from "./reveal";

export function Visit() {
  return (
    <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
      {/* content-start, or the rows stretch to match the taller timetable
          column and open a gulf between the two rows of facts. */}
      <dl className="grid content-start gap-x-10 gap-y-10 sm:grid-cols-2">
        {visitFacts.map((fact, index) => (
          <Reveal key={fact.heading} delay={index * 70}>
            <dt className="font-heading text-lg">{fact.heading}</dt>
            <dd className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
              {fact.body}
            </dd>
          </Reveal>
        ))}
      </dl>

      {/* The full week's gatherings, as a plain timetable. */}
      <Reveal delay={140}>
        <div className="border-border bg-card border p-6">
          <p className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.2em] uppercase">
            Every week
          </p>
          <ul className="mt-5 space-y-4">
            {services.map((service) => (
              <li key={service.name} className="border-border flex gap-4 border-b pb-4 last:border-0 last:pb-0">
                <span className="numeric shrink-0 text-sm">{service.time}</span>
                <span className="min-w-0">
                  <span className="block text-sm">{service.name}</span>
                  <span className="text-muted-foreground block text-xs">{service.day}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-6 border-t border-dashed pt-4 font-mono text-xs leading-relaxed">
            {church.address.line1}
            <br />
            {church.address.city}, {church.address.country}
            <br />
            {church.phone}
          </p>
        </div>
      </Reveal>
    </div>
  );
}
