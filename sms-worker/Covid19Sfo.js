const axios = require('axios');
const moment = require('moment');

class Covid19Sfo {
  // Private static fields. 
  static #url = 'https://data.sfgov.org/resource/tvq9-ec9w.json';
  static #headersOptions = {
    'Access-Control-Allow-Origin': '*',
  };
  static #startDate = '';
  static #endDate = '';

  // Private static methods.
  static #getStartDate = async () => {
    const response = await axios.get(Covid19Sfo.#url, {
      headers: Covid19Sfo.#headersOptions,
      params: {
        $query: 'SELECT specimen_collection_date AS end_date ORDER BY specimen_collection_date ASC LIMIT 1',
      },
    });
  
    return moment(response.data[0].end_date).format('YYYY-MM-DD'); // Do not modify the `format` method argument.
  };

  static #getEndDate = async () => {
    const response = await axios.get(Covid19Sfo.#url, {
      headers: Covid19Sfo.#headersOptions,
      params: {
        $query: 'SELECT specimen_collection_date AS end_date ORDER BY specimen_collection_date DESC LIMIT 1',
      },
    });
  
    return moment(response.data[0].end_date).format('YYYY-MM-DD'); // Do not modify the `format` method argument.
  };

  static #getNewCases = async (endDate) => {
    const response = await axios.get(Covid19Sfo.#url, {
      headers: Covid19Sfo.#headersOptions,
      params: {
        $query: `SELECT SUM(case_count) as new_cases WHERE specimen_collection_date='${endDate}'`,
      },
    });
  
    return Number.parseInt(response.data[0].new_cases, 10);;
  };

  static #getTotalCases = async () => {
    const response = await axios.get(Covid19Sfo.#url, {
      headers: Covid19Sfo.#headersOptions,
      params: {
        $query: 'SELECT SUM(case_count) AS total_cases',
      },
    });
  
    return Number.parseInt(response.data[0].total_cases, 10);
  }

  static #getTotalDeaths = async () => {
    const response = await axios.get(Covid19Sfo.#url, {
      headers: Covid19Sfo.#headersOptions,
      params: {
        $query: "SELECT COUNT(case_disposition) AS total_deaths WHERE case_disposition='Death'",
      },
    });
  
    return Number.parseInt(response.data[0].total_deaths, 10);
  };
  
  static #setDates = async () => {
    if (!Covid19Sfo.#startDate) {
      Covid19Sfo.#startDate = await Covid19Sfo.#getStartDate();
    }

    Covid19Sfo.#endDate = await Covid19Sfo.#getEndDate();
  }

  // Public static method.
  static getReport = async () => {
    await Covid19Sfo.#setDates();

    const end_date = moment(Covid19Sfo.#endDate).format('MM-DD-YYYY'); // Format the date to `MM-DD-YYYY`.
    const start_date = moment(Covid19Sfo.#startDate).format('MM-DD-YYYY');

    return {
      start_date,
      end_date,
      total_cases: await Covid19Sfo.#getTotalCases(),
      total_deaths: await Covid19Sfo.#getTotalDeaths(),
      new_cases: {
        [end_date]: await Covid19Sfo.#getNewCases(Covid19Sfo.#endDate),
      },
      src: Covid19Sfo.#url,
    };
  }
}

module.exports = Covid19Sfo;
