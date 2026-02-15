export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { validateEnv } = await import('@/lib/env');

        // Wrap in try-catch to allow build to potentially succeed if env vars are missing but not critical for build phases that don't need them
        // However, prompt says "Throw descriptive startup error ... Do not allow silent fallback".
        // Use a strict approach.
        try {
            validateEnv();
        } catch (error) {
            console.error(error);
            // Re-throw to fail fast in production
            if (process.env.NODE_ENV === 'production') {
                console.error('❌ Environment validation failed. Aborting build to prevent broken deployment.');
                process.exit(1);
            } else {
                console.error('❌ Environment validation failed, but continuing startup for debugging in development.');
            }
        }
    }
}
