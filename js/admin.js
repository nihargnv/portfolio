/* Admin CMS Dashboard Controller */
import { auth, db, isFirebaseConfigured, googleProvider, signInWithPopup, signOut } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { profileService } from './services/profileService.js';
import { projectService } from './services/projectService.js';
import { videoService } from './services/videoService.js';
import { sectionService } from './services/sectionService.js';
import { skillService } from './services/skillService.js';
import { certificationService } from './services/certificationService.js';

// Global State
let dbPortfolio = null;
let dbProjects = null;
let dbVideos = null;
let dbSections = null;
let quillInstance = null;
let currentAdminUser = null;

// Auth check and page setup
async function checkAdminAccess(user) {
  if (!user) return false;
  if (!isFirebaseConfigured) return true; // dev bypass
  try {
    const adminDocRef = doc(db, "admins", user.email);
    const docSnap = await getDoc(adminDocRef);
    return docSnap.exists();
  } catch (err) {
    console.error("Error checking admin access:", err);
    return false;
  }
}

function initAuth() {
  const overlay = document.getElementById('login-overlay');
  const googleLoginBtn = document.getElementById('google-login-btn');
  const loginErrorMsg = document.getElementById('login-error-msg');

  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      if (!isFirebaseConfigured) {
        showToast("Firebase not configured. Bypassing auth in Dev Mode.", "info");
        overlay.classList.add('hidden');
        await loadInitialData();
        return;
      }
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        console.error("Google login failed:", err);
        showToast("Auth failed: " + err.message, "error");
      }
    });
  }

  if (isFirebaseConfigured) {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const hasAccess = await checkAdminAccess(user);
        if (hasAccess) {
          currentAdminUser = user;
          overlay.classList.add('hidden');
          
          // Load avatar & name in sidebar
          const avatarEl = document.querySelector('.admin-avatar');
          if (avatarEl && user.photoURL) {
            avatarEl.style.backgroundImage = `url(${user.photoURL})`;
            avatarEl.style.backgroundSize = 'cover';
          }
          const infoSpan = document.querySelector('.admin-user-info span');
          if (infoSpan) {
            infoSpan.textContent = user.displayName || user.email;
          }
          
          await loadInitialData();
        } else {
          if (loginErrorMsg) {
            loginErrorMsg.textContent = `Access Denied. ${user.email} is not an authorized administrator email.`;
            loginErrorMsg.style.display = 'block';
          }
          showToast("Unauthorized Email.", "error");
          await signOut(auth);
          setTimeout(() => {
            window.location.href = "index.html";
          }, 3000);
        }
      } else {
        overlay.classList.remove('hidden');
      }
    });
  } else {
    // Show bypass notice for dev environment
    overlay.classList.remove('hidden');
    if (loginErrorMsg) {
      loginErrorMsg.textContent = "Firebase is unconfigured. Click 'Sign in with Google' to bypass (Dev Mode).";
      loginErrorMsg.style.display = 'block';
    }
  }
}

// Load CMS Datasets from Services
async function loadInitialData() {
  try {
    showToast("Loading CMS configurations...", "info");
    
    // Load from Firestore services
    dbPortfolio = await profileService.get();
    dbProjects = await projectService.getAll();
    dbVideos = await videoService.getAll();
    dbSections = await sectionService.getAll();
    
    // Cache inside memory
    saveToLocalStorage();

    // Setup Panels UI
    initNavigation();
    initDashboard();
    setupModals();
    
    showToast("Dashboard ready.", "success");
  } catch (err) {
    console.error("Data load failed:", err);
    showToast("Could not retrieve CMS data.", "error");
  }
}

// Local cache backup
function saveToLocalStorage() {
  localStorage.setItem('cms_portfolio', JSON.stringify(dbPortfolio));
  localStorage.setItem('cms_projects', JSON.stringify(dbProjects));
  localStorage.setItem('cms_videos', JSON.stringify(dbVideos));
  localStorage.setItem('cms_sections', JSON.stringify(dbSections));
}

// Sign-Out handler
const logoutBtn = document.getElementById('admin-logout');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    if (isFirebaseConfigured) {
      await signOut(auth);
    }
    showToast('Logged out successfully.', 'info');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  });
}

// Panel navigation
function initNavigation() {
  const menuItems = document.querySelectorAll('.admin-menu-item');
  const panels = document.querySelectorAll('.admin-panel');
  const pageTitle = document.getElementById('admin-header-title');

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      menuItems.forEach(m => m.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const targetId = item.getAttribute('data-target');
      document.getElementById(targetId).classList.add('active');
      pageTitle.textContent = item.textContent.trim();
      
      const sidebar = document.getElementById('admin-sidebar');
      if (window.innerWidth <= 900) {
        sidebar.classList.remove('active');
      }
    });
  });

  const sideToggle = document.getElementById('admin-sidebar-toggle');
  const sideClose = document.getElementById('admin-sidebar-close');
  const sidebar = document.getElementById('admin-sidebar');

  if (sideToggle && sideClose && sidebar) {
    sideToggle.style.display = 'flex';
    sideClose.style.display = 'flex';
    sideToggle.addEventListener('click', () => sidebar.classList.add('active'));
    sideClose.addEventListener('click', () => sidebar.classList.remove('active'));
  }
}

// Modal closing helpers
function setupModals() {
  const modals = document.querySelectorAll('.admin-modal');
  modals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });

  const closeTriggers = [
    { btn: 'btn-close-skill-modal', modal: 'modal-skill' },
    { btn: 'btn-close-project-modal', modal: 'modal-project' },
    { btn: 'btn-close-video-modal', modal: 'modal-video' },
    { btn: 'btn-close-section-modal', modal: 'modal-section' },
    { btn: 'btn-close-cert-modal', modal: 'modal-cert' },
    { btn: 'btn-close-experience-modal', modal: 'modal-experience' },
    { btn: 'btn-close-education-modal', modal: 'modal-education' }
  ];

  closeTriggers.forEach(t => {
    const el = document.getElementById(t.btn);
    if (el) {
      el.addEventListener('click', () => {
        document.getElementById(t.modal).classList.remove('active');
      });
    }
  });
}

function initDashboard() {
  updateOverviewTotals();
  loadProfileForm();
  loadSkillsList();
  loadProjectsGrid();
  loadVideosGrid();
  loadSectionsBuilder();
  loadCertificationsList();
  loadExperienceList();
  loadEducationList();
  loadSettingsForm();
}

function updateOverviewTotals() {
  document.getElementById('stat-total-skills').textContent = dbPortfolio.skills ? dbPortfolio.skills.length : 0;
  document.getElementById('stat-total-projects').textContent = dbProjects ? dbProjects.length : 0;
  document.getElementById('stat-total-videos').textContent = dbVideos ? dbVideos.length : 0;
  document.getElementById('stat-total-sections').textContent = dbSections ? dbSections.length : 0;
}

/* 1. Profile Manager */
function loadProfileForm() {
  const f = dbPortfolio;
  if (!f) return;
  
  document.getElementById('meta-title').value = f.meta?.title || '';
  document.getElementById('meta-url').value = f.meta?.siteUrl || '';
  document.getElementById('meta-desc').value = f.meta?.description || '';

  document.getElementById('hero-name').value = f.hero?.name || '';
  document.getElementById('hero-resume').value = f.hero?.resumeUrl || '';
  document.getElementById('hero-img').value = f.hero?.profileImage || '';
  document.getElementById('hero-titles').value = f.hero?.titles ? f.hero.titles.join(', ') : '';
  document.getElementById('hero-tagline').value = f.hero?.tagline || '';

  document.getElementById('bio-main').value = f.about?.bio || '';
  document.getElementById('bio-summary').value = f.about?.summary || '';
  document.getElementById('bio-interests').value = f.about?.interests ? f.about.interests.join(', ') : '';

  document.getElementById('contact-email').value = f.contact?.email || '';
  document.getElementById('contact-phone').value = f.contact?.phone || '';
  document.getElementById('contact-location').value = f.contact?.location || '';
  document.getElementById('contact-formsubmit').value = f.contact?.formSubmitEmail || '';

  document.getElementById('social-github').value = f.contact?.social?.github || '';
  document.getElementById('social-linkedin').value = f.contact?.social?.linkedin || '';
  document.getElementById('social-twitter').value = f.contact?.social?.twitter || '';
  document.getElementById('social-youtube').value = f.contact?.social?.youtube || '';
}

