import { db, isFirebaseConfigured } from "../firebase.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const colRef = isFirebaseConfigured ? collection(db, "skills") : null;

export const skillService = {
  async get(id) {
    if (!isFirebaseConfigured) return null;
    try {
      const snap = await getDoc(doc(db, "skills", id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (err) {
      console.error("Error fetching skill from Firestore:", err);
      return null;
    }
  },

  async getAll() {
    if (!isFirebaseConfigured) return [];
    try {
      const querySnap = await getDocs(colRef);
      const list = [];
      querySnap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort by order if present, otherwise by name
      list.sort((a, b) => (a.order || 0) - (b.order || 0) || a.name.localeCompare(b.name));
      return list;
    } catch (err) {
      console.error("Error fetching skills from Firestore:", err);
      return [];
    }
  },

  async create(data) {
    if (!isFirebaseConfigured) return null;
    const docId = data.id || `sk_${Date.now()}`;
    const payload = { ...data };
    delete payload.id;
    return await setDoc(doc(db, "skills", docId), payload);
  },

  async update(id, data) {
    if (!isFirebaseConfigured) return null;
    const payload = { ...data };
    delete payload.id;
    return await setDoc(doc(db, "skills", id), payload);
  },

  async delete(id) {
    if (!isFirebaseConfigured) return null;
    return await deleteDoc(doc(db, "skills", id));
  }
};
