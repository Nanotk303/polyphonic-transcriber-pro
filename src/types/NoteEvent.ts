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

export interface BeatTrackingData {
  tempo: number | null;
  beats: number[];
}

export interface TranscriptionResult {
  notes: NoteEvent[];
  beatTracking: BeatTrackingData;
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
  transcribeAudio: (filePath: string) => Promise<TranscriptionResult>;
  exportMidi: (notes: NoteEvent[], tempo: number) => Promise<string | null>;
}

declare global {
  interface Window {
    electronApi: ElectronApi;
  }
}
