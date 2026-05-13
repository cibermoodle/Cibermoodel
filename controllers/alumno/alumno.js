const pool = require('../../src/db/mysql');

// GET /alumno - Dashboard del alumno
exports.dashboard = async (req, res) => {
    console.log('✅ Entrando al dashboard de alumno');
    try {
        const alumno_id = 1; // Cambiar por sesión real
        
        // Obtener las clases del alumno
        const [clases] = await pool.query(
            `SELECT c.*, p.usuario_id, u.nombre as profesor_nombre, u.apellidos as profesor_apellidos
             FROM clase_alumno ca
             JOIN clase c ON ca.clase_id = c.clase_id
             JOIN profesor p ON c.profesor_id = p.profesor_id
             JOIN usuario u ON p.usuario_id = u.usuario_id
             WHERE ca.alumno_id = ?
             ORDER BY ca.fecha_union DESC`,
            [alumno_id]
        );
        
        res.render('alumno/alumno', {
            clases,
            title: 'Mis clases',
            paginaActual: 'alumno'
        });
    } catch (err) {
        console.error('❌ ERROR en dashboard del alumno:', err.message);
        res.render('alumno/alumno', {
            clases: [],
            title: 'Mis clases',
            paginaActual: 'alumno'
        });
    }
};

// GET /alumno/examenes - Ver tests disponibles según fecha de inicio y fin
exports.verExamenes = async (req, res) => {
    try {
        const alumno_id = 1; // Cambiar por sesión real

        const [examenes] = await pool.query(
            `SELECT t.*, c.nombre as clase_nombre,
                    DATE_ADD(t.start_at, INTERVAL t.duracion_min MINUTE) as end_at
             FROM clase_alumno ca
             JOIN clase c ON ca.clase_id = c.clase_id
             JOIN clase_test ct ON c.clase_id = ct.clase_id
             JOIN test t ON ct.test_id = t.test_id
             WHERE ca.alumno_id = ?
               AND t.activo = 'activa'
               AND (t.start_at IS NULL OR t.start_at <= NOW())
               AND (t.start_at IS NULL OR DATE_ADD(t.start_at, INTERVAL t.duracion_min MINUTE) >= NOW())
             ORDER BY DATE_ADD(t.start_at, INTERVAL t.duracion_min MINUTE) ASC, t.start_at ASC`,
            [alumno_id]
        );

        res.render('alumno/examenes', {
            examenes,
            title: 'Exámenes disponibles',
            paginaActual: 'examenes'
        });
    } catch (err) {
        console.error('❌ ERROR en verExamenes:', err.message);
        res.render('alumno/examenes', {
            examenes: [],
            title: 'Exámenes disponibles',
            paginaActual: 'examenes'
        });
    }
};

