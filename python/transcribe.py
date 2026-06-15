#!/usr/bin/env python3
"""Transcribe a WAV file to normalized NoteEvent JSON.

Usage:
    python transcribe.py input.wav output.json
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any


def _note(
    pitch: int,
    start: float,
    end: float,
    velocity: int,
    confidence: float,
    onset_strength: float,
) -> dict[str, Any]:
    return {
        "pitch": pitch,
        "start": round(float(start), 6),
        "end": round(float(end), 6),
        "velocity": int(max(1, min(127, velocity))),
        "confidence": round(float(max(0.0, min(1.0, confidence))), 4),
        "onsetStrength": round(float(max(0.0, min(1.0, onset_strength))), 4),
        "source": "ai",
    }


def transcribe_with_basic_pitch(audio_path: Path) -> list[dict[str, Any]]:
    import basic_pitch  # type: ignore
    from basic_pitch.inference import predict  # type: ignore

    onnx_model = Path(basic_pitch.__file__).parent / "saved_models" / "icassp_2022" / "nmp.onnx"
    if not onnx_model.exists():
        raise RuntimeError("Basic Pitch ONNX model is not installed.")

    _model_output, _midi_data, note_events = predict(str(audio_path), onnx_model)
    notes: list[dict[str, Any]] = []

    for event in note_events:
        if isinstance(event, dict):
            start = event.get("start_time_s", event.get("start", 0.0))
            end = event.get("end_time_s", event.get("end", 0.0))
            pitch = event.get("pitch_midi", event.get("pitch", 60))
            amplitude = event.get("amplitude", event.get("velocity", 0.75))
        elif isinstance(event, (tuple, list)) and len(event) >= 4:
            start, end, pitch, amplitude = event[:4]
        else:
            start = getattr(event, "start_time_s", getattr(event, "start", 0.0))
            end = getattr(event, "end_time_s", getattr(event, "end", 0.0))
            pitch = getattr(event, "pitch_midi", getattr(event, "pitch", 60))
            amplitude = getattr(event, "amplitude", getattr(event, "velocity", 0.75))

        amplitude_value = float(amplitude)
        if math.isnan(amplitude_value):
            amplitude_value = 0.5
        velocity = int(round(1 + max(0.0, min(1.0, amplitude_value)) * 126))
        confidence = max(0.2, min(1.0, amplitude_value))
        onset_strength = max(0.2, min(1.0, amplitude_value))
        notes.append(_note(int(round(pitch)), float(start), float(end), velocity, confidence, onset_strength))

    return notes


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: python transcribe.py input.wav output.json", file=sys.stderr)
        return 2

    input_path = Path(sys.argv[1]).expanduser().resolve()
    output_path = Path(sys.argv[2]).expanduser().resolve()

    if not input_path.exists():
        print(f"Input WAV not found: {input_path}", file=sys.stderr)
        return 1

    try:
        notes = transcribe_with_basic_pitch(input_path)
    except Exception as exc:
        print(f"Basic Pitch transcription failed: {exc}", file=sys.stderr)
        return 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(notes, indent=2), encoding="utf-8")
    print(f"Wrote {len(notes)} notes using Basic Pitch ONNX: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
