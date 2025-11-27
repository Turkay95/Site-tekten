const { Component, sequelize } = require('../models');
const https = require('https');

const BASE_URL = 'https://raw.githubusercontent.com/docyx/pc-part-dataset/main/data/json';

const COMPONENTS = [
    { file: 'cpu.json', type: 'cpu', image: 'https://cdn-icons-png.flaticon.com/512/2432/2432797.png' },
    { file: 'video-card.json', type: 'gpu', image: 'https://cdn-icons-png.flaticon.com/512/1288/1288497.png' },
    { file: 'motherboard.json', type: 'motherboard', image: 'https://cdn-icons-png.flaticon.com/512/2432/2432720.png' },
    { file: 'memory.json', type: 'ram', image: 'https://cdn-icons-png.flaticon.com/512/2432/2432750.png' },
    { file: 'internal-hard-drive.json', type: 'storage', image: 'https://cdn-icons-png.flaticon.com/512/2432/2432768.png' },
    { file: 'power-supply.json', type: 'psu', image: 'https://cdn-icons-png.flaticon.com/512/2432/2432822.png' },
    { file: 'case.json', type: 'case', image: 'https://cdn-icons-png.flaticon.com/512/2432/2432735.png' },
    { file: 'cpu-cooler.json', type: 'cooling', image: 'https://cdn-icons-png.flaticon.com/512/2432/2432808.png' }
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

async function seed() {
    try {
        await sequelize.sync({ force: true }); // Force recreate tables to ensure schema is correct
        console.log('Database synced. Starting seed...');

        for (const comp of COMPONENTS) {
            console.log(`Fetching ${comp.type} from ${comp.file}...`);
            try {
                const data = await fetchJson(`${BASE_URL}/${comp.file}`);
                console.log(`Found ${data.length} items for ${comp.type}. Inserting...`);

                let count = 0;
                for (const item of data) {
                    if (!item.price) continue; // Skip items without price

                    // Extract socket/compatibility info if available
                    let socket = null;
                    if (comp.type === 'cpu' && item.socket) socket = item.socket;
                    if (comp.type === 'motherboard' && item.socket_cpu) socket = item.socket_cpu;

                    // Construct description from key specs
                    let description = '';
                    if (comp.type === 'cpu') description = `${item.core_count} Cores, ${item.core_clock} GHz`;
                    else if (comp.type === 'gpu') description = `${item.chipset}, ${item.memory} GB`;
                    else if (comp.type === 'ram') description = `${item.speed}, ${item.modules}`;
                    else if (comp.type === 'storage') description = `${item.capacity}, ${item.type}`;
                    else description = item.name;

                    await Component.create({
                        name: item.name,
                        type: comp.type,
                        description: description || item.name,
                        price: item.price,
                        image: comp.image, // Use placeholder for now
                        stock: 10, // Default stock
                        brand: item.manufacturer || item.name.split(' ')[0],
                        specs: item, // Store full specs
                        socket: socket,
                        published: true
                    });
                    count++;
                    if (count >= 50) break; // Limit to 50 items per category for now to save time/space
                }
                console.log(`Inserted ${count} ${comp.type}s.`);
            } catch (e) {
                console.error(`Error processing ${comp.type}:`, e.message);
            }
        }

        console.log('Seeding complete!');
        process.exit(0);
    } catch (e) {
        console.error('Fatal error:', e);
        process.exit(1);
    }
}

seed();
