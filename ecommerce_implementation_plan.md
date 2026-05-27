# 🛒 Elite eCommerce Platform — Implementation Plan

> **Target**: Production-ready, high-converting eCommerce platform  
> **Stack**: Next.js 14 · Tailwind CSS · Framer Motion · Node.js/Express · **MongoDB + Mongoose** · Stripe/Razorpay/PayPal · JWT + Google OAuth  
> **Workspace**: `d:\Games\Vishal Colab`

---

## 📁 Monorepo Structure

```
d:\project\ecom\
├── frontend/                  # Next.js 14 + React (customer store)
│   ├── src/
│   │   ├── app/               # Next.js App Router pages
│   │   │   ├── (store)/       # Customer-facing routes
│   │   │   │   ├── page.tsx           # Home
│   │   │   │   ├── shop/              # Shop listing
│   │   │   │   ├── product/[slug]/    # Product detail
│   │   │   │   ├── category/[slug]/   # Category page
│   │   │   │   ├── cart/              # Cart
│   │   │   │   ├── checkout/          # Checkout
│   │   │   │   ├── wishlist/          # Wishlist
│   │   │   │   ├── orders/            # Order history + tracking
│   │   │   │   ├── account/           # User dashboard
│   │   │   │   ├── auth/              # Login / Register
│   │   │   │   ├── contact/
│   │   │   │   ├── about/
│   │   │   │   ├── faq/
│   │   │   │   └── legal/[slug]/
│   │   │   ├── (admin)/       # Admin panel routes
│   │   │   │   ├── dashboard/
│   │   │   │   ├── products/
│   │   │   │   ├── orders/
│   │   │   │   ├── customers/
│   │   │   │   ├── analytics/
│   │   │   │   └── settings/
│   │   │   ├── layout.tsx     # Root layout
│   │   │   └── globals.css
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # Primitives (Button, Input, Badge…)
│   │   │   ├── layout/        # Navbar, Footer, Sidebar
│   │   │   ├── product/       # ProductCard, ProductGrid, Zoom…
│   │   │   ├── cart/          # CartDrawer, CartItem
│   │   │   ├── checkout/      # CheckoutForm, PaymentStep
│   │   │   ├── auth/          # AuthModal, GoogleButton
│   │   │   └── admin/         # AdminSidebar, DataTable…
│   │   ├── lib/               # API client, utils, hooks
│   │   │   ├── api.ts
│   │   │   ├── hooks/
│   │   │   └── utils.ts
│   │   ├── store/             # Zustand stores
│   │   └── types/             # Frontend-only types
│   ├── public/
│   ├── tailwind.config.js
│   ├── next.config.js
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                   # Node.js + Express REST API
│   ├── src/
│   │   ├── config/            # DB, passport, env validation
│   │   ├── models/            # Mongoose models
│   │   ├── routes/            # Express routers
│   │   ├── controllers/       # Route handler logic
│   │   ├── middleware/        # Auth, error, rate-limit
│   │   ├── services/          # Business logic layer
│   │   │   ├── email/         # Nodemailer + templates
│   │   │   ├── payment/       # Stripe, Razorpay, PayPal
│   │   │   └── storage/       # Cloudinary upload
│   │   ├── shared/            # Types + Zod schemas (shared with FE)
│   │   ├── utils/             # Helpers, token, validators
│   │   └── index.ts           # App entry point
│   ├── tsconfig.json
│   └── package.json
│
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── ENV_SETUP.md
│   └── TESTING.md
├── docker-compose.yml
└── .env.example
```

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Primary | `#0F0F0F` (near-black) |
| Accent | `#6366F1` (indigo) |
| Gold | `#F59E0B` (amber) |
| Surface | `#1A1A2E` (dark glass) |
| Text | `#F8FAFC` |
| Font | Inter + Playfair Display |

**Design Inspiration**: Apple · Nike · Stripe · Shopify · Tesla

---

## 📄 Pages

