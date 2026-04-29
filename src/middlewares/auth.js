exports.requireAuth = (req, res, next) => {
	if (!req.session || !req.session.user) {
		return res.redirect('/login');
	}

	return next();
};

exports.requireRole = (...roles) => {
	return (req, res, next) => {
		if (!req.session || !req.session.user) {
			return res.redirect('/login');
		}

		if (!roles.includes(req.session.user.rol)) {
			return res.status(403).send('No tienes permisos para acceder a esta pagina.');
		}

		return next();
	};
};

exports.requireGuest = (req, res, next) => {
	if (req.session && req.session.user) {
		return res.redirect('/');
	}

	return next();
};
