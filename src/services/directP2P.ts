/**
 * Service for direct peer-to-peer communication with WebRTC
 * Uses direct WebRTC connections without any external servers
 */

import { nanoid } from 'nanoid';
import { 
  generateDHKeyPair, 
  exportDHPublicKey, 
  importDHPublicKey, 
  deriveSharedSecret,
  encryptWithSharedSecret,
  decryptWithSharedSecret
} from './diffieHellman';

// Message types
export type MessageType = 'TEXT' | 'IMAGE' | 'FILE' | 'KEY_EXCHANGE' | 'CALL_REQUEST' | 'CALL_RESPONSE';

export interface P2PMessage {
  id: string;
  type: MessageType;
  sender: string;
  timestamp: number;
  payload: unknown;
}

// Interface pour les données chiffrées
export interface EncryptedData {
  ciphertext: string;
  iv: string;
}

export interface TextMessage extends P2PMessage {
  type: 'TEXT';
  payload: string | EncryptedData; // Plain text or encrypted message
}

export interface FileMessage extends P2PMessage {
  type: 'IMAGE' | 'FILE';
  payload: {
    name: string;
    size: number;
    type: string;
    data: string | EncryptedData; // Base64 of the file (potentially encrypted)
  };
}

export interface KeyExchangeMessage extends P2PMessage {
  type: 'KEY_EXCHANGE';
  payload: {
    publicKey: string; // For DH key exchange (base64 encoded)
  };
}

interface MessageCallbacks {
  onMessage: (message: P2PMessage) => void;
  onConnection: (peer: string) => void;
  onDisconnection: (peer: string) => void;
  onError: (error: Error) => void;
}

/**
 * Configuration pour créer une connexion sans utiliser ICE
 */
const peerConnectionConfig = {
  iceServers: [] // Aucun serveur ICE
};

/**
 * Class for managing direct WebRTC connections with Diffie-Hellman key exchange
 * Completely decentralized, uses no external servers of any kind
 */
export class DirectP2PService {
  private connections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private userId: string = '';
  private callbacks: MessageCallbacks;
  private initialized: boolean = false;
  private dhKeyPair: CryptoKeyPair | null = null;
  private sharedSecrets: Map<string, CryptoKey> = new Map();
  
  // Stockage des descriptions de session pour l'établissement de connexion
  private pendingOffers: Map<string, RTCSessionDescriptionInit> = new Map();
  private connectionState: Map<string, string> = new Map();

  constructor(callbacks: MessageCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Initialize the Direct P2P service
   */
  async initialize(): Promise<string> {
    try {
      console.log('Initializing Direct P2P service');

      // Generate a Diffie-Hellman key pair for secure communications
      this.dhKeyPair = await generateDHKeyPair();
      
      // Generate a random ID for this user
      this.userId = nanoid(10);
      this.initialized = true;
      
      console.log('Direct P2P initialized with user ID:', this.userId);
      
      return this.userId;
    } catch (error) {
      console.error('Error initializing Direct P2P service:', error);
      throw error;
    }
  }

  /**
   * Start connection process to a peer
   * @param ipAddress The IP address or identifier of the peer to connect to
   */
  async connectToPeer(ipAddress: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Direct P2P service not initialized');
    }

    try {
      console.log(`Starting connection to peer at ${ipAddress}...`);
      
      // Create a new RTCPeerConnection with explicitly empty ICE servers
      const peerConnection = new RTCPeerConnection(peerConnectionConfig);
      
      // Create a data channel for this connection
      const dataChannel = peerConnection.createDataChannel('messenger', {
        ordered: true,
      });
      
      // Set up event handlers for the data channel
      this.setupDataChannelEvents(dataChannel, ipAddress);
      
      // Store connection and data channel
      this.connections.set(ipAddress, peerConnection);
      this.dataChannels.set(ipAddress, dataChannel);
      this.connectionState.set(ipAddress, 'connecting');
      
      // Set up connection state monitoring
      this.setupConnectionStateMonitoring(peerConnection, ipAddress);
      
      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      // Store offer for this peer
      this.pendingOffers.set(ipAddress, offer);
      
      console.log(`Connection offer created for peer at ${ipAddress}`);
      
      // L'offre doit être transmise manuellement au destinataire par un canal externe
      // (copier-coller, QR code, etc.)
      
    } catch (error) {
      console.error('Error connecting to peer:', error);
      this.callbacks.onError(error as Error);
      throw error;
    }
  }

  /**
   * Handle incoming connection request (answer)
   */
  async handlePeerAnswer(ipAddress: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const peerConnection = this.connections.get(ipAddress);
    
    if (!peerConnection) {
      throw new Error(`No connection initialized for peer at ${ipAddress}`);
    }
    
    try {
      console.log(`Processing answer from peer at ${ipAddress}`);
      
      // Set the remote description (the answer from the other peer)
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      
      console.log(`Connection established with peer at ${ipAddress}`);
      this.connectionState.set(ipAddress, 'connected');
      
    } catch (error) {
      console.error('Error handling peer answer:', error);
      this.callbacks.onError(error as Error);
    }
  }

