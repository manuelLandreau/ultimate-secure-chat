import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { useTheme } from '../hooks/useTheme';
import { useDirectP2PChat } from '../hooks/useDirectP2PChat';
import { SunIcon, MoonIcon, ArrowLeftIcon, CopyIcon, WifiIcon, MessageSquareIcon, GithubIcon } from 'lucide-react';

/**
 * Page for creating direct WebRTC connections
 */
const DirectConnect: React.FC = () => {
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  
  // Connection states
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [ipAddress, setIpAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [offer, setOffer] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Get P2P hooks
  const { 
    userProfile, 
    connectToContact, 
    handleContactOffer, 
    handleContactAnswer, 
    myUserId
  } = useDirectP2PChat();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!userProfile) {
      navigate('/');
    }
  }, [userProfile, navigate]);
  
  // Handle creating a connection offer
  const handleCreateOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    if (!ipAddress.trim()) {
      setError('Please enter the peer IP address');
      return;
    }
    
    try {
      // The actual WebRTC offer generation happens in the DirectP2PService
      await connectToContact(ipAddress, contactName || undefined);
      setSuccessMessage('Connection offer created! Share the offer data with the peer.');
    } catch (error) {
      console.error('Error creating offer:', error);
      setError(`Error creating offer: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Handle processing a connection offer
  const handleProcessOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    if (!ipAddress.trim() || !offer.trim()) {
      setError('Please enter both IP address and offer data');
      return;
    }
    
    try {
      // Parse the offer
      const offerObject = JSON.parse(offer);
      
      // Process the offer and get an answer
      const answerObject = await handleContactOffer(ipAddress, offerObject, contactName || undefined);
      
      // Set the answer for display
      setAnswer(JSON.stringify(answerObject));
      
      setSuccessMessage('Offer processed successfully! Copy the answer data to send back to the peer.');
    } catch (error) {
      console.error('Error processing offer:', error);
      setError(`Error processing offer: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Handle processing an answer to our connection offer
  const handleProcessAnswer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    
    if (!ipAddress.trim() || !answer.trim()) {
      setError('Please enter both IP address and answer data');
      return;
    }
    
    try {
      // Parse the answer
      const answerObject = JSON.parse(answer);
      
      // Process the answer
      const success = await handleContactAnswer(ipAddress, answerObject);
      
      if (success) {
        setSuccessMessage('Connection established successfully!');
      } else {
        setError('Failed to establish connection. Please try again.');
      }
    } catch (error) {
      console.error('Error processing answer:', error);
      setError(`Error processing answer: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setSuccessMessage('Copied to clipboard!');
        setTimeout(() => setSuccessMessage(null), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text:', err);
        setError('Failed to copy to clipboard');
      });
  };
  
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/chat')}
            aria-label="Back to Chat"
          >
            <ArrowLeftIcon size={20} />
          </Button>
          <h1 className="text-xl font-semibold">Direct Connect</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.open('https://github.com/manuelLandreau/ultimate-secure-chat', '_blank')}
            aria-label="GitHub"
          >
            <GithubIcon size={20} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/chat')}
            aria-label="Go to chat"
          >
            <MessageSquareIcon size={20} />
          </Button>
        </div>
      </header>
      
      <main className="container mx-auto flex max-w-4xl flex-1 flex-col gap-8 p-4">
        {/* User ID */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <WifiIcon className="text-primary" size={24} />
              <div>
                <h2 className="text-lg font-medium">Your User ID</h2>
                <p className="text-sm text-muted-foreground">Share this ID with others to let them connect to you</p>
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => copyToClipboard(myUserId || '')} aria-label="Copy ID">
              <CopyIcon size={16} className="mr-2" />
              Copy
            </Button>
          </div>
          
          <div className="mt-3 overflow-hidden rounded bg-muted/50 p-3">
            <code className="block truncate text-sm font-mono">
              {myUserId || 'Initializing...'}
            </code>
          </div>
        </div>
      
        {/* Connection Mode Selector */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant={mode === 'create' ? 'default' : 'outline'} 
            onClick={() => setMode('create')}
          >
            Create Connection
          </Button>
          <Button 
            variant={mode === 'join' ? 'default' : 'outline'} 
            onClick={() => setMode('join')}
          >
            Join Connection
          </Button>
        </div>
        
        {/* Error/Success Messages */}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-destructive">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="rounded-md bg-green-100 p-3 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            {successMessage}
          </div>
        )}
        
        {/* Connection Form - Create Connection */}
        {mode === 'create' && (
          <div className="space-y-6">
            {/* Peer Info */}
            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Peer IP Address</label>
                <Input 
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="Enter IP address or ID"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">Contact Name (optional)</label>
                <Input 
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter a name for this contact"
                />
              </div>
              
              <Button type="submit" className="w-full">
                Create Connection
              </Button>
            </form>
            
            {/* Process Answer */}
            <form onSubmit={handleProcessAnswer} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Process Answer</label>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Paste the answer from the other peer"
                  className="font-mono text-xs"
                  rows={6}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={!answer}
                >
                  Process Answer
                </Button>
              </div>
            </form>
          </div>
        )}
        
        {/* Connection Form - Join Connection */}
        {mode === 'join' && (
          <div className="space-y-6">
            {/* Process Offer */}
            <form onSubmit={handleProcessOffer} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Peer IP Address</label>
                <Input 
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="Enter IP address or ID"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">Contact Name (optional)</label>
                <Input 
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter a name for this contact"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">Connection Offer</label>
                <Textarea
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  placeholder="Paste the offer from the other peer"
                  className="font-mono text-xs"
                  rows={6}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full">
                Process Offer & Generate Answer
              </Button>
            </form>
            
            {/* Display Answer */}
            {answer && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Your Answer (send this to the other peer)</label>
                  <div className="relative">
                    <Textarea
                      value={answer}
                      className="font-mono text-xs pr-12"
                      rows={6}
                      readOnly
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => copyToClipboard(answer)}
                      className="absolute right-2 top-2"
                      aria-label="Copy answer"
                    >
                      <CopyIcon size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DirectConnect; 