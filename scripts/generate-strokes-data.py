import json
from pathlib import Path

import pandas as pd

SOURCE = Path(
    "/Users/wyatt/Documents/Codex/2026-07-07/build-a-polished-next-js-plus/outputs/sg_import/strokes_gained_db_import_2004_2026.xlsx"
)
OUTPUT = Path("app/lib/data/player-seasons.json")


def main() -> None:
    sheet = pd.read_excel(SOURCE, sheet_name="strokes_gained")
    records = []

    for row in sheet.to_dict("records"):
        # Keep the payload intentionally flat so future modes can sample and
        # filter seasons without knowing anything about the original workbook.
        records.append(
            {
                "id": f"{row['player_id']}_{int(row['year'])}",
                "playerId": row["player_id"],
                "player": row["player"],
                "year": int(row["year"]),
                "sg": {
                    "putting": round(float(row["sg_putt"]), 2),
                    "aroundGreen": round(float(row["sg_arg"]), 2),
                    "approach": round(float(row["sg_app"]), 2),
                    "offTee": round(float(row["sg_ott"]), 2),
                },
            }
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(records, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(records)} records to {OUTPUT}")


if __name__ == "__main__":
    main()
