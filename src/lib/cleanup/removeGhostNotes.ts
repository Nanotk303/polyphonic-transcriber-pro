import type { NoteEvent } from "../../types/NoteEvent";

export interface RemoveGhostNotesOptions {
  minDurationSeconds: number;
  minConfidence: number;
  strongOnsetThreshold?: number;
}

export function removeGhostNotes(
  notes: NoteEvent[],
  options: RemoveGhostNotesOptions
): NoteEvent[] {
  const strongOnsetThreshold = options.strongOnsetThreshold ?? 0.75;

  return notes.filter((note) => {
    const duration = note.end - note.start;
    const short = duration < options.minDurationSeconds;
    const weak = note.confidence < options.minConfidence;
    const expressiveShortNote =
      note.confidence >= options.minConfidence && note.onsetStrength >= strongOnsetThreshold;

    return !short || !weak || expressiveShortNote;
  });
}
