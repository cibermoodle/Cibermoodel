function requireAuth(req, res, next) {
	if (!req.session || !req.session.user) {
		return res.redirect('/login');
	}

	return next();
}

function requireRole(...roles) {
	return (req, res, next) => {
		const user = req.session && req.session.user;

		if (!user) {
			return res.redirect('/login');
		}

		if (!roles.includes(user.rol)) {
			return res.status(403).send('No autorizado');
		}

		return next();
	};
}

module.exports = {
	requireAuth,
	requireRole,
};
