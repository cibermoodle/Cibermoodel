-- =====================================================
-- MIGRACIÓN: BANCO DE PREGUNTAS REUTILIZABLE
-- =====================================================

USE plataforma_educativa;

-- =====================================================
-- BANCO DE PREGUNTAS REUTILIZABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS banco_pregunta (
  banco_pregunta_id INT AUTO_INCREMENT PRIMARY KEY,
  profesor_id INT NOT NULL,
  enunciado TEXT NOT NULL,
  tipo_pregunta ENUM('opcion_multiple', 'verdadero_falso', 'respuesta_corta') NOT NULL DEFAULT 'opcion_multiple',
  categoria VARCHAR(100),
  dificultad ENUM('fácil', 'media', 'difícil') DEFAULT 'media',
  feedback TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (profesor_id)
    REFERENCES profesor(profesor_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX idx_profesor (profesor_id),
  INDEX idx_categoria (categoria)
) ENGINE=InnoDB;



CREATE TABLE IF NOT EXISTS banco_pregunta_opcion (
  banco_opcion_id INT AUTO_INCREMENT PRIMARY KEY,
  banco_pregunta_id INT NOT NULL,
  texto VARCHAR(500) NOT NULL,
  es_correcta TINYINT(1) NOT NULL DEFAULT 0,
  letra VARCHAR(2) NOT NULL,
  orden SMALLINT NOT NULL DEFAULT 0,
  FOREIGN KEY (banco_pregunta_id)
    REFERENCES banco_pregunta(banco_pregunta_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;



-- Tabla para vincular preguntas del banco a tests
CREATE TABLE IF NOT EXISTS test_banco_pregunta (
  test_banco_id INT AUTO_INCREMENT PRIMARY KEY,
  test_id INT NOT NULL,
  banco_pregunta_id INT NOT NULL,
  orden SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (test_id, banco_pregunta_id),
  FOREIGN KEY (test_id)
    REFERENCES test(test_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  FOREIGN KEY (banco_pregunta_id)
    REFERENCES banco_pregunta(banco_pregunta_id)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB;
