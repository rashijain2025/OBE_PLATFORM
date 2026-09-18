/**
 * Login API Test Script
 * Run with: node backend/utils/testLoginAPI.js
 * Requires: server running on port 5001 + MongoDB accessible
 * Prerequisite: testRegisterAPI.js must have been run first (user rashi@obe.edu must exist)
 */

const http = require('http');
const jwt = require('jsonwebtoken');

// ── Helper: POST request ───────────────────────────────────────────────────────
function post(path, body) {
    return new Promise((resolve) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: 'localhost',
            port: 5001,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
        };
        const req = http.request(options, (res) => {
            let raw = '';
            res.on('data', (c) => { raw += c; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        req.on('error', (e) => resolve({ status: 0, body: { message: e.message } }));
        req.write(data);
        req.end();
    });
}

// ── Logging helper ─────────────────────────────────────────────────────────────
function log(label, passed, detail) {
    console.log('  [' + (passed ? 'PASS' : 'FAIL') + ']  ' + label);
    if (detail) console.log('         -> ' + detail);
}

// ── TESTS ──────────────────────────────────────────────────────────────────────
async function runTests() {
    console.log('\n==========================================');
    console.log('  OBE Platform - Login API Tests        ');
    console.log('==========================================\n');

    // We need a known user — register one fresh for login tests
    const TEST_EMAIL = 'logintest@obe.edu';
    const TEST_PASSWORD = 'TestPass@99';
    const TEST_ROLE = 'faculty';

    // Ensure test user exists (idempotent)
    await post('/api/auth/register', {
        name: 'Login Test User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: TEST_ROLE,
    });

    // ── TEST 1: Valid credentials → 200 + token ────────────────────────────────
    console.log('TEST 1: Valid email + valid password returns 200 + JWT');
    const t1 = await post('/api/auth/login', { email: TEST_EMAIL, password: TEST_PASSWORD });
    log('Status is 200',   t1.status === 200,         'Status: ' + t1.status);
    log('success is true', t1.body.success === true,  'success: ' + t1.body.success);
    log('token is present',!!t1.body.token,           'token: ' + (t1.body.token ? t1.body.token.substring(0, 30) + '...' : 'MISSING'));
    log('role is returned', t1.body.data?.role === TEST_ROLE, 'role: ' + t1.body.data?.role);
    log('password NOT in response', !t1.body.data?.password, 'password field: ' + t1.body.data?.password);
    console.log();

    // ── TEST 2: Wrong password → 401 ──────────────────────────────────────────
    console.log('TEST 2: Valid email + wrong password returns 401');
    const t2 = await post('/api/auth/login', { email: TEST_EMAIL, password: 'WrongPass!!' });
    log('Status is 401',   t2.status === 401,         'Status: ' + t2.status);
    log('success is false',t2.body.success === false, 'success: ' + t2.body.success);
    log('Generic error message (no hint)', t2.body.message?.includes('Invalid email or password'), 'message: ' + t2.body.message);
    console.log();

    // ── TEST 3: Non-existent email → 401 ──────────────────────────────────────
    console.log('TEST 3: Non-existent email returns 401');
    const t3 = await post('/api/auth/login', { email: 'ghost@nobody.com', password: 'SomePass1' });
    log('Status is 401',   t3.status === 401,         'Status: ' + t3.status);
    log('Generic error message (no email hint)', t3.body.message?.includes('Invalid email or password'), 'message: ' + t3.body.message);
    console.log();

    // ── TEST 4: Missing email → 400 ───────────────────────────────────────────
    console.log('TEST 4: Missing email returns 400');
    const t4 = await post('/api/auth/login', { password: 'SomePass1' });
    log('Status is 400',   t4.status === 400,         'Status: ' + t4.status);
    log('Error mentions email', t4.body.message?.toLowerCase().includes('email'), 'message: ' + t4.body.message);
    console.log();

    // ── TEST 5: Missing password → 400 ────────────────────────────────────────
    console.log('TEST 5: Missing password returns 400');
    const t5 = await post('/api/auth/login', { email: TEST_EMAIL });
    log('Status is 400',   t5.status === 400,         'Status: ' + t5.status);
    log('Error mentions password', t5.body.message?.toLowerCase().includes('password'), 'message: ' + t5.body.message);
    console.log();

    // ── TEST 6: JWT is verifiable with the secret ──────────────────────────────
    console.log('TEST 6: JWT can be decoded and verified using JWT_SECRET');
    if (t1.body.token) {
        try {
            const JWT_SECRET = 'obe_platform_super_secret_jwt_key_change_this_in_production';
            const decoded = jwt.verify(t1.body.token, JWT_SECRET);
            log('JWT is valid and verifiable',  !!decoded.id,          'decoded.id: ' + decoded.id);
            log('JWT payload contains role',    !!decoded.role,         'decoded.role: ' + decoded.role);
            log('JWT payload contains exp',     !!decoded.exp,          'decoded.exp (unix): ' + decoded.exp);
            log('JWT has NO password field',    !decoded.password,      'password in JWT: ' + decoded.password);
            log('JWT has NO email field (minimal payload)', !decoded.email, 'email in JWT: ' + decoded.email);

            // Show human-readable expiry
            const expiresAt = new Date(decoded.exp * 1000).toUTCString();
            console.log('         -> Token expires at: ' + expiresAt);
        } catch (e) {
            log('JWT verification failed', false, e.message);
        }
    } else {
        log('No token to verify (Test 1 failed)', false, '');
    }
    console.log();

    // ── TEST 7: Password never returned in any response ────────────────────────
    console.log('TEST 7: Password is never returned in any login response');
    const noPassInSuccess  = !t1.body.data?.password && !t1.body.password;
    const noPassInFailure  = !t2.body.data?.password && !t2.body.password;
    log('Password absent on success (200)', noPassInSuccess,  'data.password: ' + t1.body.data?.password);
    log('Password absent on failure (401)', noPassInFailure,  'data.password: ' + t2.body.data?.password);
    console.log();

    console.log('==========================================');
    console.log('  All tests complete.                    ');
    console.log('==========================================\n');
}

runTests().catch(console.error);
