/**
 * Auth Input Validation Helpers
 * ─────────────────────────────
 * Pure functions — no external dependencies.
 * Each validator returns { valid: Boolean, message: String }.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const ALLOWED_ROLES = ['admin', 'coordinator', 'faculty'];

/**
 * Validate registration payload.
 * @param {Object} data - { name, email, password, role }
 * @returns {{ valid: Boolean, errors: String[] }}
 */

const validateRegisterInput = ({ name, email, password, role }) => {
    const errors = [];

    // name
    if (!name || String(name).trim().length === 0) {
        errors.push('Name is required.');
    }

    // email
    if (!email || String(email).trim().length === 0) {
        errors.push('Email is required.');
    } else if (!EMAIL_REGEX.test(String(email).trim())) {
        errors.push('Email is not a valid email address.');
    }

    // password
    if (!password || String(password).length === 0) {
        errors.push('Password is required.');
    } else if (String(password).length < MIN_PASSWORD_LENGTH) {
        errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
    }

    // role (optional — only validate if explicitly provided)
    if (role !== undefined && role !== null && role !== '') {
        if (!ALLOWED_ROLES.includes(String(role).toLowerCase())) {
            errors.push(`Invalid role. Allowed roles are: ${ALLOWED_ROLES.join(', ')}.`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

/**
 * Validate login payload.
 * @param {Object} data - { email, password }
 * @returns {{ valid: Boolean, errors: String[] }}
 */
const validateLoginInput = ({ email, password }) => {
    const errors = [];

    // email
    if (!email || String(email).trim().length === 0) {
        errors.push('Email is required.');
    } else if (!EMAIL_REGEX.test(String(email).trim())) {
        errors.push('Email is not a valid email address.');
    }

    // password
    if (!password || String(password).length === 0) {
        errors.push('Password is required.');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
};

module.exports = { validateRegisterInput, validateLoginInput };
