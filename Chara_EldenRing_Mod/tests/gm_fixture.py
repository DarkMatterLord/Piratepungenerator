"""Builds a tiny synthetic GameMaker FORM file for tests.

Contains no UNDERTALE data: every name, string, image and sound below is made
up, but laid out the way GameMaker: Studio 1.4 (bytecode 16) lays out data.win.
"""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

RED = (255, 0, 0, 255)
GREEN = (0, 255, 0, 255)

STRINGS = [
    "UNDERTALE", "config",
    "spr_chara_test", "spr_tree", "spr_character_select", "spr_gms2_style",
    "snd_knife_slash", "snd_soul_shatter", "mus_save_theme",
    ".wav", ".ogg", "", "mus_save_theme.ogg",
    "obj_savepoint", "obj_whitebox", "room_battle_test",
    "* But it refused.", "* The true name.", "* Chara.",
]

# (name, frames as (src_x, src_y)) - every frame is a 4x4 cut of the 8x8 page.
SPRITES = [("spr_chara_test", [(0, 0)]), ("spr_tree", [(4, 0)]), ("spr_character_select", [(0, 4)])]
# (name, type, file, audio_id)
SOUNDS = [
    ("snd_knife_slash", ".wav", "", 0),
    ("snd_soul_shatter", ".ogg", "", 1),
    ("mus_save_theme", ".ogg", "mus_save_theme.ogg", -1),
]
WAV = b"RIFF" + struct.pack("<I", 36) + b"WAVEfmt " + struct.pack("<IHHIIHH", 16, 1, 1, 8000, 8000, 1, 8) + b"data\0\0\0\0"
OGG = b"OggS" + b"\0" * 24
AUDIO = [WAV, OGG]


def p32(v: int) -> bytes:
    return struct.pack("<i" if v < 0 else "<I", v)


def make_png(w: int, h: int, pixel) -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    rows = b"".join(b"\0" + b"".join(bytes(pixel(x, y)) for x in range(w)) for y in range(h))
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows))
            + chunk(b"IEND", b""))


PAGE_PNG = make_png(8, 8, lambda x, y: RED if x < 4 else GREEN)


class _Builder:
    """Two-pass layout: pass one measures, pass two fills in real offsets."""

    def __init__(self):
        self.labels: dict[str, int] = {}

    def at(self, label: str) -> int:
        return self.labels.get(label, 0)

    def build(self, chunk_fns) -> bytes:
        for _ in range(2):
            out = bytearray(b"FORM\0\0\0\0")
            labels = {}
            for name, fn in chunk_fns:
                body, rel = fn(self)
                start = len(out) + 8
                labels.update({k: start + v for k, v in rel.items()})
                out += name.encode() + struct.pack("<I", len(body)) + body
            struct.pack_into("<I", out, 4, len(out) - 8)
            self.labels = labels
        return bytes(out)


def _list_chunk(entries: list[bytes], prefix: str, extra_labels=None):
    """count + pointer list + entries; entry i is labelled f'{prefix}{i}'."""
    head = 4 + 4 * len(entries)
    body = bytearray()
    rel = {}
    for i, e in enumerate(entries):
        rel[f"{prefix}{i}"] = head + len(body)
        body += e
    return head, body, rel


def _strg(b: _Builder):
    entries = [struct.pack("<I", len(s.encode())) + s.encode() + b"\0" for s in STRINGS]
    head, body, rel = _list_chunk(entries, "strhdr:")
    for i, s in enumerate(STRINGS):
        rel[f"str:{s}"] = rel[f"strhdr:{i}"] + 4
    ptrs = b"".join(p32(b.at(f"strhdr:{i}")) for i in range(len(STRINGS)))
    return p32(len(STRINGS)) + ptrs + bytes(body), rel


def _gen8(b: _Builder):
    body = (bytes([0, 16]) + b"\0\0"
            + p32(b.at("str:UNDERTALE")) + p32(b.at("str:config"))
            + p32(0) * 3 + b"\0" * 16
            + p32(b.at("str:UNDERTALE"))
            + p32(1) + p32(0) + p32(0) + p32(8)
            + b"\0" * 40)
    return body, {}


