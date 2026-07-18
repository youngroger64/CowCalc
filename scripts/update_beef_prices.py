#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

BASE = "https://publicapps.agriculture.gov.ie/bpw-api/api/v1"
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "beef-prices.json"

CATEGORY_CONFIG = {
    "Steer": {"key": "steer", "grade": "R3"},
    "Heifer": {"key": "heifer", "grade": "R3"},
    "Cow": {"key": "cow", "grade": "O4"},
    "Bull": {"key": "bull", "grade": "O2"},
    "Young Bull": {"key": "youngBull", "grade": "U3"},
}


def fetch_json(url: str):
    request = Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "CowCalc/1.0",
        },
    )
    with urlopen(request, timeout=60) as response:
        return json.load(response)


def main() -> None:
    date_rows = fetch_json(f"{BASE}/prices/headline/dates")

    dates = sorted(
        {row["date"] for row in date_rows if row.get("date")},
        reverse=True,
    )
    if not dates:
        raise RuntimeError("No dates returned by DAFM")

    latest_date = dates[0]
    start_date = dates[7] if len(dates) > 7 else dates[-1]

    query = urlencode({"start": start_date, "end": latest_date})
    rows = fetch_json(f"{BASE}/prices/headline?{query}")

    prices = {}
    grades = {}

    for row in rows:
        row_date = row.get("dateCreated") or row.get("date")
        if row_date != latest_date:
            continue

        category_name = (row.get("category") or {}).get("name")
        config = CATEGORY_CONFIG.get(category_name)
        if not config:
            continue

        if row.get("classification") != config["grade"]:
            continue

        raw_cents = row.get("cent")
        if raw_cents in (None, ""):
            continue

        try:
            cents = float(raw_cents)
        except (TypeError, ValueError):
            continue

        euro_price = round(cents / 100, 4)
        if not 3.0 <= euro_price <= 12.0:
            raise ValueError(
                f"Implausible price for {category_name}: {euro_price}"
            )

        prices[config["key"]] = euro_price
        grades[config["key"]] = config["grade"]

    expected_keys = {config["key"] for config in CATEGORY_CONFIG.values()}
    missing = sorted(expected_keys - set(prices))

    if missing:
        debug_rows = [
            {
                "category": (row.get("category") or {}).get("name"),
                "classification": row.get("classification"),
                "cent": row.get("cent"),
                "cent_type": type(row.get("cent")).__name__,
                "date": row.get("dateCreated") or row.get("date"),
            }
            for row in rows
            if (row.get("dateCreated") or row.get("date")) == latest_date
        ][:40]
        raise RuntimeError(
            f"Missing headline prices for: {', '.join(missing)}. "
            f"Sample latest rows: {debug_rows}"
        )

    payload = {
        "source": "DAFM Beef Pricewatch",
        "sourceUrl": "https://publicapps.agriculture.gov.ie/bpw-ui/",
        "weekEnding": latest_date,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "verified",
        "note": (
            "Official weighted-average headline prices paid, inclusive of VAT. "
            "The farmer's expected factory price remains editable."
        ),
        "grades": grades,
        "prices": prices,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temporary = OUTPUT.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    temporary.replace(OUTPUT)

    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(
            f"Price update failed; existing file retained: {error}",
            file=sys.stderr,
        )
        raise SystemExit(1)
