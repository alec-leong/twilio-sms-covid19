const axios = require('axios');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const express = require('express');
const next = require('next');
const morgan = require('morgan');
const twilio = require('twilio');
const { Op } = require('sequelize'); // Sequelize Operator to create more complex comparisons.
const PhoneNumbers = require('../database/model.js'); // Sequelize PhoneNumbers Model.

// Next.js application configuration.
const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

const homepage = process.env.HOMEPAGE || `http://localhost:${port}/`;

// Twilio client.
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// TwiML™ Message.
const { MessagingResponse } = twilio.twiml;

/**
 * An anonymous and asynchronous function that returns an array where the first element is type
 * `boolean` and the second element is type `undefined` or `object`. The first element determines if
 * an E.164 phone number is a mobile and US phone number. The second element determines if an error
 * was thrown by the Twilio client.
 * @async
 * @param {string} phoneNumber - A E.164 phone number.
 * @returns {Array} The first element is type `boolean` and evaluates to `true` if an  E.164 phone
 * number is a mobile and US phone number. Otherwise `false`. The second element may evaluate to
 * `undefined` if no error thrown by the Twilio client or evaluate to an error `object` if error
 * thrown by Twilio client.
 */
const verifyPhoneNumber = async (phoneNumber) => {
  try {
    const phoneNumberLookup = await twilioClient.lookups.phoneNumbers(phoneNumber).fetch({ type: ['carrier'] });
    return [phoneNumberLookup.carrier.type === 'mobile' && phoneNumberLookup.countryCode === 'US'];
  } catch (err) {
    return [false, err];
  }
};

/**
 * An anonymous function to send outbound SMS text delivery.
 * @param {string} e164PhoneNumber - A E.164 phone number.
 * @param {string} body - The SMS message.
 */
const sendSMSOutbound = (e164PhoneNumber, body) => {
  twilioClient.messages
    .create({
      to: e164PhoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      body,
    })
    .then((message) => console.log(message));
};

