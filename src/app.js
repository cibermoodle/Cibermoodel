const express = require('express');
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');
const expressEjsLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const User = require('./models/User');
const pool = require('./db/mysql');
const { requireAuth, requireRole } = require('./middlewares/auth');
const app = express();

let bcrypt;
try {
    bcrypt = require('bcryptjs');
} catch (error) {
    bcrypt = null;
}

function toSha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

const STRONG_PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

async function isValidPassword(plainPassword, storedHash) {
    if (!storedHash) {
        return false;
    }

    // Bcrypt hashes usually start with $2a$, $2b$ or $2y$.
    if (/^\$2[aby]\$/.test(storedHash) && bcrypt) {
        return bcrypt.compare(plainPassword, storedHash);
    }

    // Existing seed passwords are SHA-256 hex values.
    if (/^[a-f0-9]{64}$/i.test(storedHash)) {
        return toSha256(plainPassword) === storedHash.toLowerCase();
    }

    // Legacy fallback for plain-text passwords.
    return plainPassword === storedHash;
}

function getRoleHome(role) {
    switch (role) {
        case 'alumno':
            return '/alumno';
        case 'profesor':
            return '/profesor';
        case 'admin':
            return '/admin';
        default:
            return '/login';
    }
}

async function hashPassword(password) {
    if (!bcrypt) {
        throw new Error('bcryptjs no está disponible');
    }

    return bcrypt.hash(password, 10);
}

function isStrongPassword(password) {
    return STRONG_PASSWORD_REGEX.test(password);
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
        secret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
        resave: false,
        saveUninitialized: false,
        cookie: {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
        },
    })
);

// ✅ Variables globales para todas las vistas (header, navbar, etc.)
app.use((req, res, next) => {
    res.locals.user = (req.session && req.session.user) || null;
  res.locals.notificaciones = [
    { id: 1, texto: 'Nueva tarea disponible', leida: false, fecha: 'Hace 5 min' },
    { id: 2, texto: 'Tu proyecto fue revisado', leida: true, fecha: 'Ayer' }
  ];
  res.locals.centro = 'I.E.S. Mar de Cádiz';
  res.locals.paginaActual = '';
  next();
});

app.get('/', (req, res) => {
    return res.redirect('/login');
});

app.get('/inicio', (req, res) => {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }

    return res.render('index', { title: 'Inicio', paginaActual: 'dashboard' });
});

app.get('/perfil', requireAuth, async (req, res) => {
    try {
        const usuarioId = req.session.user.usuario_id;
        const usuario = await User.findById(usuarioId);

        if (!usuario) {
            req.session.destroy(() => {
                res.redirect('/login');
            });
            return;
        }

        return res.render('perfil', {
            title: 'Mi perfil',
            paginaActual: 'perfil',
            perfil: {
                usuario_id: usuario.usuario_id,
                nombre: usuario.nombre,
                apellidos: usuario.apellidos,
                email: usuario.email,
                rol: usuario.rol,
            },
        });
    } catch (error) {
        return res.status(500).render('500', { title: 'Error del servidor' });
    }
});

app.get('/login', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect(getRoleHome(req.session.user.rol));
    }

    return res.render('login', {
        title: 'Iniciar sesión',
        layout: false,
        error: null,
        email: '',
    });
});

async function handleLogin(req, res) {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!email || !password) {
        return res.status(400).render('login', {
            title: 'Iniciar sesión',
            layout: false,
            error: 'Email y contraseña son obligatorios.',
            email,
        });
    }

    try {
        const user = await User.findByEmail(email);
        const isValid = user ? await isValidPassword(password, user.password_hash) : false;

        if (!user || !isValid) {
            return res.status(401).render('login', {
                title: 'Iniciar sesión',
                layout: false,
                error: 'Credenciales inválidas.',
                email,
            });
        }

        req.session.user = {
            usuario_id: user.usuario_id,
            nombre: user.nombre,
            apellidos: user.apellidos,
            email: user.email,
            rol: user.rol,
        };

        return res.redirect(getRoleHome(user.rol));
    } catch (error) {
        return res.status(500).render('login', {
            title: 'Iniciar sesión',
            layout: false,
            error: 'Error interno al iniciar sesión.',
            email,
        });
    }
}

