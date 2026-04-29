# EstateFlow CRM

A production-ready Real Estate CRM built with **React 18 + TypeScript + Vite**, **Tailwind CSS + ShadCN UI**, and **Supabase** (PostgreSQL, Auth, Storage, RLS, Edge Functions).

## Features

- **Authentication** — Email/password and Google OAuth via Supabase Auth, role-based access (Admin / Sales Manager / Agent), RLS-enforced data isolation.
- **Dashboard** — KPI cards (Properties, Leads, Active Deals, Revenue), lead pipeline chart, recent activity feed.
- **Property Management** — Full CRUD with image uploads to Supabase Storage, filtering by status/type, search, CSV export.
- **Lead Management** — Kanban drag-and-drop pipeline (New → Contacted → Site Visit → Negotiation → Closed), AI lead scoring, assign to agents.
- **Deal Tracking** — Convert leads to deals, track value and expected close date, status management.
- **Notes** — Add notes to leads, properties, and deals with a timeline view.
- **Reports & Analytics** — Revenue trends, conversion funnel, lead source breakdown, property mix — powered by Recharts. PDF and CSV export.
- **Team Management** — Admin panel for role assignment and user oversight.
- **Dark/Light Mode** — System-aware theme toggle.
- **Responsive** — Mobile hamburger nav, full desktop sidebar.
- **Real-time** — Supabase Realtime subscriptions on leads and deals.
- **Email Notifications** — Edge Function to notify agents on new lead assignment (via Resend).
- **Multi-tenant** — Organization-scoped data with RLS for tenant isolation.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | Tailwind CSS, ShadCN UI, Lucide Icons |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| State | TanStack React Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| DnD | @hello-pangea/dnd |
| PDF | html2canvas + jsPDF |

## Getting Started

```bash
# 1. Clone the repo
git clone <YOUR_GIT_URL>
cd estateflow-crm

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Fill in your Supabase URL and anon key

# 4. Run the dev server
npm run dev
```

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com).
2. Run the migration files in `supabase/migrations/` in order via the SQL editor.
3. Enable **Google OAuth** under Authentication → Providers → Google.
4. Create a storage bucket called `property-images` (the migration handles this).
5. Set Edge Function secrets: `RESEND_API_KEY`.

## Project Structure

```
src/
├── components/        # Reusable UI components
│   └── ui/            # ShadCN primitives
├── hooks/             # Custom React hooks (auth, data, debounce, etc.)
├── integrations/      # Supabase client & generated types
├── lib/               # Utilities (format, csv, schemas, storage)
├── pages/             # Route-level page components
└── test/              # Test files

supabase/
├── functions/         # Edge Functions (score-lead, notify-lead-assignment)
└── migrations/        # SQL schema, RLS, indexes, triggers
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon (public) key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |

Edge Function secrets (set via Supabase dashboard):
- `RESEND_API_KEY` — for email notifications

## Deployment

Deploy to any static host (Vercel, Netlify, Cloudflare Pages):

```bash
npm run build
# Outputs to dist/
```

On Vercel, set the environment variables in your project settings and deploy directly from your Git repo.

## License

Private — all rights reserved.
