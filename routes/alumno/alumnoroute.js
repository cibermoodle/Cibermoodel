const express = require('express');
const router = express.Router();
const alumnoController = require('../../controllers/alumno/alumno');

// Dashboard del alumno - ver sus clases
router.get('/', alumnoController.dashboard);

// Mostrar formulario para unirse a una clase
router.get('/unirse', alumnoController.mostrarUnirse);

// Unirse a una clase por código
router.post('/unirse', alumnoController.unirseClase);

// Ver detalle de una clase (y lista de alumnos registrados)
router.get('/clase/:id', alumnoController.verDetalleClase);

module.exports = router;
