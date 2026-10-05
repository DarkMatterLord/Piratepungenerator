import hashlib
import json
import struct
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import gm_fixture  # noqa: E402
import ut_inspect  # noqa: E402

try:
    import PIL.Image  # noqa: F401
    HAVE_PIL = True
except ImportError:
    HAVE_PIL = False


class FormParsing(unittest.TestCase):
    def setUp(self):
        self.form = ut_inspect.FormFile(gm_fixture.build_datawin())

    def test_chunks_in_file_order(self):
        self.assertEqual(self.form.chunk_order,
                         ["GEN8", "SOND", "SPRT", "OBJT", "ROOM", "TPAG", "STRG", "TXTR", "AUDO"])

    def test_general_info(self):
        info = self.form.general_info()
        self.assertEqual(info["bytecode_version"], 16)
        self.assertEqual(info["name"], "UNDERTALE")
        self.assertEqual(info["version"], [1, 0, 0, 8])

    def test_strings_include_dialogue(self):
        self.assertIn("* But it refused.", self.form.strings())

    def test_sounds_link_to_audio(self):
        sounds = {s.name: s for s in self.form.sounds()}
        self.assertEqual(sounds["snd_knife_slash"].audio_id, 0)
        self.assertEqual(sounds["snd_soul_shatter"].audio_id, 1)
        self.assertEqual(sounds["mus_save_theme"].audio_id, -1)
        self.assertEqual(sounds["mus_save_theme"].file, "mus_save_theme.ogg")

    def test_sprites_and_gms2_marker(self):
        sprites = {s.name: s for s in self.form.sprites()}
        self.assertEqual(len(sprites["spr_chara_test"].frame_ptrs), 1)
        self.assertEqual(sprites["spr_chara_test"].origin, (3, 3))
        self.assertIsNone(sprites["spr_gms2_style"].frame_ptrs)

    def test_texture_page_item(self):
        sprite = next(s for s in self.form.sprites() if s.name == "spr_tree")
        item = self.form.texture_page_item(sprite.frame_ptrs[0])
        self.assertEqual((item.src_x, item.src_y, item.src_w, item.bound_w, item.page), (4, 0, 4, 6, 0))

    def test_embedded_png_located_and_complete(self):
        pages = self.form.texture_pages()
        self.assertEqual(self.form.png_at(pages[0]), gm_fixture.PAGE_PNG)

    def test_audio_blob(self):
        self.assertEqual(self.form.audio_blob(0), gm_fixture.WAV)
        with self.assertRaises(ut_inspect.FormatError):
            self.form.audio_blob(9)


