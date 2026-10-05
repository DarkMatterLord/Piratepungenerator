import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools"))

import balance  # noqa: E402
import verify_params  # noqa: E402

CONFIG = balance.load_json(balance.BALANCE)
BINDINGS = balance.load_json(balance.BINDINGS)


def mutated(path: str, value, profile: str = "balanced") -> dict:
    cfg = copy.deepcopy(CONFIG)
    node = cfg["profiles"][profile]
    *parents, leaf = path.split(".")
    for p in parents:
        node = node.setdefault(p, {})
    node[leaf] = value
    return cfg


class Validation(unittest.TestCase):
    def test_shipped_config_is_valid(self):
        self.assertEqual(balance.validate(CONFIG), [])

    def test_vanilla_reference_is_self_consistent(self):
        ref = CONFIG["vanilla_reference"]
        for vals in ref["classes"].values():
            self.assertEqual(vals[0], sum(vals[1:]) - ref["level_offset"])

    def assertRejected(self, cfg, fragment):
        errors = balance.validate(cfg)
        self.assertTrue(any(fragment in e for e in errors), f"{fragment!r} not in {errors}")

    def test_refusal_must_be_finite(self):
        self.assertRejected(mutated("refusal.charges", 0), "refusal.charges")
        self.assertRejected(mutated("refusal.charges", 2), "refusal.charges")  # balanced allows 1
        self.assertRejected(mutated("refusal.charges", 99, "lore"), "refusal.charges")
        self.assertRejected(mutated("refusal.rearm", "never_resets"), "refusal.rearm")

    def test_environmental_deaths_stay_lethal_in_every_profile(self):
        for prof in ("balanced", "lore", "challenge"):
            for k in balance.NEVER_REFUSE:
                self.assertRejected(mutated(f"refusal.applies_to.{k}", True, prof), k)

    def test_refusal_hp_and_iframes(self):
        self.assertRejected(mutated("refusal.hp_after_trigger", 50), "hp_after_trigger")
        self.assertRejected(mutated("refusal.invulnerable_s", 10), "invulnerable_s")

    def test_class_level_must_match_stats(self):
        self.assertRejected(mutated("class.level", 1), "does not match stats")

    def test_balanced_stat_caps(self):
        cfg = mutated("class.stats.dexterity", 30)
        cfg["profiles"]["balanced"]["class"]["level"] = 22
        errors = balance.validate(cfg)
        self.assertTrue(any("dexterity 30 exceeds" in e for e in errors), errors)
        self.assertTrue(any("highest vanilla starting level" in e for e in errors), errors)

    def test_challenge_keeps_low_vigor(self):
        cfg = mutated("class.stats", {**CONFIG["profiles"]["challenge"]["class"]["stats"], "vigor": 14, "arcane": 8},
                      "challenge")
        self.assertRejected(cfg, "vigor 14 exceeds 10")

    def test_determination_rules(self):
        self.assertRejected(mutated("determination.grants_invulnerability", True), "grants_invulnerability")
        self.assertRejected(mutated("determination.stackable", True), "stackable")
        self.assertRejected(mutated("determination.attack_mult", 1.5), "attack_mult")

    def test_red_slash_is_not_a_spell(self):
        self.assertRejected(mutated("red_slash.range_m", 25), "red_slash.range_m")

    def test_erase_rules(self):
        self.assertRejected(mutated("erase.bypasses_phase_transitions", True), "phase_transitions")
        self.assertRejected(mutated("erase.fp_cost", 5), "erase.fp_cost")
        self.assertRejected(mutated("erase.startup_s", 0.2), "startup_s")
        cfg = mutated("erase.fp_cost", 5)
        cfg["profiles"]["balanced"]["erase"]["enabled"] = False
        self.assertFalse(any("erase.fp_cost" in e for e in balance.validate(cfg)))

    def test_save_load_cannot_restore_progress(self):
        self.assertRejected(mutated("save_load.restores", ["position", "hp", "runes"]), "runes")
        self.assertRejected(mutated("save_load.enabled", True), "requires status")

    def test_inheritance(self):
        lore = balance.resolve(CONFIG, "lore")
        self.assertEqual(lore["red_slash"]["width_m"], CONFIG["profiles"]["balanced"]["red_slash"]["width_m"])
        self.assertEqual(lore["red_slash"]["range_m"], 8.0)
        self.assertEqual(lore["tier"], "lore")
        cyc = copy.deepcopy(CONFIG)
        cyc["profiles"]["balanced"]["inherits"] = "lore"
        self.assertTrue(any("cycle" in e for e in balance.validate(cyc)))

    def test_default_profile_must_exist(self):
        cfg = copy.deepcopy(CONFIG)
        cfg["default_profile"] = "nope"
        self.assertTrue(any("default_profile" in e for e in balance.validate(cfg)))


class Docs(unittest.TestCase):
    def test_balance_doc_is_current(self):
        self.assertEqual(balance.main(["doc", "--check"]), 0,
                         "docs/BALANCE_VALUES.md is stale: run python tools/balance.py doc")


