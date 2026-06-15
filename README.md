# Polyphonic Transcriber Pro

Polyphonic Transcriber Pro is a local Electron desktop app for turning WAV audio into cleaned, quantized MIDI. It uses a React + TypeScript renderer, an Electron main-process backend, and a Python transcription bridge that uses Basic Pitch when available.

The current prototype is intentionally local-first: no cloud services, no remote transcription, and no Node access from the React UI.

## Features

- Load a WAV file from the desktop interface.
- Run Python transcription through the Electron main process.
- Use Basic Pitch with ONNX Runtime for local polyphonic transcription.
- Normalize raw note events into a shared `NoteEvent` model.
- Remove weak short ghost notes.
- Remove duplicate same-pitch onsets.
- Merge repeated same-pitch fragments while preserving strong musical reattacks.
- Quantize note starts and durations to a tempo-based grid.
- Display notes in a canvas piano roll.
- Play the edited MIDI arrangement with a built-in polyphonic synthesizer.
- Pause, stop, seek, adjust volume, and follow the playhead in the piano roll.
- Toggle playback with the Space bar and route notes to a macOS IAC MIDI port.
- Select, delete, drag, and resize notes.
- Export cleaned notes to MIDI with `@tonejs/midi`.
- Keep a placeholder module for future MusicXML export.

## Requirements

- Node.js 20 or newer.
- npm 10 or newer.
- Python 3.10 or newer.
- macOS, Windows, or Linux with Electron support.

## Install

```bash
npm install
```

## Python Setup

The app runs `python/transcribe.py` from the Electron main process. Create the local Python environment before transcribing audio; the app automatically uses `.venv/bin/python` when it exists.

To enable Basic Pitch:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r python/requirements.txt
```

If your Python binary is not `python3`, set `PYTHON_BIN` when launching Electron:

```bash
PYTHON_BIN=/path/to/python npm run dev
```

## Run

```bash
npm run dev
```

This starts the Vite renderer, compiles Electron TypeScript, waits for both to be ready, and opens the desktop app.

## Build

```bash
npm run build
```

The build compiles the React renderer and Electron main/preload scripts.

## macOS Installer

On an Apple Silicon Mac, create a standalone DMG with:

```bash
npm run dist:mac
```

The installer is written to `release/`. It includes the Basic Pitch ONNX transcriber, so the installed app does not require Node.js, Homebrew, or a separate Python environment.

## Test

```bash
npm test
```

The included tests cover the cleanup and quantization logic.

## Workflow

1. Click **Load WAV** and choose a local `.wav` file.
2. Click **Transcribe** to run the Python backend.
3. Adjust cleanup and quantization settings in the left panel.
4. Click **Clean / Quantize**.
5. Edit notes in the piano roll:
   - click to select
   - press Backspace to delete
   - drag a note body to move it horizontally
   - drag the right edge to resize duration
6. Use **Play** to audition the result; click an empty point in the piano roll to seek.
   - Press Space to toggle play/pause when a form control is not focused.
   - Select an IAC bus under **MIDI Out** to send notes to another macOS application.
7. Click **Export MIDI** and choose a destination.

## macOS IAC Output

1. Open **Audio MIDI Setup**, then choose **Window > Show MIDI Studio**.
2. Open **IAC Driver**, enable **Device is online**, and create or enable a bus.
3. Restart the app, or click **Refresh** beside **MIDI Out**.
4. Select the IAC bus. Playback sends MIDI notes on channel 1 instead of using the internal synth.

## Data Model

```ts
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
```

## Current Limitations

- Basic Pitch confidence and onset strength are approximated from amplitude when the upstream event lacks richer fields.
- Beat tracking is not implemented; quantization assumes the user-provided tempo.
- Piano-roll editing is intentionally minimal and edits only timing/deletion.
- Export is MIDI-only in this prototype.
- Packaging installers are not configured yet.

## Roadmap

- MusicXML export.
- Better beat tracking and tempo detection.
- MT3 transcription backend.
- Spectrogram view.
- Opusmodus export.
- More detailed note editing, including pitch changes and velocity editing.
