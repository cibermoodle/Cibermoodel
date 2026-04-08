const express = require('express');
const router = express.Router();
const profesorController = require('../../controllers/profesor/profesor');
const bancoPreguntasController = require('../../controllers/profesor/banco-preguntas');

router.get('/', profesorController.dashboard);
router.get('/crearclase', profesorController.mostrarCrearClase);
router.post('/crearclase', profesorController.crearClase);

// Editar clase
router.get('/editarclase/:id', profesorController.mostrarEditarClase);
router.post('/editarclase/:id', profesorController.editarClase);

//Eliminar clase 
router.post('/eliminarclase/:id', profesorController.eliminarClase);

// Ver alumnos registrados en una clase
router.get('/registrados/:id', profesorController.verAlumnosClase);

// =====================================================
// RUTAS BANCO DE PREGUNTAS
// =====================================================

router.get('/banco-preguntas', bancoPreguntasController.verBanco);
router.get('/banco-preguntas/crear', bancoPreguntasController.mostrarCrear);
router.post('/banco-preguntas/crear', bancoPreguntasController.crearPregunta);
router.get('/banco-preguntas/editar/:id', bancoPreguntasController.mostrarEditar);
router.post('/banco-preguntas/editar/:id', bancoPreguntasController.editarPregunta);
router.post('/banco-preguntas/eliminar/:id', bancoPreguntasController.eliminarPregunta);
router.get('/banco-preguntas/buscar', bancoPreguntasController.buscar);

module.exports = router;