  /**
   * Handle incoming connection request (offer)
   */
  async handlePeerOffer(ipAddress: string, offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    try {
      console.log(`Received offer from peer at ${ipAddress}`);
      
      // Create a new RTCPeerConnection with explicitly empty ICE servers
      const peerConnection = new RTCPeerConnection(peerConnectionConfig);
      
      // Set up event handlers for incoming data channels
      peerConnection.ondatachannel = (event) => {
        const dataChannel = event.channel;
        console.log(`Received data channel from ${ipAddress}`);
        this.setupDataChannelEvents(dataChannel, ipAddress);
        this.dataChannels.set(ipAddress, dataChannel);
      };
      
      // Setup connection state monitoring
      this.setupConnectionStateMonitoring(peerConnection, ipAddress);
      
      // Store the connection
      this.connections.set(ipAddress, peerConnection);
      this.connectionState.set(ipAddress, 'connecting');
      
      // Process the offer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create an answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      console.log(`Created answer for peer at ${ipAddress}`);
      
      return answer;
      
    } catch (error) {
      console.error('Error handling peer offer:', error);
      this.callbacks.onError(error as Error);
      throw error;
    }
  }

  /**
   * Monitor connection state changes
   */
  private setupConnectionStateMonitoring(peerConnection: RTCPeerConnection, peerId: string): void {
    // Listen for connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state for ${peerId}:`, peerConnection.connectionState);
      
      switch (peerConnection.connectionState) {
        case 'connected':
          this.connectionState.set(peerId, 'connected');
          this.callbacks.onConnection(peerId);
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          this.connectionState.set(peerId, 'disconnected');
          this.callbacks.onDisconnection(peerId);
          break;
      }
    };
    
