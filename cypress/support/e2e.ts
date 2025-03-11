// ***********************************************************
// This file support/e2e.ts is processed and loaded automatically 
// before your test files.
//
// This is a great place to put global configuration and behavior 
// that modifies Cypress.
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Disable fetch during tests to avoid network requests
Cypress.on('window:before:load', (win) => {
  const originalFetch = win.fetch;
  win.fetch = function fetch(input: RequestInfo | URL, init?: RequestInit) {
    // If the request is to the application URL, let it through
    if (typeof input === 'string' && input.includes(Cypress.config().baseUrl || '')) {
      return originalFetch(input, init);
    }
    // Otherwise log and stub it
    console.log('Fetch intercepted:', input);
    return Promise.resolve(new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  };
}); 