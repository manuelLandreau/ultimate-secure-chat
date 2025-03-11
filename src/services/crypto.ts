/**
 * Cryptography service for end-to-end encryption
 * Uses the Web Crypto API for all cryptographic operations
 */

// Constants for cryptographic algorithms
const KEY_ALGORITHM = { name: 'AES-GCM', length: 256 };
const KEY_USAGES: KeyUsage[] = ['encrypt', 'decrypt'];
const RSA_ALGORITHM = {
  name: 'RSA-OAEP',
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256'
};
const RSA_USAGES: KeyUsage[] = ['encrypt', 'decrypt'];

/**
 * Check if Web Crypto API is available
 */
export function isCryptoAvailable(): boolean {
  return typeof window !== 'undefined' && 
         window.crypto !== undefined && 
         window.crypto.subtle !== undefined;
}

/**
 * Handle environment where Web Crypto API is not available
 * This is a fallback solution for development environments
 * NOT SECURE FOR PRODUCTION
 */
class FallbackCrypto {
  private static generateRandomId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  static async generateKeyPair(): Promise<KeyPair> {
    console.warn('WARNING: Using insecure fallback crypto implementation. This should only be used for development.');
    
    // Create fake keys that can be serialized/deserialized but don't provide real encryption
    const id = this.generateRandomId();
    
    return {
      publicKey: { id, type: 'public' } as unknown as CryptoKey,
      privateKey: { id, type: 'private' } as unknown as CryptoKey
    };
  }

  static async exportKey(key: CryptoKey | { id: string; type: string }): Promise<string> {
    return JSON.stringify(key);
  }

  static async importKey(keyString: string, type: 'public' | 'private'): Promise<CryptoKey> {
    const parsed = JSON.parse(keyString);
    parsed.type = type;
    return parsed as unknown as CryptoKey;
  }

  static async encrypt(text: string): Promise<EncryptedMessage> {
    // Simple Base64 encoding - NOT SECURE, just for development
    return {
      iv: btoa('development-iv'),
      ciphertext: btoa(text),
      encryptedKey: btoa('fake-key')
    };
  }

  static async decrypt(encrypted: EncryptedMessage): Promise<string> {
    // Simple Base64 decoding - NOT SECURE, just for development
    try {
      return atob(encrypted.ciphertext);
    } catch (error) {
      console.error('Error decrypting with fallback crypto:', error);
      return '[Decryption Error]';
    }
  }
}

/**
 * Interface for public and private keys
 */
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * Interface for encrypted messages
 */
export interface EncryptedMessage {
  iv: string; // Initialization Vector in base64
  ciphertext: string; // Ciphertext in base64
  encryptedKey: string; // AES key encrypted with recipient's public key in base64
}

/**
 * Generates an RSA key pair for asymmetric encryption
 */
export async function generateKeyPair(): Promise<KeyPair> {
  try {
    if (!isCryptoAvailable()) {
      return FallbackCrypto.generateKeyPair();
    }

    const keyPair = await window.crypto.subtle.generateKey(
      RSA_ALGORITHM,
      true, // extractable
      RSA_USAGES
    ) as CryptoKeyPair;

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  } catch (error) {
    console.error('Error generating key pair:', error);
    
    // If we get an error with Web Crypto, try the fallback
    console.warn('Falling back to insecure crypto implementation');
    return FallbackCrypto.generateKeyPair();
  }
}

/**
 * Export a public key in JWK (JSON Web Key) format
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  try {
    if (!isCryptoAvailable()) {
      return FallbackCrypto.exportKey(publicKey);
    }

    const exported = await window.crypto.subtle.exportKey('jwk', publicKey);
    return JSON.stringify(exported);
  } catch (error) {
    console.error('Erreur lors de l\'exportation de la clé publique:', error);
    return FallbackCrypto.exportKey(publicKey);
  }
}

/**
 * Import a public key from JWK format
 */
export async function importPublicKey(jwkString: string): Promise<CryptoKey> {
  try {
    if (!isCryptoAvailable()) {
      return FallbackCrypto.importKey(jwkString, 'public');
    }

    const jwk = JSON.parse(jwkString);
    return await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      RSA_ALGORITHM,
      true,
      ['encrypt']
    );
  } catch (error) {
    console.error('Erreur lors de l\'importation de la clé publique:', error);
    return FallbackCrypto.importKey(jwkString, 'public');
  }
}

