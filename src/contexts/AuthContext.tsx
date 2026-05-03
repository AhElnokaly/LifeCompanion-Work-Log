import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDocFromServer, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isOfflineMode: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  continueOffline: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isOfflineMode: false,
  signIn: async () => {},
  logOut: async () => {},
  continueOffline: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOfflineMode, setIsOfflineMode] = useState(() => localStorage.getItem('offlineMode') === 'true');

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    if (!isOfflineMode) {
      testConnection();
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser || !isOfflineMode) {
         setLoading(false);
      }
    });

    if (isOfflineMode) {
        setLoading(false);
    }

    return () => unsubscribe();
  }, [isOfflineMode]);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    setIsOfflineMode(false);
    localStorage.removeItem('offlineMode');
  };

  const continueOffline = () => {
    setIsOfflineMode(true);
    localStorage.setItem('offlineMode', 'true');
    setLoading(false);
  };

  const logOut = async () => {
    await signOut(auth);
    setIsOfflineMode(false);
    localStorage.removeItem('offlineMode');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isOfflineMode, signIn, logOut, continueOffline }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