### Customer-Facing
| Page | Route | Key Features |
|------|-------|--------------|
| Home | `/` | Hero, featured products, social proof, categories, newsletter |
| Shop | `/shop` | Advanced filters, search, infinite scroll, sort |
| Category | `/category/[slug]` | Breadcrumbs, sub-categories, filtered grid |
| Product Detail | `/product/[slug]` | Image zoom, variants, reviews, sticky ATC, upsell |
| Cart | `/cart` | Live totals, coupon, cross-sell, save-for-later |
| Checkout | `/checkout` | One-page, guest+auth, Stripe/Razorpay/PayPal |
| Login/Register | `/auth` | Google OAuth, JWT, OTP option |
| User Dashboard | `/account` | Orders, profile, addresses, preferences |
| Wishlist | `/wishlist` | Share wishlist, move to cart |
| Order Tracking | `/orders/[id]` | Live status, timeline, download invoice |
| Contact | `/contact` | Form + map embed |
| About | `/about` | Brand story, team, values |
| FAQ | `/faq` | Accordion, search FAQs |
| Privacy/Terms | `/legal/[slug]` | CMS-driven |

### Admin Panel (`/admin`)
| Section | Features |
|---------|----------|
| Dashboard | Revenue charts, KPIs, live orders |
| Products | CRUD, variants, bulk import/export |
| Categories | Tree management |
| Orders | List, detail, status update, refunds |
| Customers | List, detail, segments |
| Inventory | Stock alerts, management |
| Coupons | Create/manage discount rules |
| Analytics | Sales, traffic, conversion |
| CMS | Pages, banners, hero content |
| Settings | Store, payment, shipping |

---

## 🔧 Backend API Modules

```
/api/v1/
├── auth/          # login, register, OAuth, refresh, logout
├── users/         # profile, addresses, preferences
├── products/      # CRUD, search, filters, variants
├── categories/    # tree, CRUD
├── cart/          # add, remove, update, merge (guest→auth)
├── wishlist/      # add, remove, list
├── orders/        # create, list, detail, track, cancel
├── payments/      # stripe, razorpay, paypal webhooks
├── reviews/       # add, list, vote
├── coupons/       # validate, apply
├── admin/         # all admin operations
├── search/        # full-text, suggestions, filters
└── email/         # newsletter subscribe, transactional
```

---

## 🗄️ Database Schema (MongoDB via Mongoose)

**Core Collections:**
- `users` (auth, profile, role, addresses embedded)
- `products` (name, slug, description, price, stock, images, variants, SEO)
- `categories` (parent-child via `parentId` ref, tree structure)
- `carts` (userId/sessionId, items array embedded)
- `orders` (userId, items snapshot, payment, status timeline)
- `reviews` (productId, userId, rating, body, votes)
- `coupons` (code, type, value, rules, usage limits)
- `wishlists` (userId, productIds)
- `newsletters` (email, subscribedAt)
- `pages` (CMS — slug, title, content blocks)

> Mongoose schemas use `timestamps: true`, lean queries for performance, and compound indexes on `slug`, `category`, `price`, and `createdAt`.

---

## 🔐 Security Implementation

- Password hashing: **bcryptjs** (12 rounds)
- JWT: short-lived access + long-lived refresh tokens
- Google OAuth: **Passport.js** strategy
- CSRF protection: double-submit cookie pattern
- Rate limiting: **express-rate-limit** per route
- Input validation: **Zod** on both FE and BE
- XSS protection: **helmet.js** + DOMPurify
- NoSQL injection: Mongoose strict mode + `express-mongo-sanitize`
- File uploads: type validation + size limits + virus scan hooks
- HTTPS enforced in production

---

## 💳 Payment Integration

| Provider | Use Case |
|----------|----------|
| **Stripe** | Cards, Apple Pay, Google Pay, subscriptions |
| **Razorpay** | Indian market, UPI, netbanking |
| **PayPal** | International buyers |

All payments use webhook verification + idempotency keys.

---

## ⚡ Performance Strategy

- **SSR** for product/category pages (SEO critical)
- **ISR** (Incremental Static Regeneration) for semi-static pages
- **React Server Components** for data-fetching boundaries
- **Next.js Image** optimization with WebP/AVIF
- **Code splitting** per route + dynamic imports
- **Redis** caching for product lists, search results
- **Lighthouse target: 90+** across all metrics

---

## 🚀 CRO Features

