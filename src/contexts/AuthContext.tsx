import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update user profile
    await updateProfile(result.user, { displayName });
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', result.user.uid), {
      uid: result.user.uid,
      email: result.user.email,
      displayName: displayName,
      role: email === 'arman.srmis@gmail.com' ? 'admin' : 'user', // Make arman.srmis@gmail.com an admin
      createdAt: new Date()
    });
  };

  const logout = async () => {
    await signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          // Always use the role from Firestore
          const userData = userDoc.data() as User;
          setCurrentUser({
            ...userData,
            // fallback for displayName if missing in Firestore
            displayName: userData.displayName || user.displayName || '',
            email: userData.email || user.email || '',
            uid: userData.uid || user.uid
          });
        } else {
          // Create user document if it doesn't exist (for existing users)
          const userData: User = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            role: user.email === 'arman.srmis@gmail.com' ? 'admin' : 'user',
            createdAt: new Date()
          };
          await setDoc(doc(db, 'users', user.uid), userData);
          setCurrentUser(userData);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};