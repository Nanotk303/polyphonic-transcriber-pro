interface ExportPanelProps {
  disabled: boolean;
  onExportMidi: () => void;
}

export function ExportPanel({ disabled, onExportMidi }: ExportPanelProps) {
  return (
    <div className="export-panel">
      <button type="button" onClick={onExportMidi} disabled={disabled}>
        Export MIDI
      </button>
    </div>
  );
}