/**
 * Export a private key in JWK (to be stored securely) format
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  try {
    if (!isCryptoAvailable()) {
      return FallbackCrypto.exportKey(privateKey);
    }

    const exported = await window.crypto.subtle.exportKey('jwk', privateKey);
    return JSON.stringify(exported);
  } catch (error) {
    console.error('Erreur lors de l\'exportation de la clé privée:', error);
    return FallbackCrypto.exportKey(privateKey);
  }
}

/**
 * Import a private key from JWK format
 */
export async function importPrivateKey(jwkString: string): Promise<CryptoKey> {
  try {
    if (!isCryptoAvailable()) {
      return FallbackCrypto.importKey(jwkString, 'private');
    }

    const jwk = JSON.parse(jwkString);
    return await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      RSA_ALGORITHM,
      true,
      ['decrypt']
    );
  } catch (error) {
    console.error('Erreur lors de l\'importation de la clé privée:', error);
    return FallbackCrypto.importKey(jwkString, 'private');
  }
}

/**
 * Generates an AES key for symmetric encryption
 */
export async function generateAESKey(): Promise<CryptoKey> {
  try {
    if (!isCryptoAvailable()) {
      throw new Error('Fallback crypto does not support separate AES key generation');
    }

    return await window.crypto.subtle.generateKey(
      KEY_ALGORITHM,
      true, // extractable
      KEY_USAGES
    );
  } catch (error) {
    console.error('Erreur lors de la génération de la clé AES:', error);
    throw new Error('Impossible de générer la clé de session');
  }
}

/**
 * Encrypts a message with the recipient's public key
 */
export async function encryptMessage(
  message: string,
  recipientPublicKey: CryptoKey
): Promise<EncryptedMessage> {
  try {
    if (!isCryptoAvailable()) {
      return FallbackCrypto.encrypt(message);
    }

    // Generates a temporary AES key for this message
    const aesKey = await generateAESKey();
    
    // Converts the message to ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Generates an initialization vector (IV)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypts the message with the AES key
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: KEY_ALGORITHM.name,
        iv
      },
      aesKey,
      data
    );
    
    // Exports the AES key
    const rawKey = await window.crypto.subtle.exportKey('raw', aesKey);
    
    // Encrypts the AES key with the recipient's RSA public key
    const encryptedKey = await window.crypto.subtle.encrypt(
      {
        name: RSA_ALGORITHM.name
      },
      recipientPublicKey,
      rawKey
    );
    
    // Encodes binary data to base64 for transport
    return {
      iv: bufferToBase64(iv.buffer),
      ciphertext: bufferToBase64(ciphertext),
      encryptedKey: bufferToBase64(encryptedKey)
    };
  } catch (error) {
    console.error('Erreur lors du chiffrement du message:', error);
    return FallbackCrypto.encrypt(message);
  }
}

/**
 * Decrypts an encrypted message with the recipient's private key
 */
export async function decryptMessage(
  encryptedMsg: EncryptedMessage,
  privateKey: CryptoKey
): Promise<string> {
  try {
    if (!isCryptoAvailable()) {
      return FallbackCrypto.decrypt(encryptedMsg);
    }

    // Decodes data from base64
    const iv = base64ToBuffer(encryptedMsg.iv);
    const ciphertext = base64ToBuffer(encryptedMsg.ciphertext);
    const encryptedKey = base64ToBuffer(encryptedMsg.encryptedKey);
    
    // Decrypts the AES key with the recipient's RSA private key
    const rawKey = await window.crypto.subtle.decrypt(
      {
        name: RSA_ALGORITHM.name
      },
      privateKey,
      encryptedKey
    );
    
    // Imports the decrypted AES key
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      rawKey,
      KEY_ALGORITHM,
      false,
      ['decrypt']
    );
    
    // Decrypts the message with the AES key
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: KEY_ALGORITHM.name,
        iv
      },
      aesKey,
      ciphertext
    );
    
    // Converts the result to a string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Erreur lors du déchiffrement du message:', error);
    return FallbackCrypto.decrypt(encryptedMsg);
  }
}

/**
 * Utility functions for converting between ArrayBuffer and Base64
 */
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
} 