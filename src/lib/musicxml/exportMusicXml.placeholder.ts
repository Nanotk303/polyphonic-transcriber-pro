import type { NoteEvent } from "../../types/NoteEvent";

export interface MusicXmlExportRequest {
  notes: NoteEvent[];
  tempo: number;
  title?: string;
}

export function exportMusicXmlPlaceholder(_request: MusicXmlExportRequest): never {
  throw new Error("MusicXML export is planned but not implemented yet.");
}
