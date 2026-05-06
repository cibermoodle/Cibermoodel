const pool = require('../../src/db/mysql'); // Rectificada la ruta según tu estructura

// GET /profesor/banco-preguntas - Ver todas las preguntas del banco (reutilizables)
exports.verBanco = async (req, res) => {
    console.log('✅ Entrando a banco de preguntas');
    try {
        // Obtener todas las preguntas sin test asignado (preguntas reutilizables)
        // Usamos COUNT(DISTINCT ...) para evitar duplicados en el conteo por los JOINs
        const [preguntas] = await pool.query(
            `SELECT p.pregunta_id, p.enunciado, p.feedback, p.orden,
                    COUNT(DISTINCT o.opcion_id) as num_opciones,
                    COUNT(DISTINCT r.respuesta_id) as num_respuestas
             FROM pregunta p
             LEFT JOIN opcion o ON p.pregunta_id = o.pregunta_id
             LEFT JOIN respuesta r ON p.pregunta_id = r.pregunta_id
             WHERE p.test_id IS NULL
             GROUP BY p.pregunta_id
             ORDER BY p.pregunta_id DESC`
        );

        res.render('profesor/banco-preguntas', {
            preguntas,
            title: 'Banco de Preguntas Reutilizable',
            paginaActual: 'banco-preguntas'
        });
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        res.render('profesor/banco-preguntas', {
            preguntas: [],
            title: 'Banco de Preguntas Reutilizable',
            paginaActual: 'banco-preguntas'
        });
    }
};

// GET /profesor/banco-preguntas/crear - Mostrar formulario
exports.mostrarCrear = (req, res) => {
    res.render('profesor/crear-pregunta', {
        pregunta: null,
        opciones: [],
        error: null,
        success: null,
        title: 'Crear Pregunta',
        paginaActual: 'banco-preguntas'
    });
};

// POST /profesor/banco-preguntas/crear - Guardar nueva pregunta
exports.crearPregunta = async (req, res) => {
    const { enunciado, feedback, opciones_json } = req.body;

    try {
        if (!enunciado || enunciado.trim() === '') {
            throw new Error('El enunciado es obligatorio.');
        }

        // Insertar pregunta con test_id NULL explícito
        const [result] = await pool.query(
            `INSERT INTO pregunta (test_id, enunciado, feedback, orden)
             VALUES (NULL, ?, ?, 0)`,
            [enunciado, feedback || null]
        );

        const pregunta_id = result.insertId;

        if (opciones_json) {
            const opciones = JSON.parse(opciones_json);
            for (let i = 0; i < opciones.length; i++) {
                const opcion = opciones[i];
                if (opcion.texto && opcion.texto.trim() !== '') {
                    await pool.query(
                        `INSERT INTO opcion (pregunta_id, texto, es_correcta, letra)
                         VALUES (?, ?, ?, ?)`,
                        [pregunta_id, opcion.texto, opcion.es_correcta ? 1 : 0, String.fromCharCode(65 + i)]
                    );
                }
            }
        }

        res.redirect('/profesor/banco-preguntas');
    } catch (err) {
        console.error('Error al crear:', err);
        res.render('profesor/crear-pregunta', {
            pregunta: null,
            opciones: [],
            error: err.message,
            success: null,
            title: 'Crear Pregunta',
            paginaActual: 'banco-preguntas'
        });
    }
};

// GET /profesor/banco-preguntas/editar/:id
exports.mostrarEditar = async (req, res) => {
    try {
        const [preguntas] = await pool.query('SELECT * FROM pregunta WHERE pregunta_id = ?', [req.params.id]);
        if (preguntas.length === 0) return res.redirect('/profesor/banco-preguntas');

        const [opciones] = await pool.query('SELECT * FROM opcion WHERE pregunta_id = ? ORDER BY letra ASC', [req.params.id]);

        res.render('profesor/crear-pregunta', {
            pregunta: preguntas[0],
            opciones,
            error: null,
            success: null,
            title: 'Editar Pregunta',
            paginaActual: 'banco-preguntas'
        });
    } catch (err) {
        res.redirect('/profesor/banco-preguntas');
    }
};

// POST /profesor/banco-preguntas/editar/:id
exports.editarPregunta = async (req, res) => {
    const { enunciado, feedback, opciones_json } = req.body;
    const pregunta_id = req.params.id;

    try {
        await pool.query('UPDATE pregunta SET enunciado=?, feedback=? WHERE pregunta_id=?', [enunciado, feedback || null, pregunta_id]);
        await pool.query('DELETE FROM opcion WHERE pregunta_id = ?', [pregunta_id]);

        if (opciones_json) {
            const opciones = JSON.parse(opciones_json);
            for (let i = 0; i < opciones.length; i++) {
                if (opciones[i].texto) {
                    await pool.query(
                        'INSERT INTO opcion (pregunta_id, texto, es_correcta, letra) VALUES (?, ?, ?, ?)',
                        [pregunta_id, opciones[i].texto, opciones[i].es_correcta ? 1 : 0, String.fromCharCode(65 + i)]
                    );
                }
            }
        }
        res.redirect('/profesor/banco-preguntas');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error al actualizar");
    }
};

// POST /profesor/banco-preguntas/eliminar/:id
exports.eliminarPregunta = async (req, res) => {
    try {
        const id = req.params.id;
        await pool.query('DELETE FROM respuesta WHERE pregunta_id = ?', [id]);
        await pool.query('DELETE FROM opcion WHERE pregunta_id = ?', [id]);
        await pool.query('DELETE FROM pregunta WHERE pregunta_id = ?', [id]);
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ ok: false });
    }
};

// GET /profesor/banco-preguntas/buscar - Para el modal de selección
exports.buscar = async (req, res) => {
    try {
        const { q } = req.query;
        let sql = "SELECT * FROM pregunta WHERE test_id IS NULL";
        let params = [];

        if (q) {
            sql += " AND enunciado LIKE ?";
            params.push(`%${q}%`);
        }

        const [preguntas] = await pool.query(sql, params);
        res.json(preguntas);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// NUEVA FUNCIÓN RECTIFICADA: Vincular/Clonar del banco al test
exports.vincularPreguntas = async (req, res) => {
    const { test_id, pregunta_ids } = req.body;

    try {
        if (!test_id || !pregunta_ids) throw new Error("Datos insuficientes");

        for (let id of pregunta_ids) {
            // 1. Obtener la pregunta original
            const [pregRows] = await pool.query('SELECT * FROM pregunta WHERE pregunta_id = ?', [id]);
            const p = pregRows[0];

            // 2. Crear la copia con el test_id correspondiente
            const [insResult] = await pool.query(
                'INSERT INTO pregunta (test_id, enunciado, feedback, orden) VALUES (?, ?, ?, ?)',
                [test_id, p.enunciado, p.feedback, p.orden]
            );

            const nuevaPreguntaId = insResult.insertId;

            // 3. Clonar las opciones asociadas
            const [optRows] = await pool.query('SELECT * FROM opcion WHERE pregunta_id = ?', [id]);
            for (let opt of optRows) {
                await pool.query(
                    'INSERT INTO opcion (pregunta_id, texto, es_correcta, letra) VALUES (?, ?, ?, ?)',
                    [nuevaPreguntaId, opt.texto, opt.es_correcta, opt.letra]
                );
            }
        }
        res.json({ ok: true });
    } catch (error) {
        console.error("❌ Error en vincularPreguntas:", error);
        res.status(500).json({ ok: false, error: error.message });
    }
};