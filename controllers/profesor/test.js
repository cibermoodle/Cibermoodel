const pool = require('../../src/db/mysql');

// GET /profesor/tests - Ver todos los tests del profesor
exports.verTests = async (req, res) => {
    console.log('✅ Entrando a lista de tests');
    try {
        const profesor_id = 1; // Cambiar por sesión real
        
        const [tests] = await pool.query(
            `SELECT t.*, 
                    COUNT(p.pregunta_id) as num_preguntas
             FROM test t
             LEFT JOIN pregunta p ON t.test_id = p.test_id
             WHERE t.profesor_id = ?
             GROUP BY t.test_id
             ORDER BY t.created_at DESC`,
            [profesor_id]
        );

        res.render('profesor/tests', {
            tests,
            title: 'Mis Tests',
            paginaActual: 'tests'
        });
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        res.render('profesor/tests', {
            tests: [],
            title: 'Mis Tests',
            paginaActual: 'tests'
        });
    }
};

// GET /profesor/tests/crear - Mostrar formulario para crear test
exports.mostrarCrearTest = async (req, res) => {
    try {
        res.render('profesor/crear-test', {
            test: null,
            preguntas: [],
            error: null,
            success: null,
            title: 'Crear Test',
            paginaActual: 'tests'
        });
    } catch (err) {
        console.error(err);
        res.render('profesor/crear-test', {
            test: null,
            preguntas: [],
            error: 'Error al cargar el formulario',
            success: null,
            title: 'Crear Test',
            paginaActual: 'tests'
        });
    }
};

