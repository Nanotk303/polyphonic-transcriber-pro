import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { NoteEvent } from "../types/NoteEvent";

interface PianoRollProps {
  notes: NoteEvent[];
  selectedId: string | null;
  playheadTime: number;
  zoomX: number;
  zoomY: number;
  onChange: (notes: NoteEvent[]) => void;
  onSelect: (id: string | null) => void;
  onSeek: (time: number) => void;
}

type DragMode = "move" | "resize" | null;

interface DragState {
  id: string;
  mode: DragMode;
  originX: number;
  start: number;
  end: number;
}

const pitchLabel = (pitch: number): string => {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
};

export function PianoRoll({
  notes,
  selectedId,
  playheadTime,
  zoomX,
  zoomY,
  onChange,
  onSelect,
  onSeek
}: PianoRollProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const bounds = useMemo(() => {
    const minPitch = Math.max(21, Math.min(84, ...notes.map((note) => note.pitch), 48) - 4);
    const maxPitch = Math.min(108, Math.max(72, ...notes.map((note) => note.pitch), 72) + 4);
    const maxTime = Math.max(8, ...notes.map((note) => note.end + 1));
    return { minPitch, maxPitch, maxTime };
  }, [notes]);

  const rowHeight = 14 * zoomY;
  const pixelsPerSecond = 96 * zoomX;
  const labelWidth = 54;

  const geometry = useMemo(() => {
    const pitchCount = bounds.maxPitch - bounds.minPitch + 1;
    return {
      width: Math.ceil(labelWidth + bounds.maxTime * pixelsPerSecond),
      height: Math.ceil(pitchCount * rowHeight)
    };
  }, [bounds.maxPitch, bounds.maxTime, bounds.minPitch, pixelsPerSecond, rowHeight]);

  const noteRect = (note: NoteEvent) => {
    const x = labelWidth + note.start * pixelsPerSecond;
    const y = (bounds.maxPitch - note.pitch) * rowHeight;
    const width = Math.max(3, (note.end - note.start) * pixelsPerSecond);
    return { x, y, width, height: Math.max(8, rowHeight - 2) };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    canvas.width = geometry.width;
    canvas.height = geometry.height;
    context.fillStyle = "#101318";
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let pitch = bounds.minPitch; pitch <= bounds.maxPitch; pitch += 1) {
      const y = (bounds.maxPitch - pitch) * rowHeight;
      const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12);
      context.fillStyle = isBlackKey ? "#171c24" : "#1d232c";
      context.fillRect(labelWidth, y, canvas.width - labelWidth, rowHeight);
      context.strokeStyle = pitch % 12 === 0 ? "#3c4757" : "#2a313b";
      context.beginPath();
      context.moveTo(labelWidth, y + 0.5);
      context.lineTo(canvas.width, y + 0.5);
      context.stroke();

      if (pitch % 12 === 0) {
        context.fillStyle = "#b8c2d1";
        context.font = "11px system-ui, sans-serif";
        context.fillText(pitchLabel(pitch), 8, y + rowHeight - 4);
      }
    }

    const seconds = Math.ceil(bounds.maxTime);
    for (let second = 0; second <= seconds; second += 1) {
      const x = labelWidth + second * pixelsPerSecond;
      context.strokeStyle = second % 4 === 0 ? "#536171" : "#333c47";
      context.beginPath();
      context.moveTo(x + 0.5, 0);
      context.lineTo(x + 0.5, canvas.height);
      context.stroke();
      context.fillStyle = "#9da8b7";
      context.fillText(`${second}s`, x + 4, 13);
    }

    for (const note of notes) {
      const rect = noteRect(note);
      const selected = note.id === selectedId;
      context.fillStyle = selected ? "#f6c85f" : note.source === "edited" ? "#72d6a3" : "#5bb7f0";
      context.fillRect(rect.x, rect.y + 1, rect.width, rect.height);
      context.strokeStyle = selected ? "#fff4bf" : "#0b1117";
      context.strokeRect(rect.x + 0.5, rect.y + 1.5, rect.width, rect.height);
    }

    const playheadX = labelWidth + playheadTime * pixelsPerSecond;
    context.strokeStyle = "#ff6b6b";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(playheadX, 0);
    context.lineTo(playheadX, canvas.height);
    context.stroke();
    context.lineWidth = 1;
  }, [bounds, geometry.height, geometry.width, notes, playheadTime, rowHeight, selectedId, pixelsPerSecond]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Backspace" || !selectedId) {
        return;
      }
      event.preventDefault();
      onChange(notes.filter((note) => note.id !== selectedId));
      onSelect(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [notes, onChange, onSelect, selectedId]);

  const findNoteAt = (x: number, y: number): { note: NoteEvent; mode: DragMode } | null => {
    for (const note of [...notes].reverse()) {
      const rect = noteRect(note);
      const inside =
        x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height + 2;
      if (!inside) {
        continue;
      }

      const resize = x >= rect.x + rect.width - 8;
      return { note, mode: resize ? "resize" : "move" };
    }
    return null;
  };

  const pointerPosition = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) {
      return { x: 0, y: 0 };
    }
    const scaleX = geometry.width / rect.width;
    const scaleY = geometry.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const point = pointerPosition(event);
    const hit = findNoteAt(point.x, point.y);
    if (!hit) {
      onSelect(null);
      if (point.x >= labelWidth) {
        onSeek((point.x - labelWidth) / pixelsPerSecond);
      }
      return;
    }

    onSelect(hit.note.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      id: hit.note.id,
      mode: hit.mode,
      originX: point.x,
      start: hit.note.start,
      end: hit.note.end
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drag) {
      return;
    }

    const point = pointerPosition(event);
    const deltaSeconds = (point.x - drag.originX) / pixelsPerSecond;

    onChange(
      notes.map((note) => {
        if (note.id !== drag.id) {
          return note;
        }

        if (drag.mode === "resize") {
          return {
            ...note,
            end: Math.max(drag.start + 0.03, drag.end + deltaSeconds),
            source: "edited"
          };
        }

        const duration = drag.end - drag.start;
        const start = Math.max(0, drag.start + deltaSeconds);
        return {
          ...note,
          start,
          end: start + duration,
          source: "edited"
        };
      })
    );
  };

  const handlePointerUp = () => {
    setDrag(null);
  };

  return (
    <div className="piano-roll-shell">
      <canvas
        ref={canvasRef}
        className="piano-roll"
        style={{ width: `${geometry.width}px`, height: `${geometry.height}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
