# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_data_files

basic_pitch_data = collect_data_files("basic_pitch")
hidden_imports = [
    "basic_pitch.inference",
    "basic_pitch.note_creation",
    "onnxruntime",
    "resampy.filters",
]

a = Analysis(
    ["../python/transcribe.py"],
    pathex=[],
    binaries=[],
    datas=basic_pitch_data,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=["packaging/runtime_numba.py"],
    excludes=["coremltools", "tensorflow", "tflite_runtime", "torch"],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="polyphonic-transcriber",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch="arm64",
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="polyphonic-transcriber",
)