const formProfile = document.getElementById('form-profile');
if (formProfile) {
  formProfile.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const profilePayload = {
      hero: {
        name: document.getElementById('hero-name').value,
        resumeUrl: document.getElementById('hero-resume').value,
        profileImage: document.getElementById('hero-img').value,
        titles: document.getElementById('hero-titles').value.split(',').map(s => s.trim()).filter(Boolean),
        tagline: document.getElementById('hero-tagline').value,
        greeting: dbPortfolio.hero?.greeting || "Hi, I'm",
        floatingIcons: dbPortfolio.hero?.floatingIcons || []
      },
      about: {
        bio: document.getElementById('bio-main').value,
        summary: document.getElementById('bio-summary').value,
        interests: document.getElementById('bio-interests').value.split(',').map(s => s.trim()).filter(Boolean),
        education: dbPortfolio.about?.education || []
      },
      contact: {
        email: document.getElementById('contact-email').value,
        phone: document.getElementById('contact-phone').value,
        location: document.getElementById('contact-location').value,
        formSubmitEmail: document.getElementById('contact-formsubmit').value,
        social: {
          github: document.getElementById('social-github').value,
          linkedin: document.getElementById('social-linkedin').value,
          twitter: document.getElementById('social-twitter').value,
          youtube: document.getElementById('social-youtube').value,
          instagram: dbPortfolio.contact?.social?.instagram || ""
        }
      },
      experience: dbPortfolio.experience || [],
      achievements: dbPortfolio.achievements || [],
      codingProfiles: dbPortfolio.codingProfiles || []
    };

    const settingsPayload = {
      meta: {
        title: document.getElementById('meta-title').value,
        siteUrl: document.getElementById('meta-url').value,
        description: document.getElementById('meta-desc').value,
        keywords: dbPortfolio.meta?.keywords || [],
        ogImage: dbPortfolio.meta?.ogImage || ""
      },
      theme: {
        accentColor: dbPortfolio.theme?.accentColor || "#6366f1",
        defaultTheme: dbPortfolio.theme?.defaultTheme || "dark"
      },
      stats: dbPortfolio.stats || {}
    };

    showToast('Saving profile to Firestore...', 'info');
    try {
      await profileService.update(profilePayload);
      await profileService.saveSettings(settingsPayload);
      
      // Update local memory
      dbPortfolio = { ...dbPortfolio, ...profilePayload, ...settingsPayload };
      saveToLocalStorage();
      
      showToast('Profile saved successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save to Firestore. Local memory updated.', 'error');
    }
  });
}

