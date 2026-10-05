#!/usr/bin/env python3
"""Validate Chara balance profiles, regenerate docs/BALANCE_VALUES.md, and
emit a profile-resolved param worksheet.

    python tools/balance.py validate
    python tools/balance.py doc [--check]
    python tools/balance.py worksheet [--profile balanced] [--out build/params_balanced.json]

config/balance.json is the only place numbers are edited. The worksheet joins
a resolved profile with config/param_bindings.json (and, once
tools/verify_params.py has run, config/param_verification.json) so every
planned regulation edit shows whether its field/row was checked against the
user's own game files.
"""
from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

MOD_ROOT = Path(__file__).resolve().parent.parent
BALANCE = MOD_ROOT / "config" / "balance.json"
BINDINGS = MOD_ROOT / "config" / "param_bindings.json"
VERIFICATION = MOD_ROOT / "config" / "param_verification.json"
DOC = MOD_ROOT / "docs" / "BALANCE_VALUES.md"

# Never relaxed by any profile: these keep Chara from breaking progression.
HARD_RULES = [
    "But It Refused never triggers on kill planes, scripted deaths, Deathblight, or lethal falls.",
    "But It Refused has a finite number of charges (1-3) and only re-arms through a grace/map reload or a consumable.",
    "But It Refused leaves Chara at exactly 1 HP and grants at most 3 s of invulnerability.",
    "Determination never grants invulnerability and does not stack with itself.",
    "Red Slash reaches at most 10 m: it is a sword extension, not a spell.",
    "ERASE costs at least 40 FP, has at least 1.0 s of startup and recovery, and never skips boss phase transitions.",
    "SAVE/LOAD may only restore position and HP: never runes, items, flags, NPC or boss state.",
    "SAVE/LOAD stays disabled until it is implemented and tested (status must start with 'implemented').",
]
TIER_CAPS = {
    "balanced": {"stat_headroom": 1, "max_attack_mult": 1.15, "max_knife_vs_donor": 1.25,
                 "max_critical": 150, "max_charges": 1, "max_vigor": None, "max_level": None},
    "challenge": {"stat_headroom": None, "max_attack_mult": 1.25, "max_knife_vs_donor": 1.35,
                  "max_critical": 170, "max_charges": 1, "max_vigor": 10, "max_level": None},
    "lore": {"stat_headroom": None, "max_attack_mult": 1.30, "max_knife_vs_donor": 1.6,
             "max_critical": 200, "max_charges": 3, "max_vigor": None, "max_level": 60},
}
REARM_MODES = {"map_reload", "grace_rest", "consumable"}
NEVER_REFUSE = ("kill_plane", "scripted_death", "deathblight", "fall_damage")
SAVE_LOAD_RESTORABLE = {"position", "hp"}
SECTIONS = ["class", "real_knife", "determination", "refusal", "red_slash", "erase", "save_load"]


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def deep_merge(base: dict, over: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = copy.deepcopy(v)
    return out


def resolve(config: dict, name: str, _seen: tuple = ()) -> dict:
    profiles = config["profiles"]
    if name not in profiles:
        raise KeyError(f"unknown profile {name!r}")
    if name in _seen:
        raise ValueError(f"inheritance cycle: {' -> '.join(_seen + (name,))}")
    prof = profiles[name]
    parent = prof.get("inherits")
    base = resolve(config, parent, _seen + (name,)) if parent else {}
    merged = deep_merge(base, {k: v for k, v in prof.items() if k != "inherits"})
    merged.setdefault("tier", name)
    return merged


def flatten(d: dict, prefix: str = "") -> dict:
    out = {}
    for k, v in d.items():
        key = f"{prefix}{k}"
        if isinstance(v, dict) and v:
            out.update(flatten(v, key + "."))
        else:
            out[key] = v
    return out


def _check_profile(name: str, p: dict, ref: dict) -> list[str]:
    errs: list[str] = []

    def err(msg: str) -> None:
        errs.append(f"{name}: {msg}")

    missing = [s for s in SECTIONS if s not in p]
    if missing:
        return [f"{name}: missing sections {missing}"]
    tier = p["tier"]
    if tier not in TIER_CAPS:
        return [f"{name}: unknown tier {tier!r}"]
    caps = TIER_CAPS[tier]
    order = ref["stat_order"]

    # Class
    stats = p["class"].get("stats", {})
    if sorted(stats) != sorted(order):
        err(f"stats must be exactly {order}")
        return errs
    if not all(isinstance(v, int) and 1 <= v <= 99 for v in stats.values()):
        err("every stat must be an integer 1-99")
    level = sum(stats.values()) - ref["level_offset"]
    if p["class"].get("level") != level:
        err(f"level {p['class'].get('level')} does not match stats (sum - {ref['level_offset']} = {level})")
    if p["class"].get("replaces_slot") not in ref["classes"]:
        err(f"replaces_slot must be one of {sorted(ref['classes'])}")
    vanilla = list(ref["classes"].values())
    if tier in ("balanced", "challenge") and level > max(c[0] for c in vanilla):
        err(f"level {level} exceeds the highest vanilla starting level")
    if caps["max_level"] is not None and level > caps["max_level"]:
        err(f"level {level} exceeds {caps['max_level']}")
    if caps["stat_headroom"] is not None:
        for i, stat in enumerate(order, start=1):
            top = max(c[i] for c in vanilla) + caps["stat_headroom"]
            if stats[stat] > top:
                err(f"{stat} {stats[stat]} exceeds vanilla max + headroom ({top})")
    if caps["max_vigor"] is not None and stats["vigor"] > caps["max_vigor"]:
        err(f"vigor {stats['vigor']} exceeds {caps['max_vigor']} for this tier")

    # Real Knife
    rk = p["real_knife"]
    if rk["attack_physical_vs_donor"] > caps["max_knife_vs_donor"]:
        err(f"real_knife.attack_physical_vs_donor {rk['attack_physical_vs_donor']} > {caps['max_knife_vs_donor']}")
    if rk["critical"] > caps["max_critical"]:
        err(f"real_knife.critical {rk['critical']} > {caps['max_critical']}")

    # Determination
    det = p["determination"]
    if det["grants_invulnerability"]:
        err("determination.grants_invulnerability must be false")
    if det["stackable"]:
        err("determination.stackable must be false")
    if not 1.0 < det["attack_mult"] <= caps["max_attack_mult"]:
        err(f"determination.attack_mult must be in (1.0, {caps['max_attack_mult']}]")
    if det["fp_cost"] <= 0 or det["duration_s"] <= 0:
        err("determination needs a positive fp_cost and duration_s")

    # But It Refused
    ref_ = p["refusal"]
    charges = ref_["charges"]
    if not isinstance(charges, int) or not 1 <= charges <= caps["max_charges"]:
        err(f"refusal.charges must be an integer 1-{caps['max_charges']}")
    if ref_["rearm"] not in REARM_MODES:
        err(f"refusal.rearm must be one of {sorted(REARM_MODES)}")
    if ref_["hp_after_trigger"] != 1:
        err("refusal.hp_after_trigger must be 1")
    if not 0 < ref_["invulnerable_s"] <= 3:
        err("refusal.invulnerable_s must be in (0, 3]")
    for k in NEVER_REFUSE:
        if ref_["applies_to"].get(k, False):
            err(f"refusal.applies_to.{k} must be false (keeps environmental/scripted deaths lethal)")

    # Red Slash
    rs = p["red_slash"]
    if not 0 < rs["range_m"] <= 10:
        err("red_slash.range_m must be in (0, 10]")
    if rs["fp_cost"] <= 0:
        err("red_slash.fp_cost must be positive")

    # ERASE
    er = p["erase"]
    if er["enabled"]:
        if er["fp_cost"] < 40:
            err("erase.fp_cost must be at least 40")
        if er["startup_s"] < 1.0 or er["recovery_s"] < 1.0:
            err("erase startup_s and recovery_s must each be at least 1.0")
        if er["bypasses_phase_transitions"]:
            err("erase.bypasses_phase_transitions must be false")

    # SAVE / LOAD
    sl = p["save_load"]
    extra = set(sl["restores"]) - SAVE_LOAD_RESTORABLE
    if extra:
        err(f"save_load may not restore {sorted(extra)}")
    if not 0 <= sl["hp_restore_cap_pct"] <= 100:
        err("save_load.hp_restore_cap_pct must be 0-100")
    if sl["enabled"] and not str(sl.get("status", "")).startswith("implemented"):
        err("save_load.enabled requires status 'implemented...'")
    return errs


def validate(config: dict) -> list[str]:
    errors = []
    if config.get("default_profile") not in config.get("profiles", {}):
        errors.append(f"default_profile {config.get('default_profile')!r} is not a profile")
    ref = config["vanilla_reference"]
    for row, vals in ref["classes"].items():
        if len(vals) != 1 + len(ref["stat_order"]) or vals[0] != sum(vals[1:]) - ref["level_offset"]:
            errors.append(f"vanilla_reference.{row}: level does not match its stats")
    for name in config.get("profiles", {}):
        try:
            prof = resolve(config, name)
        except (KeyError, ValueError) as exc:
            errors.append(f"{name}: {exc}")
            continue
        try:
            errors += _check_profile(name, prof, ref)
        except KeyError as exc:
            errors.append(f"{name}: missing key {exc}")
    return errors


# -- worksheet ---------------------------------------------------------------
def _row_id(bindings: dict, row_key: str, profile: dict):
    row = bindings["rows"][row_key]
    if "by_slot" in row:
        return row["by_slot"].get(profile["class"]["replaces_slot"])
    return row.get("id")


def _apply_op(op: str | None, value, bindings: dict):
    if op == "critical_offset" and isinstance(value, (int, float)):
        return value - 100
    if op == "row_ref":
        name = value[0] if isinstance(value, list) and value else value
        return bindings["rows"].get(name, {}).get("id", name) if isinstance(name, str) else name
    return value


def worksheet(config: dict, bindings: dict, profile_name: str, verification: dict | None = None) -> dict:
    profile = resolve(config, profile_name)
    flat = flatten({s: profile[s] for s in SECTIONS})
    ver_fields = (verification or {}).get("fields", {})
    ver_rows = (verification or {}).get("rows", {})
    edits, unbound = [], []
    for key, value in flat.items():
        b = bindings["fields"].get(key)
        if b is None:
            unbound.append(key)
            continue
        row = bindings["rows"][b["row"]]
        field_ok = ver_fields.get(key, {}).get("ok", False) if "field" in b else False
        row_ok = ver_rows.get(b["row"], {}).get("ok", False)
        edits.append({
            "semantic": key,
            "design_value": value,
            "value": _apply_op(b.get("op"), value, bindings),
            "op": b.get("op", "set"),
            "param": row["param"],
            "row_key": b["row"],
            "row_id": _row_id(bindings, b["row"], profile),
            "row_kind": row["kind"],
            "field": b.get("field"),
            "reference": b.get("reference"),
            "verified": bool(field_ok and row_ok),
        })
    return {
        "profile": profile_name,
        "tier": profile["tier"],
        "edits": edits,
        "verified": sum(e["verified"] for e in edits),
        "unverified": sum(not e["verified"] for e in edits),
        "design_only": unbound,
        "design_only_note": "Not a single param field: implemented through TAE/HKS/EMEVD/FXR as described in docs/ABILITY_DESIGN.md.",
    }


# -- documentation -----------------------------------------------------------
def _fmt(v) -> str:
    if v is None:
        return "—"
    if isinstance(v, bool):
        return "yes" if v else "no"
    if isinstance(v, list):
        return ", ".join(map(str, v)) if v else "none"
    if isinstance(v, dict):
        return "; ".join(f"{k} {_fmt(x)}" for k, x in v.items())
    return str(v)


def render_doc(config: dict, bindings: dict | None = None, verification: dict | None = None) -> str:
    names = list(config["profiles"])
    resolved = {n: resolve(config, n) for n in names}
    ref = config["vanilla_reference"]
    order = ref["stat_order"]
    default = config["default_profile"]
    head = " | ".join(f"{n} (default)" if n == default else n for n in names)
    lines = [
        "# Balance values",
        "",
        "<!-- GENERATED by tools/balance.py doc from config/balance.json. Do not edit by hand. -->",
        "",
        "Every number Chara uses lives in `config/balance.json`. Change it there, then run "
        "`python tools/balance.py doc`. `_vs_donor` values scale the donor dagger's own value; "
        "`_vs_r1` values scale the Real Knife's first R1.",
        "",
        "**Status:** design targets. None of these values has been applied to or tested in a "
        "regulation.bin yet (see CHANGED_FILES.md).",
        "",
        "## Profiles",
        "",
        "| Profile | Tier | Summary |",
        "|---|---|---|",
        *(f"| {n}{' (default)' if n == default else ''} | {resolved[n]['tier']} | {resolved[n].get('summary', '')} |"
          for n in names),
        "",
        "## Starting class compared with vanilla",
        "",
        "Vanilla rows are reference values from design time, not read from your files.",
        "",
        "| Class | Lv | " + " | ".join(s[:3].upper() for s in order) + " |",
        "|---|---|" + "---|" * len(order),
    ]
    for n in names:
        st = resolved[n]["class"]["stats"]
        lines.append(f"| **CHARA – {n}** | {resolved[n]['class']['level']} | "
                     + " | ".join(str(st[s]) for s in order) + " |")
    for cls, vals in ref["classes"].items():
        lines.append(f"| {cls} | {vals[0]} | " + " | ".join(map(str, vals[1:])) + " |")
    for section in SECTIONS[1:] + ["class"]:
        flats = {n: flatten(resolved[n][section]) for n in names}
        keys = list(dict.fromkeys(k for n in names for k in flats[n]))
        if section == "class":
            keys = [k for k in keys if not k.startswith("stats.")]
            title = "class (other)"
        else:
            title = section
        lines += ["", f"## {title}", "", f"| Key | {head} |", "|---|" + "---|" * len(names)]
        for k in keys:
            lines.append(f"| `{k}` | " + " | ".join(_fmt(flats[n].get(k)) for n in names) + " |")
    lines += ["", "## Hard rules (enforced by `tools/balance.py validate`)", "",
              *(f"- {r}" for r in HARD_RULES)]
    if bindings is not None:
        ws = worksheet(config, bindings, default, verification)
        lines += ["", "## Param binding status", "",
                  f"For the default profile, {ws['verified']} of {len(ws['edits'])} bound edits are verified "
                  "against exported game params (`tools/verify_params.py`). Run "
                  "`python tools/balance.py worksheet` for the full list."]
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Chara balance tooling")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("validate")
    d = sub.add_parser("doc")
    d.add_argument("--check", action="store_true", help="fail if docs/BALANCE_VALUES.md is stale")
    w = sub.add_parser("worksheet")
    w.add_argument("--profile")
    w.add_argument("--out", type=Path)
    args = ap.parse_args(argv)

    config = load_json(BALANCE)
    errors = validate(config)
    if errors:
        print("balance.json is invalid:", *errors, sep="\n  ", file=sys.stderr)
        return 1
    bindings = load_json(BINDINGS)
    verification = load_json(VERIFICATION) if VERIFICATION.exists() else None

    if args.cmd == "validate":
        print(f"ok: {len(config['profiles'])} profiles valid")
    elif args.cmd == "doc":
        text = render_doc(config, bindings, verification)
        if args.check:
            if not DOC.exists() or DOC.read_text(encoding="utf-8") != text:
                print(f"{DOC} is stale; run: python tools/balance.py doc", file=sys.stderr)
                return 1
            print("ok: BALANCE_VALUES.md is current")
        else:
            DOC.write_text(text, encoding="utf-8")
            print(f"wrote {DOC}")
    else:
        ws = worksheet(config, bindings, args.profile or config["default_profile"], verification)
        if args.out:
            args.out.parent.mkdir(parents=True, exist_ok=True)
            args.out.write_text(json.dumps(ws, indent=2))
            print(f"wrote {args.out}")
        for e in ws["edits"]:
            target = e["field"] or f"(see: {e['reference']})"
            mark = "verified" if e["verified"] else "UNVERIFIED"
            print(f"{mark:10} {e['param']}[{e['row_id']}].{target} <- {e['value']}  ({e['semantic']}, {e['op']})")
        print(f"{ws['verified']} verified, {ws['unverified']} unverified, {len(ws['design_only'])} design-only keys")
    return 0


if __name__ == "__main__":
    sys.exit(main())
