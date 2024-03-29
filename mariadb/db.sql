-- sudo docker exec -it mariadb mariadb -u root -p

CREATE DATABASE chzzk_replay;

USE chzzk_replay;

CREATE TABLE `channel` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `profile` varchar(500),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `profile` (`profile`)
);

CREATE TABLE `fragment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `channel_id` varchar(255) NOT NULL,
  `url` varchar(500) NOT NULL,
  `type` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `program_datetime` varchar(255) NOT NULL,
  `extinf` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `url` (`url`),
  KEY `channel_id` (`channel_id`),
  CONSTRAINT `channel_id` FOREIGN KEY (`channel_id`) REFERENCES `channel` (`id`) ON DELETE CASCADE
);

ALTER TABLE channel MODIFY COLUMN profile varchar(500);