nextApp.prepare().then(() => {
  const app = express(); // Express.js application.

  app.use(cors()); // Enable CORS.
  app.use(bodyParser.urlencoded({ extended: false })); /* Parse the URL-encoded data with the
                                                          querystring library. */
  app.use(bodyParser.json()); // Parse incoming request bodies to JSON under `req.body`.
  app.use(compression()); // Compress response bodies.
  app.use(morgan('dev')); // HTTP request logger.

  // Next.js server-side rendering GET route.
  app.get('*', (req, res) => handle(req, res));

  // React.js application API POST route.
  app.post('/sms-form', async (req, res) => {
    const { phoneRecord, captchaResponse } = req.body;

    try {
      /**
       * Google reCAPTCHA API POST request to verifying the user's reCAPTCHA challenge response. On
       * OK request, the response is type object. On BAD request, throws error.
       * For more info, visit https://developers.google.com/recaptcha/docs/verify
       * @type {Object}
       */
      const reCaptchaSiteVerifyRes = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        params: {
          secret: process.env.reCAPTCHA_SECRET_KEY,
          response: captchaResponse,
        },
      });

      // Unpack `data` property from Google reCAPTCHA API response object.
      const { data } = reCaptchaSiteVerifyRes;

      /**
       * Reference to Google reCAPTCHA API response object's `data` property.
       * @type {Object}
       * @property {boolean} success `true` if . Otherwise, `false`.
       * @property {timestamp} challenge_ts The timestamp of the challenge load (ISO format
       * yyyy-MM-dd'T'HH:mm:ssZZ).
       * @property {string} hostname The hostname of the site where the reCAPTCHA was solved.
       * @property {Array} error-codes Optional.
       */
      const reCaptchaChallenge = data;

      // BAD reCAPTCHA challenge.
      if (!reCaptchaChallenge.success) {
        res.status(500).send({ message: 'Invalid response to reCAPTCHA challenge.' });
        return;
      }
    } catch (err) {
      // BAD Google reCAPTCHA API request.
      console.error(err);
      res.status(500).send({ message: `${err}` });
      return;
    }

    // Check if user's phone number is a mobile and US phone number,.
    const [isValid, err] = await verifyPhoneNumber(phoneRecord.e164_format);

    // Handle invalid phone number.
    if (!isValid) {
      if (err) {
        res.status(500).send({ message: `${err}` });
      } else {
        res.status(500).send({ message: 'Expected: \'US\' country code and \'mobile\' phone number.' });
      }

      return;
    }

    /* Now that a phone number is verified, find a row that matches the query, or build and save the
       row if none is found. */
    const [user, isCreated] = await PhoneNumbers.findOrCreate({
      where: {
        e164_format: phoneRecord.e164_format,
        subscription_status: {
          [Op.iRegexp]: '^(pending|subscribed)$', // Not case-sensitive.
        },
      },
      defaults: phoneRecord,
    });

    // Handle new user or pending subscription.
    if (isCreated || /^pending$/i.test(user.subscription_status)) {
      sendSMSOutbound(user.e164_format, `Reply CONFIRM to subscribe. Reply EXIT to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
      res.status(500).send({ message: 'Pending subscription.' });
    } else { // Handle user already existed and subscribed.
      sendSMSOutbound(user.e164_format, `You have successfully subscribed to messages from this number. Reply EXIT to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
      res.send({ message: 'You have successfully subscribed to messages.' });
    }
  });

  // Twilio SMS application API POST route.
  app.post('/sms-inbound', async (req, res) => {
    const twiml = new MessagingResponse();

    // Check if user's phone number is a mobile and US phone number,.
    const [isValid, err] = await verifyPhoneNumber(req.body.From);

    // Handle invalid phone number.
    if (!isValid) {
      if (err) {
        twiml.message(`${err}`);
      } else {
        twiml.message('Expected\n{\n\tcountryCode: \'US\',\n\tcarrier: {\n\t\ttype: \'mobile\'\n\t}\n}');
      }

      res.writeHead(200, { 'Content-Type': 'text/xml' });
      res.end(twiml.toString());
      return; /* `return` statement is required. Otherwise, `UnhandledPromiseRejectionWarning: Error
                 [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client`. */
    }

    // Handle inbound SMS body that matches `enter` case insensitive.
    if (/^enter$/i.test(req.body.Body)) {
      // Search for a single instance by its primary key.
      const user = await PhoneNumbers.findByPk(req.body.From);

      // Handle user found.
      if (user !== null) {
        // Handle user found and `pending` case insensitive subscription status.
        if (/^pending$/i.test(user.subscription_status)) {
          // Update the user to `subscribed`.
          await PhoneNumbers.update({ subscription_status: 'subscribed' }, {
            where: {
              e164_format: user.e164_format,
            },
          });
        }
      } else { // Handle user not found.
        // Create the user.
        await PhoneNumbers.create({
          country_code: '1',
          identification_code: req.body.From.slice(2, 5),
          subscriber_number: req.body.From.slice(5),
          e164_format: req.body.From,
          subscription_status: 'subscribed',
        });
      }

      twiml.message(`You have successfully subscribed to messages from this number. Reply EXIT to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
    } else if (/^confirm$/i.test(req.body.Body)) { // Handle inbound SMS body that matches `confirm` case insensitive.
      // Search for a single instance by its primary key.
      const user = await PhoneNumbers.findByPk(req.body.From);

      // Handle user found.
      if (user !== null) {
        // Update the user to `subscribed`.
        if (/^pending$/i.test(user.subscription_status)) {
          await PhoneNumbers.update({ subscription_status: 'subscribed' }, {
            where: {
              e164_format: user.e164_format,
            },
          });
        }

        twiml.message(`You have successfully subscribed to messages from this number. Reply EXIT to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
      } else { // Handle user not found.
        twiml.message(`Reply ENTER to subscribe.\n\n${homepage}`);
      }
    } else if (/^exit$/i.test(req.body.Body)) { // Handle inbound SMS body that matches `exit` case insensitive.
      // Delete a row that matches the query.
      await PhoneNumbers.destroy({
        where: {
          e164_format: req.body.From,
        },
        limit: 1,
        force: true, /* If set to `true` then execute `DELETE FROM "posts" WHERE "e164_format" =
                        'E164PhoneNumber' LIMIT 1`.

                        If set to `false` (default) then execute `DELETE FROM "phone_numbers" WHERE
                        "e164_format" IN (SELECT "e164_format" FROM "phone_numbers" WHERE "e164_
                        format" = 'E164PhoneNumber' LIMIT 1)`. */
      });
      twiml.message(`You have successfully been unsubscribed. You will not receive any more messages from this number. Reply ENTER to resubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
    } else {
      twiml.message(`An unexpected error occurred on a send. Reply ENTER to subscribe. Reply EXIT to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
    }

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  });

  app.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
