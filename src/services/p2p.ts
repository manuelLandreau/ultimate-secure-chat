/**
 * Service for peer-to-peer communication with WebRTC
 * Uses PeerJS as an abstraction layer over WebRTC
 */

import Peer, { DataConnection } from 'peerjs';
import { nanoid } from 'nanoid';
import { EncryptedMessage, KeyPair, encryptMessage, decryptMessage, exportPublicKey, importPublicKey } from './crypto';

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
  payload: string | EncryptedMessage;
}

export interface FileMessage extends P2PMessage {
  type: 'IMAGE' | 'FILE';
  payload: {
    name: string;
    size: number;
    type: string;
    data: string | EncryptedMessage; // Base64 of the file (potentially encrypted)
  };
}

export interface KeyExchangeMessage extends P2PMessage {
  type: 'KEY_EXCHANGE';
  payload: {
    publicKey: string; // JWK string
  };
}

interface MessageCallbacks {
  onMessage: (message: P2PMessage) => void;
  onConnection: (peer: string) => void;
  onDisconnection: (peer: string) => void;
  onError: (error: Error) => void;
}

export class P2PService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private peerId: string = '';
  private callbacks: MessageCallbacks;
  private keyPair: KeyPair | null = null;
  private peerPublicKeys: Map<string, CryptoKey> = new Map();

  constructor(callbacks: MessageCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Initialise the P2P connection
   */
  async initialize(keyPair: KeyPair): Promise<string> {
    try {
      this.keyPair = keyPair;
      
      // Generate a random ID for this peer
      this.peerId = nanoid(10);
      
      // Initialize PeerJS
      this.peer = new Peer(this.peerId);
      
      return new Promise((resolve, reject) => {
        if (!this.peer) {
          reject(new Error('Peer not initialized'));
          return;
        }
        
        this.peer.on('open', (id) => {
          console.log('My peer ID is:', id);
          this.setupPeerEvents();
          resolve(id);
        });
        
        this.peer.on('error', (error) => {
          console.error('Peer error:', error);
          this.callbacks.onError(error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error initializing P2P service:', error);
      throw error;
    }
  }

  /**
   * Configure the event listeners for Peer
   */
  private setupPeerEvents(): void {
    if (!this.peer) return;
    
    this.peer.on('connection', (conn) => {
      console.log('Incoming connection from:', conn.peer);
      this.handleConnection(conn);
    });
  }

  /**
   * Handles a new connection
   */
  private handleConnection(conn: DataConnection): void {
    // Register the connection
    this.connections.set(conn.peer, conn);
    
    conn.on('open', () => {
      console.log('Connection established with:', conn.peer);
      this.callbacks.onConnection(conn.peer);
      
      // Exchange keys
      this.exchangeKeys(conn.peer);
    });
    
    conn.on('data', (data) => {
      console.log('Received data from:', conn.peer);
      this.handleMessage(conn.peer, data as P2PMessage);
    });
    
    conn.on('close', () => {
      console.log('Connection closed with:', conn.peer);
      this.connections.delete(conn.peer);
      this.peerPublicKeys.delete(conn.peer);
      this.callbacks.onDisconnection(conn.peer);
    });
    
    conn.on('error', (error) => {
      console.error('Connection error with:', conn.peer, error);
      this.callbacks.onError(error);
    });
  }

  /**
   * Connect to another peer
   */
  connectToPeer(peerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.peer) {
        reject(new Error('P2P service not initialized'));
        return;
      }
      
      if (this.connections.has(peerId)) {
        resolve(); // Already connected
        return;
      }
      
      try {
        const conn = this.peer.connect(peerId);
        
        conn.on('open', () => {
          this.handleConnection(conn);
          resolve();
        });
        
        conn.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        console.error('Error connecting to peer:', error);
        reject(error);
      }
    });
  }

  /**
   * Exchange public keys
   */
  private async exchangeKeys(peerId: string): Promise<void> {
    try {
      if (!this.keyPair) {
        throw new Error('No key pair available');
      }
      
      const publicKeyString = await exportPublicKey(this.keyPair.publicKey);
      
      const message: KeyExchangeMessage = {
        id: nanoid(),
        type: 'KEY_EXCHANGE',
        sender: this.peerId,
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
    const conn = this.connections.get(peerId);
    
    if (!conn) {
      console.error('No connection to peer:', peerId);
      return false;
    }
    
    try {
      conn.send(message);
      return true;
    } catch (error) {
      console.error('Error sending to peer:', error);
      return false;
    }
  }

  /**
   * Handles a received message
   */
  private async handleMessage(peerId: string, message: P2PMessage): Promise<void> {
    try {
      // Message processing based on type
      if (message.type === 'KEY_EXCHANGE') {
        const keyMsg = message as KeyExchangeMessage;
        const publicKey = await importPublicKey(keyMsg.payload.publicKey);
        this.peerPublicKeys.set(peerId, publicKey);
        
        // Notification to the system about the secure connection
        console.log('Secure connection established with peer:', peerId);
      } else if (message.type === 'TEXT') {
        // If the message is encrypted, decrypt it
        const textMsg = message as TextMessage;
        if (typeof textMsg.payload !== 'string' && this.keyPair) {
          const encrypted = textMsg.payload as EncryptedMessage;
          textMsg.payload = await decryptMessage(encrypted, this.keyPair.privateKey);
        }
      } else if (message.type === 'IMAGE' || message.type === 'FILE') {
        // If the file is encrypted, decrypt it
        const fileMsg = message as FileMessage;
        if (typeof fileMsg.payload.data !== 'string' && this.keyPair) {
          const encrypted = fileMsg.payload.data as EncryptedMessage;
          fileMsg.payload.data = await decryptMessage(encrypted, this.keyPair.privateKey);
        }
      }
      
      // Callback call to process the message
      this.callbacks.onMessage(message);
    } catch (error) {
      console.error('Error handling message:', error);
      this.callbacks.onError(error as Error);
    }
  }

  /**
   * Send a text message
   */
  async sendTextMessage(peerId: string, text: string): Promise<boolean> {
    try {
      let payload: string | EncryptedMessage = text;
      
      // Encrypt the message if we have the public key of the recipient
      const recipientKey = this.peerPublicKeys.get(peerId);
      if (recipientKey) {
        payload = await encryptMessage(text, recipientKey);
      }
      
      const message: TextMessage = {
        id: nanoid(),
        type: 'TEXT',
        sender: this.peerId,
        timestamp: Date.now(),
        payload
      };
      
      return this.sendToPeer(peerId, message);
    } catch (error) {
      console.error('Error sending text message:', error);
      this.callbacks.onError(error as Error);
      return false;
    }
  }

  /**
   * Send a file
   */
  async sendFile(peerId: string, file: File): Promise<boolean> {
    try {
      // Read the file
      const fileBuffer = await file.arrayBuffer();
      const base64Data = btoa(
        new Uint8Array(fileBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );
      
      let fileData: string | EncryptedMessage = base64Data;
      
      // Encrypt if we have the public key of the recipient
      const recipientKey = this.peerPublicKeys.get(peerId);
      if (recipientKey) {
        fileData = await encryptMessage(base64Data, recipientKey);
      }
      
      const payload = {
        name: file.name,
        size: file.size,
        type: file.type,
        data: fileData
      };
      
      const messageType: MessageType = file.type.startsWith('image/') ? 'IMAGE' : 'FILE';
      
      const message: FileMessage = {
        id: nanoid(),
        type: messageType,
        sender: this.peerId,
        timestamp: Date.now(),
        payload
      };
      
      return this.sendToPeer(peerId, message);
    } catch (error) {
      console.error('Error sending file:', error);
      this.callbacks.onError(error as Error);
      return false;
    }
  }

  /**
   * Disconnect all peers
   */
  disconnect(): void {
    this.connections.forEach((conn) => {
      conn.close();
    });
    
    this.connections.clear();
    this.peerPublicKeys.clear();
    
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }

  /**
   * Check if connected to a peer
   */
  isConnectedTo(peerId: string): boolean {
    return this.connections.has(peerId);
  }

  /**
   * Get the list of connected peers
   */
  getConnectedPeers(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get own ID
   */
  getMyPeerId(): string {
    return this.peerId;
  }
} 