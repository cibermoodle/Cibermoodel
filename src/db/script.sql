---------------------------------------------------------------

-- Para recuperar la base de datos si se pierde

---------------------------------------------------------------

DROP SCHEMA IF EXISTS plataforma_educativa;

CREATE SCHEMA plataforma_educativa DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE plataforma_educativa;



SET FOREIGN_KEY_CHECKS = 0;



-- -----------------------------------------------------

-- USUARIO

-- -----------------------------------------------------

CREATE TABLE usuario (

  usuario_id INT AUTO_INCREMENT PRIMARY KEY,

  nombre VARCHAR(100) NOT NULL,

  apellidos VARCHAR(150) NOT NULL,

  email VARCHAR(150) NOT NULL UNIQUE,

  password_hash VARCHAR(255) NOT NULL,

  rol ENUM('profesor','alumno','admin') NOT NULL DEFAULT 'alumno',

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

) ENGINE=InnoDB;



-- -----------------------------------------------------

-- PROFESOR

-- -----------------------------------------------------

CREATE TABLE profesor (

  profesor_id INT AUTO_INCREMENT PRIMARY KEY,

  usuario_id INT NOT NULL UNIQUE,

  departamento VARCHAR(100),
  
  foto_perfil varchar(255),

  FOREIGN KEY (usuario_id)

    REFERENCES usuario(usuario_id)

    ON DELETE CASCADE

    ON UPDATE CASCADE

) ENGINE=InnoDB;



-- -----------------------------------------------------

-- ALUMNO

-- -----------------------------------------------------

CREATE TABLE alumno (

  alumno_id INT AUTO_INCREMENT PRIMARY KEY,

  usuario_id INT NOT NULL UNIQUE,

  fecha_nacimiento DATE,
  
  foto_perfil varchar(255),

  FOREIGN KEY (usuario_id)

    REFERENCES usuario(usuario_id)

    ON DELETE CASCADE

    ON UPDATE CASCADE

) ENGINE=InnoDB;



-- -----------------------------------------------------

-- CLASE

-- -----------------------------------------------------

CREATE TABLE clase (

  clase_id INT AUTO_INCREMENT PRIMARY KEY,

  profesor_id INT NOT NULL,

  nombre VARCHAR(150) NOT NULL,

  descripcion TEXT,

  codigo_acceso VARCHAR(20) NOT NULL UNIQUE,

  activa ENUM('activa','inactiva') NOT NULL DEFAULT 'activa',

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (profesor_id)

    REFERENCES profesor(profesor_id)

    ON DELETE CASCADE

    ON UPDATE CASCADE

) ENGINE=InnoDB;



-- -----------------------------------------------------

-- CLASE_ALUMNO (N:M)

-- -------------------------------------------------------

CREATE TABLE clase_alumno (

  clase_alumno_id INT AUTO_INCREMENT PRIMARY KEY,

  clase_id INT NOT NULL,

  alumno_id INT NOT NULL,

  fecha_union DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (clase_id, alumno_id),

  FOREIGN KEY (clase_id)

    REFERENCES clase(clase_id)

    ON DELETE CASCADE

    ON UPDATE CASCADE,

  FOREIGN KEY (alumno_id)

    REFERENCES alumno(alumno_id)

    ON DELETE CASCADE

    ON UPDATE CASCADE

) ENGINE=InnoDB;



-- -----------------------------------------------------

-- TEST

-- -----------------------------------------------------

CREATE TABLE test (

  test_id INT AUTO_INCREMENT PRIMARY KEY,

  profesor_id INT NOT NULL,

  titulo VARCHAR(200) NOT NULL,

  descripcion TEXT,

  duracion_min INT NOT NULL DEFAULT 60,

  activo ENUM('activa','inactiva') NOT NULL DEFAULT 'activa',

  start_at DATETIME,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (profesor_id)

    REFERENCES profesor(profesor_id)

    ON DELETE CASCADE

    ON UPDATE CASCADE

) ENGINE=InnoDB;



-- -----------------------------------------------------

-- PREGUNTA

-- -----------------------------------------------------

CREATE TABLE pregunta (

  pregunta_id INT AUTO_INCREMENT PRIMARY KEY,

  test_id INT NOT NULL,

  enunciado TEXT NOT NULL,

  feedback TEXT,

  orden SMALLINT NOT NULL DEFAULT 0,

  FOREIGN KEY (test_id)

    REFERENCES test(test_id)

    ON DELETE CASCADE

    ON UPDATE CASCADE

) ENGINE=InnoDB;



-- -----------------------------------------------------

-- OPCION

-- -----------------------------------------------------