/* 2. Skills Manager */
async function loadSkillsList() {
  const container = document.getElementById('skills-list');
  if (!container) return;
  container.innerHTML = '<div class="loader" style="margin: 20px auto;"></div>';

  try {
    dbPortfolio.skills = await skillService.getAll();
    container.innerHTML = '';

    if (dbPortfolio.skills.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">No skills added yet.</div>';
      return;
    }

    dbPortfolio.skills.forEach((skill, idx) => {
      const item = document.createElement('div');
      item.className = 'draggable-item';
      item.setAttribute('data-index', idx);
      item.innerHTML = `
        <i class="fas fa-grip-lines drag-handle"></i>
        <div class="skill-icon-wrapper" style="width:36px; height:36px; font-size:1.1rem; border-radius:6px; margin:0;"><i class="${skill.icon}"></i></div>
        <div class="drag-content">
          <span class="drag-title">${skill.name}</span>
          <span class="drag-type">${skill.category}</span>
          <span style="font-family:var(--font-mono); font-size:0.85rem; color:var(--text-muted); margin-left:16px;">Level: ${skill.level}%</span>
        </div>
        <div class="drag-actions">
          <button class="btn-icon btn-edit-skill" data-index="${idx}" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-delete-skill" data-index="${idx}" title="Delete" style="color:var(--error-color);"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      container.appendChild(item);
    });

    // Re-bind actions
    container.querySelectorAll('.btn-edit-skill').forEach(btn => {
      btn.addEventListener('click', () => editSkill(parseInt(btn.getAttribute('data-index'))));
    });
    container.querySelectorAll('.btn-delete-skill').forEach(btn => {
      btn.addEventListener('click', () => deleteSkill(parseInt(btn.getAttribute('data-index'))));
    });

    // Init SortableJS drag drop
    new Sortable(container, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: async (evt) => {
        const reordered = [];
        container.querySelectorAll('.draggable-item').forEach((el, newOrder) => {
          const originalIndex = parseInt(el.getAttribute('data-index'));
          const skill = dbPortfolio.skills[originalIndex];
          skill.order = newOrder + 1;
          reordered.push(skill);
        });

        showToast('Saving skill order...', 'info');
        try {
          const promises = reordered.map(s => skillService.update(s.id || `sk_${s.name}`, s));
          await Promise.all(promises);
          dbPortfolio.skills = reordered;
          saveToLocalStorage();
          showToast('Skill order updated!', 'success');
        } catch (err) {
          console.error(err);
          showToast('Failed to update skill order in Firestore.', 'error');
        }
        await loadSkillsList();
      }
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="color:var(--error-color); text-align:center;">Failed to load skills.</div>';
  }
}

const btnAddSkill = document.getElementById('btn-add-skill');
if (btnAddSkill) {
  btnAddSkill.addEventListener('click', () => {
    document.getElementById('skill-modal-title').textContent = 'Add Skill';
    document.getElementById('skill-index').value = '-1';
    document.getElementById('skill-name-input').value = '';
    document.getElementById('skill-icon-input').value = 'fas fa-code';
    document.getElementById('skill-category-input').value = 'Programming';
    document.getElementById('skill-level-input').value = '80';
    document.getElementById('modal-skill').classList.add('active');
  });
}

function editSkill(idx) {
  const s = dbPortfolio.skills[idx];
  document.getElementById('skill-modal-title').textContent = 'Edit Skill';
  document.getElementById('skill-index').value = idx;
  document.getElementById('skill-name-input').value = s.name;
  document.getElementById('skill-icon-input').value = s.icon;
  document.getElementById('skill-category-input').value = s.category;
  document.getElementById('skill-level-input').value = s.level;
  document.getElementById('modal-skill').classList.add('active');
}

async function deleteSkill(idx) {
  const skill = dbPortfolio.skills[idx];
  if (confirm(`Delete skill "${skill.name}"?`)) {
    showToast('Deleting skill...', 'info');
    try {
      const docId = skill.id || `sk_${skill.name}`;
      await skillService.delete(docId);
      dbPortfolio.skills.splice(idx, 1);
      saveToLocalStorage();
      await loadSkillsList();
      updateOverviewTotals();
      showToast('Skill deleted.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete skill.', 'error');
    }
  }
}

const formSkill = document.getElementById('form-skill');
if (formSkill) {
  formSkill.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idx = parseInt(document.getElementById('skill-index').value);
    
    const skillData = {
      name: document.getElementById('skill-name-input').value,
      icon: document.getElementById('skill-icon-input').value,
      category: document.getElementById('skill-category-input').value,
      level: parseInt(document.getElementById('skill-level-input').value),
      order: idx === -1 ? dbPortfolio.skills.length + 1 : (dbPortfolio.skills[idx].order || idx + 1)
    };

    showToast('Saving skill...', 'info');
    try {
      if (idx === -1) {
        const docId = `sk_${Date.now()}`;
        await skillService.create({ id: docId, ...skillData });
        showToast('Skill created successfully.', 'success');
      } else {
        const docId = dbPortfolio.skills[idx].id || `sk_${dbPortfolio.skills[idx].name}`;
        await skillService.update(docId, skillData);
        showToast('Skill updated successfully.', 'success');
      }
      
      document.getElementById('modal-skill').classList.remove('active');
      await loadSkillsList();
      updateOverviewTotals();
    } catch (err) {
      console.error(err);
      showToast('Failed to save skill.', 'error');
    }
  });
}

// Expose functions globally for dynamic DOM onclick actions
window.editSkill = editSkill;
window.deleteSkill = deleteSkill;

/* 3. Project Showcase System */
async function loadProjectsGrid() {
  const container = document.getElementById('projects-list');
  if (!container) return;
  container.innerHTML = '<div class="loader" style="margin: 20px auto;"></div>';

  try {
    dbProjects = await projectService.getAll();
    container.innerHTML = '';

    if (dbProjects.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px; grid-column: 1/-1;">No projects added yet.</div>';
      return;
    }

    dbProjects.forEach(proj => {
      const card = document.createElement('div');
      card.className = 'glass-card admin-crud-card';
      const firstImg = (proj.images && proj.images.length > 0) ? proj.images[0].url : '';
      
      card.innerHTML = `
        <div class="admin-crud-header">
          <div>
            <span class="admin-crud-subtitle">${proj.category} | ${proj.year}</span>
            <h4 class="admin-crud-title">${proj.title}</h4>
          </div>
          ${proj.featured ? `<span class="badge badge-featured">Featured</span>` : ''}
        </div>
        
        <div style="width:100%; height:120px; overflow:hidden; border-radius:4px; margin-bottom:16px; border: 1px solid var(--border-color); background:var(--bg-tertiary);">
          ${firstImg ? `<img src="${firstImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src=''">` : `<div style="display:flex; height:100%; align-items:center; justify-content:center; color:var(--text-muted);"><i class="fas fa-image" style="font-size:2rem;"></i></div>`}
        </div>

        <p class="project-card-desc" style="font-size:0.85rem; margin-bottom:16px;">${proj.shortDescription}</p>
        
        <div class="admin-crud-actions">
          <button class="btn btn-secondary btn-edit-proj" data-id="${proj.id}" style="padding: 8px 16px; font-size:0.85rem; flex-grow:1;"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-secondary btn-delete-proj" data-id="${proj.id}" style="padding:8px; color:var(--error-color);" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.btn-edit-proj').forEach(btn => {
      btn.addEventListener('click', () => editProject(btn.getAttribute('data-id')));
    });
    container.querySelectorAll('.btn-delete-proj').forEach(btn => {
      btn.addEventListener('click', () => deleteProject(btn.getAttribute('data-id')));
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="color:var(--error-color); text-align:center; grid-column:1/-1;">Failed to load projects.</div>';
  }
}

const btnAddProj = document.getElementById('btn-add-project');
if (btnAddProj) {
  btnAddProj.addEventListener('click', () => {
    document.getElementById('project-modal-title').textContent = 'Add Project';
    document.getElementById('project-slug-id').value = '';
    document.getElementById('project-edit-mode').value = 'create';
    
    document.getElementById('proj-title-input').value = '';
    document.getElementById('proj-slug-input').value = '';
    document.getElementById('proj-slug-input').removeAttribute('readonly');
    document.getElementById('proj-cat-input').value = '';
    document.getElementById('proj-year-input').value = new Date().getFullYear();
    document.getElementById('proj-status-input').value = 'Completed';
    document.getElementById('proj-featured-input').checked = false;
    document.getElementById('proj-sdesc-input').value = '';
    document.getElementById('proj-problem-input').value = '';
    document.getElementById('proj-solution-input').value = '';
    document.getElementById('proj-demo-input').value = '';
    document.getElementById('proj-github-input').value = '';
    document.getElementById('proj-tags-input').value = '';
    document.getElementById('proj-techs-input').value = '';
    document.getElementById('proj-features-input-text').value = '';
    document.getElementById('proj-timeline-input-text').value = '';
    document.getElementById('proj-challenges-input-text').value = '';
    document.getElementById('proj-achievements-input-text').value = '';
    document.getElementById('proj-future-input').value = '';
    document.getElementById('proj-images-input-text').value = '';
    document.getElementById('proj-vids-input-text').value = '';

    document.getElementById('modal-project').classList.add('active');
  });
}

function editProject(id) {
  const p = dbProjects.find(item => item.id === id);
  if (!p) return;

  document.getElementById('project-modal-title').textContent = 'Edit Project';
  document.getElementById('project-slug-id').value = id;
  document.getElementById('project-edit-mode').value = 'edit';
  
  document.getElementById('proj-title-input').value = p.title || '';
  document.getElementById('proj-slug-input').value = p.id || '';
  document.getElementById('proj-slug-input').setAttribute('readonly', 'true');
  document.getElementById('proj-cat-input').value = p.category || '';
  document.getElementById('proj-year-input').value = p.year || '';
  document.getElementById('proj-status-input').value = p.status || 'Completed';
  document.getElementById('proj-featured-input').checked = !!p.featured;
  document.getElementById('proj-sdesc-input').value = p.shortDescription || '';
  document.getElementById('proj-problem-input').value = p.problemStatement || '';
  document.getElementById('proj-solution-input').value = p.solution || '';
  document.getElementById('proj-demo-input').value = p.demoLink || '';
  document.getElementById('proj-github-input').value = p.githubLink || '';
  document.getElementById('proj-tags-input').value = p.tags ? p.tags.join(', ') : '';
  document.getElementById('proj-techs-input').value = p.techStack ? p.techStack.join(', ') : '';
  
  document.getElementById('proj-features-input-text').value = p.features ? p.features.join('\n') : '';
  
  const timelineText = p.timeline ? p.timeline.map(t => `${t.date} | ${t.title} | ${t.description}`).join('\n') : '';
  document.getElementById('proj-timeline-input-text').value = timelineText;

  document.getElementById('proj-challenges-input-text').value = p.challenges ? p.challenges.join('\n') : '';
  document.getElementById('proj-achievements-input-text').value = p.achievements ? p.achievements.join('\n') : '';
  document.getElementById('proj-future-input').value = p.futureScope || '';

  const imagesText = p.images ? p.images.map(img => `${img.url} | ${img.caption || ''}`).join('\n') : '';
  document.getElementById('proj-images-input-text').value = imagesText;

  const vidsText = p.youtubeVideos ? p.youtubeVideos.map(v => `${v.id} | ${v.title}`).join('\n') : '';
  document.getElementById('proj-vids-input-text').value = vidsText;

  document.getElementById('modal-project').classList.add('active');
}

async function deleteProject(id) {
  if (confirm(`Delete project details for "${id}"?`)) {
    showToast('Deleting project...', 'info');
    try {
      await projectService.delete(id);
      const idx = dbProjects.findIndex(p => p.id === id);
      if (idx !== -1) dbProjects.splice(idx, 1);
      saveToLocalStorage();
      await loadProjectsGrid();
      updateOverviewTotals();
      showToast('Project deleted successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete project.', 'error');
    }
  }
}

const formProj = document.getElementById('form-project');
if (formProj) {
  formProj.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = document.getElementById('project-edit-mode').value;
    const slug = document.getElementById('proj-slug-input').value.trim();

    // Map fields
    const timeline = document.getElementById('proj-timeline-input-text').value.split('\n')
      .filter(line => line.includes('|'))
      .map(line => {
        const parts = line.split('|');
        return {
          date: parts[0]?.trim(),
          title: parts[1]?.trim(),
          description: parts[2]?.trim() || ''
        };
      });

    const images = document.getElementById('proj-images-input-text').value.split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        const parts = line.split('|');
        return {
          url: parts[0]?.trim(),
          caption: parts[1]?.trim() || ''
        };
      });

    const youtubeVideos = document.getElementById('proj-vids-input-text').value.split('\n')
      .filter(line => line.includes('|'))
      .map(line => {
        const parts = line.split('|');
        return {
          id: parts[0]?.trim(),
          title: parts[1]?.trim()
        };
      });

    const proj = {
      id: slug,
      title: document.getElementById('proj-title-input').value,
      shortDescription: document.getElementById('proj-sdesc-input').value,
      fullDescription: document.getElementById('proj-sdesc-input').value, // mirror sdesc
      problemStatement: document.getElementById('proj-problem-input').value,
      solution: document.getElementById('proj-solution-input').value,
      features: document.getElementById('proj-features-input-text').value.split('\n').map(s => s.trim()).filter(Boolean),
      techStack: document.getElementById('proj-techs-input').value.split(',').map(s => s.trim()).filter(Boolean),
      images: images,
      youtubeVideos: youtubeVideos,
      githubLink: document.getElementById('proj-github-input').value,
      demoLink: document.getElementById('proj-demo-input').value,
      timeline: timeline,
      achievements: document.getElementById('proj-achievements-input-text').value.split('\n').map(s => s.trim()).filter(Boolean),
      challenges: document.getElementById('proj-challenges-input-text').value.split('\n').map(s => s.trim()).filter(Boolean),
      futureScope: document.getElementById('proj-future-input').value,
      featured: document.getElementById('proj-featured-input').checked,
      status: document.getElementById('proj-status-input').value,
      year: document.getElementById('proj-year-input').value,
      category: document.getElementById('proj-cat-input').value,
      tags: document.getElementById('proj-tags-input').value.split(',').map(s => s.trim()).filter(Boolean)
    };

    showToast('Saving project...', 'info');
    try {
      if (mode === 'create') {
        if (dbProjects.some(p => p.id === slug)) {
          showToast('Slug ID already exists. Use a unique name.', 'error');
          return;
        }
        await projectService.create(proj);
        showToast('Project created successfully.', 'success');
      } else {
        await projectService.update(slug, proj);
        showToast('Project updated successfully.', 'success');
      }

      document.getElementById('modal-project').classList.remove('active');
      await loadProjectsGrid();
      updateOverviewTotals();
    } catch (err) {
      console.error(err);
      showToast('Failed to save project.', 'error');
    }
  });
}

