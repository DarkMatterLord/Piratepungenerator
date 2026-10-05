#!/usr/bin/env python3
"""Detect the local ELDEN RING install and modding toolchain (read-only).

Answers "what actually exists here?" before any modding work starts: game
layout and exe version, whether archives are unpacked, which mod loaders and
editors are present, the sound bank format, and where saves live. Nothing in
the game folder is written, renamed or launched.

A tool reported "not found" means "not found in the folders searched", not
"not installed"; pass every folder you keep tools in with --tools.

Usage:
    python tools/er_detect.py --game "D:/SteamLibrary/steamapps/common/ELDEN RING" --tools D:/modding
"""
from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import os
import shutil
import struct
import sys
from pathlib import Path

try:
    import tomllib
except ImportError:  # Python 3.10
    tomllib = None

TOOL_VERSION = "1.0.0"
MOD_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_REPORT_DIR = MOD_ROOT / "reports" / "elden_ring"
TOOL_SCAN_DEPTH = 4

CORE_FILES = {
    "exe": "eldenring.exe",
    "regulation": "regulation.bin",
    "eac_launcher": "start_protected_game.exe",
}
ARCHIVES = ["Data0", "Data1", "Data2", "Data3", "DLC"]
# Folders that exist only once the BDT archives have been unpacked (e.g. by UXM).
UNPACKED_MARKERS = ["action", "chr", "event", "map", "menu", "msg", "param", "parts", "sfx"]

# Never descend into these while looking for tools: unpacked game data is huge.
TOOL_SCAN_SKIP = {*UNPACKED_MARKERS, "asset", "cutscene", "expression", "font", "movie", "other",
                  "script", "sd", "shader", "sound", "easyanticheat", ".git", "node_modules"}

# Tool name -> case-insensitive filename globs. Extend freely.
TOOLS = {
    "me3": ["me3.exe", "me3-launcher.exe", "me3"],
    "ModEngine2": ["modengine2_launcher.exe"],
    "Smithbox": ["smithbox*.exe"],
    "WitchyBND": ["witchybnd*.exe"],
    "UXM": ["uxm*.exe"],
    "DSAnimStudio": ["dsanimstudio*.exe"],
    "DarkScript3": ["darkscript3*.exe"],
    "DSMapStudio": ["dsmapstudio*.exe"],
    "FLVER_Editor": ["flver*editor*.exe"],
    "Yabber": ["yabber*.exe"],
    "HKLib": ["hklib*.exe"],
    "Blender": ["blender.exe", "blender"],
}

# Pipeline stage -> (tools that can do it, what the stage covers).
STAGES = {
    "loader": (["me3", "ModEngine2"], "load a loose-file mod folder offline"),
    "unpack": (["UXM", "Smithbox"], "read base game files (UXM unpack, or a Smithbox build that reads packed data)"),
    "params": (["Smithbox", "WitchyBND"], "CharaInitParam / EquipParamWeapon / SpEffectParam / AtkParam / Bullet edits"),
    "text": (["Smithbox", "WitchyBND", "Yabber"], "class name, item names and descriptions (FMG)"),
    "events": (["DarkScript3"], "EMEVD scripting for But It Refused re-arming and SAVE/LOAD"),
    "animation_events": (["DSAnimStudio"], "TAE: hitboxes, i-frames, cancel windows, VFX/SFX spawns"),
    "animation_import": (["DSAnimStudio", "HKLib"], "new or retimed HKX animations"),
    "models": (["Blender"], "author the Chara outfit/knife meshes"),
    "model_import": (["FLVER_Editor", "Smithbox"], "FLVER import, materials, dummy polys"),
}


def find_game_dir(path: Path) -> Path | None:
    for candidate in (path / "Game", path):
        if (candidate / CORE_FILES["exe"]).is_file():
            return candidate
    return None


def pe_file_version(path: Path) -> str | None:
    """FileVersion from the VS_FIXEDFILEINFO block, found by its signature."""
    sig = struct.pack("<I", 0xFEEF04BD)
    tail = b""
    with open(path, "rb") as fh:
        while True:
            block = fh.read(1 << 23)
            if not block:
                return None
            buf = tail + block
            start = 0
            while (i := buf.find(sig, start)) != -1:
                if i + 16 > len(buf):
                    break
                struc, ms, ls = struct.unpack_from("<III", buf, i + 4)
                if struc == 0x00010000:
                    return f"{ms >> 16}.{ms & 0xFFFF}.{ls >> 16}.{ls & 0xFFFF}"
                start = i + 1
            tail = buf[-64:]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def walk_limited(root: Path, depth: int, skip: set[str] = frozenset()):
    base = len(root.parts)
    for dirpath, dirs, files in os.walk(root):
        if len(Path(dirpath).parts) - base >= depth:
            dirs[:] = []
        dirs[:] = sorted(d for d in dirs if d.lower() not in skip)
        yield Path(dirpath), sorted(files)