CREATE TABLE opcion (

  opcion_id INT AUTO_INCREMENT PRIMARY KEY,

  pregunta_id INT NOT NULL,

  texto VARCHAR(500) NOT NULL,

  es_correcta TINYINT(1) NOT NULL DEFAULT 0,

  letra VARCHAR(2) NOT NULL,

  FOREIGN KEY (pregunta_id)

    REFERENCES pregunta(pregunta_id)

    ON DELETE CASCADE

    ON UPDATE CASCADE

) ENGINE=InnoDB;



-- -----------------------------------------------------

-- RESPUESTA

-- -----------------------------------------------------

CREATE TABLE respuesta (

  respuesta_id INT AUTO_INCREMENT PRIMARY KEY,

  alumno_id INT NOT NULL,

  pregunta_id INT NOT NULL,

  opcion_id INT NOT NULL,

  FOREIGN KEY (alumno_id)

    REFERENCES alumno(alumno_id)

    ON DELETE CASCADE

    ON UPDATE CASCADE,

  FOREIGN KEY (pregunta_id)

    REFERENCES pregunta(pregunta_id)

    ON DELETE CASCADE

    ON UPDATE CASCADE,

  FOREIGN KEY (opcion_id)

    REFERENCES opcion(opcion_id)

    ON DELETE CASCADE

    ON UPDATE CASCADE

) ENGINE=InnoDB;


SET FOREIGN_KEY_CHECKS = 1; 

DROP EVENT IF EXISTS activacion_test_moodle;
CREATE EVENT activacion_test_moodle
ON SCHEDULE EVERY 5 MINUTE
DO
  UPDATE test SET activo = CASE
    WHEN start_at <= NOW() AND NOW() < DATE_ADD(start_at, INTERVAL duracion_min MINUTE) THEN 'activa'
    WHEN NOW() > DATE_ADD(start_at, INTERVAL duracion_min MINUTE) THEN 'inactiva'
    ELSE activo
  END
  WHERE start_at IS NOT NULL;


