import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateKeyPair,
  generateAESKey,
  encryptMessage,
  decryptMessage,
  exportPublicKey,
  importPublicKey
} from './crypto';

describe('Crypto Service', () => {
  let mockKeyPair: CryptoKeyPair;
  let mockAESKey: CryptoKey;
  let mockEncryptedData: Uint8Array;
  let mockExportedKey: JsonWebKey;
  
  beforeEach(() => {
    // Mock crypto subtle API
    mockKeyPair = {
      publicKey: {} as CryptoKey,
      privateKey: {} as CryptoKey
    };
    
    mockAESKey = {} as CryptoKey;
    mockEncryptedData = new Uint8Array([1, 2, 3, 4]);
    mockExportedKey = { kty: 'RSA' } as JsonWebKey;
    
    // Use vi.fn() instead of mockImplementation to avoid type issues
    const generateKeyMock = vi.fn();
    generateKeyMock.mockImplementation((algorithm: any) => {
      if (algorithm && algorithm.name === 'RSA-OAEP') {
        return Promise.resolve(mockKeyPair);
      } else if (algorithm && algorithm.name === 'AES-GCM') {
        return Promise.resolve(mockAESKey);
      }
      return Promise.reject(new Error('Unknown algorithm'));
    });
    
    const importKeyMock = vi.fn();
    importKeyMock.mockImplementation((_format: any, _keyData: any, algorithm: any) => {
      if (algorithm && algorithm.name === 'RSA-OAEP') {
        return Promise.resolve({} as CryptoKey);
      } else if (algorithm && algorithm.name === 'AES-GCM') {
        return Promise.resolve(mockAESKey);
      }
      return Promise.reject(new Error('Unknown algorithm'));
    });
    
    vi.spyOn(window.crypto.subtle, 'generateKey').mockImplementation(generateKeyMock);
    vi.spyOn(window.crypto.subtle, 'encrypt').mockResolvedValue(mockEncryptedData);
    vi.spyOn(window.crypto.subtle, 'decrypt').mockResolvedValue(new TextEncoder().encode('decrypted text'));
    vi.spyOn(window.crypto.subtle, 'exportKey').mockResolvedValue(mockExportedKey);
    vi.spyOn(window.crypto.subtle, 'importKey').mockImplementation(importKeyMock);
    
    vi.spyOn(window.crypto, 'getRandomValues').mockImplementation((array: any) => {
      if (array instanceof Uint8Array) {
        array.set(new Uint8Array(array.length).fill(1));
      }
      return array;
    });
  });
  
  it('should generate RSA key pair', async () => {
    const keyPair = await generateKeyPair();
    
    expect(keyPair).toBeDefined();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    expect(window.crypto.subtle.generateKey).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'RSA-OAEP' }),
      true,
      ['encrypt', 'decrypt']
    );
  });
  
  it('should generate AES key', async () => {
    const aesKey = await generateAESKey();
    
    expect(aesKey).toBeDefined();
    expect(window.crypto.subtle.generateKey).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'AES-GCM' }),
      true,
      ['encrypt', 'decrypt']
    );
  });
  
  it('should encrypt a message', async () => {
    const message = 'Test message';
    const encrypted = await encryptMessage(message, mockKeyPair.publicKey);
    
    expect(encrypted).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.encryptedKey).toBeDefined();
    expect(window.crypto.subtle.encrypt).toHaveBeenCalled();
  });
  
  it('should decrypt a message', async () => {
    vi.spyOn(window.crypto.subtle, 'decrypt').mockResolvedValue(new TextEncoder().encode('decrypted text'));
    
    const encryptedMsg = {
      iv: 'aXYtYmFzZTY0',
      ciphertext: 'Y2lwaGVydGV4dC1iYXNlNjQ=',
      encryptedKey: 'ZW5jcnlwdGVkLWtleS1iYXNlNjQ='
    };
    
    const decrypted = await decryptMessage(encryptedMsg, mockKeyPair.privateKey);
    
    expect(decrypted).toBe('decrypted text');
    expect(window.crypto.subtle.decrypt).toHaveBeenCalled();
  });
  
  it('should export public key as JWK', async () => {
    const exported = await exportPublicKey(mockKeyPair.publicKey);
    
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('string');
    expect(window.crypto.subtle.exportKey).toHaveBeenCalledWith('jwk', mockKeyPair.publicKey);
  });
  
  it('should import public key from JWK', async () => {
    const jwk = JSON.stringify(mockExportedKey);
    const imported = await importPublicKey(jwk);
    
    expect(imported).toBeDefined();
    expect(window.crypto.subtle.importKey).toHaveBeenCalled();
  });
}); 