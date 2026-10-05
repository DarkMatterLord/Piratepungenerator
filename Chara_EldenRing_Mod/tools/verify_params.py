#!/usr/bin/env python3
"""Check config/param_bindings.json against params exported from YOUR
regulation.bin, so no field name or row ID is used on assumption.

In Smithbox's Param Editor, export each param named in the bindings to CSV
(all rows, all fields) into one folder as <ParamName>.csv, then run:

    python tools/verify_params.py --csv-dir path/to/exports [--record]

Checks: every bound field exists as a column; class rows exist; rows reserved
for new content are still free; the vanilla class table in balance.json
matches the exported CharaInitParam. --record writes
config/param_verification.json, which `tools/balance.py worksheet` uses to
mark edits as verified. Exit code 1 if any check fails.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import sys
from pathlib import Path

MOD_ROOT = Path(__file__).resolve().parent.parent
BINDINGS = MOD_ROOT / "config" / "param_bindings.json"
BALANCE = MOD_ROOT / "config" / "balance.json"
VERIFICATION = MOD_ROOT / "config" / "param_verification.json"
ID_HEADERS = ("id", "row id", "rowid", "row_id")
CLASS_STAT_FIELDS = ["soulLv", "baseVit", "baseWil", "baseEnd", "baseStr", "baseDex", "baseMag", "baseFai", "baseLuc"]


class ParamTable:
    def __init__(self, path: Path):
        raw = path.read_bytes()
        self.path = path
        self.sha256 = hashlib.sha256(raw).hexdigest()
        text = raw.decode("utf-8-sig", errors="replace")
        try:
            dialect = csv.Sniffer().sniff(text[:8192], delimiters=",;\t|")
        except csv.Error:
            dialect = csv.excel
        reader = csv.reader(io.StringIO(text), dialect)
        self.headers = [h.strip() for h in next(reader, [])]
        lower = [h.lower() for h in self.headers]
        id_col = next((lower.index(h) for h in ID_HEADERS if h in lower), 0)
        self.rows: dict[int, dict[str, str]] = {}
        for rec in reader:
            if len(rec) <= id_col:
                continue
            try:
                rid = int(rec[id_col].strip())
            except ValueError:
                continue
            self.rows[rid] = dict(zip(self.headers, (c.strip() for c in rec)))


def find_csv(csv_dir: Path, param: str) -> Path | None:
    files = sorted(p for p in csv_dir.iterdir() if p.suffix.lower() == ".csv")
    for p in files:
        if p.stem.lower() == param.lower():
            return p
    for p in files:
        if p.stem.lower().startswith(param.lower()):
            return p
    return None


def verify(bindings: dict, csv_dir: Path, balance: dict | None = None) -> dict:
    params = sorted({r["param"] for r in bindings["rows"].values()})
    tables: dict[str, ParamTable] = {}
    result: dict = {"csv_dir": str(csv_dir), "params": {}, "fields": {}, "rows": {}, "vanilla_check": {}}
    for param in params:
        path = find_csv(csv_dir, param)
        if path is None:
            result["params"][param] = {"missing": True}
            continue
        tables[param] = ParamTable(path)
        result["params"][param] = {"file": path.name, "sha256": tables[param].sha256,
                                   "rows": len(tables[param].rows)}

    for key, b in bindings["fields"].items():
        if "field" not in b:
            continue
        param = bindings["rows"][b["row"]]["param"]
        t = tables.get(param)
        if t is None:
            result["fields"][key] = {"ok": False, "detail": f"{param}.csv not exported"}
        elif b["field"] in t.headers:
            result["fields"][key] = {"ok": True, "detail": f"{param}.{b['field']} present"}
        else:
            near = [h for h in t.headers if h.lower() == b["field"].lower()]
            hint = f"; case differs: {near[0]}" if near else ""
            result["fields"][key] = {"ok": False, "detail": f"{param} has no column {b['field']!r}{hint}"}

    for key, row in bindings["rows"].items():
        t = tables.get(row["param"])
        if t is None:
            result["rows"][key] = {"ok": False, "detail": f"{row['param']}.csv not exported"}
        elif row["kind"] == "existing":
            missing = sorted(v for v in row["by_slot"].values() if v not in t.rows)
            result["rows"][key] = {"ok": not missing,
                                   "detail": f"missing rows {missing}" if missing else "all slot rows exist"}
        else:
            span = range(row["id"], row["id"] + row.get("span", 1))
            taken = [i for i in span if i in t.rows]
            result["rows"][key] = {"ok": not taken,
                                   "detail": f"IDs already used: {taken[:10]}" if taken else
                                   f"IDs {span.start}-{span.stop - 1} free"}

    if balance is not None and "class" in bindings["rows"]:
        t = tables.get(bindings["rows"]["class"]["param"])
        if t is not None and all(f in t.headers for f in CLASS_STAT_FIELDS):
            slots = bindings["rows"]["class"]["by_slot"]
            for cls, expected in balance["vanilla_reference"]["classes"].items():
                row = t.rows.get(slots.get(cls, -1))
                if row is None:
                    continue
                try:
                    actual = [int(float(row[f])) for f in CLASS_STAT_FIELDS]
                except ValueError:
                    result["vanilla_check"][cls] = {"ok": False, "detail": "non-numeric stat"}
                    continue
                result["vanilla_check"][cls] = {"ok": actual == expected, "expected": expected, "actual": actual}
    return result


def all_ok(result: dict) -> bool:
    checks = [*result["fields"].values(), *result["rows"].values(), *result["vanilla_check"].values()]
    return all(c["ok"] for c in checks)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--csv-dir", type=Path, required=True)
    ap.add_argument("--record", action="store_true", help=f"write {VERIFICATION.relative_to(MOD_ROOT)}")
    ap.add_argument("--bindings", type=Path, default=BINDINGS)
    ap.add_argument("--balance", type=Path, default=BALANCE)
    ap.add_argument("--out", type=Path, default=VERIFICATION)
    args = ap.parse_args(argv)
    if not args.csv_dir.is_dir():
        print(f"error: {args.csv_dir} is not a folder", file=sys.stderr)
        return 2

    bindings = json.loads(args.bindings.read_text(encoding="utf-8"))
    balance = json.loads(args.balance.read_text(encoding="utf-8"))
    result = verify(bindings, args.csv_dir, balance)

    for param, info in result["params"].items():
        print(f"{param:18} {'MISSING CSV' if info.get('missing') else info['file'] + ', ' + str(info['rows']) + ' rows'}")
    for section in ("fields", "rows", "vanilla_check"):
        for key, c in result[section].items():
            detail = c.get("detail") or f"expected {c['expected']} got {c['actual']}"
            print(f"{'ok  ' if c['ok'] else 'FAIL'} {section[:-1] if section != 'vanilla_check' else 'vanilla'}"
                  f" {key}: {detail}")
    ok = all_ok(result)
    print("all checks passed" if ok else "some checks failed: fix config/param_bindings.json or re-export")

    if args.record:
        args.out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
        print(f"wrote {args.out}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
