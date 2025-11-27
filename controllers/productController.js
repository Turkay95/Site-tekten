const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Afficher tous les produits
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render('admin/products/index', { products });
  } catch (error) {
    console.error('Erreur lors de la récupération des produits:', error);
    res.status(500).send('Erreur serveur');
  }
};

// Afficher le formulaire d'ajout
const showAddForm = (req, res) => {
  const categories = ['VTT', 'Ville', 'Route', 'Enfant', 'Accessoire'];
  res.render('admin/products/add', { categories });
};

// Ajouter un nouveau produit
const addProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, featured, published } = req.body;

    const productData = {
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock, 10),
      featured: featured === 'on',
      isVisible: published === 'on',
      image: req.file ? `/uploads/${req.file.filename}` : ''
    };

    await Product.create(productData);
    req.flash('success', 'Produit ajouté avec succès');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Erreur lors de l\'ajout du produit:', error);
    if (req.file) {
      await unlinkAsync(path.join(__dirname, '../public', req.file.path));
    }
    req.flash('error', 'Erreur lors de l\'ajout du produit');
    res.redirect('/admin/products/add');
  }
};

// Afficher le formulaire de modification
const showEditForm = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      req.flash('error', 'Produit non trouvé');
      return res.redirect('/admin/products');
    }
    const categories = ['VTT', 'Ville', 'Route', 'Enfant', 'Accessoire'];
    res.render('admin/products/edit', { product, categories });
  } catch (error) {
    console.error('Erreur lors de la récupération du produit:', error);
    req.flash('error', 'Erreur lors de la récupération du produit');
    res.redirect('/admin/products');
  }
};
// Mettre à jour un produit
const updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, featured, published } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      req.flash('error', 'Produit non trouvé');
      return res.redirect('/admin/products');
    }

    const updateData = {
      name,
      description,
      price: parseFloat(price),
      category,
      stock: parseInt(stock, 10),
      featured: featured === 'on',
      isVisible: published === 'on'
    };

    // Si une nouvelle image est téléchargée
    if (req.file) {
      // Supprimer l'ancienne image si elle existe
      if (product.image) {
        const oldImagePath = path.join(__dirname, '../public', product.image);
        if (fs.existsSync(oldImagePath)) {
          await unlinkAsync(oldImagePath);
        }
      }
      updateData.image = `/uploads/${req.file.filename}`;
    }

    await Product.findByIdAndUpdate(req.params.id, updateData);
    req.flash('success', 'Produit mis à jour avec succès');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Erreur lors de la mise à jour du produit:', error);
    if (req.file) {
      await unlinkAsync(path.join(__dirname, '../public', req.file.path));
    }
    req.flash('error', 'Erreur lors de la mise à jour du produit');
    res.redirect(`/admin/products/${req.params.id}/edit`);
  }
};

// Supprimer un produit
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      req.flash('error', 'Produit non trouvé');
      return res.redirect('/admin/products');
    }

    // Supprimer l'image associée
    if (product.image) {
      const imagePath = path.join(__dirname, '../public', product.image);
      if (fs.existsSync(imagePath)) {
        await unlinkAsync(imagePath);
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    req.flash('success', 'Produit supprimé avec succès');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Erreur lors de la suppression du produit:', error);
    req.flash('error', 'Erreur lors de la suppression du produit');
    res.redirect('/admin/products');
  }
};

// Basculer la visibilité d'un produit
const toggleVisibility = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    product.isVisible = !product.isVisible;
    await product.save();

    res.json({ success: true, isVisible: product.isVisible });
  } catch (error) {
    console.error('Erreur lors du changement de visibilité:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  getAllProducts,
  showAddForm,
  addProduct,
  showEditForm,
  updateProduct,
  deleteProduct,
  toggleVisibility
};
