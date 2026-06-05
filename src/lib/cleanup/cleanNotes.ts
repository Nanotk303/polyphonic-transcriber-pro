import type { NoteEvent, TranscriptionSettings } from "../../types/NoteEvent";
import { mergeRepeatedNotes } from "./mergeRepeatedNotes";
import { removeDuplicateOnsets } from "./removeDuplicateOnsets";
import { removeGhostNotes } from "./removeGhostNotes";

export function cleanNotes(notes: NoteEvent[], settings: TranscriptionSettings): NoteEvent[] {
  const saneNotes = notes
    .filter((note) => Number.isFinite(note.start) && Number.isFinite(note.end) && note.end > note.start)
    .map((note) => ({
      ...note,
      pitch: Math.min(127, Math.max(0, Math.round(note.pitch))),
      velocity: Math.min(127, Math.max(1, Math.round(note.velocity))),
      confidence: Math.min(1, Math.max(0, note.confidence)),
      onsetStrength: Math.min(1, Math.max(0, note.onsetStrength))
    }));

  const withoutGhosts = removeGhostNotes(saneNotes, {
    minDurationSeconds: settings.minDurationSeconds,
    minConfidence: settings.minConfidence
  });
  const withoutDuplicates = removeDuplicateOnsets(withoutGhosts, {
    onsetToleranceSeconds: settings.onsetToleranceSeconds
  });

  return mergeRepeatedNotes(withoutDuplicates, {
    mergeGapSeconds: settings.mergeGapSeconds,
    reattackThreshold: settings.reattackThreshold,
    maxReattackGap: settings.maxReattackGap
  });
}
