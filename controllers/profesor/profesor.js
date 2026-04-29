// CORRECCIÓN: Usamos 'pool' consistentemente en todo el archivo
const pool = require('../../src/db/mysql');

// GET /profesor - Panel principal
exports.dashboard = async (req, res) => {
    try {
        const profesor_id = 1; // Cambiar por sesión real (req.session.user.id)
        const [clases] = await pool.query(
            'SELECT * FROM clase WHERE profesor_id = ? ORDER BY created_at DESC',
            [profesor_id]
        );
        res.render('profesor/profesor', { 
            clases,
            title: 'Panel Profesor',
            paginaActual: 'profesor'
        });
    } catch (err) {
        console.error('❌ ERROR en dashboard:', err.message);
        res.render('profesor/profesor', { 
            clases: [],
            title: 'Panel Profesor',
            paginaActual: 'profesor'
        });
    }
};

// GET /profesor/crearclase
exports.mostrarCrearClase = (req, res) => {
    res.render('profesor/crearClase', { 
        error: null, 
        success: null,
        title: 'Crear Clase',
        paginaActual: 'profesor'
    });
};

// POST /profesor/crearclase
exports.crearClase = async (req, res) => {
    const { nombre, descripcion } = req.body;
    const profesor_id = 1;

    if (!nombre) {
        return res.render('profesor/crearClase', {
            error: 'El nombre de la clase es obligatorio.',
            success: null,
            title: 'Crear Clase',
            paginaActual: 'profesor'
        });
    }

    const codigo_acceso = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
        await pool.query(
            `INSERT INTO clase (profesor_id, nombre, descripcion, codigo_acceso, activa) 
             VALUES (?, ?, ?, ?, 'activa')`,
            [profesor_id, nombre, descripcion || null, codigo_acceso]
        );
        res.redirect('/profesor');
    } catch (err) {
        res.render('profesor/crearClase', {
            error: 'Error al crear la clase.',
            success: null,
            title: 'Crear Clase',
            paginaActual: 'profesor'
        });
    }
};

// GET /profesor/editarclase/:id
exports.mostrarEditarClase = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clase WHERE clase_id = ?', [req.params.id]);
        if (rows.length === 0) return res.redirect('/profesor');

        res.render('profesor/editarClase', {
            clase: rows[0],
            error: null,
            success: null,
            title: 'Editar Clase',
            paginaActual: 'profesor'
        });
    } catch (err) {
        res.redirect('/profesor');
    }
};

// POST /profesor/editarclase/:id
exports.editarClase = async (req, res) => {
    const { nombre, descripcion, activa, nuevo_codigo } = req.body;
    const clase_id = req.params.id;

    try {
        const estadoActiva = activa === '1' ? 'activa' : 'inactiva';
        let query = `UPDATE clase SET nombre=?, descripcion=?, activa=?`;
        let params = [nombre, descripcion || null, estadoActiva];

        if (nuevo_codigo === 'si') {
            const codigo_acceso = Math.random().toString(36).substring(2, 8).toUpperCase();
            query += `, codigo_acceso=?`;
            params.push(codigo_acceso);
        }

        query += ` WHERE clase_id=?`;
        params.push(clase_id);

        await pool.query(query, params);

        const [rows] = await pool.query('SELECT * FROM clase WHERE clase_id = ?', [clase_id]);
        res.render('profesor/editarClase', {
            clase: rows[0],
            error: null,
            success: '✅ Clase actualizada correctamente.',
            title: 'Editar Clase',
            paginaActual: 'profesor'
        });
    } catch (err) {
        const [rows] = await pool.query('SELECT * FROM clase WHERE clase_id = ?', [clase_id]);
        res.render('profesor/editarClase', {
            clase: rows[0],
            error: '❌ Error al actualizar la clase.',
            success: null,
            title: 'Editar Clase',
            paginaActual: 'profesor'
        });
    }
};

// POST /profesor/eliminarclase/:id
exports.eliminarClase = async (req, res) => {
    try {
        await pool.query('DELETE FROM clase WHERE clase_id = ?', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false });
    }
};

// =========================================================================
// GESTIÓN DE ALUMNOS Y EXÁMENES DENTRO DE LA CLASE
// =========================================================================

// GET /profesor/registrados/:id - Ver alumnos y exámenes de una clase
exports.verAlumnosClase = async (req, res) => {
    try {
        const clase_id = req.params.id;
        const profesor_id = 1; 
        
        const [clase] = await pool.query(
            'SELECT * FROM clase WHERE clase_id = ? AND profesor_id = ?',
            [clase_id, profesor_id]
        );
        
        if (clase.length === 0) {
            return res.status(403).render('404', { title: 'No autorizado' });
        }
        
        const [alumnos] = await pool.query(
            `SELECT u.usuario_id, u.nombre, u.apellidos, u.email, ca.fecha_union
             FROM clase_alumno ca
             JOIN alumno a ON ca.alumno_id = a.alumno_id
             JOIN usuario u ON a.usuario_id = u.usuario_id
             WHERE ca.clase_id = ?
             ORDER BY ca.fecha_union DESC`,
            [clase_id]
        );

        const [examenes] = await pool.query(
            `SELECT t.* FROM test t
             JOIN clase_test ct ON t.test_id = ct.test_id
             WHERE ct.clase_id = ?`, 
            [clase_id]
        );
        
        res.render('profesor/alumnosClase', {
            clase: clase[0],
            alumnos: alumnos,
            examenes: examenes,
            title: 'Alumnos de ' + clase[0].nombre,
            paginaActual: 'profesor'
        });

    } catch (err) {
        console.error('❌ ERROR en verAlumnosClase:', err.message);
        res.status(500).render('profesor/alumnosClase', {
            clase: {},
            alumnos: [],
            examenes: [], 
            title: 'Error',
            paginaActual: 'profesor'
        });
    }
};

// POST /profesor/clase/asignar-test
exports.asignarTestAClase = async (req, res) => {
    const { clase_id, test_id } = req.body;
    
    if (!clase_id || !test_id) {
        return res.status(400).json({ ok: false, error: 'Faltan datos obligatorios' });
    }

    try {
        await pool.query(
            'INSERT INTO clase_test (clase_id, test_id) VALUES (?, ?)',
            [clase_id, test_id]
        );
        res.json({ ok: true });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ ok: false, error: 'Este test ya está asignado a esta clase' });
        }
        res.status(500).json({ ok: false, error: 'Error interno en la base de datos' });
    }
};

// CORREGIDO: Cambiado 'db.query' por 'pool.query'
exports.desvincularTestDeClase = async (req, res) => {
    const { clase_id, test_id } = req.body;

    try {
        // Antes decía "db.query", lo cual causaba el ReferenceError
        await pool.query('DELETE FROM clase_test WHERE clase_id = ? AND test_id = ?', [clase_id, test_id]);
        
        res.json({ ok: true });
    } catch (error) {
        console.error("❌ Error en desvincularTestDeClase:", error);
        res.status(500).json({ ok: false, error: 'Error al eliminar la relación en la base de datos' });
    }
};