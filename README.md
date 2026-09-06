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
| `token_calc_url` | `https://remote-jobs.yodev.dev/calculadora-de-tokens.html` | Page loaded in the modal |
| `token_calc_button_text` | `Calculadora de tokens` | Sidebar label and modal title |
| `token_calc_button_icon` | `calculator` | Font Awesome icon name |
| `token_calc_show_in_sidebar` | `true` | Master on/off switch |
| `token_calc_pass_theme` | `true` | Append `?theme=dark\|light` to the URL |

## How it works

The sidebar entry is registered with `api.addCommunitySectionLink()`, matching
the Workplace and worX links in `discourse-affine-sidebar`. A delegated click
handler on the rendered item takes over the plain left-click and opens the
modal; modified clicks (middle-click, cmd/ctrl) are left alone, so
open-in-new-tab still goes to the calculator page directly.

Position is slot 3, directly beneath yoDEV worX. `discourse-affine-sidebar`
flexes the Community section and pins Workplace at `order: -100` and worX at
`-99`; core links sit at the default `0`. This component claims `-98`. **If
those numbers change there, this one has to move with them.**

Discourse's CSS custom properties do not cross the iframe boundary, so the
calculator cannot read the forum's colour scheme. The component derives
light/dark from the luminance of the rendered page background and passes it as
`?theme=`. The calculator falls back to `prefers-color-scheme` if the parameter
is absent.

There is no `postMessage` channel and no authentication. The calculator is
entirely client-side and needs nothing from Discourse except the theme hint.

## Requirements

The page at `token_calc_url` must be served from a host that does not refuse
framing. Discourse itself imposes no restriction — its CSP sets `frame-ancestors`
but no `frame-src`, so the forum may frame any origin.

The constraint is on the *target*. The yoDEV tool subdomains
(`remote-jobs.yodev.dev` and friends) send no `X-Frame-Options` and no CSP, which
is why the Remote Jobs component has always worked. **The apex `yodev.dev` is the
exception**: it sends `X-Frame-Options: DENY` and `frame-ancestors 'none'`, so a
page hosted there cannot be framed without a path-scoped header exception.

Host the calculator on a tool subdomain and there is nothing to configure. It
currently lives in `yodev-remote-jobs/public/`, served at
`remote-jobs.yodev.dev`.

## Known limitations

The icon must be listed in `modifiers.svg_icons` in `about.json`. Discourse ships
a subset of Font Awesome, and an icon outside it renders as nothing at all — the
link appears with a blank prefix rather than erroring. Changing
`token_calc_button_icon` means updating that list too.

## History

The first version injected an `<li>` into the rendered DOM rather than using the
sidebar API. It worked, but Discourse put the link in the Community section's
overflow bucket — the collapsed "más…" at the foot of the list — where nobody
found it. It also carried a MutationObserver, timed retries and a separate
mobile-hamburger path, all of which the sidebar API makes unnecessary.
