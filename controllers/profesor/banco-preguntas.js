const pool = require('../../src/db/mysql');

// GET /profesor/banco-preguntas - Ver todas las preguntas del banco
exports.verBanco = async (req, res) => {
    console.log('✅ Entrando a banco de preguntas');
    try {
        const profesor_id = 1; // Cambiar por sesión real
        
        const [preguntas] = await pool.query(
            `SELECT bp.*, 
                    COUNT(bpo.banco_opcion_id) as num_opciones,
                    COUNT(tbp.test_banco_id) as num_tests
             FROM banco_pregunta bp
             LEFT JOIN banco_pregunta_opcion bpo ON bp.banco_pregunta_id = bpo.banco_pregunta_id
             LEFT JOIN test_banco_pregunta tbp ON bp.banco_pregunta_id = tbp.banco_pregunta_id
             WHERE bp.profesor_id = ?
             GROUP BY bp.banco_pregunta_id
             ORDER BY bp.created_at DESC`,
            [profesor_id]
        );

        // Obtener categorías
        const [categorias] = await pool.query(
            `SELECT DISTINCT categoria FROM banco_pregunta 
             WHERE profesor_id = ? AND categoria IS NOT NULL
             ORDER BY categoria`,
            [profesor_id]
        );

        res.render('profesor/banco-preguntas', {
            preguntas,
            categorias,
            title: 'Banco de Preguntas',
            paginaActual: 'banco-preguntas'
        });
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        res.render('profesor/banco-preguntas', {
            preguntas: [],
            categorias: [],
            title: 'Banco de Preguntas',
            paginaActual: 'banco-preguntas'
        });
    }
};

