# The Hint — Web

**The Hint** is an independent digital newspaper built on Next.js with a Git-as-database philosophy. All content, drafts, subscriber data, and authentication tokens are stored directly in a GitHub repository via the GitHub API. There is no traditional database.

## 🚀 Live Site

[https://the-hint-web.vercel.app](https://the-hint-web.vercel.app)

---

## 📋 Table of Contents

- [Technology Stack](#technology-stack)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Architecture Overview](#architecture-overview)
- [Deployment](#deployment)
- [License](#license)

---

## 🛠 Technology Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | [Next.js](https://nextjs.org/) (App Router) | ^16.1.4 |
| Language | [TypeScript](https://www.typescriptlang.org/) | ^5 |
| UI | [React](https://react.dev/) | ^19.2.3 |
| Styling | [Tailwind CSS](https://tailwindcss.com/) v4 + CSS Modules | ^4.1.18 |
| Git Backend | [Octokit](https://github.com/octokit/octokit.js) (GitHub REST API) | ^5.0.5 |
| Media Storage | [Supabase Storage](https://supabase.com/storage) (CDN) | ^2.95.3 |
| Email Delivery | [Resend](https://resend.com/) | ^6.9.2 |
| Auth Tokens | [JOSE](https://github.com/panva/jose) (JWT / HS256) | ^6.1.3 |
| Markdown Parsing | [js-yaml](https://github.com/nodeca/js-yaml) + [marked](https://marked.js.org/) | ^4.1.1 / ^17.0.1 |
| Image Processing | [Sharp](https://sharp.pixelplumbing.com/) | ^0.34.5 |

---

## ✨ Features

### Reader Features
- **Homepage**: Broadsheet layout with lead story, top stories, and section blocks
- **Sections**: Politics, Crime, Court, Opinion, World Affairs
- **Article Pages**: Full content with metadata, recommendations, and social embeds
- **Search**: Full-text article search
- **Newsletter**: Subscription and unsubscription system
- **Bilingual Support**: English and Kannada content

### Editor Features
- **Publishing Console**: Full-featured article editor with block-based editing
- **Draft Management**: Auto-save drafts with Git-backed persistence
- **Media Upload**: Image uploads to Supabase Storage with CDN delivery
- **Video Embeds**: Support for YouTube, Vimeo, TikTok, Instagram, Twitter/X
- **Magic Link Auth**: Secure, passwordless authentication for editors

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.x or later
- **npm** 9.x or later
- A **GitHub account** with a Personal Access Token (repo read/write access)
- A **Supabase account** (for media storage)
- A **Resend account** (for email delivery)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/the-hint.git
cd the-hint-web
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Fill in the required environment variables (see [Environment Variables](#environment-variables) section).

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3002](http://localhost:3002) in your browser.

---

## 🔐 Environment Variables

### Required (All Environments)

| Variable | Purpose |
|----------|---------|
| `AUTHORIZED_EDITOR_EMAIL` | Single authorized editor email address |
| `MAGIC_LINK_SECRET` | HMAC secret for JWT magic link tokens |
| `GIT_TOKEN` | GitHub Personal Access Token (repo read/write) |
| `GIT_REPO_OWNER` | GitHub repository owner (username/org) |
| `GIT_REPO_NAME` | GitHub repository name |

### Required (Production Only)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |
| `SUPABASE_STORAGE_BUCKET` | Storage bucket name (default: `article-images`) |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Sender email address |
| `APP_BASE_URL` | Production base URL (e.g., `https://thehint.news`) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL for metadata/sitemap |

### Optional

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Secret for cron job authentication |
| `VERCEL` | Auto-set by Vercel (used for `secure` cookie flag) |

> ⚠️ **Security Note**: Never commit your `.env.local` file or expose API keys in client-side code. All sensitive variables are server-side only except those prefixed with `NEXT_PUBLIC_`.

---

## 📁 Project Structure

```
the-hint-web/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── layout.tsx          # Root layout (Header, Footer, Analytics)
│   │   ├── page.tsx            # Homepage
│   │   ├── [section]/          # Dynamic section & article routes
│   │   ├── about/              # Static about page
│   │   ├── contact/            # Contact page
│   │   ├── newsroom/           # Editor login page
│   │   ├── publish/            # Publishing console (auth-gated)
│   │   ├── api/                # API route handlers
│   │   │   ├── auth/           # Magic link auth endpoints
│   │   │   ├── publish/        # Article CRUD endpoints
│   │   │   ├── media/          # Image/video upload endpoints
│   │   │   ├── subscribe/      # Newsletter subscription
│   │   │   └── search/         # Full-text article search
│   │   └── sitemap.ts          # Dynamic XML sitemap
│   │
│   ├── components/             # React UI components
│   │   ├── layout/             # Header, Footer
│   │   ├── editorial/          # Homepage editorial blocks
│   │   ├── article/            # Article rendering components
│   │   ├── publish/            # Publishing console components
│   │   ├── features/           # Search, Subscribe modal
│   │   └── feedback/           # Toast, error components
│   │
│   ├── lib/                    # Business logic & utilities
│   │   ├── content/            # Article reading, parsing, homepage curation
│   │   ├── git/                # GitHub API service (Octokit)
│   │   ├── auth/               # Magic link auth, JWT sessions
│   │   ├── media/              # Image upload, video providers
│   │   ├── subscription/       # Email queue, subscriber management
│   │   └── env.ts              # Environment variable validation
│   │
│   └── content/                # Git-backed article content (Markdown)
│       ├── politics/
│       ├── crime/
│       ├── court/
│       ├── opinion/
│       └── world-affairs/
│
├── data/                       # Git-backed data files
│   ├── subscribers.json        # Newsletter subscriber list
│   └── subscription-events.json # Email dispatch queue
│
├── public/                     # Static assets
│   ├── brand/                  # Logo
│   └── images/                 # Static images
│
├── scripts/                    # Utility scripts
│   └── gen_token.mjs           # Magic link token generator
│
└── next.config.ts              # Next.js configuration
```

---

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3002 |
| `npm run build` | Production build (validates types & linting) |
| `npm run start` | Start production server on port 3002 |
| `npm run lint` | Run ESLint |

---

## 🏗 Architecture Overview

### Core Design Principles

1. **Git as Database**: All persistent state (articles, drafts, subscribers, auth tokens, email queue) lives in the GitHub repository as JSON/Markdown files, committed via the GitHub REST API.

2. **No Traditional Database**: No PostgreSQL, MySQL, or MongoDB. Supabase is used only for binary media storage (images), not relational data.

3. **Serverless-First**: All operations are stateless and compatible with Vercel's serverless functions. No local filesystem writes.

4. **Single Authorized Editor**: The publishing console is gated to exactly one email address (`AUTHORIZED_EDITOR_EMAIL`). No multi-user auth.

### Content Sections

The six editorial sections are:

- `Local` — Regional news, city updates, and community events.
- `politics` — Political news and analysis
- `crime` — Crime reports and investigations
- `court` — Court proceedings and legal news
- `opinion` — Editorials and opinion pieces
- `world-affairs` — International news


### Authentication Flow

The publishing console uses a magic link authentication system:

1. Editor visits `/newsroom` and enters their email
2. System sends a magic link with a signed JWT token
3. Editor clicks the link, system verifies token and sets session cookie
4. Session expires after 2 hours (configurable)

---

## 🚀 Deployment

This application is optimized for deployment on [Vercel](https://vercel.com/):

1. Push your code to a GitHub repository
2. Connect the repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Important Deployment Notes

- Pages use `force-dynamic` with `revalidate = 60` to avoid build-time GitHub API timeouts on Vercel's free tier
- The `VERCEL` environment variable is auto-set by Vercel and used for secure cookie flags
- Media uploads require the Supabase service role key with appropriate RLS policies

---

## 📄 License

This project is proprietary and confidential. All rights reserved.

---

## 📚 Additional Documentation

- [Architecture Documentation](./architecture.md) — Detailed technical architecture and data flow diagrams
- For deployment-specific instructions, see deployment configuration in your Vercel dashboard

---

<p align="center">Built with ❤️ by The Hint Team</p>
