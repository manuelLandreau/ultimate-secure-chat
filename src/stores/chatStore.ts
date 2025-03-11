import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { KeyPair, exportPrivateKey, exportPublicKey } from '../services/crypto';
import { FileMessage, P2PMessage, TextMessage } from '../services/p2p';

// Types pour les messages et conversations
export interface Contact {
  id: string;
  name: string;
  lastSeen?: number;
  isConnected: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  timestamp: number;
  isRead: boolean;
  isSent: boolean;
  isDelivered: boolean;
  type: 'text' | 'image' | 'file';
  content: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
  };
}

interface Conversation {
  contactId: string;
  messages: Message[];
  unreadCount: number;
  lastMessageTimestamp: number;
}

export interface UserProfile {
  id: string;
  name: string;
  publicKeyJwk?: string;
  privateKeyJwk?: string;
}

interface ChatState {
  // Profil utilisateur
  userProfile: UserProfile | null;
  // Liste des contacts
  contacts: Contact[];
  // Conversations indexées par ID de contact
  conversations: Record<string, Conversation>;
  // Connexion active
  activeContactId: string | null;
  // État initialisation
  isInitialized: boolean;
  
  // Actions
  setUserProfile: (profile: UserProfile) => void;
  updateUserKeys: (keyPair: KeyPair) => Promise<void>;
  addContact: (contact: Contact) => void;
  updateContact: (contactId: string, updates: Partial<Contact>) => void;
  removeContact: (contactId: string) => void;
  setActiveContactId: (contactId: string | null) => void;
  addMessage: (message: Message) => void;
  markMessagesAsRead: (contactId: string) => void;
  updateMessageStatus: (messageId: string, updates: Partial<Pick<Message, 'isRead' | 'isSent' | 'isDelivered'>>) => void;
  clearConversation: (contactId: string) => void;
  handleP2PMessage: (message: P2PMessage) => void;
}