app.post('/login', handleLogin);

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
});

// Alias de compatibilidad con rutas antiguas.
app.get('/auth/login', (req, res) => {
    res.redirect('/login');
});
app.post('/auth/login', handleLogin);
app.get('/auth/logout', (req, res) => {
    res.redirect('/logout');
});

app.get('/alumno', requireAuth, requireRole('alumno'), (req, res) => {
    res.render('alumno/alumno', { title: 'Alumno', paginaActual: 'alumno' });
});
app.get('/profesor', requireAuth, requireRole('profesor'), (req, res) => {
    res.render('profesor/profesor', { title: 'Profesor', paginaActual: 'profesor' });
});
app.get('/admin', requireAuth, requireRole('admin'), (req, res) => {
        res.render('admin/dashboard', { title: 'Administrador', paginaActual: 'admin' });
});

app.get('/admin/alumnos', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const search = `%${q}%`;
        const [alumnos] = await pool.query(
            `
                SELECT
                    u.usuario_id,
                    u.nombre,
                    u.apellidos,
                    u.email,
                    a.alumno_id,
                    a.fecha_nacimiento
                FROM usuario u
                INNER JOIN alumno a ON a.usuario_id = u.usuario_id
                WHERE u.rol = 'alumno'
                  AND (u.nombre LIKE ? OR u.apellidos LIKE ? OR u.email LIKE ?)
                ORDER BY u.apellidos ASC, u.nombre ASC
            `,
            [search, search, search]
        );

        return res.render('admin/lista-alumnos', {
            title: 'Listado de alumnos',
            paginaActual: 'admin',
            alumnos,
            q,
        });
    } catch (error) {
        return res.status(500).render('500', { title: 'Error del servidor' });
    }
});

app.get('/admin/profesores', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const search = `%${q}%`;
        const [profesores] = await pool.query(
            `
                SELECT
                    u.usuario_id,
                    u.nombre,
                    u.apellidos,
                    u.email,
                    p.profesor_id,
                    p.departamento
                FROM usuario u
                INNER JOIN profesor p ON p.usuario_id = u.usuario_id
                WHERE u.rol = 'profesor'
                  AND (u.nombre LIKE ? OR u.apellidos LIKE ? OR u.email LIKE ?)
                ORDER BY u.apellidos ASC, u.nombre ASC
            `,
            [search, search, search]
        );

        return res.render('admin/lista-profesores', {
            title: 'Listado de profesores',
            paginaActual: 'admin',
            profesores,
            q,
        });
    } catch (error) {
        return res.status(500).render('500', { title: 'Error del servidor' });
    }
});

app.get('/admin/alumnos/:alumnoId/editar', requireAuth, requireRole('admin'), async (req, res) => {
    const alumnoId = Number(req.params.alumnoId);

    try {
        const [rows] = await pool.query(
            `
                SELECT
                    a.alumno_id,
                    a.fecha_nacimiento,
                    u.usuario_id,
                    u.nombre,
                    u.apellidos,
                    u.email
                FROM alumno a
                INNER JOIN usuario u ON u.usuario_id = a.usuario_id
                WHERE a.alumno_id = ?
                  AND u.rol = 'alumno'
                LIMIT 1
            `,
            [alumnoId]
        );

        const alumno = rows[0];
        if (!alumno) {
            return res.status(404).render('404', { title: 'Página no encontrada' });
        }

        return res.render('admin/editar-alumno', {
            title: 'Editar alumno',
            paginaActual: 'admin',
            error: null,
            datos: {
                alumno_id: alumno.alumno_id,
                usuario_id: alumno.usuario_id,
                nombre: alumno.nombre,
                apellidos: alumno.apellidos,
                email: alumno.email,
                fecha_nacimiento: alumno.fecha_nacimiento ? new Date(alumno.fecha_nacimiento).toISOString().slice(0, 10) : '',
            },
        });
    } catch (error) {
        return res.status(500).render('500', { title: 'Error del servidor' });
    }
});

