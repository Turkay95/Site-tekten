const { Component, sequelize } = require('../models');

async function fixSockets() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        const components = await Component.findAll();
        console.log(`Found ${components.length} components.`);

        for (const comp of components) {
            let socket = null;
            const specs = comp.specs || {};

            if (comp.type === 'cpu') {
                const arch = specs.microarchitecture || '';
                if (arch.includes('Zen 5') || arch.includes('Zen 4')) socket = 'AM5';
                else if (arch.includes('Zen 3') || arch.includes('Zen 2')) socket = 'AM4';
                else if (arch.includes('Raptor Lake') || arch.includes('Alder Lake')) socket = 'LGA1700';
                else if (arch.includes('Arrow Lake')) socket = 'LGA1851';
            } else if (comp.type === 'motherboard') {
                socket = specs.socket;
            }

            if (socket) {
                // Update both the top-level socket field and ensure it's in specs
                const newSpecs = { ...specs, socket };
                await comp.update({ socket, specs: newSpecs });
                console.log(`Updated ${comp.name} -> Socket: ${socket}`);
            }
        }

        console.log('Socket fix completed.');
    } catch (error) {
        console.error('Error fixing sockets:', error);
    } finally {
        await sequelize.close();
    }
}

fixSockets();
