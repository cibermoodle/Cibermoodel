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

// Rutas de prueba
app.get('/', (req, res) => {
    res.render('index', { title: 'Home' });
});
app.get('/alumno', (req, res) => {
    res.render('alumno/alumno', { title: 'Alumno', paginaActual: 'alumno' });
});
app.get('/profesor', (req, res) => {
    res.render('profesor/profesor', { title: 'Profesor', paginaActual: 'profesor' });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).render('404', { title: 'Página no encontrada' });
});

// Manejo de errores 500
app.use((err, req, res, next) => {
    res.status(500).render('500', { title: 'Error del servidor' });
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

module.exports = app;