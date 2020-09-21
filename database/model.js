require('dotenv').config();
const { DataTypes, Model } = require('sequelize');
const sequelize = require('./database.js');

class PhoneNumbers extends Model {}

PhoneNumbers.init({
  // Model attributes are defined here.
  country_code: {
    type: DataTypes.STRING(3), // VARCHAR(1)
    allowNull: false,
    validate: {
      is: /^\d{1,3}$/, // Matches this RegExp.
      notIn: [['0']], // Check the value is not one of these.
    },
  },
  identification_code: {
    type: DataTypes.STRING(4),
    allowNull: false,
    validate: {
      is: /^\d{1,4}$/,
    },
  },
  subscriber_number: {
    type: DataTypes.STRING(11),
    allowNull: false,
    validate: {
      is: /^\d{1,11}$/,
    },
  },
  e164_format: {
    type: DataTypes.STRING(16),
    primaryKey: true,
    validate: {
      is: /^\+\d{3,15}$/,
    },
  },
  confirmation_code: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      is: /^[a-zA-Z0-9]+$/,
    },
  },
  subscription_status: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: {
      is: /^(pending|subscribed)$/i,
    },
  },
}, {
  // Other model options go here.
  // indexes: [
  //   // A BTREE index
  //   {
  //     name: 'phone_numbers_confirmation_code_idx',
  //     using: 'BTREE',
  //     fields: [
  //       'confirmation_code',
  //     ],
  //   },
  // ],
  sequelize, // We need to pass the connection instance.
  tableName: process.env.DB_TABLE_NAME || 'phone_numbers', //  Tell Sequelize the name of the table directly.
  freezeTableName: true, // Enforcing the table name to be equal to the model name.
  timestamps: false, /* Disabled Sequelize automatically adds the fields `createdAt` and `updatedAt`
                        to model. */
});

module.exports = PhoneNumbers;