const useStore = create<ChatState>()(
  persist(
    (set, get) => ({
      userProfile: null,
      contacts: [],
      conversations: {},
      activeContactId: null,
      isInitialized: false,
      
      // Actions
      setUserProfile: (profile: UserProfile) => set({ userProfile: profile, isInitialized: true }),
      
      updateUserKeys: async (keyPair: KeyPair) => {
        try {
          // Exporte les clés au format JWK
          const publicKeyJwk = await exportPublicKey(keyPair.publicKey);
          const privateKeyJwk = await exportPrivateKey(keyPair.privateKey);
          
          const { userProfile } = get();
          
          if (userProfile) {
            set({
              userProfile: {
                ...userProfile,
                publicKeyJwk,
                privateKeyJwk
              }
            });
          }
        } catch (error) {
          console.error('Error updating user keys:', error);
          throw error;
        }
      },
      
      addContact: (contact: Contact) => {
        const { contacts, conversations } = get();
        
        // Vérifie si le contact existe déjà
        if (contacts.some(c => c.id === contact.id)) {
          return;
        }
        
        // Ajoute le contact
        set({
          contacts: [...contacts, contact],
          // Initialise une conversation vide si elle n'existe pas
          conversations: {
            ...conversations,
            [contact.id]: conversations[contact.id] || {
              contactId: contact.id,
              messages: [],
              unreadCount: 0,
              lastMessageTimestamp: Date.now()
            }
          }
        });
      },
      
      updateContact: (contactId: string, updates: Partial<Contact>) => {
        const { contacts } = get();
        
        set({
          contacts: contacts.map(contact => 
            contact.id === contactId
              ? { ...contact, ...updates }
              : contact
          )
        });
      },
      
      removeContact: (contactId: string) => {
        const { contacts, conversations } = get();
        
        // Filtre le contact à supprimer
        const updatedContacts = contacts.filter(contact => contact.id !== contactId);
        
        // Supprime la conversation associée
        const { [contactId]: _, ...remainingConversations } = conversations;
        
        set({
          contacts: updatedContacts,
          conversations: remainingConversations,
          // Si le contact actif est supprimé, réinitialise
          activeContactId: get().activeContactId === contactId ? null : get().activeContactId
        });
      },
      
      setActiveContactId: (contactId: string | null) => {
        set({ activeContactId: contactId });
        
        // Marque les messages comme lus si un contact est sélectionné
        if (contactId) {
          get().markMessagesAsRead(contactId);
        }
      },
      
      addMessage: (message: Message) => {
        const { conversations } = get();
        const contactId = message.senderId === get().userProfile?.id
          ? message.recipientId
          : message.senderId;
        
        // Récupère la conversation existante ou crée une nouvelle
        const conversation = conversations[contactId] || {
          contactId,
          messages: [],
          unreadCount: 0,
          lastMessageTimestamp: 0
        };
        
        // Mise à jour des messages
        const updatedMessages = [...conversation.messages, message];
        
        // Mise à jour du compteur de non lus (si message reçu et non ouvert)
        const isIncoming = message.senderId !== get().userProfile?.id;
        const isActiveConversation = get().activeContactId === contactId;
        const unreadCount = isIncoming && !isActiveConversation
          ? conversation.unreadCount + 1
          : conversation.unreadCount;
        
        // Mise à jour de la conversation
        const updatedConversation = {
          ...conversation,
          messages: updatedMessages,
          unreadCount,
          lastMessageTimestamp: message.timestamp
        };
        
        set({
          conversations: {
            ...conversations,
            [contactId]: updatedConversation
          }
        });
      },
      
      markMessagesAsRead: (contactId: string) => {
        const { conversations } = get();
        const conversation = conversations[contactId];
        
        if (!conversation) return;
        
        // Marque tous les messages comme lus
        const updatedMessages = conversation.messages.map(message => 
          message.senderId !== get().userProfile?.id && !message.isRead
            ? { ...message, isRead: true }
            : message
        );
        
        set({
          conversations: {
            ...conversations,
            [contactId]: {
              ...conversation,
              messages: updatedMessages,
              unreadCount: 0
            }
          }
        });
      },
      
      updateMessageStatus: (messageId: string, updates: Partial<Pick<Message, 'isRead' | 'isSent' | 'isDelivered'>>) => {
        const { conversations } = get();
        
        // Parcourt toutes les conversations pour trouver le message
        const updatedConversations = Object.entries(conversations).reduce((acc, [contactId, conversation]) => {
          // Recherche le message dans la conversation
          const messageIndex = conversation.messages.findIndex(msg => msg.id === messageId);
          
          if (messageIndex >= 0) {
            // Message trouvé, mise à jour
            const updatedMessages = [...conversation.messages];
            updatedMessages[messageIndex] = {
              ...updatedMessages[messageIndex],
              ...updates
            };
            
            // Retourne la conversation mise à jour
            return {
              ...acc,
              [contactId]: {
                ...conversation,
                messages: updatedMessages
              }
            };
          }
          
          // Message non trouvé, retourne la conversation inchangée
          return { ...acc, [contactId]: conversation };
        }, {});
        
        set({ conversations: updatedConversations });
      },
      
      clearConversation: (contactId: string) => {
        const { conversations } = get();
        const conversation = conversations[contactId];
        
        if (!conversation) return;
        
        set({
          conversations: {
            ...conversations,
            [contactId]: {
              ...conversation,
              messages: [],
              unreadCount: 0
            }
          }
        });
      },
      
      handleP2PMessage: (p2pMessage: P2PMessage) => {
        const state = get();
        const { contacts } = state;
        
        // Ajoute automatiquement le contact s'il n'existe pas
        const contactExists = contacts.some(contact => contact.id === p2pMessage.sender);
        
        if (!contactExists) {
          state.addContact({
            id: p2pMessage.sender,
            name: `Contact-${p2pMessage.sender.substring(0, 6)}`,
            isConnected: true
          });
        } else {
          // Met à jour le statut de connexion
          state.updateContact(p2pMessage.sender, { isConnected: true });
        }
        
        // Traite le message selon son type
        if (p2pMessage.type === 'TEXT') {
          const textMsg = p2pMessage as TextMessage;
          const content = typeof textMsg.payload === 'string' 
            ? textMsg.payload 
            : JSON.stringify(textMsg.payload);
          
          // Crée un message pour notre store
          const message: Message = {
            id: textMsg.id,
            senderId: textMsg.sender,
            recipientId: state.userProfile?.id || '',
            timestamp: textMsg.timestamp,
            isRead: false,
            isSent: true,
            isDelivered: true,
            type: 'text',
            content
          };
          
          state.addMessage(message);
        } else if (p2pMessage.type === 'IMAGE' || p2pMessage.type === 'FILE') {
          const fileMsg = p2pMessage as FileMessage;
          const fileData = typeof fileMsg.payload.data === 'string'
            ? fileMsg.payload.data
            : JSON.stringify(fileMsg.payload.data);
          
          // Crée un message pour notre store
          const message: Message = {
            id: fileMsg.id,
            senderId: fileMsg.sender,
            recipientId: state.userProfile?.id || '',
            timestamp: fileMsg.timestamp,
            isRead: false,
            isSent: true,
            isDelivered: true,
            type: p2pMessage.type === 'IMAGE' ? 'image' : 'file',
            content: fileData,
            metadata: {
              fileName: fileMsg.payload.name,
              fileSize: fileMsg.payload.size,
              fileType: fileMsg.payload.type
            }
          };
          
          state.addMessage(message);
        }
      }
    }),
    {
      name: 'secure-chat-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        userProfile: state.userProfile,
        contacts: state.contacts,
        conversations: state.conversations,
        isInitialized: state.isInitialized
      })
    }
  )
);

export default useStore; 