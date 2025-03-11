import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useP2PChat } from '../hooks/useP2PChat';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SunIcon, MoonIcon, LockIcon, MessageSquareIcon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

/**
 * Login or profile creation page
 */
const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { initialize, isInitialized, reconnect } = useP2PChat();
  const { toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  
  // Attempt to reconnect with an existing profile
  const handleReconnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await reconnect();
      
      if (success) {
        navigate('/chat');
      } else {
        setError('Unable to reconnect. Please create a new profile.');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new profile
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await initialize(username);
      navigate('/chat');
    } catch (err) {
      setError('Error creating profile. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="absolute right-4 top-4"
        aria-label="Toggle theme"
      >
        {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
      </Button>
      
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <MessageSquareIcon className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        
        <h1 className="mb-2 text-center text-2xl font-bold">Ultimate Secure Chat</h1>
        <p className="mb-6 text-center text-muted">End-to-end encrypted messaging</p>
        
        <div className="mb-6 flex items-center">
          <div className="flex-1 border-t border-border"></div>
          <div className="mx-4 text-sm text-muted">
            <LockIcon className="inline h-4 w-4 mr-1" /> 
            E2E Encryption
          </div>
          <div className="flex-1 border-t border-border"></div>
        </div>
        
        {isInitialized ? (
          <div className="space-y-4">
            <p className="text-center">
              You already have a configured profile. Do you want to reconnect?
            </p>
            <Button 
              onClick={handleReconnect} 
              className="w-full" 
              isLoading={isLoading}
            >
              Reconnect
            </Button>
            <div className="flex items-center">
              <div className="flex-1 border-t border-border"></div>
              <div className="mx-4 text-sm text-muted">or</div>
              <div className="flex-1 border-t border-border"></div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/chat')} 
              className="w-full"
            >
              Create a new profile
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                disabled={isLoading}
                required
                error={error || undefined}
              />
            </div>
            
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Start chatting
            </Button>
          </form>
        )}
        
        <div className="mt-6 text-center text-xs text-muted">
          <p>
            No server, no tracking, 100% private.
          </p>
          <p className="mt-1">
            Your messages are encrypted with AES-256 and RSA-4096.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 