import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';

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
      getRedirectResult(auth).catch((error) => {
        console.error("Redirect login error:", error);
        if (error.code === 'auth/unauthorized-domain') {
          const domain = window.location.hostname;
          alert(`Authentication Error: The domain ${domain} is not authorized in Firebase. Please go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add it.`);
        } else if (error.code) {
          alert(`Login Error (Redirect): ${error.message} (${error.code})`);
        }
      });
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
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      setIsOfflineMode(false);
      localStorage.removeItem('offlineMode');
    } catch (error: any) {
      console.warn("Popup failed, trying redirect", error);
      
      // If it's an unauthorized domain, show a clear error to the user!
      if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        console.error(`Please add ${domain} to Firebase Auth Authorized Domains`);
        alert(`Authentication Error: The domain ${domain} is not authorized in Firebase. Please go to Firebase Console -> Authentication -> Settings -> Authorized Domains and add it.`);
        return;
      }
      
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
         import('firebase/auth').then(({ signInWithRedirect }) => {
            signInWithRedirect(auth, provider);
         });
      } else {
         alert(`Login Error: ${error.message} (${error.code})`);
      }
    }
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
