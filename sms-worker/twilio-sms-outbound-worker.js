require('dotenv').config();
const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const { QueryTypes } = require('sequelize');
const Covid19Sfo = require('./Covid19Sfo.js');

// Database configuration.
const database = process.env.DB_NAME || 'covid19';
const username = process.env.DB_USERNAME || 'postgres';
const password = process.env.DB_PASSWORD || '';
const options = {
  host: process.env.DB_AWS_EC2_IPv4 || 'localhost',
  dialect: process.env.DB_DIALECT || 'postgres',
  port: process.env.DB_PORT || 5432,
};
const table = process.env.DB_TABLE_NAME || 'phone_numbers';

// Self-executing anonymous function.
(async () => {
  try {
    // Connect to the database.
    const sequelize = await require('../database/database.js')(database, username, password, options);

    // Select query the `phone_numbers` table to read all `subscribed` phone numbers.
    const selectQuery = `SELECT e164_format FROM ${table} WHERE subscription_status ~* '^subscribed$'`; // ~* means case insensitive match.
    const phoneNumbers = await sequelize.query(selectQuery, { type: QueryTypes.SELECT });

    // San Francisco COVID-19 data.
    const report = await Covid19Sfo.getReport();

    for (let i = 0; i < phoneNumbers.length; i += 1) {
      twilioClient.messages
        .create({
          to: phoneNumbers[i].e164_format,
          from: process.env.TWILIO_PHONE_NUMBER || '',
          body: JSON.stringify(report, null, 2),
        })
        .then(/* Do nothing. */)
        .catch(console.error);
    }
  } catch (err) {
    console.error(err);
  }
})();
