/**
 * Publishing Console Components
 * Re-exports all publishing-related components
 * 
 * FOLDER STRUCTURE:
 * - mobile/      - Mobile-specific components (bottom sheets, action bars)
 * - desktop/     - Desktop-specific components (editors, toolbars)
 * - common/      - Shared components used by both mobile and desktop
 * - types/       - TypeScript type definitions
 */

// =============================================================================
// DESKTOP COMPONENTS
// =============================================================================
export { EditorialToolbar } from './desktop/EditorialToolbar';
export { ArticleEditor } from './desktop/ArticleEditor';
export { ArticleDatabase } from './desktop/ArticleDatabase';
export { ConfirmDialog } from './desktop/ConfirmDialog';
export { ImageBlockEditor } from './desktop/ImageBlockEditor';
export { VideoBlockEditor } from './desktop/VideoBlockEditor';
export { BlockEditor } from './desktop/BlockEditor';

// =============================================================================
// MOBILE COMPONENTS
// =============================================================================
export { MobileSettingsPanel } from './mobile/MobileSettingsPanel';
export { MobileActionBar } from './mobile/MobileActionBar';
export { MobileInsertMenu } from './mobile/MobileInsertMenu';

// =============================================================================
// COMMON/SHARED COMPONENTS
// =============================================================================
export { Toast } from './common/Toast';
export { MediaCounter } from './common/MediaCounter';
export { LeadMediaManager } from './common/LeadMediaManager';

// =============================================================================
// TYPES
// =============================================================================
export * from './types';