def find_tools(search_dirs: list[Path]) -> dict[str, list[str]]:
    found: dict[str, list[str]] = {name: [] for name in TOOLS}
    for root in search_dirs:
        if not root.is_dir():
            continue
        for dirpath, files in walk_limited(root, TOOL_SCAN_DEPTH, TOOL_SCAN_SKIP):
            for f in files:
                low = f.lower()
                for name, pats in TOOLS.items():
                    if any(fnmatch.fnmatch(low, p) for p in pats):
                        found[name].append(str(dirpath / f))
    for name, pats in TOOLS.items():
        for p in pats:
            if "*" not in p and (hit := shutil.which(p)) and hit not in found[name]:
                found[name].append(hit)
    return found


def read_toml(path: Path) -> tuple[dict | None, str | None]:
    if tomllib is None:
        return None, "tomllib unavailable (Python < 3.11); config not parsed"
    try:
        return tomllib.loads(path.read_text(encoding="utf-8")), None
    except (tomllib.TOMLDecodeError, UnicodeDecodeError) as exc:
        return None, f"{path.name}: {exc}"


def loader_configs(search_dirs: list[Path]) -> tuple[list[dict], list[str]]:
    configs, warnings = [], []
    for root in search_dirs:
        if not root.is_dir():
            continue
        for dirpath, files in walk_limited(root, TOOL_SCAN_DEPTH, TOOL_SCAN_SKIP):
            for f in files:
                p = dirpath / f
                if f.lower() == "config_eldenring.toml":
                    data, err = read_toml(p)
                    entry = {"loader": "ModEngine2", "path": str(p)}
                    if data is not None:
                        ml = data.get("extension", {}).get("mod_loader", {})
                        entry["mod_loader_enabled"] = ml.get("enabled")
                        entry["mods"] = ml.get("mods", [])
                        entry["external_dlls"] = data.get("modengine", {}).get("external_dlls", [])
                    configs.append(entry)
                    if err:
                        warnings.append(err)
                elif f.lower().endswith(".me3"):
                    data, err = read_toml(p)
                    entry = {"loader": "me3", "path": str(p)}
                    if data is not None:
                        entry["keys"] = sorted(data)
                        entry["packages"] = data.get("packages", [])
                        entry["natives"] = data.get("natives", [])
                    configs.append(entry)
                    if err:
                        warnings.append(err)
    return configs, warnings


def sound_format(sd_dir: Path) -> dict:
    if not sd_dir.is_dir():
        return {"present": False}
    hist: dict[str, int] = {}
    for _, files in walk_limited(sd_dir, 3):
        for f in files:
            ext = Path(f).suffix.lower() or "(none)"
            hist[ext] = hist.get(ext, 0) + 1
    if hist.get(".fsb") or hist.get(".fev"):
        guess = "FMOD banks (.fsb/.fev)"
    elif hist.get(".bnk") or hist.get(".wem"):
        guess = "Wwise banks (.bnk/.wem)"
    elif hist.get(".bdt") or hist.get(".bhd"):
        guess = "packed BHD/BDT archive; unpack to determine the bank format"
    else:
        guess = "unknown"
    return {"present": True, "extensions": dict(sorted(hist.items())), "inference": guess}


def save_files(save_dir: Path | None) -> dict:
    if save_dir is None:
        appdata = os.environ.get("APPDATA")
        save_dir = Path(appdata) / "EldenRing" if appdata else None
    if save_dir is None or not save_dir.is_dir():
        return {"searched": str(save_dir) if save_dir else None, "files": []}
    files = []
    for dirpath, names in walk_limited(save_dir, 3):
        for f in names:
            if f.lower().endswith((".sl2", ".co2", ".bak")):
                p = dirpath / f
                files.append({"path": str(p), "size": p.stat().st_size})
    return {"searched": str(save_dir), "files": files}


