# CowCalc Demo

A phone-first static web application based on the **Beef Feeding** worksheet in the supplied `Finishing Costs.xlsx` workbook.

## Included calculations

- Purchase cost from live weight × mart €/kg
- Liveweight gain and expected final weight
- Expected carcass weight using kill-out %
- Feed cost per day and over the finishing period
- Transport, dosing, veterinary, loss allowance, interest and daily overhead
- Factory value using base price + breed bonus + QPS adjustment, less charges
- Actual margin and margin/day at the entered mart bid
- Maximum total purchase price and maximum live €/kg bid after reserving a target margin
- Break-even factory price

## Run locally

Open `index.html` directly in a browser, or run:

```bash
python3 -m http.server 8080
```

## Deploy on the VM

Pull the repository and serve the directory through Nginx, or temporarily run the Python command above.

## Important

This is a demonstration and uses user-entered prices. All assumptions and formulas should be reviewed and approved by the farmer before commercial use.
