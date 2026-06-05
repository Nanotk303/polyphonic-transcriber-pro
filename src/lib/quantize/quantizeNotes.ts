import type { NoteEvent } from "../../types/NoteEvent";

export interface QuantizeNotesOptions {
  tempo: number;
  gridDivision: number;
  strength: number;
  minDurationBeats: number;
}

const moveToward = (value: number, target: number, strength: number): number =>
  value + (target - value) * strength;

export function quantizeNotes(notes: NoteEvent[], options: QuantizeNotesOptions): NoteEvent[] {
  const tempo = Math.max(20, options.tempo);
  const gridDivision = Math.max(1, options.gridDivision);
  const strength = Math.min(1, Math.max(0, options.strength));
  const secondsPerBeat = 60 / tempo;
  const gridSeconds = secondsPerBeat * (4 / gridDivision);
  const minDurationSeconds = secondsPerBeat * Math.max(0.01, options.minDurationBeats);

  return notes
    .map((note) => {
      const quantizedStart = Math.round(note.start / gridSeconds) * gridSeconds;
      const quantizedEnd = Math.round(note.end / gridSeconds) * gridSeconds;
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
