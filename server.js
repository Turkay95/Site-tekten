require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('better-sqlite3-session-store')(session);
const Database = require('better-sqlite3');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const methodOverride = require('method-override');
const morgan = require('morgan');
const fs = require('fs');
const multer = require('multer');
const { Product, Component, Settings, syncModels } = require('./models');

// Initialisation de l'application
const app = express();

// --- SECURITY HEADERS ---
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// --- RATE LIMITING (Basic) ---
const rateLimit = new Map();
app.use((req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxReq = 1000; // 1000 requests per window

  if (!rateLimit.has(ip)) {
    rateLimit.set(ip, { count: 1, startTime: now });
  } else {
    const data = rateLimit.get(ip);
    if (now - data.startTime > windowMs) {
      rateLimit.set(ip, { count: 1, startTime: now });
    } else {
      data.count++;
      if (data.count > maxReq) {
        return res.status(429).send('Too Many Requests');
      }
    }
  }
  next();
});

// Configuration de la base de données principale (Utilisateurs)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'database.sqlite'),
  logging: false
});

// Modèle Utilisateur
const User = sequelize.define('User', {
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false }
});

// Configuration du moteur de vue
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/admin');

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname)); // pour servir style.css, script.js à la racine
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(morgan('dev'));

// Uploads directory ensure exists
const uploadsDir = path.join(__dirname, 'public', 'uploads');
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (_) { }

// Multer config for images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname).toLowerCase());
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Seules les images (jpg, jpeg, png, gif, webp) sont autorisées'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// --- SESSION CONFIGURATION ---
const sessionDb = new Database(path.join(__dirname, 'sessions.sqlite'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'tekten_secure_secret_key_2024',
  resave: false,
  saveUninitialized: false,
  store: new SQLiteStore({
    client: sessionDb,
    expired: {
      clear: true,
      intervalMs: 900000 // 15 min
    }
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Catégories pour les produits
const PRODUCT_CATEGORIES = ['desktop', 'laptop', 'mobile', 'accessoire'];

// Middleware d'authentification
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/admin/login');
  }
  next();
};

// Routes publiques (site vitrine)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/boutique', (req, res) => res.sendFile(path.join(__dirname, 'boutique.html')));
app.get('/configurateur', (req, res) => res.sendFile(path.join(__dirname, 'configurateur.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'contact.html')));

// Routes d'administration
app.get('/admin/login', (req, res) => {
  if (req.session.userId) return res.redirect('/admin/dashboard');
  res.render('admin/login', { layout: false, error: null, username: '' });
});

app.post('/admin/login', async (req, res) => {
  const { password } = req.body;
  const username = (req.body.username || '').trim();
  try {
    const user = await User.findOne({ where: { username } });
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user.id;
      return res.redirect('/admin/dashboard');
    }
    res.render('admin/login', { layout: false, error: 'Identifiants invalides', username });
  } catch (e) {
    console.error('Erreur de connexion:', e);
    res.render('admin/login', { layout: false, error: 'Une erreur est survenue', username });
  }
});

app.get('/admin/dashboard', requireAuth, async (req, res) => {
  try {
    const [productsCount, componentsCount, recentProducts, settings] = await Promise.all([
      Product.count(),
      Component.count(),
      Product.findAll({ limit: 5, order: [['createdAt', 'DESC']] }),
      Settings.findOne()
    ]);
    res.render('admin/dashboard', { title: 'Tableau de bord', productsCount, componentsCount, recentProducts, settings });
  } catch (e) {
    console.error('Erreur dashboard:', e);
    res.render('admin/dashboard', { title: 'Tableau de bord', productsCount: 0, componentsCount: 0, recentProducts: [], settings: { shopFromDb: true, configFromDb: true } });
  }
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.post('/admin/settings', requireAuth, async (req, res) => {
  try {
    const { shopFromDb, configFromDb } = req.body;
    const row = await Settings.findOne();
    if (row) await row.update({ shopFromDb: !!shopFromDb, configFromDb: !!configFromDb });
    else await Settings.create({ shopFromDb: !!shopFromDb, configFromDb: !!configFromDb });
    res.redirect('/admin/dashboard');
  } catch (e) {
    console.error('Erreur sauvegarde paramètres:', e);
    res.redirect('/admin/dashboard');
  }
});

// API Routes
app.get('/api/settings', async (req, res) => {
  try {
    const s = await Settings.findOne();
    res.json({ shopFromDb: !!(s && s.shopFromDb), configFromDb: !!(s && s.configFromDb) });
  } catch (e) {
    res.json({ shopFromDb: true, configFromDb: true });
  }
});

app.get('/api/shop', async (req, res) => {
  try {
    const items = await Product.findAll({ where: { published: true }, order: [['createdAt', 'DESC']] });
    res.json(items.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price, image: p.image })));
  } catch (e) {
    console.error('API shop error:', e);
    res.status(500).json([]);
  }
});

app.get('/api/config', async (req, res) => {
  try {
    const comps = await Component.findAll({ where: { published: true } });
    const grouped = {};
    comps.forEach(c => {
      const key = (c.type || 'misc').toLowerCase();
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ id: c.id, name: c.name, price: c.price, image: c.image });
    });
    res.json(grouped);
  } catch (e) {
    console.error('API config error:', e);
    res.status(500).json({});
  }
});

// Admin Products Routes
app.get('/admin/products', requireAuth, async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['createdAt', 'DESC']] });
    res.render('admin/products/index', { title: 'Produits', products });
  } catch (e) {
    res.status(500).send('Erreur serveur');
  }
});

