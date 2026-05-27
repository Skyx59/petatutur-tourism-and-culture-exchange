CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('Superadmin', 'Turis', 'Penyedia Jasa') NOT NULL,
    status ENUM('pending', 'approved') DEFAULT 'pending',
    specific_data JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS narratives (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    media_path VARCHAR(255),
    approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS itineraries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tourist_id INT NOT NULL,
    route_data JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tourist_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Seed Default Superadmin
-- Password should be hashed in a real application
INSERT INTO users (name, email, password, role, status) 
VALUES ('Super Admin', 'admin@petatutur.com', 'admin123', 'Superadmin', 'approved')
ON DUPLICATE KEY UPDATE email=email;