// GET /alumno/examen/:id - Ver y realizar un test
exports.verExamen = async (req, res) => {
    try {
        const test_id = req.params.id;
        const alumno_id = 1; // Cambiar por sesión real

        // Verificar que el test está disponible para el alumno (en su clase y en fecha)
        const [tests] = await pool.query(
            `SELECT t.*, c.nombre as clase_nombre, u.nombre as profesor_nombre, u.apellidos as profesor_apellidos,
                    DATE_ADD(t.start_at, INTERVAL t.duracion_min MINUTE) as end_at
             FROM clase_alumno ca
             JOIN clase c ON ca.clase_id = c.clase_id
             JOIN clase_test ct ON c.clase_id = ct.clase_id
             JOIN test t ON ct.test_id = t.test_id
             JOIN profesor p ON t.profesor_id = p.profesor_id
             JOIN usuario u ON p.usuario_id = u.usuario_id
             WHERE ca.alumno_id = ?
               AND t.test_id = ?
               AND t.activo = 'activa'
               AND (t.start_at IS NULL OR t.start_at <= NOW())
               AND (t.start_at IS NULL OR DATE_ADD(t.start_at, INTERVAL t.duracion_min MINUTE) >= NOW())`,
            [alumno_id, test_id]
        );

        if (tests.length === 0) {
            return res.status(404).render('404', { title: 'Examen no disponible' });
        }

        // Obtener preguntas con sus opciones
        const [preguntas] = await pool.query(
            `SELECT * FROM pregunta WHERE test_id = ? ORDER BY orden ASC`,
            [test_id]
        );

        for (const preg of preguntas) {
            const [opciones] = await pool.query(
                `SELECT opcion_id, letra, texto FROM opcion WHERE pregunta_id = ? ORDER BY letra ASC`,
                [preg.pregunta_id]
            );
            preg.opciones = opciones;
        }

        const examen = tests[0];

        res.render('alumno/examen', {
            examen,
            preguntas,
            title: tests[0].titulo,
            paginaActual: 'examenes'
        });
    } catch (err) {
        console.error('❌ ERROR en verExamen:', err.message);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

// POST /alumno/examen/:id - Guardar respuestas del test
exports.enviarRespuestas = async (req, res) => {
    try {
        const test_id = req.params.id;
        const alumno_id = 1; // Cambiar por sesión real
        const respuestas = req.body; // { pregunta_X: opcion_id, ... }

        // Borrar respuestas previas del alumno para este test
        await pool.query(
            `DELETE FROM respuesta
             WHERE alumno_id = ?
               AND pregunta_id IN (SELECT pregunta_id FROM pregunta WHERE test_id = ?)`,
            [alumno_id, test_id]
        );

        // Guardar cada respuesta
        for (const [key, opcion_id] of Object.entries(respuestas)) {
            if (!key.startsWith('pregunta_')) continue;
            const pregunta_id = parseInt(key.replace('pregunta_', ''));
            if (!pregunta_id || !opcion_id) continue;

            await pool.query(
                `INSERT INTO respuesta (alumno_id, pregunta_id, opcion_id) VALUES (?, ?, ?)`,
                [alumno_id, pregunta_id, parseInt(opcion_id)]
            );
        }

        res.redirect(`/alumno/examenes`);
    } catch (err) {
        console.error('❌ ERROR en enviarRespuestas:', err.message);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

// GET /alumno/unirse - Mostrar formulario para unirse a una clase
exports.mostrarUnirse = (req, res) => {
    res.render('alumno/unirseClase', {
        error: null,
        success: null,
        title: 'Unirse a una clase',
        paginaActual: 'alumno'
    });
};

// POST /alumno/unirse - Unirse a una clase con código
exports.unirseClase = async (req, res) => {
    const { codigo_acceso } = req.body;
    const alumno_id = 1; // Cambiar por sesión real

    if (!codigo_acceso || codigo_acceso.trim() === '') {
        return res.render('alumno/unirseClase', {
            error: 'El código de acceso es obligatorio.',
            success: null,
            title: 'Unirse a una clase',
            paginaActual: 'alumno'
        });
    }

    try {
        // Verificar que la clase existe y está activa
        const [clases] = await pool.query(
            'SELECT * FROM clase WHERE codigo_acceso = ? AND activa = "activa"',
            [codigo_acceso.toUpperCase()]
        );

        if (clases.length === 0) {
            return res.render('alumno/unirseClase', {
                error: 'Código de acceso inválido o la clase no está activa.',
                success: null,
                title: 'Unirse a una clase',
                paginaActual: 'alumno'
            });
        }

        const clase_id = clases[0].clase_id;

        // Verificar si ya está registrado
        const [existente] = await pool.query(
            'SELECT * FROM clase_alumno WHERE clase_id = ? AND alumno_id = ?',
            [clase_id, alumno_id]
        );

        if (existente.length > 0) {
            return res.render('alumno/unirseClase', {
                error: 'Ya estás registrado en esta clase.',
                success: null,
                title: 'Unirse a una clase',
                paginaActual: 'alumno'
            });
        }

        // Registrar al alumno en la clase
        await pool.query(
            'INSERT INTO clase_alumno (clase_id, alumno_id) VALUES (?, ?)',
            [clase_id, alumno_id]
        );

        res.render('alumno/unirseClase', {
            error: null,
            success: `✅ ¡Te has registrado correctamente en la clase "${clases[0].nombre}"!`,
            title: 'Unirse a una clase',
            paginaActual: 'alumno'
        });
    } catch (err) {
        console.error('❌ ERROR al unirse a la clase:', err.message);
        res.render('alumno/unirseClase', {
            error: 'Error al procesar la solicitud. Intenta de nuevo.',
            success: null,
            title: 'Unirse a una clase',
            paginaActual: 'alumno'
        });
    }
};

// GET /alumno/clase/:id - Ver detalles de la clase y estudiantes registrados
exports.verDetalleClase = async (req, res) => {
    try {
        const clase_id = req.params.id;
        const alumno_id = 1; // Cambiar por sesión real

        // Obtener datos de la clase
        const [clase] = await pool.query(
            `SELECT c.*, p.usuario_id, u.nombre as profesor_nombre, u.apellidos as profesor_apellidos
             FROM clase c
             JOIN profesor p ON c.profesor_id = p.profesor_id
             JOIN usuario u ON p.usuario_id = u.usuario_id
             WHERE c.clase_id = ?`,
            [clase_id]
        );

        if (clase.length === 0) {
            return res.status(404).render('404', { title: 'Clase no encontrada' });
        }

        // Verificar que el alumno está registrado
        const [registro] = await pool.query(
            'SELECT * FROM clase_alumno WHERE clase_id = ? AND alumno_id = ?',
            [clase_id, alumno_id]
        );

        if (registro.length === 0) {
            return res.status(403).render('404', { title: 'No tienes acceso a esta clase' });
        }

        // Obtener lista de alumnos registrados
        const [alumnos] = await pool.query(
            `SELECT u.usuario_id, u.nombre, u.apellidos, u.email, ca.fecha_union
             FROM clase_alumno ca
             JOIN alumno a ON ca.alumno_id = a.alumno_id
             JOIN usuario u ON a.usuario_id = u.usuario_id
             WHERE ca.clase_id = ?
             ORDER BY ca.fecha_union ASC`,
            [clase_id]
        );

        res.render('alumno/detalleClase', {
            clase: clase[0],
            alumnos,
            title: clase[0].nombre,
            paginaActual: 'alumno'
        });
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};
