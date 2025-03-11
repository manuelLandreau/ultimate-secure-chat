import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useP2PChat } from '../hooks/useP2PChat';
import { useDirectP2PChat } from '../hooks/useDirectP2PChat';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { useTheme } from '../hooks/useTheme';
import { ConfirmDialog } from '../components/ui/Dialog';
import {
  SunIcon,
  MoonIcon,
  UserPlusIcon,
  SendIcon,
  ImageIcon,
  PaperclipIcon,
  MenuIcon,
  XIcon,
  LogOutIcon,
  CopyIcon,
  MessageSquareIcon,
  GithubIcon
} from 'lucide-react';
import { Message } from '../stores/chatStore';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

/**
 * Main chat page
 */
const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  
  // Local states
  const [message, setMessage] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  
  // P2P hook access
  const {
    userProfile,
    contacts,
    conversations,
    activeContactId,
    setActiveContact,
    sendTextMessage,
    sendFile,
    myPeerId,
  } = useP2PChat();
  
  // Direct P2P hook access
  const {
    connectToContact: directConnectToContact,
    pendingConnections,
    acceptConnection,
    rejectConnection
  } = useDirectP2PChat();
  
  // États pour la connexion
  const [ipAddress, setIpAddress] = useState('');
  const [contactName, setContactName] = useState('');
  
  // Form validation
  const isValidForm = ipAddress.trim().length > 0;
  
  // Redirect to login page if not connected
  useEffect(() => {
    if (!userProfile) {
      navigate('/');
    }
  }, [userProfile, navigate]);
  
  // Demander l'autorisation pour les notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);
  
  // Active conversation messages
  const activeConversation = activeContactId ? conversations[activeContactId] : null;
  const messages = activeConversation?.messages || [];
  
  // Active contact
  const activeContact = contacts.find((c) => c.id === activeContactId);
  
  // Copy user ID to clipboard
  const copyPeerId = () => {
    if (myPeerId) {
      navigator.clipboard.writeText(myPeerId);
    }
  };
  
  // Send a text message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (!message.trim() || !activeContactId) {
      return;
    }
    
    try {
      await sendTextMessage(activeContactId, message);
      setMessage('');
      setShowEmojiPicker(false);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };
  
  // Add an emoji to the message
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
  };
  
  // Send a file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (!files || !files.length || !activeContactId) {
      return;
    }
    
    try {
      const file = files[0];
      await sendFile(activeContactId, file);
      
      // Reset file input
      e.target.value = '';
    } catch (err) {
      console.error('Error sending file:', err);
    }
  };
  
  // Date formatting
  const formatMessageTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    
    messages.forEach(message => {
      const date = new Date(message.timestamp).toLocaleDateString();
      const group = groups.find(g => g.date === date);
      
      if (group) {
        group.messages.push(message);
      } else {
        groups.push({ date, messages: [message] });
      }
    });
    
    return groups;
  };
  
  // Date formatting for groups
  const formatGroupDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
    }
  };
  
  // Render message content
  const renderMessageContent = (message: Message) => {
    if (message.type === 'text') {
      return <p className="whitespace-pre-wrap break-words">{message.content}</p>;
    } else if (message.type === 'image') {
      return (
        <div className="mt-1 overflow-hidden rounded-lg">
          <img
            src={message.content}
            alt={message.metadata?.fileName || 'Image'}
            className="max-h-80 w-auto"
          />
        </div>
      );
    } else if (message.type === 'file') {
      return (
        <div className="mt-1 flex items-center gap-2 rounded-lg bg-muted/20 p-3">
          <PaperclipIcon className="h-5 w-5" />
          <div className="flex-1 overflow-hidden">
            <p className="truncate font-medium">{message.metadata?.fileName}</p>
            <p className="text-xs text-muted">
              {message.metadata?.fileSize
                ? `${Math.round(message.metadata.fileSize / 1024)} KB`
                : ''}
            </p>
          </div>
          <a
            href={message.content}
            download={message.metadata?.fileName}
            className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
          </a>
        </div>
      );
    }
    
    return null;
  };
  
  // Se connecter à un nouveau contact
  const handleCreateOffer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!ipAddress.trim()) {
      setError('Please enter the contact IP address');
      return;
    }
    
    // Show confirmation dialog
    setShowConnectDialog(true);
  };
  
  // Confirm connection
  const confirmConnection = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      // Vérifier que l'utilisateur est initialisé
      if (!userProfile) {
        throw new Error('You must be logged in to connect to contacts');
      }
      
      // Se connecter au contact
      await directConnectToContact(ipAddress, contactName || undefined);
      
      // Nettoyer le formulaire
      setIpAddress('');
      setContactName('');
      setShowContactForm(false);
      setShowMobileMenu(false);
      setShowConnectDialog(false);
    } catch (err) {
      setError('Error connecting to contact. Please try again.');
      console.error(err);
      setShowConnectDialog(false);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // If user is not connected, display a message
  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <MessageSquareIcon className="text-primary h-12 w-12 mb-4" />
        <h1 className="text-xl font-semibold mb-2">SecureChat</h1>
        <p className="text-muted mb-6">Chargement de votre profil...</p>
        <div className="w-16 h-1 bg-muted/20 rounded-full overflow-hidden">
          <div className="h-full bg-primary animate-pulse rounded-full"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen w-full flex-col bg-background">
      {/* App header */}
      <header className="fixed left-0 right-0 top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-2">
          <button
            className="block md:hidden"
            onClick={() => setShowMobileMenu(true)}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <MessageSquareIcon className="text-primary" />
          <h1 className="text-lg font-bold">SecureChat</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme} 
            aria-label={isDark ? 'Light mode' : 'Dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open('https://github.com/manuelLandreau/ultimate-secure-chat', '_blank')}
            aria-label="View source on GitHub"
            title="View source on GitHub"
          >
            <GithubIcon size={20} />
          </Button>
        </div>
      </header>
      
      {/* Connection request notifications */}
      {pendingConnections.length > 0 && (
        <div className="fixed right-4 top-20 z-30 w-80 space-y-2">
          {pendingConnections.map((connection) => (
            <div 
              key={connection.id} 
              className="rounded-lg border border-border bg-card p-4 shadow-md"
            >
              <h4 className="font-medium">Connection Request</h4>
              <p className="mb-3 mt-1 text-sm">{connection.name} wants to connect with you</p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => rejectConnection(connection.id)}
                >
                  Decline
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => acceptConnection(connection.id)}
                >
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden pt-16">
        {/* Mobile overlay - backdrop for the sidebar */}
        {showMobileMenu && (
          <div 
            className="fixed inset-0 z-5 bg-black/50 md:hidden" 
            onClick={() => setShowMobileMenu(false)}
            aria-hidden="true"
          />
        )}
        
        {/* Sidebar - Contact list */}
        <aside 
          className={`${
            showMobileMenu ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r border-border bg-background pt-16 transition-transform duration-300 ease-in-out md:static md:translate-x-0`}
          aria-label="Contacts"
        >
          {/* Close button for mobile - positioned at the top right */}
          <button 
            className="absolute right-4 top-4 p-1 md:hidden" 
            onClick={() => setShowMobileMenu(false)}
            aria-label="Close menu"
          >
            <XIcon size={22} />
          </button>
          
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-medium">My contacts</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowContactForm(!showContactForm)}
              aria-label="Add contact"
              title="Add new contact"
            >
              <UserPlusIcon size={18} />
            </Button>
          </div>
          
          {/* Connection confirmation dialog */}
          <ConfirmDialog
            title="Connect to Contact"
            message={`Are you sure you want to connect to ${ipAddress}${contactName ? ` (${contactName})` : ''}? This will initiate a secure peer-to-peer connection.`}
            isOpen={showConnectDialog}
            onClose={() => setShowConnectDialog(false)}
            onConfirm={confirmConnection}
            confirmText="Connect"
            isLoading={isConnecting}
          />
          
          {/* Simplified contact form */}
          {showContactForm && (
            <div className="border-b border-border p-4">
              <h3 className="mb-3 text-sm font-medium">Connect to someone</h3>
              
              {error && (
                <div className="mb-4 rounded-md bg-red-100 p-3 text-red-800 dark:bg-red-900/20 dark:text-red-300 text-xs">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleCreateOffer} className="space-y-3">
                <Input
                  placeholder="Contact IP Address"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  fullWidth
                  disabled={isConnecting}
                />
                <Input
                  placeholder="Contact Name (Optional)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  fullWidth
                  disabled={isConnecting}
                />
                <div className="flex-col space-y-2">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    isLoading={isConnecting}
                    disabled={!isValidForm}
                  >
                    Connect
                  </Button>
                  <p className="text-xs text-muted mt-2">
                    Enter the IP address of the person you want to chat with securely.
                    The connection is direct and encrypted end-to-end.
                  </p>
                </div>
              </form>
            </div>
          )}
          
          {/* Contacts list */}
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted">
                <p>No contacts yet</p>
                <p className="mt-1 text-xs">
                  Add a contact to start chatting securely
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {contacts.map((contact) => {
                  const conversation = conversations[contact.id];
                  const hasUnread = conversation?.unreadCount && conversation.unreadCount > 0;
                  
                  return (
                    <li key={contact.id}>
                      <button
                        className={`flex w-full items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors duration-200 ${
                          activeContactId === contact.id ? 'bg-muted/80' : ''
                        }`}
                        onClick={() => {
                          setActiveContact(contact.id);
                          setShowMobileMenu(false);
                        }}
                      >
                        <Avatar
                          name={contact.name}
                          status={contact.isConnected ? 'online' : 'offline'}
                        />
                        <div className="flex-1 text-left overflow-hidden">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{contact.name}</p>
                            {hasUnread && (
                              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted flex items-center">
                            {contact.isConnected ? (
                              <>
                                <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                                Online
                              </>
                            ) : (
                              <>
                                <span className="inline-block w-2 h-2 rounded-full bg-gray-500 mr-1.5"></span>
                                Offline
                              </>
                            )}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          
          {/* My ID */}
          <div className="border-b border-border p-4">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-medium text-muted">My ID</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0" 
                onClick={copyPeerId}
                aria-label="Copy your ID"
                title="Copy your ID to clipboard"
              >
                <CopyIcon size={14} />
              </Button>
            </div>
            <div className="rounded-md bg-muted/30 p-2">
              <p className="truncate text-xs font-mono" role="textbox" aria-label="Your user ID">
                {myPeerId}
              </p>
            </div>
          </div>
          
          {/* Logout button */}
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-left"
              onClick={() => navigate('/')}
              aria-label="Logout"
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>
        
        {/* Main chat area */}
        <main className="flex-1 overflow-hidden" aria-label="Chat messages">
          {activeContactId ? (
            <div className="flex h-full flex-col">
              {/* Conversation header */}
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <div className="flex items-center gap-3">
                  <button
                    className="block md:hidden"
                    onClick={() => setShowMobileMenu(true)}
                    aria-label="Open menu"
                  >
                    <MenuIcon className="h-5 w-5" />
                  </button>
                  {activeContact && (
                    <>
                      <Avatar
                        name={activeContact.name}
                        status={activeContact.isConnected ? 'online' : 'offline'}
                      />
                      <div>
                        <p className="font-medium">{activeContact.name}</p>
                        <p className="text-xs text-muted">
                          {activeContact.isConnected ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center text-muted">
                    <div>
                      <p>No messages</p>
                      <p className="text-sm">Send a message to start the conversation</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {groupMessagesByDate(messages).map((group, groupIndex) => (
                      <div key={groupIndex} className="space-y-4">
                        <div className="flex items-center justify-center">
                          <span className="text-xs font-medium text-muted bg-background px-2 relative z-10">
                            {formatGroupDate(group.date)}
                          </span>
                        </div>
                        
                        {group.messages.map((msg) => {
                          const isMyMessage = msg.senderId === userProfile.id;
                          
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg px-4 py-2 shadow-message ${
                                  isMyMessage
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted/20 text-foreground'
                                }`}
                              >
                                {renderMessageContent(msg)}
                                <div
                                  className={`mt-1 flex items-center justify-end gap-1 text-xs ${
                                    isMyMessage ? 'text-primary-foreground/80' : 'text-muted'
                                  }`}
                                >
                                  <span>{formatMessageTime(msg.timestamp)}</span>
                                  {isMyMessage && (
                                    <span>
                                      {msg.isDelivered ? (
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-3 w-3"
                                        >
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      ) : msg.isSent ? (
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-3 w-3"
                                        >
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                      ) : (
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="16"
                                          height="16"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-3 w-3"
                                        >
                                          <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                                          <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                                        </svg>
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Input area */}
              <div className="border-t border-border p-4">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message..."
                      fullWidth
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute bottom-1 right-1 text-muted hover:text-foreground"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      😊
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-12 right-0 z-10">
                        <div className="relative">
                          <button
                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-muted text-foreground shadow-md"
                            onClick={() => setShowEmojiPicker(false)}
                          >
                            <XIcon size={14} />
                          </button>
                          <EmojiPicker onEmojiClick={handleEmojiClick} />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <label className="flex cursor-pointer items-center justify-center rounded-full bg-muted p-2 text-foreground hover:bg-muted/80">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <ImageIcon size={20} />
                    </label>
                    
                    <label className="flex cursor-pointer items-center justify-center rounded-full bg-muted p-2 text-foreground hover:bg-muted/80">
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <PaperclipIcon size={20} />
                    </label>
                    
                    <Button
                      type="submit"
                      disabled={!message.trim()}
                      size="icon"
                    >
                      <SendIcon size={20} />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center text-muted">
              <div className="max-w-md">
                <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted/20 mx-auto">
                  <MessageSquareIcon className="h-12 w-12 text-muted" />
                </div>
                <h2 className="mb-2 text-xl font-medium text-foreground">
                  Select a contact to start
                </h2>
                <p className="mb-6">
                  Choose an existing contact or add a new one to start chatting securely.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowContactForm(true);
                    setShowMobileMenu(true);
                  }}
                >
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  Add a new contact
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Chat; 