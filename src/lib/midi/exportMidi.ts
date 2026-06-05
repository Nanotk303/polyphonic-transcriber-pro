import { Midi } from "@tonejs/midi";
import type { NoteEvent } from "../../types/NoteEvent";

export function createMidiBytes(notes: NoteEvent[], tempo: number): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(tempo);

  const track = midi.addTrack();
  const orderedNotes = [...notes].sort((a, b) => a.start - b.start || a.pitch - b.pitch);

  for (const note of orderedNotes) {
    const duration = Math.max(0.01, note.end - note.start);
    track.addNote({
      midi: Math.min(127, Math.max(0, Math.round(note.pitch))),
      time: Math.max(0, note.start),
      duration,
      velocity: Math.min(1, Math.max(0.01, note.velocity / 127))
    });
  }

  return midi.toArray();
}
