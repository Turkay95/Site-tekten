const Component = require('../models/Component');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlinkAsync = promisify(fs.unlink);

// Types de composants disponibles
const componentTypes = [
  'Cadre', 'Roue', 'Pneu', 'Frein', 'Dérailleur', 
  'Pédalier', 'Selle', 'Guidon', 'Pédale', 'Autre'
];

// Vélos compatibles
const compatibleBikes = ['VTT', 'Ville', 'Route', 'Enfant'];

// Afficher tous les composants
const getAllComponents = async (req, res) => {
  try {
    const components = await Component.find().sort({ type: 1, name: 1 });
    res.render('admin/components/index', { components });
  } catch (error) {
    console.error('Erreur lors de la récupération des composants:', error);
    res.status(500).render('error', { message: 'Erreur serveur' });
  }
};

// Afficher le formulaire d'ajout
const showAddForm = (req, res) => {
  res.render('admin/components/add', { 
    componentTypes, 
    compatibleBikes 
  });
};

// Ajouter un nouveau composant
const addComponent = async (req, res) => {
  try {
    const { 
      name, 
      type, 
      description, 
      price, 
      compatibleWith, 
      brand, 
      weight, 
      material, 
      stock 
    } = req.body;

    // Gérer le cas où compatibleWith est une chaîne unique ou un tableau
    const compatibleArray = Array.isArray(compatibleWith) 
      ? compatibleWith 
      : compatibleWith ? [compatibleWith] : [];

    const componentData = {
      name,
      type,
      description,
      price: parseFloat(price),
      compatibleWith: compatibleArray,
      brand,
      stock: parseInt(stock, 10) || 0,
      image: req.file ? `/uploads/${req.file.filename}` : ''
    };

    // Ajouter des champs optionnels s'ils sont fournis
    if (weight) componentData.weight = parseFloat(weight);
    if (material) componentData.material = material;

    await Component.create(componentData);
    req.flash('success', 'Composant ajouté avec succès');
    res.redirect('/admin/components');
  } catch (error) {
    console.error('Erreur lors de l\'ajout du composant:', error);
    if (req.file) {
      await unlinkAsync(path.join(__dirname, '../public', req.file.path));
    }
    req.flash('error', 'Erreur lors de l\'ajout du composant');
    res.redirect('/admin/components/add');
  }
};

// Afficher le formulaire de modification
const showEditForm = async (req, res) => {
  try {
    const component = await Component.findById(req.params.id);
    if (!component) {
      req.flash('error', 'Composant non trouvé');
      return res.redirect('/admin/components');
    }
    
    res.render('admin/components/edit', { 
      component, 
      componentTypes, 
      compatibleBikes 
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du composant:', error);
    req.flash('error', 'Erreur lors de la récupération du composant');
    res.redirect('/admin/components');
  }
};

// Mettre à jour un composant
const updateComponent = async (req, res) => {
  try {
    const { 
      name, 
      type, 
      description, 
      price, 
      compatibleWith, 
      brand, 
      weight, 
      material, 
      stock 
    } = req.body;

    const component = await Component.findById(req.params.id);
    
    if (!component) {
      req.flash('error', 'Composant non trouvé');
      return res.redirect('/admin/components');
    }

    // Gérer le cas où compatibleWith est une chaîne unique ou un tableau
    const compatibleArray = Array.isArray(compatibleWith) 
      ? compatibleWith 
      : compatibleWith ? [compatibleWith] : [];

    const updateData = {
      name,
      type,
      description,
      price: parseFloat(price),
      compatibleWith: compatibleArray,
      brand,
      stock: parseInt(stock, 10) || 0
    };

    // Ajouter des champs optionnels s'ils sont fournis
    if (weight) updateData.weight = parseFloat(weight);
    if (material) updateData.material = material;

    // Si une nouvelle image est téléchargée
    if (req.file) {
      // Supprimer l'ancienne image si elle existe
      if (component.image) {
        const oldImagePath = path.join(__dirname, '../public', component.image);
        if (fs.existsSync(oldImagePath)) {
          await unlinkAsync(oldImagePath);
        }
      }
      updateData.image = `/uploads/${req.file.filename}`;
    }

    await Component.findByIdAndUpdate(req.params.id, updateData);
    req.flash('success', 'Composant mis à jour avec succès');
    res.redirect('/admin/components');
  } catch (error) {
    console.error('Erreur lors de la mise à jour du composant:', error);
    if (req.file) {
      await unlinkAsync(path.join(__dirname, '../public', req.file.path));
    }
    req.flash('error', 'Erreur lors de la mise à jour du composant');
    res.redirect(`/admin/components/${req.params.id}/edit`);
  }
};

// Supprimer un composant
const deleteComponent = async (req, res) => {
  try {
    const component = await Component.findById(req.params.id);
    
    if (!component) {
      req.flash('error', 'Composant non trouvé');
      return res.redirect('/admin/components');
    }

    // Supprimer l'image associée
    if (component.image) {
      const imagePath = path.join(__dirname, '../public', component.image);
      if (fs.existsSync(imagePath)) {
        await unlinkAsync(imagePath);
      }
    }

    await Component.findByIdAndDelete(req.params.id);
    req.flash('success', 'Composant supprimé avec succès');
    res.redirect('/admin/components');
  } catch (error) {
    console.error('Erreur lors de la suppression du composant:', error);
    req.flash('error', 'Erreur lors de la suppression du composant');
    res.redirect('/admin/components');
  }
};

module.exports = {
  getAllComponents,
  showAddForm,
  addComponent,
  showEditForm,
  updateComponent,
  deleteComponent
};