INSERT INTO usuario (nombre, apellidos, email, password_hash, rol) VALUES
-- Profesores
('Carlos',  'García López',    'carlos.garcia@escuela.com',   '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'profesor'),
('Laura',   'Martínez Ruiz',   'laura.martinez@escuela.com',  '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'profesor'),
('Sergio',  'Fernández Mora',  'sergio.fernandez@escuela.com','9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'profesor'),
-- Alumnos
('Ana',     'López Sánchez',   'ana.lopez@alumno.com',        '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'alumno'),
('Pablo',   'Ramírez Torres',  'pablo.ramirez@alumno.com',    '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'alumno'),
('Marta',   'Jiménez Vega',    'marta.jimenez@alumno.com',    '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'alumno'),
-- Admin
('Admin',   'Sistema',         'admin@escuela.com',           '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'admin');

-- =====================================================
-- PROFESORES
-- =====================================================
INSERT INTO profesor (usuario_id, departamento) VALUES
(1, 'Matemáticas'),
(2, 'Lengua y Literatura'),
(3, 'Historia');

-- =====================================================
-- ALUMNOS
-- =====================================================
INSERT INTO alumno (usuario_id, fecha_nacimiento) VALUES
(4, '2005-03-15'),
(5, '2006-07-22'),
(6, '2005-11-08');

-- =====================================================
-- CLASES (1 por profesor)
-- =====================================================
INSERT INTO clase (profesor_id, nombre, descripcion, codigo_acceso, activa) VALUES
(1, 'Álgebra I',           'Introducción al álgebra lineal y ecuaciones.',     'ALG2025A', 'activa'),
(2, 'Lengua Castellana',   'Gramática, ortografía y comprensión lectora.',      'LEN2025B', 'activa'),
(3, 'Historia Moderna',    'Europa del siglo XV al XVIII.',                     'HIS2025C', 'activa');

-- =====================================================
-- CLASE_ALUMNO (los 3 alumnos en las 3 clases)
-- =====================================================
INSERT INTO clase_alumno (clase_id, alumno_id) VALUES
(1, 1), (1, 2), (1, 3),
(2, 1), (2, 2), (2, 3),
(3, 1), (3, 2), (3, 3);

-- =====================================================
-- TESTS (1 por profesor)
-- =====================================================
INSERT INTO test (profesor_id, titulo, descripcion, duracion_min, activo, start_at) VALUES
(1, 'Test Álgebra Básica',      'Ecuaciones de primer y segundo grado.',    30, 'activa',   '2025-01-10 09:00:00'),
(2, 'Test Gramática',           'Tipos de oraciones y análisis sintáctico.', 45, 'activa',  '2025-01-11 10:00:00'),
(3, 'Test Historia Moderna',    'Renacimiento y Reforma Protestante.',      60, 'inactiva', '2025-01-12 11:00:00');

-- =====================================================
-- PREGUNTAS (3 por test = 9 total)
-- =====================================================
INSERT INTO pregunta (test_id, enunciado, feedback, orden) VALUES
-- Test 1: Álgebra
(1, '¿Cuánto vale x en la ecuación 2x + 4 = 10?',                  'Despeja x restando 4 y dividiendo entre 2.', 1),
(1, '¿Cuál es el resultado de (x+3)(x-3)?',                         'Aplica la identidad notable a²-b².',         2),
(1, '¿Qué tipo de ecuación es x² - 5x + 6 = 0?',                   'Tiene grado 2, por tanto es de 2º grado.',   3),
-- Test 2: Gramática
(2, '¿Qué función cumple el sujeto en una oración?',                'El sujeto realiza la acción del verbo.',      1),
(2, '¿Cuál de estas palabras es un adverbio?',                      'Los adverbios modifican al verbo.',           2),
(2, '¿Qué es un sintagma nominal?',                                 'Grupo de palabras con núcleo sustantivo.',    3),
-- Test 3: Historia
(3, '¿En qué año comenzó la Reforma Protestante?',                  'Lutero publicó sus tesis en 1517.',           1),
(3, '¿Quién pintó la Capilla Sixtina?',                             'Obra del Renacimiento italiano.',             2),
(3, '¿Qué tratado puso fin a las guerras de religión en Alemania?', 'Firmado en 1555.',                            3);

-- =====================================================
-- OPCIONES (4 por pregunta = 36 total)
-- =====================================================
INSERT INTO opcion (pregunta_id, texto, es_correcta, letra) VALUES
-- Pregunta 1
(1, 'x = 2', 0, 'A'),
(1, 'x = 3', 1, 'B'),
(1, 'x = 4', 0, 'C'),
(1, 'x = 5', 0, 'D'),
-- Pregunta 2
(2, 'x² + 9',  0, 'A'),
(2, 'x² - 9',  1, 'B'),
(2, 'x² - 6x', 0, 'C'),
(2, '2x - 9',  0, 'D'),
-- Pregunta 3
(3, 'Lineal',           0, 'A'),
(3, 'De segundo grado', 1, 'B'),
(3, 'Exponencial',      0, 'C'),
(3, 'Cúbica',           0, 'D'),
-- Pregunta 4
(4, 'Modificar al adjetivo',         0, 'A'),
(4, 'Realizar la acción del verbo',  1, 'B'),
(4, 'Complementar al verbo',         0, 'C'),
(4, 'Determinar al sustantivo',      0, 'D'),
-- Pregunta 5
(5, 'Rápido',    1, 'A'),
(5, 'Hermoso',   0, 'B'),
(5, 'Correr',    0, 'C'),
(5, 'Mesa',      0, 'D'),
-- Pregunta 6
(6, 'Grupo con núcleo verbal',        0, 'A'),
(6, 'Grupo con núcleo sustantivo',    1, 'B'),
(6, 'Grupo con núcleo adjetival',     0, 'C'),
(6, 'Grupo con núcleo adverbial',     0, 'D'),
-- Pregunta 7
(7, '1492', 0, 'A'),
(7, '1517', 1, 'B'),
(7, '1534', 0, 'C'),
(7, '1555', 0, 'D'),
-- Pregunta 8
(8, 'Rafael',       0, 'A'),
(8, 'Donatello',    0, 'B'),
(8, 'Miguel Ángel', 1, 'C'),
(8, 'Leonardo',     0, 'D'),
-- Pregunta 9
(9, 'Tratado de Westfalia', 0, 'A'),
(9, 'Paz de Augsburgo',     1, 'B'),
(9, 'Edicto de Nantes',     0, 'C'),
(9, 'Paz de Utrecht',       0, 'D');

-- =====================================================
-- RESPUESTAS (cada alumno responde el test 1 completo)
-- =====================================================
INSERT INTO respuesta (alumno_id, pregunta_id, opcion_id) VALUES
-- Alumno 1 (Ana) - todas correctas
(1, 1, 2), (1, 2, 6), (1, 3, 10),
-- Alumno 2 (Pablo) - mezcla de aciertos y fallos
(2, 1, 1), (2, 2, 6), (2, 3, 9),
-- Alumno 3 (Marta) - todas incorrectas
(3, 1, 1), (3, 2, 5), (3, 3, 9);
