// utils/upload.js — Multer config for photo + document uploads
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

function makeStorage(folder) {
    return multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(__dirname, '..', 'public', 'uploads', folder);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, `${folder.replace('/','-')}-${Date.now()}${ext}`);
        }
    });
}

const imageFilter = (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only JPG/PNG images allowed'));
};
const docFilter = (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only PDF/JPG/PNG allowed'));
};

exports.photoUpload = multer({ storage: makeStorage('employees'), fileFilter: imageFilter, limits: { fileSize: 2*1024*1024 } });
exports.docUpload   = multer({ storage: makeStorage('documents'), fileFilter: docFilter,  limits: { fileSize: 5*1024*1024 } });
