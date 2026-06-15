import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions, type SaveDialogOptions } from "electron";
import path from "node:path";
import { spawn } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import type { NoteEvent } from "../src/types/NoteEvent";
import { createMidiBytes } from "../src/lib/midi/exportMidi";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 640,
    title: "Polyphonic Transcriber Pro",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (isDev) {
    void mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    void mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

function projectRoot(): string {
  return isDev ? path.join(__dirname, "..", "..") : process.resourcesPath;
}

function pythonScriptPath(): string {
  return path.join(projectRoot(), "python", "transcribe.py");
}

async function resolvePythonBinary(): Promise<string> {
  if (process.env.PYTHON_BIN) {
    return process.env.PYTHON_BIN;
  }

  const virtualEnvPython = path.join(projectRoot(), ".venv", "bin", "python");
  try {
    await access(virtualEnvPython);
    return virtualEnvPython;
  } catch {
    return "python3";
  }
}

async function runPythonTranscription(filePath: string, outputPath: string): Promise<void> {
  const python = await resolvePythonBinary();
  return new Promise((resolve, reject) => {
    const child = spawn(python, [pythonScriptPath(), filePath, outputPath], {
      cwd: projectRoot(),
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Python transcription failed (${code}).\n${stderr || stdout}`));
    });
  });
}

function normalizeTranscribedNotes(raw: unknown): NoteEvent[] {
  if (!Array.isArray(raw)) {
    throw new Error("Transcriber output was not a note array.");
  }

  return raw.map((note, index) => {
    const value = note as Partial<NoteEvent>;
    return {
      id: typeof value.id === "string" ? value.id : `ai-${Date.now()}-${index}`,
      pitch: Number(value.pitch),
      start: Number(value.start),
      end: Number(value.end),
      velocity: Number(value.velocity ?? 90),
      confidence: Number(value.confidence ?? 0.5),
      onsetStrength: Number(value.onsetStrength ?? 0.5),
      source: value.source === "edited" ? "edited" : "ai"
    };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("audio:select", async () => {
  const options: OpenDialogOptions = {
    title: "Select a WAV file",
    filters: [{ name: "WAV audio", extensions: ["wav"] }],
    properties: ["openFile"]
  };
  const result = mainWindow
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options);

  return result.canceled ? null : (result.filePaths[0] ?? null);
});

ipcMain.handle("audio:transcribe", async (_event, filePath: string) => {
  if (!filePath || path.extname(filePath).toLowerCase() !== ".wav") {
    throw new Error("Please select a WAV file before transcribing.");
  }

  const tempDir = path.join(os.tmpdir(), "polyphonic-transcriber-pro");
  await mkdir(tempDir, { recursive: true });
  const outputPath = path.join(tempDir, `notes-${Date.now()}.json`);
  await runPythonTranscription(filePath, outputPath);
  const rawJson = await readFile(outputPath, "utf8");
  return normalizeTranscribedNotes(JSON.parse(rawJson));
});

ipcMain.handle("midi:export", async (_event, notes: NoteEvent[], tempo: number) => {
  const options: SaveDialogOptions = {
    title: "Export MIDI",
    defaultPath: "transcription.mid",
    filters: [{ name: "MIDI file", extensions: ["mid", "midi"] }]
  };
  const result = mainWindow
    ? await dialog.showSaveDialog(mainWindow, options)
    : await dialog.showSaveDialog(options);

  if (result.canceled || !result.filePath) {
    return null;
  }

  const bytes = createMidiBytes(notes, tempo);
  await writeFile(result.filePath, Buffer.from(bytes));
  return result.filePath;
});
