const bcrypt = require('bcryptjs');

// Vérifie si l'utilisateur est authentifié
const isAuthenticated = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.redirect('/admin/login');
};

// Affiche le formulaire de connexion
const showLogin = (req, res) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { error: null });
};

// Traite la tentative de connexion
const login = async (req, res) => {
  const { password } = req.body;
  
  try {
    // Vérifier le mot de passe (dans un cas réel, il faudrait vérifier contre une base de données)
    const isMatch = await bcrypt.compare(password, process.env.ADMIN_PASSWORD);
    
    if (isMatch) {
      // Créer une session
      req.session.isAuthenticated = true;
      req.session.save(() => {
        res.redirect('/admin/dashboard');
      });
    } else {
      res.render('admin/login', { error: 'Mot de passe incorrect' });
    }
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).render('admin/login', { error: 'Une erreur est survenue' });
  }
};

// Déconnexion
const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erreur lors de la déconnexion:', err);
    }
    res.redirect('/admin/login');
  });
};

module.exports = {
  isAuthenticated,
  showLogin,
  login,
  logout
};
