const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

(async () => {
  const newPassword = process.argv[2] || 'admin123';
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'database.sqlite'),
    logging: false
  });

  const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }
  });

  try {
    await sequelize.sync();
    const hashed = await bcrypt.hash(newPassword, 10);
    const existing = await User.findOne({ where: { username: 'admin' } });
    if (existing) {
      existing.password = hashed;
      await existing.save();
      console.log('Mot de passe admin mis à jour.');
    } else {
      await User.create({ username: 'admin', password: hashed });
      console.log('Utilisateur admin créé.');
    }
    console.log(`Identifiants: admin / ${newPassword}`);
  } catch (e) {
    console.error('Erreur de réinitialisation:', e);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
