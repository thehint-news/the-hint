/**
 * English Translations
 *
 * Mirrors the structure of kn.ts for type safety and consistency.
 * All UI strings that need translation are defined here.
 */

export const en = {
    brand: {
        name: "THE HINT NEWS",
        description: "The Hint News is a Kannada independent digital newspaper delivering comprehensive coverage of local news, politics, crime, court, world affairs, and opinion with editorial integrity.",
        keywords: "Kannada news, Karnataka news, The Hint News, Kannada newspaper, independent journalism, politics, crime news",
        copyright: "© 2026 The Hint News. All rights reserved.",
        tagline1: "Independent Journalism",
        tagline2: "Delivered as it happens.",
    },
    nav: {
        home: "Home",
        local: "Local",
        politics: "Politics",
        world: "World",
        crime: "Crime",
        court: "Court",
        opinion: "Opinion",
        searchPlaceholder: "Search news...",
        searchButton: "Search",
        subscribeMobileButton: "Subscribe to News",
        subscribeDesktopButton: "Subscribe",
        todaysPaper: "Today's Paper",
        latest: "Latest News",
        seeWhatOthersMiss: "See What Others Miss",
        skipToMain: "Skip to main content"
    },
    time: {
        updatedJustNow: "Updated just now",
        updatedMinutesAgo: (min: number) => `Updated ${min} minute${min === 1 ? '' : 's'} ago`,
        updatedHoursAgo: (hours: number) => `Updated ${hours} hour${hours === 1 ? '' : 's'} ago`,
        updatedOn: "Updated on ",
        updatedOnLabel: "Updated:"
    },
    footer: {
        sections: "Sections",
        company: "Company",
        about: "About Us",
        contact: "Contact",
        legal: "Legal",
        terms: "Terms",
        privacy: "Privacy",
        unsubscribe: "Unsubscribe",
    },
    article: {
        readMore: "Read More",
        publishedOn: "Published:",
        by: "By",
        continueReading: "Continue Reading",
        share: "Share",
        copied: "Copied",
        correction: "Correction",
        updatedNotice: "This article has been updated since its original publication.",
        sources: "Sources",
        keywords: "Keywords"
    },
    errors: {
        notFound: "Page Not Found",
        notFoundDesc: "The page you are looking for is not available or has been removed.",
        generic: "Something went wrong.",
        genericDesc: "Sorry, an error occurred while loading this page. Please refresh.",
        goHome: "Return to Home",
        refresh: "Refresh",
        exploreSections: "Explore Our Sections"
    },
    subscribe: {
        title: "Get Breaking News Alerts",
        description: "Free. No spam. Just important news.",
        success: "Thank you for subscribing!",
        error: "Could not subscribe. Please try again.",
        placeholder: "Your email address",
        button: "Subscribe",
        subscribing: "Subscribing...",
        dispatch: "Editorial Dispatch",
        dailyBriefing: "Subscribe to our daily briefing",
        popupSubtitle: "Subscribe to receive breaking news, investigations, and analysis — straight from the newsroom.",
        bullet1: "Breaking news alerts from our editors",
        bullet2: "In-depth reporting and analysis",
        bullet3: "No ads. Just journalism",
        respectInbox: "We respect your inbox. Unsubscribe anytime.",
        noThanks: "No thanks",
        noSpam: "No spam. Unsubscribe anytime."
    },
    unsubscribePage: {
        title: "Unsubscribe",
        successMsg: "You have been successfully unsubscribed from our mailing list.",
        errorMsg: "There was a problem processing your request.",
        description: "Enter your email address to unsubscribe from our newsletter.",
        emailLabel: "Email Address",
        placeholder: "your@email.com",
        button: "Unsubscribe",
        processing: "Processing...",
        returnHome: "Return to Home",
        changedMind: "Changed your mind?",
        staySubscribed: "Stay Subscribed"
    },
    editorial: {
        leadStory: "Lead Story",
        topStories: "Top Stories",
        moreFrom: (section: string) => `More from ${section}`,
        continueReading: "Continue Reading",
        fromOurCoverage: "From Our Coverage",
        curatedStories: "Curated stories you might have missed.",
        viewAll: "View All",
        readTime: (minutes: number) => `${minutes} min read`,
        byAuthor: (author: string) => `By ${author}`,
    },
    sections: {
        politics: "Politics",
        crime: "Crime",
        court: "Court",
        opinion: "Opinion",
        "world-affairs": "World Affairs",
        local: "Local",
    },
    sectionDescriptions: {
        politics: "Political developments, policy decisions, and governance matters from Karnataka and beyond.",
        crime: "Crime reports, investigations, and public safety updates.",
        court: "Legal proceedings, judgments, and judicial updates.",
        opinion: "Editorials, columns, and perspectives from thought leaders.",
        "world-affairs": "International news, global developments, and foreign policy.",
        local: "Hyperlocal news from your neighborhood and community.",
    },
    messages: {
        emptySection: "No articles found in this section.",
        loadMore: "Load More",
        showingResults: (count: number) => `Showing ${count} results`,
        noResults: "No results found",
        tryDifferentSearch: "Try a different search term",
    },
    language: {
        toggle: "Switch Language",
        current: "Current language",
        select: "Select language",
    }
};

/** Type helper to ensure en and kn have the same structure */
export type Translations = typeof en;
