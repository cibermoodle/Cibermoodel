const pool = require('./mysql');

async function seedData() {
    try {
        console.log('🌱 Iniciando población de datos de prueba...');

        // 1. Verificar si la clase existe
        const [clases] = await pool.query('SELECT * FROM clase LIMIT 1');
        
        if (clases.length === 0) {
            console.log('❌ No hay clases en la base de datos. Crea una primero.');
            process.exit(1);
        }

        const clase_id = clases[0].clase_id;
        console.log(`✅ Usando clase existente: ${clases[0].nombre} (ID: ${clase_id})`);

        // 2. Crear usuarios de prueba
        const usuariosTest = [
            { nombre: 'Juan', apellidos: 'Pérez García', email: `juan${Date.now()}@test.com`, password_hash: 'hash123', rol: 'alumno' },
            { nombre: 'María', apellidos: 'López Rodríguez', email: `maria${Date.now()}@test.com`, password_hash: 'hash123', rol: 'alumno' },
            { nombre: 'Carlos', apellidos: 'Martínez Ruiz', email: `carlos${Date.now()}@test.com`, password_hash: 'hash123', rol: 'alumno' },
            { nombre: 'Elena', apellidos: 'Sánchez Torres', email: `elena${Date.now()}@test.com`, password_hash: 'hash123', rol: 'alumno' },
            { nombre: 'David', apellidos: 'Hernández López', email: `david${Date.now()}@test.com`, password_hash: 'hash123', rol: 'alumno' }
        ];

        const usuariosCreados = [];

        for (const usuario of usuariosTest) {
            // Verificar si el email ya existe
            const [existe] = await pool.query('SELECT * FROM usuario WHERE email = ?', [usuario.email]);
            
            if (existe.length === 0) {
                const [result] = await pool.query(
                    'INSERT INTO usuario (nombre, apellidos, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
                    [usuario.nombre, usuario.apellidos, usuario.email, usuario.password_hash, usuario.rol]
                );
                usuariosCreados.push(result.insertId);
                console.log(`✅ Usuario creado: ${usuario.nombre} ${usuario.apellidos}`);
            } else {
                console.log(`⏭️ Usuario ya existe: ${usuario.email}`);
                usuariosCreados.push(existe[0].usuario_id);
            }
        }

        // 3. Crear alumnos vinculados a usuarios
        const alumnosCreados = [];
        for (const usuario_id of usuariosCreados) {
            const [existe] = await pool.query('SELECT * FROM alumno WHERE usuario_id = ?', [usuario_id]);
            
            if (existe.length === 0) {
                const [result] = await pool.query(
                    'INSERT INTO alumno (usuario_id, fecha_nacimiento) VALUES (?, ?)',
                    [usuario_id, '2005-01-15']
                );
                alumnosCreados.push(result.insertId);
            } else {
                alumnosCreados.push(existe[0].alumno_id);
            }
        }

        console.log(`✅ Alumnos creados: ${alumnosCreados.length}`);

        // 4. Registrar alumnos en la clase
        for (const alumno_id of alumnosCreados) {
            const [existe] = await pool.query(
                'SELECT * FROM clase_alumno WHERE clase_id = ? AND alumno_id = ?',
                [clase_id, alumno_id]
            );
            
            if (existe.length === 0) {
                await pool.query(
                    'INSERT INTO clase_alumno (clase_id, alumno_id) VALUES (?, ?)',
                    [clase_id, alumno_id]
                );
                console.log(`✅ Alumno registrado en la clase (ID: ${alumno_id})`);
            } else {
                console.log(`⏭️ Alumno ya estaba registrado (ID: ${alumno_id})`);
            }
        }

        console.log('\n✅ ¡Datos de prueba agregados exitosamente!');
        console.log(`📝 Ahora puedes acceder a: http://localhost:3000/profesor/registrados/${clase_id}`);
        
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

seedData();
