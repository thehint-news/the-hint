# Deterministic, Atomic, Cache-Aware Delete Architecture

## Overview

This document describes the redesigned `/api/publish/delete` system and publish page delete flow that implements:

- **Atomic operations**: All-or-nothing delete with Git commit confirmation
- **Deterministic behavior**: Clear success/failure states with no silent failures
- **Git-safe operations**: Conflict handling with automatic retry
- **Cache-consistency**: ISR revalidation coordination
- **Race-condition safety**: Delete locks prevent parallel operations
- **Production reliability**: Comprehensive logging and environment validation

---

## Architecture Components

### 1. Git Service (`src/lib/git/service.ts`)

#### Enhanced Commit Handling with 409 Conflict Resolution

```typescript
// Git conflict handling with explicit SHA refetch
if ((err.status === 409 || err.status === 422) && retryCount < 2) {
    logger.warn(`[GIT-SERVICE] Git conflict detected, refetching latest SHA and retrying...`);
    
    // Add progressive delay to allow concurrent operations to settle
    await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
    
    // Retry with fresh SHA fetch
    return this.commitFiles(filesPaths, message, staging, retryCount + 1);
}
```

**Features:**
- Automatic retry on 409/422 conflicts (max 2 retries)
- Progressive delay between retries (100ms, 200ms)
- Explicit error after retries exhausted
- Clear user message for concurrent modification

---

### 2. ContentGit (`src/lib/git/content.ts`)

#### Separate Delete Logic for Draft vs Published

**Draft Delete:**
```typescript
async deleteDraft(draftId: string): Promise<ContentOperationResult<{ 
    type: 'draft'; 
    alreadyDeleted: boolean;
    commitHash?: string;
}>>
```

- No ISR revalidation required
- Returns structured result with operation details
- Idempotent: treats "already deleted" as success
- Comprehensive logging with operation IDs

**Published Delete:**
```typescript
async deletePublishedArticle(section: Section, slug: string): Promise<ContentOperationResult<{
    type: 'published';
    section: string;
    slug: string;
    alreadyDeleted: boolean;
    commitHash?: string;
    title?: string;
    revalidationPaths: string[];
}>>
```

- Returns paths that MUST be revalidated
- Includes article metadata for logging
- Idempotent with full revalidation path list
- Atomic commit with confirmed hash

---

### 3. Delete API Route (`src/app/api/publish/delete/route.ts`)

#### Delete Lock Mechanism (Prevents Double Delete)

```typescript
const deleteLocks = new Map<string, { timestamp: number; operationId: string }>();
const LOCK_TTL_MS = 30000; // 30 seconds

function acquireDeleteLock(articleId: string): string | null {
    const now = Date.now();
    const existing = deleteLocks.get(articleId);
    
    if (existing && (now - existing.timestamp) < LOCK_TTL_MS) {
        return null; // Already locked
    }
    
    const operationId = `del-${now}-${Math.random().toString(36).substr(2, 5)}`;
    deleteLocks.set(articleId, { timestamp: now, operationId });
    return operationId;
}
```

**Lock behavior:**
- Returns 429 status if delete already in progress
- Auto-expires after 30 seconds (prevents permanent locks)
- Automatic cleanup of old locks

#### Environment Validation

```typescript
function validateEnvironment(): { valid: true } | { valid: false; error: string } {
    const missing: string[] = [];
    
    if (!process.env.GIT_TOKEN) missing.push('GIT_TOKEN');
    if (!process.env.GIT_REPO_OWNER) missing.push('GIT_REPO_OWNER');
    if (!process.env.GIT_REPO_NAME) missing.push('GIT_REPO_NAME');
    
    if (missing.length > 0) {
        return { valid: false, error: `Missing: ${missing.join(', ')}` };
    }
    
    return { valid: true };
}
```

Returns 500 with clear error if environment is misconfigured.

#### ISR Coordination

```typescript
function triggerRevalidation(paths: string[], operationId: string): {
    success: boolean;
    results: { path: string; success: boolean; error?: string }[];
}
```

**Critical behavior:**
- Revalidation must succeed for delete to be considered successful
- If revalidation fails, returns 500 error even though Git delete succeeded
- Logs each path's revalidation result
- Prevents stale cache content

#### Structured API Responses

**Success Response:**
```json
{
  "success": true,
  "type": "draft" | "published",
  "slug": "article-slug",
  "revalidated": true,
  "alreadyDeleted": false,
  "commitHash": "abc123...",
  "message": "Article removed successfully."
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "errorCode": "CONFLICT" | "NOT_FOUND" | "PERMISSION" | "VALIDATION" | "SERVER_ERROR" | "ALREADY_DELETING"
}
```

#### Comprehensive Logging

Every operation is logged with a unique request ID:

```
[DELETE-API] [req-12345] ========== DELETE REQUEST START ==========
[DELETE-API] [req-12345] Verifying authentication...
[DELETE-API] [req-12345] Authentication verified
[DELETE-DRAFT] [draft-del-12345] START | draftId: draft-abc
[DELETE-DRAFT] [draft-del-12345] SHA before delete: abc123...
[DELETE-DRAFT] [draft-del-12345] Git commit result: success=true, hash=def456...
[DELETE-DRAFT] [draft-del-12345] SUCCESS | Commit: def456...
[DELETE-API] [req-12345] ========== DELETE REQUEST SUCCESS (DRAFT) ==========
```