class Malformed(unittest.TestCase):
    def test_bad_magic(self):
        with self.assertRaises(ut_inspect.FormatError):
            ut_inspect.FormFile(b"RIFF\0\0\0\0")

    def test_truncated(self):
        data = gm_fixture.build_datawin()
        with self.assertRaises(ut_inspect.FormatError):
            ut_inspect.FormFile(data[:len(data) // 2])

    def test_pointer_list_overrun(self):
        # A STRG chunk that claims a million entries in 8 bytes.
        data = b"FORM" + struct.pack("<I", 16) + b"STRG" + struct.pack("<I", 8) + struct.pack("<II", 1_000_000, 0)
        with self.assertRaises(ut_inspect.FormatError):
            ut_inspect.FormFile(data).strings()


class Classification(unittest.TestCase):
    def test_categories(self):
        self.assertEqual(ut_inspect.classify("spr_chara_test"), ["chara"])
        self.assertNotIn("chara", ut_inspect.classify("spr_character_select"))
        self.assertIn("menu_ui", ut_inspect.classify("spr_character_select"))
        self.assertEqual(set(ut_inspect.classify("snd_soul_shatter")), {"soul_heart", "death_gameover"})
        self.assertEqual(ut_inspect.classify("obj_whitebox"), [])
        self.assertIn("damage_hurt", ut_inspect.classify("snd_hit2"))
        self.assertEqual(ut_inspect.classify("spr_cutscene_bg"), [])


class InventoryAndExtraction(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.game = gm_fixture.make_game_dir(self.root)
        self.data = self.game / "data.win"
        self.before = hashlib.sha256(self.data.read_bytes()).hexdigest()

    def tearDown(self):
        self.tmp.cleanup()

    def test_find_data_file_from_folder(self):
        self.assertEqual(ut_inspect.find_data_file(self.root), self.data)

    def test_inventory(self):
        report, _ = ut_inspect.inventory(self.data, self.game)
        cats = report["categories"]
        self.assertEqual(cats["chara"]["sprites"], ["spr_chara_test"])
        self.assertEqual(cats["save_load"]["objects"], ["obj_savepoint"])
        self.assertEqual(cats["save_load"]["loose_files"], ["mus_save_theme.ogg"])
        self.assertEqual(cats["battle_transition"]["rooms"], ["room_battle_test"])
        self.assertEqual(report["dialogue"]["but_it_refused"]["count"], 1)
        self.assertEqual(report["dialogue"]["chara_name"]["count"], 1)
        self.assertEqual(report["source"]["sha256"], self.before)
        self.assertIn("GameMaker 2 sprite layout", report["warnings"][0])
        md = ut_inspect.render_markdown(report)
        self.assertIn("### chara (1)", md)

    def test_extract_without_pillow(self):
        report, form = ut_inspect.inventory(self.data, self.game)
        out = self.root / "out"
        manifest = ut_inspect.extract(report, form, out, use_pillow=False)
        self.assertEqual((out / "sounds" / "snd_knife_slash.wav").read_bytes(), gm_fixture.WAV)
        self.assertEqual((out / "sounds" / "snd_soul_shatter.ogg").read_bytes(), gm_fixture.OGG)
        self.assertEqual((out / "sounds" / "mus_save_theme.ogg").read_bytes(), gm_fixture.OGG)
        self.assertEqual((out / "sprites" / "texture_0.png").read_bytes(), gm_fixture.PAGE_PNG)
        atlas = json.loads((out / "sprites" / "atlas.json").read_text())
        self.assertEqual({a["sprite"] for a in atlas}, {"spr_chara_test", "spr_character_select"})
        self.assertTrue((out / "DO_NOT_REDISTRIBUTE.txt").exists())
        on_disk = json.loads((out / "MANIFEST.json").read_text())
        self.assertEqual(on_disk, manifest)
        for f in manifest["files"]:
            self.assertEqual(hashlib.sha256((out / f["path"]).read_bytes()).hexdigest(), f["sha256"])
        # spr_tree matched no category, so it must not be referenced.
        self.assertNotIn("spr_tree", json.dumps(atlas))

    def test_extract_category_filter(self):
        report, form = ut_inspect.inventory(self.data, self.game)
        manifest = ut_inspect.extract(report, form, self.root / "out", ["chara"], use_pillow=False)
        sources = [f["source"] for f in manifest["files"]]
        self.assertEqual(sources, ["TXTR#0"])
        with self.assertRaises(ValueError):
            ut_inspect.extract(report, form, self.root / "out2", ["nope"], use_pillow=False)

    @unittest.skipUnless(HAVE_PIL, "Pillow not installed")
    def test_extract_with_pillow_crops_frames(self):
        from PIL import Image
        report, form = ut_inspect.inventory(self.data, self.game)
        out = self.root / "out"
        ut_inspect.extract(report, form, out, ["chara"], use_pillow=True)
        img = Image.open(out / "sprites" / "spr_chara_test_0.png")
        self.assertEqual(img.size, (6, 6))
        self.assertEqual(img.getpixel((0, 0)), (0, 0, 0, 0))
        self.assertEqual(img.getpixel((1, 1)), gm_fixture.RED)
        self.assertEqual(img.getpixel((4, 4)), gm_fixture.RED)

    def test_refuses_to_write_into_game_folder(self):
        report, form = ut_inspect.inventory(self.data, self.game)
        with self.assertRaises(ValueError):
            ut_inspect.extract(report, form, self.game / "extracted", use_pillow=False)

    def test_cli_leaves_game_untouched(self):
        rc = ut_inspect.main([str(self.game), "--report-dir", str(self.root / "rep"),
                              "--extract", "--extract-dir", str(self.root / "ext")])
        self.assertEqual(rc, 0)
        self.assertTrue((self.root / "rep" / "undertale_inventory.md").exists())
        self.assertEqual(hashlib.sha256(self.data.read_bytes()).hexdigest(), self.before)
        self.assertEqual(sorted(p.name for p in self.game.iterdir()),
                         ["data.win", "mus_save_theme.ogg", "options.ini"])

    def test_cli_missing_target(self):
        self.assertEqual(ut_inspect.main([str(self.root / "nowhere")]), 2)


if __name__ == "__main__":
    unittest.main()
