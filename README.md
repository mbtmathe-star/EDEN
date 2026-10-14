# Leap Park Booking (design demo)

Click-through design demo of a trampoline-park booking system. Two linked views on one in-memory store:

- **Website** - landing page and the ticket booking journey (individual, party, group).
- **POS - Front desk** - today dashboard, bookings, new sale, party pods, payments and cash-up, customers, pricing and rules.

Starts empty. Book on the Website tab and it appears at the front desk in real time; capacity, payments and status stay in sync both ways. Mock names and prices throughout. State lives in memory only, so a page refresh resets it.

## Run

No build step. Open `index.html` in a browser, or serve the folder:

    npx serve .

## Structure

    index.html          page shell
    assets/styles.css   all styles (light and dark)
    assets/app.js       all logic (single IIFE, no dependencies)