app.post('/admin/alumnos/:alumnoId/editar', requireAuth, requireRole('admin'), async (req, res) => {
    const alumnoId = Number(req.params.alumnoId);
    const nombre = (req.body.nombre || '').trim();
    const apellidos = (req.body.apellidos || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const passwordConfirm = req.body.password_confirm || '';
    const fechaNacimiento = (req.body.fecha_nacimiento || '').trim();

    const datos = {
        alumno_id: alumnoId,
        nombre,
        apellidos,
        email,
        fecha_nacimiento: fechaNacimiento,
    };

    if (!nombre || !apellidos || !email) {
        return res.status(400).render('admin/editar-alumno', {
            title: 'Editar alumno',
            paginaActual: 'admin',
            error: 'Nombre, apellidos y email son obligatorios.',
            datos,
        });
    }

    if (password && !isStrongPassword(password)) {
        return res.status(400).render('admin/editar-alumno', {
            title: 'Editar alumno',
            paginaActual: 'admin',
            error: 'Si cambias la contraseña, debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial.',
            datos,
        });
    }

    if (password || passwordConfirm) {
        if (!password || !passwordConfirm) {
            return res.status(400).render('admin/editar-alumno', {
                title: 'Editar alumno',
                paginaActual: 'admin',
                error: 'Debes escribir y verificar la nueva contraseña.',
                datos,
            });
        }

        if (password !== passwordConfirm) {
            return res.status(400).render('admin/editar-alumno', {
                title: 'Editar alumno',
                paginaActual: 'admin',
                error: 'La contraseña y su verificación no coinciden.',
                datos,
            });
        }
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            `
                SELECT a.alumno_id, u.usuario_id
                FROM alumno a
                INNER JOIN usuario u ON u.usuario_id = a.usuario_id
                WHERE a.alumno_id = ?
                  AND u.rol = 'alumno'
                LIMIT 1
            `,
            [alumnoId]
        );

        const alumno = rows[0];
        if (!alumno) {
            await connection.rollback();
            return res.status(404).render('404', { title: 'Página no encontrada' });
        }

        const usuarioId = alumno.usuario_id;
        const [duplicados] = await connection.query(
            'SELECT usuario_id FROM usuario WHERE email = ? AND usuario_id <> ? LIMIT 1',
            [email, usuarioId]
        );

        if (duplicados.length > 0) {
            await connection.rollback();
            return res.status(409).render('admin/editar-alumno', {
                title: 'Editar alumno',
                paginaActual: 'admin',
                error: 'El email ya está registrado por otro usuario.',
                datos,
            });
        }

        if (password) {
            const passwordHash = await hashPassword(password);
            await connection.query(
                `
                    UPDATE usuario
                    SET nombre = ?, apellidos = ?, email = ?, password_hash = ?
                    WHERE usuario_id = ?
                `,
                [nombre, apellidos, email, passwordHash, usuarioId]
            );
        } else {
            await connection.query(
                `
                    UPDATE usuario
                    SET nombre = ?, apellidos = ?, email = ?
                    WHERE usuario_id = ?
                `,
                [nombre, apellidos, email, usuarioId]
            );
        }

        await connection.query(
            `
                UPDATE alumno
                SET fecha_nacimiento = ?
                WHERE alumno_id = ?
            `,
            [fechaNacimiento || null, alumnoId]
        );

        await connection.commit();
        return res.redirect('/admin/alumnos');
    } catch (error) {
        await connection.rollback();
        return res.status(500).render('admin/editar-alumno', {
            title: 'Editar alumno',
            paginaActual: 'admin',
            error: 'No se pudo actualizar el alumno. Inténtalo de nuevo.',
            datos,
        });
    } finally {
        connection.release();
    }
});

app.post('/admin/alumnos/:alumnoId/eliminar', requireAuth, requireRole('admin'), async (req, res) => {
    const alumnoId = Number(req.params.alumnoId);
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            `
                SELECT u.usuario_id
                FROM alumno a
                INNER JOIN usuario u ON u.usuario_id = a.usuario_id
                WHERE a.alumno_id = ?
                  AND u.rol = 'alumno'
                LIMIT 1
            `,
            [alumnoId]
        );

        const alumno = rows[0];
        if (!alumno) {
            await connection.rollback();
            return res.status(404).render('404', { title: 'Página no encontrada' });
        }

        await connection.query('DELETE FROM usuario WHERE usuario_id = ? AND rol = ?', [alumno.usuario_id, 'alumno']);
        await connection.commit();

        return res.redirect('/admin/alumnos');
    } catch (error) {
        await connection.rollback();
        return res.status(500).render('500', { title: 'Error del servidor' });
    } finally {
        connection.release();
    }
});

