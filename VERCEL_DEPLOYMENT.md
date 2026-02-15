# PROD-READY DEPLOYMENT GUIDE (VERCEL)

This guide outlines the exact configuration required to deploy **The Hint** newsroom system to Vercel (Free Plan). All code has been optimized for serverless execution.

## 1. Environment Variables (Vercel Project Settings)

Configure these variables in **Project Settings → Environment Variables**.
**CRITICAL:** Variable names must match the codebase exactly as listed below.

### Git Content System (Source of Truth)
| Variable | Value / Description | Note |
| :--- | :--- | :--- |
| `GIT_TOKEN` | Your GitHub Personal Access Token (Classic) | Must have `repo` scope. **Code uses `GIT_TOKEN`, not `GITHUB_TOKEN`** |
| `GIT_REPO_OWNER` | GitHub Username (e.g., `chiranjeevi005`) | Ownership of the content repo |
| `GIT_REPO_NAME` | Repository Name (e.g., `the-hint`) | Name of this repository |
| `GIT_AUTHOR_NAME` | `The Hint Editor` | Identifying name for automated commits |
| `GIT_AUTHOR_EMAIL` | `editor@thehint.news` | Email for automated commits |

### Supabase Storage (Media)
| Variable | Value / Description | Note |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[project-ref].supabase.co` | Public API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (Public Anon Key) | Safe to expose in client |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (Service Role Key) | **SECRET** - Never expose. Used for uploads |
| `SUPABASE_STORAGE_BUCKET` | `article-images` | Bucket name for media |

### Email (Resend)
| Variable | Value / Description | Note |
| :--- | :--- | :--- |
| `RESEND_API_KEY` | `re_...` | API Key from Resend dashboard |
| `EMAIL_FROM` | `The Hint <noreply@thehint.news>` | Sender signature (must be verified domain) |

### App Config & Auth
| Variable | Value / Description | Note |
| :--- | :--- | :--- |
| `APP_BASE_URL` | `https://the-hint-web.vercel.app` | Production URL (no trailing slash) |
| `NEXT_PUBLIC_SITE_URL` | `https://the-hint-web.vercel.app` | Same as APP_BASE_URL (for SEO) |
| `AUTHORIZED_EDITOR_EMAIL` | `your-email@example.com` | Email allowed to access CMS |
| `MAGIC_LINK_SECRET` | `[generate-random-string]` | Secret for signing auth tokens |
| `CRON_SECRET` | `[generate-random-string]` | Secret for protecting cron jobs |

---

## 2. Vercel Build Configuration

Ensure these settings are correct in **Project Settings → Build & Development**:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (Default)
- **Output Directory**: `.next` (Default)
- **Root Directory**: `./` (Default)

---

## 3. Post-Deployment Verification (Smoke Test)

After the deployment is live, verify the following:

1.  **Homepage Load**: Visit `/` and ensure content loads fast (ISR cache hit).
2.  **Section Pages**: Visit a section (e.g., `/politics`) and check pagination.
3.  **Article View**: Open an article and check images load from Supabase.
4.  **CMS Access**: Go to `/newsroom`, verify magic link login works.
5.  **Publish Flow**:
    *   Create a test draft.
    *   Publish it.
    *   **Verify**: Article should appear immediately on Homepage (revalidation is enabled).
    *   **Verify**: GitHub repo should show a new commit "Publish article: ...".
6.  **Subscription**:
    *   Enter an email in the footer.
    *   **Verify**: "Thank you" message appears.
    *   **Verify**: Welcome email is received (via Resend).

---

## 4. Security & Optimization Status

- **Filesystem**: No local writes (`fs.writeFile` removed). All content goes to GitHub API.
- **Media**: No local storage. All uploads stream to Supabase.
- **Email**: Non-blocking async execution to prevent timeouts.
- **Caching**:
    - **ISR**: Pages revalidate every 60s.
    - **On-Demand**: Publishing triggers immediate cache purge for relevant pages.
- **Rate Limiting**: Subscription API limits to 5 requests/min per IP.
- **Robots.txt**: Blocks `/newsroom`, `/api`, `/preview`.

**Ready for Production.**
