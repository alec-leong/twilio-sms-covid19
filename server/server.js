const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const express = require('express');
const next = require('next');
const morgan = require('morgan');
const twilio = require('twilio');
const query = require('../database/query.js');
const PhoneNumbers = require('../database/model.js');

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const { MessagingResponse } = twilio.twiml;
const port = process.env.PORT || 3000;
const homepage = process.env.HOMEPAGE || `http://localhost:${port}/`;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

/**
 * Twilio Lookup API to perform mobile phone number validation and formatting without the need for
 * RegEx.
 * @function
 * @param {string} phoneNumber - A E.164 phone number.
 * @returns {boolean} Returns `true` if `phoneNumber` is a valid mobile phone number. Otherwise,
 * `false`.
 */
const verifyPhoneNumber = async (phoneNumber) => {
  try {
    const phoneNumberLookUp = await twilioClient.lookups
      .phoneNumbers(phoneNumber)
      .fetch({ type: ['carrier'] });
    return phoneNumberLookUp.carrier.type === 'mobile';
  } catch (err) {
    console.error(err);
    return false;
  }
};

app.prepare().then(() => {
  const server = express();

  server.use(cors());
  server.use(bodyParser.urlencoded({ extended: false }));
  server.use(bodyParser.json());
  server.use(compression());
  server.use(morgan('dev'));

  server.post('/sms-form', async (req, res) => {
    const { phoneRecord } = req.body;

    try {
      const isValid = await verifyPhoneNumber(phoneRecord.e164_format);

      if (isValid) {
        query.insertPhoneRecord(phoneRecord, res);
      } else {
        res.status(500).send({ message: 'Invalid mobile phone number.' });
      }
    } catch (err) {
      console.error(err);

      res.status(500).send({ message: `${err.message}` });
    }
  });

  server.post('/sms-inbound', async (req, res) => {
    /** Creates a new instance of the `TwiML™ Message` */
    const twiml = new MessagingResponse();

    if (/^\s*yes\s*$/i.test(req.body.Body)) {
      /* The `findByPk` method obtains only a single entry from the table, using the provided
         primary key. */
      const user = await PhoneNumbers.findByPk(req.body.From);

      if (user) { // Equivalent to: user !== null
        if (/^pending$/i.test(user.subscription_status)) { // A user's phone number is not yet subscribed.
          /* UPDATE phone_numbers
             SET subscription_status='subscribed'
             WHERE e164_format=user.e164_format; */
          await PhoneNumbers.update({ subscription_status: 'subscribed' }, {
            where: {
              e164_format: user.e164_format,
            },
          });

          twiml.message(`You have successfully subscribed to messages from this number. Reply STOP to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
        } else { // A user's phone number is already subscribed.
          twiml.message(`You have successfully subscribed to messages from this number. Reply STOP to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
        }
      } else { // Equivalent to: user === null
        twiml.message(`Reply START to subscribe.\n\n${homepage}`);
      }
    } else if (/^\s*stop\s*$/i.test(req.body.Body)) {
      const user = await PhoneNumbers.findByPk(req.body.From);

      if (user) { // Equivalent to: user !== null
        await PhoneNumbers.destroy({
          where: {
            e164_format: user.e164_format,
          },
          limit: 1,
        });
      } else { // Equivalent to: user === null
        twiml.message(`Reply START to subscribe.\n\n${homepage}`);
      }
    } else if (/^\s*start\s*$/i.test(req.body.Body)) {
      if (req.body.FromCountry === 'US') { // `FromCountry` - The country of the called sender.
        try {
          await PhoneNumbers.create({
            country_code: '1',
            identification_code: req.body.Body.slice(2, 5),
            subscriber_number: req.body.Body.slice(5),
            e164_format: req.body.Body,
            subscription_status: 'subscribed',
          });
        } catch (err) {
          const subscriptionStatus = err.errors[0].instance.dataValues.subscription_status;

          if (/^subscribed$/i.test(subscriptionStatus)) {
            twiml.message(`You have successfully subscribed to messages from this number. Reply STOP to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
          } else {
            twiml.message(`An unexpected error occurred on a send. Msg&Data Rates May Apply.\n\n${homepage}`);
          }
        } // end try-catch
      } else { // Not a US mobile number.
        twiml.message(`An unexpected error occurred on a send. Msg&Data Rates May Apply.\n\n${homepage}`);
      }
    } else {
      twiml.message(`Reply START to subscribe.\n\n${homepage}`);
    }

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  });

  server.get('*', (req, res) => handle(req, res));

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