app.get('/admin/profesores/:profesorId/editar', requireAuth, requireRole('admin'), async (req, res) => {
    const profesorId = Number(req.params.profesorId);

    try {
        const [rows] = await pool.query(
            `
                SELECT
                    p.profesor_id,
                    p.departamento,
                    u.usuario_id,
                    u.nombre,
                    u.apellidos,
                    u.email
                FROM profesor p
                INNER JOIN usuario u ON u.usuario_id = p.usuario_id
                WHERE p.profesor_id = ?
                  AND u.rol = 'profesor'
                LIMIT 1
            `,
            [profesorId]
        );

        const profesor = rows[0];
        if (!profesor) {
            return res.status(404).render('404', { title: 'Página no encontrada' });
        }

        return res.render('admin/editar-profesor', {
            title: 'Editar profesor',
            paginaActual: 'admin',
            error: null,
            datos: {
                profesor_id: profesor.profesor_id,
                usuario_id: profesor.usuario_id,
                nombre: profesor.nombre,
                apellidos: profesor.apellidos,
                email: profesor.email,
                departamento: profesor.departamento || '',
            },
        });
    } catch (error) {
        return res.status(500).render('500', { title: 'Error del servidor' });
    }
});

app.post('/admin/profesores/:profesorId/editar', requireAuth, requireRole('admin'), async (req, res) => {
    const profesorId = Number(req.params.profesorId);
    const nombre = (req.body.nombre || '').trim();
    const apellidos = (req.body.apellidos || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const passwordConfirm = req.body.password_confirm || '';
    const departamento = (req.body.departamento || '').trim();

    const datos = {
        profesor_id: profesorId,
        nombre,
        apellidos,
        email,
        departamento,
    };

    if (!nombre || !apellidos || !email) {
        return res.status(400).render('admin/editar-profesor', {
            title: 'Editar profesor',
            paginaActual: 'admin',
            error: 'Nombre, apellidos y email son obligatorios.',
            datos,
        });
    }

    if (password && !isStrongPassword(password)) {
        return res.status(400).render('admin/editar-profesor', {
            title: 'Editar profesor',
            paginaActual: 'admin',
            error: 'Si cambias la contraseña, debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial.',
            datos,
        });
    }

    if (password || passwordConfirm) {
        if (!password || !passwordConfirm) {
            return res.status(400).render('admin/editar-profesor', {
                title: 'Editar profesor',
                paginaActual: 'admin',
                error: 'Debes escribir y verificar la nueva contraseña.',
                datos,
            });
        }

        if (password !== passwordConfirm) {
            return res.status(400).render('admin/editar-profesor', {
                title: 'Editar profesor',
                paginaActual: 'admin',
                error: 'La contraseña y su verificación no coinciden.',
                datos,
            });
        }
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            `
                SELECT p.profesor_id, u.usuario_id
                FROM profesor p
                INNER JOIN usuario u ON u.usuario_id = p.usuario_id
                WHERE p.profesor_id = ?
                  AND u.rol = 'profesor'
                LIMIT 1
            `,
            [profesorId]
        );

        const profesor = rows[0];
        if (!profesor) {
            await connection.rollback();
            return res.status(404).render('404', { title: 'Página no encontrada' });
        }

        const usuarioId = profesor.usuario_id;
        const [duplicados] = await connection.query(
            'SELECT usuario_id FROM usuario WHERE email = ? AND usuario_id <> ? LIMIT 1',
            [email, usuarioId]
        );

        if (duplicados.length > 0) {
            await connection.rollback();
            return res.status(409).render('admin/editar-profesor', {
                title: 'Editar profesor',
                paginaActual: 'admin',
                error: 'El email ya está registrado por otro usuario.',
                datos,
            });
        }

        if (password) {
            const passwordHash = await hashPassword(password);
            await connection.query(
                `
                    UPDATE usuario
                    SET nombre = ?, apellidos = ?, email = ?, password_hash = ?
                    WHERE usuario_id = ?
                `,
                [nombre, apellidos, email, passwordHash, usuarioId]
            );
        } else {
            await connection.query(
                `
                    UPDATE usuario
                    SET nombre = ?, apellidos = ?, email = ?
                    WHERE usuario_id = ?
                `,
                [nombre, apellidos, email, usuarioId]
            );
        }

        await connection.query(
            `
                UPDATE profesor
                SET departamento = ?
                WHERE profesor_id = ?
            `,
            [departamento || null, profesorId]
        );

        await connection.commit();
        return res.redirect('/admin/profesores');
    } catch (error) {
        await connection.rollback();
        return res.status(500).render('admin/editar-profesor', {
            title: 'Editar profesor',
            paginaActual: 'admin',
            error: 'No se pudo actualizar el profesor. Inténtalo de nuevo.',
            datos,
        });
    } finally {
        connection.release();
    }
});

