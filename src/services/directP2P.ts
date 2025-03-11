/**
 * Service for direct peer-to-peer communication with WebRTC
 * Uses direct WebRTC connections without PeerJS
 */

import { nanoid } from 'nanoid';
import { KeyPair, encryptMessage, decryptMessage } from './crypto';
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

export interface TextMessage extends P2PMessage {
  type: 'TEXT';
  payload: string | any; // Plain text or encrypted message
}

export interface FileMessage extends P2PMessage {
  type: 'IMAGE' | 'FILE';
  payload: {
    name: string;
    size: number;
    type: string;
    data: string | any; // Base64 of the file (potentially encrypted)
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
 * Class for managing direct WebRTC connections and Diffie-Hellman key exchange
 */
export class DirectP2PService {
  private connections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private userId: string = '';
  private callbacks: MessageCallbacks;
  private keyPair: KeyPair | null = null;
  private peerPublicKeys: Map<string, CryptoKey> = new Map();
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];
  private pendingOffers: Map<string, RTCSessionDescriptionInit> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidate[]> = new Map();
  private initialized: boolean = false;
  private dhKeyPair: CryptoKeyPair | null = null;
  private sharedSecrets: Map<string, CryptoKey> = new Map();

  constructor(callbacks: MessageCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Initialize the Direct P2P service
   */
  async initialize(keyPair: KeyPair): Promise<string> {
    try {
      this.keyPair = keyPair;
      
      // Generate a Diffie-Hellman key pair for secure communications
      this.dhKeyPair = await generateDHKeyPair();
      
      // Generate a random ID for this user (could be replaced with a more permanent ID)
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
   * @param ipAddress The IP address of the peer to connect to
   */
  async connectToPeer(ipAddress: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('Direct P2P service not initialized');
    }

    try {
      // Create a new RTCPeerConnection
      const peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
      
      // Create a data channel for this connection
      const dataChannel = peerConnection.createDataChannel('messenger', {
        ordered: true,
      });
      
      // Set up event handlers for the data channel
      this.setupDataChannelEvents(dataChannel, ipAddress);
      
      // Store connection and data channel
      this.connections.set(ipAddress, peerConnection);
      this.dataChannels.set(ipAddress, dataChannel);
      
      // Set up ICE candidate handling
      this.setupICEHandling(peerConnection, ipAddress);
      
      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      // Store offer for this peer
      this.pendingOffers.set(ipAddress, offer);
      
      console.log(`Connection offer created for peer at ${ipAddress}`);
      
      // In a real implementation, we would now need to transfer this offer to the peer
      // over a signaling channel. For now, we'll just log it.
      console.log(`Offer needs to be sent to peer at ${ipAddress}: `, JSON.stringify(offer));
      
      // Note: In a real implementation, you would need to:
      // 1. Send this offer to the peer via some out-of-band signaling method (e.g., scanning QR code, sharing link)
      // 2. Receive the answer from the peer
      // 3. Call handlePeerAnswer with the received answer
      
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
      await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`Established connection with peer at ${ipAddress}`);
      
      // Process any pending ICE candidates
      const pendingCandidates = this.pendingCandidates.get(ipAddress) || [];
      for (const candidate of pendingCandidates) {
        await peerConnection.addIceCandidate(candidate);
      }
      this.pendingCandidates.delete(ipAddress);
      
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
      // Create a new RTCPeerConnection for this offer
      const peerConnection = new RTCPeerConnection({ iceServers: this.iceServers });
      
      // Set up event handlers for incoming data channels
      peerConnection.ondatachannel = (event) => {
        const dataChannel = event.channel;
        this.setupDataChannelEvents(dataChannel, ipAddress);
        this.dataChannels.set(ipAddress, dataChannel);
      };
      
      // Set up ICE candidate handling
      this.setupICEHandling(peerConnection, ipAddress);
      
      // Store the connection
      this.connections.set(ipAddress, peerConnection);
      
      // Process the offer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create and send answer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      return answer;
      
    } catch (error) {
      console.error('Error handling peer offer:', error);
      this.callbacks.onError(error as Error);
      throw error;
    }
  }

  /**
   * Add ICE candidate from remote peer
   */
  async addIceCandidate(ipAddress: string, candidate: RTCIceCandidate): Promise<void> {
    const peerConnection = this.connections.get(ipAddress);
    
    if (!peerConnection) {
      // Store candidate for later processing
      const candidates = this.pendingCandidates.get(ipAddress) || [];
      candidates.push(candidate);
      this.pendingCandidates.set(ipAddress, candidates);
      return;
    }
    
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
      this.callbacks.onError(error as Error);
    }
  }

  /**
   * Set up ICE candidate handling for a peer connection
   */
  private setupICEHandling(peerConnection: RTCPeerConnection, ipAddress: string): void {
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // In a real implementation, you would need to send this candidate to the peer
        console.log(`ICE candidate for ${ipAddress}:`, JSON.stringify(event.candidate));
      }
    };
    
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`ICE connection state for ${ipAddress}:`, peerConnection.iceConnectionState);
      
      if (peerConnection.iceConnectionState === 'connected' || 
          peerConnection.iceConnectionState === 'completed') {
        this.callbacks.onConnection(ipAddress);
      } else if (peerConnection.iceConnectionState === 'disconnected' || 
                peerConnection.iceConnectionState === 'failed' || 
                peerConnection.iceConnectionState === 'closed') {
        this.callbacks.onDisconnection(ipAddress);
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
      
      // Start Diffie-Hellman key exchange
      this.exchangeKeys(peerId);
    };
    
    dataChannel.onclose = () => {
      console.log(`Data channel closed with ${peerId}`);
      this.callbacks.onDisconnection(peerId);
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
        
        if (typeof textMsg.payload === 'object' && textMsg.payload.ciphertext && textMsg.payload.iv) {
          // Get the shared secret for this peer
          const sharedSecret = this.sharedSecrets.get(peerId);
          
          if (sharedSecret) {
            // Decrypt the message using the shared secret
            const decryptedText = await decryptWithSharedSecret(
              sharedSecret,
              textMsg.payload as { ciphertext: string, iv: string }
            );
            
            // Replace the encrypted payload with the decrypted text
            textMsg.payload = decryptedText;
          }
        }
      } else if (message.type === 'IMAGE' || message.type === 'FILE') {
        // If the file is encrypted, decrypt it
        const fileMsg = message as FileMessage;
        
        if (typeof fileMsg.payload.data === 'object' && 
            fileMsg.payload.data.ciphertext && 
            fileMsg.payload.data.iv) {
          // Get the shared secret for this peer
          const sharedSecret = this.sharedSecrets.get(peerId);
          
          if (sharedSecret) {
            // Decrypt the file data using the shared secret
            const decryptedData = await decryptWithSharedSecret(
              sharedSecret,
              fileMsg.payload.data as { ciphertext: string, iv: string }
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
      let payload: string | { ciphertext: string, iv: string } = text;
      
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
      let data: string | { ciphertext: string, iv: string } = base64;
      
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
    this.peerPublicKeys.clear();
    this.pendingOffers.clear();
    this.pendingCandidates.clear();
    this.sharedSecrets.clear();
    
    this.initialized = false;
  }
} 