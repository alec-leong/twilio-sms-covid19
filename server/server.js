const axios = require('axios');
const bodyParser = require('body-parser');
const compression = require('compression');
const cors = require('cors');
const express = require('express');
const next = require('next');
const morgan = require('morgan');

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const homepage = process.env.HOMEPAGE || `http://localhost:${port}/`;

// TwiML™ Message.
const MessagingResponse = require('twilio').twiml.MessagingResponse;

// PhoneNumbers Model.
const { Op } = require('sequelize');
const PhoneNumbers = require('../database/model.js');
const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const verifyPhoneNumber = async (phoneNumber) => {
  try {
    const phoneNumberLookup = await twilioClient.lookups.phoneNumbers(phoneNumber).fetch({ type: ['carrier'] });
    return [phoneNumberLookup.carrier.type === 'mobile' && phoneNumberLookup.countryCode === 'US'];
  } catch (err) {
    return [false, err];
  }
};

const sendSMSOutbound = (e164PhoneNumber, body) => {
  twilioClient.messages
    .create({
      to: e164PhoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER,
      body,
    })
    .then((message) => console.log(message));
};

app.prepare().then(() => {
  const server = express();

  server.use(cors());
  server.use(bodyParser.urlencoded({ extended: false }));
  server.use(bodyParser.json());
  server.use(compression());
  server.use(morgan('dev'));

  server.post('/sms-form', async (req, res) => {
    const { phoneRecord, captchaResponse } = req.body;

    try {
      const reCaptchaSiteVerifyRes = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        params: {
          secret: process.env.reCAPTCHA_SECRET_KEY,
          response: captchaResponse,
        },
      });

      const { data: reCaptchaChallenge } = reCaptchaSiteVerifyRes;

      if (!reCaptchaChallenge.success) {
        res.status(500).send({ message: 'Invalid response to reCAPTCHA challenge.' });
        return;
      }
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: `${err}` });
      return;
    }

    const [isValid, err] = await verifyPhoneNumber(phoneRecord.e164_format);

    if (!isValid) {
      if (err) {
        res.status(500).send({ message: `${err}` });
      } else {
        res.status(500).send({ message: 'Expected: \'US\' country code and \'mobile\' phone number.' });
      }

      return;
    }

    const [user, isCreated] = await PhoneNumbers.findOrCreate({
      where: {
        e164_format: phoneRecord.e164_format,
        subscription_status: {
          [Op.iRegexp]: '^(pending|subscribed)$', // Not case-sensitive.
        },
      },
      defaults: phoneRecord,
    });

    if (isCreated || /^pending$/i.test(user.subscription_status)) {
      sendSMSOutbound(user.e164_format, `Reply CONFIRM to subscribe. Reply EXIT to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
      res.status(500).send({ message: 'Pending subscription.' });
    } else {
      sendSMSOutbound(user.e164_format, `You have successfully subscribed to messages from this number. Reply EXIT to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
      res.send({ message: 'You have successfully subscribed to messages.' });
    }
  });

  server.post('/sms-inbound', async (req, res) => {
    const twiml = new MessagingResponse();
    const [isValid, err] = await verifyPhoneNumber(req.body.From);

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

    if (/^enter$/i.test(req.body.Body)) {
      const user = await PhoneNumbers.findByPk(req.body.From);

      if (user !== null) {
        if (/^pending$/i.test(user.subscription_status)) {
          await PhoneNumbers.update({ subscription_status: 'subscribed' }, {
            where: {
              e164_format: user.e164_format,
            },
          });
        }
      } else {
        await PhoneNumbers.create({
          country_code: '1',
          identification_code: req.body.From.slice(2, 5),
          subscriber_number: req.body.From.slice(5),
          e164_format: req.body.From,
          subscription_status: 'subscribed',
        });
      }

      twiml.message(`You have successfully subscribed to messages from this number. Reply EXIT to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
    } else if (/^confirm$/i.test(req.body.Body)) {
      const user = await PhoneNumbers.findByPk(req.body.From);

      if (user !== null) {
        if (/^pending$/i.test(user.subscription_status)) {
          await PhoneNumbers.update({ subscription_status: 'subscribed' }, {
            where: {
              e164_format: user.e164_format,
            },
          });
        }

        twiml.message(`You have successfully subscribed to messages from this number. Reply EXIT to unsubscribe. Msg&Data Rates May Apply.\n\n${homepage}`);
      } else {
        twiml.message(`Reply ENTER to subscribe.\n\n${homepage}`);
      }
    } else if (/^exit$/i.test(req.body.Body)) {
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

  server.get('*', (req, res) => handle(req, res));

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
