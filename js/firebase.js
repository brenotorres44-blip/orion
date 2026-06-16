// ══════════════════════════════════════════════
//  ORION — firebase.js
//  Config Firebase + helpers Firestore
// ══════════════════════════════════════════════
import { initializeApp }                          from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword,
         createUserWithEmailAndPassword,
         signOut, onAuthStateChanged,
         GoogleAuthProvider, signInWithPopup,
         updatePassword, EmailAuthProvider,
         reauthenticateWithCredential,
         sendPasswordResetEmail }              from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, doc,
         getDocs, getDoc, setDoc, addDoc,
         updateDoc, deleteDoc, query,
         orderBy, onSnapshot, writeBatch,
         serverTimestamp, where }                 from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyC7MHnCQKU71KnWhCzBnrRmw59L77_G9l8",
  authDomain:        "projeto-logistica-avancada.firebaseapp.com",
  projectId:         "projeto-logistica-avancada",
  storageBucket:     "projeto-logistica-avancada.firebasestorage.app",
  messagingSenderId: "421561042752",
  appId:             "1:421561042752:web:86b60e4f670cf467c3dca5",
  measurementId:     "G-VGE6Y8TW2F"
};

export const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Re-exporta funções do Firebase Auth usadas em outros módulos
export { signInWithEmailAndPassword, createUserWithEmailAndPassword,
         signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup,
         sendPasswordResetEmail, getDoc, getDocs };

// ══════════════════════════════════════════════
//  FIRESTORE HELPERS
// ══════════════════════════════════════════════
const colRef = name => collection(db, name);
const docRef = (col, id) => doc(db, col, id);

export async function fsGetAll(col) {
  const snap = await getDocs(colRef(col));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
export async function fsSet(col, id, data)    { await setDoc(docRef(col,id), data, {merge:true}); }
export async function fsDelete(col, id)       { await deleteDoc(docRef(col,id)); }
export async function fsDeleteAll(col)        {
  const snap = await getDocs(colRef(col));
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}
export { docRef };