window.editProject = editProject;
window.deleteProject = deleteProject;

/* 4. Videos manager */
async function loadVideosGrid() {
  const container = document.getElementById('videos-list');
  if (!container) return;
  container.innerHTML = '<div class="loader" style="margin: 20px auto;"></div>';

  try {
    dbVideos = await videoService.getAll();
    container.innerHTML = '';

    if (dbVideos.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px; grid-column:1/-1;">No videos added yet.</div>';
      return;
    }

    dbVideos.forEach((vid, idx) => {
      const card = document.createElement('div');
      card.className = 'glass-card admin-crud-card';
      card.innerHTML = `
        <div class="admin-crud-header">
          <div>
            <span class="admin-crud-subtitle">${vid.category}</span>
            <h4 class="admin-crud-title">${vid.title}</h4>
          </div>
        </div>
        <div style="width:100%; height:120px; border-radius:4px; overflow:hidden; border: 1px solid var(--border-color); background:#000; margin-bottom:16px;">
          <iframe src="https://www.youtube.com/embed/${vid.youtubeId}" style="width:100%; height:100%; border:0;" allowfullscreen></iframe>
        </div>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:12px;">${vid.description}</p>
        <div class="admin-crud-actions">
          <button class="btn btn-secondary btn-edit-vid" data-index="${idx}" style="padding: 8px 16px; font-size:0.85rem; flex-grow:1;"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-secondary btn-delete-vid" data-index="${idx}" style="padding:8px; color:var(--error-color);" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.btn-edit-vid').forEach(btn => {
      btn.addEventListener('click', () => editVideo(parseInt(btn.getAttribute('data-index'))));
    });
    container.querySelectorAll('.btn-delete-vid').forEach(btn => {
      btn.addEventListener('click', () => deleteVideo(parseInt(btn.getAttribute('data-index'))));
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="color:var(--error-color); text-align:center; grid-column:1/-1;">Failed to load videos.</div>';
  }
}

const btnAddVideo = document.getElementById('btn-add-video');
if (btnAddVideo) {
  btnAddVideo.addEventListener('click', () => {
    document.getElementById('video-modal-title').textContent = 'Add YouTube Video';
    document.getElementById('video-index').value = '-1';
    document.getElementById('video-title-input').value = '';
    document.getElementById('video-id-input').value = '';
    document.getElementById('video-cat-input').value = 'Tutorial';
    document.getElementById('video-desc-input').value = '';
    document.getElementById('video-tags-input').value = '';
    document.getElementById('modal-video').classList.add('active');
  });
}

function editVideo(idx) {
  const v = dbVideos[idx];
  document.getElementById('video-modal-title').textContent = 'Edit YouTube Video';
  document.getElementById('video-index').value = idx;
  document.getElementById('video-title-input').value = v.title;
  document.getElementById('video-id-input').value = v.youtubeId;
  document.getElementById('video-cat-input').value = v.category || 'Tutorial';
  document.getElementById('video-desc-input').value = v.description || '';
  document.getElementById('video-tags-input').value = v.tags ? v.tags.join(', ') : '';
  document.getElementById('modal-video').classList.add('active');
}

async function deleteVideo(idx) {
  const vid = dbVideos[idx];
  if (confirm(`Delete video "${vid.title}"?`)) {
    showToast('Deleting video...', 'info');
    try {
      const docId = vid.id || `v_${idx}`;
      await videoService.delete(docId);
      dbVideos.splice(idx, 1);
      saveToLocalStorage();
      await loadVideosGrid();
      updateOverviewTotals();
      showToast('Video removed successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete video.', 'error');
    }
  }
}

const formVideo = document.getElementById('form-video');
if (formVideo) {
  formVideo.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idx = parseInt(document.getElementById('video-index').value);

    const vid = {
      title: document.getElementById('video-title-input').value,
      youtubeId: document.getElementById('video-id-input').value.trim(),
      category: document.getElementById('video-cat-input').value,
      description: document.getElementById('video-desc-input').value,
      tags: document.getElementById('video-tags-input').value.split(',').map(s => s.trim()).filter(Boolean),
      thumbnail: '',
      duration: idx === -1 ? '10:00' : (dbVideos[idx].duration || '10:00'),
      views: idx === -1 ? '1K' : (dbVideos[idx].views || '1K'),
      featured: true,
      order: idx === -1 ? dbVideos.length + 1 : (dbVideos[idx].order || idx + 1)
    };

    showToast('Saving video details...', 'info');
    try {
      if (idx === -1) {
        const docId = `v_${Date.now()}`;
        await videoService.create({ id: docId, ...vid });
        showToast('YouTube video created.', 'success');
      } else {
        const docId = dbVideos[idx].id || `v_${idx}`;
        await videoService.update(docId, vid);
        showToast('YouTube video details saved.', 'success');
      }

      document.getElementById('modal-video').classList.remove('active');
      await loadVideosGrid();
      updateOverviewTotals();
    } catch (err) {
      console.error(err);
      showToast('Failed to save video.', 'error');
    }
  });
}

window.editVideo = editVideo;
window.deleteVideo = deleteVideo;

/* 5. Custom Section Builder */
async function loadSectionsBuilder() {
  const container = document.getElementById('sections-list');
  if (!container) return;
  container.innerHTML = '<div class="loader" style="margin: 20px auto;"></div>';

  try {
    dbSections = await sectionService.getAll();
    container.innerHTML = '';

    if (dbSections.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">No sections built yet.</div>';
      return;
    }

    dbSections.forEach((sec, idx) => {
      const item = document.createElement('div');
      item.className = 'draggable-item';
      item.setAttribute('data-id', sec.id);
      item.setAttribute('data-index', idx);
      item.innerHTML = `
        <i class="fas fa-grip-lines drag-handle"></i>
        <div class="drag-content">
          <span class="drag-title">${sec.title || '(No Title)'}</span>
          <span class="drag-type">${sec.type}</span>
          <span style="font-size:0.8rem; color:${sec.enabled ? 'var(--success-color)' : 'var(--text-muted)'}; margin-left:16px;">
            <i class="fas ${sec.enabled ? 'fa-eye' : 'fa-eye-slash'}"></i> ${sec.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <div class="drag-actions">
          <button class="btn-icon btn-toggle-sec" data-id="${sec.id}" title="${sec.enabled ? 'Disable' : 'Enable'}"><i class="fas ${sec.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}"></i></button>
          <button class="btn-icon btn-edit-sec" data-id="${sec.id}" title="Edit Content"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-delete-sec" data-id="${sec.id}" title="Remove" style="color:var(--error-color);"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      container.appendChild(item);
    });

    container.querySelectorAll('.btn-toggle-sec').forEach(btn => {
      btn.addEventListener('click', () => toggleSectionStatus(btn.getAttribute('data-id')));
    });
    container.querySelectorAll('.btn-edit-sec').forEach(btn => {
      btn.addEventListener('click', () => editSection(btn.getAttribute('data-id')));
    });
    container.querySelectorAll('.btn-delete-sec').forEach(btn => {
      btn.addEventListener('click', () => deleteSection(btn.getAttribute('data-id')));
    });

    // Reorder dragging
    new Sortable(container, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: async () => {
        const reordered = [];
        const promises = [];
        container.querySelectorAll('.draggable-item').forEach((el, orderIdx) => {
          const id = el.getAttribute('data-id');
          const originalSec = dbSections.find(s => s.id === id);
          originalSec.order = orderIdx + 1;
          reordered.push(originalSec);
          promises.push(sectionService.update(id, originalSec));
        });

        showToast('Saving section order...', 'info');
        try {
          await Promise.all(promises);
          dbSections = reordered;
          saveToLocalStorage();
          showToast('Section order saved.', 'success');
        } catch (err) {
          console.error(err);
          showToast('Failed to save section order to Firestore.', 'error');
        }
        await loadSectionsBuilder();
      }
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="color:var(--error-color); text-align:center;">Failed to load sections.</div>';
  }
}

const secTypeSelect = document.getElementById('section-type-select');
if (secTypeSelect) {
  secTypeSelect.addEventListener('change', () => {
    switchSectionEditorLayout(secTypeSelect.value);
  });
}

function switchSectionEditorLayout(type) {
  const subpanels = document.querySelectorAll('.layout-editor-subpanel');
  subpanels.forEach(p => p.style.display = 'none');
  
  // Normalize casing for DOM mapping
  let elementId = `editor-${type}`;
  if (type === 'richText') elementId = 'editor-rich-text';
  if (type === 'codeBlock') elementId = 'editor-code-block';
  if (type === 'imageBanner') elementId = 'editor-image-banner';
  if (type === 'customHTML') elementId = 'editor-custom-html';
  if (type === 'CTA') elementId = 'editor-cta';
  
  const target = document.getElementById(elementId);
  if (target) target.style.display = 'block';

  // Lazy Init Quill
  if ((type === 'rich-text' || type === 'richText') && !quillInstance) {
    quillInstance = new Quill('#quill-editor', {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'blockquote', 'code-block'],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          ['link', 'image']
        ]
      }
    });
  }
}

