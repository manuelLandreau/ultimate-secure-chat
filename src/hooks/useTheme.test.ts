import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme Hook', () => {
  // Mock localStorage
  const getItemMock = vi.fn();
  const setItemMock = vi.fn();
  
  beforeEach(() => {
    vi.resetAllMocks();
    // Clear previous mock implementations
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: getItemMock,
        setItem: setItemMock
      }
    });
    
    // Reset document.documentElement
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.remove('light');
    document.documentElement.setAttribute('data-theme', '');
  });
  
  it('should initialize with light theme when no theme is stored', () => {
    getItemMock.mockReturnValue(null);
    
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
  
  it('should initialize with stored theme from localStorage', () => {
    getItemMock.mockReturnValue('dark');
    
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.theme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
  
  it('should toggle theme when toggleTheme is called', () => {
    getItemMock.mockReturnValue('light');
    
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.theme).toBe('light');
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(setItemMock).toHaveBeenCalledWith('theme', 'dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    act(() => {
      result.current.toggleTheme();
    });
    
    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(setItemMock).toHaveBeenCalledWith('theme', 'light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });
}); 