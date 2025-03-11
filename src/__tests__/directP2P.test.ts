import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DirectP2PService } from '../services/directP2P';
import { KeyPair } from '../services/crypto';

// Mock services
vi.mock('../services/crypto', () => ({
  generateDHKeyPair: vi.fn().mockResolvedValue({
    publicKey: 'mockPublicKey',
    privateKey: 'mockPrivateKey'
  }),
  exportDHPublicKey: vi.fn().mockResolvedValue('exportedPublicKey'),
  importDHPublicKey: vi.fn().mockResolvedValue('importedPublicKey'),
  deriveSharedSecret: vi.fn().mockResolvedValue('sharedSecret'),
  encryptData: vi.fn().mockResolvedValue({
    ciphertext: 'encryptedData',
    iv: 'iv'
  }),
  decryptData: vi.fn().mockResolvedValue('decryptedData')
}));

// Mock RTCPeerConnection
global.RTCPeerConnection = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'sdp' }),
  createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'sdp' }),
  setLocalDescription: vi.fn().mockResolvedValue(undefined),
  setRemoteDescription: vi.fn().mockResolvedValue(undefined),
  addIceCandidate: vi.fn().mockResolvedValue(undefined),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  createDataChannel: vi.fn().mockReturnValue({
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    readyState: 'open',
    send: vi.fn()
  })
})) as unknown as typeof RTCPeerConnection;

// Add static method
(global.RTCPeerConnection as unknown as { 
  generateCertificate: (keygenAlgorithm: AlgorithmIdentifier) => Promise<RTCCertificate>
}).generateCertificate = vi.fn().mockResolvedValue({} as RTCCertificate);

describe('DirectP2PService', () => {
  let p2pService: DirectP2PService;
  const mockCallbacks = {
    onMessage: vi.fn(),
    onConnection: vi.fn(),
    onDisconnection: vi.fn(),
    onError: vi.fn()
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    p2pService = new DirectP2PService(mockCallbacks);
  });
  
  it('should initialize correctly', async () => {
    const mockKeyPair = {
      publicKey: 'mockPublicKey',
      privateKey: 'mockPrivateKey'
    } as unknown as KeyPair;
    
    const userId = await p2pService.initialize(mockKeyPair);
    
    expect(userId).toBeDefined();
    expect(userId.length).toBeGreaterThan(0);
    expect(p2pService.isInitialized()).toBe(true);
  });
  
  it('should check if peer is connected', async () => {
    const mockKeyPair = {
      publicKey: 'mockPublicKey',
      privateKey: 'mockPrivateKey'
    } as unknown as KeyPair;
    
    await p2pService.initialize(mockKeyPair);
    
    // Initially no peers are connected
    expect(p2pService.isConnectedTo('somePeerId')).toBe(false);
    expect(p2pService.getConnectedPeers()).toEqual([]);
  });
  
  it('should clean up resources on disconnect', async () => {
    const mockKeyPair = {
      publicKey: 'mockPublicKey',
      privateKey: 'mockPrivateKey'
    } as unknown as KeyPair;
    
    await p2pService.initialize(mockKeyPair);
    p2pService.disconnect();
    
    // After disconnect, service should not be initialized
    expect(p2pService.isInitialized()).toBe(false);
  });
}); 