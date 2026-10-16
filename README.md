# WINKS London — Astro build

A responsive, black / white / gold Astro site using HTML, CSS, Bootstrap and vanilla JavaScript. No React, Vue, Svelte or other UI framework is used.

## Run locally

```bash
npm install
npm run dev
```

The Astro dev server is configured for `0.0.0.0` so the live preview works in a proxied environment.

## Build

```bash
npm run build
npm run preview
```

## Main routes

- `/` — homepage
- `/about` — About landing page; `/about/winks-way`, `/about/winks-policy`, `/about/winks-massage`, `/about/winks-masseuse`, `/about/winks-valet`
- `/info` — Info landing page; terms, code of conduct, FAQ and reviews
- `/massages` — collection index; every requested experience is generated at `/massages/<slug>`
- `/cinema` — Cinema landing page; `/cinema/massage-video` and `/cinema/tv-ad`
- `/blog` — journal index and post pages
- `/contact` — contact landing page; reservation, private application and email forms

## Booking calendar

The homepage and `/contact/reserve` share the same four-step calendar widget:

1. Choose an experience, new/returning guest status and duration/rate.
2. Choose a date and time; reserved slots are visibly disabled.
3. Add guest and location details.
4. Generate the same booking request for WhatsApp and email.

Rates are stored in `src/data/site.js` from the current [WINKS collection](https://www.winkslondon.co.uk/collection). The prototype applies a configurable 10% returning-guest adjustment through `data-returning-discount="0.10"`. Change that value to match the final WINKS policy.

Availability supports the editable `public/data/reserved-slots.json` snapshot, `data-reserved-slots` or `window.WINKS_RESERVED_SLOTS`. The current front-end includes demo reserved slots so the disabled-state interaction is visible. Replace this with a server-side availability feed before launch so reservations are shared across all customers and devices.

## Before production

This is a high-fidelity front-end prototype. The booking calendar generates WhatsApp and `mailto:` links, but confirmation, payment, email delivery and real-time availability still need a secure backend. The other forms show an interactive success state but do not send data. Connect everything securely before launch, especially the multi-file partner application form. Replace the Cinema MP4 slots, review placeholders, sample images, final logo and placeholder legal text before publishing.