    // Backup: also monitor signaling state
    peerConnection.onsignalingstatechange = () => {
      console.log(`Signaling state for ${peerId}:`, peerConnection.signalingState);
      if (peerConnection.signalingState === 'stable') {
        // La connexion a été établie avec succès
        if (this.connectionState.get(peerId) === 'connecting') {
          this.connectionState.set(peerId, 'connected');
        }
      }
    };
  }

  /**
   * Set up event handlers for a data channel
   */
  private setupDataChannelEvents(dataChannel: RTCDataChannel, peerId: string): void {
    dataChannel.onopen = () => {
      console.log(`Data channel opened with ${peerId}`);
      this.callbacks.onConnection(peerId);
      this.connectionState.set(peerId, 'connected');
      
      // Start Diffie-Hellman key exchange
      this.exchangeKeys(peerId);
    };
    
    dataChannel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`);
      this.callbacks.onDisconnection(peerId);
      this.connectionState.set(peerId, 'disconnected');
    };
    
    dataChannel.onerror = (error) => {
      console.error(`Data channel error with ${peerId}:`, error);
      this.callbacks.onError(new Error(`Data channel error with ${peerId}`));
    };
    
    dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as P2PMessage;
        this.handleMessage(peerId, message);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
  }

  /**
   * Exchange Diffie-Hellman keys
   */
  private async exchangeKeys(peerId: string): Promise<void> {
    try {
      if (!this.dhKeyPair) {
        throw new Error('No Diffie-Hellman key pair available');
      }
      
      // Export the public key to a format that can be transmitted
      const publicKeyString = await exportDHPublicKey(this.dhKeyPair.publicKey);
      
      const message: KeyExchangeMessage = {
        id: nanoid(),
        type: 'KEY_EXCHANGE',
        sender: this.userId,
        timestamp: Date.now(),
        payload: {
          publicKey: publicKeyString
        }
      };
      
      this.sendToPeer(peerId, message);
    } catch (error) {
      console.error('Error exchanging keys:', error);
      this.callbacks.onError(error as Error);
    }
  }

  /**
   * Send a message to a peer
   */
  private sendToPeer(peerId: string, message: P2PMessage): boolean {
    const dataChannel = this.dataChannels.get(peerId);
    
    if (!dataChannel || dataChannel.readyState !== 'open') {
      console.error('No open data channel to peer:', peerId);
      return false;
    }
    
    try {
      dataChannel.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending to peer:', error);
      return false;
    }
  }

  /**
   * Handle a received message
   */
  private async handleMessage(peerId: string, message: P2PMessage): Promise<void> {
    try {
      if (message.type === 'KEY_EXCHANGE') {
        const keyMsg = message as KeyExchangeMessage;
        
        // Process the received public key
        if (this.dhKeyPair) {
          // Import the peer's public key
          const peerPublicKey = await importDHPublicKey(keyMsg.payload.publicKey);
          
          // Derive a shared secret from our private key and the peer's public key
          const sharedSecret = await deriveSharedSecret(this.dhKeyPair.privateKey, peerPublicKey);
          
          // Store the shared secret for this peer
          this.sharedSecrets.set(peerId, sharedSecret);
          
          console.log('Secure connection established with peer:', peerId);
        }
      } else if (message.type === 'TEXT') {
        // If the message is encrypted, decrypt it
        const textMsg = message as TextMessage;
        
        if (typeof textMsg.payload === 'object' && 'ciphertext' in textMsg.payload && 'iv' in textMsg.payload) {
          // Get the shared secret for this peer
          const sharedSecret = this.sharedSecrets.get(peerId);
          
          if (sharedSecret) {
            // Decrypt the message using the shared secret
            const decryptedText = await decryptWithSharedSecret(
              sharedSecret,
              textMsg.payload as EncryptedData
            );
            
            // Replace the encrypted payload with the decrypted text
            textMsg.payload = decryptedText;
          }
        }
      } else if (message.type === 'IMAGE' || message.type === 'FILE') {
        // If the file is encrypted, decrypt it
        const fileMsg = message as FileMessage;
        
        if (typeof fileMsg.payload.data === 'object' && 
            'ciphertext' in fileMsg.payload.data && 
            'iv' in fileMsg.payload.data) {
          // Get the shared secret for this peer
          const sharedSecret = this.sharedSecrets.get(peerId);
          
          if (sharedSecret) {
            // Decrypt the file data using the shared secret
            const decryptedData = await decryptWithSharedSecret(
              sharedSecret,
              fileMsg.payload.data as EncryptedData
            );
            
            // Replace the encrypted payload with the decrypted data
            fileMsg.payload.data = decryptedData;
          }
        }
      }
      
      // Pass the message to the callback
      this.callbacks.onMessage(message);
    } catch (error) {
      console.error('Error handling message:', error);
      this.callbacks.onError(error as Error);
    }
  }

  /**
   * Send a text message to a peer
   */
  async sendTextMessage(peerId: string, text: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Direct P2P service not initialized');
    }
    
    try {
      // Check if we have a shared secret with this peer
      const sharedSecret = this.sharedSecrets.get(peerId);
      let payload: string | EncryptedData = text;
      
      // If we have a shared secret, encrypt the message
      if (sharedSecret) {
        payload = await encryptWithSharedSecret(sharedSecret, text);
      }
      
      const message: TextMessage = {
        id: nanoid(),
        type: 'TEXT',
        sender: this.userId,
        timestamp: Date.now(),
        payload
      };
      
      return this.sendToPeer(peerId, message);
    } catch (error) {
      console.error('Error sending text message:', error);
      return false;
    }
  }

  /**
   * Send a file to a peer
   */
  async sendFile(peerId: string, file: File): Promise<boolean> {
    if (!this.initialized) {
      throw new Error('Direct P2P service not initialized');
    }
    
    try {
      // Convert file to base64
      const base64 = await this.fileToBase64(file);
      
      // Check if we have a shared secret with this peer
      const sharedSecret = this.sharedSecrets.get(peerId);
      let data: string | EncryptedData = base64;
      
      // If we have a shared secret, encrypt the file data
      if (sharedSecret) {
        data = await encryptWithSharedSecret(sharedSecret, base64);
      }
      
      const message: FileMessage = {
        id: nanoid(),
        type: file.type.startsWith('image/') ? 'IMAGE' : 'FILE',
        sender: this.userId,
        timestamp: Date.now(),
        payload: {
          name: file.name,
          size: file.size,
          type: file.type,
          data
        }
      };
      
      return this.sendToPeer(peerId, message);
    } catch (error) {
      console.error('Error sending file:', error);
      return false;
    }
  }

  /**
   * Convert a file to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data URL prefix
      };
      
      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Check if connected to a peer
   */
  isConnectedTo(peerId: string): boolean {
    const dataChannel = this.dataChannels.get(peerId);
    return !!dataChannel && dataChannel.readyState === 'open';
  }

  /**
   * Get a list of connected peers
   */
  getConnectedPeers(): string[] {
    const connectedPeers: string[] = [];
    
    this.dataChannels.forEach((channel, peerId) => {
      if (channel.readyState === 'open') {
        connectedPeers.push(peerId);
      }
    });
    
    return connectedPeers;
  }

  /**
   * Disconnect from the P2P network
   */
  disconnect(): void {
    // Close all data channels
    this.dataChannels.forEach((channel) => {
      channel.close();
    });
    
    // Close all peer connections
    this.connections.forEach((connection) => {
      connection.close();
    });
    
    // Clear maps
    this.connections.clear();
    this.dataChannels.clear();
    this.pendingOffers.clear();
    this.sharedSecrets.clear();
    this.connectionState.clear();
    
    this.initialized = false;
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get the user ID
   */
  getUserId(): string {
    return this.userId;
  }
} 