const { Component, sequelize } = require('../models');
const https = require('https');

const BASE_URL = 'https://raw.githubusercontent.com/docyx/pc-part-dataset/main/data/json';

const FILES = [
    'cpu.json', 'video-card.json', 'motherboard.json', 'memory.json',
    'internal-hard-drive.json', 'power-supply.json', 'case.json', 'cpu-cooler.json'
];

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function updatePrices() {
    try {
        await sequelize.authenticate();
        console.log('Database connected. Starting price update...');

        for (const file of FILES) {
            console.log(`Fetching ${file}...`);
            try {
                const data = await fetchJson(`${BASE_URL}/${file}`);
                console.log(`Processing ${data.length} items...`);

                let updatedCount = 0;
                for (const item of data) {
                    if (!item.price || !item.name) continue;

                    // Find component by name
                    const component = await Component.findOne({ where: { name: item.name } });
                    if (component) {
                        // Update price if changed
                        if (component.price !== item.price) {
                            component.price = item.price;
                            await component.save();
                            updatedCount++;
                        }
                    }
                }
                console.log(`Updated prices for ${updatedCount} items in ${file}.`);
            } catch (e) {
                console.error(`Error processing ${file}:`, e.message);
            }
        }

        console.log('Price update complete!');
        process.exit(0);
    } catch (e) {
        console.error('Fatal error:', e);
        process.exit(1);
    }
}

updatePrices();
