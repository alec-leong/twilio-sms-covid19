const { Sequelize } = require('sequelize');

/**
 * Returns an entry point to sequelize if OK connection to a database. Otherwise, will throw an
 * error.
 * @async
 * @function
 * @throws Will throw an error if BAD connection to a database.
 * @param {string} database - The name of the database
 * @param {string} username - The username which is used to authenticate against the database.
 * @param {string} password - The password which is used to authenticate against the database.
 * @param {Object} options - An object with options.
 * @param {string} options.host - The host of the relational database.
 * @param {string} options.dialect - The dialect of the database you are connecting to. One of
 * mysql, postgres, sqlite and mssql.
 * @param {number} options.port - The port of the relational database.
 * @returns {Object} The entry point to sequelize.
 */
module.exports = async (database, username, password, options) => {
  // Connect to the database.
  const sequelize = new Sequelize(database, username, password, options);
  // Test if the connection is OK.
  await sequelize.authenticate();
  console.log('Connection has been established successfully.');
  return sequelize;
};
