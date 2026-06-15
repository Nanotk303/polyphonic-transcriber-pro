import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NoteEvent } from "../types/NoteEvent";

interface ScheduledVoice {
  oscillator: OscillatorNode;
  gain: GainNode;
}

export interface MidiPlayback {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  volume: number;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
}

const midiToFrequency = (pitch: number) => 440 * 2 ** ((pitch - 69) / 12);

export function useMidiPlayback(notes: NoteEvent[]): MidiPlayback {
  const duration = useMemo(() => Math.max(0, ...notes.map((note) => note.end)), [notes]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const contextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const voicesRef = useRef<ScheduledVoice[]>([]);
  const startedAtRef = useRef(0);
  const startPositionRef = useRef(0);
  const animationRef = useRef<number | null>(null);
  const playingRef = useRef(false);
  const durationRef = useRef(duration);

  durationRef.current = duration;

  const stopVoices = useCallback(() => {
    for (const voice of voicesRef.current) {
      voice.oscillator.onended = null;
      try {
        voice.oscillator.stop();
      } catch {
        // A voice that has already ended cannot be stopped again.
      }
      voice.oscillator.disconnect();
      voice.gain.disconnect();
    }
    voicesRef.current = [];
  }, []);

  const ensureAudio = useCallback(() => {
    if (!contextRef.current) {
      const context = new AudioContext();
      const masterGain = context.createGain();
      masterGain.gain.value = volume;
      masterGain.connect(context.destination);
      contextRef.current = context;
      masterGainRef.current = masterGain;
    }
    return contextRef.current;
  }, [volume]);

  const scheduleFrom = useCallback(
    (position: number) => {
      const context = ensureAudio();
      const masterGain = masterGainRef.current;
      if (!masterGain) {
        return;
      }

      stopVoices();
      const now = context.currentTime + 0.03;
      startedAtRef.current = now;
      startPositionRef.current = position;

      for (const note of notes) {
        if (note.end <= position) {
          continue;
        }

        const audibleStart = Math.max(note.start, position);
        const startsAt = now + Math.max(0, note.start - position);
        const endsAt = startsAt + Math.max(0.01, note.end - audibleStart);
        const attackEndsAt = Math.min(endsAt, startsAt + 0.012);
        const releaseStartsAt = Math.max(attackEndsAt, endsAt - 0.045);
        const level = Math.max(0.015, Math.min(0.14, (note.velocity / 127) * 0.14));
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "triangle";
        oscillator.frequency.value = midiToFrequency(note.pitch);
        gain.gain.setValueAtTime(0.0001, startsAt);
        gain.gain.exponentialRampToValueAtTime(level, attackEndsAt);
        gain.gain.setValueAtTime(level, releaseStartsAt);
        gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start(startsAt);
        oscillator.stop(endsAt + 0.01);

        const voice = { oscillator, gain };
        voicesRef.current.push(voice);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
          voicesRef.current = voicesRef.current.filter((candidate) => candidate !== voice);
        };
      }
    },
    [ensureAudio, notes, stopVoices]
  );

  const updatePosition = useCallback(() => {
    const context = contextRef.current;
    if (!context || !playingRef.current) {
      return;
    }

    const position = startPositionRef.current + Math.max(0, context.currentTime - startedAtRef.current);
    if (position >= durationRef.current) {
      playingRef.current = false;
      setIsPlaying(false);
      setCurrentTime(durationRef.current);
      stopVoices();
      return;
    }

    setCurrentTime(position);
    animationRef.current = requestAnimationFrame(updatePosition);
  }, [stopVoices]);

  const play = useCallback(() => {
    if (notes.length === 0 || duration <= 0 || playingRef.current) {
      return;
    }

    const context = ensureAudio();
    void context.resume();
    const position = currentTime >= duration ? 0 : currentTime;
    setCurrentTime(position);
    scheduleFrom(position);
    playingRef.current = true;
    setIsPlaying(true);
    animationRef.current = requestAnimationFrame(updatePosition);
  }, [currentTime, duration, ensureAudio, notes.length, scheduleFrom, updatePosition]);

  const pause = useCallback(() => {
    const context = contextRef.current;
    if (!context || !playingRef.current) {
      return;
    }

    const position = Math.min(
      durationRef.current,
      startPositionRef.current + Math.max(0, context.currentTime - startedAtRef.current)
    );
    playingRef.current = false;
    setIsPlaying(false);
    setCurrentTime(position);
    stopVoices();
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [stopVoices]);

  const stop = useCallback(() => {
    playingRef.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
    stopVoices();
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
    }
  }, [stopVoices]);

  const seek = useCallback(
    (time: number) => {
      const nextTime = Math.max(0, Math.min(durationRef.current, time));
      setCurrentTime(nextTime);
      if (playingRef.current) {
        scheduleFrom(nextTime);
      }
    },
    [scheduleFrom]
  );

  const setVolume = useCallback((nextVolume: number) => {
    const clamped = Math.max(0, Math.min(1, nextVolume));
    setVolumeState(clamped);
    const context = contextRef.current;
    const masterGain = masterGainRef.current;
    if (context && masterGain) {
      masterGain.gain.setTargetAtTime(clamped, context.currentTime, 0.01);
    }
  }, []);

  useEffect(() => {
    if (currentTime > duration) {
      setCurrentTime(duration);
    }
  }, [currentTime, duration]);

  useEffect(
    () => () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      stopVoices();
      void contextRef.current?.close();
    },
    [stopVoices]
  );

  return { duration, currentTime, isPlaying, volume, play, pause, stop, seek, setVolume };
}
