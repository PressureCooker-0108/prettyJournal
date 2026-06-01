<div align="center">

# 🌸 PrettyJournal

**A Production-Grade AI-Era Journaling & Habit Tracking Web Application**

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat-square&logo=postgresql)](https://neon.tech/)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?style=flat-square&logo=clerk)](https://clerk.com/)
[![Zod](https://img.shields.io/badge/Validation-Zod-3E67B1?style=flat-square)](https://zod.dev/)

*A mobile-first journaling platform built with the latest React 19 concurrency model, serverless architecture, and enterprise-grade data validation — deployed on the edge.*

</div>

---

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Architecture](#-architecture)
- [Feature Highlights](#-feature-highlights)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Data Models](#-data-models)
- [Security & Validation](#-security--validation)
- [Performance Engineering](#-performance-engineering)
- [Observability & Telemetry](#-observability--telemetry)
- [Mobile-First Design](#-mobile-first-design)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Database Setup](#-database-setup)
- [Engineering Decisions & Trade-offs](#-engineering-decisions--trade-offs)

---

## 🎯 Project Overview

PrettyJournal is a **full-stack, serverless journaling application** that lets authenticated users record daily mood entries, reflect through free-form text, and build positive habits — all visualised in a beautiful calendar patchwork grid. 

This project was engineered with a strong emphasis on **production readiness**: strict input validation at every data boundary, multi-user row-level data isolation enforced at the database layer, optimistic UI updates using React 19's `useOptimistic` hook, and structured JSON telemetry for operational visibility.

### What makes this different from a tutorial project?

| Aspect | Tutorial-Grade | PrettyJournal |
|---|---|---|
| Auth | Hardcoded user or no auth | Clerk JWTs, server-side `auth()` guard on every action |
| Validation | None | Zod schemas with regex, enum, and HTML-escape transforms |
| Database | Single-user, no isolation | Compound `@@unique([userId, date])` — no cross-user data leaks possible |
| UI updates | Full-page reload | React 19 `useOptimistic` with `startTransition` |
| Auto-save | `onBlur` or manual button | 1500ms debounce timer, cleaned up on unmount |
| Error handling | `console.log` | Structured JSON logger with `userId` context, no PII leakage |
| Mobile | Responsive breakpoints | Bottom Sheet native-feel drawer, thumb-zone sticky nav |
| Connection pool | New client per request | Prisma singleton via `globalThis`, serverless-safe |

---

## 🏗 Architecture

PrettyJournal follows a **3-Tier Serverless Architecture** that cleanly separates concerns across presentation, compute, and data layers.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (Client)                  │
│  React 19 · useOptimistic · Debounced Auto-Save · Mobile-First  │
│  Bottom Sheet Drawer · Sticky Bottom Nav · Toast Notifications  │
└───────────────────────────┬─────────────────────────────────────┘
                            │  Next.js Server Actions (RPC-style)
┌───────────────────────────▼─────────────────────────────────────┐
│                     COMPUTE LAYER (Server)                      │
│  Clerk auth() guard → Zod validation → Prisma query → Logger   │
│  Next.js App Router · Edge-compatible · No exposed REST API     │
└───────────────────────────┬─────────────────────────────────────┘
                            │  Prisma ORM + @prisma/adapter-neon
┌───────────────────────────▼─────────────────────────────────────┐
│                      DATA LAYER (Database)                      │
│    Neon Serverless PostgreSQL · Connection Pooling · CUID IDs   │
│    @@unique([userId, date]) · String[] for habit completions    │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Choices

1. **Next.js Server Actions** replace a traditional REST API. This eliminates a network round-trip, keeps secrets server-only, and allows seamless type-sharing between client and server with zero boilerplate.

2. **Neon Serverless PostgreSQL** scales to zero and wakes in milliseconds, making it cost-optimal for a hobby/indie project while remaining production-ready.

3. **Prisma 7 with `@prisma/adapter-neon`** uses the native Neon WebSocket driver, eliminating the TCP connection overhead typical of traditional PostgreSQL drivers in serverless functions.

4. **Clerk** handles authentication entirely outside the application code — JWTs are verified server-side on every request. The app never stores passwords or manages sessions directly.

---

## ✨ Feature Highlights

### 📅 Watercolor Patchwork Grid
A calendar view renders each day of the month as a coloured tile. Three mood states map to a curated pastel palette (`cream`, `off-white`, `pink`). Tiles fill in with colour the moment the user saves an entry — no reload required.

### ✍️ Journal Editor with Debounced Auto-Save
Clicking any day opens a drawer (bottom sheet on mobile, side sheet on desktop) with a responsive textarea. A **1500ms debounce timer** triggers auto-save after the user stops typing, decoupling typing latency from database round-trips. The timer is cleaned up on unmount to prevent stale closure memory leaks.

### ✅ Habit Tracker with Optimistic UI
Users can define named habits and check them off per day. Checkboxes update **instantly in the UI** via React 19's `useOptimistic` hook and `startTransition`, then reconcile with the server in the background. If the server returns an error, the state rolls back automatically.

### 🔐 Per-User Data Isolation
Every database query filters by the authenticated `userId` returned by Clerk's `auth()`. Additionally, a **compound unique index** `@@unique([userId, date])` at the Prisma schema level enforces that it is physically impossible for one user's data to appear under another user's account.

### 📱 Mobile-First Native Feel
On viewports under 768px, the editor transitions to a **bottom sheet** that slides up from the bottom of the screen (85–90% viewport height), complete with a drag-handle affordance. A sticky bottom navigation bar keeps primary actions within thumb reach at all times.

---

## 🧰 Technology Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| **Next.js** | 16.2.6 | App Router, Server Actions, SSR/RSC |
| **React** | 19.2.4 | `useOptimistic`, `startTransition`, concurrent rendering |
| **TypeScript** | 5.x | End-to-end type safety |
| **Tailwind CSS** | 4.x | Utility-first styling, responsive design |
| **shadcn/ui** | 4.x | Accessible component primitives (Sheet, Checkbox, Button) |
| **Lucide React** | 1.x | Icon system |
| **Radix UI** | 1.x | Headless accessible UI primitives |

### Backend / Server
| Technology | Version | Role |
|---|---|---|
| **Next.js Server Actions** | — | Type-safe RPC layer, replaces REST API |
| **Clerk** | 7.x | Authentication, JWT verification, user management |
| **Zod** | 4.x | Runtime schema validation and input sanitization |

### Database
| Technology | Version | Role |
|---|---|---|
| **Prisma ORM** | 7.x | Schema definition, type-safe query builder, migrations |
| **Neon Postgres** | — | Serverless PostgreSQL with auto-scaling |
| **@prisma/adapter-neon** | 7.x | WebSocket-based driver for serverless compatibility |
| **@neondatabase/serverless** | 1.x | Low-latency WebSocket connection to Neon |

---

## 📁 Project Structure

```
journalling-app/
├── prisma/
│   ├── schema.prisma          # Data models, compound unique indexes
│   └── seed.ts                # Seeding script for 30 days of mock data
├── prisma.config.ts           # Prisma configuration (seed path)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx         # Root layout, ClerkProvider, global fonts
│   │   ├── page.tsx           # Main application page (≈1,081 lines)
│   │   │                      #   ↳ Calendar grid, drawer, habit sidebar
│   │   │                      #   ↳ useOptimistic, debounce, mobile detection
│   │   └── actions.ts         # All server actions (auth guard + Zod + Prisma)
│   │
│   ├── lib/
│   │   ├── db.ts              # Prisma singleton (globalThis pattern)
│   │   ├── schemas.ts         # Zod schemas: EntrySchema, HabitSchema, etc.
│   │   └── logger.ts          # Structured JSON logger (no PII leakage)
│   │
│   ├── components/
│   │   └── ui/                # shadcn/ui component overrides
│   │       ├── sheet.tsx
│   │       ├── button.tsx
│   │       └── checkbox.tsx
│   │
│   └── types/
│       └── index.ts           # Shared TypeScript interfaces (JournalEntry, Habit)
│
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🗄 Data Models

```prisma
// prisma/schema.prisma

model JournalEntry {
  id      String @id @default(cuid())
  userId  String                        // Clerk user ID
  date    String                        // YYYY-MM-DD
  mood    String                        // "cream" | "off-white" | "pink"
  content String                        // HTML-escaped journal text

  @@unique([userId, date])              // Prevents duplicate entries per user per day
                                        // AND enforces multi-tenant data isolation
}

model Habit {
  id             String   @id @default(cuid())
  userId         String                        // Clerk user ID
  name           String                        // User-defined habit name (max 100 chars)
  completedDates String[]                      // Array of YYYY-MM-DD strings
}
```

The `@@unique([userId, date])` compound index serves dual purposes:
- **Business Logic**: Enforces one entry per user per day (upsert semantics).
- **Security**: Makes cross-user data access physically impossible at the schema level.

---

## 🔒 Security & Validation

Every server action follows a strict 3-step guard chain:

```typescript
// Pattern used in every server action in src/app/actions.ts

export async function upsertJournalEntry(date, mood, content) {
  // Step 1: Authenticate — throws "Unauthorized" if no valid JWT
  const userId = await requireAuth();

  // Step 2: Validate — rejects malformed data before it touches the DB
  const parsed = EntrySchema.safeParse({ date, mood, content });
  if (!parsed.success) return { success: false, error: parsed.error };

  // Step 3: Query — always scoped to the authenticated userId
  await db.journalEntry.upsert({
    where: { userId_date: { userId, date: parsed.data.date } },
    // ...
  });
}
```

### Zod Validation Schemas (`src/lib/schemas.ts`)

| Schema | Validates |
|---|---|
| `EntrySchema` | Date format (YYYY-MM-DD regex), mood enum, HTML-escaped content |
| `HabitSchema` | Name: min 1, max 100 chars, trimmed |
| `ToggleHabitSchema` | habitId (non-empty), date (YYYY-MM-DD), isCompleted (boolean) |
| `DeleteHabitSchema` | id (non-empty string) |

The `EntrySchema` content field applies a **transform** that HTML-escapes `&`, `<`, `>`, `"`, and `'` characters before they are written to the database, preventing stored XSS attacks.

---

## ⚡ Performance Engineering

### Prisma Singleton (Serverless-Safe Connection Pool)

Next.js hot reloads can instantiate multiple Prisma clients in development, exhausting the database connection pool. `src/lib/db.ts` solves this with the `globalThis` singleton pattern:

```typescript
// src/lib/db.ts
const globalForPrisma = globalThis as typeof globalThis & { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: { url: `${process.env.DATABASE_URL}?connection_limit=10` }
  }
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

`connection_limit=10` is appended to the connection string to explicitly cap the pool and prevent serverless function proliferation from exhausting Neon's 100-connection default.

### React 19 `useOptimistic` + `startTransition`

Habit checkbox toggles update the UI **synchronously** before the server confirms, giving users zero-latency feedback:

```typescript
startTransition(async () => {
  // Update UI immediately — no waiting for network
  setOptimisticHabits({ type: "toggle", habitId, date, checked: newValue });
  
  // Server write happens in the background
  const result = await toggleHabitCompletionAction(habitId, date, newValue);
  
  // On failure, optimistic state is discarded and real state restores
  if (!result.success) revalidate();
});
```

### Debounced Auto-Save

A `useRef`-based debounce timer fires the `upsertJournalEntry` server action 1500ms after the user stops typing. This prevents N database writes for N keystrokes:

```typescript
const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const triggerAutoSave = (content, mood) => {
  if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
  debounceTimeoutRef.current = setTimeout(async () => {
    await upsertJournalEntry(selectedDateStr, mood, content);
  }, 1500);
};

// Cleanup on unmount — prevents stale closure memory leak
useEffect(() => () => {
  if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
}, []);
```

---

## 📊 Observability & Telemetry

`src/lib/logger.ts` implements a **structured JSON logger** that outputs machine-parseable log lines compatible with Vercel's log drains, Datadog, and similar observability platforms.

### Log Format

```json
{
  "timestamp": "2026-06-01T18:30:00.000Z",
  "level": "ERROR",
  "message": "Error in upsertJournalEntry",
  "context": {
    "userId": "user_2abc123",
    "action": "upsertJournalEntry",
    "date": "2026-06-01"
  },
  "error": {
    "name": "PrismaClientKnownRequestError",
    "message": "Unique constraint failed on the fields: (`userId`,`date`)",
    "stack": "..."
  }
}
```

**Privacy-first design**: The `content` field is explicitly deleted from log context before serialization — user journal text **never appears in logs**, even in error scenarios. Only the `userId`, action name, and date are attached for traceability.

---

## 📱 Mobile-First Design

The UI was designed for **>90% mobile usage** from the ground up:

| Feature | Desktop (≥768px) | Mobile (<768px) |
|---|---|---|
| Editor Drawer | Side sheet (slides from right) | **Bottom sheet** (slides up, 85% viewport height) |
| Drag Handle | Not shown | ✅ Rounded pill at top of sheet |
| Textarea Focus | Standard | Auto-focuses after 150ms animation delay to open keyboard smoothly |
| Navigation | Top header actions | **Sticky bottom navigation bar** in thumb-zone |
| Grid | Multi-column calendar | Scrollable compact grid |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Neon](https://neon.tech/) database (free tier works)
- A [Clerk](https://clerk.com/) application (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/prettyjournal.git
cd prettyjournal

# Install dependencies
npm install

# Set up environment variables (see below)
cp .env.example .env.local

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed with 30 days of sample data
npx prisma db seed

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔑 Environment Variables

Create a `.env.local` file in the project root:

```env
# Neon PostgreSQL — Pooled connection (used by Prisma at runtime)
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"

# Neon PostgreSQL — Direct connection (used by Prisma CLI for migrations)
DATABASE_URL_UNPOOLED="postgresql://user:password@host/db?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk redirect routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

---

## 🗃 Database Setup

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Apply schema changes to Neon (creates tables)
npx prisma db push

# Seed the database with 30 days of mock entries + 1 habit
npx prisma db seed

# Open Prisma Studio to inspect your data visually
npx prisma studio
```

---

## 🧠 Engineering Decisions & Trade-offs

### Why Server Actions instead of a REST API?
Next.js Server Actions let the client call server-side functions directly — no `fetch`, no route handlers, no API versioning. The function signatures act as the contract, TypeScript enforces the types, and Next.js handles serialisation/deserialisation. For a monolithic full-stack app, this is faster to build and easier to maintain.

### Why Neon over PlanetScale/Supabase?
Neon's branching model is ideal for development (branch per feature, zero cost). The `@prisma/adapter-neon` WebSocket driver works in edge runtimes and serverless functions without TCP connection overhead. Neon's free tier includes 10GB storage and compute that scales to zero.

### Why Zod v4?
Zod 4 introduced a ~14× performance improvement over v3 in parsing throughput, better error messages, and a cleaner `z.enum()` API. Since every server action parses inputs synchronously before hitting the database, parse performance directly affects request latency.

### Why `useOptimistic` over `useState` + `useEffect`?
React 19's `useOptimistic` is purpose-built for server mutation scenarios. It automatically reverts to the "truth" state if a `startTransition` throws or returns an error — making rollback logic zero-cost. A manual `useState` + `useEffect` approach requires explicit rollback code and is prone to state divergence bugs.

### Why a Custom Logger instead of `console.log`?
`console.log` outputs unstructured strings. On Vercel (and most modern log aggregation platforms), **JSON logs are automatically parsed and indexed** — enabling field-level filtering (`level:ERROR`, `userId:user_123`). A structured logger adds negligible overhead but dramatically improves operational debugging.

---

## 📄 License

MIT — feel free to fork, learn from, and build on this project.

---

<div align="center">

Built with ❤️ and ☕ by [Aditya](https://github.com/your-username)

*"The act of writing is the act of discovering what you believe." — David Hare*

</div>