app.post('/admin/profesores/:profesorId/eliminar', requireAuth, requireRole('admin'), async (req, res) => {
    const profesorId = Number(req.params.profesorId);
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const [rows] = await connection.query(
            `
                SELECT u.usuario_id
                FROM profesor p
                INNER JOIN usuario u ON u.usuario_id = p.usuario_id
                WHERE p.profesor_id = ?
                  AND u.rol = 'profesor'
                LIMIT 1
            `,
            [profesorId]
        );

        const profesor = rows[0];
        if (!profesor) {
            await connection.rollback();
            return res.status(404).render('404', { title: 'Página no encontrada' });
        }

        await connection.query('DELETE FROM usuario WHERE usuario_id = ? AND rol = ?', [profesor.usuario_id, 'profesor']);
        await connection.commit();

        return res.redirect('/admin/profesores');
    } catch (error) {
        await connection.rollback();
        return res.status(500).render('500', { title: 'Error del servidor' });
    } finally {
        connection.release();
    }
});

app.get('/admin/crear-alumno', requireAuth, requireRole('admin'), (req, res) => {
    res.render('admin/crear-alumno', {
        title: 'Crear alumno',
        paginaActual: 'admin',
        error: null,
        exito: null,
        datos: {
            nombre: '',
            apellidos: '',
            email: '',
            fecha_nacimiento: '',
        },
    });
});

app.get('/admin/crear-profesor', requireAuth, requireRole('admin'), (req, res) => {
    res.render('admin/crear-profesor', {
        title: 'Crear profesor',
        paginaActual: 'admin',
        error: null,
        exito: null,
        datos: {
            nombre: '',
            apellidos: '',
            email: '',
            departamento: '',
        },
    });
});

app.post('/admin/crear-profesor', requireAuth, requireRole('admin'), async (req, res) => {
    const nombre = (req.body.nombre || '').trim();
    const apellidos = (req.body.apellidos || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const passwordConfirm = req.body.password_confirm || '';
    const departamento = (req.body.departamento || '').trim();

    const datos = {
        nombre,
        apellidos,
        email,
        departamento,
    };

    if (!nombre || !apellidos || !email || !password || !passwordConfirm) {
        return res.status(400).render('admin/crear-profesor', {
            title: 'Crear profesor',
            paginaActual: 'admin',
            error: 'Nombre, apellidos, email, contraseña y verificación de contraseña son obligatorios.',
            exito: null,
            datos,
        });
    }

    if (password !== passwordConfirm) {
        return res.status(400).render('admin/crear-profesor', {
            title: 'Crear profesor',
            paginaActual: 'admin',
            error: 'La contraseña y su verificación no coinciden.',
            exito: null,
            datos,
        });
    }

    if (!isStrongPassword(password)) {
        return res.status(400).render('admin/crear-profesor', {
            title: 'Crear profesor',
            paginaActual: 'admin',
            error: 'La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial.',
            exito: null,
            datos,
        });
    }

    try {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).render('admin/crear-profesor', {
                title: 'Crear profesor',
                paginaActual: 'admin',
                error: 'El email ya está registrado.',
                exito: null,
                datos,
            });
        }

        const passwordHash = await hashPassword(password);
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const [usuarioResult] = await connection.query(
                `
                    INSERT INTO usuario (nombre, apellidos, email, password_hash, rol)
                    VALUES (?, ?, ?, ?, 'profesor')
                `,
                [nombre, apellidos, email, passwordHash]
            );

            const usuarioId = usuarioResult.insertId;

            await connection.query(
                `
                    INSERT INTO profesor (usuario_id, departamento)
                    VALUES (?, ?)
                `,
                [usuarioId, departamento || null]
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        return res.status(201).render('admin/crear-profesor', {
            title: 'Crear profesor',
            paginaActual: 'admin',
            error: null,
            exito: 'Profesor creado correctamente.',
            datos: {
                nombre: '',
                apellidos: '',
                email: '',
                departamento: '',
            },
        });
    } catch (error) {
        return res.status(500).render('admin/crear-profesor', {
            title: 'Crear profesor',
            paginaActual: 'admin',
            error: 'No se pudo crear el profesor. Inténtalo de nuevo.',
            exito: null,
            datos,
        });
    }
});

