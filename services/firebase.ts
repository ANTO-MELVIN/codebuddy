import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// TODO: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9Pf9zd6YYLfga1pIMZhgygnVZTgOuddU",
  authDomain: "codebuddy-d5091.firebaseapp.com",
  projectId: "codebuddy-d5091",
  storageBucket: "codebuddy-d5091.firebasestorage.app",
  messagingSenderId: "267301421418",
  appId: "1:267301421418:web:9fdeb4c20fb371fa9fa513",
  measurementId: "G-WHBBYET0P2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Store user info in Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
    } else {
      await setDoc(userRef, {
        lastLogin: new Date().toISOString()
      }, { merge: true });
    }

    return user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const logout = () => signOut(auth);
