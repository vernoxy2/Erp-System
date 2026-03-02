import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children, allowedRole, allowedDept }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "user", user.uid));
        setUserData(userDoc.data());
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  
  // Login nathi? → /login
  if (!userData) return <Navigate to="/login" />;
  
  // Role match nathi? → /login
  if (allowedRole && userData.role !== allowedRole) return <Navigate to="/login" />;
  
  // Department match nathi? → /login
  if (allowedDept && userData.department !== allowedDept) return <Navigate to="/login" />;

  return children;
}