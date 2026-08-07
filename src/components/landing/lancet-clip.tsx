/**
 * One arch profile, defined once and referenced by every shape that uses it —
 * the hero opening, the columns of the week, and the diptych panels. A single
 * curve repeated is what makes a building look designed rather than assembled.
 *
 * Rendered once near the root of the page; the id is referenced as
 * `clip-path: url(#lancet-clip)`.
 */
export function LancetClipDef() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <defs>
        <clipPath id="lancet-clip" clipPathUnits="objectBoundingBox">
          {/* Straight jambs to 42% of the height, then a pointed head. */}
          <path d="M0,1 L0,0.42 C0,0.19 0.16,0 0.5,0 C0.84,0 1,0.19 1,0.42 L1,1 Z" />
        </clipPath>
        {/* A shallower head, for shapes much taller than they are wide. */}
        <clipPath id="lancet-clip-tall" clipPathUnits="objectBoundingBox">
          <path d="M0,1 L0,0.14 C0,0.06 0.18,0 0.5,0 C0.82,0 1,0.06 1,0.14 L1,1 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}
