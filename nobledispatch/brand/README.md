# Brand Assets

Visual design assets for the NobleDispatch platform and ID Hotshot tenant. These files are referenced by the brand integration deployment prompt (`prompts/99-brand-integration.md`).

## Files

| File | Role | Notes |
|---|---|---|
| `noble_dispatch_banner.png` | Login page background hero | Mountains, desert, white truck, Noble Dispatch shield. Gets optimized to WebP during deployment. ~645 KB. |
| `noble_dispatch_login_reference.png` | Login page composition reference | Shows the target layout with Username/Password labels. Not embedded in production — used as design spec. ~597 KB. |
| `noble_dispatch_login_empty.png` | Login page reference (backup) | Same as above but with empty fields. Use the `_reference` version preferentially. ~591 KB. |
| `dashboard_light_mockup.png` | Light-theme dashboard design target | Shows ID Hotshot's view: red logo, KPI cards with red glow, left sidebar nav. Reference only, not embedded. ~271 KB. |
| `dashboard_dark_mockup.png` | Dark-theme dashboard design target | Same composition with carbon fiber background. Reference only, not embedded. ~384 KB. |

## How these are used

The deployment prompt `prompts/99-brand-integration.md` reads these files and:

1. **Banner image** → optimized and embedded as login background
2. **Login mockups** → used as visual reference for building the React login component
3. **Dashboard mockups** → used as visual reference for building the React dashboard layout in both light and dark themes
4. **ID Hotshot's red shield-truck logo** (visible in dashboard mockups) → extracted and seeded as ID Hotshot's tenant logo

The dashboard mockups are **not embedded as images** in the running platform — they're design references for building real React components with live data. If they were embedded as images, the KPI numbers couldn't update.

## Per-tenant logo

The ID Hotshot logo in the dashboard mockups is **tenant-specific**, not platform-default. When another trucking company signs up to NobleDispatch, they upload their own logo via `Settings → Branding`, and theirs replaces the red shield-truck in that exact slot. The deployment prompt builds this upload system.

## A note on the mockups

These were generated with AI image tools and have a few quirks the deployment prompt corrects:

- The dashboard mockup footer reads "Noble ispatch Powered, v1.5" — missing the "D". The deployment prompt implements the correct spelling: "NobleDispatch · v1.5"
- Mockup typography is illustrative, not exact. The deployment prompt uses Helvetica/Arial system fonts with appropriate weights to match the spirit of the design at production quality.
- Some details (the exact glow intensity, the carbon fiber texture pattern) are interpretive — the prompt gives Claude Code guidance to match the *feel* without pixel-perfecting an AI-generated image.

## Replacing or adding brand assets

To swap in different brand assets:

1. Replace the relevant file in this directory (keep the filename the same)
2. Push the change to GitHub
3. SCP the updated file to `/opt/nobledispatch/public/brand/` on the deployed VPS
4. Restart the platform (`docker-compose restart`)

Or for tenant-specific changes (logo, colors), use the in-platform Settings → Branding UI — no code or asset changes needed.
