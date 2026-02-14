/**
 * Media Module Index
 * Re-exports all media utilities
 */

// Upload utilities
export {
    processImageUpload,
    generateImageHash,
    getImageDimensions,
    loadMediaRegistry,
    saveMediaRegistry,
    registerMediaAsset,
    updateAssetUsage,
    getOrphanedAssets,
    type ImageUploadResult,
} from './upload';

// Video provider utilities
export {
    parseVideoUrl,
    getVideoInfo,
    type VideoParseResult,
    type VideoInfoResult,
} from './video-providers';
