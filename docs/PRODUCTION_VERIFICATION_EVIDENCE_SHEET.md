# THE HINT — PRODUCTION CACHE ARCHITECTURE VERIFICATION

## Deployment Metadata (Gate 0)
- **Target Branch**: `feat/editorial-subtle-animations`
- **Latest Commit SHA**: `508a661`
- **Deployment ID**: `[RECORD FROM VERCEL DASHBOARD]`
- **Deployment URL**: `[RECORD FROM VERCEL DASHBOARD]`
- **Deployment Time**: `[RECORD TIMESTAMP]`
- **Next.js Version**: `16.3.3` (Turbopack)

---

## Pre-Flight Architectural Clarification

### 1. The Publication & Invalidation Boundary
Editorial content is **deployment-driven**:
- **Authoritative Storage**: GitHub repository markdown files (`src/content/`).
- **Runtime Serverless Environment**: Immutable deployment filesystem snapshot.
- **Content Graph Synchronization**: Authoritatively executed during the Vercel deployment build (`npm run generate-graph && npm run verify-content && next build`).
- **Runtime Invalidation**: In-memory cache invalidation (`clearArticleCache()`) clears stale server memory immediately. Immediate ISR revalidations on the running deployment are intentionally avoided because regenerating against stale bundled markdown would actively re-bake old content into the cache.

### 2. Time-Based Revalidation Baseline
- **Observed Baseline**: `656 time-based revalidations / 12h` (with `3.7K ISR writes / 12h` and `1.9K ISR reads / 12h`).
- **Root Cause**: The parent commit on `main` active during that 12h measurement window compiled with:
  - `src/app/page.tsx`: `revalidate = 300` (5 min)
  - `src/app/[section]/[slug]/page.tsx`: `revalidate = 300` (5 min across all 181 articles)
  - `src/app/[section]/(index)/page.tsx`: `revalidate = 60` (1 min)
  - `src/app/sitemap.ts`: `revalidate = 300` (5 min)
- **Current Target State**: All editorial content routes compiled with `revalidate = false`. No recurring time-based revalidation should remain for editorial routes. Any remaining time-based revalidation must be attributable to a specific compiled route (e.g. `/sitemap.xml` with `86400`) and documented intentionally.

---

## Execution Gates & Evidence Collection

### GATE 1 — PUBLISH RUNTIME
**Objective**: Prove `POST /api/publish` commits to Git without attempting local runtime graph generation or emitting bogus metrics.

1. Publish disposable test article in `/publish`:
   - Title: `PRODUCTION CACHE TEST — DELETE ME`
   - Section: `politics`
   - Slug: `production-cache-test-delete-me`
2. **DevTools Network Response (`POST /api/publish`)**:
   - HTTP Status: `201 Created`
   - Payload:
     ```json
     {
       "success": true,
       "message": "Article published successfully.",
       "slug": "production-cache-test-delete-me",
       "section": "politics",
       "url": "/politics/production-cache-test-delete-me",
       "deploymentPending": true,
       "graphVersion": null,
       "articleCount": null
     }
     ```
3. **Vercel Runtime Logs Search**:
   - `PUBLISH TRANSACTION COMPLETE`: $\ge 1$ occurrence
   - `Generating Content Graph`: **0 occurrences**
   - `Post-publish synchronization failed`: **0 occurrences**
   - `graphVersion: 0`: **0 occurrences**

*Verification Status*: `[ PASS / FAIL ]`

---

### GATE 2 — BUILD PIPELINE
**Objective**: Prove graph generation and static page compilation happen authoritatively during the Vercel build.

1. **GitHub Commit**:
   - Commit confirmed on branch: `Publish article: PRODUCTION CACHE TEST — DELETE ME`
   - File created: `src/content/politics/production-cache-test-delete-me.md`
2. **Vercel Build Logs**:
   - `npm run generate-graph` triggered:
     `[INFO] Generating Content Graph by scanning markdown files...`
     `[INFO] Content Graph generated successfully! Cached 182 articles.`
   - `npm run verify-content` passed:
     `Content validation passed. Verified 182 articles.`
   - `next build` static page compilation:
     `● /politics/production-cache-test-delete-me`

*Verification Status*: `[ PASS / FAIL ]`

---

### GATE 3 — ARTICLE READ
**Objective**: Prove the published article is live across all public read surfaces after deployment completes.

*Condition: Test ONLY after Vercel deployment status is `Ready`.*
1. `GET /politics/production-cache-test-delete-me` $\rightarrow$ **HTTP 200**, article rendered.
2. `GET /` $\rightarrow$ Article appears in feed / recent stories.
3. `GET /politics` $\rightarrow$ Article appears in politics section feed.
4. `GET /sitemap.xml` $\rightarrow$ `<loc>.../politics/production-cache-test-delete-me</loc>` present.

*Verification Status*: `[ PASS / FAIL ]`

---

### GATE 4 — DELETE RUNTIME & BUILD SYNCHRONIZATION
**Objective**: Prove `DELETE /api/publish/delete` removes the file from Git without runtime sync failures, and the subsequent deployment drops the article from the graph and pages.

