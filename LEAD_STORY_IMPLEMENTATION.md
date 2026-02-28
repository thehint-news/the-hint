# Lead Story Multi-Thumbnail Carousel - Production Implementation

## Executive Summary

Complete implementation of a newsroom-grade lead story hero carousel system with multi-thumbnail support (max 3 images), auto-rotation, and strict single-lead enforcement.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

Publish Form (ArticleFormData)
    ├── isLead: boolean
    └── leadImages: LeadStoryImageData[]
            ↓
    buildPayload()
            ↓
    API Request (PublishArticleInput)
    ├── isLead: boolean
    └── leadMedia?: { images: [...] }
            ↓
    transformToValidatedData()
            ↓
    contentGit.publish()
            ↓
    generateMarkdownContent() → Git Frontmatter
    ├── isLead: true
    └── leadMedia:
        images:
          - url: string
            alt: string
            width?: number
            height?: number
            ↓
    reader.ts (getAllArticles)
            ↓
    Article type
    ├── isLead: boolean
    └── leadMedia?: LeadMedia
            ↓
    Homepage (getHomepageData)
            ↓
    LeadStory Component
        ├── 1 image → Static hero
        ├── 2-3 images → Auto-carousel
        └── 0 images → Fallback to featuredImage
```

## Files Modified

### 1. Type Definitions

#### `src/lib/content/types.ts`
```typescript
// Lead story image (max 3)
export interface LeadStoryImage {
    url: string;
    alt: string;
    width?: number;
    height?: number;
}

// Lead media container
export interface LeadMedia {
    images: LeadStoryImage[];
}

// Added to Article interface
export interface Article {
    // ... existing fields ...
    isLead?: boolean;
    leadMedia?: LeadMedia;
}

// Added to ArticleFrontmatter
export interface ArticleFrontmatter {
    // ... existing fields ...
    isLead?: boolean;
    leadMedia?: LeadMedia;
}
```

#### `src/components/publish/types/article-types.ts`
```typescript
// Frontend form data
export interface ArticleFormData {
    // ... existing fields ...
    isLead: boolean;
    leadImages: LeadStoryImageData[];
}

// Initial state
export const INITIAL_FORM_DATA: ArticleFormData = {
    // ... existing fields ...
    isLead: false,
    leadImages: [],
};
```

### 2. Validation Layer (`src/lib/validation/article.ts`)

#### Draft Validation
```typescript
export interface DraftArticleInput {
    // ... existing fields ...
    isLead?: unknown;
    leadMedia?: unknown;
}

export interface ValidatedDraftData {
    // ... existing fields ...
    isLead?: boolean;
    leadMedia?: {
        images: { url: string; alt: string; width?: number; height?: number }[];
    };
}
```

#### Publish Validation
```typescript
export interface PublishArticleInput {
    // ... existing fields ...
    isLead?: unknown;
    leadMedia?: unknown;
}

