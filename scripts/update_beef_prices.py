#!/usr/bin/env python3
from __future__ import annotations
import json, re, sys
from datetime import datetime, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

URL="https://publicapps.agriculture.gov.ie/bpw-ui/"
OUTPUT=Path(__file__).resolve().parents[1]/"data"/"beef-prices.json"
LABELS={"steer":r"\bSteer\b","heifer":r"\bHeifer\b","cow":r"\bCow\b","youngBull":r"\bYoung\s+Bull\b","bull":r"\bBull\b"}

def extract(text, pattern):
    m=re.search(pattern,text,re.I)
    if not m: raise ValueError(f"Missing category {pattern}")
    block=text[m.end():m.end()+900]
    for rgx,div in [(r"€\s*([0-9]+(?:\.[0-9]{1,3})?)",1),(r"\b([3-9][0-9]{2})\s*(?:c|cent)",100),(r"\b([3-9]\.[0-9]{2})\b",1)]:
        x=re.search(rgx,block,re.I)
        if x:
            v=float(x.group(1))/div
            if 3<=v<=12:return round(v,2)
    raise ValueError(f"No plausible price near {pattern}")

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        page=browser.new_page(viewport={"width":1440,"height":1200})
        page.goto(URL,wait_until="networkidle",timeout=90000)
        page.wait_for_timeout(3000)
        text=page.locator("body").inner_text()
        browser.close()
    wm=re.search(r"Week\s+Ending\s*:?\s*([^\n]+)",text,re.I)
    week=wm.group(1).strip() if wm else None
    prices={k:extract(text,LABELS[k]) for k in ("steer","heifer","cow","youngBull","bull")}
    if len(set(prices.values()))<2:raise ValueError(f"Suspicious values: {prices}")
    payload={"source":"DAFM Beef Pricewatch","sourceUrl":URL,"weekEnding":week,"updatedAt":datetime.now(timezone.utc).isoformat(),"status":"verified","note":"Automatically retrieved from official DAFM Beef Pricewatch.","prices":prices}
    tmp=OUTPUT.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload,indent=2),encoding="utf-8")
    tmp.replace(OUTPUT)
    print(json.dumps(payload,indent=2))
if __name__=="__main__":
    try: main()
    except Exception as e:
        print(f"Update failed; existing file retained: {e}",file=sys.stderr);raise SystemExit(1)