// GET /profesor/banco-preguntas/crear - Mostrar formulario para crear pregunta
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
    const { enunciado, tipo_pregunta, categoria, dificultad, feedback, opciones } = req.body;
    const profesor_id = 1;

    try {
        if (!enunciado || enunciado.trim() === '') {
            return res.render('profesor/crear-pregunta', {
                pregunta: null,
                opciones: [],
                error: 'El enunciado es obligatorio.',
                success: null,
                title: 'Crear Pregunta',
                paginaActual: 'banco-preguntas'
            });
        }

        // Insertar pregunta
        const [result] = await pool.query(
            `INSERT INTO banco_pregunta (profesor_id, enunciado, tipo_pregunta, categoria, dificultad, feedback)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [profesor_id, enunciado, tipo_pregunta || 'opcion_multiple', categoria || null, dificultad || 'media', feedback || null]
        );

        const banco_pregunta_id = result.insertId;

        // Insertar opciones si existen
        if (opciones && Array.isArray(opciones)) {
            for (let i = 0; i < opciones.length; i++) {
                const opcion = opciones[i];
                if (opcion.texto && opcion.texto.trim() !== '') {
                    await pool.query(
                        `INSERT INTO banco_pregunta_opcion (banco_pregunta_id, texto, es_correcta, letra, orden)
                         VALUES (?, ?, ?, ?, ?)`,
                        [banco_pregunta_id, opcion.texto, opcion.es_correcta ? 1 : 0, String.fromCharCode(65 + i), i]
                    );
                }
            }
        }

        res.redirect('/profesor/banco-preguntas');
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        res.render('profesor/crear-pregunta', {
            pregunta: null,
            opciones: [],
            error: 'Error al crear la pregunta.',
            success: null,
            title: 'Crear Pregunta',
            paginaActual: 'banco-preguntas'
        });
    }
};

// GET /profesor/banco-preguntas/editar/:id - Mostrar formulario para editar
exports.mostrarEditar = async (req, res) => {
    try {
        const profesor_id = 1;
        const { id } = req.params;

        const [preguntas] = await pool.query(
            `SELECT * FROM banco_pregunta WHERE banco_pregunta_id = ? AND profesor_id = ?`,
            [id, profesor_id]
        );

        if (preguntas.length === 0) {
            return res.status(404).render('404', { title: 'No encontrada' });
        }

        const [opciones] = await pool.query(
            `SELECT * FROM banco_pregunta_opcion WHERE banco_pregunta_id = ? ORDER BY orden`,
            [id]
        );

        res.render('profesor/crear-pregunta', {
            pregunta: preguntas[0],
            opciones,
            error: null,
            success: null,
            title: 'Editar Pregunta',
            paginaActual: 'banco-preguntas'
        });
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        res.status(500).render('500', { title: 'Error' });
    }
};

// POST /profesor/banco-preguntas/editar/:id - Guardar cambios
exports.editarPregunta = async (req, res) => {
    const { id } = req.params;
    const { enunciado, tipo_pregunta, categoria, dificultad, feedback, opciones } = req.body;
    const profesor_id = 1;

    try {
        // Verificar que pertenece al profesor
        const [preguntas] = await pool.query(
            `SELECT * FROM banco_pregunta WHERE banco_pregunta_id = ? AND profesor_id = ?`,
            [id, profesor_id]
        );

        if (preguntas.length === 0) {
            return res.status(404).render('404', { title: 'No encontrada' });
        }

        // Actualizar pregunta
        await pool.query(
            `UPDATE banco_pregunta SET enunciado = ?, tipo_pregunta = ?, categoria = ?, dificultad = ?, feedback = ?
             WHERE banco_pregunta_id = ?`,
            [enunciado, tipo_pregunta, categoria || null, dificultad, feedback || null, id]
        );

        // Eliminar opciones antiguas
        await pool.query(
            `DELETE FROM banco_pregunta_opcion WHERE banco_pregunta_id = ?`,
            [id]
        );

        // Insertar nuevas opciones
        if (opciones && Array.isArray(opciones)) {
            for (let i = 0; i < opciones.length; i++) {
                const opcion = opciones[i];
                if (opcion.texto && opcion.texto.trim() !== '') {
                    await pool.query(
                        `INSERT INTO banco_pregunta_opcion (banco_pregunta_id, texto, es_correcta, letra, orden)
                         VALUES (?, ?, ?, ?, ?)`,
                        [id, opcion.texto, opcion.es_correcta ? 1 : 0, String.fromCharCode(65 + i), i]
                    );
                }
            }
        }

        res.redirect('/profesor/banco-preguntas');
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        res.status(500).render('500', { title: 'Error' });
    }
};

// POST /profesor/banco-preguntas/eliminar/:id - Eliminar pregunta
exports.eliminarPregunta = async (req, res) => {
    try {
        const profesor_id = 1;
        const { id } = req.params;

        // Verificar que pertenece al profesor
        const [preguntas] = await pool.query(
            `SELECT * FROM banco_pregunta WHERE banco_pregunta_id = ? AND profesor_id = ?`,
            [id, profesor_id]
        );

        if (preguntas.length === 0) {
            return res.status(404).json({ error: 'Pregunta no encontrada' });
        }

        // Eliminar pregunta (las opciones se eliminan en cascada)
        await pool.query(
            `DELETE FROM banco_pregunta WHERE banco_pregunta_id = ?`,
            [id]
        );

        res.redirect('/profesor/banco-preguntas');
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        res.status(500).json({ error: 'Error al eliminar' });
    }
};

// GET /profesor/banco-preguntas/buscar - Buscar/filtrar preguntas
exports.buscar = async (req, res) => {
    try {
        const profesor_id = 1;
        const { q, categoria, dificultad } = req.query;

        let query = `SELECT bp.*, 
                           COUNT(bpo.banco_opcion_id) as num_opciones,
                           COUNT(tbp.test_banco_id) as num_tests
                    FROM banco_pregunta bp
                    LEFT JOIN banco_pregunta_opcion bpo ON bp.banco_pregunta_id = bpo.banco_pregunta_id
                    LEFT JOIN test_banco_pregunta tbp ON bp.banco_pregunta_id = tbp.banco_pregunta_id
                    WHERE bp.profesor_id = ?`;
        
        const params = [profesor_id];

        if (q && q.trim() !== '') {
            query += ` AND bp.enunciado LIKE ?`;
            params.push(`%${q}%`);
        }

        if (categoria && categoria.trim() !== '') {
            query += ` AND bp.categoria = ?`;
            params.push(categoria);
        }

        if (dificultad && dificultad.trim() !== '') {
            query += ` AND bp.dificultad = ?`;
            params.push(dificultad);
        }

        query += ` GROUP BY bp.banco_pregunta_id ORDER BY bp.created_at DESC`;

        const [preguntas] = await pool.query(query, params);

        res.json(preguntas);
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        res.status(500).json({ error: 'Error en la búsqueda' });
    }
};
