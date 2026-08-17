# Font Strategy

## Sections

- Status
- Font Options
- Font Availability
- Decision: Option D (Hybrid)
- Implementation
- Future Path

---

## Status

**Decision:** Option D - Hybrid (system fonts + availability indicator)
**Decided:** v1.11.0 (TD-005) | **Implemented:** v1.18.0 (TD-004)
**Status:** Active

---

## Font Options

| Setting value | Font stack in `platform.css` |
|---|---|
| `system` | `-apple-system, "Segoe UI", system-ui, sans-serif` |
| `inter` | `"Inter", "Segoe UI", system-ui, sans-serif` |
| `roboto` | `"Roboto", "Segoe UI", Arial, sans-serif` |
| `open-sans` | `"Open Sans", "Segoe UI", Arial, sans-serif` |
| `ibm-plex-sans` | `"IBM Plex Sans", "Segoe UI", Arial, sans-serif` |
| `source-sans-pro` | `"Source Sans Pro", "Segoe UI", Arial, sans-serif` |

---

## Font Availability

**Guaranteed present:**

| Font | Availability |
|---|---|
| `Segoe UI` | All Windows machines |
| `system-ui` | All modern browsers |
| `-apple-system` | macOS/iOS |
| `Arial`, `sans-serif` | All platforms |

**Not installed by default:**

| Font | Notes |
|---|---|
| `Inter` | Web font only |
| `Roboto` | Common on Android; not on Windows |
| `Open Sans` | Google Fonts web font |
| `IBM Plex Sans` | IBM proprietary web font |
| `Source Sans Pro` | Adobe/Google web font |

**Fallback behavior:** CSS silently falls back to the next available font in the stack. Selecting `inter` on a machine without Inter installed shows `Segoe UI` with no visible indication.

---

## Decision: Option D (Hybrid)

All 6 font options are preserved. A live availability badge in Settings uses `document.fonts.check()` to show whether the selected font is actually active or falling back.

**Rejected alternatives:**
- Option A (docs only): Insufficient - no user feedback on silent fallback.
- Option B (bundle fonts): 200-400 KB overhead; premature until IBM branding requires it.
- Option C (detection only): Implemented as part of D.

---

## Implementation (v1.18.0)

- **`dashboard.html`:** `#font-availability-row` sub-row with `#font-availability-badge` below font selector; `aria-live="polite"` and `aria-atomic="true"`.
- **`dashboard.js`:** `applyFont()` and `syncSettingsUI()` both call `updateFontAvailabilityBadge(font)`.
- **`dashboard.css`:** `.rc-font-badge--ok` (green, `--rc-success`) and `.rc-font-badge--warn` (amber, `--rc-warning`).

| Selected font | Installed | Badge |
|---|---|---|
| `system` | Always | (hidden) |
| `inter` | Yes | Confirmed available |
| `inter` | No | Warning - displaying Segoe UI |

---

## Future Path (Option B)

If IBM Plex Sans becomes a hard branding requirement:
1. Bundle `IBM Plex Sans` as WOFF2 subset (~70 KB for 2 weights).
2. Add `@font-face` in `platform.css`.
3. Consider removing the 4 non-guaranteed fonts from the selector.
4. MINOR version bump required.
5. Update AGENTS.md font inventory table.

**References:** [`styles/platform.css`](../styles/platform.css) | [`dashboard.js`](../dashboard.js) | [`dashboard.html`](../dashboard.html)
