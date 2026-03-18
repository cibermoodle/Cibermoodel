use plataforma_educativa;

--------------------------------------------------------------
-- Evento actualización estado tests (activa -  inactiva)
--------------------------------------------------------------

DELIMITER //
DROP EVENT IF EXISTS activacion_test_moodle //
CREATE EVENT activacion_test_moodle
ON SCHEDULE EVERY 5 MINUTE 
DO
BEGIN
UPDATE test SET activo = 'activa'  WHERE start_at <= current_timestamp() AND current_timestamp() < (DATE_ADD(start_at, INTERVAL duracion_min MINUTE)) AND activo != 'activa' LIMIT 100;
UPDATE test SET activo = 'inactiva'  WHERE start_at <= current_timestamp() AND current_timestamp() > (DATE_ADD(start_at, INTERVAL duracion_min MINUTE)) AND activo != 'inactiva' LIMIT 100;
END //
DELIMITER ;