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
  FOREIGN KEY (usuario_id) REFERENCES usuario(usuario_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- ALUMNO
-- -----------------------------------------------------
CREATE TABLE alumno (
  alumno_id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL UNIQUE,
  fecha_nacimiento DATE,
  foto_perfil varchar(255),
  FOREIGN KEY (usuario_id) REFERENCES usuario(usuario_id) ON DELETE CASCADE
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
  FOREIGN KEY (profesor_id) REFERENCES profesor(profesor_id) ON DELETE CASCADE
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
  FOREIGN KEY (clase_id) REFERENCES clase(clase_id) ON DELETE CASCADE,
  FOREIGN KEY (alumno_id) REFERENCES alumno(alumno_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TEST (Banco de Tests)
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
  FOREIGN KEY (profesor_id) REFERENCES profesor(profesor_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- TABLA NUEVA: CLASE_TEST (Para asignar tests a clases)
-- ESTA ES LA QUE TE FALTA PARA EVITAR EL ERROR
-- -----------------------------------------------------
CREATE TABLE clase_test (
    clase_test_id INT AUTO_INCREMENT PRIMARY KEY,
    clase_id INT NOT NULL,
    test_id INT NOT NULL,
    fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (clase_id) REFERENCES clase(clase_id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES test(test_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- PREGUNTA
-- -----------------------------------------------------
CREATE TABLE pregunta (
  pregunta_id INT AUTO_INCREMENT PRIMARY KEY,
  test_id INT NULL,
  enunciado TEXT NOT NULL,
  feedback TEXT,
  orden SMALLINT NOT NULL DEFAULT 0,
  FOREIGN KEY (test_id) REFERENCES test(test_id) ON DELETE CASCADE
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
  FOREIGN KEY (pregunta_id) REFERENCES pregunta(pregunta_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------
-- RESPUESTA
-- -----------------------------------------------------
CREATE TABLE respuesta (
  respuesta_id INT AUTO_INCREMENT PRIMARY KEY,
  alumno_id INT NOT NULL,
  pregunta_id INT NOT NULL,
  opcion_id INT NOT NULL,
  FOREIGN KEY (alumno_id) REFERENCES alumno(alumno_id) ON DELETE CASCADE,
  FOREIGN KEY (pregunta_id) REFERENCES pregunta(pregunta_id) ON DELETE CASCADE,
  FOREIGN KEY (opcion_id) REFERENCES opcion(opcion_id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------
-- DATOS DE PRUEBA
-- -----------------------------------------------------
INSERT INTO usuario (nombre, apellidos, email, password_hash, rol) VALUES
('Carlos', 'García López', 'carlos.garcia@escuela.com', '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'profesor'),
('Laura', 'Martínez Ruiz', 'laura.martinez@escuela.com', '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'profesor'),
('Sergio', 'Fernández Mora', 'sergio.fernandez@escuela.com', '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'profesor'),
('Ana', 'López Sánchez', 'ana.lopez@alumno.com', '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'alumno'),
('Pablo', 'Ramírez Torres', 'pablo.ramirez@alumno.com', '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'alumno'),
('Marta', 'Jiménez Vega', 'marta.jimenez@alumno.com', '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'alumno'),
('Admin', 'Sistema', 'admin@escuela.com', '9250e222c4c71f0c58d4c54b50a880a312e9f9fed55d5c3aa0b0e860ded99165', 'admin');

INSERT INTO profesor (usuario_id, departamento) VALUES (1, 'Matemáticas'), (2, 'Lengua'), (3, 'Historia');
INSERT INTO alumno (usuario_id, fecha_nacimiento) VALUES (4, '2005-03-15'), (5, '2006-07-22'), (6, '2005-11-08');

INSERT INTO clase (profesor_id, nombre, descripcion, codigo_acceso, activa) VALUES
(1, 'Álgebra I', 'Introducción al álgebra lineal.', 'ALG2025A', 'activa');

INSERT INTO test (profesor_id, titulo, descripcion, duracion_min, activo) VALUES
(1, 'Test Álgebra Básica', 'Ecuaciones de primer grado.', 30, 'activa');

-- Ejemplo de asignación manual
INSERT INTO clase_test (clase_id, test_id) VALUES (1, 1);