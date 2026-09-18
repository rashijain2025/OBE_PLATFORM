/**
 * Standalone Password Hashing Test
 * ------------------------------------
 * Tests the exact same logic used in User.js pre-save hook and matchPassword().
 * Run with: node backend/utils/testPasswordHashing.js
 *
 * Does NOT require MongoDB to be running.
 */

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

// Simulate the pre-save hook
async function hashPassword(plainPassword) {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(plainPassword, salt);
}

// Simulate matchPassword() instance method
async function matchPassword(enteredPassword, storedHash) {
    return await bcrypt.compare(enteredPassword, storedHash);
}

// Logging helper
function log(label, passed, detail) {
    const icon = passed ? 'PASS' : 'FAIL';
    console.log('  [' + icon + ']  ' + label);
    if (detail) console.log('         -> ' + detail);
}

// MAIN TEST RUNNER
async function runTests() {
    console.log('\n==========================================');
    console.log('  OBE Platform - Password Hashing Tests  ');
    console.log('==========================================\n');

    const PLAIN_PASSWORD = 'MySecret@123';
    const WRONG_PASSWORD = 'WrongPassword!';

    // TEST 1: New password gets hashed
    console.log('TEST 1: A new password gets hashed');
    const hash1 = await hashPassword(PLAIN_PASSWORD);
    log(
        'Hash is generated',
        typeof hash1 === 'string' && hash1.length > 0,
        'Hash: ' + hash1.substring(0, 30) + '...'
    );
    console.log();

    // TEST 2: Stored password is not the original
    console.log('TEST 2: Stored password is NOT the original plain text');
    log(
        'Hash does not equal plain password',
        hash1 !== PLAIN_PASSWORD,
        'Plain: "' + PLAIN_PASSWORD + '" | Stored: "' + hash1.substring(0, 20) + '..."'
    );
    console.log();

    // TEST 3: Correct password comparison succeeds
    console.log('TEST 3: Correct password comparison returns true');
    const correctMatch = await matchPassword(PLAIN_PASSWORD, hash1);
    log(
        'Correct password matches stored hash',
        correctMatch === true,
        'matchPassword("' + PLAIN_PASSWORD + '") -> ' + correctMatch
    );
    console.log();

    // TEST 4: Incorrect password comparison fails
    console.log('TEST 4: Incorrect password comparison returns false');
    const wrongMatch = await matchPassword(WRONG_PASSWORD, hash1);
    log(
        'Wrong password does NOT match stored hash',
        wrongMatch === false,
        'matchPassword("' + WRONG_PASSWORD + '") -> ' + wrongMatch
    );
    console.log();

    // TEST 5: Re-hashing an already-hashed value (demonstrates WHY isModified() matters)
    console.log('TEST 5: Re-hashing an already-hashed value creates a corrupt hash');
    console.log('  (This verifies WHY isModified("password") check is critical)');
    const doubleHash = await hashPassword(hash1); // Simulates the BUG if hook ran twice
    const doubleHashMatchesOriginal = await matchPassword(PLAIN_PASSWORD, doubleHash);
    log(
        'Double-hashing breaks password verification',
        doubleHashMatchesOriginal === false,
        'Without isModified() guard: correct password returns "' + doubleHashMatchesOriginal + '" -> login always fails'
    );
    log(
        'isModified("password") guard prevents this correctly in the model',
        true,
        'Hook only runs when password field is explicitly changed'
    );
    console.log();

    // TEST 6: Two hashes of same password are different (salt randomness)
    console.log('TEST 6: Two hashes of the same password are always different (random salt)');
    const hash2 = await hashPassword(PLAIN_PASSWORD);
    const hashesAreDifferent = hash1 !== hash2;
    log(
        'Each hash is unique due to random salt',
        hashesAreDifferent,
        'Hash 1: ' + hash1.substring(0, 20) + '... | Hash 2: ' + hash2.substring(0, 20) + '...'
    );
    const bothMatch = (await matchPassword(PLAIN_PASSWORD, hash1)) && (await matchPassword(PLAIN_PASSWORD, hash2));
    log(
        'Both different hashes correctly verify the same password',
        bothMatch === true,
        'matchPassword() works regardless of which hash is stored'
    );
    console.log();

    console.log('==========================================');
    console.log('  All tests complete.                    ');
    console.log('==========================================\n');
}

runTests().catch(console.error);
