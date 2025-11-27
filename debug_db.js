const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
});

const Component = sequelize.define('Component', {
    name: DataTypes.STRING,
    type: DataTypes.STRING,
    specs: DataTypes.JSON,
    socket: DataTypes.STRING
});

async function run() {
    try {
        await sequelize.authenticate();

        const mobos = await Component.findAll({ where: { type: 'motherboard' }, limit: 1 });
        if (mobos.length > 0) {
            console.log('Motherboard Specs Keys:', Object.keys(mobos[0].specs));
            console.log('Motherboard Memory Type:', mobos[0].specs.memory_type);
        }

        const cpus = await Component.findAll({ where: { type: 'cpu' }, limit: 1 });
        if (cpus.length > 0) {
            console.log('CPU Specs Keys:', Object.keys(cpus[0].specs));
            console.log('CPU TDP:', cpus[0].specs.tdp);
        }

        const gpus = await Component.findAll({ where: { type: 'gpu' }, limit: 1 });
        if (gpus.length > 0) {
            console.log('GPU Specs Keys:', Object.keys(gpus[0].specs));
            console.log('GPU TDP:', gpus[0].specs.tdp);
        }

        const rams = await Component.findAll({ where: { type: 'ram' }, limit: 1 });
        if (rams.length > 0) {
            console.log('RAM Specs Keys:', Object.keys(rams[0].specs));
            console.log('RAM Type:', rams[0].specs.type); // Check if it's 'type' or something else
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

run();
