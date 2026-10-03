const bodyUrls = [
    'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/03/3a8338da521dda59.jpg',
    'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/03/fc962a17ab3f7e25.png',
    'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/03/e00ab10e919a53e2.png',
    'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/07/3662e7649fadccfa.jpg',
    'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/06/ed0c238d8fb75615.jpg',
    'https://vknkmbsapbnahnlkwbnz.supabase.co/storage/v1/object/public/article-images/articles/2026/03/8759257036f0a221.jpg'
];

async function checkBody() {
    for (const u of bodyUrls) {
        const res = await fetch(u);
        console.log(res.status, u);
    }
}
checkBody().catch(console.error);
