import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);  // Firebase user
  const [userInfo, setUserInfo]       = useState(null);  // Firestore user data
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setCurrentUser(firebaseUser);
        // Fetch extra info from Firestore 'user' collection
        try {
          const q = query(collection(db, "user"), where("email", "==", firebaseUser.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data();
            setUserInfo(data);
            localStorage.setItem("userInfo", JSON.stringify(data));
          }
        } catch (e) {
          console.error("Failed to fetch user info:", e);
        }
      } else {
        setCurrentUser(null);
        setUserInfo(null);
        localStorage.removeItem("userInfo");
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserInfo(null);
    localStorage.removeItem("userInfo");
  };

  return (
    <AuthContext.Provider value={{ currentUser, userInfo, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook — use anywhere: const { currentUser, userInfo, logout } = useAuth();
export function useAuth() {
  return useContext(AuthContext);
}