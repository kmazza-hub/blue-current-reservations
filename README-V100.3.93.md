# Blue Current V100.3.93 — Queue Accessibility Truth

This release closes the final reversed Waitlist/Arrivals assistive-state defect found during the live V100.3.92 test.

## Fix

- `aria-pressed` now follows the queue that is actually visible, not a transient CSS class.
- Waitlist visible means Waitlist reports pressed.
- Arrivals visible means Arrivals reports pressed.
- A late 900 ms settlement protects the correct state from legacy render timing.
- Mutation observation tracks only visual and workspace state, preventing accessibility attributes from competing with themselves.
- All routing, Host Stand headings, touch targets, and the 100% single-iPad rehearsal remain preserved.
- No restaurant data or persistence logic is changed.