app.post('/admin/crear-alumno', requireAuth, requireRole('admin'), async (req, res) => {
    const nombre = (req.body.nombre || '').trim();
    const apellidos = (req.body.apellidos || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const passwordConfirm = req.body.password_confirm || '';
    const fechaNacimiento = (req.body.fecha_nacimiento || '').trim();

    const datos = {
        nombre,
        apellidos,
        email,
        fecha_nacimiento: fechaNacimiento,
    };

    if (!nombre || !apellidos || !email || !password || !passwordConfirm) {
        return res.status(400).render('admin/crear-alumno', {
            title: 'Crear alumno',
            paginaActual: 'admin',
            error: 'Nombre, apellidos, email, contraseña y verificación de contraseña son obligatorios.',
            exito: null,
            datos,
        });
    }

    if (password !== passwordConfirm) {
        return res.status(400).render('admin/crear-alumno', {
            title: 'Crear alumno',
            paginaActual: 'admin',
            error: 'La contraseña y su verificación no coinciden.',
            exito: null,
            datos,
        });
    }

    if (!isStrongPassword(password)) {
        return res.status(400).render('admin/crear-alumno', {
            title: 'Crear alumno',
            paginaActual: 'admin',
            error: 'La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial.',
            exito: null,
            datos,
        });
    }

    try {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).render('admin/crear-alumno', {
                title: 'Crear alumno',
                paginaActual: 'admin',
                error: 'El email ya está registrado.',
                exito: null,
                datos,
            });
        }

        const passwordHash = await hashPassword(password);
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const [usuarioResult] = await connection.query(
                `
                    INSERT INTO usuario (nombre, apellidos, email, password_hash, rol)
                    VALUES (?, ?, ?, ?, 'alumno')
                `,
                [nombre, apellidos, email, passwordHash]
            );

            const usuarioId = usuarioResult.insertId;

            await connection.query(
                `
                    INSERT INTO alumno (usuario_id, fecha_nacimiento)
                    VALUES (?, ?)
                `,
                [usuarioId, fechaNacimiento || null]
            );

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }

        return res.status(201).render('admin/crear-alumno', {
            title: 'Crear alumno',
            paginaActual: 'admin',
            error: null,
            exito: 'Alumno creado correctamente.',
            datos: {
                nombre: '',
                apellidos: '',
                email: '',
                fecha_nacimiento: '',
            },
        });
    } catch (error) {
        return res.status(500).render('admin/crear-alumno', {
            title: 'Crear alumno',
            paginaActual: 'admin',
            error: 'No se pudo crear el alumno. Inténtalo de nuevo.',
            exito: null,
            datos,
        });
    }
});