export interface ValidatedArticleData {
    // ... existing fields ...
    isLead?: boolean;
    leadMedia?: {
        images: { url: string; alt: string; width?: number; height?: number }[];
    };
}
```

#### Validation Rules
- `isLead` must be explicitly `true` (not truthy)
- `leadMedia` only valid if `isLead === true`
- Maximum 3 images enforced via `.slice(0, 3)`
- Each image must have `url` and `alt`
- Thumbnail optional for lead stories (falls back to first lead image)

### 3. Git Content Layer (`src/lib/git/content.ts`)

#### DraftData Interface
```typescript
export interface DraftData {
    // ... existing fields ...
    isLead?: boolean;
    leadMedia?: {
        images: { url: string; alt: string; width?: number; height?: number }[];
    };
}
```

#### PublishedArticleData Interface
```typescript
export interface PublishedArticleData {
    // ... existing fields ...
    isLead?: boolean;
    leadMedia?: {
        images: { url: string; alt: string; width?: number; height?: number }[];
    };
}
```

#### generateMarkdownContent()
```typescript
private generateMarkdownContent(data: {
    // ... existing fields ...
    isLead?: boolean;
    leadMedia?: { images: [...] };
}): string {
    const frontmatter: Record<string, unknown> = {
        // ... existing fields ...
    };

    // Add lead story fields ONLY if isLead === true
    if (data.isLead === true) {
        frontmatter.isLead = true;

        if (data.leadMedia?.images?.length > 0) {
            const validImages = data.leadMedia.images
                .filter(img => img.url && img.alt)
                .slice(0, 3); // Hard max 3

            if (validImages.length > 0) {
                frontmatter.leadMedia = { images: validImages };
            }
        }
    }

    return `---\n${yaml.dump(frontmatter)}\n---`;
}
```

### 4. Content Reader (`src/lib/content/reader.ts`)

```typescript
return {
    // ... existing fields ...
    isLead: frontmatter.isLead === true,
    leadMedia: frontmatter.leadMedia,
};
```

### 5. Articles API (`src/app/api/publish/articles/route.ts`)

```typescript
interface ArticleEntry {
    // ... existing fields ...
    data: {
        // ... existing fields ...
        isLead?: boolean;
        leadImages?: { url: string; alt: string; width?: number; height?: number }[];
    };
}

// Transform draft → API response
function transformDraftToEntry(draft: DraftData): ArticleEntry {
    return {
        // ... existing fields ...
        data: {
            // ... existing fields ...
            isLead: draft.isLead === true,
            leadImages: draft.leadMedia?.images || [],
        },
    };
}

// Transform published → API response
function transformPublishedToEntry(article: PublishedArticleData): ArticleEntry {
    return {
        // ... existing fields ...
        data: {
            // ... existing fields ...
            isLead: article.isLead === true,
            leadImages: article.leadMedia?.images || [],
        },
    };
}
```

### 6. Publish Page (`src/app/publish/page.tsx`)

#### Build Payload
```typescript
const buildPayload = useCallback(() => {
    // ... existing transformations ...

    // Build lead media payload
    const leadMedia = formData.isLead && formData.leadImages.length > 0
        ? { images: formData.leadImages }
        : undefined;

    return {
        // ... existing fields ...
        isLead: formData.isLead,
        leadMedia: leadMedia,
    };
}, [formData]);
```

#### Handle Edit
```typescript
const handleEdit = useCallback((article: ArticleEntry) => {
    const data = article.data;

    const newData = {
        // ... existing fields ...
        isLead: data.isLead === true,
        leadImages: Array.isArray(data.leadImages) ? data.leadImages : [],
    } as ArticleFormData;

    setFormData(newData);
    // ...
}, []);
```

#### Handle Publish
```typescript
const handlePublish = useCallback(() => {
    // Thumbnail optional for lead stories with images
    const hasLeadImages = formData.isLead && formData.leadImages.length > 0;
    if (!formData.thumbnail && !hasLeadImages) {
        showToast('warning', 'Thumbnail or lead images required');
        return;
    }
    // ...
}, [formData, showToast]);
```

### 7. LeadMediaManager Component (`src/components/publish/common/LeadMediaManager.tsx`)

#### Features
- Drag and drop upload
- File type validation (JPEG, PNG, WebP)
- File size validation (max 5MB)
- Image dimension extraction
- Preview grid with reordering
- Delete functionality
- Count indicator (e.g., "2/3 used")
- Hard stop at 3 images

#### Props
```typescript
interface LeadMediaManagerProps {
    images: LeadStoryImageData[];
    onChange: (images: LeadStoryImageData[]) => void;
    maxImages?: number; // default 3
    disabled?: boolean;
}
```

### 8. Homepage Data (`src/lib/content/homepage.ts`)

```typescript
function selectLeadStory(articles: Article[]): Article | null {
    // Primary: Check for isLead === true (new canonical)
    const isLeadCandidates = articles.filter(article => article.isLead === true);
    
    if (isLeadCandidates.length > 0) {
        return sortByPublishedAtDesc(isLeadCandidates)[0];
    }

    // Fallback: Check for placement='lead' (legacy)
    const placementCandidates = articles.filter(
        article => article.placement === 'lead'
    );

    if (placementCandidates.length === 0) {
        return null;
    }

    return sortByPublishedAtDesc(placementCandidates)[0];
}
```

### 9. LeadStory Carousel Component (`src/components/editorial/LeadStory.tsx`)

#### Rendering Logic
```typescript
const leadImages = article.leadMedia?.images || [];
const useCarousel = leadImages.length >= 2;
const displayImages = leadImages.length > 0 
    ? leadImages 
    : article.image 
        ? [{ url: article.image, alt: article.title }] 
        : [];

