const multer = require('multer');

// Memory storage — the file buffer goes straight to R2, never touches disk.
// Fine at this document library's expected scale (menus, policies, brochures);
// revisit if uploads start regularly approaching the 10MB cap.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
            return cb(new Error('Only PDF files are allowed'));
        }
        cb(null, true);
    },
});

module.exports = upload;