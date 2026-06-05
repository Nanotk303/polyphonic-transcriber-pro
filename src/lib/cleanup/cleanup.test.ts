import { describe, expect, it } from "vitest";
import type { NoteEvent, TranscriptionSettings } from "../../types/NoteEvent";
import { cleanNotes } from "./cleanNotes";
import { mergeRepeatedNotes } from "./mergeRepeatedNotes";
import { removeDuplicateOnsets } from "./removeDuplicateOnsets";
import { removeGhostNotes } from "./removeGhostNotes";

const baseNote = (overrides: Partial<NoteEvent>): NoteEvent => ({
  id: "n",
  pitch: 60,
  start: 0,
  end: 0.5,
  velocity: 80,
  confidence: 0.8,
  onsetStrength: 0.5,
  source: "ai",
  ...overrides
});

const settings: TranscriptionSettings = {
  mergeGapSeconds: 0.08,
  reattackThreshold: 0.75,
  maxReattackGap: 0.16,
  minDurationSeconds: 0.04,
  minConfidence: 0.45,
  onsetToleranceSeconds: 0.02,
  tempo: 120,
  gridDivision: 16,
  quantizeStrength: 1,
  minDurationBeats: 0.125
};

describe("cleanup engine", () => {
  it("merges weak same-pitch fragments across small gaps", () => {
    const result = mergeRepeatedNotes(
      [
        baseNote({ id: "a", end: 0.3, velocity: 70 }),
        baseNote({ id: "b", start: 0.34, end: 0.6, velocity: 90, confidence: 0.9 })
      ],
      settings
    );

    expect(result).toHaveLength(1);
    expect(result[0].end).toBe(0.6);
    expect(result[0].velocity).toBe(90);
    expect(result[0].confidence).toBe(0.9);
  });

  it("preserves strong repeated attacks", () => {
    const result = mergeRepeatedNotes(
      [
        baseNote({ id: "a", end: 0.3 }),
        baseNote({ id: "b", start: 0.34, end: 0.6, onsetStrength: 0.9 })
      ],
      settings
    );

    expect(result).toHaveLength(2);
  });

  it("removes only weak short ghost notes", () => {
    const result = removeGhostNotes(
      [
        baseNote({ id: "ghost", end: 0.02, confidence: 0.2, onsetStrength: 0.1 }),
        baseNote({ id: "real-short", start: 0.1, end: 0.12, confidence: 0.9, onsetStrength: 0.9 })
      ],
      settings
    );

    expect(result.map((note) => note.id)).toEqual(["real-short"]);
  });

  it("keeps the stronger duplicate onset", () => {
    const result = removeDuplicateOnsets(
      [
        baseNote({ id: "short", end: 0.2, confidence: 0.6 }),
        baseNote({ id: "long", start: 0.01, end: 0.8, confidence: 0.7 })
      ],
      settings
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("long");
  });

  it("runs the combined cleanup pipeline", () => {
    const result = cleanNotes(
      [
        baseNote({ id: "a", end: 0.3 }),
        baseNote({ id: "b", start: 0.34, end: 0.6 }),
        baseNote({ id: "ghost", pitch: 61, start: 0.1, end: 0.11, confidence: 0.1 })
      ],
      settings
    );

    expect(result).toHaveLength(1);
    expect(result[0].pitch).toBe(60);
  });
});
