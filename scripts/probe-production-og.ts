import sharp from 'sharp';

async function probe() {
    const url = 'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/03/09628d74850fccb4-og-1200x630.jpg';
    console.log('=== PRODUCTION OG IMAGE PROBE ===');
    console.log('Target URL:     ', url);

    const res = await fetch(url, { redirect: 'manual' });
    console.log('HTTP Status:    ', res.status);
    console.log('Redirect Count: ', 0);
    console.log('Content-Type:   ', res.headers.get('content-type'));
    console.log('Content-Length: ', res.headers.get('content-length'), 'bytes');

    const buf = Buffer.from(await res.arrayBuffer());
    console.log('Actual Payload: ', buf.length, 'bytes (' + (buf.length / 1024).toFixed(1) + ' KB)');

    const meta = await sharp(buf).metadata();
    console.log('Actual Width:   ', meta.width, 'px');
    console.log('Actual Height:  ', meta.height, 'px');
    console.log('Actual Format:  ', meta.format);
    console.log('Aspect Ratio:   ', ((meta.width || 0) / (meta.height || 1)).toFixed(2) + ':1');
    console.log('Target <= 300KB:', buf.length <= 300 * 1024 ? 'PASS' : 'FAIL');
    console.log('=================================');
}

probe().catch(console.error);
