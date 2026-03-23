const express = require('express');
const router = express.Router();
const profesorController = require('../../controllers/profesor/profesor');

router.get('/', profesorController.dashboard);
router.get('/crearclase', profesorController.mostrarCrearClase);
router.post('/crearclase', profesorController.crearClase);

// Editar clase
router.get('/editarclase/:id', profesorController.mostrarEditarClase);
router.post('/editarclase/:id', profesorController.editarClase);

//Eliminar clase 
router.post('/eliminarclase/:id', profesorController.eliminarClase);


module.exports = router;