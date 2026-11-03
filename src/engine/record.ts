import type { DecodedRecord } from '../lessons/types';

const encoder = new TextEncoder();

/** UTF-8 byte length of a string. */
export function textBytes(text: string): number {
  return encoder.encode(text).length;
}

/** The bytes of a binary record's `hex`, as two-digit strings. Returns null if `hex` is malformed. */
export function parseHex(hex: string): string[] | null {
  const parts = hex.trim().split(/\s+/).filter(Boolean);
  return parts.every((p) => /^[0-9A-Fa-f]{2}$/.test(p)) ? parts.map((p) => p.toUpperCase()) : null;
}

/** Exact size in bytes of a wire record, or null for a field table. */
export function recordBytes(record: DecodedRecord): number | null {
  if (record.format === 'text') return textBytes(record.raw);
  if (record.format === 'binary') return parseHex(record.hex)?.length ?? 0;
  return null;
}

/**
 * A run of the raw message (characters for text, bytes for binary) that belongs to one segment,
 * and to one field when it is exactly that field's bytes.
 */
export interface RecordRun {
  start: number;
  end: number;
  segment: string;
  /** Index into `record.fields` when this run is exactly that field. */
  field: number | null;
}

export interface RecordLayout {
  /** Field index → [start, end) in characters (text) or bytes (binary); null when not located. */
  fieldRanges: ([number, number] | null)[];
  /** The raw message cut into consecutive runs, each colored by its segment. Empty for field tables. */
  runs: RecordRun[];
  /** Weight of each segment for the layer bar: bytes for wire records, field count for field tables. */
  segmentWeights: { id: string; label: string; weight: number }[];
  /** Binary records: the bytes as two-digit hex strings. */
  bytes: string[];
  /** Problems found while locating fields (empty when the record is consistent). */
  problems: string[];
}

/**
 * Locates every field in the raw message and assigns every character or byte to a segment:
 * the parts between fields belong to the segment of the field before them.
 */
export function layoutRecord(record: DecodedRecord): RecordLayout {
  if (record.format === 'fields') {
    return {
      fieldRanges: record.fields.map(() => null),
      runs: [],
      segmentWeights: record.segments.map((s) => ({ id: s.id, label: s.label, weight: record.fields.filter((f) => f.segment === s.id).length })),
      bytes: [],
      problems: [],
    };
  }

  const problems: string[] = [];
  const fieldRanges: ([number, number] | null)[] = [];
  let length: number;
  let bytes: string[] = [];

  if (record.format === 'text') {
    length = record.raw.length;
    let cursor = 0;
    for (const field of record.fields) {
      if (field.span === undefined) {
        fieldRanges.push(null);
        continue;
      }
      const at = field.span.length > 0 ? record.raw.indexOf(field.span, cursor) : -1;
      if (at < 0) {
        problems.push(`span "${field.span}" is not in raw (spans must appear in field order)`);
        fieldRanges.push(null);
        continue;
      }
      fieldRanges.push([at, at + field.span.length]);
      cursor = at + field.span.length;
    }
  } else {
    const parsed = parseHex(record.hex);
    if (!parsed) problems.push('hex must be two-digit hex bytes separated by spaces');
    bytes = parsed ?? [];
    length = bytes.length;
    let end = 0;
    for (const field of record.fields) {
      if (field.offset === undefined || field.length === undefined) {
        fieldRanges.push(null);
        continue;
      }
      const range: [number, number] = [field.offset, field.offset + field.length];
      if (!Number.isInteger(field.offset) || !Number.isInteger(field.length) || field.length <= 0 || range[1] > length) {
        problems.push(`field "${field.name}" bytes ${range[0]}–${range[1]} are outside the ${length}-byte hex`);
        fieldRanges.push(null);
        continue;
      }
      if (range[0] < end) problems.push(`field "${field.name}" overlaps the field before it (fields must be in byte order)`);
      fieldRanges.push(range);
      end = Math.max(end, range[1]);
    }
  }

  const located = fieldRanges
    .map((range, i) => (range ? { range, i, segment: record.fields[i]?.segment ?? '' } : null))
    .filter((s): s is { range: [number, number]; i: number; segment: string } => s !== null)
    .sort((a, b) => a.range[0] - b.range[0]);

  const runs: RecordRun[] = [];
  let pos = 0;
  let segment = located[0]?.segment ?? record.segments[0]?.id ?? '';
  for (const span of located) {
    if (span.range[0] < pos) continue;
    if (span.range[0] > pos) runs.push({ start: pos, end: span.range[0], segment, field: null });
    runs.push({ start: span.range[0], end: span.range[1], segment: span.segment, field: span.i });
    segment = span.segment;
    pos = span.range[1];
  }
  if (pos < length) runs.push({ start: pos, end: length, segment, field: null });

  const weightOf = (run: RecordRun): number =>
    record.format === 'text' ? textBytes(record.raw.slice(run.start, run.end)) : run.end - run.start;
  const segmentWeights = record.segments.map((s) => ({
    id: s.id,
    label: s.label,
    weight: runs.filter((r) => r.segment === s.id).reduce((n, r) => n + weightOf(r), 0),
  }));
  return { fieldRanges, runs, segmentWeights, bytes, problems };
}
