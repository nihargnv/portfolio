import { db, isFirebaseConfigured, auth, googleProvider, signInWithPopup } from '../js/firebase.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return await res.json();
}

export async function runMigration(statusCallback) {
  if (!isFirebaseConfigured) {
    statusCallback("Error: Firebase is not configured yet. Set your API Key in js/firebase.js first.", "error");
    return;
  }

  try {
    statusCallback("Authenticating with Google...", "info");
    const loginResult = await signInWithPopup(auth, googleProvider);
    const user = loginResult.user;
    
    if (!user || !user.email) {
      statusCallback("Authentication failed: No email returned.", "error");
      return;
    }
    
    statusCallback(`Logged in as ${user.email}. Starting migration...`, "success");

    // 1. Fetch JSON files
    statusCallback("Loading JSON data files...", "info");
    const portfolio = await fetchJSON('data/portfolio.json');
    const projects = await fetchJSON('data/projects.json');
    const videos = await fetchJSON('data/videos.json');
    const sections = await fetchJSON('data/sections.json');
    statusCallback("Local JSON files loaded successfully.", "success");

    // 2. Add current user as admin in Firestore
    statusCallback(`Authorizing ${user.email} as administrator...`, "info");
    await setDoc(doc(db, "admins", user.email), {
      email: user.email,
      addedAt: new Date().toISOString(),
      role: "Super Admin"
    });
    statusCallback(`Authorized ${user.email} successfully.`, "success");

    // 3. Migrate profile & settings
    statusCallback("Migrating profile and settings...", "info");
    
    const profilePayload = {
      hero: {
        name: portfolio.hero?.name || '',
        resumeUrl: portfolio.hero?.resumeUrl || '',
        profileImage: portfolio.hero?.profileImage || '',
        titles: portfolio.hero?.titles || [],
        tagline: portfolio.hero?.tagline || '',
        greeting: portfolio.hero?.greeting || "Hi, I'm",
        floatingIcons: portfolio.hero?.floatingIcons || []
      },
      about: {
        bio: portfolio.about?.bio || '',
        summary: portfolio.about?.summary || '',
        interests: portfolio.about?.interests || [],
        education: portfolio.about?.education || []
      },
      contact: {
        email: portfolio.contact?.email || '',
        phone: portfolio.contact?.phone || '',
        location: portfolio.contact?.location || '',
        formSubmitEmail: portfolio.contact?.formSubmitEmail || portfolio.contact?.email || '',
        social: portfolio.contact?.social || {}
      },
      experience: portfolio.experience || [],
      achievements: portfolio.achievements || [],
      codingProfiles: portfolio.codingProfiles || []
    };

    const settingsPayload = {
      meta: portfolio.meta || {},
      theme: portfolio.theme || {},
      stats: portfolio.stats || {}
    };

    await setDoc(doc(db, "profile", "main"), profilePayload);
    await setDoc(doc(db, "settings", "main"), settingsPayload);
    statusCallback("Profile and settings migrated.", "success");

    // 4. Migrate projects
    statusCallback("Migrating projects...", "info");
    for (const proj of projects) {
      statusCallback(`Uploading project: ${proj.title}...`, "info");
      const projId = proj.id;
      const projData = { ...proj };
      delete projData.id;
      await setDoc(doc(db, "projects", projId), projData);
    }
    statusCallback(`${projects.length} projects migrated.`, "success");

    // 5. Migrate videos
    statusCallback("Migrating videos...", "info");
    for (const [idx, vid] of videos.entries()) {
      statusCallback(`Uploading video: ${vid.title}...`, "info");
      const vidId = vid.id || `v_${idx}`;
      const vidData = { ...vid };
      delete vidData.id;
      if (!vidData.order) vidData.order = idx + 1;
      await setDoc(doc(db, "videos", vidId), vidData);
    }
    statusCallback(`${videos.length} videos migrated.`, "success");

    // 6. Migrate custom sections
    statusCallback("Migrating custom dynamic sections...", "info");
    for (const sec of sections) {
      statusCallback(`Uploading section: ${sec.title || sec.type}...`, "info");
      const secId = sec.id;
      const secData = { ...sec };
      delete secData.id;
      // Convert older data schemas to sections schema format
      const content = secData.data || secData.content || {};
      secData.content = content;
      secData.data = content; // mirror support
      await setDoc(doc(db, "sections", secId), secData);
    }
    statusCallback(`${sections.length} custom sections migrated.`, "success");

    // 7. Migrate skills
    statusCallback("Migrating skills...", "info");
    const skills = portfolio.skills || [];
    for (const [idx, skill] of skills.entries()) {
      statusCallback(`Uploading skill: ${skill.name}...`, "info");
      const skillId = `sk_${skill.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
      const skillData = { ...skill, order: idx + 1 };
      await setDoc(doc(db, "skills", skillId), skillData);
    }
    statusCallback(`${skills.length} skills migrated.`, "success");

    // 8. Migrate certifications
    statusCallback("Migrating certifications...", "info");
    const certifications = portfolio.certifications || [];
    for (const [idx, cert] of certifications.entries()) {
      statusCallback(`Uploading certification: ${cert.title}...`, "info");
      const certId = `cert_${idx}`;
      const certData = { ...cert };
      await setDoc(doc(db, "certifications", certId), certData);
    }
    statusCallback(`${certifications.length} certifications migrated.`, "success");

    statusCallback("Migration completed successfully! All data is now live on Firestore.", "success");
  } catch (err) {
    console.error(err);
    statusCallback(`Migration failed: ${err.message}`, "error");
  }
}
