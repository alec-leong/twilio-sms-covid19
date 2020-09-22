import axios from 'axios';
import Head from 'next/head';
import React from 'react';

class IndexPage extends React.Component {
  constructor(props) {
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

  componentDidMount() {
    document.body.setAttribute('style', 'font-family: "Open Sans", sans-serif;');
  }

  clearForm() {
    this.setState({
      phoneNumber: '',
      formMessage: {
        message: '',
        textColor: '',
      },
    });
  }

  handleChange(event) {
    const { name, value } = event.target;

    this.setState({
      [name]: value,
    });
  }

  async handleSubmit(event) {
    event.preventDefault();

    const { phoneNumber } = this.state;

    if (this.phoneRegex.test(phoneNumber)) {
      const phoneRecord = { country_code: '1', subscription_status: 'pending' };
      const decodePhoneNumber = /\d{1,}/g;
      const partitionedPhoneNumber = [];
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
      [phoneRecord.identification_code] = [...partitionedPhoneNumber];
      phoneRecord.subscriber_number = partitionedPhoneNumber[1] + partitionedPhoneNumber[2];
      phoneRecord.e164_format = '+' + phoneRecord.country_code + phoneRecord.identification_code 
        + phoneRecord.subscriber_number;
      axios.post('/sms-form', { phoneRecord })
        .then((res) => {
          const { message } = res.data;

          this.setState({
            formMessage: {
              message,
              textColor: '#008000', // Green color hex code.
            },
          });
        })
        .catch((err) => {
          console.error(err);
          // Nested object destructuring.
          const { response: { data: { message } } } = err;

          this.setState({
            formMessage: {
              message,
              textColor: '#F22F46',
            },
          });
        });
    }
  }

  render() {
    const { phoneNumber, formMessage } = this.state;
    return (
      <div>
        <Head>
          <meta charSet="UTF-8" />
          <title>Title</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta
            name="description"
            content="Twilio Programmable SMS API COVID-19 City
                    of San Francisco, CA React.js application."
          />
          <link rel="apple-touch-icon" href="/covid-19-cell.png" />
          <link rel="icon" href="/favicon.ico" />
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
              <img src="https://www.twilio.com/docs/static/company/img/badges/red/twilio-badge-red.ace22c16f.png" className="twilio-img" alt="twilio badge" />
            </form>
          </fieldset>
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
            height: 64px;
            width: 240px;
          }
          .header2 {
            font-size: 1.5em;
            font-weight: bolder;
          }
          .form-container {
            display: grid;
            grid-gap: 8px 8px;
            grid-template: auto / 157px 75px 75px auto;
            grid-template-areas: 
              "phone-label phone-label ."
              "phone-input clear-input submit-input"
              "phone-format-small phone-format-small ."
              "form-message-paragraph form-message-paragraph ."
              "twilio-img twilio-img .";
            justify-content: center;
          }
      `}</style>
      </div>
    );
  }
}

export default IndexPage;
