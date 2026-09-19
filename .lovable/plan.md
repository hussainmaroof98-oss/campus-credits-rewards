# Add personalized campus assistant and responsive polish

## Scope
- Add a student-facing “Ask CampCredit” assistant for free-text questions about credits, reputation/rankings, rewards, vouchers, and events.
- Personalize answers with the signed-in student’s current CampCredit data while keeping the model key and instructions server-side.
- Improve readability and layout behavior at a 390px phone viewport and on larger screens, preserving the navy visual system and existing workflows.

## Implementation
- Create a streaming AI chat endpoint using Lovable AI Gateway with `openai/gpt-6-astra`, reasoning enabled, and the existing app’s client-only student session passed as validated context.
- Fetch current student statistics, recent credit and achievement entries, available rewards/class stock, vouchers, upcoming events, and leaderboard/class context on the server; give the model only the data needed to answer the student’s question.
- Add a dedicated `/ask` screen with suggested questions, streamed responses, visible thinking summaries, clear loading/error/empty states, conversation history for the current device, and links from Home/profile.
- Add reusable responsive screen/frame styling and refine the Digital Campus ID card, navigation controls, reward grid, leaderboard rows, event cards, voucher codes, profile stats, authentication forms, and Admin navigation so content wraps or scrolls cleanly without clipping.
- Keep the app’s existing client-only SPA rendering configuration for Capacitor; the AI endpoint is a remote service boundary and does not change screen rendering to SSR.

## Validation
- Test one real personalized AI request through the new endpoint and verify safe gateway error messages.
- Check Home, Ask, Leaderboard, Events, Redeem, Vouchers, Profile, Campus Plus, Login/Sign Up, and Admin at 390px and desktop widths.
- Confirm there is no horizontal overflow, controls remain usable, route metadata is complete, and the preview build succeeds.

## Technical details
- The model call streams through `/v1/responses`, uses `store: false`, preserves the gateway run ID, and never exposes `LOVABLE_API_KEY` in browser code.
- Only transient `429`/`5xx` failures receive bounded delayed retries; other gateway errors are shown directly and end the request.
- Conversation history remains device-local; no new database table is required.
