require('dotenv').config();
const { Sequelize } = require('sequelize');

const database = process.env.DB_NAME || 'covid19';
const username = process.env.DB_USERNAME || 'postgres';
const password = process.env.DB_PASSWORD || '';
let sequelize;

// Connect to the database.
try {
  sequelize = new Sequelize(database, username, password, {
    host: process.env.DB_HOST || 'localhost',
    dialect: process.env.DB_DIALECT || 'postgres',
    port: process.env.DB_PORT || 5432,
  });
} catch (err) {
  console.error(err);
  process.exit(1);
}

// Self-executing anonymous function.
(async () => {
  // Test if the connection is OK.
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
  } catch (err) {
    console.error('Unable to connect to the database:', err);
    process.exit(1);
  }
})();

module.exports = sequelize;
