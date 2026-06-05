import type { TranscriptionSettings } from "../types/NoteEvent";

interface TransportBarProps {
  settings: TranscriptionSettings;
  busy: boolean;
  noteCount: number;
  onSettingsChange: (settings: TranscriptionSettings) => void;
  onCleanQuantize: () => void;
}

export function TransportBar({
  settings,
  busy,
  noteCount,
  onSettingsChange,
  onCleanQuantize
}: TransportBarProps) {
  const update = (key: keyof TranscriptionSettings, value: number) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <aside className="side-panel">
      <h2>Settings</h2>
      <label>
        Tempo
        <input
          type="number"
          min={20}
          max={300}
          value={settings.tempo}
          onChange={(event) => update("tempo", Number(event.target.value))}
        />
      </label>
      <label>
        Grid
        <select
          value={settings.gridDivision}
          onChange={(event) => update("gridDivision", Number(event.target.value))}
        >
          <option value={8}>Eighth</option>
          <option value={12}>Triplet</option>
          <option value={16}>Sixteenth</option>
          <option value={32}>Thirty-second</option>
        </select>
      </label>
      <label>
        Quantize
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.quantizeStrength}
          onChange={(event) => update("quantizeStrength", Number(event.target.value))}
        />
      </label>
      <label>
        Merge gap
        <input
          type="number"
          min={0}
          step={0.01}
          value={settings.mergeGapSeconds}
          onChange={(event) => update("mergeGapSeconds", Number(event.target.value))}
        />
      </label>
      <label>
        Reattack threshold
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={settings.reattackThreshold}
          onChange={(event) => update("reattackThreshold", Number(event.target.value))}
        />
      </label>
      <label>
        Min duration
        <input
          type="number"
          min={0}
          step={0.01}
          value={settings.minDurationSeconds}
          onChange={(event) => update("minDurationSeconds", Number(event.target.value))}
        />
      </label>
      <label>
        Min confidence
        <input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={settings.minConfidence}
          onChange={(event) => update("minConfidence", Number(event.target.value))}
        />
      </label>
      <button type="button" onClick={onCleanQuantize} disabled={busy || noteCount === 0}>
        Clean / Quantize
      </button>
      <p className="note-count">{noteCount} notes</p>
    </aside>
  );
}
