if ('serviceWorker' in navigator) { // Check whether `navigator.serviceWorker` is supported
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        console.log(`SW registered: ${registration}`);
      }).catch((registrationError) => {
        console.log(`SW registration failed: ${registrationError}`);
      });
  });
}