---

### 4. Frontend Confirmed Delete Model (`src/app/publish/page.tsx`)

#### Delete Flow

```typescript
const handleDelete = useCallback(async (article: ArticleEntry) => {
    const articleId = article.id;

    // 1. PREVENT DOUBLE DELETE
    if (deletingIds.has(articleId)) {
        return; // Already deleting
    }

    // 2. LOCK ARTICLE (shows spinner + disabled state)
    setDeletingIds(prev => new Set(prev).add(articleId));

    try {
        // 3. WAIT FOR API RESPONSE (do NOT optimistically remove)
        const response = await fetch('/api/publish/delete', {...});
        
        // 4. HANDLE SESSION/RATE LIMITING
        if (response.status === 401) { /* redirect */ }
        if (response.status === 429) { /* show warning */ }
        
        const result = await response.json();

        // 5. ONLY REMOVE FROM UI AFTER API CONFIRMATION
        if (response.ok && result.success === true) {
            setArticles(prev => prev.filter(a => a.id !== articleId));
            showToast('success', result.message);
        } else {
            // FAILURE: Show error, keep article in UI
            showToast('error', result.error);
        }
    } catch (error) {
        showToast('error', "Network error...");
    } finally {
        // 6. ALWAYS UNLOCK
        setDeletingIds(prev => {
            const next = new Set(prev);
            next.delete(articleId);
            return next;
        });
    }
}, [deletingIds, showToast, fetchArticles]);
```

**Key principles:**
- ✓ Never remove from UI before API confirmation
- ✓ Never show success before commit confirmed
- ✓ Prevent parallel delete calls
- ✓ Show clear error messages with error codes
- ✓ Handle rate limiting (429) gracefully

---

## Performance Characteristics

### API Call Count

| Operation | API Calls | Description |
|-----------|-----------|-------------|
| Draft Delete | 2-3 | getFileInfo + commit operations |
| Published Delete | 2-3 | getFileInfo + commit operations |
| With 409 Retry | +0-2 | Refetch SHA and retry |

### Latency Targets

- Normal delete: < 1.5s
- With conflict retry: < 2s
- Lock timeout: 30 seconds

---

## Error Handling

### Git Conflicts (409)

1. Detect 409 status in commit operation
2. Log conflict with operation ID
3. Wait 100ms * retry count
4. Refetch latest SHA automatically
5. Retry commit (max 2 retries)
6. If still failing, return clear error to user

### Already Deleted (Idempotency)

- File not found during getFileInfo → Return success with `alreadyDeleted: true`
- 404 during commit → Catch and return success
- No duplicate delete errors

### Revalidation Failures

**Hard failure mode:** If revalidation fails after successful Git delete:
- Returns 500 error
- Logs critical failure
- Article is deleted but cache may be stale
- Requires manual intervention or cache clear

---

## Testing Checklist

### Functional Tests

- [ ] Delete draft → removed instantly from UI
- [ ] Delete published → removed from homepage immediately
- [ ] Refresh page after delete → article not reappearing
- [ ] Double click delete → no duplicate calls (shows rate limit warning)
- [ ] Delete already-deleted article → returns success (idempotent)

### Error Scenarios

- [ ] Simulated Git conflict → handled with retry
- [ ] Missing environment variables → returns 500 with clear error
- [ ] Revalidation failure → returns error (not silent success)
- [ ] Network error during delete → shows error toast
- [ ] Session expired during delete → redirects to login

### Race Conditions

- [ ] Two users delete same article → one succeeds, one gets "already deleted"
- [ ] Rapid double-click delete → second request gets 429
- [ ] Delete while edit in progress → handled independently

### Performance

- [ ] Delete completes within 1.5s
- [ ] No console errors in production build
- [ ] No hydration mismatches

---

## Deployment Verification

Before deployment, verify:

1. **Build succeeds:** `npm run build` completes without errors
2. **Environment configured:** GIT_TOKEN, GIT_REPO_OWNER, GIT_REPO_NAME set
3. **No console errors:** In production mode
4. **Type checking:** Passes `npx tsc --noEmit`

---

## Monitoring

Key log patterns to monitor:

```bash
# Successful deletes
grep "DELETE REQUEST SUCCESS" logs

# Git conflicts
grep "Git conflict detected" logs

# Failed revalidations
grep "Revalidation failed" logs

# Double-delete attempts
grep "ALREADY_DELETING" logs
```

---

## Summary

The delete architecture now provides:

1. **Atomicity**: Git commit confirmed before returning success
2. **Determinism**: Clear success/failure with structured responses
3. **Git Safety**: Automatic conflict resolution with retry
4. **Cache Consistency**: ISR revalidation mandatory for success
5. **Race Condition Safety**: Delete locks prevent parallel operations
6. **Production Reliability**: Comprehensive logging and environment validation
7. **UX Coordination**: Confirmed delete model with proper loading states

The system is elevated from best-effort to transactional-grade behavior.
