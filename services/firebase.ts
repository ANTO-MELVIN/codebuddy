import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore";

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

// --- Database Functions ---

export const saveUserChats = async (userId: string, chats: any[]) => {
  try {
    // For simplicity in this hackathon, we'll store all chats in a single document or collection
    // Storing as a single JSON blob in a subcollection document is easier for sync if not too large
    // But let's do it properly: subcollection 'chats'
    
    // Actually, to match the current App.tsx state sync style (save all on change), 
    // let's just save the whole state to a single document for now to avoid complex sync logic
    // In a real app, we'd save individual messages.
    
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { chats }, { merge: true });
  } catch (error) {
    console.error("Error saving chats:", error);
  }
};

export const getUserChats = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data().chats || [];
    }
    return [];
  } catch (error) {
    console.error("Error getting chats:", error);
    return [];
  }
};

export const saveUserSnippets = async (userId: string, snippets: any[]) => {
  try {
    const userRef = doc(db, "users", userId);
    await setDoc(userRef, { snippets }, { merge: true });
  } catch (error) {
    console.error("Error saving snippets:", error);
  }
};

export const getUserSnippets = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data().snippets || [];
    }
    return [];
  } catch (error) {
    console.error("Error getting snippets:", error);
    return [];
  }
};

export const registerWithEmail = async (email: string, password: string, name: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const user = result.user;
    
    await updateProfile(user, { displayName: name });

    // Store user info in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: name,
      photoURL: user.photoURL,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    });

    return user;
  } catch (error) {
    console.error("Error registering with email", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = result.user;

    // Update last login
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      lastLogin: new Date().toISOString()
    }, { merge: true });

    return user;
  } catch (error) {
    console.error("Error logging in with email", error);
    throw error;
  }
};