const btnAddSec = document.getElementById('btn-add-section');
if (btnAddSec) {
  btnAddSec.addEventListener('click', () => {
    document.getElementById('section-modal-title').textContent = 'Create Homepage Section';
    document.getElementById('section-id-input').value = '';
    document.getElementById('section-edit-mode').value = 'create';
    
    document.getElementById('section-name-title').value = '';
    document.getElementById('section-type-select').value = 'rich-text';
    document.getElementById('section-type-select').removeAttribute('disabled');
    
    switchSectionEditorLayout('rich-text');
    if (quillInstance) quillInstance.setText('');

    document.getElementById('section-timeline-text').value = '';
    document.getElementById('section-stats-text').value = '';
    document.getElementById('section-gallery-text').value = '';
    document.getElementById('section-youtube-text').value = '';
    document.getElementById('quote-text-input').value = '';
    document.getElementById('quote-author-input').value = '';
    document.getElementById('quote-role-input').value = '';
    document.getElementById('cta-heading-input').value = '';
    document.getElementById('cta-subheading-input').value = '';
    document.getElementById('cta-pbtn-label').value = '';
    document.getElementById('cta-pbtn-url').value = '';
    document.getElementById('cta-sbtn-label').value = '';
    document.getElementById('cta-sbtn-url').value = '';
    document.getElementById('code-block-input').value = '';
    document.getElementById('ib-url').value = '';
    document.getElementById('ib-title').value = '';
    document.getElementById('custom-html-input').value = '';

    document.getElementById('modal-section').classList.add('active');
  });
}

function editSection(id) {
  const sec = dbSections.find(s => s.id === id);
  if (!sec) return;

  document.getElementById('section-modal-title').textContent = 'Edit Homepage Section';
  document.getElementById('section-id-input').value = id;
  document.getElementById('section-edit-mode').value = 'edit';
  
  document.getElementById('section-name-title').value = sec.title || '';
  document.getElementById('section-type-select').value = sec.type;
  document.getElementById('section-type-select').setAttribute('disabled', 'true');
  
  switchSectionEditorLayout(sec.type);

  const secData = sec.data || sec.content || {};

  if (sec.type === 'rich-text' || sec.type === 'richText') {
    if (quillInstance) {
      quillInstance.root.innerHTML = secData.content || '';
    } else {
      setTimeout(() => {
        if (quillInstance) quillInstance.root.innerHTML = secData.content || '';
      }, 200);
    }
  } else if (sec.type === 'timeline') {
    document.getElementById('section-timeline-text').value = secData.items ? secData.items.map(t => `${t.date} | ${t.title} | ${t.description}`).join('\n') : '';
  } else if (sec.type === 'statistics') {
    document.getElementById('section-stats-text').value = secData.stats ? secData.stats.map(s => `${s.icon} | ${s.value} | ${s.label}`).join('\n') : '';
  } else if (sec.type === 'gallery') {
    document.getElementById('section-gallery-text').value = secData.images ? secData.images.map(img => `${img.url} | ${img.caption}`).join('\n') : '';
  } else if (sec.type === 'youtube') {
    document.getElementById('section-youtube-text').value = secData.videos ? secData.videos.map(v => `${v.id} | ${v.title}`).join('\n') : '';
  } else if (sec.type === 'quote') {
    document.getElementById('quote-text-input').value = secData.text || '';
    document.getElementById('quote-author-input').value = secData.author || '';
    document.getElementById('quote-role-input').value = secData.role || '';
  } else if (sec.type === 'cta' || sec.type === 'CTA') {
    document.getElementById('cta-heading-input').value = secData.heading || '';
    document.getElementById('cta-subheading-input').value = secData.subheading || '';
    document.getElementById('cta-pbtn-label').value = secData.primaryButton ? secData.primaryButton.label : '';
    document.getElementById('cta-pbtn-url').value = secData.primaryButton ? secData.primaryButton.url : '';
    document.getElementById('cta-sbtn-label').value = secData.secondaryButton ? secData.secondaryButton.label : '';
    document.getElementById('cta-sbtn-url').value = secData.secondaryButton ? secData.secondaryButton.url : '';
  } else if (sec.type === 'code-block' || sec.type === 'codeBlock') {
    document.getElementById('code-block-input').value = secData.code || '';
  } else if (sec.type === 'image-banner' || sec.type === 'imageBanner') {
    document.getElementById('ib-url').value = secData.url || '';
    document.getElementById('ib-title').value = secData.title || '';
  } else if (sec.type === 'custom-html' || sec.type === 'customHTML') {
    document.getElementById('custom-html-input').value = secData.html || '';
  }

  document.getElementById('modal-section').classList.add('active');
}

