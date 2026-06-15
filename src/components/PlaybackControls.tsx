import type { SystemMidiOutput } from "../hooks/useMidiOutputs";

interface PlaybackControlsProps {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  volume: number;
  disabled: boolean;
  midiOutputs: SystemMidiOutput[];
  selectedOutputId: string;
  midiError: string | null;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onOutputChange: (id: string) => void;
  onRefreshOutputs: () => void;
}

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.max(0, seconds - minutes * 60);
  return `${minutes}:${remainder.toFixed(1).padStart(4, "0")}`;
};

export function PlaybackControls({
  duration,
  currentTime,
  isPlaying,
  volume,
  disabled,
  midiOutputs,
  selectedOutputId,
  midiError,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onVolumeChange,
  onOutputChange,
  onRefreshOutputs
}: PlaybackControlsProps) {
  return (
    <div className="playback-controls" aria-label="MIDI playback controls">
      <button type="button" onClick={isPlaying ? onPause : onPlay} disabled={disabled}>
        {isPlaying ? "Pause" : "Play"} <span className="shortcut">Space</span>
      </button>
      <button type="button" onClick={onStop} disabled={disabled || currentTime === 0}>
        Stop
      </button>
      <span className="time-readout">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>
      <input
        className="playback-position"
        type="range"
        min={0}
        max={Math.max(0.01, duration)}
        step={0.01}
        value={Math.min(currentTime, duration)}
        onChange={(event) => onSeek(Number(event.target.value))}
        disabled={disabled}
        aria-label="Playback position"
      />
      <label className="volume-control">
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
        />
      </label>
      <label className="midi-output-control" title={midiError ?? undefined}>
        MIDI Out
        <select value={selectedOutputId} onChange={(event) => onOutputChange(event.target.value)}>
          <option value="">Internal synth</option>
          {midiOutputs.map((output) => (
            <option key={output.id} value={output.id}>
              {output.name || "Unnamed MIDI output"}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="refresh-midi" onClick={onRefreshOutputs} title="Refresh MIDI outputs">
        Refresh
      </button>
    </div>
  );
}
