import { contextBridge, ipcRenderer } from "electron";
import type { NoteEvent } from "../src/types/NoteEvent";

contextBridge.exposeInMainWorld("electronApi", {
  selectAudioFile: () => ipcRenderer.invoke("audio:select"),
  transcribeAudio: (filePath: string) => ipcRenderer.invoke("audio:transcribe", filePath),
  exportMidi: (notes: NoteEvent[], tempo: number) => ipcRenderer.invoke("midi:export", notes, tempo)
});