// POST /profesor/tests/crear - Guardar nuevo test
exports.crearTest = async (req, res) => {
    const { titulo, descripcion, duracion_min, start_at, preguntas_id } = req.body;
    const profesor_id = 1; // Cambiar por sesión real

    try {
        if (!titulo || titulo.trim() === '') {
            return res.render('profesor/crear-test', {
                test: null,
                preguntas: [],
                error: 'El título del test es obligatorio.',
                success: null,
                title: 'Crear Test',
                paginaActual: 'tests'
            });
        }

        const duracion = parseInt(duracion_min) || 60;
        const fecha_inicio = start_at || null;
        const activo = fecha_inicio ? 'inactiva' : 'activa';

        // Insertar test
        const [result] = await pool.query(
            `INSERT INTO test (profesor_id, titulo, descripcion, duracion_min, activo, start_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [profesor_id, titulo, descripcion || null, duracion, activo, fecha_inicio]
        );

        // Si se seleccionaron preguntas existentes, vincularlas
        if (preguntas_id && Array.isArray(preguntas_id)) {
            for (const pregunta_id of preguntas_id) {
                await pool.query(
                    `UPDATE pregunta SET test_id = ? WHERE pregunta_id = ?`,
                    [result.insertId, parseInt(pregunta_id)]
                );
            }
        }

        res.redirect('/profesor/tests');
    } catch (err) {
        console.error(err);
        res.render('profesor/crear-test', {
            test: null,
            preguntas: [],
            error: 'Error al crear el test.',
            success: null,
            title: 'Crear Test',
            paginaActual: 'tests'
        });
    }
};

// GET /profesor/tests/editar/:id - Mostrar formulario para editar test
exports.mostrarEditarTest = async (req, res) => {
    try {
        const test_id = req.params.id;
        const profesor_id = 1; // Cambiar por sesión real

        const [tests] = await pool.query(
            'SELECT * FROM test WHERE test_id = ? AND profesor_id = ?',
            [test_id, profesor_id]
        );

        if (tests.length === 0) {
            return res.redirect('/profesor/tests');
        }

        const [preguntas] = await pool.query(
            'SELECT * FROM pregunta WHERE test_id = ? ORDER BY orden ASC',
            [test_id]
        );

        res.render('profesor/editar-test', {
            test: tests[0],
            preguntas,
            error: null,
            success: null,
            title: 'Editar Test',
            paginaActual: 'tests'
        });
    } catch (err) {
        console.error(err);
        res.redirect('/profesor/tests');
    }
};

// POST /profesor/tests/editar/:id - Guardar cambios del test
exports.editarTest = async (req, res) => {
    const { titulo, descripcion, duracion_min, start_at, activo } = req.body;
    const test_id = req.params.id;
    const profesor_id = 1; // Cambiar por sesión real

    try {
        const duracion = parseInt(duracion_min) || 60;
        const fecha_inicio = start_at || null;
        const estado = activo || 'activa';

        await pool.query(
            `UPDATE test SET titulo=?, descripcion=?, duracion_min=?, start_at=?, activo=? WHERE test_id=? AND profesor_id=?`,
            [titulo, descripcion || null, duracion, fecha_inicio, estado, test_id, profesor_id]
        );

        const [tests] = await pool.query(
            'SELECT * FROM test WHERE test_id = ?',
            [test_id]
        );

        const [preguntas] = await pool.query(
            'SELECT * FROM pregunta WHERE test_id = ? ORDER BY orden ASC',
            [test_id]
        );

        res.render('profesor/editar-test', {
            test: tests[0],
            preguntas,
            error: null,
            success: '✅ Test actualizado correctamente.',
            title: 'Editar Test',
            paginaActual: 'tests'
        });
    } catch (err) {
        console.error(err);
        const [tests] = await pool.query('SELECT * FROM test WHERE test_id = ?', [test_id]);
        const [preguntas] = await pool.query('SELECT * FROM pregunta WHERE test_id = ?', [test_id]);
        
        res.render('profesor/editar-test', {
            test: tests[0],
            preguntas,
            error: '❌ Error al actualizar el test.',
            success: null,
            title: 'Editar Test',
            paginaActual: 'tests'
        });
    }
};

// POST /profesor/tests/eliminar/:id - Eliminar test
exports.eliminarTest = async (req, res) => {
    try {
        const test_id = req.params.id;
        const profesor_id = 1; // Cambiar por sesión real

        // Verificar que el test pertenece al profesor
        const [tests] = await pool.query(
            'SELECT * FROM test WHERE test_id = ? AND profesor_id = ?',
            [test_id, profesor_id]
        );

        if (tests.length === 0) {
            return res.status(403).json({ ok: false, error: 'No autorizado' });
        }

        // Eliminar respuestas primero (por integridad referencial)
        await pool.query(
            `DELETE FROM respuesta WHERE pregunta_id IN (SELECT pregunta_id FROM pregunta WHERE test_id = ?)`,
            [test_id]
        );

        // Eliminar opciones
        await pool.query(
            `DELETE FROM opcion WHERE pregunta_id IN (SELECT pregunta_id FROM pregunta WHERE test_id = ?)`,
            [test_id]
        );

        // Eliminar preguntas
        await pool.query(
            `DELETE FROM pregunta WHERE test_id = ?`,
            [test_id]
        );

        // Eliminar test
        await pool.query('DELETE FROM test WHERE test_id = ?', [test_id]);

        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err.message });
    }
};

// GET /profesor/tests/ver/:id - Ver detalles del test con preguntas
exports.verTest = async (req, res) => {
    try {
        const test_id = req.params.id;
        const profesor_id = 1; // Cambiar por sesión real

        const [tests] = await pool.query(
            'SELECT * FROM test WHERE test_id = ? AND profesor_id = ?',
            [test_id, profesor_id]
        );

        if (tests.length === 0) {
            return res.status(404).render('404', { title: 'Test no encontrado' });
        }

        const [preguntas] = await pool.query(
            `SELECT p.*, COUNT(o.opcion_id) as num_opciones
             FROM pregunta p
             LEFT JOIN opcion o ON p.pregunta_id = o.pregunta_id
             WHERE p.test_id = ?
             GROUP BY p.pregunta_id
             ORDER BY p.orden ASC`,
            [test_id]
        );

        res.render('profesor/ver-test', {
            test: tests[0],
            preguntas,
            title: tests[0].titulo,
            paginaActual: 'tests'
        });
    } catch (err) {
        console.error(err);
        res.status(500).render('500', { title: 'Error del servidor' });
    }
};

// NUEVA FUNCIÓN: Devuelve tests en formato JSON para el SweetAlert
exports.obtenerTests = async (req, res) => {
    try {
        const profesor_id = 1;
        const [tests] = await pool.query(
            'SELECT test_id, titulo FROM test WHERE profesor_id = ?',
            [profesor_id]
        );
        res.json(tests);
    } catch (error) {
        console.error(error);
        res.status(500).json([]);
    }
};