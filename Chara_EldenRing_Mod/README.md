# Chara — The Fallen Human (UNDERTALE × ELDEN RING, offline mod workspace)

Status: **pre-implementation.** Neither game's files have been inspected yet. This
workspace was started in a cloud session that had no access to either install, so
the first step is to run the scanners below on the PC where the games are installed.

Requires Python 3.10+ (3.11+ to parse mod-loader TOML). Pillow is optional; with it,
sprite frames are cropped individually.

## 1. Scan your installs (read-only)

Neither script writes to the game folders. Reports go to `reports/`, which git ignores.

```bat
python tools\ut_inspect.py "C:\Program Files (x86)\Steam\steamapps\common\Undertale"
python tools\er_detect.py --game "C:\Program Files (x86)\Steam\steamapps\common\ELDEN RING" --tools "C:\path\to\your\modding\tools"
```

Adjust the paths if your Steam library is on another drive (see Steam → Settings →
Storage). Pass `--tools` once for each folder where you keep Smithbox, me3/Mod Engine 2,
DSAnimStudio and similar tools.

This produces:

- `reports/undertale/undertale_inventory.{md,json}`: sprite, sound, object and room
  names grouped by Chara-relevant category, plus hits for key lines in the string
  table. Lists names only; no assets.
- `reports/elden_ring/er_environment.{md,json}`: game version, packed or unpacked
  state, mod loaders, tools found, sound bank format, saves, and safety warnings.

To extract the matched UNDERTALE sprites and sounds for your own personal use,
run `ut_inspect.py ... --extract`. Files go to `local_assets/` (git-ignored). Don't
redistribute them.

## 2. Verify param names before editing anything

Export the params listed in `config/param_bindings.json` from your `regulation.bin`
to CSV in Smithbox, then run:

```bat
python tools\verify_params.py --csv-dir C:\path\to\csv-exports --record
python tools\balance.py worksheet
```

## Balance

All numbers are in `config/balance.json`, which has three profiles: `balanced`
(the default), `lore` and `challenge`. Check them with `python tools/balance.py validate`.
`docs/BALANCE_VALUES.md` is generated with `python tools/balance.py doc`.

## Tests

```bat
python -m unittest discover -s tests
```

The tests build synthetic stand-ins for the games. No game data is needed or committed.