app.get('/admin/administradores', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        const search = `%${q}%`;
        const [administradores] = await pool.query(
            `
                SELECT
                    usuario_id,
                    nombre,
                    apellidos,
                    email
                FROM usuario
                WHERE rol = 'admin'
                  AND (nombre LIKE ? OR apellidos LIKE ? OR email LIKE ?)
                ORDER BY apellidos ASC, nombre ASC
            `,
            [search, search, search]
        );

        return res.render('admin/lista-administradores', {
            title: 'Listado de administradores',
            paginaActual: 'admin',
            administradores,
            q,
        });
    } catch (error) {
        return res.status(500).render('500', { title: 'Error del servidor' });
    }
});

app.get('/admin/crear-administrador', requireAuth, requireRole('admin'), (req, res) => {
    res.render('admin/crear-administrador', {
        title: 'Crear administrador',
        paginaActual: 'admin',
        error: null,
        exito: null,
        datos: {
            nombre: '',
            apellidos: '',
            email: '',
        },
    });
});

app.post('/admin/crear-administrador', requireAuth, requireRole('admin'), async (req, res) => {
    const nombre = (req.body.nombre || '').trim();
    const apellidos = (req.body.apellidos || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const passwordConfirm = req.body.password_confirm || '';

    const datos = {
        nombre,
        apellidos,
        email,
    };

    if (!nombre || !apellidos || !email || !password || !passwordConfirm) {
        return res.status(400).render('admin/crear-administrador', {
            title: 'Crear administrador',
            paginaActual: 'admin',
            error: 'Nombre, apellidos, email, contraseña y verificación de contraseña son obligatorios.',
            exito: null,
            datos,
        });
    }

    if (password !== passwordConfirm) {
        return res.status(400).render('admin/crear-administrador', {
            title: 'Crear administrador',
            paginaActual: 'admin',
            error: 'La contraseña y su verificación no coinciden.',
            exito: null,
            datos,
        });
    }

    if (!isStrongPassword(password)) {
        return res.status(400).render('admin/crear-administrador', {
            title: 'Crear administrador',
            paginaActual: 'admin',
            error: 'La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial.',
            exito: null,
            datos,
        });
    }

    try {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(409).render('admin/crear-administrador', {
                title: 'Crear administrador',
                paginaActual: 'admin',
                error: 'El email ya está registrado.',
                exito: null,
                datos,
            });
        }

        const passwordHash = await hashPassword(password);

        await pool.query(
            `
                INSERT INTO usuario (nombre, apellidos, email, password_hash, rol)
                VALUES (?, ?, ?, ?, 'admin')
            `,
            [nombre, apellidos, email, passwordHash]
        );

        return res.status(201).render('admin/crear-administrador', {
            title: 'Crear administrador',
            paginaActual: 'admin',
            error: null,
            exito: 'Administrador creado correctamente.',
            datos: {
                nombre: '',
                apellidos: '',
                email: '',
            },
        });
    } catch (error) {
        return res.status(500).render('admin/crear-administrador', {
            title: 'Crear administrador',
            paginaActual: 'admin',
            error: 'No se pudo crear el administrador. Inténtalo de nuevo.',
            exito: null,
            datos,
        });
    }
});

app.get('/admin/administradores/:administradorId/editar', requireAuth, requireRole('admin'), async (req, res) => {
    const administradorId = Number(req.params.administradorId);

    try {
        const [rows] = await pool.query(
            `
                SELECT
                    usuario_id,
                    nombre,
                    apellidos,
                    email
                FROM usuario
                WHERE usuario_id = ?
                  AND rol = 'admin'
                LIMIT 1
            `,
            [administradorId]
        );

        const administrador = rows[0];
        if (!administrador) {
            return res.status(404).render('404', { title: 'Página no encontrada' });
        }

        return res.render('admin/editar-administrador', {
            title: 'Editar administrador',
            paginaActual: 'admin',
            error: null,
            datos: administrador,
        });
    } catch (error) {
        return res.status(500).render('500', { title: 'Error del servidor' });
    }
});

