import type { NoteEvent } from "../../types/NoteEvent";

export interface MergeRepeatedNotesOptions {
  mergeGapSeconds: number;
  reattackThreshold: number;
  maxReattackGap: number;
}

const cloneNote = (note: NoteEvent): NoteEvent => ({ ...note });

export function mergeRepeatedNotes(
  notes: NoteEvent[],
  options: MergeRepeatedNotesOptions
): NoteEvent[] {
  const sorted = notes
    .map(cloneNote)
    .sort((a, b) => a.pitch - b.pitch || a.start - b.start || a.end - b.end);

  const mergedByPitch: NoteEvent[] = [];

  for (const note of sorted) {
    const previous = mergedByPitch[mergedByPitch.length - 1];
    const gap = previous ? note.start - previous.end : Number.POSITIVE_INFINITY;
    const samePitch = previous?.pitch === note.pitch;
    const strongReattack = note.onsetStrength >= options.reattackThreshold;
    const mergeableGap =
      gap >= 0 &&
      gap <= options.mergeGapSeconds &&
      gap <= options.maxReattackGap;

    if (previous && samePitch && mergeableGap && !strongReattack) {
      previous.end = Math.max(previous.end, note.end);
      previous.velocity = Math.max(previous.velocity, note.velocity);
      previous.confidence = Math.max(previous.confidence, note.confidence);
      previous.onsetStrength = Math.max(previous.onsetStrength, note.onsetStrength);
      previous.source = previous.source === "edited" || note.source === "edited" ? "edited" : "ai";
    } else {
      mergedByPitch.push(note);
    }
  }

  return mergedByPitch.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
}
