# Password Strength Analyzer

A client-side password analyzer and generator for Andropedia. It has no backend and never sends or stores the password.

## File structure

- `bob.html`: semantic page structure and accessible labels.
- `styles.css`: design tokens, responsive layout, focus states, and reduced-motion support.
- `app.js`: password rules, score calculation, rendering, generator, tabs, and clipboard behavior.

Open `bob.html` directly in a browser. A local server is optional, but useful when testing browser APIs such as clipboard permissions.

## How it works

1. The `input` event sends the current value to `render()`.
2. `scorePassword()` returns a small object containing `score`, `label`, and named boolean checks.
3. `render()` updates the meter, checklist, feedback, entropy, and crack-time estimates.
4. The generator builds a character pool, guarantees every selected category appears, and uses `crypto.getRandomValues()` for secure randomness.
5. Tabs use `role="tab"`, `aria-selected`, `aria-controls`, and the `hidden` property so the UI is keyboard and screen-reader friendly.

The score is an educational heuristic, not a security certification. Entropy and crack time assume a random password; dictionary words and reused passwords can be attacked much sooner.

## Concepts to explain in an interview

- **Why `defer`?** The script downloads while HTML parses, then runs after the document is ready, so it does not block the first render.
- **Why `crypto.getRandomValues()`?** It is designed for unpredictable values. `Math.random()` is not suitable for secrets.
- **Why separate HTML, CSS, and JavaScript?** Each file has one responsibility, can be cached independently, and is easier to test and maintain.
- **How is mobile handled?** The desktop grid changes to one column at 780px, compact spacing is applied at 480px, and flexible tracks prevent horizontal overflow.
- **What does `aria-live` do?** It tells assistive technology that generated feedback may change without a page navigation.
- **What are the limitations?** The common-password list is tiny, keyboard and sequence detection is heuristic, and character-pool entropy is only an estimate. A production tool could use a vetted breach-password database locally or a library such as zxcvbn.
- **What would you test next?** Common passwords, repeated and sequential patterns, every generator option combination, tab keyboard navigation, clipboard rejection, and layouts at 320px, 390px, tablet, and desktop widths.

## Future production upgrades

- Add automated unit tests around `scorePassword()` and `formatSeconds()`.
- Replace the demo common-password set with a maintained offline password-strength library.
- Add a Content Security Policy and self-host fonts if strict privacy or offline support is required.
- Avoid logging passwords, analytics, or third-party scripts on this page.
