# Token Calculator — Discourse theme component

Adds a **Calculadora de tokens** link to the yoDEV sidebar. Clicking it opens a
modal containing the calculator page in an iframe.

Companion to the article
[Qué son los tokens en la IA y por qué te cobran por ellos](https://www.yodev.dev/t/que-son-los-tokens-en-la-ia-y-por-que-te-cobran-por-ellos/5141).

## Install

Admin → Customize → Themes → Components → **Install** → *From a git repository*,
then paste this repo's URL. Updates are pulled with the **Check for updates**
button on the component's page.

## Settings

| Setting | Default | What it does |
|---|---|---|
| `token_calc_url` | `https://www.yodev.dev/calculadora-de-tokens` | Page loaded in the modal |
| `token_calc_button_text` | `Calculadora de tokens` | Sidebar label and modal title |
| `token_calc_button_icon` | `calculator` | Font Awesome icon name |
| `token_calc_show_in_sidebar` | `true` | Master on/off switch |
| `token_calc_pass_theme` | `true` | Append `?theme=dark\|light` to the URL |

## How it works

The sidebar entry is injected into `#sidebar-section-content-community` as a
plain anchor with a click handler, rather than registered through the sidebar
API. This matches the approach already proven on this install by the Remote Jobs
component.

Discourse's CSS custom properties do not cross the iframe boundary, so the
calculator cannot read the forum's colour scheme. The component derives
light/dark from the luminance of the rendered page background and passes it as
`?theme=`. The calculator falls back to `prefers-color-scheme` if the parameter
is absent.

There is no `postMessage` channel and no authentication. The calculator is
entirely client-side and needs nothing from Discourse except the theme hint.

## Requirements

The page at `token_calc_url` must be served from an origin this forum is allowed
to frame. Same-origin (`www.yodev.dev`) is simplest; a different subdomain needs
Discourse's CSP `frame-src` to permit it and the page itself to allow framing via
`frame-ancestors`.

## Known limitations

Sidebar injection targets Discourse's rendered DOM (`#sidebar-section-content-community`
and the `sidebar-section-link*` classes). Those are markup details, not a public
API, so a future Discourse release can change them and silently drop the link.
If the link disappears after an upgrade, that selector is the first thing to check.
