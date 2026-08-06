import Link from "next/link";

import { Button } from "@/components/ui/button";
import { church, services } from "@/lib/church";

import { ArchedImage } from "./arched-image";
import { Reveal } from "./reveal";
import stainedGlass from "../../../public/images/stained-glass-lancets.jpg";

const sunday = services.filter((service) => service.day === "Sunday");

export function Hero() {
  return (
    <section id="welcome" className="relative">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] md:grid-cols-[7rem_minmax(0,1fr)]">
          <div className="border-border relative border-r">
            <span className="numeric text-accent-foreground bg-background absolute top-24 -right-[0.6rem] py-2 text-[0.7rem] tracking-[0.15em]">
              I
            </span>
          </div>

          <div className="grid items-center gap-14 pt-20 pb-24 pl-6 sm:pt-24 md:grid-cols-[1.1fr_0.9fr] md:pl-12">
            <div>
              <Reveal>
                <p className="text-muted-foreground font-mono text-xs tracking-[0.2em] uppercase">
                  {church.address.city} · Since {church.founded}
                </p>
              </Reveal>

              <Reveal delay={80}>
                <h1 className="mt-6 text-4xl leading-[1.05] text-balance sm:text-6xl">
                  You are welcome at {church.shortName}.
                </h1>
              </Reveal>

              <Reveal delay={160}>
                <p className="text-muted-foreground mt-7 max-w-md text-lg text-pretty">
                  {church.tagline} Come as you are, sit at the back if you like, and leave knowing
                  someone&apos;s name.
                </p>
              </Reveal>

              <Reveal delay={230}>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href="#visit">Plan your visit</Link>
                  </Button>
                  <Button asChild variant="ghost" size="lg">
                    <Link href="#sermons">Last Sunday&apos;s sermon</Link>
                  </Button>
                </div>
              </Reveal>

              {/* The two facts a first-time visitor actually needs. */}
              <Reveal delay={300}>
                <dl className="border-border mt-12 grid max-w-md grid-cols-2 gap-px overflow-hidden border">
                  {sunday.map((service) => (
                    <div key={service.time} className="bg-card p-4">
                      <dt className="text-muted-foreground font-mono text-[0.65rem] tracking-[0.15em] uppercase">
                        {service.name}
                      </dt>
                      <dd className="numeric mt-1 text-2xl">{service.time}</dd>
                      <dd className="text-muted-foreground mt-1 text-xs text-pretty">
                        {service.note}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-muted-foreground mt-3 max-w-md font-mono text-xs">
                  {church.address.line1}, {church.address.city}
                </p>
              </Reveal>
            </div>

            <Reveal delay={140} from="right">
              <ArchedImage
                src={stainedGlass}
                alt="Stained glass lancet windows in the chapel, lit from behind"
                className="mx-auto max-w-[20rem]"
                priority
              />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
