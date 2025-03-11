import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useP2PChat } from '../hooks/useP2PChat';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SunIcon, MoonIcon, LockIcon, MessageSquareIcon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

/**
 * Page de login ou création de profil
 */
const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { initialize, isInitialized, reconnect } = useP2PChat();
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();
  
  // Tente de se reconnecter avec un profil existant
  const handleReconnect = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const success = await reconnect();
      
      if (success) {
        navigate('/chat');
      } else {
        setError('Impossible de se reconnecter. Veuillez créer un nouveau profil.');
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Crée un nouveau profil
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Veuillez entrer un nom d\'utilisateur');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      await initialize(username);
      navigate('/chat');
    } catch (err) {
      setError('Erreur lors de la création du profil. Veuillez réessayer.');
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
        <p className="mb-6 text-center text-muted">Messagerie chiffrée de bout en bout</p>
        
        <div className="mb-6 flex items-center">
          <div className="flex-1 border-t border-border"></div>
          <div className="mx-4 text-sm text-muted">
            <LockIcon className="inline h-4 w-4 mr-1" /> 
            Chiffrement E2E
          </div>
          <div className="flex-1 border-t border-border"></div>
        </div>
        
        {isInitialized ? (
          <div className="space-y-4">
            <p className="text-center">
              Vous avez déjà un profil configuré. Voulez-vous vous reconnecter?
            </p>
            <Button 
              onClick={handleReconnect} 
              className="w-full" 
              isLoading={isLoading}
            >
              Se reconnecter
            </Button>
            <div className="flex items-center">
              <div className="flex-1 border-t border-border"></div>
              <div className="mx-4 text-sm text-muted">ou</div>
              <div className="flex-1 border-t border-border"></div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/chat')} 
              className="w-full"
            >
              Créer un nouveau profil
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                id="username"
                type="text"
                placeholder="Entrez votre nom d'utilisateur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                fullWidth
                disabled={isLoading}
                required
                error={error || undefined}
              />
            </div>
            
            <Button type="submit" className="w-full" isLoading={isLoading}>
              Démarrer le chat
            </Button>
          </form>
        )}
        
        <div className="mt-6 text-center text-xs text-muted">
          <p>
            Pas de serveur, pas de tracking, 100% privé.
          </p>
          <p className="mt-1">
            Vos messages sont chiffrés avec AES-256 et RSA-4096.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login; 