class Worksheet(unittest.TestCase):
    def edits(self, ws):
        return {e["semantic"]: e for e in ws["edits"]}

    def test_resolves_rows_and_ops(self):
        e = self.edits(balance.worksheet(CONFIG, BINDINGS, "balanced"))
        self.assertEqual((e["class.stats.vigor"]["param"], e["class.stats.vigor"]["row_id"],
                          e["class.stats.vigor"]["field"], e["class.stats.vigor"]["value"]),
                         ("CharaInitParam", 3003, "baseVit", 14))
        self.assertEqual(e["class.starting_equipment.right_hand"]["value"], 20260000)
        self.assertEqual(e["real_knife.critical"]["value"], 40)
        self.assertFalse(any(x["verified"] for x in e.values()))

    def test_every_binding_points_at_a_real_balance_key(self):
        keys = set(balance.flatten({s: balance.resolve(CONFIG, "balanced")[s] for s in balance.SECTIONS}))
        self.assertEqual(sorted(set(BINDINGS["fields"]) - keys), [])
        for b in BINDINGS["fields"].values():
            self.assertIn(b["row"], BINDINGS["rows"])
            self.assertTrue(("field" in b) != ("reference" in b), b)


def write_csv(path: Path, header: list[str], rows: list[list]):
    path.write_text("\n".join(",".join(map(str, r)) for r in [header, *rows]) + "\n", encoding="utf-8")


class Verify(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        slots = BINDINGS["rows"]["class"]["by_slot"]
        fields = [b["field"] for b in BINDINGS["fields"].values() if b.get("row") == "class" and "field" in b]
        header = ["ID", "Name", *fields]
        rows = []
        for cls, rid in slots.items():
            vals = dict(zip(verify_params.CLASS_STAT_FIELDS, CONFIG["vanilla_reference"]["classes"][cls]))
            rows.append([rid, cls, *(vals.get(f, 0) for f in fields)])
        write_csv(self.dir / "CharaInitParam.csv", header, rows)
        wfields = [b["field"] for b in BINDINGS["fields"].values()
                   if "field" in b and BINDINGS["rows"][b["row"]]["param"] == "EquipParamWeapon"]
        write_csv(self.dir / "EquipParamWeapon.csv", ["ID", "Name", *wfields], [[1000000, "Dagger", *[0] * len(wfields)]])
        write_csv(self.dir / "SpEffectParam.csv", ["ID", "Name", "effectEndurance"], [[1, "x", 0]])
        write_csv(self.dir / "Bullet.csv", ["ID", "Name"], [[1, "x"]])
        write_csv(self.dir / "AtkParam_Pc.csv", ["ID", "Name"], [[1, "x"]])

    def tearDown(self):
        self.tmp.cleanup()

    def test_all_bound_fields_found(self):
        r = verify_params.verify(BINDINGS, self.dir, CONFIG)
        failed = {k: v for k, v in r["fields"].items() if not v["ok"]}
        self.assertEqual(failed, {k: v for k, v in failed.items() if "physicsAttackPowerRate" in v["detail"]})
        self.assertTrue(r["rows"]["class"]["ok"])
        self.assertTrue(r["rows"]["real_knife"]["ok"])
        self.assertTrue(all(c["ok"] for c in r["vanilla_check"].values()))

    def test_detects_wrong_field_reserved_collision_and_stat_mismatch(self):
        text = (self.dir / "CharaInitParam.csv").read_text().replace("baseVit", "BASEVIT").replace("\n3009,wretch,1,", "\n3009,wretch,2,")
        (self.dir / "CharaInitParam.csv").write_text(text)
        with open(self.dir / "SpEffectParam.csv", "a") as fh:
            fh.write("2026010,taken,0\n")
        r = verify_params.verify(BINDINGS, self.dir, CONFIG)
        self.assertIn("case differs: BASEVIT", r["fields"]["class.stats.vigor"]["detail"])
        self.assertFalse(r["rows"]["refusal_invuln"]["ok"])
        self.assertFalse(verify_params.all_ok(r))

    def test_vanilla_mismatch_reported(self):
        path = self.dir / "CharaInitParam.csv"
        lines = path.read_text().splitlines()
        lines = [ln.replace("3009,wretch,1,", "3009,wretch,2,") for ln in lines]
        path.write_text("\n".join(lines) + "\n")
        r = verify_params.verify(BINDINGS, self.dir, CONFIG)
        self.assertFalse(r["vanilla_check"]["wretch"]["ok"])
        self.assertTrue(r["vanilla_check"]["bandit"]["ok"])

    def test_record_feeds_worksheet(self):
        out = self.dir / "verification.json"
        rc = verify_params.main(["--csv-dir", str(self.dir), "--record", "--out", str(out)])
        self.assertEqual(rc, 1)  # physicsAttackPowerRate column absent from the fake SpEffectParam
        ver = json.loads(out.read_text())
        e = {x["semantic"]: x for x in balance.worksheet(CONFIG, BINDINGS, "balanced", ver)["edits"]}
        self.assertTrue(e["class.stats.vigor"]["verified"])
        self.assertTrue(e["determination.duration_s"]["verified"])
        self.assertFalse(e["determination.attack_mult"]["verified"])
        self.assertFalse(e["determination.poise_mult"]["verified"], "reference-only edits never auto-verify")

    def test_missing_csv_dir(self):
        self.assertEqual(verify_params.main(["--csv-dir", str(self.dir / "nope")]), 2)


if __name__ == "__main__":
    unittest.main()