async function toggleSectionStatus(id) {
  const sec = dbSections.find(s => s.id === id);
  if (sec) {
    sec.enabled = !sec.enabled;
    showToast('Toggling section status...', 'info');
    try {
      await sectionService.update(id, sec);
      saveToLocalStorage();
      await loadSectionsBuilder();
      showToast(`Section ${sec.enabled ? 'enabled' : 'disabled'}.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to update section state in Firestore.', 'error');
    }
  }
}

async function deleteSection(id) {
  if (confirm('Delete this homepage section permanently?')) {
    showToast('Removing section...', 'info');
    try {
      await sectionService.delete(id);
      const idx = dbSections.findIndex(s => s.id === id);
      if (idx !== -1) dbSections.splice(idx, 1);
      saveToLocalStorage();
      await loadSectionsBuilder();
      updateOverviewTotals();
      showToast('Section removed.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete section.', 'error');
    }
  }
}

const formSection = document.getElementById('form-section');
if (formSection) {
  formSection.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = document.getElementById('section-edit-mode').value;
    let id = document.getElementById('section-id-input').value;
    const type = document.getElementById('section-type-select').value;
    const title = document.getElementById('section-name-title').value;

    let contentPayload = {};

    if (type === 'rich-text' || type === 'richText') {
      contentPayload.content = quillInstance.root.innerHTML;
    } else if (type === 'timeline') {
      contentPayload.items = document.getElementById('section-timeline-text').value.split('\n')
        .filter(l => l.includes('|'))
        .map(l => {
          const parts = l.split('|');
          return { date: parts[0]?.trim(), title: parts[1]?.trim(), description: parts[2]?.trim() || '' };
        });
    } else if (type === 'statistics') {
      contentPayload.stats = document.getElementById('section-stats-text').value.split('\n')
        .filter(l => l.includes('|'))
        .map(l => {
          const parts = l.split('|');
          return { icon: parts[0]?.trim(), value: parts[1]?.trim(), label: parts[2]?.trim() };
        });
    } else if (type === 'gallery') {
      contentPayload.images = document.getElementById('section-gallery-text').value.split('\n')
        .filter(l => l.trim().length > 0)
        .map(l => {
          const parts = l.split('|');
          return { url: parts[0]?.trim(), caption: parts[1]?.trim() || '' };
        });
    } else if (type === 'youtube') {
      contentPayload.videos = document.getElementById('section-youtube-text').value.split('\n')
        .filter(l => l.includes('|'))
        .map(l => {
          const parts = l.split('|');
          return { id: parts[0]?.trim(), title: parts[1]?.trim() };
        });
    } else if (type === 'quote') {
      contentPayload.text = document.getElementById('quote-text-input').value;
      contentPayload.author = document.getElementById('quote-author-input').value;
      contentPayload.role = document.getElementById('quote-role-input').value;
    } else if (type === 'cta' || type === 'CTA') {
      contentPayload.heading = document.getElementById('cta-heading-input').value;
      contentPayload.subheading = document.getElementById('cta-subheading-input').value;
      contentPayload.primaryButton = {
        label: document.getElementById('cta-pbtn-label').value,
        url: document.getElementById('cta-pbtn-url').value
      };
      contentPayload.secondaryButton = {
        label: document.getElementById('cta-sbtn-label').value,
        url: document.getElementById('cta-sbtn-url').value
      };
    } else if (type === 'code-block' || type === 'codeBlock') {
      contentPayload.code = document.getElementById('code-block-input').value;
    } else if (type === 'image-banner' || type === 'imageBanner') {
      contentPayload.url = document.getElementById('ib-url').value;
      contentPayload.title = document.getElementById('ib-title').value;
    } else if (type === 'custom-html' || type === 'customHTML') {
      contentPayload.html = document.getElementById('custom-html-input').value;
    }

    const payload = {
      type: type,
      title: title,
      enabled: true,
      order: mode === 'create' ? dbSections.length + 1 : dbSections.find(s => s.id === id).order,
      content: contentPayload,
      data: contentPayload // mirror compatibility
    };

    showToast('Saving section...', 'info');
    try {
      if (mode === 'create') {
        id = `s_${Date.now()}`;
        await sectionService.create({ id: id, ...payload });
        showToast('Section built successfully.', 'success');
      } else {
        await sectionService.update(id, payload);
        showToast('Section updated successfully.', 'success');
      }

      document.getElementById('modal-section').classList.remove('active');
      await loadSectionsBuilder();
      updateOverviewTotals();
    } catch (err) {
      console.error(err);
      showToast('Failed to save custom section.', 'error');
    }
  });
}

window.toggleSectionStatus = toggleSectionStatus;
window.editSection = editSection;
window.deleteSection = deleteSection;

/* 6. Certifications CRUD */
async function loadCertificationsList() {
  const container = document.getElementById('certs-list');
  if (!container) return;
  container.innerHTML = '<div class="loader" style="margin: 20px auto;"></div>';

  try {
    dbPortfolio.certifications = await certificationService.getAll();
    container.innerHTML = '';

    if (dbPortfolio.certifications.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px; grid-column:1/-1;">No certifications added yet.</div>';
      return;
    }

    dbPortfolio.certifications.forEach((c, idx) => {
      const card = document.createElement('div');
      card.className = 'glass-card admin-crud-card';
      card.innerHTML = `
        <div class="admin-crud-header">
          <div>
            <span class="admin-crud-subtitle">${c.issuer} | ${c.date}</span>
            <h4 class="admin-crud-title">${c.title}</h4>
          </div>
        </div>
        <div style="font-size:0.85rem; margin-bottom:12px; color:var(--text-muted);">
          Link: <a href="${c.credentialUrl || '#'}" target="_blank" style="color:var(--accent-color);">${c.credentialUrl ? 'Verify Link' : 'None'}</a>
        </div>
        <div class="admin-crud-actions">
          <button class="btn btn-secondary btn-edit-cert" data-index="${idx}" style="padding: 8px 16px; font-size:0.85rem; flex-grow:1;"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-secondary btn-delete-cert" data-index="${idx}" style="padding:8px; color:var(--error-color);" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.btn-edit-cert').forEach(btn => {
      btn.addEventListener('click', () => editCert(parseInt(btn.getAttribute('data-index'))));
    });
    container.querySelectorAll('.btn-delete-cert').forEach(btn => {
      btn.addEventListener('click', () => deleteCert(parseInt(btn.getAttribute('data-index'))));
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="color:var(--error-color); text-align:center; grid-column:1/-1;">Failed to load certifications.</div>';
  }
}

const btnAddCert = document.getElementById('btn-add-cert');
if (btnAddCert) {
  btnAddCert.addEventListener('click', () => {
    document.getElementById('cert-modal-title').textContent = 'Add Certification';
    document.getElementById('cert-index').value = '-1';
    document.getElementById('cert-title-input').value = '';
    document.getElementById('cert-issuer-input').value = '';
    document.getElementById('cert-date-input').value = new Date().getFullYear();
    document.getElementById('cert-url-input').value = '';
    document.getElementById('cert-image-input').value = '';
    document.getElementById('modal-cert').classList.add('active');
  });
}

function editCert(idx) {
  const c = dbPortfolio.certifications[idx];
  document.getElementById('cert-modal-title').textContent = 'Edit Certification';
  document.getElementById('cert-index').value = idx;
  document.getElementById('cert-title-input').value = c.title;
  document.getElementById('cert-issuer-input').value = c.issuer;
  document.getElementById('cert-date-input').value = c.date;
  document.getElementById('cert-url-input').value = c.credentialUrl || '';
  document.getElementById('cert-image-input').value = c.image || '';
  document.getElementById('modal-cert').classList.add('active');
}

async function deleteCert(idx) {
  const cert = dbPortfolio.certifications[idx];
  if (confirm(`Remove certificate details for "${cert.title}"?`)) {
    showToast('Deleting certification...', 'info');
    try {
      const docId = cert.id || `cert_${idx}`;
      await certificationService.delete(docId);
      dbPortfolio.certifications.splice(idx, 1);
      saveToLocalStorage();
      await loadCertificationsList();
      showToast('Certification deleted.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete certification.', 'error');
    }
  }
}

const formCert = document.getElementById('form-cert');
if (formCert) {
  formCert.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idx = parseInt(document.getElementById('cert-index').value);

    const cData = {
      title: document.getElementById('cert-title-input').value,
      issuer: document.getElementById('cert-issuer-input').value,
      date: document.getElementById('cert-date-input').value,
      credentialUrl: document.getElementById('cert-url-input').value,
      image: document.getElementById('cert-image-input').value,
      color: idx === -1 ? '#6366f1' : (dbPortfolio.certifications[idx].color || '#6366f1')
    };

    showToast('Saving certification...', 'info');
    try {
      if (idx === -1) {
        const docId = `cert_${Date.now()}`;
        await certificationService.create({ id: docId, ...cData });
        showToast('Certification saved.', 'success');
      } else {
        const docId = dbPortfolio.certifications[idx].id || `cert_${idx}`;
        await certificationService.update(docId, cData);
        showToast('Certification details saved.', 'success');
      }

      document.getElementById('modal-cert').classList.remove('active');
      await loadCertificationsList();
    } catch (err) {
      console.error(err);
      showToast('Failed to save certification.', 'error');
    }
  });
}

window.editCert = editCert;
window.deleteCert = deleteCert;

