import { useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { P2PService } from '../services/p2p';
import { generateKeyPair, importPrivateKey, importPublicKey, KeyPair } from '../services/crypto';
import useStore, { Contact, Message } from '../stores/chatStore';

/**
 * Hook personnalisé pour gérer les communications P2P et l'état de chat
 */
export const useP2PChat = () => {
  // Référence au service P2P
  const p2pServiceRef = useRef<P2PService | null>(null);
  
  // États locaux
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  
  // Accès au store global
  const {
    userProfile,
    contacts,
    conversations,
    activeContactId,
    isInitialized,
    setUserProfile,
    updateUserKeys,
    addContact,
    updateContact,
    removeContact,
    setActiveContactId,
    addMessage,
    markMessagesAsRead,
    handleP2PMessage,
    clearConversation
  } = useStore();
  
  /**
   * Initialise le service P2P et le profil utilisateur
   */
  const initialize = async (username: string) => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Génère une paire de clés
      const keyPair = await generateKeyPair();
      
      // Initialise le service P2P
      const p2pService = new P2PService({
        onMessage: handleP2PMessage,
        onConnection: (peerId) => {
          updateContact(peerId, { isConnected: true });
        },
        onDisconnection: (peerId) => {
          updateContact(peerId, { isConnected: false, lastSeen: Date.now() });
        },
        onError: (error) => {
          console.error('P2P Error:', error);
          setConnectionError(error);
        }
      });
      
      // Connecte au réseau P2P
      const peerId = await p2pService.initialize(keyPair);
      
      // Sauvegarde la référence
      p2pServiceRef.current = p2pService;
      
      // Crée un profil utilisateur
      const profile = {
        id: peerId,
        name: username
      };
      
      // Enregistre dans le store
      setUserProfile(profile);
      await updateUserKeys(keyPair);
      
      setIsConnecting(false);
      return peerId;
    } catch (error) {
      console.error('Initialization error:', error);
      setConnectionError(error as Error);
      setIsConnecting(false);
      throw error;
    }
  };
  
  /**
   * Restaure les clés de l'utilisateur depuis le stockage
   */
  const restoreUserKeys = async (): Promise<KeyPair | null> => {
    try {
      if (!userProfile?.privateKeyJwk || !userProfile?.publicKeyJwk) {
        return null;
      }
      
      const privateKey = await importPrivateKey(userProfile.privateKeyJwk);
      const publicKey = await importPublicKey(userProfile.publicKeyJwk);
      
      return { privateKey, publicKey };
    } catch (error) {
      console.error('Error restoring user keys:', error);
      return null;
    }
  };
  
  /**
   * Reconnecte l'utilisateur (après redémarrage de l'app)
   */
  const reconnect = async () => {
    try {
      if (!userProfile) {
        throw new Error('No user profile found');
      }
      
      setIsConnecting(true);
      setConnectionError(null);
      
      // Restaure les clés
      const keyPair = await restoreUserKeys();
      
      if (!keyPair) {
        throw new Error('Failed to restore encryption keys');
      }
      
      // Initialise le service P2P
      const p2pService = new P2PService({
        onMessage: handleP2PMessage,
        onConnection: (peerId) => {
          updateContact(peerId, { isConnected: true });
        },
        onDisconnection: (peerId) => {
          updateContact(peerId, { isConnected: false, lastSeen: Date.now() });
        },
        onError: (error) => {
          console.error('P2P Error:', error);
          setConnectionError(error);
        }
      });
      
      // Reconnecte avec le même ID
      await p2pService.initialize(keyPair);
      
      // Sauvegarde la référence
      p2pServiceRef.current = p2pService;
      
      // Marque tous les contacts comme déconnectés initialement
      contacts.forEach(contact => {
        updateContact(contact.id, { isConnected: false });
      });
      
      setIsConnecting(false);
      return true;
    } catch (error) {
      console.error('Reconnection error:', error);
      setConnectionError(error as Error);
      setIsConnecting(false);
      return false;
    }
  };
  
  /**
   * Ajoute un nouveau contact et se connecte à lui
   */
  const connectToContact = async (contactId: string, name?: string) => {
    try {
      if (!p2pServiceRef.current) {
        throw new Error('P2P service not initialized');
      }
      
      // Si le contact existe déjà, on ne fait que se connecter
      const existingContact = contacts.find(c => c.id === contactId);
      
      if (!existingContact) {
        // Ajoute le contact au store
        addContact({
          id: contactId,
          name: name || `Contact-${contactId.substring(0, 6)}`,
          isConnected: false
        });
      }
      
      // Se connecte au pair
      await p2pServiceRef.current.connectToPeer(contactId);
      return true;
    } catch (error) {
      console.error('Error connecting to contact:', error);
      setConnectionError(error as Error);
      return false;
    }
  };
  
  /**
   * Envoie un message texte
   */
  const sendTextMessage = async (contactId: string, text: string): Promise<boolean> => {
    try {
      if (!p2pServiceRef.current || !userProfile) {
        throw new Error('P2P service not initialized or no user profile');
      }
      
      if (!p2pServiceRef.current.isConnectedTo(contactId)) {
        await p2pServiceRef.current.connectToPeer(contactId);
      }
      
      // Crée un ID unique pour le message
      const messageId = nanoid();
      
      // Crée le message dans notre store local
      const message: Message = {
        id: messageId,
        senderId: userProfile.id,
        recipientId: contactId,
        timestamp: Date.now(),
        isRead: false,
        isSent: false,  // Sera mis à jour après envoi
        isDelivered: false,
        type: 'text',
        content: text
      };
      
      // Ajoute le message au store
      addMessage(message);
      
      // Envoie le message via P2P
      const success = await p2pServiceRef.current.sendTextMessage(contactId, text);
      
      // Met à jour le statut du message
      if (success) {
        updateMessageStatus(messageId, { isSent: true, isDelivered: true });
      }
      
      return success;
    } catch (error) {
      console.error('Error sending text message:', error);
      setConnectionError(error as Error);
      return false;
    }
  };
  
  /**
   * Envoie un fichier
   */
  const sendFile = async (contactId: string, file: File): Promise<boolean> => {
    try {
      if (!p2pServiceRef.current || !userProfile) {
        throw new Error('P2P service not initialized or no user profile');
      }
      
      if (!p2pServiceRef.current.isConnectedTo(contactId)) {
        await p2pServiceRef.current.connectToPeer(contactId);
      }
      
      // Créer un ID unique pour le message
      const messageId = nanoid();
      
      // Déterminer le type de message
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';
      
      // Lecture du fichier en base64 pour prévisualisation locale
      const fileReader = new FileReader();
      
      const fileDataPromise = new Promise<string>((resolve) => {
        fileReader.onload = () => {
          resolve(fileReader.result as string);
        };
        fileReader.readAsDataURL(file);
      });
      
      const fileData = await fileDataPromise;
      
      // Crée le message dans notre store local
      const message: Message = {
        id: messageId,
        senderId: userProfile.id,
        recipientId: contactId,
        timestamp: Date.now(),
        isRead: false,
        isSent: false,
        isDelivered: false,
        type: messageType,
        content: fileData,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        }
      };
      
      // Ajoute le message au store
      addMessage(message);
      
      // Envoie le fichier via P2P
      const success = await p2pServiceRef.current.sendFile(contactId, file);
      
      // Met à jour le statut du message
      if (success) {
        updateMessageStatus(messageId, { isSent: true, isDelivered: true });
      }
      
      return success;
    } catch (error) {
      console.error('Error sending file:', error);
      setConnectionError(error as Error);
      return false;
    }
  };
  
  /**
   * Met à jour le statut d'un message
   */
  const updateMessageStatus = (
    messageId: string,
    status: Partial<{ isRead: boolean; isSent: boolean; isDelivered: boolean }>
  ) => {
    useStore.getState().updateMessageStatus(messageId, status);
  };
  
  /**
   * Se déconnecte du réseau P2P
   */
  const disconnect = () => {
    if (p2pServiceRef.current) {
      p2pServiceRef.current.disconnect();
      p2pServiceRef.current = null;
    }
  };
  
  // Nettoyage lors du démontage du composant
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);
  
  return {
    // État
    userProfile,
    contacts,
    conversations,
    activeContactId,
    isInitialized,
    isConnecting,
    connectionError,
    
    // Actions
    initialize,
    reconnect,
    connectToContact,
    sendTextMessage,
    sendFile,
    updateMessageStatus,
    setActiveContact: setActiveContactId,
    markMessagesAsRead,
    clearConversation,
    disconnect,
    
    // Accessoires
    myPeerId: userProfile?.id || null,
    activePeerConnections: p2pServiceRef.current?.getConnectedPeers() || []
  };
}; 