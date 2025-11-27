const { Product, sequelize } = require('../models');

const products = [
    { name: "PC Gamer Starter", category: "desktop", price: 999, image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=500", description: "PC Gamer idéal pour débuter avec des performances solides pour le 1080p.", stock: 10, published: true },
    { name: "MacBook Air M2", category: "laptop", price: 1199, image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500", description: "Léger, silencieux et puissant. La référence des ultraportables.", stock: 15, published: true },
    { name: "iPhone 15", category: "mobile", price: 969, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500", description: "Le dernier iPhone avec Dynamic Island et USB-C.", stock: 20, published: true },
    { name: "Samsung S24 Ultra", category: "mobile", price: 1159, image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500", description: "L'expérience Android ultime avec stylet intégré.", stock: 8, published: true },
    { name: "Asus ROG Zephyrus", category: "laptop", price: 2499, image: "https://images.unsplash.com/photo-1531297461136-82lw9z2l19?w=500", description: "Puissance brute dans un châssis fin. Pour les gamers exigeants.", stock: 5, published: true },
    { name: "Clavier Mécanique", category: "accessoire", price: 129, image: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=500", description: "Switches rouges linéaires pour une frappe précise et silencieuse.", stock: 50, published: true }
];

async function migrate() {
    try {
        await sequelize.sync();
        console.log('Database synced.');

        for (const p of products) {
            const exists = await Product.findOne({ where: { name: p.name } });
            if (!exists) {
                await Product.create(p);
                console.log(`Created: ${p.name}`);
            } else {
                console.log(`Skipped (exists): ${p.name}`);
            }
        }
        console.log('Migration completed.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
