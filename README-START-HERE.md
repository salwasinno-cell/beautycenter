# English-only build — what's different from the full bilingual ZIP

## What's genuinely English-only here
**`index.html`** (the customer-facing website) has had the Arabic language
toggle completely removed — not hidden, removed. There is no button, no
code path, no way for a visitor to ever see Arabic on this file. Verified:
zero toggle buttons in the HTML, and the one function that could switch
languages is defined but never called from anywhere.

## What's honestly still bilingual — a deliberate choice, not an oversight
**`lume-admin.html`** (your admin dashboard) and **`privacy-terms.html`**
still have their Arabic fields and toggle in place. I left these alone on
purpose: the admin file in particular has bilingual code woven through a
very large number of places (17+ paired input fields, auto-translate
buttons, save/load logic), and safely stripping all of it out in one pass
risked breaking something that currently works correctly on your live
site. Since the customer site itself can never show Arabic anymore, these
leftover fields in admin are simply inert — you can fill them in or ignore
them, either way nothing visitor-facing will ever use them.

If you want admin fully stripped down too, say so and I'll do it as its
own careful pass, rather than rush it here.

## What's NOT in this ZIP that was in the last one
- `10-bilingual-schema.sql` — left out on purpose, since there's no reason
  to add the Arabic (_ar) database columns for an English-only build.

## Same deploy process as before
- SQL files → Supabase SQL Editor
- `booking-api-edge-function.ts`, `team-api-edge-function.ts`,
  `send-notification-email-edge-function.ts` → Supabase Edge Functions
  (not GitHub)
- `index.html`, `lume-admin.html`, `privacy-terms.html` → GitHub
