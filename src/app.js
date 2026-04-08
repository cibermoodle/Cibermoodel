const express = require('express');
const path = require('path');
const expressEjsLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const app = express();

// Configuración del motor de vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.set('layout', 'layouts/main');

// Middlewares
app.use(expressEjsLayouts);
app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ✅ Variables globales para todas las vistas (header, navbar, etc.)
app.use((req, res, next) => {
  res.locals.user = { nombre: 'Ana', apellido: 'García', rol: 'alumno', avatar: null };
  res.locals.notificaciones = [
    { id: 1, texto: 'Nueva tarea disponible', leida: false, fecha: 'Hace 5 min' },
    { id: 2, texto: 'Tu proyecto fue revisado', leida: true, fecha: 'Ayer' }
  ];
  res.locals.centro = 'I.E.S. Mar de Cádiz';
  res.locals.paginaActual = '';
  next();
});

// ✅ Rutas profesor (todo por /profesor)
const profesorRoutes = require('../routes/profesor/profesorroute');
app.use('/profesor', profesorRoutes);

// ✅ Rutas alumno (todo por /alumno)
const alumnoRoutes = require('../routes/alumno/alumnoroute');
app.use('/alumno', alumnoRoutes);

// ✅ Rutas de navegación principal del alumno
app.get('/cursos', async (req, res) => {
    const pool = require('./db/mysql');
    const profesor_id = 1;
    try {
        const [clases] = await pool.query(
            'SELECT * FROM clase WHERE profesor_id = ? ORDER BY created_at DESC',
            [profesor_id]
        );
        res.render('profesor/profesor', { 
            clases,
            title: 'Mis cursos',
            paginaActual: 'cursos'
        });
    } catch (err) {
        console.error('❌ ERROR:', err.message);
        res.render('profesor/profesor', { 
            clases: [],
            title: 'Mis cursos',
            paginaActual: 'cursos'
        });
    }
});

app.get('/tareas', (req, res) => {
    res.render('alumno/tareas', { 
        title: 'Tareas',
        tareas: [],
        paginaActual: 'tareas'
    });
});

app.get('/proyectos', (req, res) => {
    res.render('alumno/proyectos', { 
        title: 'Proyectos',
        proyectos: [],
        paginaActual: 'proyectos'
    });
});

app.get('/calendario', (req, res) => {
    res.render('alumno/calendario', { 
        title: 'Calendario',
        eventos: [],
        paginaActual: 'calendario'
    });
});

// Rutas de prueba
app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('404', { title: 'Página no encontrada' });
});

// Manejo de errores 500
app.use((err, req, res, next) => {
    console.error('❌ ERROR 500:', err.message);
    console.error(err.stack);
    res.status(500).send('<pre>' + err.stack + '</pre>');
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

module.exports = app;