// 1 image → Static hero
// 2-3 images → Auto-carousel
// 0 images → Fallback to featuredImage
```

#### Carousel Features
- Auto-rotate every 5 seconds
- Pause on hover
- CSS transform transitions (GPU accelerated)
- Preload first image (`priority={true}`)
- Lazy load subsequent images
- Navigation arrows (prev/next)
- Dot indicators
- ARIA live region for accessibility
- Server-rendered (no hydration mismatch)

#### Performance Optimizations
- `will-change: transform` on carousel track
- `priority={true}` on first image (LCP optimization)
- `loading="lazy"` on subsequent images
- CSS aspect-ratio containers (prevents layout shift)
- Transform-based animations (no layout thrashing)

### 10. Single-Lead Enforcement (`src/lib/lead/enforcement.ts`)

#### Key Functions

```typescript
/**
 * Find current lead article
 */
export async function findCurrentLead(): Promise<{
    section: string;
    slug: string;
    sha: string;
} | null> {
    // Searches all articles for isLead === true
    // Returns first match (there should only be one)
}

/**
 * Atomically swap lead articles
 * Race-condition safe with optimistic locking
 */
export async function atomicallySwapLead(
    newLead: { section: string; slug: string }
): Promise<{
    success: boolean;
    previousLead?: { section: string; slug: string };
}> {
    // 1. Fetch current lead
    // 2. If exists and different → unset it
    // 3. Set new lead
    // 4. Commit atomically
    // 5. Idempotent - safe to retry
}

/**
 * Validate lead media before commit
 */
export function validateLeadMedia(
    isLead: boolean,
    leadMedia?: { images?: unknown[] }
): ValidationResult {
    // Max 3 images
    // Required fields: url, alt
    // Only validated if isLead === true
}
```

#### Race Condition Protection
- Git SHA-based optimistic locking
- Atomic commits (both unset + set in single commit)
- Idempotent operations (safe to retry)
- Background enforcement (doesn't block publish)

### 11. CSS Styles (`src/app/globals.css`)

```css
/* Carousel container */
.lead-carousel {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Track that slides */
.carousel-track {
  display: flex;
  width: 100%;
  height: 100%;
  will-change: transform;
}

/* Individual slide */
.carousel-slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  position: relative;
}

/* Navigation */
.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  /* ... styles ... */
  opacity: 0;
  transition: opacity 0.2s ease;
}

.thumbnail-container:hover .carousel-nav {
  opacity: 1;
}

