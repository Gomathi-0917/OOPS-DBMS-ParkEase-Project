CREATE TABLE IF NOT EXISTS tickets (
 ticket_no BIGINT PRIMARY KEY AUTO_INCREMENT, plate VARCHAR(20) NOT NULL,
 owner VARCHAR(120) NOT NULL, type VARCHAR(10) NOT NULL, slot INT NOT NULL,
 entry_time DATETIME NOT NULL, exit_time DATETIME NULL, hours INT NULL, charge DECIMAL(10,2) NULL,
 UNIQUE KEY uq_active_plate (plate, exit_time)
);
