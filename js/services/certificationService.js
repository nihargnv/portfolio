import { db, isFirebaseConfigured } from "../firebase.js";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const colRef = isFirebaseConfigured ? collection(db, "certifications") : null;

export const certificationService = {
  async get(id) {
    if (!isFirebaseConfigured) return null;
    try {
      const snap = await getDoc(doc(db, "certifications", id));
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (err) {
      console.error("Error fetching certification from Firestore:", err);
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
      return list;
    } catch (err) {
      console.error("Error fetching certifications from Firestore:", err);
      return [];
    }
  },

  async create(data) {
    if (!isFirebaseConfigured) return null;
    const docId = data.id || `cert_${Date.now()}`;
    const payload = { ...data };
    delete payload.id;
    return await setDoc(doc(db, "certifications", docId), payload);
  },

  async update(id, data) {
    if (!isFirebaseConfigured) return null;
    const payload = { ...data };
    delete payload.id;
    return await setDoc(doc(db, "certifications", id), payload);
  },

  async delete(id) {
    if (!isFirebaseConfigured) return null;
    return await deleteDoc(doc(db, "certifications", id));
  }
};