def _named(chunk_prefix: str, names: list[str]):
    def fn(b: _Builder):
        entries = [p32(b.at(f"str:{n}")) + p32(0) * 3 for n in names]
        head, body, rel = _list_chunk(entries, chunk_prefix)
        ptrs = b"".join(p32(b.at(f"{chunk_prefix}{i}")) for i in range(len(names)))
        return p32(len(names)) + ptrs + bytes(body), rel
    return fn


def _sond(b: _Builder):
    entries = []
    for name, typ, file, audio_id in SOUNDS:
        entries.append(p32(b.at(f"str:{name}")) + p32(0x64) + p32(b.at(f"str:{typ}"))
                       + p32(b.at(f"str:{file}")) + p32(0) + struct.pack("<ff", 1.0, 0.0)
                       + p32(0) + p32(audio_id))
    head, body, rel = _list_chunk(entries, "sond:")
    ptrs = b"".join(p32(b.at(f"sond:{i}")) for i in range(len(entries)))
    return p32(len(entries)) + ptrs + bytes(body), rel


def _sprt(b: _Builder):
    entries = []
    frame_no = 0
    for name, frames in SPRITES:
        e = p32(b.at(f"str:{name}")) + p32(6) + p32(6) + p32(0) * 4 + p32(1) + p32(0) * 2 + p32(0) * 2 + p32(3) + p32(3)
        e += p32(len(frames))
        for _ in frames:
            e += p32(b.at(f"tpag:{frame_no}"))
            frame_no += 1
        e += p32(0)  # mask count
        entries.append(e)
    # A GameMaker 2 style entry: -1 marker after the common header.
    entries.append(p32(b.at("str:spr_gms2_style")) + p32(4) * 2 + p32(0) * 11 + p32(-1) + p32(1) + p32(0))
    head, body, rel = _list_chunk(entries, "sprt:")
    ptrs = b"".join(p32(b.at(f"sprt:{i}")) for i in range(len(entries)))
    return p32(len(entries)) + ptrs + bytes(body), rel


def _tpag(b: _Builder):
    entries = []
    for _, frames in SPRITES:
        for sx, sy in frames:
            # src 4x4 placed at (1,1) inside a 6x6 bounding box, page 0
            entries.append(struct.pack("<11H", sx, sy, 4, 4, 1, 1, 4, 4, 6, 6, 0) + b"\0\0")
    head, body, rel = _list_chunk(entries, "tpag:")
    ptrs = b"".join(p32(b.at(f"tpag:{i}")) for i in range(len(entries)))
    return p32(len(entries)) + ptrs + bytes(body), rel


def _txtr(b: _Builder):
    head = 8
    entry = p32(1) + p32(b.at("png:0"))
    rel = {"txtr:0": head, "png:0": head + len(entry)}
    return p32(1) + p32(b.at("txtr:0")) + entry + PAGE_PNG, rel


def _audo(b: _Builder):
    entries = [p32(len(a)) + a for a in AUDIO]
    head, body, rel = _list_chunk(entries, "audo:")
    ptrs = b"".join(p32(b.at(f"audo:{i}")) for i in range(len(entries)))
    return p32(len(entries)) + ptrs + bytes(body), rel


def build_datawin() -> bytes:
    return _Builder().build([
        ("GEN8", _gen8),
        ("SOND", _sond),
        ("SPRT", _sprt),
        ("OBJT", _named("objt:", ["obj_savepoint", "obj_whitebox"])),
        ("ROOM", _named("room:", ["room_battle_test"])),
        ("TPAG", _tpag),
        ("STRG", _strg),
        ("TXTR", _txtr),
        ("AUDO", _audo),
    ])


def make_game_dir(root: Path) -> Path:
    """Write a fake install: data.win plus a loose music file and an ini."""
    game = root / "UNDERTALE"
    game.mkdir(parents=True)
    (game / "data.win").write_bytes(build_datawin())
    (game / "mus_save_theme.ogg").write_bytes(OGG)
    (game / "options.ini").write_text("[x]\n")
    return game
