# Template: one IsDead web property

Every IsDead app ships exactly three surfaces, hosted at `https://yourappisdead.com/<app>isdead`:

| Route | What | Notes |
|---|---|---|
| `/` | **One** marketing page that mirrors the original product's homepage | Same section order and structure as the original; our own copy, art and screenshots of *our* app. The price comparison lives here as a section (`#pricing`). No other marketing pages. |
| `/login` | Sign in / sign up | Shared Firebase auth backend across all IsDead apps. Original's login layout, rendered with `AuthCard`. Demo button (single, "Use the demo account") only in demo mode. |
| `/app/...` | The product | Themed with the same tokens. |

## Homepage section order (derive from the original; Calendly as the worked example)

1. `NavBar`: brand, 4 anchor links into this page (Product, Solutions, Resources, Pricing), "Log in" ghost + primary CTA.
2. `Hero`: eyebrow pill, H1, subtitle, primary + secondary CTA, large screenshot of our app.
3. Audience strip (text only, never third-party logos).
4. "How it works" grid (4 steps).
5. Alternating feature rows: pill, H2, copy, CTA, screenshot.
6. Proof stats.
7. Integrations line (text only).
8. `#pricing`: price comparison calculator + "every feature, no plan gates" table.
9. Gradient final CTA band.
10. `Footer` with columns and the non-affiliation trademark note.

## Login layout

`NavBar` + `.ids-auth` (full-bleed `--ids-gradient-hero`, rounded inset) + `.ids-auth__card` containing: H1, email field, primary full-width button, `Divider label="or"`, provider buttons (only for configured providers), footer link.

### Sign in with Google (required: official branding)

The Google button is **never** a generic outlined `Button` with text. Use `GoogleButton` from `src/google.tsx` (vendored as `@/vendor/isdead-design/src/google`):

```tsx
<GoogleButton block shape="rect" action="continue" disabled={busy} onClick={...} />
```

- Logo: Google's official standard-color "G" (cropped from Google's Sign in with Google asset bundle in `assets/google/official/`). Never redraw, recolor, stretch or put it on a colored fill; only the approved `light` (default, white / #747775 stroke), `dark` and `neutral` themes.
- Spec: 40px high, 12px side padding, 10px logo gap, 20px logo, Google Sans Medium 14/20 (OFL font in `fonts/google/`), radius 4 (`shape="rect"`) or pill (`shape="pill"`; use pill only when the theme's `control.buttonRadius` is 9999px, as the apps' `apply-google-button` script does).
- Text is limited to `Sign in with Google`, `Sign up with Google` or `Continue with Google` (`action="signin" | "signup" | "continue"`). Never just "Google".
- Keep it as prominent as the other provider options.
- Static (non-React) pages: copy the Google block at the end of `css/components.css` plus `fonts/google/`, and inline `assets/google/google-g.svg` (see WisprFlowIsDead `site/wisprflowisdead/login.html`).
- New Next apps: after vendoring the design system, run `node vendor/isdead-design/scripts/apply-google-button.mjs .` (idempotent) or use `GoogleButton` in `LoginForm.tsx` directly.
- Guidelines: https://developers.google.com/identity/branding-guidelines

## Rules

- Theme: `import "<pkg>/css/<theme>.css"` then `components.css`; set `data-ids-theme` on `<html>`.
- Never copy the original's logos, icons, illustrations, photos, copy, or proprietary font files.
- Put screenshots of our own app in `public/home/`.
