describe('Login Page', () => {
  beforeEach(() => {
    // Visiter la page de login avant chaque test
    cy.visit('/');
  });

  it('should display login form with correct elements', () => {
    // Vérifier que le titre de la page est affiché
    cy.get('h1').should('contain.text', 'Ultimate Secure Chat');
    
    // Vérifier que les éléments du formulaire sont présents
    cy.get('input[type="text"]').should('be.visible');
    cy.get('button').should('be.visible');
    cy.get('button').should('contain.text', 'Join Chat');
  });

  it('should validate username input', () => {
    // Essayer de soumettre le formulaire avec un nom d'utilisateur vide
    cy.get('button').click();
    
    // Vérifier qu'un message d'erreur est affiché
    cy.contains('Username is required').should('be.visible');
    
    // Entrer un nom d'utilisateur trop court
    cy.get('input[type="text"]').type('ab');
    cy.get('button').click();
    
    // Vérifier qu'un message d'erreur est affiché
    cy.contains('Username must be at least 3 characters').should('be.visible');
  });

  it('should navigate to chat page after successful login', () => {
    // Utiliser notre commande personnalisée pour se connecter
    cy.login('TestUser');
    
    // Vérifier que les éléments de la page de chat sont présents
    cy.contains('Connected').should('be.visible');
    cy.get('textarea').should('be.visible');
    cy.get('button').contains('Send').should('be.visible');
  });

  it('should have theme toggle button', () => {
    // Vérifier que le bouton de bascule de thème est présent
    cy.get('[aria-label="Toggle theme"]').should('be.visible');
    
    // Cliquer sur le bouton de bascule de thème
    cy.get('[aria-label="Toggle theme"]').click();
    
    // Vérifier que le thème sombre est activé
    cy.checkTheme('dark');
    
    // Cliquer à nouveau sur le bouton de bascule de thème
    cy.get('[aria-label="Toggle theme"]').click();
    
    // Vérifier que le thème clair est activé
    cy.checkTheme('light');
  });

  it('should persist theme preference', () => {
    // Activer le thème sombre
    cy.get('[aria-label="Toggle theme"]').click();
    
    // Vérifier que le thème sombre est activé
    cy.checkTheme('dark');
    
    // Rafraîchir la page
    cy.reload();
    
    // Vérifier que le thème sombre est toujours activé après le rechargement
    cy.checkTheme('dark');
  });
}); 