import { useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { DirectP2PService } from '../services/directP2P';
import { generateKeyPair, importPrivateKey, importPublicKey, KeyPair } from '../services/crypto';
import useStore, { Message } from '../stores/chatStore';

/**
 * Custom hook for direct P2P chat communication using WebRTC without PeerJS
 */
export const useDirectP2PChat = () => {
  // P2P service reference
  const p2pServiceRef = useRef<DirectP2PService | null>(null);
  
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
   * Initialize the Direct P2P service and user profile
   */
  const initialize = async (username: string) => {
    try {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Generate key pair
      const keyPair = await generateKeyPair();
      
      // Initialize P2P service
      const p2pService = new DirectP2PService({
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
      const userId = await p2pService.initialize(keyPair);
      
      // Save reference
      p2pServiceRef.current = p2pService;
      
      // Create user profile
      const profile = {
        id: userId,
        name: username
      };
      
      // Register in store
      setUserProfile(profile);
      await updateUserKeys(keyPair);
      
      setIsConnecting(false);
      return userId;
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
      const p2pService = new DirectP2PService({
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
   * Connect to a contact via IP address
   */
  const connectToContact = async (ipAddress: string, name?: string) => {
    try {
      if (!p2pServiceRef.current) {
        throw new Error('Direct P2P service not initialized');
      }
      
      // Add contact to store first (we'll use IP as the ID)
      const existingContact = contacts.find(c => c.id === ipAddress);
      
      if (!existingContact) {
        // Add contact to store
        addContact({
          id: ipAddress,
          name: name || `Contact-${ipAddress}`,
          isConnected: false
        });
      }
      
      // Connect to peer
      await p2pServiceRef.current.connectToPeer(ipAddress);
      return true;
    } catch (error) {
      console.error('Error connecting to contact:', error);
      setConnectionError(error as Error);
      return false;
    }
  };

  /**
   * Handle connection offer from a peer
   */
  const handleContactOffer = async (ipAddress: string, offer: RTCSessionDescriptionInit, name?: string) => {
    try {
      if (!p2pServiceRef.current) {
        throw new Error('Direct P2P service not initialized');
      }
      
      // Add contact to store first (we'll use IP as the ID)
      const existingContact = contacts.find(c => c.id === ipAddress);
      
      if (!existingContact) {
        // Add contact to store
        addContact({
          id: ipAddress,
          name: name || `Contact-${ipAddress}`,
          isConnected: false
        });
      }
      
      // Process the offer and create an answer
      const answer = await p2pServiceRef.current.handlePeerOffer(ipAddress, offer);
      
      // Return the answer to be sent back to the peer
      return answer;
    } catch (error) {
      console.error('Error handling contact offer:', error);
      setConnectionError(error as Error);
      throw error;
    }
  };

  /**
   * Handle answer from a peer
   */
  const handleContactAnswer = async (ipAddress: string, answer: RTCSessionDescriptionInit) => {
    try {
      if (!p2pServiceRef.current) {
        throw new Error('Direct P2P service not initialized');
      }
      
      // Process the answer
      await p2pServiceRef.current.handlePeerAnswer(ipAddress, answer);
      return true;
    } catch (error) {
      console.error('Error handling contact answer:', error);
      setConnectionError(error as Error);
      return false;
    }
  };

  /**
   * Handle ICE candidate from a peer
   */
  const handleIceCandidate = async (ipAddress: string, candidate: RTCIceCandidate) => {
    try {
      if (!p2pServiceRef.current) {
        throw new Error('Direct P2P service not initialized');
      }
      
      // Add the ICE candidate
      await p2pServiceRef.current.addIceCandidate(ipAddress, candidate);
      return true;
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
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
      
      // Create unique ID for message
      const messageId = nanoid();
      
      // Create file message in our local store
      const fileType = file.type.startsWith('image/') ? 'image' : 'file';
      
      // Read file as data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const message: Message = {
        id: messageId,
        senderId: userProfile.id,
        recipientId: contactId,
        timestamp: Date.now(),
        isRead: false,
        isSent: false,
        isDelivered: false,
        type: fileType,
        content: dataUrl,
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
    handleContactOffer,
    handleContactAnswer,
    handleIceCandidate,
    sendTextMessage,
    sendFile,
    updateMessageStatus,
    setActiveContact: setActiveContactId,
    markMessagesAsRead,
    clearConversation,
    disconnect,
    
    // Accessories
    myUserId: userProfile?.id || null,
    activePeerConnections: p2pServiceRef.current?.getConnectedPeers() || []
  };
}; 