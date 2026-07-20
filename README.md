# 👁️ SubWatch

**Track subscriptions. Catch price hikes.**

A privacy-first subscription watchdog built by [CryptoSI DAO](https://github.com/CryptoSI-DAO). No bank linking. No data selling. 100% manual entry.

Built with **Expo + React Native + TypeScript**. Runs on iOS, Android, and Web.

---

## Features

- **Subscription Tracker** — Add any subscription with price, billing cycle, category, and next billing date
- **Price History** — Log price changes over time and see the full history per subscription
- **Weekly Offers** — Curated deals across streaming, VPN, software, and more with a scratch-card reveal
- **Smart Reminders** — Set a weekly check-in notification (day + time picker)
- **Categories** — 10 custom categories with dedicated icons and colors
- **Dark / Light / System** theme support
- **Gamification** — Scratch cards + confetti when you find savings
- **Privacy First** — No bank linking, no Plaid, no data harvesting. You type what you track

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 56 / React Native 0.85 |
| Language | TypeScript |
| Routing | Expo Router |
| Backend | Supabase (self-hosted at `db.cryptosidao.org`) |
| Auth | Supabase Auth (email/password) |
| Storage | AsyncStorage (native) / localStorage (web) |
| Notifications | expo-notifications (local scheduling) |
| Web Deploy | Vercel (`subwatch-red.vercel.app`) |

---

## Getting Started

### Prerequisites

- Node.js 22+
- Expo CLI / EAS CLI (`npm i -g eas-cli`)
- A Supabase instance (or use the hosted one)

### Install

```bash
git clone https://github.com/CryptoSI-DAO/subwatch.git
cd subwatch
npm install
```

### Environment

Create a `.env.local` in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-url.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

> **Web deploy (Vercel):** Also set `SUPABASE_BACKEND_URL` as a Vercel env var — the web app proxies Supabase requests through `/api/supabase` to avoid mixed-content issues.

### Run locally

```bash
npx expo start
```

Open in Expo Go (iOS/Android), a simulator, or your browser.

---

## Building Native Apps

### Configure EAS (one-time)

```bash
npm i -g eas-cli
eas login                    # Sign in to your Expo account
eas build:configure          # Creates the project, fills in projectId in app.json
```

### Build profiles

Defined in [`eas.json`](./eas.json):

| Profile | iOS | Android | Use case |
|---------|-----|---------|----------|
| `development` | Simulator | Debug APK | Day-to-day dev |
| `preview` | Real device | Release APK | TestFlight / APK sharing |
| `production` | App Store | AAB (Play Store) | Store submission |

### Build commands

```bash
# Development build (simulator/APK)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (shareable APK / TestFlight)
eas build --profile preview --platform android

# Production build (store-ready)
eas build --profile production --platform ios
eas build --profile production --platform android
```

### Store submission

```bash
# Android (requires google-service-account.json in secrets/)
eas submit --profile production --platform android

# iOS (requires Apple ID + team ID in eas.json)
eas submit --profile production --platform ios
```

> Place `google-service-account.json` in `./secrets/` before Android submission. This directory is gitignored.

---

## Database Schema

Supabase tables (all with RLS enabled):

| Table | Purpose |
|-------|---------|
| `subscriptions` | User subscription entries (name, price, billing cycle, category) |
| `price_history` | Price change log per subscription |
| `offers` | Curated weekly offers (admin-managed) |

**RLS policies:**
- `subscriptions`: users can CRUD only their own rows (`auth.uid() = user_id`)
- `price_history`: users can insert only for their own subscriptions
- `offers`: readable by authenticated users only

---

## Project Structure

```
subwatch/
├── app/                        # Expo Router screens
│   ├── (auth)/index.tsx       # Login / signup
│   ├── (tabs)/                # Tab navigator
│   │   ├── index.tsx          # Dashboard
│   │   ├── subscriptions.tsx  # Subscription list
│   │   ├── add.tsx            # Add subscription form
│   │   ├── offers.tsx         # Weekly offers + scratch cards
│   │   └── settings.tsx       # Theme, notifications, sign out
│   ├── subscription/[id].tsx  # Subscription detail + price history
│   └── _layout.tsx            # Root layout (auth gate + notifications)
├── src/
│   ├── components/            # ScratchCard (native + web variants)
│   ├── data/templates.ts      # Category templates
│   ├── lib/
│   │   ├── supabase.ts        # Platform-aware Supabase client
│   │   ├── theme.tsx          # Dark/light/system theme provider
│   │   ├── sounds.ts          # Sound effects (native + web)
│   │   └── confetti.ts        # Confetti animations
│   └── types/                 # TypeScript types
├── api/proxy.js               # Vercel serverless proxy for web Supabase
├── assets/                    # App icon, splash, illustrations
├── app.json                   # Expo config (iOS + Android build settings)
└── eas.json                   # EAS build profiles
```

---

## Web Deployment

The web version is deployed on Vercel:

```bash
vercel --prod --token $VERCEL_TOKEN
```

Vercel env vars required:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_BACKEND_URL`

---

## License

MIT © CryptoSI DAO
