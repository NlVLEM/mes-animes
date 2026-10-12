export { initializeApp } from 'firebase/app';
export { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut, browserLocalPersistence, setPersistence } from 'firebase/auth';
export { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, writeBatch, collection, getDocs, onSnapshot, query, where, orderBy, limit, runTransaction, serverTimestamp, documentId } from 'firebase/firestore';
