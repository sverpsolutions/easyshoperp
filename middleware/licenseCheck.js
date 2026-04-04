// middleware/licenseCheck.js
// Runs on every request — blocks app if no valid license
const { loadLicense } = require('../utils/license');

const BYPASS_PATHS = [
    '/register',
    '/css/',
    '/js/',
    '/img/',
    '/uploads/',
    '/favicon.ico'
];

module.exports = function licenseCheck(req, res, next) {
    // Allow static assets and registration page through
    if (BYPASS_PATHS.some(p => req.path.startsWith(p))) return next();

    const license = loadLicense();

    // Active license → continue normally, attach to res.locals
    if (license.status === 'active') {
        res.locals.license = license;
        // Warn if expiring soon (within 14 days)
        if (license.daysLeft <= 14) {
            res.locals.licenseWarning = `⚠️ License expires in ${license.daysLeft} day(s)! Contact your vendor to renew.`;
        }
        return next();
    }

    // Not registered or invalid → send to registration page
    if (license.status === 'unregistered' || license.status === 'tampered' || license.status === 'invalid') {
        if (req.path === '/register' || req.path.startsWith('/register')) return next();
        return res.redirect('/register');
    }

    // Expired → show expired page (not redirect — show info about who to contact)
    if (license.status === 'expired') {
        if (req.path === '/register' || req.path.startsWith('/register')) return next();
        return res.render('license/expired', {
            title: 'License Expired',
            license,
            machineId: require('../utils/license').getMachineId()
        });
    }

    // Fallback
    return res.redirect('/register');
};
