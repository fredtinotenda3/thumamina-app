# ThumaMina Delivery 🚴‍♂️📦

A fast, reliable, and modern Uber-style bike delivery application tailored for the Zimbabwean market. Built with React Native + Expo, the ThumaMina app connects senders with nearby riders in real-time and supports multiple payment methods like EcoCash, bank cards, and cash.

> 🚀 Built with performance, scale, and local context in mind.

---

## 📱 Features

- 🔐 **Authentication** via Clerk (secure and scalable)
- 🗺️ **Live Location** & real-time rider tracking (Google Maps API)
- 💳 **Stripe integration** for secure online payments
- 🧾 **Order creation** with pickup & drop-off locations
- ⏱️ **Real-time driver matching** logic
- 🚦 **Order status flow** (pending → assigned → in progress → delivered)
- 💬 (Coming Soon): In-app chat between riders and clients

---

## 🛠️ Tech Stack

| Frontend        | Backend / Infra           | APIs / Integrations     |
|-----------------|----------------------------|--------------------------|
| React Native (Expo) | NeonDB (PostgreSQL)          | Google Maps SDK          |
| Expo Router     | Clerk Authentication      | Stripe Payments          |
| Zustand (Store) | Appwrite / Custom APIs    | Expo EAS Build           |
| Tailwind (NativeWind) | GitHub Actions (CI/CD) | Cloudinary (media)       |

---

## 📸 Screenshots

> _Add your own screenshots or screen recordings here._






---

## 🧪 Getting Started

Clone the repo & install dependencies:

```bash
git clone https://github.com/fredtinotenda3/thumamina-app/
cd thumamina-delivery
npm install

EXPO_PUBLIC_GOOGLE_API_KEY=your_key
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key
STRIPE_SECRET_KEY=your_key
EXPO_PUBLIC_SERVER_URL=https://your-server-url

npx expo start

git checkout -b feature/your-feature-name
git commit -m "✨ Added feature"
git push origin feature/your-feature-name






