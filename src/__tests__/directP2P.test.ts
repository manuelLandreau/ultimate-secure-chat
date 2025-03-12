import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DirectP2PService } from '../services/directP2P';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock services
vi.mock('../services/crypto', () => ({
  generateKeyPair: vi.fn().mockResolvedValue({
    publicKey: 'mockedPublicKey',
    privateKey: 'mockedPrivateKey'
  }),
  exportPublicKey: vi.fn().mockResolvedValue('exportedPublicKey'),
  exportPrivateKey: vi.fn().mockResolvedValue('exportedPrivateKey'),
  encryptMessage: vi.fn().mockResolvedValue({ ciphertext: 'encryptedData', iv: 'iv' }),
  decryptMessage: vi.fn().mockResolvedValue('decryptedMessage')
}));

vi.mock('../services/diffieHellman', () => ({
  generateDHKeyPair: vi.fn().mockResolvedValue({
    publicKey: 'mockedDHPublicKey',
    privateKey: 'mockedDHPrivateKey'
  }),
  exportDHPublicKey: vi.fn().mockResolvedValue('exportedDHPublicKey'),
  importDHPublicKey: vi.fn().mockResolvedValue('importedDHPublicKey'),
  deriveSharedSecret: vi.fn().mockResolvedValue('sharedSecret'),
  encryptWithSharedSecret: vi.fn().mockResolvedValue({ ciphertext: 'encryptedData', iv: 'iv' }),
  decryptWithSharedSecret: vi.fn().mockResolvedValue('decryptedWithSharedSecret')
}));

// Mock RTCPeerConnection and RTCDataChannel
class MockDataChannel {
  readyState = 'connecting';
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
}

class MockPeerConnection {
  connectionState = 'new';
  signalingState = 'stable';
  onconnectionstatechange: (() => void) | null = null;
  onsignalingstatechange: (() => void) | null = null;
  ondatachannel: ((event: any) => void) | null = null;
  createDataChannel = vi.fn().mockReturnValue(new MockDataChannel());
  createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'sdp' });
  createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'sdp' });
  setLocalDescription = vi.fn().mockResolvedValue(undefined);
  setRemoteDescription = vi.fn().mockResolvedValue(undefined);
  close = vi.fn();
}

global.RTCPeerConnection = MockPeerConnection as any;
global.RTCSessionDescription = vi.fn() as any;

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
    const userId = await p2pService.initialize();
    
    expect(userId).toBeDefined();
    expect(userId.length).toBeGreaterThan(0);
    expect(p2pService.isInitialized()).toBe(true);
  });
  
  it('should check if peer is connected', async () => {
    await p2pService.initialize();
    
    // Initially no peers are connected
    expect(p2pService.isConnectedTo('somePeerId')).toBe(false);
    expect(p2pService.getConnectedPeers()).toEqual([]);
  });
  
  it('should clean up resources on disconnect', async () => {
    await p2pService.initialize();
    p2pService.disconnect();
    
    // After disconnect, service should not be initialized
    expect(p2pService.isInitialized()).toBe(false);
  });
}); 