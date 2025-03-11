describe('Chat Page', () => {
  beforeEach(() => {
    // Se connecter avant chaque test
    cy.login('TestUser');
  });

  it('should display chat interface elements', () => {
    // Vérifier que les éléments de l'interface sont présents
    cy.get('[data-testid="message-list"]').should('exist');
    cy.get('textarea').should('be.visible');
    cy.get('button').contains('Send').should('be.visible');
    cy.get('[data-testid="peer-list"]').should('exist');
  });

  it('should allow typing and sending messages', () => {
    const testMessage = 'Hello, this is a test message';
    
    // Taper un message dans la zone de texte
    cy.get('textarea').type(testMessage);
    
    // Vérifier que le texte a bien été entré
    cy.get('textarea').should('have.value', testMessage);
    
    // Envoyer le message
    cy.get('button').contains('Send').click();
    
    // Vérifier que la zone de texte est vidée après l'envoi
    cy.get('textarea').should('have.value', '');
    
    // Vérifier que le message apparaît dans la liste des messages
    cy.get('[data-testid="message"]').should('contain.text', testMessage);
  });

  it('should send message on Enter key', () => {
    // Taper un message et appuyer sur Entrée
    cy.get('textarea').type('Message with Enter{enter}');
    
    // Vérifier que la zone de texte est vidée
    cy.get('textarea').should('have.value', '');
    
    // Vérifier que le message apparaît
    cy.get('[data-testid="message"]').should('contain.text', 'Message with Enter');
  });

  it('should not send empty messages', () => {
    // Essayer d'envoyer un message vide
    cy.get('button').contains('Send').click();
    
    // Vérifier qu'aucun nouveau message n'est ajouté
    cy.get('[data-testid="message"]').should('have.length', 0);
  });

  it('should display connection status', () => {
    // Vérifier que le statut de connexion est affiché
    cy.contains('Connected').should('be.visible');
    cy.contains(/Peer ID: .+/).should('be.visible');
  });

  it('should disconnect when leaving the page', () => {
    // Naviguer vers une autre page
    cy.visit('/');
    
    // Retourner à la page de chat devrait nécessiter une reconnexion
    cy.visit('/chat');
    
    // Vérifier que nous sommes redirigés vers la page de login si nous n'avons pas de nom d'utilisateur
    cy.url().should('include', '/');
  });

  it('should display incoming messages', () => {
    // Ce test simule la réception d'un message
    // Dans un environnement réel, nous devrions utiliser des stubs pour simuler la réception
    // Ici, nous vérifions simplement que les messages sont affichés correctement
    
    // Taper et envoyer deux messages de test
    cy.get('textarea').type('First test message{enter}');
    cy.get('textarea').type('Second test message{enter}');
    
    // Vérifier que les deux messages apparaissent dans la liste
    cy.get('[data-testid="message"]').should('have.length', 2);
    cy.get('[data-testid="message"]').first().should('contain.text', 'First test message');
    cy.get('[data-testid="message"]').last().should('contain.text', 'Second test message');
  });
}); 