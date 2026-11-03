import type { DecodedRecord } from '../lessons/types';

const encoder = new TextEncoder();

/** UTF-8 byte length of a string. */
export function recordBytes(text: string): number {
  return encoder.encode(text).length;
}

/** A run of `raw` text that belongs to one segment, and to one field when it is that field's span. */
export interface RecordRun {
  start: number;
  end: number;
  segment: string;
  /** Index into `record.fields` when this run is exactly that field's span. */
  field: number | null;
}

export interface RecordLayout {
  /** Field index → [start, end) in `raw`, or null for fields without a span. */
  fieldRanges: ([number, number] | null)[];
  /** `raw` cut into consecutive runs, each colored by its segment. */
  runs: RecordRun[];
  /** Size of each segment, in bytes of `raw`, in segment order. */
  segmentBytes: { id: string; label: string; bytes: number }[];
  /** Spans that could not be found in `raw`, in order (empty when the record is consistent). */
  missing: string[];
}

/**
 * Locates every field's span in `raw` (in order, each after the previous one) and assigns
 * every character to a segment: text between spans belongs to the segment of the span before it.
 */
export function layoutRecord(record: DecodedRecord): RecordLayout {
  const { raw, fields, segments } = record;
  const fieldRanges: ([number, number] | null)[] = [];
  const missing: string[] = [];
  let cursor = 0;
  for (const field of fields) {
    if (field.span === undefined) {
      fieldRanges.push(null);
      continue;
    }
    const at = raw.indexOf(field.span, cursor);
    if (at < 0 || field.span.length === 0) {
      missing.push(field.span);
      fieldRanges.push(null);
      continue;
    }
    fieldRanges.push([at, at + field.span.length]);
    cursor = at + field.span.length;
  }

  const spans = fieldRanges
    .map((range, i) => (range ? { range, i, segment: fields[i]?.segment ?? '' } : null))
    .filter((s): s is { range: [number, number]; i: number; segment: string } => s !== null);

  const runs: RecordRun[] = [];
  let pos = 0;
  let segment = spans[0]?.segment ?? segments[0]?.id ?? '';
  for (const span of spans) {
    if (span.range[0] > pos) runs.push({ start: pos, end: span.range[0], segment, field: null });
    runs.push({ start: span.range[0], end: span.range[1], segment: span.segment, field: span.i });
    segment = span.segment;
    pos = span.range[1];
  }
  if (pos < raw.length) runs.push({ start: pos, end: raw.length, segment, field: null });

  const segmentBytes = segments.map((s) => ({
    id: s.id,
    label: s.label,
    bytes: runs.filter((r) => r.segment === s.id).reduce((n, r) => n + recordBytes(raw.slice(r.start, r.end)), 0),
  }));
  return { fieldRanges, runs, segmentBytes, missing };
}
