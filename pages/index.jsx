import Head from 'next/head';
import React from 'react';
import dynamic from 'next/dynamic';

const PhoneForm = dynamic(
  () => import('../components/PhoneForm'),
  { loading: () => <p>Loading...</p> },
);

const IndexPage = () => (
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
    <PhoneForm />
  </>
);

export default IndexPage;
