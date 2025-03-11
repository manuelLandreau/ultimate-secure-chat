import '@testing-library/jest-dom'
import { expect, afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Étend les assertions de Vitest avec celles de testing-library
expect.extend(matchers)

// Mock crypto API
const cryptoMock = {
  subtle: {
    generateKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    exportKey: vi.fn(),
    importKey: vi.fn()
  },
  getRandomValues: vi.fn((array) => array)
};

// Mock IndexedDB
const indexedDBMock = {
  open: vi.fn(),
  deleteDatabase: vi.fn()
};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

// Mock pour window.matchMedia
const matchMediaMock = () => ({
  matches: false,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

// Setup global mocks
beforeAll(() => {
  // Mock WebRTC with proper typing
  global.RTCPeerConnection = vi.fn(() => ({
    createOffer: vi.fn(),
    createAnswer: vi.fn(),
    setLocalDescription: vi.fn(),
    setRemoteDescription: vi.fn(),
    addIceCandidate: vi.fn(),
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })) as unknown as typeof RTCPeerConnection;

  // Mock window.crypto
  Object.defineProperty(window, 'crypto', {
    value: cryptoMock
  });
  
  // Mock window.indexedDB
  Object.defineProperty(window, 'indexedDB', {
    value: indexedDBMock
  });
  
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });
  
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    value: matchMediaMock
  });
});

// Nettoie après chaque test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Cleanup after all tests
afterAll(() => {
  vi.restoreAllMocks()
}) 