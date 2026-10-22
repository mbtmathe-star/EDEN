# Eden – Lodge, Restaurant & Conference Centre (Kimberley)

Static clone of https://www.welcometoeden.co.za with the Kimberley Trampoline Park added as one of the offerings.

- `/` and `/p*`, `/gallery`, `/enquiry`, `/bookingrequest.asp` – the Eden site (cloned as-is)
- `/trampoline-park/` – the trampoline park booking demo (its own design, self-contained in that folder)

No build step; deploy as a static site.

Not yet working: the enquiry and booking forms post to server-side ASP scripts (`ContactFormSubmit.asp`, `BookingRequestS.asp`) that don't exist in this static copy.