/* 6.5 Experience CRUD */
async function loadExperienceList() {
  const container = document.getElementById('experience-list');
  if (!container) return;
  container.innerHTML = '<div class="loader" style="margin: 20px auto;"></div>';

  try {
    const experience = dbPortfolio.experience || [];
    container.innerHTML = '';

    if (experience.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px; grid-column:1/-1;">No experience added yet.</div>';
      return;
    }

    experience.forEach((exp, idx) => {
      const item = document.createElement('div');
      item.className = 'draggable-item';
      item.setAttribute('data-index', idx);
      item.innerHTML = `
        <i class="fas fa-grip-lines drag-handle"></i>
        <div class="drag-content">
          <span class="drag-title">${exp.role} @ ${exp.company}</span>
          <span class="drag-type">${exp.type || 'Full-time'} | ${exp.location || 'Remote'}</span>
          <span style="font-size:0.85rem; color:var(--text-muted); margin-left:16px;">Duration: ${exp.duration}</span>
        </div>
        <div class="drag-actions">
          <button class="btn-icon btn-edit-experience" data-index="${idx}" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-delete-experience" data-index="${idx}" title="Delete" style="color:var(--error-color);"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      container.appendChild(item);
    });

    container.querySelectorAll('.btn-edit-experience').forEach(btn => {
      btn.addEventListener('click', () => editExperience(parseInt(btn.getAttribute('data-index'))));
    });
    container.querySelectorAll('.btn-delete-experience').forEach(btn => {
      btn.addEventListener('click', () => deleteExperience(parseInt(btn.getAttribute('data-index'))));
    });

    new Sortable(container, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: async () => {
        const reordered = [];
        container.querySelectorAll('.draggable-item').forEach((el) => {
          const originalIndex = parseInt(el.getAttribute('data-index'));
          reordered.push(dbPortfolio.experience[originalIndex]);
        });

        showToast('Saving experience order...', 'info');
        try {
          await profileService.update({ experience: reordered });
          dbPortfolio.experience = reordered;
          saveToLocalStorage();
          showToast('Experience order updated!', 'success');
        } catch (err) {
          console.error(err);
          showToast('Failed to update experience order.', 'error');
        }
        await loadExperienceList();
      }
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="color:var(--error-color); text-align:center; grid-column:1/-1;">Failed to load experience.</div>';
  }
}

const btnAddExperience = document.getElementById('btn-add-experience');
if (btnAddExperience) {
  btnAddExperience.addEventListener('click', () => {
    document.getElementById('experience-modal-title').textContent = 'Add Work Experience';
    document.getElementById('experience-index').value = '-1';
    document.getElementById('exp-company-input').value = '';
    document.getElementById('exp-role-input').value = '';
    document.getElementById('exp-duration-input').value = '';
    document.getElementById('exp-location-input').value = '';
    document.getElementById('exp-type-input').value = 'Full-time';
    document.getElementById('exp-desc-input').value = '';
    document.getElementById('exp-tech-input').value = '';
    document.getElementById('modal-experience').classList.add('active');
  });
}

function editExperience(idx) {
  const exp = dbPortfolio.experience[idx];
  document.getElementById('experience-modal-title').textContent = 'Edit Work Experience';
  document.getElementById('experience-index').value = idx;
  document.getElementById('exp-company-input').value = exp.company || '';
  document.getElementById('exp-role-input').value = exp.role || '';
  document.getElementById('exp-duration-input').value = exp.duration || '';
  document.getElementById('exp-location-input').value = exp.location || 'Remote';
  document.getElementById('exp-type-input').value = exp.type || 'Full-time';
  document.getElementById('exp-desc-input').value = exp.description || '';
  document.getElementById('exp-tech-input').value = exp.tech ? exp.tech.join(', ') : '';
  document.getElementById('modal-experience').classList.add('active');
}

async function deleteExperience(idx) {
  const exp = dbPortfolio.experience[idx];
  if (confirm(`Remove experience details for "${exp.role} @ ${exp.company}"?`)) {
    showToast('Deleting experience...', 'info');
    try {
      dbPortfolio.experience.splice(idx, 1);
      await profileService.update({ experience: dbPortfolio.experience });
      saveToLocalStorage();
      await loadExperienceList();
      showToast('Experience deleted.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete experience.', 'error');
    }
  }
}

const formExperience = document.getElementById('form-experience');
if (formExperience) {
  formExperience.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idx = parseInt(document.getElementById('experience-index').value);

    const expData = {
      company: document.getElementById('exp-company-input').value,
      role: document.getElementById('exp-role-input').value,
      duration: document.getElementById('exp-duration-input').value,
      location: document.getElementById('exp-location-input').value,
      type: document.getElementById('exp-type-input').value,
      description: document.getElementById('exp-desc-input').value,
      tech: document.getElementById('exp-tech-input').value.split(',').map(s => s.trim()).filter(Boolean)
    };

    showToast('Saving experience...', 'info');
    try {
      dbPortfolio.experience = dbPortfolio.experience || [];
      if (idx === -1) {
        dbPortfolio.experience.push(expData);
      } else {
        dbPortfolio.experience[idx] = expData;
      }

      await profileService.update({ experience: dbPortfolio.experience });
      saveToLocalStorage();
      showToast('Experience saved.', 'success');

      document.getElementById('modal-experience').classList.remove('active');
      await loadExperienceList();
    } catch (err) {
      console.error(err);
      showToast('Failed to save experience.', 'error');
    }
  });
}

window.editExperience = editExperience;
window.deleteExperience = deleteExperience;

/* 6.7 Education CRUD */
async function loadEducationList() {
  const container = document.getElementById('education-list');
  if (!container) return;
  container.innerHTML = '<div class="loader" style="margin: 20px auto;"></div>';

  try {
    dbPortfolio.about = dbPortfolio.about || {};
    const education = dbPortfolio.about.education || [];
    container.innerHTML = '';

    if (education.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px; grid-column:1/-1;">No education history added yet.</div>';
      return;
    }

    education.forEach((edu, idx) => {
      const item = document.createElement('div');
      item.className = 'draggable-item';
      item.setAttribute('data-index', idx);
      item.innerHTML = `
        <i class="fas fa-grip-lines drag-handle"></i>
        <div class="drag-content">
          <span class="drag-title">${edu.degree}</span>
          <span class="drag-type">${edu.institution}</span>
          <span style="font-size:0.85rem; color:var(--text-muted); margin-left:16px;">Year: ${edu.year} ${edu.grade ? `| Grade: ${edu.grade}` : ''}</span>
        </div>
        <div class="drag-actions">
          <button class="btn-icon btn-edit-education" data-index="${idx}" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-delete-education" data-index="${idx}" title="Delete" style="color:var(--error-color);"><i class="fas fa-trash-alt"></i></button>
        </div>
      `;
      container.appendChild(item);
    });

    container.querySelectorAll('.btn-edit-education').forEach(btn => {
      btn.addEventListener('click', () => editEducation(parseInt(btn.getAttribute('data-index'))));
    });
    container.querySelectorAll('.btn-delete-education').forEach(btn => {
      btn.addEventListener('click', () => deleteEducation(parseInt(btn.getAttribute('data-index'))));
    });

    new Sortable(container, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: async () => {
        const reordered = [];
        container.querySelectorAll('.draggable-item').forEach((el) => {
          const originalIndex = parseInt(el.getAttribute('data-index'));
          reordered.push(dbPortfolio.about.education[originalIndex]);
        });

        showToast('Saving education order...', 'info');
        try {
          dbPortfolio.about.education = reordered;
          await profileService.update({ about: dbPortfolio.about });
          saveToLocalStorage();
          showToast('Education order updated!', 'success');
        } catch (err) {
          console.error(err);
          showToast('Failed to update education order.', 'error');
        }
        await loadEducationList();
      }
    });
  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="color:var(--error-color); text-align:center; grid-column:1/-1;">Failed to load education details.</div>';
  }
}

const btnAddEducation = document.getElementById('btn-add-education');
if (btnAddEducation) {
  btnAddEducation.addEventListener('click', () => {
    document.getElementById('education-modal-title').textContent = 'Add Education';
    document.getElementById('education-index').value = '-1';
    document.getElementById('edu-degree-input').value = '';
    document.getElementById('edu-inst-input').value = '';
    document.getElementById('edu-year-input').value = '';
    document.getElementById('edu-grade-input').value = '';
    document.getElementById('edu-icon-input').value = 'fa-graduation-cap';
    document.getElementById('modal-education').classList.add('active');
  });
}

function editEducation(idx) {
  const edu = dbPortfolio.about.education[idx];
  document.getElementById('education-modal-title').textContent = 'Edit Education';
  document.getElementById('education-index').value = idx;
  document.getElementById('edu-degree-input').value = edu.degree || '';
  document.getElementById('edu-inst-input').value = edu.institution || '';
  document.getElementById('edu-year-input').value = edu.year || '';
  document.getElementById('edu-grade-input').value = edu.grade || '';
  document.getElementById('edu-icon-input').value = edu.icon || 'fa-graduation-cap';
  document.getElementById('modal-education').classList.add('active');
}

async function deleteEducation(idx) {
  const edu = dbPortfolio.about.education[idx];
  if (confirm(`Remove education details for "${edu.degree} @ ${edu.institution}"?`)) {
    showToast('Deleting education...', 'info');
    try {
      dbPortfolio.about.education.splice(idx, 1);
      await profileService.update({ about: dbPortfolio.about });
      saveToLocalStorage();
      await loadEducationList();
      showToast('Education deleted.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to delete education.', 'error');
    }
  }
}

const formEducation = document.getElementById('form-education');
if (formEducation) {
  formEducation.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idx = parseInt(document.getElementById('education-index').value);

    const eduData = {
      degree: document.getElementById('edu-degree-input').value,
      institution: document.getElementById('edu-inst-input').value,
      year: document.getElementById('edu-year-input').value,
      grade: document.getElementById('edu-grade-input').value || '',
      icon: document.getElementById('edu-icon-input').value || 'fa-graduation-cap'
    };

    showToast('Saving education...', 'info');
    try {
      dbPortfolio.about = dbPortfolio.about || {};
      dbPortfolio.about.education = dbPortfolio.about.education || [];

      if (idx === -1) {
        dbPortfolio.about.education.push(eduData);
      } else {
        dbPortfolio.about.education[idx] = eduData;
      }

      await profileService.update({ about: dbPortfolio.about });
      saveToLocalStorage();
      showToast('Education details saved.', 'success');

      document.getElementById('modal-education').classList.remove('active');
      await loadEducationList();
    } catch (err) {
      console.error(err);
      showToast('Failed to save education details.', 'error');
    }
  });
}

window.editEducation = editEducation;
window.deleteEducation = deleteEducation;

/* 7. Settings Form Controls */
function loadSettingsForm() {
  document.getElementById('override-lc-solved').value = dbPortfolio.stats?.leetcode?.totalSolved || '';
  document.getElementById('override-lc-rating').value = dbPortfolio.stats?.leetcode?.contestRating || '';

  const lcProfile = dbPortfolio.codingProfiles?.find(p => p.platform === 'LeetCode');
  document.getElementById('settings-lc-username').value = lcProfile?.username || '';
  document.getElementById('settings-lc-url').value = lcProfile?.url || '';

  document.getElementById('settings-accent').value = dbPortfolio.theme?.accentColor || '#6366f1';
  document.getElementById('settings-theme').value = dbPortfolio.theme?.defaultTheme || 'dark';
}

const btnSyncLeetcode = document.getElementById('btn-sync-leetcode');
if (btnSyncLeetcode) {
  btnSyncLeetcode.addEventListener('click', async () => {
    let username = document.getElementById('settings-lc-username').value.trim();
    if (!username) {
      const lcProfile = dbPortfolio.codingProfiles?.find(p => p.platform === 'LeetCode');
      username = lcProfile?.username;
    }
    if (!username) {
      showToast('Please enter a LeetCode username first.', 'error');
      return;
    }

    btnSyncLeetcode.disabled = true;
    btnSyncLeetcode.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';
    showToast(`Fetching LeetCode stats for @${username}...`, 'info');

    try {
      const response = await fetch(`https://alfa-leetcode-api.onrender.com/userProfile/${username}`);
      if (!response.ok) throw new Error('API request failed');
      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors[0].message || 'User not found on LeetCode');
      }
      if (data.totalSolved === undefined) {
        throw new Error('Failed to retrieve solved statistics');
      }

      dbPortfolio.stats = dbPortfolio.stats || { leetcode: {} };
      dbPortfolio.stats.leetcode.easySolved = data.easySolved || 0;
      dbPortfolio.stats.leetcode.mediumSolved = data.mediumSolved || 0;
      dbPortfolio.stats.leetcode.hardSolved = data.hardSolved || 0;
      dbPortfolio.stats.leetcode.totalSolved = data.totalSolved || 0;
      dbPortfolio.stats.leetcode.globalRanking = data.ranking || 0;
      dbPortfolio.stats.leetcode.lastUpdated = new Date().toISOString().split('T')[0];

      // Update input fields
      document.getElementById('override-lc-solved').value = data.totalSolved;
      document.getElementById('settings-lc-username').value = username;

      // Update dbPortfolio coding profiles object stats dynamically
      dbPortfolio.codingProfiles = dbPortfolio.codingProfiles || [];
      let profile = dbPortfolio.codingProfiles.find(p => p.platform === 'LeetCode');
      if (!profile) {
        profile = { platform: 'LeetCode', stats: {} };
        dbPortfolio.codingProfiles.push(profile);
      }
      profile.username = username;
      if (!profile.url || profile.url.includes('nihar-gnv') || profile.url === '') {
        profile.url = `https://leetcode.com/${username}`;
        document.getElementById('settings-lc-url').value = profile.url;
      }
      profile.stats = profile.stats || {};
      profile.stats.solved = data.totalSolved;

      showToast('LeetCode stats fetched successfully! Click "Save API Overrides" to persist.', 'success');
    } catch (err) {
      console.error(err);
      showToast(`Failed to fetch live stats: ${err.message}. Please input manually.`, 'error');
    } finally {
      btnSyncLeetcode.disabled = false;
      btnSyncLeetcode.innerHTML = '<i class="fas fa-sync-alt"></i> Sync LeetCode Solved';
    }
  });
}

