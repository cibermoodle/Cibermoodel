const express = require('express');
const path = require('path');
const expressEjsLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('./models/User');
const { requireAuth, requireRole } = require('./middlewares/auth');
const app = express();

function redirectByRole(res, rol) {
    if (rol === 'profesor') return res.redirect('/profesor');
    if (rol === 'alumno') return res.redirect('/alumno');
    if (rol === 'admin') return res.redirect('/admin');
    return res.redirect('/login');
}

async function verifyPassword(plainPassword, storedHash) {
    if (!storedHash) return false;

    // bcrypt hashes start with $2a$, $2b$ or $2y$.
    if (/^\$2[aby]\$/.test(storedHash)) {
        return bcrypt.compare(plainPassword, storedHash);
    }

    // Compatibility path for existing SQL seed that uses SHA-256 hex.
    if (/^[a-f0-9]{64}$/i.test(storedHash)) {
        const sha256 = crypto.createHash('sha256').update(plainPassword).digest('hex');
        return sha256 === storedHash.toLowerCase();
    }

    // Last fallback for legacy plain-text seeded values.
    return plainPassword === storedHash;
}

// Configuración del motor de vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.set('layout', 'layouts/main');

// Middlewares
app.use(expressEjsLayouts);
app.use(express.static(path.join(__dirname, '../public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'cibermoodel-session-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 * 8 }
    })
);

// ✅ Variables globales para todas las vistas (header, navbar, etc.)
app.use((req, res, next) => {
    res.locals.user = req.session && req.session.user ? req.session.user : null;
  res.locals.notificaciones = [
    { id: 1, texto: 'Nueva tarea disponible', leida: false, fecha: 'Hace 5 min' },
    { id: 2, texto: 'Tu proyecto fue revisado', leida: true, fecha: 'Ayer' }
  ];
  res.locals.centro = 'I.E.S. Mar de Cádiz';
  res.locals.paginaActual = '';
  next();
});

// Inicio
app.get('/', (req, res) => {
    return res.redirect('/login');
});

// Auth
app.get('/login', (req, res) => {
    res.render('login', { title: 'Iniciar sesion', error: null, layout: false });
});

app.get('/auth/login', (req, res) => {
    res.redirect('/login');
});

const handleLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).render('login', {
            title: 'Iniciar sesion',
            error: 'Debes completar email y contrasena.',
            layout: false
        });
    }

    try {
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(401).render('login', {
                title: 'Iniciar sesion',
                error: 'Credenciales invalidas.',
                layout: false
            });
        }

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
            return res.status(401).render('login', {
                title: 'Iniciar sesion',
                error: 'Credenciales invalidas.',
                layout: false
            });
        }

        req.session.user = {
            id: user.id,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            rol: user.rol
        };

        return redirectByRole(res, user.rol);
    } catch (error) {
        return res.status(500).render('login', {
            title: 'Iniciar sesion',
            error: 'Error interno del servidor.',
            layout: false
        });
    }
};

app.post('/login', handleLogin);

app.post('/auth/login', handleLogin);

app.get('/logout', requireAuth, (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

app.get('/auth/logout', requireAuth, (req, res) => {
    res.redirect('/logout');
});

// Rutas protegidas por rol
app.get('/alumno', requireAuth, requireRole('alumno'), (req, res) => {
    res.render('alumno/alumno', { title: 'Alumno', paginaActual: 'alumno' });
});

app.get('/profesor', requireAuth, requireRole('profesor'), (req, res) => {
    res.render('profesor/profesor', { title: 'Profesor', paginaActual: 'profesor' });
});

app.get('/admin', requireAuth, requireRole('admin'), (req, res) => {
    res.render('admin/dashboard', { title: 'Panel Admin', paginaActual: 'admin' });
});

app.get('/admin/crear-alumno', requireAuth, requireRole('admin'), (req, res) => {
    res.render('admin/crear-alumno', { title: 'Crear Alumno', paginaActual: 'admin', error: null, exito: null, datos: {} });
});

app.post('/admin/crear-alumno', requireAuth, requireRole('admin'), async (req, res) => {
    const { nombre, apellidos, email, password, fecha_nacimiento } = req.body;
    const render = (error, exito, datos) =>
        res.render('admin/crear-alumno', { title: 'Crear Alumno', paginaActual: 'admin', error, exito, datos: datos || req.body });

    if (!nombre || !apellidos || !email || !password) {
        return render('Todos los campos obligatorios deben estar completos.', null);
    }
    if (password.length < 6) {
        return render('La contrasena debe tener al menos 6 caracteres.', null);
    }

    const db = require('./db/mysql');
    try {
        const [existe] = await db.query('SELECT usuario_id FROM usuario WHERE email = ? LIMIT 1', [email]);
        if (existe.length > 0) {
            return render('Ya existe un usuario con ese correo electronico.', null);
        }

        const hash = await bcrypt.hash(password, 10);
        const [result] = await db.query(
            'INSERT INTO usuario (nombre, apellidos, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
            [nombre.trim(), apellidos.trim(), email.trim().toLowerCase(), hash, 'alumno']
        );
        const usuarioId = result.insertId;

        await db.query(
            'INSERT INTO alumno (usuario_id, fecha_nacimiento) VALUES (?, ?)',
            [usuarioId, fecha_nacimiento || null]
        );

        return render(null, `Alumno "${nombre} ${apellidos}" creado correctamente.`, {});
    } catch (err) {
        return render('Error al crear el alumno. Intentalo de nuevo.', null);
    }
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