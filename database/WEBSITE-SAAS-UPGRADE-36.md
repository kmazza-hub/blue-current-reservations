# WEB-036 — Full Visual QA & Homepage Certification

WEB-036 is a certification-style website hardening pass.

## Structural correction
The Service Speed section introduced in WEB-031 was missing its explicit closing `</section>` before Blue Current Live. Browsers were repairing that invalid nesting at runtime. WEB-036 fixes the source structure.

## Visual / interaction certification
- active navigation follows the visible story chapter
- mobile navigation closes after selection
- Escape closes mobile navigation and restores focus
- internal navigation transfers keyboard focus correctly
- target=_blank links are hardened with noopener/noreferrer
- horizontal overflow guards for desktop/tablet/mobile
- 1100px, 760px, and 390px responsive hardening
- consistent focus-visible treatment
- reduced-motion hardening
- short-viewport conversion prompt protection

WEB-030 through WEB-035 story, positioning, and navigation language remain intact.
