export interface NoteEvent {
  id: string;
  pitch: number;
  start: number;
  end: number;
  velocity: number;
  confidence: number;
  onsetStrength: number;
  source: "ai" | "edited";
}

export interface TranscriptionSettings {
  mergeGapSeconds: number;
  reattackThreshold: number;
  maxReattackGap: number;
  minDurationSeconds: number;
  minConfidence: number;
  onsetToleranceSeconds: number;
  tempo: number;
  gridDivision: number;
  quantizeStrength: number;
  minDurationBeats: number;
}

export interface ElectronApi {
  selectAudioFile: () => Promise<string | null>;
  transcribeAudio: (filePath: string) => Promise<NoteEvent[]>;
  exportMidi: (notes: NoteEvent[], tempo: number) => Promise<string | null>;
}

declare global {
  interface Window {
    electronApi: ElectronApi;
  }
}
