import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useP2PChat } from '../hooks/useP2PChat';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { useTheme } from '../hooks/useTheme';
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
} from 'lucide-react';
import { Message } from '../stores/chatStore';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

/**
 * Page principale du chat
 */
const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  
  // États locaux
  const [message, setMessage] = useState('');
  const [peerIdInput, setPeerIdInput] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Accès au hook P2P
  const {
    userProfile,
    contacts,
    conversations,
    activeContactId,
    setActiveContact,
    connectToContact,
    sendTextMessage,
    sendFile,
    myPeerId,
  } = useP2PChat();
  
  // Redirige vers la page de login si non connecté
  useEffect(() => {
    if (!userProfile) {
      navigate('/');
    }
  }, [userProfile, navigate]);
  
  // Messages de la conversation active
  const activeConversation = activeContactId ? conversations[activeContactId] : null;
  const messages = activeConversation?.messages || [];
  
  // Contact actif
  const activeContact = contacts.find((contact) => contact.id === activeContactId);
  
  // Trie les contacts par date du dernier message
  const sortedContacts = [...contacts].sort((a, b) => {
    const aLastMessage = conversations[a.id]?.lastMessageTimestamp || 0;
    const bLastMessage = conversations[b.id]?.lastMessageTimestamp || 0;
    return bLastMessage - aLastMessage;
  });
  
  // Copie l'ID du pair dans le presse-papier
  const copyPeerId = () => {
    if (myPeerId) {
      navigator.clipboard.writeText(myPeerId);
    }
  };
  
  // Se connecte à un nouveau contact
  const handleConnectToPeer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!peerIdInput.trim()) {
      setError('Veuillez entrer un ID valide');
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const success = await connectToContact(peerIdInput);
      
      if (success) {
        setPeerIdInput('');
        setShowContactForm(false);
        // Sélectionne le nouveau contact
        setActiveContact(peerIdInput);
      } else {
        setError('Impossible de se connecter à ce pair.');
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.');
      console.error(err);
    } finally {
      setIsConnecting(false);
    }
  };
  
  // Envoie un message texte
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
  
  // Ajoute un emoji au message
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
  };
  
  // Envoie un fichier
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    
    if (!files || !files.length || !activeContactId) {
      return;
    }
    
    try {
      const file = files[0];
      await sendFile(activeContactId, file);
      
      // Réinitialise l'input file
      e.target.value = '';
    } catch (err) {
      console.error('Error sending file:', err);
    }
  };
  
  // Formatage de la date
  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Formatage de la date courte pour le dernier message
  const formatShortDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
  };
  
  // Groupe les messages par date
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
  
  // Formatage de la date pour les groupes
  const formatGroupDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });
    }
  };
  
  // Rendu du contenu du message
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
  
  // Si l'utilisateur n'est pas connecté, afficher un message
  if (!userProfile) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return (
    <div className="flex h-screen w-full flex-col bg-background">
      {/* En-tête */}
      <header className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2">
          <button
            className="block md:hidden"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold">Ultimate Secure Chat</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {isDark ? <SunIcon size={20} /> : <MoonIcon size={20} />}
          </Button>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Liste des contacts */}
        <aside 
          className={`${
            showMobileMenu ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 z-10 flex w-72 flex-col border-r border-border bg-background pt-16 transition-transform duration-300 ease-in-out md:static md:translate-x-0`}
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <h2 className="font-medium">Mes contacts</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowContactForm(!showContactForm)}
              aria-label="Add contact"
            >
              <UserPlusIcon size={18} />
            </Button>
          </div>
          
          {/* Formulaire pour ajouter un contact */}
          {showContactForm && (
            <div className="border-b border-border p-4">
              <form onSubmit={handleConnectToPeer} className="space-y-3">
                <Input
                  placeholder="ID du contact"
                  value={peerIdInput}
                  onChange={(e) => setPeerIdInput(e.target.value)}
                  fullWidth
                  disabled={isConnecting}
                  error={error || undefined}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  isLoading={isConnecting}
                >
                  Ajouter
                </Button>
              </form>
            </div>
          )}
          
          {/* Mon ID */}
          <div className="border-b border-border p-4">
            <p className="mb-1 text-xs text-muted">Mon ID:</p>
            <div className="flex items-center gap-2">
              <code className="block truncate rounded bg-muted/20 px-2 py-1 text-xs flex-1">
                {myPeerId}
              </code>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={copyPeerId}
                className="h-8 w-8"
                aria-label="Copy ID"
              >
                <CopyIcon size={16} />
              </Button>
            </div>
          </div>
          
          {/* Liste des contacts */}
          <div className="flex-1 overflow-y-auto">
            {sortedContacts.length === 0 ? (
              <div className="flex h-full items-center justify-center p-4 text-center text-muted">
                <div>
                  <p>Aucun contact</p>
                  <p className="text-sm">Ajoutez un contact pour commencer à discuter</p>
                </div>
              </div>
            ) : (
              <ul>
                {sortedContacts.map((contact) => {
                  const conversation = conversations[contact.id];
                  const unreadCount = conversation?.unreadCount || 0;
                  const lastMessageTimestamp = conversation?.lastMessageTimestamp || 0;
                  const lastMessage = conversation?.messages[conversation.messages.length - 1];
                  
                  return (
                    <li key={contact.id}>
                      <button
                        className={`flex w-full items-center gap-3 p-3 text-left hover:bg-muted/10 ${
                          contact.id === activeContactId ? 'bg-muted/20' : ''
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
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{contact.name}</p>
                            {lastMessageTimestamp > 0 && (
                              <p className="text-xs text-muted">
                                {formatShortDate(lastMessageTimestamp)}
                              </p>
                            )}
                          </div>
                          {lastMessage && (
                            <p className="truncate text-sm text-muted">
                              {lastMessage.type === 'text'
                                ? lastMessage.content
                                : lastMessage.type === 'image'
                                ? '📷 Image'
                                : `📎 ${lastMessage.metadata?.fileName || 'Fichier'}`}
                            </p>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          
          {/* Bouton de déconnexion */}
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-left"
              onClick={() => navigate('/')}
            >
              <LogOutIcon className="mr-2 h-4 w-4" />
              Déconnexion
            </Button>
          </div>
        </aside>
        
        {/* Zone principale de chat */}
        <main className="flex-1 overflow-hidden">
          {activeContactId ? (
            <div className="flex h-full flex-col">
              {/* En-tête de la conversation */}
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <div className="flex items-center gap-3">
                  <button
                    className="block md:hidden"
                    onClick={() => setShowMobileMenu(true)}
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
                          {activeContact.isConnected ? 'En ligne' : 'Hors ligne'}
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
                      <p>Aucun message</p>
                      <p className="text-sm">Envoyez un message pour commencer la conversation</p>
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
                        
                        {group.messages.map((msg, i) => {
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
              
              {/* Zone de saisie */}
              <div className="border-t border-border p-4">
                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Écrivez votre message..."
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
                  Sélectionnez un contact pour commencer
                </h2>
                <p className="mb-6">
                  Choisissez un contact existant ou ajoutez-en un nouveau pour commencer à discuter de manière sécurisée.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowContactForm(true);
                    setShowMobileMenu(true);
                  }}
                >
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  Ajouter un contact
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