app.post('/admin/administradores/:administradorId/editar', requireAuth, requireRole('admin'), async (req, res) => {
    const administradorId = Number(req.params.administradorId);
    const nombre = (req.body.nombre || '').trim();
    const apellidos = (req.body.apellidos || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';
    const passwordConfirm = req.body.password_confirm || '';

    const datos = {
        usuario_id: administradorId,
        nombre,
        apellidos,
        email,
    };

    if (!nombre || !apellidos || !email) {
        return res.status(400).render('admin/editar-administrador', {
            title: 'Editar administrador',
            paginaActual: 'admin',
            error: 'Nombre, apellidos y email son obligatorios.',
            datos,
        });
    }

    if (password && !isStrongPassword(password)) {
        return res.status(400).render('admin/editar-administrador', {
            title: 'Editar administrador',
            paginaActual: 'admin',
            error: 'Si cambias la contraseña, debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial.',
            datos,
        });
    }

    if (password || passwordConfirm) {
        if (!password || !passwordConfirm) {
            return res.status(400).render('admin/editar-administrador', {
                title: 'Editar administrador',
                paginaActual: 'admin',
                error: 'Debes escribir y verificar la nueva contraseña.',
                datos,
            });
        }

        if (password !== passwordConfirm) {
            return res.status(400).render('admin/editar-administrador', {
                title: 'Editar administrador',
                paginaActual: 'admin',
                error: 'La contraseña y su verificación no coinciden.',
                datos,
            });
        }
    }

    try {
        const [rows] = await pool.query(
            `
                SELECT usuario_id
                FROM usuario
                WHERE usuario_id = ?
                  AND rol = 'admin'
                LIMIT 1
            `,
            [administradorId]
        );

        const administrador = rows[0];
        if (!administrador) {
            return res.status(404).render('404', { title: 'Página no encontrada' });
        }

        const [duplicados] = await pool.query(
            'SELECT usuario_id FROM usuario WHERE email = ? AND usuario_id <> ? LIMIT 1',
            [email, administradorId]
        );

        if (duplicados.length > 0) {
            return res.status(409).render('admin/editar-administrador', {
                title: 'Editar administrador',
                paginaActual: 'admin',
                error: 'El email ya está registrado por otro usuario.',
                datos,
            });
        }

        if (password) {
            const passwordHash = await hashPassword(password);
            await pool.query(
                `
                    UPDATE usuario
                    SET nombre = ?, apellidos = ?, email = ?, password_hash = ?
                    WHERE usuario_id = ?
                `,
                [nombre, apellidos, email, passwordHash, administradorId]
            );
        } else {
            await pool.query(
                `
                    UPDATE usuario
                    SET nombre = ?, apellidos = ?, email = ?
                    WHERE usuario_id = ?
                `,
                [nombre, apellidos, email, administradorId]
            );
        }

        if (req.session?.user?.usuario_id === administradorId) {
            req.session.user.nombre = nombre;
            req.session.user.apellidos = apellidos;
            req.session.user.email = email;
        }

        return res.redirect('/admin/administradores');
    } catch (error) {
        return res.status(500).render('admin/editar-administrador', {
            title: 'Editar administrador',
            paginaActual: 'admin',
            error: 'No se pudo actualizar el administrador. Inténtalo de nuevo.',
            datos,
        });
    }
});

app.post('/admin/administradores/:administradorId/eliminar', requireAuth, requireRole('admin'), async (req, res) => {
    const administradorId = Number(req.params.administradorId);

    try {
        const [rows] = await pool.query(
            `
                SELECT usuario_id
                FROM usuario
                WHERE usuario_id = ?
                  AND rol = 'admin'
                LIMIT 1
            `,
            [administradorId]
        );

        const administrador = rows[0];
        if (!administrador) {
            return res.status(404).render('404', { title: 'Página no encontrada' });
        }

        const [totalAdminsRows] = await pool.query(
            `
                SELECT COUNT(*) AS total
                FROM usuario
                WHERE rol = 'admin'
            `
        );

        const totalAdmins = Number(totalAdminsRows[0]?.total || 0);
        const esMismoUsuario = req.session?.user?.usuario_id === administradorId;

        if (esMismoUsuario || totalAdmins <= 1) {
            return res.redirect('/admin/administradores');
        }

        await pool.query('DELETE FROM usuario WHERE usuario_id = ? AND rol = ?', [administradorId, 'admin']);

        return res.redirect('/admin/administradores');
    } catch (error) {
        return res.status(500).render('500', { title: 'Error del servidor' });
    }
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