const btnSaveStats = document.getElementById('btn-save-stats');
if (btnSaveStats) {
  btnSaveStats.addEventListener('click', async () => {
    dbPortfolio.stats = dbPortfolio.stats || { leetcode: {} };
    
    dbPortfolio.stats.leetcode.totalSolved = parseInt(document.getElementById('override-lc-solved').value) || 0;
    dbPortfolio.stats.leetcode.contestRating = parseInt(document.getElementById('override-lc-rating').value) || 0;
    dbPortfolio.stats.leetcode.lastUpdated = new Date().toISOString().split('T')[0];

    const username = document.getElementById('settings-lc-username').value.trim();
    const profileUrl = document.getElementById('settings-lc-url').value.trim();

    // sync coding profiles stats object
    dbPortfolio.codingProfiles = dbPortfolio.codingProfiles || [];
    let lcProfile = dbPortfolio.codingProfiles.find(p => p.platform === 'LeetCode');
    if (!lcProfile) {
      lcProfile = { platform: 'LeetCode', stats: {} };
      dbPortfolio.codingProfiles.push(lcProfile);
    }
    lcProfile.username = username;
    lcProfile.url = profileUrl || (username ? `https://leetcode.com/${username}` : '');
    lcProfile.stats = lcProfile.stats || {};
    lcProfile.stats.solved = dbPortfolio.stats.leetcode.totalSolved;
    lcProfile.stats.contestRating = dbPortfolio.stats.leetcode.contestRating;

    showToast('Saving API stats overrides...', 'info');
    try {
      const settingsPayload = {
        meta: dbPortfolio.meta || {},
        theme: dbPortfolio.theme || {},
        stats: dbPortfolio.stats
      };
      const profilePayload = {
        hero: dbPortfolio.hero || {},
        about: dbPortfolio.about || {},
        contact: dbPortfolio.contact || {},
        experience: dbPortfolio.experience || [],
        achievements: dbPortfolio.achievements || [],
        codingProfiles: dbPortfolio.codingProfiles
      };
      
      await profileService.update(profilePayload);
      await profileService.saveSettings(settingsPayload);
      
      saveToLocalStorage();
      showToast('API metrics overridden successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save stats overrides.', 'error');
    }
  });
}

const btnSaveTheme = document.getElementById('btn-save-theme');
if (btnSaveTheme) {
  btnSaveTheme.addEventListener('click', async () => {
    dbPortfolio.theme = dbPortfolio.theme || {};
    dbPortfolio.theme.accentColor = document.getElementById('settings-accent').value;
    dbPortfolio.theme.defaultTheme = document.getElementById('settings-theme').value;
    
    showToast('Saving theme preference...', 'info');
    try {
      const settingsPayload = {
        meta: dbPortfolio.meta || {},
        theme: dbPortfolio.theme,
        stats: dbPortfolio.stats || {}
      };
      await profileService.saveSettings(settingsPayload);
      saveToLocalStorage();
      showToast('Theme configs modified.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save theme settings.', 'error');
    }
  });
}

// Administrators management (Google Auth)
const btnManageAdmins = document.getElementById('btn-manage-admins');
if (btnManageAdmins) {
  btnManageAdmins.addEventListener('click', async () => {
    const addEmail = document.getElementById('settings-new-admin').value.trim();
    const removeEmail = document.getElementById('settings-remove-admin').value.trim();

    if (!addEmail && !removeEmail) {
      showToast('Please fill in an email to add or remove.', 'error');
      return;
    }

    if (!isFirebaseConfigured) {
      showToast('Cannot manage admins in local Dev Mode (Firebase unconfigured).', 'error');
      return;
    }

    try {
      if (addEmail) {
        showToast(`Adding ${addEmail} to admins...`, 'info');
        await setDoc(doc(db, "admins", addEmail), { email: addEmail, addedAt: new Date().toISOString() });
        document.getElementById('settings-new-admin').value = '';
        showToast(`Added admin: ${addEmail}`, 'success');
      }

      if (removeEmail) {
        if (removeEmail === currentAdminUser?.email) {
          showToast('Cannot remove your own email from active session.', 'error');
          return;
        }
        showToast(`Removing ${removeEmail} from admins...`, 'info');
        await deleteDoc(doc(db, "admins", removeEmail));
        document.getElementById('settings-remove-admin').value = '';
        showToast(`Removed admin: ${removeEmail}`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update administrators list: ' + err.message, 'error');
    }
  });
}



// Kickstart Auth checking on load
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
});
