// middleware/auth.js

function isLoggedIn(req, res, next) {
    if (req.session.user) return next();
    req.flash('error', 'Please login to continue');
    res.redirect('/login');
}

// Owner AND Admin can access owner/admin routes
function isOwner(req, res, next) {
    if (req.session.user && ['Owner','Admin'].includes(req.session.user.role)) return next();
    res.status(403).render('error', { title: 'Access Denied', message: 'Owner/Admin access required' });
}

function isAdmin(req, res, next) {
    if (req.session.user && ['Owner','Admin'].includes(req.session.user.role)) return next();
    res.status(403).render('error', { title: 'Access Denied', message: 'Admin access required' });
}

function isOperator(req, res, next) {
    if (req.session.user && req.session.user.role === 'Operator') return next();
    res.status(403).render('error', { title: 'Access Denied', message: 'Operator access required' });
}

module.exports = { isLoggedIn, isOwner, isAdmin, isOperator };
