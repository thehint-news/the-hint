# The Hint — Web

**[🚀 PRODUCTION DEPLOYMENT GUIDE](./VERCEL_DEPLOYMENT.md)**

This is the web application for "The Hint", built with Next.js (App Router), Tailwind CSS, and headless Git-based CMS architecture.

**Live Site:** [https://the-hint-web.vercel.app](https://the-hint-web.vercel.app)

## Getting Started

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/chiranjeevi005/the-hint.git
    cd the-hint-web
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment**:
    Copy `.env.local.example` (or similar) to `.env.local` and set keys. See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for required keys.

4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

## Architecture

*   **Framework**: Next.js 15 (App Router)
*   **Styling**: Tailwind CSS
*   **Content**: Git-based (Markdown + JSON) via GitHub API
*   **Media**: Supabase Storage
*   **Email**: Resend
*   **Deployment**: Vercel (Serverless)

## Key Commands

*   `npm run build`: Production build (validates types & linting)
*   `npm run lint`: Run ESLint