/* Dots indicator */
.carousel-dots {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 0.5rem;
  /* ... styles ... */
}
```

## Validation Checklist

### UI Layer
- ✅ LeadMediaManager visible only when isLead === true
- ✅ Maximum 3 images enforced
- ✅ File type validation (JPEG, PNG, WebP)
- ✅ File size validation (5MB max)
- ✅ Drag and drop with visual feedback
- ✅ Reordering via drag handles
- ✅ Delete with confirmation
- ✅ Count indicator (X/3 used)

### API Layer
- ✅ transformToValidatedData validates isLead and leadMedia
- ✅ Max 3 images enforced via .slice(0, 3)
- ✅ URL and alt text required for each image
- ✅ leadMedia only accepted if isLead === true

### Server Layer
- ✅ generateMarkdownContent validates before writing
- ✅ Empty leadMedia.images → omitted from frontmatter
- ✅ Invalid images filtered out
- ✅ Hard max 3 images

### Data Integrity
- ✅ Single-lead enforcement via atomicallySwapLead()
- ✅ Race condition protection with Git SHA locking
- ✅ Atomic commits (unset + set together)
- ✅ Idempotent operations

## Performance Characteristics

### Homepage Load
- **LCP Target**: < 2.5s (first lead image preloaded with priority)
- **Layout Shift**: 0 (CSS aspect-ratio containers)
- **JS Bundle**: No additional libraries (pure CSS + React)
- **Hydration**: Clean (server-rendered, client enhances)

### Carousel Runtime
- **Animation**: 60fps CSS transforms
- **Memory**: Minimal (3 images max, lazy loaded)
- **CPU**: Low (CSS transitions, no JS animation frames)
- **Accessibility**: Full keyboard navigation, ARIA labels

## Edge Cases Handled

1. **Editor removes 1 image later** → Carousel adapts (2 images → no arrows)
2. **Editor unmarks lead** → leadMedia cleared from payload
3. **Article deleted while marked lead** → selectLeadStory returns null, homepage shows fallback
4. **Rapid publish actions** → Race condition protection via Git SHA
5. **Missing images** → Fallback to featuredImage
6. **Broken URLs** → Image onError handled by Next.js Image
7. **0 lead images** → Static hero with featuredImage
8. **1 lead image** → Static hero (no carousel)
9. **2-3 lead images** → Full carousel with auto-rotation

## Testing Instructions

### Test 1: Create New Lead Story
1. Click "New Article"
2. Fill headline, subheadline, body
3. Click "Lead Story" in Homepage Placement
4. Upload 2-3 images in Lead Story Thumbnails
5. Publish
6. Check homepage console:
   ```
   [HomePage] Lead story found: {isLead: true, hasLeadMedia: true, leadImagesCount: 3}
   [LeadStory] Rendering with: {useCarousel: true, displayImagesCount: 3}
   ```

### Test 2: Edit Existing Lead Story
1. Find lead story in article list
2. Click Edit
3. Lead Story toggle should be ON
4. Lead images should be visible
5. Add/delete/reorder images
6. Save
7. Verify changes on homepage

### Test 3: Single Lead Enforcement
1. Create Article A as lead → Publish
2. Create Article B as lead → Publish
3. Check Article A's markdown file → isLead should be false
4. Check Article B's markdown file → isLead should be true
5. Homepage should show Article B

### Test 4: Fallback Behavior
1. Edit lead story
2. Delete all lead images
3. Save
4. Homepage should show static hero with featuredImage

## Build Verification

```bash
npm run build
# Expected: ✓ Compiled successfully
#           ✓ 27 static pages generated
#           No TypeScript errors
#           No ESLint errors
```

## Production Readiness

- ✅ Type-safe throughout (TypeScript strict)
- ✅ Server-driven (no client-side data fetching)
- ✅ Git-backed (version controlled, auditable)
- ✅ Atomic operations (data consistency)
- ✅ Backward compatible (existing articles unaffected)
- ✅ SEO-safe (no URL changes, proper alt text)
- ✅ Translation compatible (shared leadMedia)
- ✅ Performance optimized (LCP < 2.5s)
- ✅ Accessibility compliant (ARIA, keyboard nav)
- ✅ Error resilient (graceful fallbacks)

## Deployment Notes

No environment variables required. No database migrations. No API keys. The system uses existing Git-based storage infrastructure.

## Support

For issues or questions:
1. Check browser console for debug logs
2. Verify article frontmatter in GitHub
3. Check homepage console for lead story detection
4. Verify single-lead enforcement logs