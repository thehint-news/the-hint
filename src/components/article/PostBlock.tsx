import type { PostBlock } from '@/lib/content/media-types';
import { SocialEmbed } from './SocialEmbed';

interface PostBlockRendererProps {
    block: PostBlock;
}

export function PostBlockRenderer({ block }: PostBlockRendererProps) {
    return (
        <figure style={{ margin: '2rem auto', width: '100%', maxWidth: '600px' }} data-block-id={block.id}>
            <SocialEmbed url={block.canonicalUrl || block.originalUrl} />
        </figure>
    );
}
