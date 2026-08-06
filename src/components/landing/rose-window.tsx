"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import { useInView, usePrefersReducedMotion, useScrollProgress } from "./use-scroll";

import { ministries } from "@/lib/church";

const modules = ministries;

const C = 220; // centre
const LIGHT_INNER = 100;
const LIGHT_SHOULDER = 156;
const LIGHT_TIP = 196;
// Narrow lights with generous stone between them. Wider than about 10° and the
// head becomes shallow, which reads as a shield rather than a gothic arch.
const HALF_ANGLE = 9.5;

/**
 * The rose window as an architectural drawing rather than a coloured graphic:
 * stone ribs and cusped lights in ink, with a single light glazed at a time.
 * One pane of colour on a page of linework carries far more weight than twelve.
 */
export function RoseWindow() {
  const [active, setActive] = useState<number | null>(null);
  const [viewRef, inView] = useInView<HTMLDivElement>({ threshold: 0.2 });
  const [scrollRef, progress] = useScrollProgress<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();

  const lit = inView || reduced;
  const rotation = reduced ? 0 : (progress - 0.5) * 7;

  const shown = active === null ? null : modules[active];

  return (
    <div ref={scrollRef}>
      <div ref={viewRef} className="grid items-center gap-14 lg:grid-cols-[1fr_18rem] lg:gap-14">
        <div className="relative mx-auto w-full max-w-[30rem] lg:mx-0">
          <svg
            viewBox="0 0 440 440"
            className="h-auto w-full"
            role="img"
            aria-label="A rose window of twelve lights, one for each module"
            style={{
              transform: `rotate(${rotation.toFixed(2)}deg)`,
              transition: reduced ? undefined : "transform 120ms linear",
            }}
          >
            {/* Containing order: two hairlines and the outer moulding. */}
            <circle cx={C} cy={C} r="212" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="1" />
            <circle cx={C} cy={C} r="203" fill="none" stroke="currentColor" strokeOpacity="0.75" strokeWidth="2" />
            <circle cx={C} cy={C} r="197" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />

            {/* Spandrel oculi — the small circles set between the lights. */}
            {modules.map((module, index) => {
              const point = polar(index * 30 + 15, 187);
              return (
                <circle
                  key={`oculus-${module.name}`}
                  cx={point.x}
                  cy={point.y}
                  r="7.5"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.4"
                  strokeWidth="1.25"
                />
              );
            })}

            {modules.map((module, index) => {
              const angle = index * 30;
              const isActive = active === index;
              const numeralAt = polar(angle, 128);

              return (
                <g
                  key={module.name}
                  className={cn(
                    "transition-opacity duration-700 ease-out motion-reduce:transition-none",
                    lit ? "opacity-100" : "opacity-0",
                  )}
                  style={lit && !reduced ? { transitionDelay: `${index * 60}ms` } : undefined}
                >
                  <path
                    d={lightPath(angle)}
                    fill={isActive ? "var(--primary)" : "transparent"}
                    stroke="currentColor"
                    strokeOpacity={isActive ? 0 : 0.6}
                    strokeWidth="1.5"
                    tabIndex={0}
                    role="button"
                    aria-label={`${module.name}. ${module.detail}`}
                    aria-pressed={isActive}
                    className="cursor-pointer transition-[fill,stroke-opacity] duration-300 outline-none focus-visible:stroke-[var(--ring)] focus-visible:[stroke-opacity:1] focus-visible:[stroke-width:3]"
                    onMouseEnter={() => setActive(index)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(index)}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive(isActive ? null : index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActive(isActive ? null : index);
                      }
                    }}
                  />
                  {/* Cusping inside the head of each light. */}
                  <path
                    d={cuspPath(angle)}
                    fill="none"
                    stroke={isActive ? "var(--primary-foreground)" : "currentColor"}
                    strokeOpacity={isActive ? 0.5 : 0.3}
                    strokeWidth="1"
                    className="pointer-events-none"
                  />
                  <text
                    x={numeralAt.x}
                    y={numeralAt.y + 4}
                    textAnchor="middle"
                    className="numeric pointer-events-none select-none"
                    fill={isActive ? "var(--primary-foreground)" : "currentColor"}
                    fillOpacity={isActive ? 0.9 : 0.45}
                    fontSize="11"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </text>
                </g>
              );
            })}

            {/* The oculus. */}
            <circle cx={C} cy={C} r="92" fill="var(--background)" stroke="currentColor" strokeOpacity="0.75" strokeWidth="2" />
            <circle cx={C} cy={C} r="84" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
          </svg>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-[36%] text-center">
              <p key={shown?.name ?? "idle"} className="animate-oculus leading-snug text-balance">
                {shown ? (
                  <span className="font-heading text-sm">{shown.name}</span>
                ) : (
                  <span className="text-muted-foreground font-mono text-[0.6rem] tracking-[0.18em] uppercase">
                    Twelve
                    <br />
                    lights
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-28">
          <p className="text-muted-foreground min-h-20 text-sm leading-relaxed text-pretty">
            {shown ? shown.detail : "Every part of church life the system holds. Choose a light."}
          </p>
          <ol className="border-border mt-6 grid border-t sm:grid-cols-2 lg:grid-cols-1">
            {modules.map((module, index) => (
              <li key={module.name} className="border-border border-b">
                <button
                  type="button"
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(active === index ? null : index)}
                  className={cn(
                    "group flex w-full items-baseline gap-3 py-2 pr-2 text-left text-sm transition-[color,padding] duration-200",
                    "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                    active === index ? "text-foreground pl-2" : "text-muted-foreground",
                  )}
                >
                  <span className="numeric text-[0.62rem] opacity-55">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{module.name}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function polar(degrees: number, radius: number) {
  // 0° points up, matching how the lights are numbered from the top.
  const radians = ((degrees - 90) * Math.PI) / 180;
  return { x: C + radius * Math.cos(radians), y: C + radius * Math.sin(radians) };
}

/**
 * A pointed light: arc at the sill, straight jambs, and a head of two arcs
 * meeting at a point. Straight lines to the tip would give a pentagon — the
 * curve is what makes it read as a gothic arch rather than a shape.
 */
function lightPath(angle: number) {
  const sillLeft = polar(angle - HALF_ANGLE, LIGHT_INNER);
  const sillRight = polar(angle + HALF_ANGLE, LIGHT_INNER);
  const shoulderRight = polar(angle + HALF_ANGLE, LIGHT_SHOULDER);
  const shoulderLeft = polar(angle - HALF_ANGLE, LIGHT_SHOULDER);
  const tip = polar(angle, LIGHT_TIP);
  // Control points stay near the jamb line and well below the tip, so each
  // side rises almost vertically before closing on the point.
  const bulgeRight = polar(angle + HALF_ANGLE * 0.98, LIGHT_TIP - 14);
  const bulgeLeft = polar(angle - HALF_ANGLE * 0.98, LIGHT_TIP - 14);

  return [
    `M ${sillLeft.x.toFixed(2)} ${sillLeft.y.toFixed(2)}`,
    `A ${LIGHT_INNER} ${LIGHT_INNER} 0 0 1 ${sillRight.x.toFixed(2)} ${sillRight.y.toFixed(2)}`,
    `L ${shoulderRight.x.toFixed(2)} ${shoulderRight.y.toFixed(2)}`,
    `Q ${bulgeRight.x.toFixed(2)} ${bulgeRight.y.toFixed(2)} ${tip.x.toFixed(2)} ${tip.y.toFixed(2)}`,
    `Q ${bulgeLeft.x.toFixed(2)} ${bulgeLeft.y.toFixed(2)} ${shoulderLeft.x.toFixed(2)} ${shoulderLeft.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

/** The foil arc tucked under each light's head. */
function cuspPath(angle: number) {
  const left = polar(angle - HALF_ANGLE + 2.5, LIGHT_SHOULDER - 6);
  const right = polar(angle + HALF_ANGLE - 2.5, LIGHT_SHOULDER - 6);
  return `M ${left.x.toFixed(2)} ${left.y.toFixed(2)} A 22 22 0 0 0 ${right.x.toFixed(2)} ${right.y.toFixed(2)}`;
}
