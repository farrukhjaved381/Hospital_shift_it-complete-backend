export interface EventLike {
  start: Date;
  end: Date;
}

export function detectConflicts<T extends EventLike>(events: T[], start: Date, end: Date): T[] {
  return events.filter((ev) => overlaps(start, end, ev.start, ev.end));
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  // Overlap if intervals intersect: (aStart < bEnd) && (aEnd > bStart)
  return aStart < bEnd && aEnd > bStart;
}

