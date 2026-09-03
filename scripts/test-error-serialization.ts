import { logger } from '../src/lib/feedback/console-guard';

console.log('=== TEST 1: ERROR SERIALIZATION IN PRODUCTION ===');

// Simulate production environment
Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true, writable: true });

// Capture console.error output
const logs: unknown[][] = [];
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
    logs.push(args);
    originalConsoleError(...args);
};

try {
    // 1. Test standard Error instance with message and stack
    const testError = new Error('Test production synchronization failure');
    logger.error('Post-publish synchronization failed', testError);

    // 2. Test Error with contextual data including sensitive fields
    const sensitiveError = new Error('Database connection timeout');
    logger.error('Database operation failed', sensitiveError, {
        code: 'DB_TIMEOUT',
        source: 'publish_handler',
        requestId: 'req-12345',
        token: 'ghp_secret_github_token_xyz',
        cookie: 'the_hint_session=jwt_payload_xyz',
        authorization: 'Bearer secret_token',
        password: 'super_secret_password',
    });

    // 3. Test non-Error object
    logger.error('String error test', 'Custom error string');

} finally {
    console.error = originalConsoleError;
}

console.log('\n=== ASSERTIONS & VERIFICATION ===');

// Check Log 1 (The exact incident scenario)
const log1 = logs[0];
const log1Payload = log1[1] as Record<string, unknown>;

console.log('Log 1 Message:', log1[0]);
console.log('Log 1 Payload:', JSON.stringify(log1Payload, null, 2));

const log1HasName = log1Payload.name === 'Error';
const log1HasMessage = log1Payload.message === 'Test production synchronization failure';
const log1HasStack = typeof log1Payload.stack === 'string' && log1Payload.stack.includes('Error: Test production synchronization failure');
const log1NotEmpty = Object.keys(log1Payload).length > 1; // More than just timestamp

console.log('  [PASS] Has Error name:', log1HasName);
console.log('  [PASS] Has Error message:', log1HasMessage);
console.log('  [PASS] Has Error stack trace:', log1HasStack);
console.log('  [PASS] Not empty {}:', log1NotEmpty);

if (!log1HasName || !log1HasMessage || !log1HasStack || !log1NotEmpty) {
    console.error('FAILED: Log 1 does not meet production error serialization requirements!');
    process.exit(1);
}

// Check Log 2 (Sanitization)
const log2 = logs[1];
const log2Payload = log2[1] as Record<string, unknown>;

console.log('\nLog 2 Payload (with sanitized context):', JSON.stringify(log2Payload, null, 2));

const tokenRedacted = log2Payload.token === '[REDACTED]';
const cookieRedacted = log2Payload.cookie === '[REDACTED]';
const authRedacted = log2Payload.authorization === '[REDACTED]';
const passwordRedacted = log2Payload.password === '[REDACTED]';
const safeFieldsPreserved = log2Payload.code === 'DB_TIMEOUT' && log2Payload.requestId === 'req-12345';

console.log('  [PASS] Token redacted:', tokenRedacted);
console.log('  [PASS] Cookie redacted:', cookieRedacted);
console.log('  [PASS] Authorization header redacted:', authRedacted);
console.log('  [PASS] Password redacted:', passwordRedacted);
console.log('  [PASS] Safe context preserved:', safeFieldsPreserved);

if (!tokenRedacted || !cookieRedacted || !authRedacted || !passwordRedacted || !safeFieldsPreserved) {
    console.error('FAILED: Log 2 sensitive data redaction failed!');
    process.exit(1);
}

console.log('\nALL ERROR SERIALIZATION UNIT TESTS PASSED SUCCESSFULLY.');
