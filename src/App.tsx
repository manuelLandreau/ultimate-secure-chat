import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Chat from './pages/Chat';
import { useEffect } from 'react';
import { useTheme } from './hooks/useTheme';
import useStore from './stores/chatStore';

const App = () => {
  const { theme } = useTheme();
  const isInitialized = useStore(state => state.isInitialized);
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
