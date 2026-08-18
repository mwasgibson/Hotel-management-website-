-- CMS-owned website content.
-- Run this once against the hotel_management database.

CREATE TABLE IF NOT EXISTS content (
    id INT NOT NULL AUTO_INCREMENT,
    page VARCHAR(100) NOT NULL,
    section VARCHAR(100) NOT NULL,
    content_key VARCHAR(150) NOT NULL,
    content_value LONGTEXT NULL,
    content_type ENUM('text', 'number', 'boolean', 'json') NOT NULL DEFAULT 'text',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_content_page_section_key (page, section, content_key),
    KEY idx_content_page (page),
    KEY idx_content_page_section (page, section)
);
