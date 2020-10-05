import axios from 'axios';
import Head from 'next/head';
import React from 'react';

/**
 * Creates a JSX component representing the index page.
 * @class
 * @member {Object} state The component's internal state.
 * @member {Object} phoneRegex A regular expression of the US national phone number format.
 * @member {Array} fields An array of strings where each element represents a database field.
 * @member {function} clearForm A method to reset the component's state object.
 * @member {function} handleChange A method to handle input change actions in the DOM.
 * @member {function} handleSubmit A method to handle form submit action in the DOM.
 */
class IndexPage extends React.Component {
  /**
   * Constructor. Having a constructor is mandatory to invoke `super()` because `IndexPage` is a
   * subclass of `React.Component`.
   * @constructor
   * @param {Object} props Stands for properties.
   */
  constructor(props) {
    // Invoke `super(props)`. Otherwise, accessing `this.props` will evaluate to `undefined`.
    super(props);

    this.phoneRegex = RegExp(/^\([0-9]{3}\)\s{1}[0-9]{3}-[0-9]{4}$/);
    this.fields = ['country_code', 'identification_code', 'subscriber_number', 'e164_format'];
    this.state = {
      phoneNumber: '',
      formMessage: {
        message: '',
        textColor: '',
      },
    };

    this.clearForm = this.clearForm.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  /**
   * Sets `<html lang="en">` and  `body { font-family: "Open Sans", sans-serif; }`.
   */
  componentDidMount() {
    document.documentElement.setAttribute('lang', 'en');
    document.body.setAttribute('style', 'font-family: "Open Sans", sans-serif;');
  }

  /**
   * Resets the component's state object.
   */
  clearForm() {
    this.setState({
      phoneNumber: '',
      formMessage: {
        message: '',
        textColor: '',
      },
    });
  }

  /**
   * Update the component's state object.
   * @param {Object} event Represents an event triggered by the user input change action in the DOM.
   * @param {Object} event.target A reference to the object onto which the event was dispatched.
   * @param {string} event.target.name A reference to an HTML element's `name` attribute's value.
   * @param {string} event.target.value A reference to an HTML element's `value` attribute's value.
   */
  handleChange(event) {
    const { name, value } = event.target;

    this.setState({
      [name]: value,
    });
  }

  /**
   * Prevents page refresh. Checks if reCAPTCHA token exists. If reCAPTCHA token exists then check
   * if user phone number input is valid. If reCAPTCHA token exists and phone number is valid, send
   * POST request to server at `/sms-form` route. Handles OK request and BAD request from server.
   * @async
   * @param {Object} event Represents an event triggered by the user form submit action in the DOM.
   */
  async handleSubmit(event) {
    // Prevent page refresh.
    event.preventDefault();

    /**
     * The response for the first reCAPTCHA widget created.
     * @type {string}
     * Note: `grecaptcha` is defined from loaded google-recaptcha CDN script.
     */
    const captchaResponse = grecaptcha.getResponse();

    // Handle empty reCAPTCHA response string.
    if (!captchaResponse) {
      this.setState({
        formMessage: {
          message: 'Please complete the captcha below.',
          textColor: '#F22F46', // Twilio Red
        },
      });
      return;
    }

    // US national formated phone number.
    const { phoneNumber } = this.state;

    // Handle valid phone number format.
    if (this.phoneRegex.test(phoneNumber)) {
      // Initialize `phoneRecord` object.
      const phoneRecord = { country_code: '1', subscription_status: 'pending' };
      // Create a regular expression to find a sequence of numbers in phone number.
      const decodePhoneNumber = /\d{1,}/g;
      // Create an array to store each sequence of numbers in phone number.
      const partitionedPhoneNumber = [];
      // Search for a sequence of numbers in the specified string `phoneNumber`.
      let results = decodePhoneNumber.exec(phoneNumber);
      while (results) {
        partitionedPhoneNumber.push(results[0]);
        results = decodePhoneNumber.exec(phoneNumber);
      }
      /* `partitionedPhoneNumber` example:
      ┌─────────┬────────┐
      │ (index) │ Values │
      ├─────────┼────────┤
      │    0    │ '415'  │
      │    1    │ '123'  │
      │    2    │ '4567' │
      └─────────┴────────┘ */
      // Add key-value pairs to `phoneRecord` object.
      [phoneRecord.identification_code] = [...partitionedPhoneNumber];
      phoneRecord.subscriber_number = partitionedPhoneNumber[1] + partitionedPhoneNumber[2];
      phoneRecord.e164_format = '+' + phoneRecord.country_code + phoneRecord.identification_code 
        + phoneRecord.subscriber_number;

      // POST request to server. Add `phoneRecord` and captchaResponse` to `req.body`.
      axios.post('/sms-form', { phoneRecord, captchaResponse })
        .then((res) => {
          const { message } = res.data;

          // Modify state to print message to webpage.
          this.setState({
            formMessage: {
              message,
              textColor: '#008000', // Green color hex code.
            },
          });
        })
        .catch((err) => {
          // Remove client-side terminal logging. Instead, print error message to webpage.
          // console.error(err);

          // Nested object destructuring and aliasing.
          const { response: { data: { message } } } = err;

          // Modify state to print error message to webpage.
          this.setState({
            formMessage: {
              message,
              textColor: '#F22F46', // Twilio Red
            },
          });
        })
        .finally(() => {
          grecaptcha.reset(); // Invoke the `reset` method to reset the reCAPTCHA widget.
        });
    }
  }

  /**
   * Renders `<IndexPage />`.
   */
  render() {
    const { phoneNumber, formMessage } = this.state;
    return (
      <>
        <Head>
          <meta charSet="UTF-8" />
          <title>COVID-19 SF, CA</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta
            name="description"
            content="Twilio Programmable SMS API COVID-19 City
                    of San Francisco, CA React.js application."
          />
          <meta name="theme-color" content="#0D122B" />
          <link rel="apple-touch-icon" href="/covid-19-cell.png" />
          <link rel="icon" href="/favicon.ico" />
          <link rel="manifest" href="/manifest.webmanifest" />
          <link rel="preconnect" href="https://fonts.googleapis.com/" crossOrigin="true" />
          <link rel="prefetch" href="https://fonts.googleapis.com/css2?family=Open+Sans" crossOrigin="true" />
        </Head>
        <div className="sms-container">
          <fieldset>
            <legend className="header2">City of San Francisco COVID-19 SMS Text Delivery Sign-up Form</legend>
            <form className="form-container" onSubmit={this.handleSubmit}>
              <label htmlFor="phone" className="phone-label">Enter your phone number:</label>
              <input type="text" id="phone" className="phone-input" name="phoneNumber" placeholder="(123) 456-7890" pattern="\([0-9]{3}\)\s{1}[0-9]{3}-[0-9]{4}" minLength="14" maxLength="14" autoComplete="on" onChange={this.handleChange} value={phoneNumber} required />
              <input type="reset" className="clear-input" value="Clear" onClick={this.clearForm} />
              <input type="submit" className="submit-input" value="Submit" />
              <small className="phone-format-small">US National Format: (123) 456-7890</small>
              {formMessage.message
                ? <p className="form-message-paragraph" style={{ color: formMessage.textColor }}>{formMessage.message}</p>
                : ''}
              <div className="g-recaptcha" data-sitekey={process.env.NEXT_PUBLIC_reCAPTCHA_SITE_KEY} data-theme="dark" />
              <img src="/twilio-badge-red.475897ec8.svg" className="twilio-img" alt="twilio badge" />
            </form>
          </fieldset>
          <script type="text/javascript" src="https://www.google.com/recaptcha/api.js" async defer />
          <script type="text/javascript" src="/service-worker.js" />
          <script type="text/javascript" src="/register-sw.js" />
        </div>
        <style jsx>{`
          .sms-container {
            background-color: #0D122B; /* Twilio Blue */
            display: grid;
          }
          fieldset {
            border: 2px solid #F22F46; /* Twilio Red */
            background-color: #0D122B; /* Twilio Blue */
            color: #FFFFFF;
            margin: 8px 8px 8px 8px;
          }
          .phone-label {
            grid-area: phone-label;
          }
          .phone-input {
            grid-area: phone-input;
          }
          .submit-input {
            grid-area: submit-input;
          }
          .clear-input {
            grid-area: clear-input;
          }
          .phone-format-small {
            grid-area: phone-format-small;
          }
          .form-message-paragraph {
            grid-area: form-message-paragraph;
            font-weight: bold;
          }
          .twilio-img {
            grid-area: twilio-img;
            width: 100%;
            height: auto;
          }
          .header2 {
            font-size: 1.5em;
            font-weight: bolder;
          }
          .g-recaptcha {
            grid-area: g-recaptcha;
          }
          .form-container {
            display: grid;
            grid-gap: 8px 8px;
            grid-template: auto / fit-content(157px) fit-content(75px) fit-content(75px);
            grid-template-areas: 
              "phone-label phone-label ."
              "phone-input clear-input submit-input"
              "phone-format-small phone-format-small ."
              "form-message-paragraph form-message-paragraph form-message-paragraph"
              "g-recaptcha g-recaptcha g-recaptcha"
              "twilio-img twilio-img twilio-img";
            justify-content: center;
          }
      `}</style>
      </>
    );
  }
}

export default IndexPage;
