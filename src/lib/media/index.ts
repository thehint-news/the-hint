/**
 * Media Module Index
 * Re-exports all media utilities
 */

// Upload utilities (Supabase Storage backed)
export {
    processImageUpload,
    generateImageHash,
    getImageDimensions,
    type ImageUploadResult,
} from './upload';

// Supabase storage utilities
export {
    uploadToStorage,
    deleteFromStorage,
    extractDimensions,
    type StorageUploadResult,
} from './supabase-storage';

// Video provider utilities
export {
    parseVideoUrl,
    getVideoInfo,
    type VideoParseResult,
    type VideoInfoResult,
} from './video-providers';
