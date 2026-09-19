# Re-theme CampCredit to deep navy

## Scope
- Replace the existing teal, sand, slate, and ivory application palette with the supplied five-step navy system, white text, and black depth accents.
- Apply the palette consistently across Login, Sign Up, Home, Leaderboard, Events, Redeem and vouchers, Achievement Ledger/Profile, Campus Plus, and Admin.
- Preserve the existing layout, content, behavior, and animations.

## Implementation
- Redefine the global semantic color tokens and shared gradient, glass, surface, border, shadow, and backdrop styles in the main stylesheet.
- Replace route-level legacy color utilities and raw old-palette values with semantic navy tokens.
- Update the Digital Campus ID gradient to `#082065 → #114d94`, while retaining its sheen and count-up behavior.
- Keep reputation and credit values white; reserve green for success states and metallic colors for leaderboard tiers.
- Use black only for the bottom navigation, deepest shadows, and existing high-contrast blocks where appropriate.

## Validation
- Check all application routes at phone and desktop sizes for remaining old palette colors, contrast, and unchanged layout.
- Confirm the preview compiles and key screens render without runtime errors.

## Technical details
- Colors will be stored as semantic OKLCH tokens in `src/styles.css`; screen code will consume token-backed utilities.
- No database, authentication, ranking, reward, event, or redemption logic will change.
