const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const productController = require('../controllers/productController');
const componentController = require('../controllers/componentController');
const multer = require('multer');
const path = require('path');

// Configuration de Multer pour le téléchargement de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées (jpeg, jpg, png, gif)'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// Middleware pour les messages flash
router.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  next();
});

// Routes de connexion
router.get('/login', authController.showLogin);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// Middleware pour protéger les routes d'administration
router.use(authController.isAuthenticated);

// Tableau de bord
router.get('/dashboard', (req, res) => {
  res.render('admin/dashboard');
});

// Routes pour les produits
router.get('/products', productController.getAllProducts);
router.get('/products/add', productController.showAddForm);
router.post('/products/add', upload.single('image'), productController.addProduct);
router.get('/products/:id/edit', productController.showEditForm);
router.put('/products/:id', upload.single('image'), productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);

// Routes pour les composants
router.get('/components', componentController.getAllComponents);
router.get('/components/add', componentController.showAddForm);
router.post('/components/add', upload.single('image'), componentController.addComponent);
router.get('/components/:id/edit', componentController.showEditForm);
router.put('/components/:id', upload.single('image'), componentController.updateComponent);
router.delete('/components/:id', componentController.deleteComponent);

module.exports = router;
