# Apptio Documentation Finder - User Guide

## Sections

- Opening the Plugin
- Search
- Favorites
- Recent
- Opened
- Index
- Domains
- Quick Links
- Sources
- Keyboard Shortcuts
- Settings
- Troubleshooting

---

## Opening the Plugin

1. Click the ReplyCators icon in the Edge toolbar.
2. In the left sidebar, click **Apptio Documentation Finder**.

The plugin opens to the **Search** tab.

---

## Search

### Basic Search

1. Type a keyword into the search box (e.g. `cost pool`, `allocation`).
2. Press **Enter** or click **Search**.

IBM Docs opens in a new tab scoped to the selected domain/category.

### Domain Buttons

| Button | Covers |
|--------|--------|
| **Apptio** | TBM Studio, Costing, Planning, Billing, Benchmarking |
| **Platform** | Apptio Platform, Datalink, Datalink Classic |
| **Cloudability** | Cloudability Enterprise, Financial Planning, Savings Automation |
| **Targetprocess** | All Targetprocess, ATP |

Click a domain to scope the search. Click again to deselect (unscoped search).

### Category Dropdown

After selecting a domain, use the **Category** dropdown to narrow to a specific product. Default is "All [Domain]".

### URL Preview

Click the collapsible **URL Preview** panel to confirm the exact IBM Docs URL before searching.

### Saving a Search

Enter a query and select a domain/category, then click **Save** to save to Favorites.

---

## Favorites

- Stores up to 50 saved search configurations.
- Click any entry to open it directly in a new tab.
- Click **x** to remove an entry.
- Add from Search tab: enter a query, select domain/category, click **Save**.

---

## Recent

- Shows last 20 searches.
- Click any entry to replay the search in a new tab.
- To disable recording: **Settings -> Apptio Documentation Finder -> Save search history** (off).

---

## Opened

- Tracks last 30 IBM Docs pages opened through the plugin.
- Click any entry to reopen in a new tab.
- To disable recording: **Settings -> Apptio Documentation Finder -> Save opened history** (off).

---

## Index

Shows the current state of the documentation source index.

| Item | Description |
|------|-------------|
| Sources loaded | Number of IBM Docs product sources |
| Favorites | Number of saved favorites |
| Quick Links | Number of quick-access chips |
| Recent searches | Number of recorded searches |
| Last refresh | Date/time of last successful IBM Docs API update |

Click **Refresh Sources from IBM Docs** to fetch the latest product list.

---

## Domains

The four domain buttons scope searches to a product family:

- **Apptio** - TBM Studio, Costing, Planning, Billing, Benchmarking
- **Platform** - Datalink, Datalink Classic
- **Cloudability** - Enterprise, Financial Planning, Savings Automation
- **Targetprocess** - all editions, ATP

Clicking a domain: highlights the selection, populates the Category dropdown, loads Quick Links chips.

---

## Quick Links

One-click chips for commonly visited IBM Docs pages within the selected domain. Click any chip to open directly in a new tab. Update when sources are refreshed.

---

## Sources

The Sources overlay lists all documentation sources driving the Category dropdown and Quick Links.

Open with: **Sources** button on Search tab, or press **S** while Search tab is active.

| Action | How |
|--------|-----|
| View all sources | Listed with label, domain, scope path |
| Edit a source | Click inline fields |
| Add a source | Click **+ Add Source** |
| Remove a source | Click **x** on the row |
| Reset to defaults | Click **Reset Defaults** (restores 15 built-in sources) |
| Refresh from IBM Docs | Click **Refresh from IBM Docs** |
| Close | Click **Close** or press **Escape** |

---

## Keyboard Shortcuts

| Shortcut | When | Action |
|----------|------|--------|
| **Enter** | Focus in search input | Run search |
| **S** | Search tab active, no overlay, not in text field | Open Sources overlay |
| **Escape** | Sources overlay open | Close Sources overlay |
| **Escape** | Other tab, no overlay | Return to Search tab |

---

## Settings

Go to **Settings -> Apptio Documentation Finder**:

| Setting | Default | Description |
|---------|---------|-------------|
| Save search history | On | Records queries to Recent tab (up to 20) |
| Save opened history | On | Records opened pages to Opened tab (up to 30) |
| Refresh from IBM Docs | - | Fetches latest IBM Docs product list |
| Clear history | - | Removes all recent searches, opened history, and favorites (cannot be undone) |

---

## Troubleshooting

**No categories in Category dropdown**
- Open the Index tab and click **Refresh Sources from IBM Docs**.
- Requires internet access to `ibm.com/docs/api/v1/products`.

**First-run setup screen appears every time**
- Internet connection may be failing.
- Click **Retry** on the setup screen.
- Once any refresh succeeds, the setup screen does not appear again.

**Search opens generic IBM Docs (no scope)**
- Select a Domain button and/or Category before searching.
- Check URL Preview to confirm scope.

**Save has no effect - nothing in Favorites**
- The search query field must contain text before clicking Save.

**Quick Links show "No quick links for this domain"**
- Open Sources and click **Refresh from IBM Docs**.

**Recent/Opened stops recording**
- Go to Settings and confirm **Save search history** / **Save opened history** are enabled.
