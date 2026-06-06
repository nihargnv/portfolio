import { db, isFirebaseConfigured } from "../firebase.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const colRef = isFirebaseConfigured ? collection(db, "sections") : null;

export const sectionService = {
  async get(id) {
    if (!isFirebaseConfigured) return null;
    try {
      const snap = await getDoc(doc(db, "sections", id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (err) {
      console.error("Error fetching section from Firestore:", err);
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
      // Sort by order ascending
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      return list;
    } catch (err) {
      console.error("Error fetching sections from Firestore:", err);
      return [];
    }
  },

  async create(data) {
    if (!isFirebaseConfigured) return null;
    const docId = data.id || `s_${Date.now()}`;
    const payload = { ...data };
    delete payload.id;
    return await setDoc(doc(db, "sections", docId), payload);
  },

  async update(id, data) {
    if (!isFirebaseConfigured) return null;
    const payload = { ...data };
    delete payload.id;
    return await setDoc(doc(db, "sections", id), payload);
  },

  async delete(id) {
    if (!isFirebaseConfigured) return null;
    return await deleteDoc(doc(db, "sections", id));
  }
};
