const pool = require('../../src/db/mysql');

// GET /profesor
exports.dashboard = async (req, res) => {
    console.log('✅ Entrando al dashboard de profesor');
    try {
        const profesor_id = 1;
        console.log('🔍 Consultando clases...');
        const [clases] = await pool.query(
            'SELECT * FROM clase WHERE profesor_id = ? ORDER BY created_at DESC',
            [profesor_id]
        );
        console.log('📚 Clases encontradas:', clases.length);
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
             VALUES (?, ?, ?, ?, 1)`,
            [profesor_id, nombre, descripcion || null, codigo_acceso]
        );
        res.redirect('/profesor');
    } catch (err) {
        console.error(err);
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
        const [rows] = await pool.query(
            'SELECT * FROM clase WHERE clase_id = ?',
            [req.params.id]
        );
        if (rows.length === 0) return res.redirect('/profesor');

        res.render('profesor/editarClase', {
            clase: rows[0],
            error: null,
            success: null,
            title: 'Editar Clase',
            paginaActual: 'profesor'
        });
    } catch (err) {
        console.error(err);
        res.redirect('/profesor');
    }
};

// POST /profesor/editarclase/:id
exports.editarClase = async (req, res) => {
    const { nombre, descripcion, activa, nuevo_codigo } = req.body;
    const clase_id = req.params.id;

    try {
        const estadoActiva = activa === '1' ? 'activa' : 'inactiva';

        let codigo_acceso = null;
        if (nuevo_codigo === 'si') {
            codigo_acceso = Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        if (codigo_acceso) {
            await pool.query(
                `UPDATE clase SET nombre=?, descripcion=?, activa=?, codigo_acceso=? WHERE clase_id=?`,
                [nombre, descripcion || null, estadoActiva, codigo_acceso, clase_id]
            );
        } else {
            await pool.query(
                `UPDATE clase SET nombre=?, descripcion=?, activa=? WHERE clase_id=?`,
                [nombre, descripcion || null, estadoActiva, clase_id]
            );
        }

        const [rows] = await pool.query('SELECT * FROM clase WHERE clase_id = ?', [clase_id]);
        res.render('profesor/editarClase', {
            clase: rows[0],
            error: null,
            success: '✅ Clase actualizada correctamente.',
            title: 'Editar Clase',
            paginaActual: 'profesor'
        });
    } catch (err) {
        console.error(err);
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

// POST /profesor/eliminarclase/:id  ← CAMBIADO a res.json
exports.eliminarClase = async (req, res) => {
    try {
        await pool.query('DELETE FROM clase WHERE clase_id = ?', [req.params.id]);
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false });
    }
};

// GET /profesor/registrados/:id - Ver alumnos registrados en una clase
exports.verAlumnosClase = async (req, res) => {
    try {
        const clase_id = req.params.id;
        const profesor_id = 1; // Cambiar por sesión real
        
        // Verificar que la clase pertenece al profesor
        const [claseCheck] = await pool.query(
            'SELECT * FROM clase WHERE clase_id = ? AND profesor_id = ?',
            [clase_id, profesor_id]
        );
        
        if (claseCheck.length === 0) {
            return res.status(403).render('404', { title: 'No autorizado' });
        }
        
        // Obtener la clase
        const [clase] = await pool.query(
            'SELECT * FROM clase WHERE clase_id = ?',
            [clase_id]
        );
        
        // Obtener alumnos registrados
        const [alumnos] = await pool.query(
            `SELECT u.usuario_id, u.nombre, u.apellidos, u.email, ca.fecha_union
             FROM clase_alumno ca
             JOIN alumno a ON ca.alumno_id = a.alumno_id
             JOIN usuario u ON a.usuario_id = u.usuario_id
             WHERE ca.clase_id = ?
             ORDER BY ca.fecha_union DESC`,
            [clase_id]
        );
        
        res.render('profesor/alumnosClase', {
            clase: clase[0],
            alumnos,
            title: 'Alumnos de ' + clase[0].nombre,
            paginaActual: 'profesor'
        });
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};