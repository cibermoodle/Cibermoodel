const express = require('express');
const router = express.Router();
const alumnoController = require('../../controllers/alumno/alumno');

// Dashboard del alumno - ver sus clases
router.get('/', alumnoController.dashboard);

// Mostrar formulario para unirse a una clase
router.get('/unirse', alumnoController.mostrarUnirse);

// Unirse a una clase por código
router.post('/unirse', alumnoController.unirseClase);

// Ver exámenes disponibles según fecha de inicio y fin
router.get('/examenes', alumnoController.verExamenes);

// Ver y realizar un examen
router.get('/examen/:id', alumnoController.verExamen);
router.post('/examen/:id', alumnoController.enviarRespuestas);

// Ver detalle de una clase (y lista de alumnos registrados)
router.get('/clase/:id', alumnoController.verDetalleClase);


module.exports = router;