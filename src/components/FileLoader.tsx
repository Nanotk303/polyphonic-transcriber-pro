interface FileLoaderProps {
  filePath: string | null;
  busy: boolean;
  onSelect: () => void;
  onTranscribe: () => void;
}

export function FileLoader({ filePath, busy, onSelect, onTranscribe }: FileLoaderProps) {
  const fileName = filePath ? filePath.split(/[\\/]/).pop() : "No WAV selected";

  return (
    <div className="file-loader">
      <button type="button" onClick={onSelect} disabled={busy}>
        Load WAV
      </button>
      <button type="button" onClick={onTranscribe} disabled={!filePath || busy}>
        Transcribe
      </button>
      <span className="file-name" title={filePath ?? undefined}>
        {fileName}
      </span>
    </div>
  );
}
