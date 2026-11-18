# The Swanson Family Secret Santa

Live site: https://guneisele.github.io/swanson-secret-santa/

A cute, static Secret Santa app. Enter names and phone numbers, draw the matches, then text each person a private reveal link from your own phone. There is no server and no paid SMS service.

The default headline is **The Swanson Family Secret Santa**. Tap the red banner to change it — the new name shows on the reveal page, in the browser tab, and in each text.

## How to use it

1. Open the site on your phone (or computer).
2. Edit the family name if you need to, then add a budget and exchange date if you like.
3. Add everyone, with a phone number for each person you want to text.
4. Optionally mark pairs who should never draw each other (for example spouses).
5. Tap **Draw names**.
6. Tap **Send text** for each person. Your Messages app opens with the note already written. After you send it, the app shows a check mark. You can also copy the private link.
7. Each recipient opens their link, a gift unwraps, and they see who they’re buying for.

Matches stay hidden from the organizer unless you confirm **Reveal all matches**.

## Run it locally

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173/

## Tests

```bash
npm test
```

## Publish

This is a plain static site (`index.html`, `styles.css`, `app.js`, `draw.js`, `codec.js`). No build step is required. Drop the folder onto [Netlify Drop](https://app.netlify.com/drop) while signed in, or publish with Cloudflare Pages, Vercel, or Surge (`npx surge`). A signed-in host is what you want so gift links open without a password.

## Limitations

- You have to tap **Send text** once for each person. The texts come from your own phone plan.
- A reveal link includes the match in a lightly scrambled code. That is not real encryption. Anyone with the link can see the match.
- After you draw again, old links still show the old match. Send the new texts.
- Drafts are saved only in this browser on this device.
- In a group of three, excluding one pair (such as spouses) makes a fair circle impossible. Add another person or remove the restriction.
