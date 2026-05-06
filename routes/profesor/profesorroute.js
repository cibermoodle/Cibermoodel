const express = require('express');
const router = express.Router();
const profesorController = require('../../controllers/profesor/profesor');
const bancoPreguntasController = require('../../controllers/profesor/banco-preguntas');
const testController = require('../../controllers/profesor/test');

// DASHBOARD Y CLASES
router.get('/', profesorController.dashboard);
router.get('/crearclase', profesorController.mostrarCrearClase);
router.post('/crearclase', profesorController.crearClase);

// Editar clase
router.get('/editarclase/:id', profesorController.mostrarEditarClase);
router.post('/editarclase/:id', profesorController.editarClase);

// Eliminar clase 
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

// Vincular preguntas a un test
router.post('/banco-preguntas/vincular', bancoPreguntasController.vincularPreguntas);

// =====================================================
// RUTAS TESTS (Gestión de exámenes)
// =====================================================
router.get('/tests', testController.verTests);
router.get('/tests/crear', testController.mostrarCrearTest);
router.post('/tests/crear', testController.crearTest);
router.get('/tests/editar/:id', testController.mostrarEditarTest);
router.post('/tests/editar/:id', testController.editarTest);
router.post('/tests/eliminar/:id', testController.eliminarTest);
router.get('/tests/ver/:id', testController.verTest);

// =====================================================
// API PARA INTERFAZ DINÁMICA (FETCH)
// =====================================================

// IMPORTANTE: Asegúrate de que en testController exista 'obtenerTests'
// Esta es la que llama el JS de tu vista para llenar el select de SweetAlert
router.get('/api/tests-disponibles', testController.obtenerTests); 

// Ruta para procesar la asignación del test a la clase
router.post('/clase/asignar-test', profesorController.asignarTestAClase);
router.post('/clase/desvincular-test', profesorController.desvincularTestDeClase);

module.exports = router;