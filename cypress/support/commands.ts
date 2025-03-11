/// <reference types="cypress" />

// ***********************************************
// This file can be used to create custom commands
// and overwrite existing ones.
//
// For more information, visit:
// https://on.cypress.io/custom-commands
// ***********************************************

// Déclaration des types pour TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Commande pour se connecter avec un nom d'utilisateur
       * @example cy.login('JohnDoe')
       */
      login(username: string): Chainable<void>;
      
      /**
       * Commande pour vérifier l'état du thème
       * @example cy.checkTheme('dark')
       */
      checkTheme(theme: 'dark' | 'light'): Chainable<void>;
    }
  }
}

// Commande pour se connecter
Cypress.Commands.add('login', (username: string) => {
  cy.visit('/');
  cy.get('input[type="text"]').type(username);
  cy.get('button').contains('Join Chat').click();
  
  // Attendre que la redirection soit complète
  cy.url().should('include', '/chat');
});

// Commande pour vérifier l'état du thème
Cypress.Commands.add('checkTheme', (theme: 'dark' | 'light') => {
  if (theme === 'dark') {
    cy.get('html').should('have.class', 'dark');
  } else {
    cy.get('html').should('not.have.class', 'dark');
  }
});

// Pour préserver le chaînage
export {}; 