import { useEffect, useMemo, useState } from "react";
import { ExportPanel } from "./components/ExportPanel";
import { FileLoader } from "./components/FileLoader";
import { PianoRoll } from "./components/PianoRoll";
import { PlaybackControls } from "./components/PlaybackControls";
import { TransportBar } from "./components/TransportBar";
import { useMidiPlayback } from "./hooks/useMidiPlayback";
import { useMidiOutputs } from "./hooks/useMidiOutputs";
import { cleanNotes } from "./lib/cleanup/cleanNotes";
import { quantizeNotes } from "./lib/quantize/quantizeNotes";
import type { BeatTrackingData, NoteEvent, TranscriptionSettings } from "./types/NoteEvent";

const defaultSettings: TranscriptionSettings = {
  mergeGapSeconds: 0.08,
  reattackThreshold: 0.72,
  maxReattackGap: 0.16,
  minDurationSeconds: 0.04,
  minConfidence: 0.45,
  onsetToleranceSeconds: 0.025,
  tempo: 120,
  gridDivision: 16,
  quantizeStrength: 0.85,
  minDurationBeats: 0.125
};

function App() {
  const [filePath, setFilePath] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteEvent[]>([]);
  const [beatTracking, setBeatTracking] = useState<BeatTrackingData>({ tempo: null, beats: [] });
  const [settings, setSettings] = useState<TranscriptionSettings>(defaultSettings);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>(["Ready."]);
  const [zoomX, setZoomX] = useState(1);
  const [zoomY, setZoomY] = useState(1);
  const midi = useMidiOutputs();
  const playback = useMidiPlayback(notes, midi.selectedOutput);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || busy || notes.length === 0) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      if (target?.isContentEditable || tagName === "INPUT" || tagName === "SELECT" || tagName === "TEXTAREA" || tagName === "BUTTON") {
        return;
      }

      event.preventDefault();
      if (playback.isPlaying) {
        playback.pause();
      } else {
        playback.play();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, notes.length, playback]);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId]
  );

  const addLog = (message: string) => {
    setLog((current) => [`${new Date().toLocaleTimeString()} - ${message}`, ...current].slice(0, 8));
  };

  const selectAudioFile = async () => {
    const selected = await window.electronApi.selectAudioFile();
    if (selected) {
      setFilePath(selected);
      addLog(`Loaded ${selected.split(/[\\/]/).pop()}.`);
    }
  };

  const transcribeAudio = async () => {
    if (!filePath) {
      return;
    }

    setBusy(true);
    playback.stop();
    try {
      addLog("Running Python transcription.");
      const transcribed = await window.electronApi.transcribeAudio(filePath);
      setNotes(transcribed.notes);
      setBeatTracking(transcribed.beatTracking);
      if (transcribed.beatTracking.tempo) {
        setSettings((current) => ({
          ...current,
          tempo: Number(transcribed.beatTracking.tempo?.toFixed(2))
        }));
      }
      setSelectedId(null);
      const beatSummary = transcribed.beatTracking.tempo
        ? ` Tempo ${transcribed.beatTracking.tempo.toFixed(1)} BPM, ${transcribed.beatTracking.beats.length} beats.`
        : " No beat track detected.";
      addLog(`Received ${transcribed.notes.length} raw notes.${beatSummary}`);
    } catch (error) {
      addLog(error instanceof Error ? error.message : "Transcription failed.");
    } finally {
      setBusy(false);
    }
  };

  const cleanAndQuantize = () => {
    playback.stop();
    const cleaned = cleanNotes(notes, settings);
    const quantized = quantizeNotes(cleaned, {
      tempo: settings.tempo,
      gridDivision: settings.gridDivision,
      strength: settings.quantizeStrength,
      minDurationBeats: settings.minDurationBeats,
      beatTimes: beatTracking.beats
    });
    setNotes(quantized);
    setSelectedId(null);
    addLog(`Cleaned and quantized to ${quantized.length} notes.`);
  };

  const updateNotes = (nextNotes: NoteEvent[]) => {
    if (playback.isPlaying) {
      playback.stop();
    }
    setNotes(nextNotes);
  };

  const exportMidi = async () => {
    setBusy(true);
    try {
      const exportedPath = await window.electronApi.exportMidi(notes, settings.tempo);
      if (exportedPath) {
        addLog(`Exported MIDI to ${exportedPath}.`);
      } else {
        addLog("MIDI export canceled.");
      }
    } catch (error) {
      addLog(error instanceof Error ? error.message : "MIDI export failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app">
      <header className="toolbar">
        <div className="brand">
          <strong>Polyphonic Transcriber Pro</strong>
          <span>Local WAV to cleaned MIDI</span>
        </div>
        <FileLoader
          filePath={filePath}
          busy={busy}
          onSelect={selectAudioFile}
          onTranscribe={transcribeAudio}
        />
        <button type="button" onClick={cleanAndQuantize} disabled={busy || notes.length === 0}>
          Clean / Quantize
        </button>
        <ExportPanel disabled={busy || notes.length === 0} onExportMidi={exportMidi} />
      </header>

      <div className="workspace">
        <TransportBar
          settings={settings}
          busy={busy}
          noteCount={notes.length}
          onSettingsChange={setSettings}
          onCleanQuantize={cleanAndQuantize}
        />
        <section className="editor-area">
          <div className="editor-tools">
            <PlaybackControls
              duration={playback.duration}
              currentTime={playback.currentTime}
              isPlaying={playback.isPlaying}
              volume={playback.volume}
              disabled={busy || notes.length === 0}
              midiOutputs={midi.outputs}
              selectedOutputId={midi.selectedOutputId}
              midiError={midi.error}
              onPlay={playback.play}
              onPause={playback.pause}
              onStop={playback.stop}
              onSeek={playback.seek}
              onVolumeChange={playback.setVolume}
              onOutputChange={(id) => {
                playback.stop();
                midi.setSelectedOutputId(id);
              }}
              onRefreshOutputs={() => void midi.refresh()}
            />
            <label>
              Zoom X
              <input
                type="range"
                min={0.5}
                max={3}
                step={0.1}
                value={zoomX}
                onChange={(event) => setZoomX(Number(event.target.value))}
              />
            </label>
            <label>
              Zoom Y
              <input
                type="range"
                min={0.75}
                max={2.5}
                step={0.1}
                value={zoomY}
                onChange={(event) => setZoomY(Number(event.target.value))}
              />
            </label>
            <div className="selection-readout">
              {selectedNote
                ? `${selectedNote.id} P${selectedNote.pitch} ${selectedNote.start.toFixed(2)}-${selectedNote.end.toFixed(2)}`
                : "No note selected"}
            </div>
            <div className="beat-readout">
              {beatTracking.tempo
                ? `${beatTracking.tempo.toFixed(1)} BPM · ${beatTracking.beats.length} beats`
                : "No beat track"}
            </div>
          </div>
          <PianoRoll
            notes={notes}
            beats={beatTracking.beats}
            selectedId={selectedId}
            playheadTime={playback.currentTime}
            zoomX={zoomX}
            zoomY={zoomY}
            onChange={updateNotes}
            onSelect={setSelectedId}
            onSeek={playback.seek}
          />
        </section>
      </div>

      <footer className="status-log" aria-live="polite">
        {log.map((entry) => (
          <div key={entry}>{entry}</div>
        ))}
      </footer>
    </main>
  );
}

export default App;
