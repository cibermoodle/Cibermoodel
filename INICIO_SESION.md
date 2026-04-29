# Inicio de sesion - pasos correctos aplicados

## 1. Conexion a MySQL corregida
- Se corrigio la exportacion del pool en `src/db/mysql.js`.
- Resultado: la app puede consultar la tabla `usuario` sin romper al arrancar.

## 2. Modelo de usuario implementado
- Se implemento `findByEmail(email)` en `src/models/User.js`.
- Se implemento `findById(usuarioId)` en `src/models/User.js`.
- Resultado: el backend puede buscar usuario por correo para autenticacion.

## 3. Middleware de autenticacion por sesion
- Se implemento `requireAuth` en `src/middlewares/auth.js`.
- Se implemento `requireRole(...roles)` en `src/middlewares/auth.js`.
- Resultado: las rutas privadas quedan protegidas por login y por rol.

## 4. Sesiones activadas en Express
- Se agrego `express-session` en `src/app.js`.
- Se guarda el usuario autenticado en `req.session.user`.
- Resultado: el login persiste durante la sesion activa del navegador.

## 5. Login como primera pantalla
- La ruta `/` redirige siempre a `/login` en `src/app.js`.
- La ruta `GET /login` renderiza pantalla de login.
- Resultado: al abrir la app, lo primero que aparece es inicio de sesion.

## 6. Vista de login independiente
- Se creo una vista standalone en `views/login.ejs`.
- No usa el layout general (`layout: false`) para evitar problemas visuales.
- Resultado: el formulario de correo y contrasena se muestra correctamente.

## 7. Flujo de autenticacion completo
- `POST /login` valida campos obligatorios.
- Busca usuario por email en base de datos.
- Valida password con estrategia compatible.
- Si es correcto, guarda sesion y redirige por rol:
  - alumno -> `/alumno`
  - profesor -> `/profesor`
  - admin -> `/admin`
- Si falla, responde con mensaje de credenciales invalidas.

## 8. Compatibilidad de contrasenas sin tocar la base de datos
- Se mantuvo soporte para hash `bcrypt`.
- Se agrego soporte para hash SHA-256 (seed existente).
- Se agrego fallback para texto plano legacy (caso admin del seed).
- Resultado: login funcional con los datos actuales de `src/db/script.sql` sin cambiar esquema ni migrar contrasenas.

## 9. Rutas alias de compatibilidad
- Se mantuvo `GET /auth/login` -> redirige a `/login`.
- Se mantuvo `POST /auth/login` -> usa el mismo handler de login.
- Se mantuvo `GET /auth/logout` -> redirige a `/logout`.
- Resultado: formularios o enlaces antiguos siguen funcionando.
