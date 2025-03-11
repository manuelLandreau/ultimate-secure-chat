import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDirectP2PChat } from '../hooks/useDirectP2PChat';
import { Button, Input, Textarea } from '../components/ui';
import { SunIcon, MoonIcon, UserPlusIcon, LogOutIcon, CopyIcon, GithubIcon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

/**
 * Direct Connect Page for establishing WebRTC connections
 */
const DirectConnect: React.FC = () => {
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  
  // Local states for connection data
  const [ipAddress, setIpAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [connectionMode, setConnectionMode] = useState<'create' | 'join'>('create');
  const [offerData, setOfferData] = useState('');
  const [answerData, setAnswerData] = useState('');
  const [iceCandidates, setIceCandidates] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Ajouter un état pour suivre si nous avons vérifié l'initialisation
  const [checkedInitialization, setCheckedInitialization] = useState(false);
  
  // Access the DirectP2P hook
  const {
    userProfile,
    myUserId,
    isInitialized,
    isConnecting,
    connectionError,
    initialize,
    reconnect,
    connectToContact,
    handleContactOffer,
    handleContactAnswer,
    handleIceCandidate
  } = useDirectP2PChat();
  
  // Vérifier l'état d'initialisation
  useEffect(() => {
    const checkInitialization = async () => {
      // Si pas encore vérifié et pas déjà initialisé/en cours d'initialisation
      if (!checkedInitialization && !isInitialized && !isConnecting) {
        try {
          // Essayer de reconnecter avec le profil existant
          const success = await reconnect();
          if (!success) {
            // Rediriger vers la page de connexion si la reconnexion échoue
            navigate('/');
          }
        } catch (err) {
          console.error('Error reconnecting:', err);
          navigate('/');
        } finally {
          setCheckedInitialization(true);
        }
      }
    };
    
    checkInitialization();
  }, [checkedInitialization, isInitialized, isConnecting, reconnect, navigate]);
  
  // Redirect to login if still not initialized after check
  useEffect(() => {
    if (checkedInitialization && !isInitialized && !isConnecting) {
      navigate('/');
    }
  }, [checkedInitialization, isInitialized, isConnecting, navigate]);
  
  // Create a connection offer
  const createOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!ipAddress.trim()) {
      setError('Please enter a valid IP address');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Try to connect to the peer
      await connectToContact(ipAddress, contactName || undefined);
      
      // The actual WebRTC offer generation happens in the DirectP2PService
      // The offer would be logged to console since we don't have a signaling server
      // In a real application, you would need to implement a way to share this offer
      
      setSuccessMessage('Connection initiated! Check console for the offer data.');
      
      // In a real application, you would do this:
      // setOfferData(JSON.stringify(generatedOffer));
    } catch (err) {
      setError('Error creating connection offer. See console for details.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle a received offer
  const handleOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!ipAddress.trim() || !offerData.trim()) {
      setError('Please enter both IP address and offer data');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Parse the offer data
      const offerObject = JSON.parse(offerData);
      
      // Handle the offer and generate an answer
      const answer = await handleContactOffer(ipAddress, offerObject, contactName || undefined);
      
      // Display the answer to be shared
      setAnswerData(JSON.stringify(answer));
      setSuccessMessage('Answer generated! Share this with the other peer.');
    } catch (err) {
      setError('Error processing offer. Please check the format and try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle a received answer
  const handleAnswer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!ipAddress.trim() || !answerData.trim()) {
      setError('Please enter both IP address and answer data');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Parse the answer data
      const answerObject = JSON.parse(answerData);
      
      // Process the answer
      await handleContactAnswer(ipAddress, answerObject);
      
      setSuccessMessage('Answer processed! Connection should be established soon.');
    } catch (err) {
      setError('Error processing answer. Please check the format and try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle ICE candidates
  const handleIceCandidatesSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!ipAddress.trim() || !iceCandidates.trim()) {
      setError('Please enter both IP address and ICE candidate data');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      // Parse the ICE candidate data
      const candidateObjects = JSON.parse(iceCandidates);
      
      // Handle multiple candidates if provided as an array
      if (Array.isArray(candidateObjects)) {
        for (const candidate of candidateObjects) {
          await handleIceCandidate(ipAddress, candidate);
        }
      } else {
        // Handle single candidate
        await handleIceCandidate(ipAddress, candidateObjects);
      }
      
      setSuccessMessage('ICE candidates processed successfully!');
    } catch (err) {
      setError('Error processing ICE candidates. Please check the format and try again.');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccessMessage('Copied to clipboard!');
    
    // Clear success message after 2 seconds
    setTimeout(() => {
      setSuccessMessage(null);
    }, 2000);
  };
  
  // Go to chat page
  const goToChat = () => {
    navigate('/chat');
  };
  
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border p-4">
        <h1 className="text-xl font-bold">Direct P2P Connection</h1>
        
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
            aria-label="Toggle theme"
          >
            {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={goToChat}
            aria-label="Go to Chat"
          >
            <UserPlusIcon size={20} />
          </Button>
        </div>
      </header>
      
      <div className="container mx-auto max-w-3xl p-4">
        {/* User Profile Info */}
        {userProfile && (
          <div className="mb-6 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{userProfile.name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted">
                  <span>Your ID: {myUserId}</span>
                  <button
                    onClick={() => myUserId && copyToClipboard(myUserId)}
                    className="text-primary hover:text-primary/80"
                    aria-label="Copy ID"
                  >
                    <CopyIcon size={14} />
                  </button>
                </div>
              </div>
              <div>
                <span className="flex h-3 w-3 rounded-full bg-green-500"></span>
              </div>
            </div>
          </div>
        )}
        
        {/* Connection Mode Selector */}
        <div className="mb-6 grid grid-cols-2 gap-2">
          <Button 
            onClick={() => setConnectionMode('create')} 
            variant={connectionMode === 'create' ? 'default' : 'outline'}
          >
            Create Connection
          </Button>
          <Button 
            onClick={() => setConnectionMode('join')} 
            variant={connectionMode === 'join' ? 'default' : 'outline'}
          >
            Join Connection
          </Button>
        </div>
        
        {/* Error and Success Messages */}
        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-3 text-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 rounded-md bg-green-100 p-3 text-green-800 dark:bg-green-900/20 dark:text-green-300">
            {successMessage}
          </div>
        )}
        
        {/* Create Connection Mode */}
        {connectionMode === 'create' && (
          <div className="space-y-6">
            <form onSubmit={createOffer} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Peer IP Address</label>
                <Input
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="Enter IP address"
                  required
                />
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium">Contact Name (Optional)</label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter a name for this contact"
                />
              </div>
              
              <Button type="submit" isLoading={isProcessing} className="w-full">
                Create Connection Offer
              </Button>
            </form>
            
            {/* If we have generated offer data to display */}
            {offerData && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Connection Offer (share this)</label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(offerData)}
                  >
                    <CopyIcon size={16} />
                  </Button>
                </div>
                <Textarea
                  value={offerData}
                  readOnly
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>
            )}
            
            {/* Form to handle received answer */}
            {offerData && (
              <form onSubmit={handleAnswer} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Connection Answer (paste from peer)</label>
                  <Textarea
                    value={answerData}
                    onChange={(e) => setAnswerData(e.target.value)}
                    placeholder="Paste the answer from the other peer here"
                    rows={4}
                    className="font-mono text-xs"
                    required
                  />
                </div>
                
                <Button type="submit" isLoading={isProcessing} className="w-full">
                  Process Answer
                </Button>
              </form>
            )}
            
            {/* ICE Candidates Input */}
            <form onSubmit={handleIceCandidatesSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">ICE Candidates (optional)</label>
                <Textarea
                  value={iceCandidates}
                  onChange={(e) => setIceCandidates(e.target.value)}
                  placeholder="Paste ICE candidates from the other peer"
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>
              
              <Button 
                type="submit" 
                variant="outline" 
                isLoading={isProcessing} 
                className="w-full"
                disabled={!iceCandidates}
              >
                Process ICE Candidates
              </Button>
            </form>
          </div>
        )}
        
        {/* Join Connection Mode */}
        {connectionMode === 'join' && (
          <div className="space-y-6">
            <form onSubmit={handleOffer} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Peer IP Address</label>
                <Input
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="Enter IP address"
                  required
                />
              </div>
              
              <div>
                <label className="mb-2 block text-sm font-medium">Contact Name (Optional)</label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter a name for this contact"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">Connection Offer (paste from peer)</label>
                <Textarea
                  value={offerData}
                  onChange={(e) => setOfferData(e.target.value)}
                  placeholder="Paste the offer from the other peer here"
                  rows={4}
                  className="font-mono text-xs"
                  required
                />
              </div>
              
              <Button type="submit" isLoading={isProcessing} className="w-full">
                Process Offer & Generate Answer
              </Button>
            </form>
            
            {/* Display the generated answer */}
            {answerData && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium">Connection Answer (share this)</label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(answerData)}
                  >
                    <CopyIcon size={16} />
                  </Button>
                </div>
                <Textarea
                  value={answerData}
                  readOnly
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>
            )}
            
            {/* ICE Candidates Input */}
            <form onSubmit={handleIceCandidatesSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">ICE Candidates (optional)</label>
                <Textarea
                  value={iceCandidates}
                  onChange={(e) => setIceCandidates(e.target.value)}
                  placeholder="Paste ICE candidates from the other peer"
                  rows={3}
                  className="font-mono text-xs"
                />
              </div>
              
              <Button 
                type="submit" 
                variant="outline" 
                isLoading={isProcessing} 
                className="w-full"
                disabled={!iceCandidates}
              >
                Process ICE Candidates
              </Button>
            </form>
          </div>
        )}
        
        {/* Go to Chat Button */}
        <div className="mt-8">
          <Button 
            onClick={goToChat}
            variant="outline"
            className="w-full"
          >
            Go to Chat
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DirectConnect; 