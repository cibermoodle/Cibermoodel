const pool = require('../db/mysql');

async function findByEmail(email) {
	const [rows] = await pool.query(
		`
			SELECT
				usuario_id,
				nombre,
				apellidos,
				email,
				password_hash,
				rol
			FROM usuario
			WHERE email = ?
			LIMIT 1
		`,
		[email]
	);

	return rows[0] || null;
}

async function findById(usuarioId) {
	const [rows] = await pool.query(
		`
			SELECT
				usuario_id,
				nombre,
				apellidos,
				email,
				password_hash,
				rol
			FROM usuario
			WHERE usuario_id = ?
			LIMIT 1
		`,
		[usuarioId]
	);

	return rows[0] || null;
}

module.exports = {
	findByEmail,
	findById,
};