def detect(game: Path | None, tool_dirs: list[Path], save_dir: Path | None = None) -> dict:
    warnings: list[str] = []
    report: dict = {"tool": "er_detect", "tool_version": TOOL_VERSION}

    game_dir = find_game_dir(game) if game else None
    if game and not game_dir:
        warnings.append(f"no {CORE_FILES['exe']} under {game} or {game}/Game")
    report["game_dir"] = str(game_dir) if game_dir else None

    if game_dir:
        core = {}
        for key, name in CORE_FILES.items():
            p = game_dir / name
            core[key] = {"present": p.is_file(), "size": p.stat().st_size if p.is_file() else None}
        if core["exe"]["present"]:
            core["exe"]["file_version"] = pe_file_version(game_dir / CORE_FILES["exe"])
        if core["regulation"]["present"]:
            core["regulation"]["sha256"] = sha256_file(game_dir / CORE_FILES["regulation"])
        core["eac_folder"] = {"present": (game_dir / "EasyAntiCheat").is_dir()}
        report["core"] = core
        report["archives"] = {
            a: all((game_dir / f"{a}.{ext}").is_file() for ext in ("bhd", "bdt")) for a in ARCHIVES
        }
        report["dlc_installed"] = report["archives"]["DLC"]
        markers = [m for m in UNPACKED_MARKERS if (game_dir / m).is_dir()]
        report["unpacked"] = {
            "state": "unpacked" if len(markers) == len(UNPACKED_MARKERS)
            else "partial" if markers else "packed",
            "folders_present": markers,
        }
        report["sound"] = sound_format(game_dir / "sd")
        report["dll_mod_loader"] = {
            "dinput8_dll": (game_dir / "dinput8.dll").is_file(),
            "mods_folder": (game_dir / "mods").is_dir(),
        }
        coop = (game_dir / "SeamlessCoop").is_dir() or any(game_dir.glob("ersc_launcher*.exe"))
        report["seamless_coop_present"] = coop
        if coop:
            warnings.append("Seamless Co-op is installed: this project is offline-only; never load "
                            "the Chara mod through an online/co-op launcher")
        if core["eac_launcher"]["present"]:
            warnings.append("start_protected_game.exe is the online (EAC) launcher: start the modded game "
                            "only through the mod loader, which runs it offline")
        if report["sound"].get("present") is False:
            warnings.append("no sd/ folder: sound format could not be inspected")

    search = list(tool_dirs) + ([game_dir.parent] if game_dir else [])
    tools = find_tools(search)
    report["tools"] = {name: {"found": bool(hits), "paths": hits} for name, hits in tools.items()}
    configs, cfg_warnings = loader_configs(search)
    report["loader_configs"] = configs
    warnings += cfg_warnings
    report["saves"] = save_files(save_dir)
    if report["saves"]["files"]:
        warnings.append("back up every .sl2 save before the first modded launch")

    stages = {}
    for stage, (needs, what) in STAGES.items():
        have = [t for t in needs if tools[t]]
        stages[stage] = {"ready": bool(have), "using": have, "needs_one_of": needs, "covers": what}
    if game_dir and report["unpacked"]["state"] == "packed" and not tools["UXM"]:
        stages["unpack"]["note"] = "archives are packed and UXM was not found; confirm your Smithbox reads packed data"
    report["stages"] = stages
    report["warnings"] = warnings
    return report


def render_markdown(r: dict) -> str:
    lines = ["# ELDEN RING environment", ""]
    if r["game_dir"]:
        core = r["core"]
        lines += [
            f"- Game folder: `{r['game_dir']}`",
            f"- eldenring.exe file version: {core['exe'].get('file_version') or 'unknown'}",
            f"- regulation.bin SHA-256: `{core['regulation'].get('sha256', 'missing')}`",
            f"- DLC (Shadow of the Erdtree) archives: {'yes' if r['dlc_installed'] else 'no'}",
            f"- Archive state: {r['unpacked']['state']} ({', '.join(r['unpacked']['folders_present']) or 'no unpacked folders'})",
            f"- Sound: {r['sound'].get('inference', 'n/a')}",
            f"- EAC launcher present: {core['eac_launcher']['present']}; Seamless Co-op: {r['seamless_coop_present']}",
        ]
    else:
        lines.append("- Game folder: **not found** (pass --game)")
    lines += ["", "## Tools", "", "| Tool | Found | Path |", "|---|---|---|"]
    for name, t in r["tools"].items():
        lines.append(f"| {name} | {'yes' if t['found'] else 'no'} | {'<br>'.join(t['paths'][:3])} |")
    lines += ["", "## Pipeline stages", "", "| Stage | Ready | Using | Needs one of | Covers |", "|---|---|---|---|---|"]
    for stage, s in r["stages"].items():
        lines.append(f"| {stage} | {'yes' if s['ready'] else '**no**'} | {', '.join(s['using'])} | "
                     f"{', '.join(s['needs_one_of'])} | {s['covers']} |")
    if r["loader_configs"]:
        lines += ["", "## Loader configs", ""]
        for c in r["loader_configs"]:
            lines.append(f"- {c['loader']}: `{c['path']}`")
    lines += ["", "## Saves", "", f"Searched: `{r['saves']['searched']}`", ""]
    lines += [f"- `{f['path']}` ({f['size']} bytes)" for f in r["saves"]["files"]] or ["- none found"]
    if r["warnings"]:
        lines += ["", "## Warnings", "", *(f"- {w}" for w in r["warnings"])]
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--game", type=Path, help="ELDEN RING install folder (or its Game subfolder)")
    ap.add_argument("--tools", type=Path, action="append", default=[], help="folder holding mod tools (repeatable)")
    ap.add_argument("--saves", type=Path, help="save folder (default: %%APPDATA%%/EldenRing)")
    ap.add_argument("--report-dir", type=Path, default=DEFAULT_REPORT_DIR)
    args = ap.parse_args(argv)
    if not args.game and not args.tools:
        ap.error("pass --game and/or --tools")

    report = detect(args.game, args.tools, args.saves)
    args.report_dir.mkdir(parents=True, exist_ok=True)
    (args.report_dir / "er_environment.json").write_text(json.dumps(report, indent=2))
    (args.report_dir / "er_environment.md").write_text(render_markdown(report))
    print(f"report written to {args.report_dir}")
    for w in report["warnings"]:
        print(f"warning: {w}")
    return 0 if report["game_dir"] or not args.game else 1


if __name__ == "__main__":
    sys.exit(main())
