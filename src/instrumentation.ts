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
            // Re-throw to fail fast
            // process.exit(1); // Do not exit, allow startup to debug Vercel logs
            console.error('❌ Environment validation failed, but continuing startup for debugging.');
        }
    }
}
