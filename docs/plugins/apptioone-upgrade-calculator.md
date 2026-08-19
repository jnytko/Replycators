# ApptioOne Upgrade Calculator — Plugin Reference

**Plugin ID:** `com.replycators.apptioone-upgrade-calculator`  
**View ID:** `plugin-apptioone-upgrade-calc`  
**Category:** `apptione`  
**Version:** `1.0.0`  
**Runtime Module:** `plugins/apptioone-upgrade-calculator.js`  
**Content Scripts:**
- `plugins/apptioone-upgrade-calculator/content/tp-content.js` (matches `https://apptioupgrades.tpondemand.com/*`)
- `plugins/apptioone-upgrade-calculator/content/env-content.js` (web accessible resource for customer tabs)

---

## Overview

The ApptioOne Upgrade Calculator analyzes Apptio Upgrade Requests from the TargetProcess board at `apptioupgrades.tpondemand.com`. It automatically detects the active customer environment, opens the board in a background tab if needed, and displays structured upgrade request data with comprehensive upgrade timeline analysis.

---

## Features

- **Auto Environment Detection:** When viewing a customer tab (`*.apptio.com` or `*.apps.papt.to`), extracts the environment hostname and queries live build/version numbers.
- **TargetProcess Board Integration:** Searches and extracts custom fields directly from the TargetProcess board.
- **Upgrade Timeline Analysis:** Calculates previous, current, and next upgrade dates, along with interval days and frequency estimates.
- **Copy & Diagnostics:** Quick export of structured data and board diagnostic attributes for support investigations.

---

## Storage Keys

| Key | Type | Description |
|---|---|---|
| `rc:plugin:com.replycators.apptioone-upgrade-calculator:last-calc` | object | Cached user search terms and selections |
