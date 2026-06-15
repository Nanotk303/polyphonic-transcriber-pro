import { useCallback, useEffect, useMemo, useState } from "react";

export type SystemMidiOutput = MIDIOutput;

export interface MidiOutputs {
  outputs: SystemMidiOutput[];
  selectedOutputId: string;
  selectedOutput: SystemMidiOutput | null;
  error: string | null;
  setSelectedOutputId: (id: string) => void;
  refresh: () => Promise<void>;
}

export function useMidiOutputs(): MidiOutputs {
  const [access, setAccess] = useState<MIDIAccess | null>(null);
  const [outputs, setOutputs] = useState<SystemMidiOutput[]>([]);
  const [selectedOutputId, setSelectedOutputId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const updateOutputs = useCallback((midiAccess: MIDIAccess) => {
    const available = Array.from(midiAccess.outputs.values()).sort((a, b) =>
      (a.name ?? "").localeCompare(b.name ?? "")
    );
    setOutputs(available);
    setSelectedOutputId((current) =>
      current && available.some((output) => output.id === current) ? current : ""
    );
  }, []);

  const refresh = useCallback(async () => {
    if (!("requestMIDIAccess" in navigator)) {
      setError("System MIDI is not available in this Electron version.");
      return;
    }

    try {
      const midiAccess = access ?? (await navigator.requestMIDIAccess());
      setAccess(midiAccess);
      updateOutputs(midiAccess);
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "MIDI access was refused.");
    }
  }, [access, updateOutputs]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!access) {
      return;
    }
    const handleStateChange = () => updateOutputs(access);
    access.addEventListener("statechange", handleStateChange);
    return () => access.removeEventListener("statechange", handleStateChange);
  }, [access, updateOutputs]);

  const selectedOutput = useMemo(
    () => outputs.find((output) => output.id === selectedOutputId) ?? null,
    [outputs, selectedOutputId]
  );

  return {
    outputs,
    selectedOutputId,
    selectedOutput,
    error,
    setSelectedOutputId,
    refresh
  };
}
