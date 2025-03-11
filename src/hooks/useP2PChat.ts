import { useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { P2PService } from '../services/p2p';
import { generateKeyPair, importPrivateKey, importPublicKey, KeyPair } from '../services/crypto';
import useStore, { Message } from '../stores/chatStore';

/**
 * Custom hook to manage P2P communications and chat state
 */
export const useP2PChat = () => {
  // P2P service reference
  const p2pServiceRef = useRef<P2PService | null>(null);
  
  // Local states
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  
  // Access to global store
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
    setActiveContactId,
    addMessage,
    markMessagesAsRead,
    handleP2PMessage,
    clearConversation
  } = useStore();
  
  /**
   * Initialize the P2P service and user profile
   */
  const initialize = async (username: string) => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Generate key pair
      const keyPair = await generateKeyPair();
      
      // Initialize P2P service
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
      
      // Connect to P2P network
      const peerId = await p2pService.initialize(keyPair);
      
      // Save reference
      p2pServiceRef.current = p2pService;
      
      // Create user profile
      const profile = {
        id: peerId,
        name: username
      };
      
      // Register in store
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
   * Restore user keys from storage
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
   * Reconnect user (after app restart)
   */
  const reconnect = async () => {
    try {
      if (!userProfile) {
        throw new Error('No user profile found');
      }
      
      setIsConnecting(true);
      setConnectionError(null);
      
      // Restore keys
      const keyPair = await restoreUserKeys();
      
      if (!keyPair) {
        throw new Error('Failed to restore encryption keys');
      }
      
      // Initialize P2P service
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
      
      // Reconnect with the same ID
      await p2pService.initialize(keyPair);
      
      // Save reference
      p2pServiceRef.current = p2pService;
      
      // Mark all contacts as initially disconnected
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
   * Add a new contact and connect to them
   */
  const connectToContact = async (contactId: string, name?: string) => {
    try {
      if (!p2pServiceRef.current) {
        throw new Error('P2P service not initialized');
      }
      
      // If the contact already exists, we just connect
      const existingContact = contacts.find(c => c.id === contactId);
      
      if (!existingContact) {
        // Add contact to store
        addContact({
          id: contactId,
          name: name || `Contact-${contactId.substring(0, 6)}`,
          isConnected: false
        });
      }
      
      // Connect to peer
      await p2pServiceRef.current.connectToPeer(contactId);
      return true;
    } catch (error) {
      console.error('Error connecting to contact:', error);
      setConnectionError(error as Error);
      return false;
    }
  };
  
  /**
   * Send a text message
   */
  const sendTextMessage = async (contactId: string, text: string): Promise<boolean> => {
    try {
      if (!p2pServiceRef.current || !userProfile) {
        throw new Error('P2P service not initialized or no user profile');
      }
      
      if (!p2pServiceRef.current.isConnectedTo(contactId)) {
        await p2pServiceRef.current.connectToPeer(contactId);
      }
      
      // Create unique ID for message
      const messageId = nanoid();
      
      // Create message in our local store
      const message: Message = {
        id: messageId,
        senderId: userProfile.id,
        recipientId: contactId,
        timestamp: Date.now(),
        isRead: false,
        isSent: false,  // Will be updated after sending
        isDelivered: false,
        type: 'text',
        content: text
      };
      
      // Add message to store
      addMessage(message);
      
      // Send message via P2P
      const success = await p2pServiceRef.current.sendTextMessage(contactId, text);
      
      // Update message status
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
   * Send a file
   */
  const sendFile = async (contactId: string, file: File): Promise<boolean> => {
    try {
      if (!p2pServiceRef.current || !userProfile) {
        throw new Error('P2P service not initialized or no user profile');
      }
      
      if (!p2pServiceRef.current.isConnectedTo(contactId)) {
        await p2pServiceRef.current.connectToPeer(contactId);
      }
      
      // Create unique ID for message
      const messageId = nanoid();
      
      // Determine message type
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';
      
      // Read file in base64 for local preview
      const fileReader = new FileReader();
      
      const fileDataPromise = new Promise<string>((resolve) => {
        fileReader.onload = () => {
          resolve(fileReader.result as string);
        };
        fileReader.readAsDataURL(file);
      });
      
      const fileData = await fileDataPromise;
      
      // Create message in our local store
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
      
      // Add message to store
      addMessage(message);
      
      // Send file via P2P
      const success = await p2pServiceRef.current.sendFile(contactId, file);
      
      // Update message status
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
   * Update message status
   */
  const updateMessageStatus = (
    messageId: string,
    status: Partial<{ isRead: boolean; isSent: boolean; isDelivered: boolean }>
  ) => {
    useStore.getState().updateMessageStatus(messageId, status);
  };
  
  /**
   * Disconnect from P2P network
   */
  const disconnect = () => {
    if (p2pServiceRef.current) {
      p2pServiceRef.current.disconnect();
      p2pServiceRef.current = null;
    }
  };
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);
  
  return {
    // State
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
    
    // Accessories
    myPeerId: userProfile?.id || null,
    activePeerConnections: p2pServiceRef.current?.getConnectedPeers() || []
  };
}; 