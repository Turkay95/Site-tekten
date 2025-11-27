const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../database.sqlite'),
  logging: false
});

// Modèle Produit
const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  image: { type: DataTypes.STRING },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  featured: { type: DataTypes.BOOLEAN, defaultValue: false },
  published: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// Modèle Composant
const Component = sequelize.define('Component', {
  name: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  compatibleWith: { type: DataTypes.STRING },
  image: { type: DataTypes.STRING },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  brand: { type: DataTypes.STRING },
  weight: { type: DataTypes.FLOAT },
  material: { type: DataTypes.STRING },
  socket: { type: DataTypes.STRING },
  specs: { type: DataTypes.JSON },
  published: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// Paramètres du site (unique row)
const Settings = sequelize.define('Settings', {
  shopFromDb: { type: DataTypes.BOOLEAN, defaultValue: true },
  configFromDb: { type: DataTypes.BOOLEAN, defaultValue: true }
});

// Synchronisation des modèles
async function syncModels() {
  try {
    await sequelize.sync({ alter: true });
    console.log('Modèles synchronisés avec la base de données');
    // Ensure default settings row exists
    const count = await Settings.count();
    if (count === 0) {
      await Settings.create({ shopFromDb: true, configFromDb: true });
    }
  } catch (error) {
    console.error('Erreur de synchronisation des modèles:', error);
  }
}

module.exports = {
  sequelize,
  Product,
  Component,
  Settings,
  syncModels
};