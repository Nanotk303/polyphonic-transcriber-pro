import { describe, expect, it } from "vitest";
import type { NoteEvent } from "../../types/NoteEvent";
import { quantizeNotes } from "./quantizeNotes";

const note: NoteEvent = {
  id: "q",
  pitch: 60,
  start: 0.13,
  end: 0.42,
  velocity: 90,
  confidence: 0.9,
  onsetStrength: 0.8,
  source: "ai"
};

describe("quantizeNotes", () => {
  it("quantizes to a tempo-based grid without zero-length notes", () => {
    const result = quantizeNotes([note], {
      tempo: 120,
      gridDivision: 16,
      strength: 1,
      minDurationBeats: 0.25
    });

    expect(result[0].start).toBe(0.125);
    expect(result[0].end).toBeGreaterThan(result[0].start);
  });

  it("uses tracked beat positions when available", () => {
    const result = quantizeNotes([note], {
      tempo: 120,
      gridDivision: 16,
      strength: 1,
      minDurationBeats: 0.25,
      beatTimes: [0.1, 0.6, 1.1]
    });

    expect(result[0].start).toBe(0.1);
    expect(result[0].end).toBe(0.475);
  });
});
