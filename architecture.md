# The Hint Web — Architecture Documentation

> **The Hint** is an independent digital newspaper built on Next.js 15 (App Router) with a Git-as-database philosophy. All content, drafts, subscriber data, and authentication tokens are stored directly in the GitHub repository via the GitHub API (Octokit). There is no traditional database.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Directory Structure](#3-directory-structure)
4. [App Router — Pages & Routes](#4-app-router--pages--routes)
5. [API Routes](#5-api-routes)
6. [Component Architecture](#6-component-architecture)
7. [Library Layer (`src/lib`)](#7-library-layer-srclib)
8. [Content System](#8-content-system)
9. [Authentication System](#9-authentication-system)
10. [Publishing Console](#10-publishing-console)
11. [Media System](#11-media-system)
12. [Subscription & Email System](#12-subscription--email-system)
13. [Feedback & Error System](#13-feedback--error-system)
14. [Data Flow Diagrams](#14-data-flow-diagrams)
15. [Environment Variables](#15-environment-variables)
16. [SEO & Metadata](#16-seo--metadata)

---

## 1. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^16.1.4 |
| Language | TypeScript | ^5 |
| UI | React | ^19.2.3 |
| Styling | Tailwind CSS v4 + CSS Modules | ^4.1.18 |
| Git Backend | Octokit (GitHub REST API) | ^5.0.5 |
| Media Storage | Supabase Storage (CDN) | ^2.95.3 |
| Email Delivery | Resend | ^6.9.2 |
| Auth Tokens | JOSE (JWT / HS256) | ^6.1.3 |
| Markdown Parsing | js-yaml + marked | ^4.1.1 / ^17.0.1 |
| Image Processing | Sharp | ^0.34.5 |
| Concurrency | async-mutex | ^0.5.0 |
| Unique IDs | uuid | ^13.0.0 |
| XML Parsing | fast-xml-parser | ^5.3.4 |
| Deployment | Vercel (free tier) | — |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER / CLIENT                            │
│  Public Reader UI  │  Publishing Console (auth-gated)               │
└────────────┬───────────────────────┬────────────────────────────────┘
             │ HTTP / RSC            │ HTTP (fetch)
             ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP ROUTER (Vercel)                      │
│                                                                     │
│  ┌──────────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│  │  Server Components│   │  API Route Handlers│   │  Middleware     │  │
│  │  (RSC, ISR/Dynamic│   │  /api/**          │   │  (auth guard)  │  │
│  └────────┬─────────┘   └────────┬─────────┘   └────────────────┘  │
│           │                      │                                  │
└───────────┼──────────────────────┼──────────────────────────────────┘
            │                      │
     ┌──────▼──────┐        ┌──────▼──────────────────────────────┐
     │  lib/content │        │  lib/git  (GitHub API via Octokit)  │
     │  (reader,    │        │  Single source of truth for:        │
     │   parser,    │◄───────│  - Published articles (.md)         │
     │   homepage)  │        │  - Drafts (.json)                   │
     └─────────────┘        │  - Subscribers (JSON)               │
                             │  - Auth tokens (JSON)               │
                             │  - Subscription queue (JSON)        │
                             └──────────────────────────────────────┘
                                          │
                    ┌─────────────────────┼──────────────────────┐
                    │                     │                       │
             ┌──────▼──────┐    ┌─────────▼──────┐    ┌─────────▼──────┐
             │  Supabase   │    │    Resend       │    │  GitHub Repo   │
             │  Storage    │    │  (Email API)    │    │  (Content DB)  │
             │  (Images)   │    │                 │    │                │
             └─────────────┘    └─────────────────┘    └────────────────┘
```

### Core Design Principles

- **Git as Database**: All persistent state (articles, drafts, subscribers, auth tokens, email queue) lives in the GitHub repository as JSON/Markdown files, committed via the GitHub REST API.
- **No Traditional Database**: No PostgreSQL, MySQL, or MongoDB. Supabase is used only for binary media storage (images), not relational data.
- **Serverless-First**: All operations are stateless and compatible with Vercel's serverless functions. No local filesystem writes.
- **ISR + Force-Dynamic**: Pages use `force-dynamic` with `revalidate = 60` to avoid build-time GitHub API timeouts on Vercel's free tier.
- **Single Authorized Editor**: The publishing console is gated to exactly one email address (`AUTHORIZED_EDITOR_EMAIL`). No multi-user auth.

---

## 3. Directory Structure

```
the-hint-web/
├── src/
│   ├── app/                    # Next.js App Router pages & API routes
│   │   ├── layout.tsx          # Root layout (Header, Footer, Analytics, SubscribePopup)
│   │   ├── page.tsx            # Homepage
│   │   ├── [section]/          # Dynamic section & article routes
│   │   │   ├── (index)/page.tsx    # Section listing page
│   │   │   └── [slug]/page.tsx     # Individual article page
│   │   ├── about/              # Static about page
│   │   ├── contact/            # Contact page
│   │   ├── newsroom/           # Editor login page
│   │   ├── publish/            # Publishing console (auth-gated)
│   │   ├── privacy/            # Privacy policy
│   │   ├── terms/              # Terms of service
│   │   ├── unsubscribe/        # Email unsubscribe page
│   │   ├── api/                # API route handlers
│   │   │   ├── auth/           # Magic link auth endpoints
│   │   │   ├── publish/        # Article CRUD endpoints
│   │   │   ├── media/          # Image/video upload endpoints
│   │   │   ├── subscribe/      # Newsletter subscription
│   │   │   ├── unsubscribe/    # Newsletter unsubscription
│   │   │   ├── search/         # Article search
│   │   │   ├── oembed/         # oEmbed proxy
│   │   │   ├── admin/          # Admin utilities
│   │   │   └── internal/       # Internal cron endpoints
│   │   ├── sitemap.ts          # Dynamic XML sitemap
│   │   └── robots.ts           # robots.txt
│   │
│   ├── components/             # React UI components
│   │   ├── layout/             # Header, Footer
│   │   ├── editorial/          # Homepage editorial blocks
│   │   ├── article/            # Article rendering components
│   │   ├── publish/            # Publishing console components
│   │   │   ├── desktop/        # Desktop editor components
│   │   │   ├── mobile/         # Mobile editor components
│   │   │   ├── common/         # Shared publish components
│   │   │   └── types/          # TypeScript types for editor
│   │   ├── features/           # Feature components (Search, Subscribe)
│   │   ├── feedback/           # Toast, InlineError components
│   │   ├── skeleton/           # Loading skeleton components
│   │   ├── analytics/          # Analytics integration
│   │   └── ui/                 # Generic UI primitives
│   │
│   ├── lib/                    # Business logic & utilities
│   │   ├── content/            # Article reading, parsing, homepage curation
│   │   ├── git/                # GitHub API service (Octokit)
│   │   ├── auth/               # Magic link auth, JWT sessions
│   │   ├── media/              # Image upload, video providers
│   │   ├── subscription/       # Email queue, subscriber management
│   │   ├── publish/            # Draft management
│   │   ├── feedback/           # Error codes, translations, logger
│   │   ├── validation/         # Input validation schemas
│   │   ├── env.ts              # Environment variable validation
│   │   └── utils.ts            # General utilities
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useIsMobile.ts      # Responsive breakpoint detection
│   │   └── useSessionTimer.ts  # Editor session countdown timer
│   │
│   └── content/                # Git-backed article content (Markdown)
│       ├── politics/
│       ├── crime/
│       ├── court/
│       ├── opinion/
│       ├── world-affairs/
│       └── drafts/             # Draft articles (JSON)
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
│   ├── gen_token.mjs           # Magic link token generator
│   └── send-welcome-test.ts    # Email test script
│
├── next.config.ts              # Next.js configuration
├── tsconfig.json               # TypeScript configuration
└── postcss.config.js           # PostCSS / Tailwind config
```

---

## 4. App Router — Pages & Routes

### Public Pages

| Route | File | Description |
|---|---|---|
| `/` | [`src/app/page.tsx`](src/app/page.tsx) | Homepage — broadsheet layout with lead story, top stories, section blocks |
| `/[section]` | [`src/app/[section]/(index)/page.tsx`](src/app/[section]/(index)/page.tsx) | Section listing page (politics, crime, court, opinion, world-affairs) |
| `/[section]/[slug]` | [`src/app/[section]/[slug]/page.tsx`](src/app/[section]/[slug]/page.tsx) | Individual article page with full content, metadata, recommendations |
| `/about` | [`src/app/about/page.tsx`](src/app/about/page.tsx) | About The Hint |
| `/contact` | [`src/app/contact/page.tsx`](src/app/contact/page.tsx) | Contact form |
| `/privacy` | [`src/app/privacy/page.tsx`](src/app/privacy/page.tsx) | Privacy policy |
| `/terms` | [`src/app/terms/page.tsx`](src/app/terms/page.tsx) | Terms of service |
| `/unsubscribe` | [`src/app/unsubscribe/page.tsx`](src/app/unsubscribe/page.tsx) | Email unsubscribe flow |

### Editor Pages (Auth-Gated)

| Route | File | Description |
|---|---|---|
| `/newsroom` | [`src/app/newsroom/page.tsx`](src/app/newsroom/page.tsx) | Editor login — requests magic link via email |
| `/publish` | [`src/app/publish/page.tsx`](src/app/publish/page.tsx) | Full publishing console (article editor + content database) |

### System Pages

| Route | File | Description |
|---|---|---|
| `/sitemap.xml` | [`src/app/sitemap.ts`](src/app/sitemap.ts) | Dynamically generated XML sitemap |
| `/robots.txt` | [`src/app/robots.ts`](src/app/robots.ts) | Crawler rules (blocks `/newsroom`, `/api`, `/admin`) |

### Content Sections

The five editorial sections are:

```
politics | crime | court | opinion | world-affairs
```

Each maps to a folder under `src/content/` in the repository. The `[section]` dynamic segment in the URL is validated against this list at runtime.

---

## 5. API Routes

### Authentication

| Endpoint | Method | File | Description |
|---|---|---|---|
| `/api/auth/request-link` | POST | [`route.ts`](src/app/api/auth/request-link/route.ts) | Sends magic link email to authorized editor |
| `/api/auth/verify` | GET | [`route.ts`](src/app/api/auth/verify/route.ts) | Verifies magic link token, creates JWT session cookie |
| `/api/auth/session-status` | GET | [`route.ts`](src/app/api/auth/session-status/route.ts) | Returns session validity and remaining time (ms) |
| `/api/auth/refresh-session` | POST | [`route.ts`](src/app/api/auth/refresh-session/route.ts) | Rotates session JWT (extends editor session) |
| `/api/auth/logout` | POST | [`route.ts`](src/app/api/auth/logout/route.ts) | Deletes session cookie |

### Publishing (Auth-Required)

| Endpoint | Method | File | Description |
|---|---|---|---|
| `/api/publish` | POST | [`route.ts`](src/app/api/publish/route.ts) | Publish article (atomic Git commit) |
| `/api/publish` | GET | [`route.ts`](src/app/api/publish/route.ts) | List all articles (drafts + published) |
| `/api/publish/draft` | POST/PUT/DELETE | [`route.ts`](src/app/api/publish/draft/route.ts) | Create, update, delete drafts |
| `/api/publish/articles` | GET | [`route.ts`](src/app/api/publish/articles/route.ts) | List published articles |
| `/api/publish/delete` | DELETE | [`route.ts`](src/app/api/publish/delete/route.ts) | Delete a published article |
| `/api/publish/duplicate` | POST | [`route.ts`](src/app/api/publish/duplicate/route.ts) | Duplicate an article as a new draft |
| `/api/publish/preview` | POST | [`route.ts`](src/app/api/publish/preview/route.ts) | Generate article preview |
| `/api/publish/post-metadata` | GET | [`route.ts`](src/app/api/publish/post-metadata/route.ts) | Fetch metadata for a post/URL |
| `/api/publish/admin/git` | GET | [`route.ts`](src/app/api/publish/admin/git/route.ts) | Git repository status and diagnostics |

### Media

| Endpoint | Method | File | Description |
|---|---|---|---|
| `/api/media/upload` | POST | [`route.ts`](src/app/api/media/upload/route.ts) | Upload image to Supabase Storage, returns CDN URL |
| `/api/media/video-info` | GET | [`route.ts`](src/app/api/media/video-info/route.ts) | Fetch video metadata (YouTube, Vimeo, TikTok, etc.) |

### Public

| Endpoint | Method | File | Description |
|---|---|---|---|
| `/api/subscribe` | POST | [`route.ts`](src/app/api/subscribe/route.ts) | Subscribe to newsletter |
| `/api/unsubscribe` | POST | [`route.ts`](src/app/api/unsubscribe/route.ts) | Unsubscribe from newsletter |
| `/api/search` | GET | [`route.ts`](src/app/api/search/route.ts) | Full-text article search |
| `/api/oembed` | GET | [`route.ts`](src/app/api/oembed/route.ts) | oEmbed proxy for social embeds |

### Internal / Admin

| Endpoint | Method | File | Description |
|---|---|---|---|
| `/api/internal/process-queue` | POST | [`route.ts`](src/app/api/internal/process-queue/route.ts) | Cron-triggered email queue processor |
| `/api/admin/subscription/status` | GET | [`route.ts`](src/app/api/admin/subscription/status/route.ts) | Subscription queue health status |

---

## 6. Component Architecture

Components are organized into six functional groups:

### `layout/` — Global Shell

```
Header.tsx          ← Navigation, news ticker, search trigger, "Updated" indicator
Footer.tsx          ← Links, newsletter CTA, legal
index.ts            ← Re-exports Header, Footer
```

[`Header`](src/components/layout/Header.tsx:1) receives `latestUpdate` and `tickerHeadlines` from the root layout server component, which fetches them from Git on every request.

### `editorial/` — Homepage Blocks

```
LeadStory.tsx       ← Full-width dominant story (placement: 'lead')
TopStories.tsx      ← 2-column secondary leads (placement: 'top')
SectionBlock.tsx    ← Configurable section grid (crime, court, politics, etc.)
SectionHeader.tsx   ← Section title with divider line
StoryList.tsx       ← Vertical list of story cards
Pagination.tsx      ← Section page pagination
index.ts            ← Re-exports all editorial components
```

### `article/` — Article Rendering

```
ArticleHeader.tsx   ← Title, subtitle, byline, date, section badge
ArticleBody.tsx     ← Renders ContentBlock[] (paragraphs, subheadings, quotes, media)
ImageBlock.tsx      ← Responsive image with caption and credit
VideoBlock.tsx      ← Embedded video player (YouTube, Vimeo, TikTok, Instagram, X)
SocialEmbed.tsx     ← Social post embeds (Twitter/X, Instagram, LinkedIn)
PostBlock.tsx       ← Social post block wrapper
ContinueReading.tsx ← "You may also like" recommendations
CorrectionNotice.tsx← Editorial correction banner
SourcesList.tsx     ← Article citations list
index.ts            ← Re-exports all article components
```

### `publish/` — Publishing Console

The publishing console is split into **desktop** and **mobile** sub-groups:

```
desktop/
  ArticleEditor.tsx     ← Main article form (headline, section, content type, tags)
  BlockEditor.tsx       ← Rich block-based content editor (paragraphs, images, videos)
  ArticleDatabase.tsx   ← Drafts + published articles list with CRUD actions
  EditorialToolbar.tsx  ← Top toolbar (save, publish, preview, logout)
  ImageBlockEditor.tsx  ← Image block editor with Supabase upload
  VideoBlockEditor.tsx  ← Video block editor with provider detection
  PostBlockEditor.tsx   ← Social post embed editor
  ConfirmDialog.tsx     ← Confirmation modal for destructive actions

mobile/
  MobileActionBar.tsx   ← Bottom action bar for mobile editor
  MobileInsertMenu.tsx  ← Block insertion menu for mobile
  MobileSettingsPanel.tsx ← Article settings drawer for mobile

common/
  Toast.tsx             ← Publish-specific toast notification
  SessionExpiryModal.tsx← Session expiry warning modal
  MediaCounter.tsx      ← Media block usage counter (max 3 images, 1 video)

types/
  article-types.ts      ← ArticleFormData, ArticleEntry, WorkspaceMode types
  block-editor-types.ts ← BlockEditor state and action types
  index.ts              ← Re-exports all publish types
```

### `features/` — Interactive Features

```
SearchOverlay.tsx   ← Full-screen search overlay with live results
SubscribeModal.tsx  ← Newsletter subscription modal
SubscribePopup.tsx  ← Timed subscription popup (appears after scroll)
ScrollToTop.tsx     ← Floating scroll-to-top button
```

### `feedback/` — User Feedback

```
EditorialToast.tsx  ← Animated toast notification (success/error/warning/info)
InlineError.tsx     ← Field-level inline error display
index.ts            ← Re-exports
```

### `skeleton/` — Loading States

```
EditorialSkeleton.tsx ← Skeleton screens for editorial content loading
index.ts              ← Re-exports
```

---

## 7. Library Layer (`src/lib`)

### `lib/content/` — Content Pipeline

```
types.ts            ← Article, Section, ContentType, ArticleFrontmatter interfaces
media-types.ts      ← ContentBlock union type (paragraph, subheading, quote, image, video, post)
reader.ts           ← getAllArticles(), getArticleBySlug(), getArticlesBySection() — React cache()
parser.ts           ← Markdown frontmatter parser (js-yaml)
block-parser.ts     ← Parses :::image / :::video / :::post fenced blocks from Markdown
homepage.ts         ← getHomepageData() — editorial curation logic
article.ts          ← getArticlePageData() — single article with validation
section.ts          ← getSectionPageData() — section listing with pagination
recommendations.ts  ← getContinueReadingArticles() — related article suggestions
post-metadata.ts    ← URL metadata scraping for social post embeds
post-utils.ts       ← Social post URL parsing utilities
oembed.ts           ← oEmbed API integration
thumbnail.ts        ← Article thumbnail resolution (frontmatter → body extraction)
index.ts            ← Re-exports
```

**Content Pipeline Flow:**

```
GitHub Repo (.md files)
        │
        ▼
  gitService.readFile()
        │
        ▼
  parseMarkdown()          ← js-yaml frontmatter + body extraction
        │
        ▼
  parseBodyBlocks()        ← :::image / :::video / :::post block parsing
        │
        ▼
  Article{}                ← Validated, typed article object
        │
        ▼
  React cache()            ← Per-request deduplication
        │
        ▼
  Server Component         ← Rendered as RSC
```

### `lib/git/` — GitHub API Service

```
service.ts          ← GitService class: readFile(), saveFile(), listFiles(), fileExists(), deleteFile()
content.ts          ← High-level CRUD: DraftData, PublishedArticleData, createDraft(), publishArticle()
index.ts            ← Re-exports gitService singleton, contentGit
```

**Key Design:**
- All operations use the GitHub REST API via Octokit — no `git` CLI, no local filesystem writes.
- Atomic multi-file commits via staging: `createGitStaging()` → `pendingWrites` + `pendingDeletes` → single commit.
- Used-token tracking for magic link replay prevention is stored as `src/lib/auth/used-tokens.json` in the repo.

### `lib/auth/` — Authentication

```
token.ts            ← createMagicToken(), verifyMagicToken() — JOSE JWT (HS256, 5-min expiry)
session.ts          ← createSession(), getSession(), verifyAuth(), refreshSession() — httpOnly cookie
email.ts            ← sendMagicLinkEmail() — Resend API
used-tokens.json    ← Git-backed token replay prevention store
```

**Auth Flow:**
1. Editor visits `/newsroom` → enters email → POST `/api/auth/request-link`
2. Server generates JWT magic link token (5-min TTL, unique `jti`)
3. Resend sends email with link: `/api/auth/verify?token=<jwt>`
4. Editor clicks link → GET `/api/auth/verify` → token verified, `jti` marked used in Git
5. Session JWT created (6-min TTL) → stored as `httpOnly` cookie `the_hint_session`
6. All `/api/publish/*` routes call `verifyAuth()` → validates session cookie

### `lib/media/` — Media Handling

```
supabase-storage.ts ← uploadToSupabase() — image upload to Supabase Storage CDN
video-providers.ts  ← Video provider detection, metadata fetching (YouTube, Vimeo, TikTok, Instagram, X)
upload.ts           ← processImageUpload() — Sharp image processing + Supabase upload
index.ts            ← Re-exports
```

**Supported Video Providers:**
- YouTube, Vimeo, TikTok, Instagram Reels, Twitter/X Videos

**Image Storage Path:** `articles/{year}/{month}/{sha256-hash}.{ext}`

### `lib/subscription/` — Newsletter System

```
types.ts            ← SubscriptionEvent, QueueStatus, EmailWorkerConfig interfaces
queue.ts            ← SubscriptionQueue class — Git-backed event queue with Mutex
email-service.ts    ← sendArticleNotification() — Resend email templates
processor.ts        ← processQueue() — batch email dispatch with circuit breaker
```

**Queue Architecture:**
- Events stored in `src/data/subscription-events.json` (Git-backed)
- Subscribers stored in `src/data/subscribers.json` (Git-backed)
- Mutex prevents concurrent queue writes
- Circuit breaker pauses queue after N consecutive failures
- Cron endpoint `/api/internal/process-queue` triggers processing

### `lib/feedback/` — Feedback System

```
error-codes.ts      ← ErrorCode enum, SuccessCode enum, ErrorCategory, ErrorDisplayStyle
translations.ts     ← Human-readable error/success messages (English)
feedback-system.ts  ← InternalError, UserFeedback interfaces, createUserFeedback()
console-guard.ts    ← logger — strips console.log in production, structured logging
index.ts            ← Re-exports logger, ErrorCodes, SuccessCodes, getErrorMessage()
README.md           ← Feedback system documentation
```

### `lib/validation/` — Input Validation

```
__tests__/media.test.ts ← Vitest tests for media validation
```

Validation schemas are used in API routes to validate `PublishArticleInput` before Git commits.

### `lib/publish/` — Draft Utilities

```
drafts.ts           ← Draft ID generation, draft path resolution
index.ts            ← Re-exports
```

---

## 8. Content System

### Article Format

Articles are stored as Markdown files with YAML frontmatter:

```markdown
---
title: "Article Headline"
subtitle: "Secondary headline / deck"
contentType: news          # news | opinion
publishedAt: "2026-02-24T10:00:00Z"
updatedAt: null
placement: lead            # lead | top | standard
image: "https://cdn.supabase.co/..."
tags: ["politics", "karnataka"]
sources: ["The Hindu", "PTI"]
status: published
bodyBlocks:                # Structured block array (canonical)
  - id: "block-1"
    type: paragraph
    order: 0
    content: "Article text..."
  - id: "block-2"
    type: image
    order: 1
    src: "https://cdn.supabase.co/..."
    alt: "Image description"
    caption: "Optional caption"
---

Legacy markdown body (fallback for old articles)
```

### Content Block Types

| Block Type | Description |
|---|---|
| `paragraph` | Body text (Markdown-supported) |
| `subheading` | Section divider (renders as `<h2>`) |
| `quote` | Pull quote with optional attribution |
| `image` | Image with src, alt, caption, credit, aspect ratio |
| `video` | Embedded video (YouTube, Vimeo, TikTok, Instagram, X) |
| `post` | Social post embed (Twitter/X, Instagram, LinkedIn) |

**Media Limits:** Max 3 images, max 1 video per article (enforced by `MediaCounter` component).

### Content Sections

```
politics      → /politics
crime         → /crime
court         → /court
opinion       → /opinion
world-affairs → /world-affairs
```

### Homepage Editorial Curation

[`getHomepageData()`](src/lib/content/homepage.ts:1) applies these rules:
1. **Lead Story**: First article with `placement: 'lead'` (or most recent if none)
2. **Top Stories**: Up to 5 articles with `placement: 'top'`, excluding lead and opinion
3. **Section Blocks**: Latest 4–6 articles per section (crime, court, politics, world-affairs, opinion)

---

## 9. Authentication System

### Magic Link Flow

```
Editor                    Server                      GitHub Repo
  │                          │                              │
  │── POST /api/auth/request-link ──►                       │
  │   { email }              │                              │
  │                          │── createMagicToken() ──►     │
  │                          │   JWT { email, jti, iat }    │
  │                          │   exp: 5 minutes             │
  │                          │                              │
  │                          │── sendMagicLinkEmail() ──►   │
  │◄── 200 OK ───────────────│   (Resend API)               │
  │                          │                              │
  │── Click email link ──────►                              │
  │   GET /api/auth/verify?token=<jwt>                      │
  │                          │                              │
  │                          │── verifyMagicToken() ──►     │
  │                          │── isTokenUsed(jti) ──────────►
  │                          │◄─ false ─────────────────────│
  │                          │── markTokenAsUsed(jti) ──────►
  │                          │   (Git commit)               │
  │                          │                              │
  │                          │── createSession(email) ──►   │
  │                          │   httpOnly cookie (6 min)    │
  │◄── Redirect /publish ────│                              │
```

### Session Management

- **Token**: HS256 JWT, 6-minute TTL (5 min + 1 min grace for in-flight saves)
- **Storage**: `httpOnly` cookie `the_hint_session`
- **Refresh**: `POST /api/auth/refresh-session` rotates the token
- **Client Timer**: [`useSessionTimer`](src/hooks/useSessionTimer.ts:1) hook syncs with server, shows 15-second warning before expiry
- **Replay Prevention**: Used `jti` values stored in `src/lib/auth/used-tokens.json` (Git-backed, auto-cleaned after 24h)

---

## 10. Publishing Console

The `/publish` page is a single-page application (client component) that serves as the editorial CMS.

### Architecture

```
publish/page.tsx (Client Component)
├── EditorialToolbar        ← Save draft, Publish, Preview, Logout
├── ArticleEditor           ← Article metadata form
│   └── BlockEditor         ← Content block editor
│       ├── ImageBlockEditor    ← Image upload + crop
│       ├── VideoBlockEditor    ← Video URL + provider detection
│       └── PostBlockEditor     ← Social post embed
├── ArticleDatabase         ← Drafts + published articles list
│   └── ConfirmDialog       ← Delete/overwrite confirmation
├── MobileSettingsPanel     ← Mobile: article settings drawer
├── MobileActionBar         ← Mobile: bottom action bar
├── SessionExpiryModal      ← Session expiry warning
└── EditorialToast          ← Operation feedback
```

### State Management

All state is managed locally in `publish/page.tsx` using React `useState` and `useCallback`. No global state library (Redux, Zustand) is used.

Key state:
- `formData: ArticleFormData` — current article being edited
- `workspaceMode: WorkspaceMode` — `'editor' | 'database'`
- `articles: ArticleEntry[]` — loaded article list
- `toastData: ToastData` — current toast notification

### Publish Flow

```
Editor fills form
      │
      ▼
canPublish() check (client-side UX only)
      │
      ▼
POST /api/publish
      │
      ▼
Server: validateArticleInput()
      │
      ▼
Server: generateSlug()
      │
      ▼
Server: Git atomic commit
  ├── Write: src/content/{section}/{slug}.md
  └── Delete: src/content/drafts/{draftId}.json (if exists)
      │
      ▼
Server: revalidatePath('/')
      │
      ▼
Server: Enqueue subscription event
      │
      ▼
Client: Toast success + clear form
```

---

## 11. Media System

### Image Upload Flow

```
Editor selects image
      │
      ▼
POST /api/media/upload
      │
      ▼
Sharp: resize + optimize
      │
      ▼
Supabase Storage: upload
  Path: articles/{year}/{month}/{hash}.{ext}
      │
      ▼
Return CDN URL
      │
      ▼
Stored in article frontmatter: image: "https://..."
```

### Video Provider Support

[`lib/media/video-providers.ts`](src/lib/media/video-providers.ts:1) handles:

| Provider | URL Pattern | Metadata |
|---|---|---|
| YouTube | `youtube.com/watch`, `youtu.be` | Title, thumbnail, duration |
| Vimeo | `vimeo.com/{id}` | Title, thumbnail |
| TikTok | `tiktok.com/@user/video/{id}` | Title, thumbnail |
| Instagram | `instagram.com/reel/{id}` | Thumbnail |
| Twitter/X | `twitter.com/i/status/{id}` | Thumbnail |

### Image CDN

All article images are served from Supabase Storage CDN. The `next.config.ts` whitelists these remote image patterns:
- `*.supabase.co` — article images
- `img.youtube.com`, `i.ytimg.com` — YouTube thumbnails
- `*.cdninstagram.com` — Instagram thumbnails
- `pbs.twimg.com` — Twitter/X media
- `i.vimeocdn.com` — Vimeo thumbnails
- `*.tiktokcdn.com` — TikTok thumbnails
- `media.licdn.com` — LinkedIn media

---

## 12. Subscription & Email System

### Subscriber Storage

Subscribers are stored in `src/data/subscribers.json` (Git-backed):

```json
[
  {
    "email": "reader@example.com",
    "subscribedAt": "2026-01-01T00:00:00Z",
    "token": "<unsubscribe-token>"
  }
]
```

### Email Queue

When an article is published, a `SubscriptionEvent` is enqueued in `src/data/subscription-events.json`:

```json
{
  "id": "uuid",
  "articleSlug": "article-slug",
  "section": "politics",
  "headline": "Article Headline",
  "summary": "150-char summary...",
  "contentType": "news",
  "priority": "normal",
  "status": "pending",
  "attempts": 0,
  "sentEmails": []
}
```

### Queue Processing

```
Cron: POST /api/internal/process-queue
      │
      ▼
SubscriptionQueue.getNextPending()
      │
      ▼
For each subscriber (not in sentEmails):
  sendArticleNotification() via Resend
      │
      ▼
Mark email in sentEmails (idempotent retry)
      │
      ▼
Update event status: pending → sent
      │
      ▼
Git commit: "Queue: update event {id}"
```

**Circuit Breaker**: After N consecutive failures, queue is paused. Admin must manually resume via `/api/admin/subscription/status`.

---

## 13. Feedback & Error System

The feedback system provides a structured way to map internal errors to user-facing messages.

### Error Codes

[`lib/feedback/error-codes.ts`](src/lib/feedback/error-codes.ts:1) defines:
- `ErrorCode` enum — internal error identifiers (e.g., `PUBLISH_FAILED`, `AUTH_EXPIRED`)
- `SuccessCode` enum — success identifiers (e.g., `ARTICLE_PUBLISHED`, `DRAFT_SAVED`)
- `ErrorCategory` — `auth | content | media | network | validation | system`
- `ErrorDisplayStyle` — `toast | inline | modal | silent`

### Logger

[`lib/feedback/console-guard.ts`](src/lib/feedback/console-guard.ts:1) provides a `logger` that:
- Strips `console.log` in production (via `next.config.ts` `removeConsole`)
- Provides structured `logger.info()`, `logger.warn()`, `logger.error()`, `logger.debug()`

### User Feedback Flow

```
API Error
    │
    ▼
transformApiErrors()     ← Maps HTTP errors to ErrorCode
    │
    ▼
getErrorMessage()        ← Looks up human-readable message from translations.ts
    │
    ▼
EditorialToast           ← Displays to user
```

---

## 14. Data Flow Diagrams

### Reader: Article Page Load

```
Browser → GET /politics/article-slug
              │
              ▼
         Next.js RSC
              │
              ▼
    getArticlePageData(section, slug)
              │
              ▼
    gitService.readFile('src/content/politics/article-slug.md')
              │
              ▼
         GitHub API (Octokit)
              │
              ▼
    parseMarkdown() → parseBodyBlocks()
              │
              ▼
    Article{} object
              │
              ▼
    ArticleHeader + ArticleBody + ContinueReading
              │
              ▼
         HTML Response
```

### Editor: Save Draft

```
Editor types in BlockEditor
              │
              ▼
    Auto-save debounce (3s)
              │
              ▼
    POST /api/publish/draft
              │
              ▼
    verifyAuth() → session cookie
              │
              ▼
    contentGit.saveDraft(draftData)
              │
              ▼
    gitService.saveFile('src/content/drafts/draft-{id}.json', ...)
              │
              ▼
         GitHub API commit: "Draft: save {headline}"
              │
              ▼
    Toast: "Draft saved"
```

---

## 15. Environment Variables

### Required (All Environments)

| Variable | Purpose |
|---|---|
| `AUTHORIZED_EDITOR_EMAIL` | Single authorized editor email address |
| `MAGIC_LINK_SECRET` | HMAC secret for JWT magic link tokens |
| `GIT_TOKEN` | GitHub Personal Access Token (repo read/write) |
| `GIT_REPO_OWNER` | GitHub repository owner (username/org) |
| `GIT_REPO_NAME` | GitHub repository name |

### Required (Production Only)

| Variable | Purpose |
|---|---|
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
|---|---|
| `CRON_SECRET` | Secret for cron job authentication |
| `VERCEL` | Auto-set by Vercel (used for `secure` cookie flag) |

Environment validation runs at startup via [`src/instrumentation.ts`](src/instrumentation.ts:1) → [`lib/env.ts`](src/lib/env.ts:1). In production, missing variables cause a fatal startup error.

---

## 16. SEO & Metadata

### Global Metadata

Defined in [`src/app/layout.tsx`](src/app/layout.tsx:1):
- Title template: `{page title} | The Hint`
- OpenGraph: `en_IN` locale, `website` type
- Twitter card: `summary_large_image`
- Robots: `index: true, follow: true`

### Article Metadata

Generated dynamically in [`src/app/[section]/[slug]/page.tsx`](src/app/[section]/[slug]/page.tsx:1):
- `<title>`: Article headline
- `<meta description>`: Article subtitle
- OpenGraph: `article` type with `publishedTime`, `modifiedTime`, `section`, `tags`
- Canonical URL: `/{section}/{slug}`
- Twitter card with article image

### Fonts

Four Google Fonts are loaded via `next/font/google`:

| Font | Variable | Usage |
|---|---|---|
| Playfair Display | `--font-serif` | English headlines |
| Inter | `--font-sans` | English body text and UI |
| Noto Sans Kannada | `--font-kannada-sans` | Kannada body text |
| Noto Serif Kannada | `--font-kannada-serif` | Kannada headlines |

The site supports **bilingual content** (English + Kannada), reflecting its target audience in Karnataka, India.

### Sitemap & Robots

- [`/sitemap.xml`](src/app/sitemap.ts:1): Dynamically generated, includes all articles with `lastModified` from `updatedAt` or `publishedAt`
- [`/robots.txt`](src/app/robots.ts:1): Blocks `/newsroom`, `/api`, `/admin`, `/_next` from crawlers

---

*This document was auto-generated by analyzing the source code of The Hint Web. Last updated: February 2026.*
