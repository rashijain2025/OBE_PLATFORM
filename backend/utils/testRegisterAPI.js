/**
 * Registration API Test Script
 * Run with: node backend/utils/testRegisterAPI.js
 * Requires: server running on port 5000 + MongoDB accessible
 */

const http = require('http');

// ── Helper: wait ───────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Helper: make a POST request ───────────────────────────────────────────────
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
            res.on('data', (chunk) => { raw += chunk; });
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
function log(testName, passed, detail) {
    const icon = passed ? 'PASS' : 'FAIL';
    console.log(`  [${icon}]  ${testName}`);
    if (detail) console.log(`         -> ${detail}`);
}

// ── TESTS ──────────────────────────────────────────────────────────────────────
async function runTests() {
    console.log('\n==========================================');
    console.log('  OBE Platform - Register API Tests     ');
    console.log('==========================================\n');

    // TEST 1: Valid registration
    console.log('TEST 1: Valid registration succeeds (201)');
    const t1 = await post('/api/auth/register', {
        name: 'Rashi Jain',
        email: 'rashi@obe.edu',
        password: 'secure123',
        role: 'admin',
    });
    log('Status is 201', t1.status === 201, `Status: ${t1.status}`);
    log('success is true', t1.body.success === true, `success: ${t1.body.success}`);
    log('Returns _id', !!t1.body.data?._id, `_id: ${t1.body.data?._id}`);
    log('Password NOT in response', !t1.body.data?.password, `password field: ${t1.body.data?.password}`);
    log('Role is admin', t1.body.data?.role === 'admin', `role: ${t1.body.data?.role}`);
    console.log();

    // TEST 2: Duplicate email rejected
    console.log('TEST 2: Duplicate email is rejected (409)');
    const t2 = await post('/api/auth/register', {
        name: 'Someone Else',
        email: 'rashi@obe.edu', // same email as TEST 1
        password: 'anotherpass',
    });
    log('Status is 409', t2.status === 409, `Status: ${t2.status}`);
    log('success is false', t2.body.success === false, `success: ${t2.body.success}`);
    log('Error message mentions email', t2.body.message?.toLowerCase().includes('already exists'), `message: ${t2.body.message}`);
    console.log();

    // TEST 3: Missing name
    console.log('TEST 3: Missing name is rejected (400)');
    const t3 = await post('/api/auth/register', {
        email: 'noname@obe.edu',
        password: 'pass1234',
    });
    log('Status is 400', t3.status === 400, `Status: ${t3.status}`);
    log('Error mentions name', t3.body.message?.toLowerCase().includes('name'), `message: ${t3.body.message}`);
    console.log();

    // TEST 4: Missing email
    console.log('TEST 4: Missing email is rejected (400)');
    const t4 = await post('/api/auth/register', {
        name: 'No Email',
        password: 'pass1234',
    });
    log('Status is 400', t4.status === 400, `Status: ${t4.status}`);
    log('Error mentions email', t4.body.message?.toLowerCase().includes('email'), `message: ${t4.body.message}`);
    console.log();

    // TEST 5: Invalid email format
    console.log('TEST 5: Invalid email format is rejected (400)');
    const t5 = await post('/api/auth/register', {
        name: 'Bad Email',
        email: 'not-an-email',
        password: 'pass1234',
    });
    log('Status is 400', t5.status === 400, `Status: ${t5.status}`);
    log('Error mentions email', t5.body.message?.toLowerCase().includes('email'), `message: ${t5.body.message}`);
    console.log();

    // TEST 6: Password too short
    console.log('TEST 6: Password shorter than 6 chars is rejected (400)');
    const t6 = await post('/api/auth/register', {
        name: 'Short Pass',
        email: 'short@obe.edu',
        password: '123',
    });
    log('Status is 400', t6.status === 400, `Status: ${t6.status}`);
    log('Error mentions password length', t6.body.message?.toLowerCase().includes('password'), `message: ${t6.body.message}`);
    console.log();

    // TEST 7: Invalid role
    console.log('TEST 7: Invalid role is rejected (400)');
    const t7 = await post('/api/auth/register', {
        name: 'Bad Role',
        email: 'badrole@obe.edu',
        password: 'pass1234',
        role: 'student',
    });
    log('Status is 400', t7.status === 400, `Status: ${t7.status}`);
    log('Error mentions role', t7.body.message?.toLowerCase().includes('role'), `message: ${t7.body.message}`);
    console.log();

    // TEST 8: Role defaults to faculty when not provided
    console.log('TEST 8: Role defaults to "faculty" when not provided');
    const t8 = await post('/api/auth/register', {
        name: 'Default Role Faculty',
        email: 'faculty@obe.edu',
        password: 'pass1234',
    });
    log('Status is 201', t8.status === 201, `Status: ${t8.status}`);
    log('Role defaults to faculty', t8.body.data?.role === 'faculty', `role: ${t8.body.data?.role}`);
    console.log();

    console.log('==========================================');
    console.log('  All tests complete.                    ');
    console.log('==========================================\n');
}

runTests().catch(console.error);
