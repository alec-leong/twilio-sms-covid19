require('dotenv').config();
const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const PhoneNumbers = require('./model.js');
const port = process.env.PORT || 3000;
const homepage = process.env.HOMEPAGE || `http://localhost:${port}/`;

/**
 * Function description here.
 * @function
 * @param {Object} phoneRecord - Description here.
 * @param {string} phoneRecord.country_code - Description here.
 * @param {string} phoneRecord.identification_code - Description here.
 * @param {string} phoneRecord.subscriber_number - Description here.
 * @param {string} phoneRecord.e164_format - Description here.
 * @param {Object} res - Description here.
 */
const insertPhoneRecord = async (phoneRecord, res) => {
  // const copyPhoneRecord = { ...phoneRecord };
  // copyPhoneRecord.confirmation_code = md5(phoneRecord.e164_format).toString();

  try {
    const user = await PhoneNumbers.create(phoneRecord/* copyPhoneRecord */);
    twilioClient.messages
      .create({
        to: user.e164_format,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: 'Reply YES to subscribe. Reply STOP to unsubscribe. Msg&Data Rates May Apply.',
      })
      .then((message) => console.log(message));
    res.send({ message: 'Pending subscription.' });
  } catch (err) {
    console.error(err);

    if (err.name === 'SequelizeUniqueConstraintError' || err.parent.code === '23505') { // `e164_format` field must be unique.
      const existingUser = await PhoneNumbers.findByPk(phoneRecord.e164_format);

      // const subscriptionStatus = err.errors[0].instance.dataValues.subscription_status;

      if (/^pending$/i.test(existingUser.subscription_status)) {
        twilioClient.messages
          .create({
            to: user.e164_format,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: 'Reply YES to subscribe. Reply STOP to unsubscribe. Msg&Data Rates May Apply.',
          })
          .then((message) => console.log(message));
        res.status(500).send({ message: 'Pending subscription.' });
      } else if (/^subscribed$/i.test(existingUser.subscription_status)) {
        twilioClient.messages
          .create({
            to: user.e164_format,
            from: process.env.TWILIO_PHONE_NUMBER,
            body: `You have successfully subscribed to messages from this number. Reply STOP to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`,
          })
          .then((message) => console.log(message));
        res.status(500).send({ message: 'Already subscribed.' });
      } else {
        res.status(500).send({ message: 'An unexpected error occurred on a send.' });
      }
    } else {
      res.status(500).send({ message: `${err}` });
    }
  }
};

const query = {
  insertPhoneRecord,
};

module.exports = query;