- Exit-intent popup with discount offer
- Email capture popup (10s delay)
- Low-stock / urgency badges ("Only 3 left!")
- Countdown timers on deals
- Sticky "Add to Cart" on mobile scroll
- One-click upsell at cart/checkout
- "Customers also bought" cross-sell
- Abandoned cart recovery emails (3-email sequence)
- Trust badges (secure checkout, free returns, 24/7 support)
- Social proof: live sales notifications, review counts

---

## 📋 Implementation Phases

### Phase 1 — Foundation ✅
- [x] Project planning & architecture
- [x] Monorepo setup (`frontend/` + `backend/` standalone)
- [x] Frontend scaffold (Vite + React + TypeScript + Tailwind)
- [x] Express API scaffold (`src/index.ts` entry point)
- [x] Database schema (Mongoose — 7 models)
- [x] Shared types (`lib/types.ts`)

### Phase 2 — Core Pages ✅
- [x] Design system & Tailwind config (`tailwind.config.js` + `index.css`)
- [x] Global components (Navbar/Header, Footer, Cart Drawer)
- [x] Home page (`Home.tsx`)
- [x] Shop + Category pages (`Shop.tsx`)
- [x] Product Detail page (`ProductDetail.tsx`)

### Phase 3 — Commerce Features 🔄 In Progress
- [x] Cart & Checkout flow (`Cart.tsx`, `Checkout.tsx`, `CartContext.tsx`)
- [ ] Payment integration (Stripe/Razorpay — backend hooks ready, FE incomplete)
- [x] Auth (JWT — `auth.controller.ts`, `auth.ts` middleware, `AuthContext.tsx`)
- [x] Google OAuth sign-in — One Tap + passwordless login using already-logged-in Google account
- [ ] Email verification on registration (verification link via Nodemailer)
- [ ] Two-factor authentication (Auth0 / TOTP-based 2FA)
- [x] User Dashboard (`Dashboard.tsx`)
- [x] Order Tracking (`OrderTracking.tsx`)

### Phase 4 — Admin Panel 🔄 In Progress
- [x] Admin layout & auth (`Admin.tsx` with role-guard)
- [x] Product management (admin product section in `Admin.tsx`)
- [x] Order management (admin order section in `Admin.tsx`)
- [ ] Analytics dashboard (placeholder — charts not wired to live data)
- [ ] CMS controls (not yet implemented)

### Phase 5 — Advanced Features 🔄 In Progress
- [x] Reviews & Ratings (`Review.ts` model, `review.controller.ts`, `StarRating.tsx`)
- [x] Wishlist (`WishlistContext.tsx`, wishlist routes)
- [x] Coupon system (`Coupon.ts` model, coupon route scaffolded)
- [ ] Email notifications (Nodemailer not yet configured)
- [ ] CRO features (popups, urgency, upsell — not yet implemented)

### Phase 6 — Production ⏳ Not Started
- [ ] Testing suite (Jest + Playwright)
- [ ] Docker + CI/CD
- [ ] Deployment guide
- [ ] SEO audit
- [ ] Performance optimization

---

## 🧪 Testing Strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit | Jest + Testing Library | Components, utils, API handlers |
| Integration | Supertest | API endpoints |
| E2E | Playwright | Critical user flows |
| Performance | Lighthouse CI | Score monitoring |

---

## 📦 Key Dependencies

### Frontend (`apps/web`)
```json
{
  "next": "14.x",
  "react": "18.x",
  "tailwindcss": "3.x",
  "framer-motion": "11.x",
  "@stripe/stripe-js": "latest",
  "zustand": "4.x",
  "react-query": "5.x",
  "react-hook-form": "7.x",
  "zod": "3.x",
  "lucide-react": "latest",
  "react-hot-toast": "latest",
  "swiper": "11.x"
}
```

### Backend (`packages/api`)
```json
{
  "express": "4.x",
  "mongoose": "8.x",
  "express-mongo-sanitize": "2.x",
  "jsonwebtoken": "9.x",
  "bcryptjs": "2.x",
  "passport": "0.7.x",
  "stripe": "14.x",
  "razorpay": "2.x",
  "helmet": "7.x",
  "express-rate-limit": "7.x",
  "zod": "3.x",
  "nodemailer": "6.x",
  "multer": "1.x",
  "redis": "4.x"
}
```
