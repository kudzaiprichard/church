"use client";

import { useState } from "react";

import { sundayShape } from "@/lib/church";
import { cn } from "@/lib/utils";

import { useInView, usePrefersReducedMotion } from "./use-scroll";

/**
 * Ninety minutes, drawn.
 *
 * The section's headline makes a claim — "ninety minutes" — and this is the
 * claim answered: the whole of a Sunday morning as one ring, each part sized
 * by how long it actually takes. You can see at a glance that the sermon is
 * the longest thing in it and that nothing runs away with the morning, which
 * is the real question behind "how long is it".
 *
 * Each part is labelled the way a drawing labels a thing it cannot write
 * inside: a line out along the radius, an elbow, and the words sitting level
 * with it. Text laid straight onto the radius collided with the ring at the
 * top and with itself at the sides.
 *
 * Choosing a part writes its note underneath. The parts are focusable, because
 * those notes are the only place some of this is said.
 */

const CX = 320;
const CY = 190;
const R = 128;
const RING = 26;
const TOTAL = sundayShape.reduce((sum, part) => sum + part.minutes, 0);

/** Minutes → degrees, with twelve o'clock as the start of the service. */
const angleOf = (minutes: number) => -90 + (minutes / TOTAL) * 360;

function polar(degrees: number, radius: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: Number((CX + radius * Math.cos(radians)).toFixed(2)),
    y: Number((CY + radius * Math.sin(radians)).toFixed(2)),
  };
}

function arcPath(fromMinutes: number, toMinutes: number, gap = 2) {
  const from = angleOf(fromMinutes) + gap;
  const to = angleOf(toMinutes) - gap;
  const start = polar(from, R);
  const end = polar(to, R);
  const large = to - from > 180 ? 1 : 0;
  return `M${start.x},${start.y} A${R},${R} 0 ${large},1 ${end.x},${end.y}`;
}

const parts = sundayShape.map((part, index) => {
  const start = sundayShape.slice(0, index).reduce((sum, p) => sum + p.minutes, 0);
  const middle = angleOf(start + part.minutes / 2);

  // Out along the radius, then a short elbow away from the ring. The elbow
  // always points outward, so nothing ever runs back across the drawing.
  const from = polar(middle, R + RING / 2 + 2);
  const corner = polar(middle, R + 34);
  const direction = corner.x >= CX ? 1 : -1;
  const elbow = { x: Number((corner.x + direction * 14).toFixed(2)), y: corner.y };

  return {
    ...part,
    path: arcPath(start, start + part.minutes),
    leader: `M${from.x},${from.y} L${corner.x},${corner.y} L${elbow.x},${elbow.y}`,
    labelX: Number((elbow.x + direction * 6).toFixed(2)),
    labelY: elbow.y,
    anchor: direction === 1 ? ("start" as const) : ("end" as const),
  };
});

export function ServiceDial({ className }: { className?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const [ref, inView] = useInView<HTMLDivElement>({ threshold: 0.2 });
  const reduced = usePrefersReducedMotion();
  const lit = inView || reduced;

  const shown = active === null ? null : parts[active];

  return (
    <div ref={ref} className={cn("relative", className)}>
      <div className="relative">
        <svg viewBox="0 0 640 400" className="text-foreground h-auto w-full">
          <title>What happens in the ninety minutes of a Sunday service</title>

          {/* The full ninety, as a track for the parts to sit in. */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.08"
            strokeWidth={RING}
          />

          {/* A hand going round, slowly — the one thing here that never stops,
              and what tells you the ring is a clock before you have read it. */}
          {!reduced && (
            <g
              className="dial-sweep"
              style={{ transformBox: "view-box", transformOrigin: `${CX}px ${CY}px` }}
            >
              <line
                x1={CX}
                y1={CY - 30}
                x2={CX}
                y2={CY - R + RING / 2 + 4}
                stroke="var(--brass)"
                strokeOpacity="0.45"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx={CX} cy={CY - 30} r="2.5" fill="var(--brass)" fillOpacity="0.45" />
            </g>
          )}

          {parts.map((part, index) => {
            const isActive = active === index;
            return (
              <g key={part.name}>
                <path
                  d={part.path}
                  fill="none"
                  stroke="var(--primary)"
                  strokeOpacity={isActive ? 1 : 0.3}
                  strokeWidth={RING}
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={lit ? 0 : 1}
                  tabIndex={0}
                  role="button"
                  aria-label={`${part.name}, ${part.minutes} minutes. ${part.note}`}
                  aria-pressed={isActive}
                  className="cursor-pointer outline-none focus-visible:stroke-[var(--ring)] focus-visible:[stroke-opacity:1]"
                  style={{
                    transition: reduced
                      ? undefined
                      : `stroke-dashoffset 900ms ease-out ${200 + index * 160}ms, stroke-opacity 300ms`,
                  }}
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

                <g
                  className={cn(
                    "pointer-events-none transition-opacity duration-500",
                    lit ? "opacity-100" : "opacity-0",
                  )}
                  style={lit && !reduced ? { transitionDelay: `${520 + index * 160}ms` } : undefined}
                >
                  <path
                    d={part.leader}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={isActive ? 0.55 : 0.28}
                    strokeWidth="1"
                    className="transition-[stroke-opacity] duration-300"
                  />
                  <text
                    x={part.labelX}
                    y={part.labelY - 5}
                    textAnchor={part.anchor}
                    fill="currentColor"
                    fillOpacity={isActive ? 1 : 0.8}
                    fontSize="15"
                    className="font-heading transition-[fill-opacity] duration-300"
                  >
                    {part.name}
                  </text>
                  <text
                    x={part.labelX}
                    y={part.labelY + 14}
                    textAnchor={part.anchor}
                    fill="currentColor"
                    fillOpacity="0.5"
                    fontSize="13"
                    className="numeric"
                  >
                    {part.minutes} min
                  </text>
                </g>
              </g>
            );
          })}

          {/* Where the morning starts. */}
          <circle cx={CX} cy={CY - R} r="5" fill="var(--brass)" />
          <text
            x={CX}
            y={CY - R - 15}
            textAnchor="middle"
            fill="currentColor"
            fillOpacity="0.55"
            fontSize="13"
            className="numeric"
          >
            10:30
          </text>
        </svg>

        {/* The middle of the ring. Only ever two lines — a sentence in here
            would have to wrap inside a circle 200 units across. */}
        <div
          className="pointer-events-none absolute left-1/2 w-[24%] -translate-x-1/2 -translate-y-1/2 text-center"
          style={{ top: `${(CY / 400) * 100}%` }}
        >
          <p
            key={shown?.name ?? "idle"}
            className={cn(
              "numeric animate-oculus text-5xl leading-none",
              shown && "text-primary",
            )}
          >
            {shown ? shown.minutes : TOTAL}
          </p>
          <p className="text-muted-foreground mt-2 font-mono text-[0.6rem] tracking-[0.18em] uppercase">
            minutes
          </p>
        </div>
      </div>

      {/* The note goes under the drawing, where it has the width to be read. */}
      <p
        key={shown?.name ?? "idle-note"}
        className="animate-oculus text-muted-foreground mx-auto mt-2 flex min-h-[3.25rem] max-w-sm items-start justify-center text-center text-sm leading-relaxed text-pretty"
      >
        {shown ? (
          <span>
            <span className="text-foreground font-heading">{shown.name}.</span> {shown.note}
          </span>
        ) : (
          <span>Hover a part of the ring to see what happens in it.</span>
        )}
      </p>
    </div>
  );
}
