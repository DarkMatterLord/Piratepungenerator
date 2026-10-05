import json
import os
import struct
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))

import er_detect  # noqa: E402


def fake_exe(version=(1, 16, 0, 0), pad=1 << 23) -> bytes:
    """PE-ish bytes whose VS_FIXEDFILEINFO straddles the scanner's 8 MiB block edge."""
    a, b, c, d = version
    info = struct.pack("<IIII", 0xFEEF04BD, 0x00010000, (a << 16) | b, (c << 16) | d)
    decoy = struct.pack("<II", 0xFEEF04BD, 0x12345678)  # signature with wrong struct version
    return b"MZ" + decoy + b"\0" * (pad - 12) + info + b"\0" * 64


def touch(path: Path, data: bytes = b"") -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return path


def snapshot(root: Path) -> dict:
    return {str(p.relative_to(root)): (p.stat().st_size, p.stat().st_mtime_ns)
            for p in sorted(root.rglob("*"))}


class Detect(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.install = self.root / "ELDEN RING"
        game = self.install / "Game"
        touch(game / "eldenring.exe", fake_exe((1, 16, 0, 0)))
        touch(game / "regulation.bin", b"regulation")
        touch(game / "start_protected_game.exe")
        (game / "EasyAntiCheat").mkdir()
        for a in ("Data0", "Data1", "Data2", "Data3"):
            touch(game / f"{a}.bhd")
            touch(game / f"{a}.bdt")
        touch(game / "sd" / "enus" / "x.fsb")
        touch(game / "sd" / "main.fev")
        for d in ("chr", "parts", "msg"):
            (game / d).mkdir()

        self.tools = self.root / "modding"
        touch(self.tools / "Smithbox" / "Smithbox.exe")
        touch(self.tools / "DSAnimStudio" / "DSAnimStudio.exe")
        touch(self.tools / "ME2" / "modengine2_launcher.exe")
        (self.tools / "ME2" / "config_eldenring.toml").write_text(
            '[modengine]\nexternal_dlls = []\n'
            '[extension.mod_loader]\nenabled = true\n'
            'mods = [ { enabled = true, name = "chara", path = "chara-mod" } ]\n')
        touch(self.tools / "deep" / "a" / "b" / "c" / "d" / "e" / "UXM.exe")  # beyond scan depth
        self.saves = self.root / "saves" / "76561190000000000"
        touch(self.saves / "ER0000.sl2", b"x" * 10)

    def tearDown(self):
        self.tmp.cleanup()

    def detect(self):
        with mock.patch.object(er_detect.shutil, "which", return_value=None):
            return er_detect.detect(self.install, [self.tools], self.saves.parent)

    def test_core_layout(self):
        r = self.detect()
        self.assertTrue(r["game_dir"].endswith("Game"))
        self.assertEqual(r["core"]["exe"]["file_version"], "1.16.0.0")
        self.assertTrue(r["core"]["eac_folder"]["present"])
        self.assertFalse(r["dlc_installed"])
        self.assertTrue(r["archives"]["Data3"])
        self.assertEqual(r["unpacked"]["state"], "partial")
        self.assertEqual(r["sound"]["inference"], "FMOD banks (.fsb/.fev)")

    def test_game_dir_accepts_game_subfolder(self):
        self.assertEqual(er_detect.find_game_dir(self.install / "Game"), self.install / "Game")
        self.assertIsNone(er_detect.find_game_dir(self.root))

    def test_tools_and_stages(self):
        r = self.detect()
        self.assertTrue(r["tools"]["Smithbox"]["found"])
        self.assertTrue(r["tools"]["ModEngine2"]["found"])
        self.assertFalse(r["tools"]["UXM"]["found"], "UXM sits beyond the scan depth")
        self.assertFalse(r["tools"]["DarkScript3"]["found"])
        self.assertTrue(r["stages"]["params"]["ready"])
        self.assertEqual(r["stages"]["loader"]["using"], ["ModEngine2"])
        self.assertFalse(r["stages"]["events"]["ready"])

    @unittest.skipIf(er_detect.tomllib is None, "tomllib needs Python 3.11")
    def test_modengine_config_parsed(self):
        cfg = self.detect()["loader_configs"][0]
        self.assertEqual(cfg["loader"], "ModEngine2")
        self.assertEqual(cfg["mods"], [{"enabled": True, "name": "chara", "path": "chara-mod"}])

    def test_saves_and_warnings(self):
        r = self.detect()
        self.assertEqual(len(r["saves"]["files"]), 1)
        text = " ".join(r["warnings"])
        self.assertIn("start_protected_game.exe", text)
        self.assertIn("back up", text)
        self.assertNotIn("Seamless", text)

    def test_seamless_coop_warning(self):
        (self.install / "Game" / "SeamlessCoop").mkdir()
        r = self.detect()
        self.assertTrue(r["seamless_coop_present"])
        self.assertIn("Seamless Co-op", " ".join(r["warnings"]))

    def test_wwise_and_packed_inference(self):
        sd = self.root / "sd2"
        touch(sd / "a.bnk")
        self.assertEqual(er_detect.sound_format(sd)["inference"], "Wwise banks (.bnk/.wem)")
        sd3 = self.root / "sd3"
        touch(sd3 / "sd.bhd")
        self.assertIn("packed", er_detect.sound_format(sd3)["inference"])

    def test_game_folder_is_never_modified(self):
        before = snapshot(self.install)
        rc = er_detect.main(["--game", str(self.install), "--tools", str(self.tools),
                             "--saves", str(self.saves.parent), "--report-dir", str(self.root / "rep")])
        self.assertEqual(rc, 0)
        self.assertEqual(snapshot(self.install), before)
        report = json.loads((self.root / "rep" / "er_environment.json").read_text())
        self.assertEqual(report["core"]["regulation"]["size"], len(b"regulation"))
        self.assertIn("| Smithbox | yes |", (self.root / "rep" / "er_environment.md").read_text())

    def test_missing_game_returns_nonzero(self):
        rc = er_detect.main(["--game", str(self.root / "nope"), "--report-dir", str(self.root / "rep")])
        self.assertEqual(rc, 1)

    def test_unpacked_skip_keeps_tool_scan_out_of_game_data(self):
        touch(self.install / "Game" / "chr" / "Smithbox.exe")
        r = self.detect()
        self.assertFalse(any("chr" in p for p in r["tools"]["Smithbox"]["paths"]))


if __name__ == "__main__":
    unittest.main()