1. Delete article in `/publish` console:
2. **DevTools Network Response (`DELETE /api/publish/delete`)**:
   - HTTP Status: `200 OK`
   - Payload:
     ```json
     {
       "success": true,
       "type": "published",
       "slug": "production-cache-test-delete-me",
       "revalidated": false,
       "deploymentPending": true,
       "graphVersion": null,
       "articleCount": null,
       "alreadyDeleted": false,
       "message": "Article removed successfully. (Cache will refresh once deployment finishes.)"
     }
     ```
3. **Vercel Runtime Logs Search**:
   - `DELETE TRANSACTION COMPLETE`: $\ge 1$ occurrence
   - `Generating Content Graph`: **0 occurrences**
   - `Post-publish synchronization failed`: **0 occurrences**
4. **GitHub Commit**:
   - Commit confirmed: `Remove article: PRODUCTION CACHE TEST — DELETE ME`
   - File deleted: `src/content/politics/production-cache-test-delete-me.md`
5. **Subsequent Vercel Deployment**:
   - Build log shows: `Cached 181 articles` (count restored).
   - Once deployment reaches `Ready`:
     - `GET /politics/production-cache-test-delete-me` $\rightarrow$ **HTTP 404 Not Found**.
     - Article absent from `/`, `/politics`, `/sitemap.xml`.

*Verification Status*: `[ PASS / FAIL ]`

---

### GATE 5 — ERROR SERIALIZATION (UNIT TEST & RUNTIME SAFETY)
**Objective**: Prove caught errors emit `{ name, message, stack }` and never `{}` while redacting sensitive tokens and credentials.

1. **Automated Unit Test (`scripts/test-error-serialization.ts`)**:
   - Execution: `npx tsx scripts/test-error-serialization.ts`
   - Result:
     ```text
     [PASS] Has Error name: true
     [PASS] Has Error message: true
     [PASS] Has Error stack trace: true
     [PASS] Not empty {}: true
     [PASS] Token redacted: true
     [PASS] Cookie redacted: true
     [PASS] Authorization header redacted: true
     [PASS] Password redacted: true
     [PASS] Safe context preserved: true
     ALL ERROR SERIALIZATION UNIT TESTS PASSED SUCCESSFULLY.
     ```
2. **Controlled Runtime Validation**:
   - In production logs, verify that when errors occur:
     - Output is structured: `{ timestamp, name, message, stack, ... }`
     - Empty `{}` occurrences: **0**
     - Sensitive data (cookies, auth headers, tokens, credentials): **REDACTED / OMITTED**

*Verification Status*: `[ PASS / FAIL ]`

---

### GATE 6 — ISR TIME-SERIES OBSERVABILITY
**Objective**: Match Vercel Usage with Observability across multiple time intervals to verify the elimination of recurring time-based revalidation churn on editorial routes.

#### Baseline (Historical Parent Deployment)
- **Window**: Prior 12h
- **Time-based Revalidations**: `656`
- **ISR Writes**: `3.7K`
- **ISR Reads**: `1.9K`

#### Post-Fix Observation Windows (After New Deployment `Ready`)
| Checkpoint | Time Elapsed | Time-Based Revalidations | ISR Writes | ISR Reads | Active Recurring Timer Found? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T + 1h** | 1 hour | `[RECORD]` | `[RECORD]` | `[RECORD]` | `[YES / NO]` |
| **T + 3h** | 3 hours | `[RECORD]` | `[RECORD]` | `[RECORD]` | `[YES / NO]` |
| **T + 6h** | 6 hours | `[RECORD]` | `[RECORD]` | `[RECORD]` | `[YES / NO]` |
| **T + 12h** | 12 hours | `[RECORD]` | `[RECORD]` | `[RECORD]` | `[YES / NO]` |

*Assessment Criteria*:
- No recurring periodic time-based revalidations on editorial routes (`/`, `/[section]`, `/[section]/[slug]`).
- Any observed events must be isolated and attributable to documented static routes (e.g. `/sitemap.xml` with `86400`).

---

## Separate Optimization Track: `/[section]` Dynamic MISS Investigation
*Note: Analyzed separately from publication/deletion defects per instructions.*

- **Observed Behavior**: Requests to `/[section]` (`/politics`, `/crime`, `/court`, etc.) return `cache: MISS` and execute as dynamic serverless functions.
- **Forensic Diagnosis**: In `src/app/[section]/(index)/page.tsx:70`, the route evaluates:
  ```tsx
  const resolvedSearchParams = await searchParams;
  const currentPage = Math.max(1, parseInt(resolvedSearchParams.page || '1', 10) || 1);
  ```
  In Next.js App Router, awaiting `searchParams` in a page component opts the route out of static pre-rendering and forces dynamic server execution (`ƒ`).
- **Recommended Follow-Up**: Isolate static section content from request-dependent pagination by offloading search parameter handling to a client-side component or dedicated paginated sub-route, allowing the base section page (`page=1`) to be statically pre-rendered.

---

## Final Verification Summary
- **Overall Defect Resolution**: `[ PASS / PASS WITH OBSERVATION / FAIL ]`
- **Signed Off By**: `[NAME / ROLE]`
- **Date**: `2026-09-03`
