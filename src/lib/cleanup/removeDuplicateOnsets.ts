import type { NoteEvent } from "../../types/NoteEvent";

export interface RemoveDuplicateOnsetsOptions {
  onsetToleranceSeconds: number;
}

const scoreNote = (note: NoteEvent): number => {
  const duration = Math.max(0, note.end - note.start);
  return duration * 2 + note.confidence + note.onsetStrength * 0.5;
};

export function removeDuplicateOnsets(
  notes: NoteEvent[],
  options: RemoveDuplicateOnsetsOptions
): NoteEvent[] {
  const sorted = [...notes].sort((a, b) => a.pitch - b.pitch || a.start - b.start || a.end - b.end);
  const kept: NoteEvent[] = [];

  for (const note of sorted) {
    const duplicateIndex = kept.findIndex(
      (candidate) =>
        candidate.pitch === note.pitch &&
        Math.abs(candidate.start - note.start) <= options.onsetToleranceSeconds
    );

    if (duplicateIndex === -1) {
      kept.push({ ...note });
      continue;
    }

    if (scoreNote(note) > scoreNote(kept[duplicateIndex])) {
      kept[duplicateIndex] = { ...note };
    }
  }

  return kept.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
}
