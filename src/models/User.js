const db = require('../db/mysql');

exports.findByEmail = async function (email) {
	const [rows] = await db.query(
		'SELECT usuario_id AS id, nombre, apellidos AS apellido, email, password_hash, rol FROM usuario WHERE email = ? LIMIT 1',
		[email]
	);

	return rows[0] || null;
};

exports.findById = async function (usuarioId) {
	const [rows] = await db.query(
		'SELECT usuario_id AS id, nombre, apellidos AS apellido, email, rol FROM usuario WHERE usuario_id = ? LIMIT 1',
		[usuarioId]
	);

	return rows[0] || null;
};
