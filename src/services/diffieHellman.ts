/**
 * Service for Diffie-Hellman key exchange
 * Implements the Diffie-Hellman key exchange protocol using the Web Crypto API
 */

/**
 * Generate a Diffie-Hellman key pair
 * @returns A promise that resolves to a CryptoKeyPair with public and private keys
 */
export async function generateDHKeyPair(): Promise<CryptoKeyPair> {
  try {
    // Generate a new ECDH key pair
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256', // Using P-256 curve for good security and performance
      },
      true, // extractable
      ['deriveKey', 'deriveBits'] // can be used for key derivation
    );
    
    return keyPair;
  } catch (error) {
    console.error('Error generating Diffie-Hellman key pair:', error);
    throw error;
  }
}

/**
 * Export a Diffie-Hellman public key to a format that can be transmitted
 * @param publicKey The public key to export
 * @returns A promise that resolves to a string containing the exported key
 */
export async function exportDHPublicKey(publicKey: CryptoKey): Promise<string> {
  try {
    // Export the public key in raw format
    const exportedKey = await window.crypto.subtle.exportKey(
      'raw',
      publicKey
    );
    
    // Convert the exported key to a Base64 string
    return arrayBufferToBase64(exportedKey);
  } catch (error) {
    console.error('Error exporting Diffie-Hellman public key:', error);
    throw error;
  }
}

/**
 * Import a Diffie-Hellman public key from a transmitted format
 * @param keyData The string containing the exported key
 * @returns A promise that resolves to a CryptoKey
 */
export async function importDHPublicKey(keyData: string): Promise<CryptoKey> {
  try {
    // Convert the Base64 string back to an ArrayBuffer
    const keyBuffer = base64ToArrayBuffer(keyData);
    
    // Import the key
    const publicKey = await window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      [] // No usages for a public key
    );
    
    return publicKey;
  } catch (error) {
    console.error('Error importing Diffie-Hellman public key:', error);
    throw error;
  }
}

/**
 * Derive a shared secret from a private key and a peer's public key
 * @param privateKey The local private key
 * @param publicKey The peer's public key
 * @returns A promise that resolves to a CryptoKey containing the shared secret
 */
export async function deriveSharedSecret(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
  try {
    // Derive a shared secret key
    const sharedSecret = await window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: publicKey
      },
      privateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    return sharedSecret;
  } catch (error) {
    console.error('Error deriving shared secret:', error);
    throw error;
  }
}

/**
 * Encrypt data using the shared secret
 * @param sharedSecret The shared secret key
 * @param data The data to encrypt
 * @returns A promise that resolves to the encrypted data
 */
export async function encryptWithSharedSecret(sharedSecret: CryptoKey, data: string): Promise<{
  ciphertext: string,
  iv: string
}> {
  try {
    // Generate a random initialization vector
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Convert the data to an ArrayBuffer
    const dataBuffer = new TextEncoder().encode(data);
    
    // Encrypt the data
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      sharedSecret,
      dataBuffer
    );
    
    // Return the encrypted data and the IV
    return {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv.buffer)
    };
  } catch (error) {
    console.error('Error encrypting with shared secret:', error);
    throw error;
  }
}

/**
 * Decrypt data using the shared secret
 * @param sharedSecret The shared secret key
 * @param encryptedData The encrypted data object with ciphertext and IV
 * @returns A promise that resolves to the decrypted data
 */
export async function decryptWithSharedSecret(
  sharedSecret: CryptoKey,
  encryptedData: { ciphertext: string, iv: string }
): Promise<string> {
  try {
    // Convert the ciphertext and IV from Base64 to ArrayBuffer
    const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
    const iv = base64ToArrayBuffer(encryptedData.iv);
    
    // Decrypt the data
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv)
      },
      sharedSecret,
      ciphertext
    );
    
    // Convert the decrypted data to a string
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Error decrypting with shared secret:', error);
    throw error;
  }
}

/**
 * Convert an ArrayBuffer to a Base64 string
 * @param buffer The ArrayBuffer to convert
 * @returns A Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
}

/**
 * Convert a Base64 string to an ArrayBuffer
 * @param base64 The Base64 string to convert
 * @returns An ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
} 