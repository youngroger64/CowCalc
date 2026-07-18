# CowCalc category + price-source build

Adds a cattle-category dropdown, suggested category prices from `data/beef-prices.json`, source/update status, a one-click “Use suggested price” button, and permanent manual override.

The initial JSON values are clearly marked as demo defaults. DAFM Beef Pricewatch reports final average prices paid inclusive of VAT; a farmer’s expected factory deal may differ.

## Deploy

Upload the unzipped files to GitHub. Then on the VM:

```bash
cd ~/cowcalc
chmod +x deploy.sh
./deploy.sh
```

## Test the official updater manually

```bash
cd ~/cowcalc
python3 -m venv .venv
source .venv/bin/activate
pip install playwright
playwright install chromium
python scripts/update_beef_prices.py
cat data/beef-prices.json
```

Compare the result with the official Beef Pricewatch page before scheduling it. The source is JavaScript-driven and may change, so the updater retains the previous valid file whenever parsing fails.
