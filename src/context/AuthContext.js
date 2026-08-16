import React, { createContext, useContext, useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import { ADMIN_EMAIL, FCM_TOPIC } from '../firebase/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async firebaseUser => {
      setUser(firebaseUser);
      if (initializing) setInitializing(false);

      if (firebaseUser) {
        try {
          await messaging().requestPermission();
          await messaging().subscribeToTopic(FCM_TOPIC);
        } catch (e) {
          console.log('Bildirim izni/abonelik hatası:', e);
        }
      }
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const login = (email, password) => auth().signInWithEmailAndPassword(email.trim(), password);
  const logout = () => auth().signOut();

  return (
    <AuthContext.Provider value={{ user, isAdmin, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
