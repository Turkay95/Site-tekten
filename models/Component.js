const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Cadre', 'Roue', 'Pneu', 'Frein', 'Dérailleur', 'Pédalier', 'Selle', 'Guidon', 'Pédale', 'Autre']
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  compatibleWith: [{
    type: String,
    enum: ['VTT', 'Ville', 'Route', 'Enfant']
  }],
  image: String,
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  brand: {
    type: String,
    required: true
  },
  weight: {
    type: Number,
    min: 0
  },
  material: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour les recherches par nom, type et marque
componentSchema.index({ name: 'text', type: 1, brand: 1 });

module.exports = mongoose.model('Component', componentSchema);
