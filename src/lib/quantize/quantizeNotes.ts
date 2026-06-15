import type { NoteEvent } from "../../types/NoteEvent";

export interface QuantizeNotesOptions {
  tempo: number;
  gridDivision: number;
  strength: number;
  minDurationBeats: number;
  beatTimes?: number[];
}

const moveToward = (value: number, target: number, strength: number): number =>
  value + (target - value) * strength;

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
};

function buildTrackedGrid(beatTimes: number[], subdivisions: number, maxTime: number): {
  points: number[];
  secondsPerBeat: number;
} | null {
  const beats = [...new Set(beatTimes.filter((beat) => Number.isFinite(beat) && beat >= 0))].sort(
    (a, b) => a - b
  );
  if (beats.length < 2) {
    return null;
  }

  const intervals = beats
    .slice(1)
    .map((beat, index) => beat - beats[index])
    .filter((gap) => gap > 0.05);
  if (intervals.length === 0) {
    return null;
  }
  const secondsPerBeat = median(intervals);
  while (beats[0] > 0) {
    beats.unshift(Math.max(0, beats[0] - secondsPerBeat));
    if (beats[0] === 0) {
      break;
    }
  }
  while (beats[beats.length - 1] < maxTime + secondsPerBeat) {
    beats.push(beats[beats.length - 1] + secondsPerBeat);
  }

  const points: number[] = [];
  for (let index = 0; index < beats.length - 1; index += 1) {
    const start = beats[index];
    const duration = beats[index + 1] - start;
    for (let division = 0; division < subdivisions; division += 1) {
      points.push(start + (duration * division) / subdivisions);
    }
  }
  points.push(beats[beats.length - 1]);
  return { points, secondsPerBeat };
}

const nearestPoint = (value: number, points: number[]): number => {
  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (points[middle] < value) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }
  const after = points[low];
  const before = points[Math.max(0, low - 1)];
  return Math.abs(value - before) <= Math.abs(after - value) ? before : after;
};

export function quantizeNotes(notes: NoteEvent[], options: QuantizeNotesOptions): NoteEvent[] {
  const tempo = Math.max(20, options.tempo);
  const gridDivision = Math.max(1, options.gridDivision);
  const strength = Math.min(1, Math.max(0, options.strength));
  const secondsPerBeat = 60 / tempo;
  const gridSeconds = secondsPerBeat * (4 / gridDivision);
  const maxTime = Math.max(0, ...notes.map((note) => note.end));
  const trackedGrid = buildTrackedGrid(
    options.beatTimes ?? [],
    Math.max(1, gridDivision / 4),
    maxTime
  );
  const effectiveSecondsPerBeat = trackedGrid?.secondsPerBeat ?? secondsPerBeat;
  const minDurationSeconds = effectiveSecondsPerBeat * Math.max(0.01, options.minDurationBeats);

  return notes
    .map((note) => {
      const quantizedStart = trackedGrid
        ? nearestPoint(note.start, trackedGrid.points)
        : Math.round(note.start / gridSeconds) * gridSeconds;
      const quantizedEnd = trackedGrid
        ? nearestPoint(note.end, trackedGrid.points)
        : Math.round(note.end / gridSeconds) * gridSeconds;
      const start = moveToward(note.start, quantizedStart, strength);
      const proposedEnd = moveToward(note.end, quantizedEnd, strength);
      const end = Math.max(start + minDurationSeconds, proposedEnd);

      return {
        ...note,
        start: Number(start.toFixed(6)),
        end: Number(end.toFixed(6))
      };
    })
    .sort((a, b) => a.start - b.start || a.pitch - b.pitch);
}
