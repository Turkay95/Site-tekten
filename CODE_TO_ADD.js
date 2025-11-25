// AJOUTEZ CES LIGNES DANS server.js APRÈS LA LIGNE 384 (après app.delete('/admin/components/:id'...))

// Admin Featured Products Routes
app.get('/admin/featured', requireAuth, async (req, res) => {
    try {
        const products = await Product.findAll({ order: [['featured', 'DESC'], ['createdAt', 'DESC']] });
        res.render('admin/featured', { title: 'Derniers Arrivages', products });
    } catch (e) {
        console.error('Erreur featured:', e);
        res.status(500).send('Erreur serveur');
    }
});

app.post('/admin/products/:id/featured', requireAuth, async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Produit non trouvé' });
        }
        product.featured = !product.featured;
        await product.save();
        res.json({ success: true, featured: product.featured });
    } catch (e) {
        console.error('Erreur toggle featured:', e);
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});
