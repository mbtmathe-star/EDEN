# Eden – Lodge, Restaurant, Conference Centre & Trampoline Park (Kimberley)

Static website for https://welcometoeden.co.za, deployed on Vercel (no build step on Vercel).

## Structure

- `index.html`, `p11/…`, `p12/…`, `p13/…`, `gallery/`, `p3/…`, `p4/…` – Eden pages (same URLs as the old site)
- `css/eden.css`, `js/eden.js` – shared styles and behaviour
- `img/` – logos, favicon and web-sized photos (`img/g/`); original photos live in `uploads/`
- `trampoline-park/` – the Kimberley Trampoline Park booking demo (own design)
- `vercel.json` – redirects from old URLs (booking enquiry, old policy and gallery links)

## Editing content

Page content is in `_src/build.py`. After editing it, regenerate the pages:

    python _src/build.py

(needs Python with Pillow). `_src` is not deployed.

## Forms

The enquiry form (Contact page, and the "Book now" panel which hands over to it) sends via FormSubmit
to contact@welcometoeden.co.za. The first submission triggers a one-time activation email to that inbox.
