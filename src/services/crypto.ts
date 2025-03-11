/**
 * Service de cryptographie pour le chiffrement de bout en bout
 * Utilise l'API Web Crypto pour toutes les opérations cryptographiques
 */

// Constantes pour les algorithmes cryptographiques
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
 * Interface pour les clés publiques et privées
 */
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * Interface pour les messages chiffrés
 */
export interface EncryptedMessage {
  iv: string; // Initialization Vector en base64
  ciphertext: string; // Texte chiffré en base64
  encryptedKey: string; // Clé AES chiffrée avec la clé publique du destinataire en base64
}

/**
 * Génère une paire de clés RSA pour le chiffrement asymétrique
 */
export async function generateKeyPair(): Promise<KeyPair> {
  try {
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
    console.error('Erreur lors de la génération de la paire de clés:', error);
    throw new Error('Impossible de générer les clés de chiffrement');
  }
}

/**
 * Exporte une clé publique au format JWK (JSON Web Key)
 */
export async function exportPublicKey(publicKey: CryptoKey): Promise<string> {
  try {
    const exported = await window.crypto.subtle.exportKey('jwk', publicKey);
    return JSON.stringify(exported);
  } catch (error) {
    console.error('Erreur lors de l\'exportation de la clé publique:', error);
    throw new Error('Impossible d\'exporter la clé publique');
  }
}

/**
 * Importe une clé publique depuis le format JWK
 */
export async function importPublicKey(jwkString: string): Promise<CryptoKey> {
  try {
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
    throw new Error('Impossible d\'importer la clé publique');
  }
}

/**
 * Exporte une clé privée au format JWK (à stocker de manière sécurisée)
 */
export async function exportPrivateKey(privateKey: CryptoKey): Promise<string> {
  try {
    const exported = await window.crypto.subtle.exportKey('jwk', privateKey);
    return JSON.stringify(exported);
  } catch (error) {
    console.error('Erreur lors de l\'exportation de la clé privée:', error);
    throw new Error('Impossible d\'exporter la clé privée');
  }
}

/**
 * Importe une clé privée depuis le format JWK
 */
export async function importPrivateKey(jwkString: string): Promise<CryptoKey> {
  try {
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
    throw new Error('Impossible d\'importer la clé privée');
  }
}

/**
 * Génère une clé AES pour le chiffrement symétrique
 */
export async function generateAESKey(): Promise<CryptoKey> {
  try {
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
 * Chiffre un message avec la clé publique du destinataire
 */
export async function encryptMessage(
  message: string,
  recipientPublicKey: CryptoKey
): Promise<EncryptedMessage> {
  try {
    // Génère une clé AES temporaire pour ce message
    const aesKey = await generateAESKey();
    
    // Convertit le message en ArrayBuffer
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Génère un vecteur d'initialisation (IV)
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Chiffre le message avec la clé AES
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: KEY_ALGORITHM.name,
        iv
      },
      aesKey,
      data
    );
    
    // Exporte la clé AES
    const rawKey = await window.crypto.subtle.exportKey('raw', aesKey);
    
    // Chiffre la clé AES avec la clé publique RSA du destinataire
    const encryptedKey = await window.crypto.subtle.encrypt(
      {
        name: RSA_ALGORITHM.name
      },
      recipientPublicKey,
      rawKey
    );
    
    // Encode les données binaires en base64 pour le transport
    return {
      iv: bufferToBase64(iv),
      ciphertext: bufferToBase64(ciphertext),
      encryptedKey: bufferToBase64(encryptedKey)
    };
  } catch (error) {
    console.error('Erreur lors du chiffrement du message:', error);
    throw new Error('Impossible de chiffrer le message');
  }
}

/**
 * Déchiffre un message chiffré avec la clé privée du destinataire
 */
export async function decryptMessage(
  encryptedMsg: EncryptedMessage,
  privateKey: CryptoKey
): Promise<string> {
  try {
    // Décode les données en base64
    const iv = base64ToBuffer(encryptedMsg.iv);
    const ciphertext = base64ToBuffer(encryptedMsg.ciphertext);
    const encryptedKey = base64ToBuffer(encryptedMsg.encryptedKey);
    
    // Déchiffre la clé AES avec la clé privée RSA
    const rawKey = await window.crypto.subtle.decrypt(
      {
        name: RSA_ALGORITHM.name
      },
      privateKey,
      encryptedKey
    );
    
    // Importe la clé AES déchiffrée
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      rawKey,
      KEY_ALGORITHM,
      false,
      ['decrypt']
    );
    
    // Déchiffre le message avec la clé AES
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: KEY_ALGORITHM.name,
        iv
      },
      aesKey,
      ciphertext
    );
    
    // Convertit le résultat en chaîne de caractères
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Erreur lors du déchiffrement du message:', error);
    throw new Error('Impossible de déchiffrer le message');
  }
}

/**
 * Fonctions utilitaires pour la conversion entre ArrayBuffer et Base64
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