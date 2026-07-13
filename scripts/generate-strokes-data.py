"""Build app/lib/data/player-seasons.json from split sources.

Data is intentionally split so the two halves have different lifecycles:

  * seasons-historical.json  -- 2004..2025. Set in stone; generated once and
    committed. Never regenerated here.
  * scripts/sg-data/2026/*.xlsx  -- one file per week. Drop a new workbook in
    this folder each week; the newest file wins automatically. If no new file
    is added, the latest existing one keeps being used.

Run `npm run update-sg` (or `python3 scripts/generate-strokes-data.py`) after
dropping a new weekly 2026 file to regenerate the merged output the app imports.
"""

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
HISTORICAL = ROOT / "app/lib/data/seasons-historical.json"
WEEKLY_2026_DIR = ROOT / "scripts/sg-data/2026"
OUTPUT = ROOT / "app/lib/data/player-seasons.json"


def latest_weekly_file(folder: Path) -> Path:
    candidates = [p for p in folder.glob("*.xlsx") if not p.name.startswith("~$")]
    if not candidates:
        raise FileNotFoundError(f"No 2026 .xlsx files found in {folder}")
    # Newest by modification time wins, so a plain re-run always picks up the
    # most recently dropped week without editing this script.
    return max(candidates, key=lambda p: p.stat().st_mtime)


def load_2026_records(path: Path) -> list[dict]:
    # The weekly workbook keeps its data on a sheet named strokes_gained_2026,
    # but fall back to the first sheet so a renamed export still works.
    xl = pd.ExcelFile(path)
    sheet = "strokes_gained_2026" if "strokes_gained_2026" in xl.sheet_names else xl.sheet_names[0]
    frame = pd.read_excel(path, sheet_name=sheet)

    records = []
    for row in frame.to_dict("records"):
        year = int(row["year"])
        records.append(
            {
                "id": f"{row['player_id']}_{year}",
                "playerId": row["player_id"],
                "player": row["player"],
                "year": year,
                "sg": {
                    "putting": round(float(row["sg_putt"]), 2),
                    "aroundGreen": round(float(row["sg_arg"]), 2),
                    "approach": round(float(row["sg_app"]), 2),
                    "offTee": round(float(row["sg_ott"]), 2),
                },
            }
        )
    return records


def main() -> None:
    historical = json.loads(HISTORICAL.read_text(encoding="utf-8"))

    weekly = latest_weekly_file(WEEKLY_2026_DIR)
    current = load_2026_records(weekly)

    records = historical + current
    records.sort(key=lambda r: (r["playerId"], r["year"]))

    OUTPUT.write_text(json.dumps(records, separators=(",", ":")), encoding="utf-8")
    print(f"Historical (<=2025): {len(historical)} records")
    print(f"2026 from {weekly.name}: {len(current)} records")
    print(f"Wrote {len(records)} records to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