app.get('/admin/products/add', requireAuth, (req, res) => {
  res.render('admin/products/add', { title: 'Ajouter un produit', categories: PRODUCT_CATEGORIES });
});

app.post('/admin/products/add', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock, featured } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    await Product.create({
      name, description, price: parseFloat(price), category, image,
      stock: parseInt(stock || '0', 10), featured: !!featured, published: req.body.published === 'on'
    });
    res.redirect('/admin/products');
  } catch (e) {
    res.status(500).send('Erreur serveur');
  }
});

app.get('/admin/products/:id/edit', requireAuth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.redirect('/admin/products');
    res.render('admin/products/edit', { title: 'Modifier un produit', product, categories: PRODUCT_CATEGORIES });
  } catch (e) {
    res.status(500).send('Erreur serveur');
  }
});

app.put('/admin/products/:id', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock, featured } = req.body;
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.redirect('/admin/products');
    let image = product.image;
    if (req.file) {
      if (image) {
        const oldPath = path.join(__dirname, 'public', image);
        if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch (_) { } }
      }
      image = '/uploads/' + req.file.filename;
    }
    await product.update({
      name, description, price: parseFloat(price), category, image,
      stock: parseInt(stock || '0', 10), featured: !!featured, published: req.body.published === 'on'
    });
    res.redirect('/admin/products');
  } catch (e) {
    res.status(500).send('Erreur serveur');
  }
});

app.delete('/admin/products/:id', requireAuth, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (product) {
      if (product.image) {
        const imgPath = path.join(__dirname, 'public', product.image);
        if (fs.existsSync(imgPath)) { try { fs.unlinkSync(imgPath); } catch (_) { } }
      }
      await product.destroy();
    }
    res.redirect('/admin/products');
  } catch (e) {
    res.status(500).send('Erreur serveur');
  }
});

// Admin Components Routes
app.get('/admin/components', requireAuth, async (req, res) => {
  try {
    const components = await Component.findAll({ order: [['createdAt', 'DESC']] });
    res.render('admin/components/index', { title: 'Composants', components });
  } catch (e) {
    res.status(500).send('Erreur serveur');
  }
});

app.get('/admin/components/add', requireAuth, (req, res) => {
  res.render('admin/components/add', { title: 'Ajouter un composant' });
});

app.post('/admin/components/add', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, type, description, price, compatibleWith, stock, brand, weight, material } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    await Component.create({
      name, type, description, price: parseFloat(price), compatibleWith, image,
      stock: parseInt(stock || '0', 10), brand, weight: weight ? parseFloat(weight) : null, material,
      published: req.body.published === 'on'
    });
    res.redirect('/admin/components');
  } catch (e) {
    res.status(500).send('Erreur serveur');
  }
});

app.get('/admin/components/:id/edit', requireAuth, async (req, res) => {
  try {
    const component = await Component.findByPk(req.params.id);
    if (!component) return res.redirect('/admin/components');
    res.render('admin/components/edit', { title: 'Modifier un composant', component });
  } catch (e) {
    res.status(500).send('Erreur serveur');
  }
});

app.put('/admin/components/:id', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, type, description, price, compatibleWith, stock, brand, weight, material } = req.body;
    const component = await Component.findByPk(req.params.id);
    if (!component) return res.redirect('/admin/components');
    let image = component.image;
    if (req.file) {
      if (image) {
        const oldPath = path.join(__dirname, 'public', image);
        if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch (_) { } }
      }
      image = '/uploads/' + req.file.filename;
    }
    await component.update({
      name, type, description, price: parseFloat(price), compatibleWith, image,
      stock: parseInt(stock || '0', 10), brand, weight: weight ? parseFloat(weight) : null, material,
      published: req.body.published === 'on'
    });
    res.redirect('/admin/components');
  } catch (e) {
    res.status(500).send('Erreur serveur');
  }
});

app.delete('/admin/components/:id', requireAuth, async (req, res) => {
  try {
    const component = await Component.findByPk(req.params.id);
    if (component) {
      if (component.image) {
        const imgPath = path.join(__dirname, 'public', component.image);
        if (fs.existsSync(imgPath)) { try { fs.unlinkSync(imgPath); } catch (_) { } }
      }
      await component.destroy();
    }
    res.redirect('/admin/components');
  } catch (e) {
    res.status(500).send('Erreur serveur');
  }
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Une erreur interne est survenue. Veuillez réessayer plus tard.');
});

// Initialisation de la base de données
async function initializeDatabase() {
  try {
    await sequelize.sync();
    await syncModels();
    const adminExists = await User.findOne({ where: { username: 'admin' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({ username: 'admin', password: hashedPassword });
      console.log('Utilisateur admin créé avec le mot de passe: admin123');
    }
    console.log('Base de données initialisée');
  } catch (error) {
    console.error('Erreur d\'initialisation de la base de données:', error);
  }
}

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
  await initializeDatabase();
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Erreur: le port ${PORT} est déjà utilisé.`);
    process.exit(1);
  } else {
    console.error('Erreur serveur non gérée :', err);
  }
});

process.on('SIGINT', () => {
  console.log('Arrêt du serveur...');
  server.close(() => process.exit(0));
});