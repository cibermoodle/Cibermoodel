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

-- -----------------------------------------------------

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