const stamp = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Harare",
});

/** "Last updated by Apostle Edna Makamba on 21 October 2026." */
export function lastUpdatedLine(updatedBy: string | null, updatedAt: string | null) {
  if (!updatedAt) return null;
  const when = stamp.format(new Date(updatedAt));
  return updatedBy ? `Last updated by ${updatedBy} on ${when}.` : `Last updated on ${when}.`;
}
