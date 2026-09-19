# Campus Credits

Build CampCredit — a gamified campus rewards app for Indian college students. Students earn credits for academics, event participation, and campus spending, and compete on class leaderboards for real rewards.

TECHNICAL REQUIREMENT: build this as a static single-page React app (SPA), NOT server-side rendered — this will later be wrapped with Capacitor into a native mobile app, so avoid SSR/server components entirely. Mobile-first: design for a ~390px-wide phone viewport, centered on larger screens with a subtle dark backdrop around it.

DESIGN DIRECTION: this should feel like a premium fintech app (think Cred, Jupiter, Revolut) — NOT a generic SaaS dashboard. Avoid flat colored cards with plain rounded corners and centered text sitting on a light background — that reads as templated and boring. Go dark-theme, glassy, and a little bit alive.

Color palette (dark theme):
- Background: #0A0C12 (near-black, slightly warm ink tone)
- Surface (secondary cards): #14171F
- Signature gradient: a mesh/aurora gradient sweeping violet #7C3AED → magenta-rose #DB2777 → cyan #0EA5E9, used ONLY on the hero card
- Credit gold accent: #F5C451, reserved only for currency numbers and achievement moments
- Text primary: #F2F3F7, text secondary/muted: #8B90A3
- Success green: #34D399

Typography: pair "Space Grotesk" (Google Font) for headings and big numerals with "Inter" for body/UI text, and "JetBrains Mono" specifically for the credit balance number, giving it a tabular, embossed credit-card feel.

SIGNATURE ELEMENT: build the home screen hero as a "Digital Campus ID Card" — a large rounded card with the violet→magenta→cyan mesh gradient background, a subtle holographic sheen that sweeps across it once on page load, a small chip-like icon detail (like a real ID/credit card), the credit balance in large JetBrains Mono numerals with a quick count-up animation on load, and two floating pill-shaped stat chips (Personal Rank, Class Rank) sitting on a frosted-glass backdrop-blur translucent overlay near the bottom edge of the card so they read as inset, not just stacked on top.

HOME SCREEN, top to bottom:
1. Header: "CampCredit" wordmark (Space Grotesk bold) + circular avatar image placeholder
2. Greeting: "Hi, Aarav" + muted subtext "BTech CSE · Section A · Year 2"
3. The Digital Campus ID Card (described above), showing balance "2,480", a small "+120 this week" delta badge, and the two rank stat chips
4. Class progress: a circular/radial progress ring (not a flat bar) showing the class's normalized score, with the rank shown inside the ring, next to a short text summary like "3rd place course-wide — 40 pts behind CSE-B"
5. Quick actions: a horizontal row of icon pills — Redeem, Events, Leaderboard — with a soft glow/lift on hover
6. Live feed: a vertical timeline with a connecting line and small colored icon circles per entry (not plain list rows). Three sample entries: a hackathon 2nd-place win (+200 pts), a blood donation volunteering entry (+40 pts), and a semester result sync (+500 pts)

Add ambient depth with 1-2 large, very softly blurred gradient blobs behind the content at low opacity, consistent with the card's palette. Keep motion restrained — the card's sheen animation and the balance count-up are the only animated moments, no extra scattered effects. Keep text contrast strong and legible throughout.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://campus-credits-rewards.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7e45d1e6-6b12-44ee-b1d1-aa694b4a893e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
