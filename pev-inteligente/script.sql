-- Banco demonstrativo: locais e leituras são fictícios, exceto a Praça da República usada como referência cartográfica.
CREATE DATABASE IF NOT EXISTS smartwaste CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartwaste;
CREATE TABLE IF NOT EXISTS containers (
 id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 name VARCHAR(100) NOT NULL,
 address VARCHAR(200) NOT NULL,
 lat DECIMAL(10,7) NOT NULL,
 lng DECIMAL(10,7) NOT NULL,
 level TINYINT UNSIGNED NOT NULL,
 capacity_l INT UNSIGNED NOT NULL DEFAULT 1000,
 battery TINYINT UNSIGNED NOT NULL,
 signal_dbm SMALLINT NOT NULL,
 temperature_c DECIMAL(5,2) NULL,
 tilt BOOLEAN NOT NULL DEFAULT FALSE,
 vibration BOOLEAN NOT NULL DEFAULT FALSE,
 online BOOLEAN NOT NULL DEFAULT TRUE,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT chk_level CHECK (level BETWEEN 0 AND 100),
 CONSTRAINT chk_battery CHECK (battery BETWEEN 0 AND 100)
);
INSERT INTO containers (id,name,address,lat,lng,level,capacity_l,battery,signal_dbm,temperature_c,tilt,vibration,online,updated_at)
VALUES
 (1,'PEV Centro','Praça da República, Centro',-21.1355937,-48.9737280,45,1000,92,-87,29.1,0,0,1,NOW()),
 (2,'PEV São Francisco','Bairro São Francisco, Catanduva',-21.1490000,-48.9880000,87,1000,74,-101,31.5,0,1,1,NOW()),
 (3,'PEV Jardim Soto','Jardim Soto, Catanduva',-21.1215000,-48.9615000,23,1000,38,-96,27.8,0,0,1,NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);
