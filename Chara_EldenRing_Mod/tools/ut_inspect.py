#!/usr/bin/env python3
"""Inventory (and optionally extract) Chara-relevant resources from a local
UNDERTALE install, for personal offline modding only.

Reads GameMaker: Studio 1.x "FORM" data files (data.win / game.unx / game.ios)
with the standard library alone. Game files are opened read-only and are never
modified. Extracted assets go to a git-ignored folder and must not be
redistributed.

Classification is a keyword heuristic over resource *names* and string-table
text. A hit means "worth a human look", not "confirmed Chara asset"; the
grading rules live in docs/CHARA_INTEGRATION_ANALYSIS.md.

Usage:
    python tools/ut_inspect.py "C:/Program Files (x86)/Steam/steamapps/common/Undertale"
    python tools/ut_inspect.py path/to/data.win --extract
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import shutil
import struct
import sys
from dataclasses import asdict, dataclass
from pathlib import Path

TOOL_VERSION = "1.0.0"
MOD_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_REPORT_DIR = MOD_ROOT / "reports" / "undertale"
DEFAULT_EXTRACT_DIR = MOD_ROOT / "local_assets" / "undertale"

DATA_FILE_NAMES = ("data.win", "game.unx", "game.ios", "game.droid")
PNG_SIG = b"\x89PNG\r\n\x1a\n"
MAX_STRING = 1 << 20
MAX_FRAMES = 10_000
LOOSE_SCAN_DEPTH = 3

# Chunks whose entries all start with a pointer to the resource name.
NAMED_CHUNKS = {
    "sprites": "SPRT",
    "sounds": "SOND",
    "backgrounds": "BGND",
    "objects": "OBJT",
    "rooms": "ROOM",
    "scripts": "SCPT",
    "fonts": "FONT",
    "paths": "PATH",
    "timelines": "TMLN",
    "shaders": "SHDR",
    "audio_groups": "AGRP",
}

# Keyword heuristics over lower-cased resource names. Short words are anchored
# to "_" boundaries so that e.g. "white" never matches "hit".
CATEGORY_PATTERNS = {
    "chara": [r"chara(?!ct)"],
    "knife_slash": [r"knife", r"knives", r"slash", r"stab", r"(^|_)cut(_|$|\d)"],
    "soul_heart": [r"soul", r"heart"],
    "determination": [r"determin"],
    "save_load": [r"save", r"(^|_)load"],
    "reset_erase": [r"reset", r"erase"],
    "damage_hurt": [r"hurt", r"damage", r"(^|_)dmg", r"(^|_)hit(_|$|\d)"],
    "death_gameover": [r"game_?over", r"(^|_)(death|dead|die|dies|dying)(_|$|\d)", r"shatter"],
    "battle_transition": [r"battle", r"encounter"],
    "menu_ui": [r"menu", r"(^|_)(select|confirm|cursor|choice|choose)(_|$|\d)"],
}
_CATEGORY_RES = {k: [re.compile(p) for p in v] for k, v in CATEGORY_PATTERNS.items()}

# Phrases searched for in the string table (dialogue, item text, identifiers).
DIALOGUE_PHRASES = {
    "but_it_refused": r"but it refused",
    "chara_name": r"\bchara\b",
    "true_name": r"true name",
    "erase": r"\berase\b",
    "determination": r"determination",
    "real_knife": r"real knife",
    "locket": r"\blocket\b",
    "fallen_or_first_human": r"fallen human|first human",
}
_DIALOGUE_RES = {k: re.compile(p, re.IGNORECASE) for k, p in DIALOGUE_PHRASES.items()}
DIALOGUE_EXAMPLES = 5
EXAMPLE_CHARS = 160


class FormatError(Exception):
    """The file is not a GameMaker FORM file this tool can read."""


@dataclass
class Sound:
    name: str
    flags: int
    type: str | None
    file: str | None
    volume: float
    group_id: int | None
    audio_id: int | None


@dataclass
class Sprite:
    name: str
    width: int
    height: int
    origin: tuple[int, int]
    frame_ptrs: list[int] | None  # None: GameMaker 2 layout, frames not read


@dataclass
class TexturePageItem:
    src_x: int
    src_y: int
    src_w: int
    src_h: int
    tgt_x: int
    tgt_y: int
    tgt_w: int
    tgt_h: int
    bound_w: int
    bound_h: int
    page: int


class FormFile:
    """Read-only view over a GameMaker IFF ("FORM") data file."""

    def __init__(self, data: bytes, path: Path | None = None):
        self.data = data
        self.path = path
        if len(data) < 8 or data[:4] != b"FORM":
            raise FormatError("missing FORM header; not a GameMaker data file")
        end = 8 + self.u32(4)
        if end > len(data):
            raise FormatError("FORM size exceeds file size (file truncated?)")
        self.chunks: dict[str, tuple[int, int]] = {}
        self.chunk_order: list[str] = []
        pos = 8
        while pos + 8 <= end:
            name = data[pos:pos + 4].decode("ascii", "replace")
            size = self.u32(pos + 4)
            if pos + 8 + size > end:
                raise FormatError(f"chunk {name!r} at {pos:#x} overruns the FORM")
            self.chunks[name] = (pos + 8, size)
            self.chunk_order.append(name)
            pos += 8 + size

    @classmethod
    def open(cls, path: Path) -> "FormFile":
        with open(path, "rb") as fh:
            return cls(fh.read(), Path(path))

    # -- primitive reads ---------------------------------------------------
    def _check(self, off: int, n: int) -> None:
        if off < 0 or off + n > len(self.data):
            raise FormatError(f"read of {n} bytes at {off:#x} is out of bounds")

    def u16(self, off: int) -> int:
        self._check(off, 2)
        return struct.unpack_from("<H", self.data, off)[0]

    def u32(self, off: int) -> int:
        self._check(off, 4)
        return struct.unpack_from("<I", self.data, off)[0]

    def i32(self, off: int) -> int:
        self._check(off, 4)
        return struct.unpack_from("<i", self.data, off)[0]

    def f32(self, off: int) -> float:
        self._check(off, 4)
        return struct.unpack_from("<f", self.data, off)[0]

    def cstring(self, ptr: int) -> str | None:
        """Resolve a GameMaker string reference.

        References point at the characters; a u32 length precedes them and a
        NUL follows. Falls back to scanning for the NUL if the prefix is off.
        """
        if ptr == 0:
            return None
        self._check(ptr, 1)
        if ptr >= 4:
            n = struct.unpack_from("<I", self.data, ptr - 4)[0]
            if n <= MAX_STRING and ptr + n < len(self.data) and self.data[ptr + n] == 0:
                return self.data[ptr:ptr + n].decode("utf-8", "replace")
        end = self.data.find(b"\0", ptr, ptr + MAX_STRING)
        if end < 0:
            raise FormatError(f"unterminated string at {ptr:#x}")
        return self.data[ptr:end].decode("utf-8", "replace")

    def pointer_list(self, chunk: str) -> list[int]:
        if chunk not in self.chunks:
            return []
        off, size = self.chunks[chunk]
        if size < 4:
            return []
        count = self.u32(off)
        if 4 + 4 * count > size:
            raise FormatError(f"{chunk}: {count} pointers do not fit in a {size}-byte chunk")
        return [self.u32(off + 4 + 4 * i) for i in range(count)]

    # -- structured reads --------------------------------------------------
    def general_info(self) -> dict:
        if "GEN8" not in self.chunks:
            return {}
        off, size = self.chunks["GEN8"]
        if size < 60:
            return {"bytecode_version": self.data[off + 1] if size > 1 else None}
        return {
            "bytecode_version": self.data[off + 1],
            "file_name": self.cstring(self.u32(off + 4)),
            "name": self.cstring(self.u32(off + 40)),
            "version": [self.u32(off + 44 + 4 * i) for i in range(4)],
        }

    def strings(self) -> list[str]:
        return [self.cstring(p + 4) or "" for p in self.pointer_list("STRG") if p]

    def names(self, chunk: str) -> list[str]:
        return [self.cstring(self.u32(p)) or "" for p in self.pointer_list(chunk) if p]

    def sounds(self) -> list[Sound]:
        linked = (self.general_info().get("bytecode_version") or 0) >= 14
        out = []
        for p in self.pointer_list("SOND"):
            if not p:
                continue
            out.append(Sound(
                name=self.cstring(self.u32(p)) or "",
                flags=self.u32(p + 4),
                type=self.cstring(self.u32(p + 8)),
                file=self.cstring(self.u32(p + 12)),
                volume=round(self.f32(p + 20), 4),
                group_id=self.i32(p + 28) if linked else None,
                audio_id=self.i32(p + 32) if linked else None,
            ))
        return out

    def sprites(self) -> list[Sprite]:
        out = []
        for p in self.pointer_list("SPRT"):
            if not p:
                continue
            marker = self.i32(p + 56)
            frames = None
            if marker != -1:
                if marker > MAX_FRAMES:
                    raise FormatError(f"sprite at {p:#x} claims {marker} frames")
                frames = [self.u32(p + 60 + 4 * i) for i in range(marker)]
            out.append(Sprite(
                name=self.cstring(self.u32(p)) or "",
                width=self.u32(p + 4),
                height=self.u32(p + 8),
                origin=(self.i32(p + 48), self.i32(p + 52)),
                frame_ptrs=frames,
            ))
        return out

    def texture_page_item(self, ptr: int) -> TexturePageItem:
        return TexturePageItem(*(self.u16(ptr + 2 * i) for i in range(11)))

    def texture_pages(self) -> list[int | None]:
        """Offset of each embedded texture-page PNG (None if not embedded).

        The entry layout grew extra fields across GameMaker versions, so the
        data pointer is located by checking which field points at a PNG.
        """
        pages = []
        for p in self.pointer_list("TXTR"):
            found = None
            for k in (4, 8, 12, 16):
                try:
                    q = self.u32(p + k)
                except FormatError:
                    break
                if q and self.data[q:q + 8] == PNG_SIG:
                    found = q
                    break
            pages.append(found)
        return pages

    def png_at(self, off: int) -> bytes:
        pos = off + 8
        while True:
            self._check(pos, 8)
            n = struct.unpack_from(">I", self.data, pos)[0]
            kind = self.data[pos + 4:pos + 8]
            pos += 12 + n
            if pos > len(self.data):
                raise FormatError(f"PNG at {off:#x} is truncated")
            if kind == b"IEND":
                return self.data[off:pos]

    def audio_blob(self, index: int) -> bytes:
        ptrs = self.pointer_list("AUDO")
        if not 0 <= index < len(ptrs):
            raise FormatError(f"audio index {index} not in AUDO ({len(ptrs)} entries)")
        p = ptrs[index]
        n = self.u32(p)
        self._check(p + 4, n)
        return self.data[p + 4:p + 4 + n]


# -- discovery -------------------------------------------------------------
def find_data_file(target: Path) -> Path:
    if target.is_file():
        return target
    if not target.is_dir():
        raise FileNotFoundError(f"{target} does not exist")
    for depth_glob in ("", "*/", "*/*/", "*/*/*/"):
        for name in DATA_FILE_NAMES:
            hits = sorted(target.glob(depth_glob + name))
            if hits:
                return hits[0]
    raise FileNotFoundError(f"no {'/'.join(DATA_FILE_NAMES)} found under {target}")


def classify(name: str) -> list[str]:
    low = name.lower()
    return [cat for cat, pats in _CATEGORY_RES.items() if any(p.search(low) for p in pats)]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for block in iter(lambda: fh.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def scan_loose_files(game_dir: Path, skip: Path) -> list[dict]:
    out = []
    base_depth = len(game_dir.parts)
    for root, dirs, files in os.walk(game_dir):
        if len(Path(root).parts) - base_depth >= LOOSE_SCAN_DEPTH:
            dirs[:] = []
        dirs.sort()
        for f in sorted(files):
            p = Path(root) / f
            if p.resolve() == skip.resolve():
                continue
            out.append({
                "path": p.relative_to(game_dir).as_posix(),
                "size": p.stat().st_size,
                "categories": classify(p.stem),
            })
    return out


def dialogue_hits(strings: list[str]) -> dict:
    hits = {}
    for key, rx in _DIALOGUE_RES.items():
        matches = [s for s in strings if rx.search(s)]
        hits[key] = {
            "count": len(matches),
            "examples": [m[:EXAMPLE_CHARS] for m in matches[:DIALOGUE_EXAMPLES]],
        }
    return hits


def inventory(data_path: Path, game_dir: Path | None = None) -> tuple[dict, FormFile]:
    form = FormFile.open(data_path)
    game_dir = game_dir or data_path.parent
    warnings = []
    info = form.general_info()
    if (info.get("bytecode_version") or 0) < 14:
        warnings.append("bytecode < 14: sound-to-audio linkage not read; embedded audio cannot be matched by name")

    resources = {key: form.names(chunk) for key, chunk in NAMED_CHUNKS.items()}
    sounds = form.sounds()
    sprites = form.sprites()
    if any(s.frame_ptrs is None for s in sprites):
        warnings.append("GameMaker 2 sprite layout detected; sprite frames not extracted")

    categories: dict[str, dict[str, list[str]]] = {c: {} for c in CATEGORY_PATTERNS}
    for kind, names in resources.items():
        for n in names:
            for cat in classify(n):
                categories[cat].setdefault(kind, []).append(n)
    loose = scan_loose_files(game_dir, data_path)
    for f in loose:
        for cat in f["categories"]:
            categories[cat].setdefault("loose_files", []).append(f["path"])

    report = {
        "tool": "ut_inspect",
        "tool_version": TOOL_VERSION,
        "evidence_note": (
            "Categories are keyword matches on names/text only. Each hit must be "
            "reviewed and graded (Chara canon / player-Frisk / generic / adaptation) "
            "before use."
        ),
        "source": {
            "data_file": str(data_path),
            "size": data_path.stat().st_size,
            "sha256": sha256_file(data_path),
        },
        "general_info": info,
        "chunks": [
            {"name": n, "offset": form.chunks[n][0], "size": form.chunks[n][1]}
            for n in form.chunk_order
        ],
        "counts": {k: len(v) for k, v in resources.items()} | {
            "strings": len(form.pointer_list("STRG")),
            "texture_pages": len(form.pointer_list("TXTR")),
            "embedded_audio": len(form.pointer_list("AUDO")),
            "loose_files": len(loose),
        },
        "sounds": [asdict(s) for s in sounds],
        "sprites": [
            {"name": s.name, "width": s.width, "height": s.height, "origin": list(s.origin),
             "frames": None if s.frame_ptrs is None else len(s.frame_ptrs)}
            for s in sprites
        ],
        "resources": resources,
        "categories": categories,
        "dialogue": dialogue_hits(form.strings()),
        "loose_files": loose,
        "warnings": warnings,
    }
    return report, form


# -- extraction ------------------------------------------------------------
def _safe(name: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.-]", "_", name) or "unnamed"


def _audio_ext(blob: bytes) -> str:
    if blob[:4] == b"RIFF":
        return ".wav"
    if blob[:4] == b"OggS":
        return ".ogg"
    return ".bin"


def _is_within(child: Path, parent: Path) -> bool:
    try:
        child.resolve().relative_to(parent.resolve())
        return True
    except ValueError:
        return False


def extract(report: dict, form: FormFile, out_dir: Path, categories: list[str] | None = None,
            use_pillow: bool | None = None) -> dict:
    """Write the selected categories' sprites and sounds under out_dir.

    Returns the manifest that is also written to out_dir/MANIFEST.json.
    """
    data_path = Path(report["source"]["data_file"])
    game_dir = data_path.parent
    if _is_within(out_dir, game_dir):
        raise ValueError("refusing to extract inside the game folder; keep the install clean")
    if use_pillow is None:
        try:
            import PIL.Image  # noqa: F401
            use_pillow = True
        except ImportError:
            use_pillow = False

    wanted = categories or list(CATEGORY_PATTERNS)
    unknown = sorted(set(wanted) - set(CATEGORY_PATTERNS))
    if unknown:
        raise ValueError(f"unknown categories: {', '.join(unknown)}")
    pick = {kind: set() for kind in ("sprites", "sounds", "loose_files")}
    for cat in wanted:
        for kind in pick:
            pick[kind].update(report["categories"][cat].get(kind, []))

    out_dir.mkdir(parents=True, exist_ok=True)
    entries = []

    def record(path: Path, source: str) -> None:
        entries.append({
            "path": path.relative_to(out_dir).as_posix(),
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "source": source,
        })

    # Sprites: crop frames with Pillow, otherwise dump pages plus an atlas.
    pages = form.texture_pages()
    page_cache: dict[int, bytes] = {}
    decoded: dict = {}
    atlas = []
    sprite_dir = out_dir / "sprites"
    for sprite in form.sprites():
        if sprite.name not in pick["sprites"] or sprite.frame_ptrs is None:
            continue
        for i, ptr in enumerate(sprite.frame_ptrs):
            item = form.texture_page_item(ptr)
            if item.page >= len(pages) or pages[item.page] is None:
                continue
            if item.page not in page_cache:
                page_cache[item.page] = form.png_at(pages[item.page])
            sprite_dir.mkdir(exist_ok=True)
            if use_pillow:
                from PIL import Image
                if item.page not in decoded:
                    decoded[item.page] = Image.open(io.BytesIO(page_cache[item.page])).convert("RGBA")
                crop = decoded[item.page].crop((item.src_x, item.src_y,
                                      item.src_x + item.src_w, item.src_y + item.src_h))
                if (item.tgt_w, item.tgt_h) != (item.src_w, item.src_h) and item.tgt_w and item.tgt_h:
                    crop = crop.resize((item.tgt_w, item.tgt_h), Image.NEAREST)
                canvas = Image.new("RGBA", (max(item.bound_w, 1), max(item.bound_h, 1)), (0, 0, 0, 0))
                canvas.paste(crop, (item.tgt_x, item.tgt_y))
                dest = sprite_dir / f"{_safe(sprite.name)}_{i}.png"
                canvas.save(dest)
                record(dest, f"SPRT:{sprite.name}#{i}")
            else:
                atlas.append({"sprite": sprite.name, "frame": i, "page_file": f"texture_{item.page}.png"}
                             | asdict(item))
    if not use_pillow:
        for page, png in sorted(page_cache.items()):
            dest = sprite_dir / f"texture_{page}.png"
            dest.write_bytes(png)
            record(dest, f"TXTR#{page}")
        if atlas:
            (sprite_dir / "atlas.json").write_text(json.dumps(atlas, indent=2))

    # Sounds: embedded audio (data file or audiogroupN.dat) or the external file.
    sound_dir = out_dir / "sounds"
    groups: dict[int, FormFile] = {0: form}
    loose_lookup = {Path(f["path"]).name.lower(): f["path"] for f in report["loose_files"]}
    for snd in form.sounds():
        if snd.name not in pick["sounds"]:
            continue
        sound_dir.mkdir(exist_ok=True)
        if snd.audio_id is not None and snd.audio_id >= 0:
            gid = snd.group_id or 0
            if gid not in groups:
                gpath = game_dir / f"audiogroup{gid}.dat"
                if not gpath.exists():
                    continue
                groups[gid] = FormFile.open(gpath)
            blob = groups[gid].audio_blob(snd.audio_id)
            dest = sound_dir / f"{_safe(snd.name)}{_audio_ext(blob)}"
            dest.write_bytes(blob)
            record(dest, f"SOND:{snd.name} -> AUDO[{gid}]#{snd.audio_id}")
        elif snd.file and snd.file.lower() in loose_lookup:
            src = game_dir / loose_lookup[snd.file.lower()]
            dest = sound_dir / _safe(src.name)
            shutil.copy2(src, dest)
            record(dest, f"SOND:{snd.name} -> {loose_lookup[snd.file.lower()]}")

    loose_dir = out_dir / "loose"
    for rel in sorted(pick["loose_files"]):
        src = game_dir / rel
        if src.suffix.lower() not in (".ogg", ".wav", ".png"):
            continue
        loose_dir.mkdir(exist_ok=True)
        dest = loose_dir / _safe(rel.replace("/", "__"))
        shutil.copy2(src, dest)
        record(dest, f"loose:{rel}")

    manifest = {
        "tool": "ut_inspect",
        "tool_version": TOOL_VERSION,
        "source_sha256": report["source"]["sha256"],
        "categories": wanted,
        "pillow_used": use_pillow,
        "files": entries,
    }
    (out_dir / "MANIFEST.json").write_text(json.dumps(manifest, indent=2))
    (out_dir / "DO_NOT_REDISTRIBUTE.txt").write_text(
        "These files were extracted from a personally owned UNDERTALE install for\n"
        "private, offline modding. They are copyrighted by their owners. Do not\n"
        "commit, upload, or share them. Anyone else must extract from their own copy.\n"
    )
    return manifest


# -- reporting -------------------------------------------------------------
def render_markdown(report: dict) -> str:
    info = report["general_info"]
    lines = [
        "# UNDERTALE inventory",
        "",
        f"- Data file: `{report['source']['data_file']}`",
        f"- SHA-256: `{report['source']['sha256']}`",
        f"- Game name: {info.get('name')!s}; bytecode {info.get('bytecode_version')!s}; "
        f"version {'.'.join(map(str, info.get('version', []))) or 'n/a'}",
        f"- Chunks: {', '.join(c['name'] for c in report['chunks'])}",
        "",
        "> " + report["evidence_note"],
        "",
        "## Counts",
        "",
        "| Resource | Count |",
        "|---|---|",
        *(f"| {k} | {v} |" for k, v in report["counts"].items()),
        "",
        "## Candidate resources by category",
        "",
    ]
    for cat, kinds in report["categories"].items():
        total = sum(len(v) for v in kinds.values())
        lines.append(f"### {cat} ({total})")
        lines.append("")
        if not total:
            lines.append("_no name matches_")
        for kind, names in sorted(kinds.items()):
            shown = ", ".join(f"`{n}`" for n in names[:40])
            more = f" … (+{len(names) - 40})" if len(names) > 40 else ""
            lines.append(f"- **{kind}**: {shown}{more}")
        lines.append("")
    lines += ["## String-table phrase hits", "", "| Phrase | Hits | First example |", "|---|---|---|"]
    for key, hit in report["dialogue"].items():
        ex = hit["examples"][0].replace("|", "\\|").replace("\n", " ") if hit["examples"] else ""
        lines.append(f"| {key} | {hit['count']} | {ex} |")
    if report["warnings"]:
        lines += ["", "## Warnings", "", *(f"- {w}" for w in report["warnings"])]
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("target", type=Path, help="UNDERTALE folder or its data.win/game.unx/game.ios")
    ap.add_argument("--report-dir", type=Path, default=DEFAULT_REPORT_DIR)
    ap.add_argument("--extract", action="store_true", help="also extract matched sprites/sounds")
    ap.add_argument("--extract-dir", type=Path, default=DEFAULT_EXTRACT_DIR)
    ap.add_argument("--categories", help="comma-separated subset of: " + ", ".join(CATEGORY_PATTERNS))
    args = ap.parse_args(argv)

    try:
        data_path = find_data_file(args.target)
        game_dir = args.target if args.target.is_dir() else data_path.parent
        report, form = inventory(data_path, game_dir)
    except (FileNotFoundError, FormatError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    args.report_dir.mkdir(parents=True, exist_ok=True)
    (args.report_dir / "undertale_inventory.json").write_text(json.dumps(report, indent=2))
    (args.report_dir / "undertale_inventory.md").write_text(render_markdown(report))
    print(f"inventory written to {args.report_dir}")
    for w in report["warnings"]:
        print(f"warning: {w}")

    if args.extract:
        cats = [c.strip() for c in args.categories.split(",")] if args.categories else None
        try:
            manifest = extract(report, form, args.extract_dir, cats)
        except ValueError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 2
        print(f"extracted {len(manifest['files'])} files to {args.extract_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
