'use client';

import { SocialEmbed } from '@/components/article/SocialEmbed';

export default function TestEmbed() {
    return (
        <div style={{ padding: '50px' }}>
            <h1>Test Embed</h1>
            <SocialEmbed url="https://x.com/Retarted__/status/1888915152864112948" />
            <SocialEmbed url="https://x.com/i/status/2022547834999111941" />
            <SocialEmbed url="https://www.instagram.com/reel/DUYt-aSk6O6/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==" />
            <SocialEmbed url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" />
        </div>
    );
}
