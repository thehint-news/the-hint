import Script from 'next/script';

export default function GoogleAnalytics() {
    const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

    if (process.env.NODE_ENV !== 'production' || !GA_ID) {
        return null;
    }

    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics-init" strategy="afterInteractive">
                {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            anonymize_ip: true,
            send_page_view: false
          });
        `}
            </Script>
        </>
    );
}
