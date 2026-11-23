-- ============================================
-- COMPLAINT MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Run: mysql -u root -p < schema.sql
-- ============================================

CREATE DATABASE IF NOT EXISTS complaint_db;
USE complaint_db;

-- Drop existing tables (for fresh setup)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS responses;
DROP TABLE IF EXISTS complaints;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- USERS TABLE
CREATE TABLE users (
  user_id    INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(150) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('student','staff','admin') DEFAULT 'student',
  is_active  BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT NOW()
);

-- COMPLAINTS TABLE
CREATE TABLE complaints (
  complaint_id  INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT NOT NULL,
  category      ENUM('Academic','Infrastructure','Hostel','Library','Administration') NOT NULL,
  priority      ENUM('Low','Medium','High') DEFAULT 'Low',
  status        ENUM('Pending','In Progress','Resolved') DEFAULT 'Pending',
  attachment    VARCHAR(300) DEFAULT NULL,
  created_at    DATETIME DEFAULT NOW(),
  updated_at    DATETIME DEFAULT NOW() ON UPDATE NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- RESPONSES TABLE
CREATE TABLE responses (
  response_id  INT AUTO_INCREMENT PRIMARY KEY,
  complaint_id INT NOT NULL,
  admin_id     INT NOT NULL,
  message      TEXT NOT NULL,
  responded_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id)     REFERENCES users(user_id) ON DELETE CASCADE
);

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
  notif_id     INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  complaint_id INT NOT NULL,
  message      TEXT NOT NULL,
  is_read      BOOLEAN DEFAULT FALSE,
  sent_at      DATETIME DEFAULT NOW(),
  FOREIGN KEY (user_id)      REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (complaint_id) REFERENCES complaints(complaint_id) ON DELETE CASCADE
);

-- BUG FIX: Replaced broken hashes with freshly generated correct ones
-- SEED: Default admin account (password: Admin@1234)
INSERT INTO users (name, email, password, role) VALUES
('System Admin', 'admin@college.edu',
 '$2b$10$ap21K7jDI17EIqA937olG.WMlUXnnCZB8m31s0AAQMhkjtHqGAh.u', 'admin');

-- SEED: Sample student account (password: Test@1234)
INSERT INTO users (name, email, password, role) VALUES
('Ravi Kumar', 'ravi@student.edu',
 '$2b$10$oIW2FM8j1pq6zhx4kZv9XuXXeK0hTJmYsswHzPqIGaDMq5fLVGIcS', 'student');
