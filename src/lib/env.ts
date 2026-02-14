/**
 * Environment Validation Module
 * 
 * Enforces strict environment variable presence at startup.
 * Fail-fast approach to prevent runtime configuration errors.
 */

const REQUIRED_KEYS = [
    'AUTHORIZED_EDITOR_EMAIL',
    'MAGIC_LINK_SECRET',
    'GIT_TOKEN',
    'GIT_REPO_OWNER',
    'GIT_REPO_NAME',
    'SMTP_PASS',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_FROM'
];

export function validateEnv() {
    // Only validate on server
    if (typeof window !== 'undefined') return;

    // Skip validation during build if needed, but requirements say "Run full production build... Confirm no experimental flags break build...". 
    // And "At application startup: Validate presence...".
    // Next.js build might run this if imported.
    // Usually we want to skip if NEXT_PHASE is 'phase-production-build' but we might not have access to that here easily without import.
    // However, if we are building, we might not have secrets.
    // But Step 1 says "Ensure npm run build completes ...".
    // And Step 2 says "At application startup".
    // "npm run build" runs the build. "npm start" runs the app.
    // If I put this in instrumentation, it runs on both?
    // Let's assume we validate only if not CI/Build? 
    // Actually, for "Production Parity", we should have env vars even during build if they are needed for static generation (which they might be if we fetch content).
    // But secrets like SMTP_PASS are runtime.

    // We can check if `process.env.NODE_ENV === 'production'`?
    // But we want validation in dev too.

    const missing = REQUIRED_KEYS.filter(key => !process.env[key]);

    if (missing.length > 0) {
        // We throw an error to stop startup
        // But during build, if secrets are missing, it might break build.
        // Step 2 says: "At application startup".
        // Use a flag to skip if explicitly requested?
        // For now, prompt strictness suggests we should throw.
        throw new Error(
            `\n❌ FATAL: Missing required environment variables:\n` +
            missing.map(key => `   - ${key}`).join('\n') +
            `\n\nApp cannot start without these variables.\n`
        );
    }

    console.log('✅ Environment configuration validated.');
}
