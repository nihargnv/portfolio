/* UI Renderer Module for Dynamic DOM Building */
import { profileService } from './services/profileService.js';
import { projectService } from './services/projectService.js';
import { sectionService } from './services/sectionService.js';
import { skillService } from './services/skillService.js';
import { certificationService } from './services/certificationService.js';
import { videoService } from './services/videoService.js';

// Main dynamic initialization
async function initPageRenderer() {
  await initCommon();

  // Load datasets from services (which handles fallback to JSON internally)
  const portfolio = await profileService.get();
  const projects = await projectService.getAll();
  const sections = await sectionService.getAll();
  const skills = await skillService.getAll();
  const certifications = await certificationService.getAll();
  const videos = await videoService.getAll();

  if (!portfolio) {
    document.getElementById('loader').classList.add('hidden');
    return;
  }

  // Override local portfolio nested skills and certifications with top-level collections if available
  if (skills && skills.length > 0) {
    portfolio.skills = skills;
  }
  if (certifications && certifications.length > 0) {
    portfolio.certifications = certifications;
  }

  // 1. Set Page Meta Title/Desc dynamically from JSON
  if (portfolio.meta) {
    document.title = portfolio.meta.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', portfolio.meta.description);
  }

  // 2. Render Hero
  renderHero(portfolio.hero, portfolio.contact);
  
  // 3. Render About
  renderAbout(portfolio.about);

  // 4. Render Skills
  renderSkills(portfolio.skills);

  // 5. Render Featured Projects
  renderFeaturedProjects(projects);

  // 6. Render Experience
  renderExperience(portfolio.experience);

  // 6.6 Render Certifications
  renderCertifications(portfolio.certifications);

  // 6.7 Render Videos
  renderVideos(videos);

  // 7. Render Achievements & Coding Profiles
  renderAchievementsAndProfiles(portfolio.achievements, portfolio.codingProfiles, portfolio.stats);

  // 8. Render Custom Sections
  renderCustomSections(sections, projects, portfolio.certifications, videos);

  // 9. Render Contact
  renderContact(portfolio.contact);

  // 10. Social links in footer
  renderFooterSocials(portfolio.contact.social);

  // Initialize AOS
  AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true,
    mirror: false
  });

  // Setup image lightboxes
  setupLightbox();

  // Trigger counters countup
  initCounterAnimations();

  // Hide loader
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('hidden');

  // Hydrate live LeetCode stats in background
  updateLeetcodeLiveStats(portfolio);
}

// Attach to window for global access
window.initPageRenderer = initPageRenderer;
window.makeProjectCardHTML = makeProjectCardHTML;

/* 2. Hero Section */
function renderHero(heroData, contactData) {
  const heroSec = document.getElementById('hero');
  if (!heroSec) return;

  const rolesHtml = heroData.titles.map(role => `<span>${role}</span>`).join('');
  const iconsHtml = heroData.floatingIcons.map(icon => `<div class="floating-icon"><i class="${icon}"></i></div>`).join('');

  heroSec.innerHTML = `
    <div class="container">
      <div class="hero-grid">
        <div class="hero-content" data-aos="fade-right">
          <span class="hero-greeting">${heroData.greeting || "Hi, I'm"}</span>
          <h1 class="hero-name">${heroData.name}</h1>
          <div class="hero-title-container">
            <span class="typed-role" id="typed-role"></span>
          </div>
          <p class="hero-tagline">${heroData.tagline}</p>
          <div class="hero-btns">
            <a href="#contact" class="btn btn-primary"><i class="fas fa-paper-plane"></i> Contact Me</a>
            <a href="${heroData.resumeUrl}" target="_blank" class="btn btn-secondary"><i class="fas fa-file-alt"></i> Resume / CV</a>
          </div>
        </div>
        <div class="hero-visual" data-aos="fade-left">
          <div class="avatar-wrapper">
            <img src="${heroData.profileImage || 'assets/images/profile.jpg'}" alt="${heroData.name}" class="avatar-img" onerror="this.src='https://placehold.co/400x400/121216/f3f4f6?text=Avatar'">
          </div>
          <div class="floating-icons-container">
            ${iconsHtml}
          </div>
        </div>
      </div>
    </div>
  `;

  // Start Typing Effect for Roles
  initTypingEffect(heroData.titles);
}

// Typing effect implementation
function initTypingEffect(titles) {
  const textEl = document.getElementById('typed-role');
  if (!textEl) return;

  let titleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let typingSpeed = 100;

  function type() {
    const currentTitle = titles[titleIndex];
    if (isDeleting) {
      textEl.textContent = currentTitle.substring(0, charIndex - 1);
      charIndex--;
      typingSpeed = 50;
    } else {
      textEl.textContent = currentTitle.substring(0, charIndex + 1);
      charIndex++;
      typingSpeed = 100;
    }

    if (!isDeleting && charIndex === currentTitle.length) {
      typingSpeed = 2000; // Pause at full word
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      titleIndex = (titleIndex + 1) % titles.length;
      typingSpeed = 500; // Pause before typing next word
    }

    setTimeout(type, typingSpeed);
  }

  type();
}

/* 3. About Section */
function renderAbout(aboutData) {
  const aboutSec = document.getElementById('about');
  if (!aboutSec) return;

  const eduHtml = aboutData.education.map(edu => `
    <div class="edu-item">
      <div class="edu-icon-box"><i class="fas ${edu.icon || 'fa-graduation-cap'}"></i></div>
      <div class="edu-content">
        <h4>${edu.degree}</h4>
        <p class="edu-inst">${edu.institution}</p>
        <p class="edu-year">${edu.year} ${edu.grade ? `| Grade: ${edu.grade}` : ''}</p>
      </div>
    </div>
  `).join('');

  const interestsHtml = aboutData.interests.map(interest => `
    <div class="interest-item">
      <i class="fas fa-chevron-right"></i>
      <span>${interest}</span>
    </div>
  `).join('');

  aboutSec.innerHTML = `
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <span class="section-subtitle">Biography</span>
        <h2 class="section-title">About Me</h2>
      </div>
      <div class="about-grid">
        <div class="about-main" data-aos="fade-right">
          <p class="about-bio">${aboutData.bio}</p>
          <p class="about-summary">${aboutData.summary}</p>
          <h3 class="section-subtitle" style="margin-bottom: 20px;">Education</h3>
          <div class="education-timeline">
            ${eduHtml}
          </div>
        </div>
        <div class="about-sidebar" data-aos="fade-left">
          <div class="glass-card about-interests-card">
            <h3>Technical Interests</h3>
            <div class="interests-grid">
              ${interestsHtml}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* 4. Skills Section */
function renderSkills(skills) {
  const skillsSec = document.getElementById('skills');
  if (!skillsSec) return;

  // Extract unique categories
  const categories = ['All', ...new Set(skills.map(s => s.category))];
  const tabsHtml = categories.map((cat, idx) => `
    <button class="filter-tab ${idx === 0 ? 'active' : ''}" data-category="${cat}">${cat}</button>
  `).join('');

  skillsSec.innerHTML = `
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <span class="section-subtitle">Superpowers</span>
        <h2 class="section-title">Skills & Expertises</h2>
      </div>
      <div class="skills-controls" data-aos="fade-up">
        <div class="skills-search">
          <input type="text" id="skill-search-input" placeholder="Search skill (e.g. Python, Docker)...">
          <i class="fas fa-search"></i>
        </div>
        <div class="skills-filters">
          ${tabsHtml}
        </div>
      </div>
      <div class="skills-grid" id="skills-container-grid" data-aos="fade-up">
        <!-- Injected skill cards -->
      </div>
    </div>
  `;

  // Render cards initially
  renderSkillCards(skills, 'All');

  // Add search & tab filtering interactions
  const searchInput = document.getElementById('skill-search-input');
  const tabs = skillsSec.querySelectorAll('.filter-tab');

  function handleFilter() {
    const query = searchInput.value.toLowerCase();
    const activeTab = skillsSec.querySelector('.filter-tab.active');
    const category = activeTab ? activeTab.getAttribute('data-category') : 'All';

    let filtered = skills;
    if (category !== 'All') {
      filtered = filtered.filter(s => s.category === category);
    }
    if (query) {
      filtered = filtered.filter(s => s.name.toLowerCase().includes(query));
    }

    renderSkillCards(filtered, category);
  }

  searchInput.addEventListener('input', handleFilter);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      handleFilter();
    });
  });
}

function renderSkillCards(filteredSkills, category) {
  const grid = document.getElementById('skills-container-grid');
  if (!grid) return;

  grid.innerHTML = '';
  
  if (filteredSkills.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 40px 0;">No matching skills found.</div>`;
    return;
  }

  filteredSkills.forEach(skill => {
    const card = document.createElement('div');
    card.className = 'glass-card skill-card';
    card.innerHTML = `
      <div class="skill-info">
        <div class="skill-icon-wrapper"><i class="${skill.icon || 'fas fa-code'}"></i></div>
        <span class="skill-name">${skill.name}</span>
        <span class="skill-level-text">${skill.level}%</span>
      </div>
      <div class="skill-bar-bg">
        <div class="skill-bar-fill" data-level="${skill.level}"></div>
      </div>
    `;
    grid.appendChild(card);
    
    // Animate width fill
    setTimeout(() => {
      const fill = card.querySelector('.skill-bar-fill');
      if (fill) fill.style.width = `${skill.level}%`;
    }, 100);
  });
}

/* 5. Projects Section Card HTML helper (Also used in listing page) */
function makeProjectCardHTML(project) {
  const featuredBadge = project.featured ? `<span class="badge badge-featured">Featured</span>` : '';
  const statusBadge = project.status ? `<span class="badge badge-status">${project.status}</span>` : '';
  const tagsHtml = project.tags.slice(0, 4).map(t => `<span class="tag">${t}</span>`).join('');
  const imgUrl = (project.images && project.images.length > 0) ? project.images[0].url : 'https://placehold.co/600x400/121216/f3f4f6?text=Project';

  return `
    <div class="glass-card project-card" data-aos="fade-up">
      <div class="project-card-image">
        <img src="${imgUrl}" alt="${project.title}" onerror="this.src='https://placehold.co/600x400/121216/f3f4f6?text=Project'">
        <div class="project-badges">
          ${featuredBadge}
          ${statusBadge}
        </div>
      </div>
      <div class="project-card-content">
        <div class="project-meta">
          <span>${project.category}</span>
          <span>${project.year}</span>
        </div>
        <h3 class="project-card-title">
          <a href="project.html?id=${project.id}">${project.title}</a>
          <i class="fas fa-arrow-right"></i>
        </h3>
        <p class="project-card-desc">${project.shortDescription}</p>
        <div class="project-tags">
          ${tagsHtml}
        </div>
        <div class="project-card-links">
          <a href="project.html?id=${project.id}" class="project-card-link-btn"><i class="fas fa-info-circle"></i> Details</a>
          <div style="display: flex; gap: 12px;">
            ${project.githubLink ? `<a href="${project.githubLink}" target="_blank" class="project-card-link-btn" aria-label="GitHub"><i class="fab fa-github"></i></a>` : ''}
            ${project.demoLink ? `<a href="${project.demoLink}" target="_blank" class="project-card-link-btn" aria-label="Demo"><i class="fas fa-external-link-alt"></i></a>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderFeaturedProjects(projects) {
  const projectsSec = document.getElementById('projects');
  if (!projectsSec) return;

  // Render first 4 projects (or all if total projects <= 4)
  const initialProjects = projects.slice(0, 4);
  const remainingProjects = projects.slice(4);

  const initialHtml = initialProjects.map(p => makeProjectCardHTML(p)).join('');
  const remainingHtml = remainingProjects.map(p => makeProjectCardHTML(p)).join('');

  projectsSec.innerHTML = `
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <span class="section-subtitle">Showcase</span>
        <h2 class="section-title">Featured Projects</h2>
      </div>
      <div class="projects-grid" id="projects-grid-container">
        ${initialHtml}
        ${remainingProjects.length > 0 ? `
          <div id="projects-remaining-container" style="display: none;">
            ${remainingHtml}
          </div>
        ` : ''}
      </div>
      ${remainingProjects.length > 0 ? `
        <div class="view-all-container" data-aos="fade-up" style="margin-top: 40px;">
          <button id="btn-toggle-projects" class="btn btn-secondary"><i class="fas fa-th-large"></i> View All Projects</button>
        </div>
      ` : ''}
    </div>
  `;

  const toggleBtn = document.getElementById('btn-toggle-projects');
  const remainingContainer = document.getElementById('projects-remaining-container');
  if (toggleBtn && remainingContainer) {
    toggleBtn.addEventListener('click', () => {
      if (remainingContainer.style.display === 'none') {
        remainingContainer.style.display = 'contents';
        toggleBtn.innerHTML = '<i class="fas fa-compress-alt"></i> Show Less';
        if (typeof AOS !== 'undefined') AOS.refresh();
      } else {
        remainingContainer.style.display = 'none';
        toggleBtn.innerHTML = '<i class="fas fa-th-large"></i> View All Projects';
        projectsSec.scrollIntoView({ behavior: 'smooth' });
        if (typeof AOS !== 'undefined') AOS.refresh();
      }
    });
  }
}

/* 6. Experience Section */
function renderExperience(experience) {
  const expSec = document.getElementById('experience');
  if (!expSec) return;

  const itemsHtml = experience.map(exp => `
    <div class="timeline-item" data-aos="fade-up">
      <div class="timeline-dot"></div>
      <div class="glass-card timeline-card">
        <div class="timeline-meta">
          <div>
            <h3 class="timeline-role">${exp.role} <span>@ ${exp.company}</span></h3>
            <span style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-top: 4px;">
              <i class="fas fa-map-marker-alt"></i> ${exp.location || 'Remote'} | ${exp.type || 'Full-time'}
            </span>
          </div>
          <span class="timeline-duration">${exp.duration}</span>
        </div>
        <p class="timeline-desc">${exp.description}</p>
        <div class="timeline-tech-tags">
          ${exp.tech.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    </div>
  `).join('');

  expSec.innerHTML = `
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <span class="section-subtitle">Career Path</span>
        <h2 class="section-title">Work Experience</h2>
      </div>
      <div class="timeline-container">
        ${itemsHtml}
      </div>
    </div>
  `;
}

/* 6.6 Certifications Section */
function renderCertifications(certifications) {
  const certSec = document.getElementById('certifications');
  if (!certSec) return;

  const certs = certifications || [];
  if (certs.length === 0) {
    certSec.style.display = 'none';
    return;
  }
  certSec.style.display = 'block';

  const cardsHtml = certs.map(c => `
    <div class="glass-card profile-card" data-aos="fade-up" style="border-left: 4px solid ${c.color || 'var(--accent-color)'}; display: flex; flex-direction: column; justify-content: space-between; padding: 24px;">
      <div class="profile-card-header" style="margin-bottom:0; display:flex; align-items:center; gap: 16px;">
        <div class="profile-icon" style="background-color: ${c.color || 'var(--accent-color)'}; display:flex; align-items:center; justify-content:center; width: 48px; height: 48px; border-radius: 50%; color: #fff; flex-shrink: 0;">
          <i class="fas fa-certificate"></i>
        </div>
        <div>
          <h3 style="font-size:1.15rem; font-weight:700; margin: 0;">${c.title}</h3>
          <span class="profile-username" style="color: var(--text-muted); font-size:0.85rem; display: block; margin-top: 4px;">${c.issuer} • ${c.date}</span>
        </div>
      </div>
      ${c.credentialUrl && c.credentialUrl !== '#' ? `
        <a href="${c.credentialUrl}" target="_blank" class="profile-link-btn" style="margin-top: 20px; display:inline-flex; align-items:center; gap:8px; align-self: flex-start;">
          Verify Credential <i class="fas fa-external-link-alt"></i>
        </a>
      ` : ''}
    </div>
  `).join('');

  certSec.innerHTML = `
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <span class="section-subtitle">Credentials</span>
        <h2 class="section-title">Certifications</h2>
      </div>
      <div class="profiles-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}

/* 6.7 Videos Section */
function renderVideos(videos) {
  const videoSec = document.getElementById('videos');
  if (!videoSec) return;

  const vList = videos || [];
  if (vList.length === 0) {
    videoSec.style.display = 'none';
    return;
  }
  videoSec.style.display = 'block';

  const cardsHtml = vList.map(vid => `
    <div class="glass-card video-card" data-aos="fade-up">
      <div class="video-embed-container">
        <iframe src="https://www.youtube.com/embed/${vid.youtubeId}" title="${vid.title}" allowfullscreen></iframe>
      </div>
      <div class="video-card-content">
        ${vid.category ? `<span class="video-category">${vid.category}</span>` : ''}
        <h3 class="video-card-title">${vid.title}</h3>
        ${vid.description ? `<p class="video-card-desc">${vid.description}</p>` : ''}
        ${(vid.tags && vid.tags.length > 0) ? `
          <div class="video-tags">
            ${vid.tags.map(t => `<span class="video-tag">#${t}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');

  videoSec.innerHTML = `
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <span class="section-subtitle">Showcase</span>
        <h2 class="section-title">Featured Videos</h2>
      </div>
      <div class="projects-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}

/* 7. Achievements & Profiles Section */
function renderAchievementsAndProfiles(achievements, codingProfiles, stats) {
  const achSec = document.getElementById('achievements');
  if (!achSec) return;

  // Find LeetCode profile for merged stats
  const leetcodeProfile = codingProfiles.find(p => p.platform === 'LeetCode');

  // Coding Profiles HTML (excluding LeetCode and GitHub)
  const filteredProfiles = codingProfiles.filter(p => p.platform !== 'GitHub' && p.platform !== 'LeetCode');
  const profilesHtml = filteredProfiles.map(p => {
    // Generate simple profile summary list items
    const summaryItems = Object.entries(p.stats).map(([k, v]) => `
      <div class="profile-stat-item">
        <span class="profile-stat-label">${k}</span>
        <span class="profile-stat-val">${v}</span>
      </div>
    `).join('');

    return `
      <div class="glass-card profile-card" data-aos="fade-up">
        <div class="profile-card-header">
          <div class="profile-icon" style="background-color: ${p.color || 'var(--accent-color)'};">
            <i class="${p.icon || 'fas fa-code'}"></i>
          </div>
          <div>
            <h3>${p.platform}</h3>
            <span class="profile-username">@${p.username}</span>
          </div>
        </div>
        <div class="profile-stats-list">
          ${summaryItems}
        </div>
        <a href="${p.url}" target="_blank" class="profile-link-btn">
          View Profile <i class="fas fa-external-link-alt"></i>
        </a>
      </div>
    `;
  }).join('');

  achSec.innerHTML = `
    <div class="container">
      <!-- 1. Section Header for Profiles -->
      <div class="section-header" data-aos="fade-up">
        <span class="section-subtitle">Rankings</span>
        <h2 class="section-title">Coding Profiles</h2>
      </div>

      <!-- 2. Profiles Grid -->
      <div class="profiles-grid">
        ${profilesHtml}
      </div>

      <!-- 3. Automation Charts Block -->
      <div class="stats-visual-grid" style="margin-top: 60px;">
        
        <div class="glass-card stats-card leetcode-merged-card" data-aos="fade-up">
          <div class="leetcode-merged-header">
            <div class="profile-card-header" style="margin-bottom: 0;">
              <div class="profile-icon" style="background-color: #FFA116;">
                <i class="fas fa-code"></i>
              </div>
              <div>
                <h3 style="margin: 0; font-family: var(--font-display); font-size: 1.35rem; font-weight: 700;">LeetCode Profile & Stats</h3>
                <span class="profile-username">@${leetcodeProfile ? leetcodeProfile.username : 'nihargnv'}</span>
              </div>
            </div>
            ${leetcodeProfile ? `
              <a href="${leetcodeProfile.url}" target="_blank" class="profile-link-btn" style="margin: 0;">
                View Profile <i class="fas fa-external-link-alt"></i>
              </a>
            ` : ''}
          </div>

          <div class="leetcode-merged-body">
            <div class="chart-container">
              <canvas id="leetcodeChart"></canvas>
            </div>
            <div class="leetcode-stats-details">
              <div class="stats-summary-list" style="margin-top: 0; display: flex; flex-direction: column; gap: 12px;">
                <div class="profile-stat-item">
                  <span class="profile-stat-label">Total Solved</span>
                  <span id="lc-total-solved-val" class="profile-stat-val" style="color: #FFA116; font-family: var(--font-mono); font-weight: 600;">${stats.leetcode.totalSolved || 0}</span>
                </div>
                <div class="profile-stat-item">
                  <span class="profile-stat-label">Contest Rating</span>
                  <span class="profile-stat-val" style="color: var(--accent-color); font-family: var(--font-mono); font-weight: 600;">${stats.leetcode.contestRating || 'N/A'}</span>
                </div>
                <div class="profile-stat-item">
                  <span class="profile-stat-label">Global Ranking</span>
                  <span id="lc-global-ranking-val" class="profile-stat-val" style="font-family: var(--font-mono); font-weight: 600;">${stats.leetcode.globalRanking || 'N/A'}</span>
                </div>
                ${leetcodeProfile ? Object.entries(leetcodeProfile.stats).filter(([k]) => k !== 'solved' && k !== 'contestRating').map(([k, v]) => `
                  <div class="profile-stat-item">
                    <span class="profile-stat-label">${k.charAt(0).toUpperCase() + k.slice(1)}</span>
                    <span class="profile-stat-val" style="font-family: var(--font-mono); font-weight: 600;">${v}</span>
                  </div>
                `).join('') : ''}
              </div>
            </div>
          </div>
          <div class="stats-timestamp" id="lc-timestamp-val">Last updated: ${stats.leetcode.lastUpdated || 'Today'}</div>
        </div>

      </div>

    </div>
  `;

  // Draw Charts after injection
  setTimeout(() => {
    drawAutomationCharts(stats);
  }, 100);
}

// Chart.js drawer
function drawAutomationCharts(stats) {
  const lcCtx = document.getElementById('leetcodeChart');

  if (lcCtx) {
    const isDark = document.documentElement.classList.contains('theme-dark');
    const txtColor = isDark ? '#9ca3af' : '#475569';

    if (window.leetcodeChartInstance) {
      window.leetcodeChartInstance.destroy();
    }

    window.leetcodeChartInstance = new Chart(lcCtx, {
      type: 'doughnut',
      data: {
        labels: ['Easy', 'Medium', 'Hard'],
        datasets: [{
          data: [stats.leetcode.easySolved || 0, stats.leetcode.mediumSolved || 0, stats.leetcode.hardSolved || 0],
          backgroundColor: ['#00b8a3', '#ffc01e', '#ef4743'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: txtColor }
          }
        }
      }
    });
  }
}

async function updateLeetcodeLiveStats(portfolio) {
  const leetcodeProfile = portfolio.codingProfiles?.find(p => p.platform === 'LeetCode');
  if (!leetcodeProfile || !leetcodeProfile.username) return;

  try {
    const response = await fetch(`https://alfa-leetcode-api.onrender.com/userProfile/${leetcodeProfile.username}`);
    if (!response.ok) return;
    const data = await response.json();

    if (data.errors && data.errors.length > 0) return;
    if (data.totalSolved === undefined) return;

    portfolio.stats = portfolio.stats || { leetcode: {} };
    portfolio.stats.leetcode = portfolio.stats.leetcode || {};
    portfolio.stats.leetcode.easySolved = data.easySolved || 0;
    portfolio.stats.leetcode.mediumSolved = data.mediumSolved || 0;
    portfolio.stats.leetcode.hardSolved = data.hardSolved || 0;
    portfolio.stats.leetcode.totalSolved = data.totalSolved || 0;
    portfolio.stats.leetcode.globalRanking = data.ranking || 0;
    portfolio.stats.leetcode.lastUpdated = new Date().toISOString().split('T')[0];

    // Update DOM values
    const solvedEl = document.getElementById('lc-total-solved-val');
    if (solvedEl) solvedEl.textContent = data.totalSolved;

    const rankingEl = document.getElementById('lc-global-ranking-val');
    if (rankingEl) rankingEl.textContent = data.ranking || 'N/A';

    const timestampEl = document.getElementById('lc-timestamp-val');
    if (timestampEl) timestampEl.textContent = `Last updated: ${portfolio.stats.leetcode.lastUpdated}`;

    // Redraw Chart
    drawAutomationCharts(portfolio.stats);
  } catch (err) {
    console.warn("Failed to update live LeetCode stats dynamically:", err);
  }
}

// Counters Countup Animation
function initCounterAnimations() {
  const counters = document.querySelectorAll('.achievement-val');
  const speed = 200;

  const countUp = (counter) => {
    const target = +counter.getAttribute('data-target');
    let count = 0;
    
    // Smooth step
    const step = target / speed;
    const interval = setInterval(() => {
      count += step;
      if (count >= target) {
        counter.innerText = target;
        clearInterval(interval);
      } else {
        counter.innerText = Math.floor(count);
      }
    }, 1);
  };

  // Intersection Observer to trigger when visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        countUp(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

/* 8. Custom Dynamic Sections Builder */
function renderCustomSections(sections, allProjects, certifications, videos) {
  const container = document.getElementById('custom-sections-container');
  if (!container) return;

  container.innerHTML = '';
  
  // Sort sections by order, render only enabled ones
  const activeSections = sections
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);

  activeSections.forEach(sec => {
    const sectionHtml = makeCustomSectionHTML(sec, allProjects, certifications, videos);
    if (sectionHtml) {
      container.insertAdjacentHTML('beforeend', sectionHtml);
    }
  });
}

function makeCustomSectionHTML(sec, allProjects, certifications, videos) {
  const titleHeader = sec.title ? `
    <div class="section-header" data-aos="fade-up">
      <span class="section-subtitle">Additional info</span>
      <h2 class="section-title">${sec.title}</h2>
    </div>
  ` : '';

  const secData = sec.data || sec.content || {};

  switch (sec.type) {
    case 'rich-text':
    case 'richText':
      return `
        <section class="section custom-section" id="section-${sec.id}">
          <div class="container">
            ${titleHeader}
            <div class="rich-text-content glass-card" data-aos="fade-up">
              ${secData.content || ''}
            </div>
          </div>
        </section>
      `;

    case 'timeline':
      const timeItemsHtml = (secData.items || []).map(item => `
        <div class="timeline-item" data-aos="fade-up">
          <div class="timeline-dot"></div>
          <div class="glass-card timeline-card">
            <div class="timeline-meta">
              <h3 class="timeline-role">${item.title}</h3>
              <span class="timeline-duration">${item.date}</span>
            </div>
            <p class="timeline-desc">${item.description}</p>
          </div>
        </div>
      `).join('');
      return `
        <section class="section custom-section" id="section-${sec.id}">
          <div class="container">
            ${titleHeader}
            <div class="timeline-container">
              ${timeItemsHtml}
            </div>
          </div>
        </section>
      `;

    case 'statistics':
      const statsHtml = (secData.stats || []).map(s => `
        <div class="glass-card achievement-card" data-aos="fade-up">
          <div class="achievement-icon"><i class="fas ${s.icon || 'fa-calculator'}"></i></div>
          <div class="achievement-val" data-target="${parseInt(s.value) || s.value}">${s.value}</div>
          <span class="achievement-label">${s.label}</span>
        </div>
      `).join('');
      return `
        <section class="section custom-section" id="section-${sec.id}">
          <div class="container">
            ${titleHeader}
            <div class="achievements-grid">
              ${statsHtml}
            </div>
          </div>
        </section>
      `;

    case 'gallery':
      const galleryItemsHtml = (secData.images || []).map(img => `
        <a href="${img.url}" class="gallery-item lightbox-trigger" data-caption="${img.caption || ''}" data-aos="fade-up">
          <img src="${img.url}" alt="${img.caption || ''}" onerror="this.src='https://placehold.co/500x500/121216/f3f4f6?text=Gallery'">
          <div class="gallery-overlay">
            <span class="gallery-caption">${img.caption || ''}</span>
          </div>
        </a>
      `).join('');
      return `
        <section class="section custom-section" id="section-${sec.id}">
          <div class="container" data-gallery-container>
            ${titleHeader}
            <div class="custom-gallery-grid">
              ${galleryItemsHtml}
            </div>
          </div>
        </section>
      `;

    case 'youtube_disabled':
      return '';

    case 'quote':
      return `
        <section class="section custom-section" id="section-${sec.id}">
          <div class="container">
            <div style="max-width: 800px; margin: 0 auto; text-align: center;" data-aos="fade-up">
              <i class="fas fa-quote-left" style="font-size: 2.5rem; color: var(--accent-glow); margin-bottom: 24px; display: block;"></i>
              <p style="font-family: var(--font-display); font-size: 1.85rem; font-style: italic; line-height: 1.5; margin-bottom: 20px;">"${secData.text || ''}"</p>
              <h4 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 4px;">${secData.author || ''}</h4>
              <span style="font-size: 0.85rem; color: var(--text-muted); font-family: var(--font-mono);">${secData.role || ''}</span>
            </div>
          </div>
        </section>
      `;

    case 'cta':
    case 'CTA':
      return `
        <section class="section custom-section" id="section-${sec.id}" style="background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);">
          <div class="container">
            <div class="cta-section-wrapper" data-aos="fade-up">
              <h2 class="text-gradient">${secData.heading || ''}</h2>
              <p>${secData.subheading || ''}</p>
              <div class="cta-btns">
                ${secData.primaryButton ? `<a href="${secData.primaryButton.url}" class="btn btn-primary">${secData.primaryButton.label}</a>` : ''}
                ${secData.secondaryButton ? `<a href="${secData.secondaryButton.url}" class="btn btn-secondary">${secData.secondaryButton.label}</a>` : ''}
              </div>
            </div>
          </div>
        </section>
      `;

    case 'code-block':
    case 'codeBlock':
      return `
        <section class="section custom-section" id="section-${sec.id}">
          <div class="container">
            ${titleHeader}
            <div class="rich-text-content glass-card" data-aos="fade-up" style="max-width: 900px;">
              <pre><code>${escapeHTML(secData.code || '')}</code></pre>
            </div>
          </div>
        </section>
      `;

    case 'image-banner':
    case 'imageBanner':
      return `
        <section class="section custom-section" id="section-${sec.id}" style="padding: 0;">
          <div style="width:100%; height: 350px; overflow:hidden; position: relative;">
            <img src="${secData.url || ''}" alt="" style="width:100%; height:100%; object-fit: cover;">
            <div style="position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;">
              <h2 style="color:#fff; font-family: var(--font-display); font-size: 2.5rem; text-shadow:0 2px 10px rgba(0,0,0,0.5);">${secData.title || ''}</h2>
            </div>
          </div>
        </section>
      `;

    case 'divider':
      return `<hr class="section-divider">`;

    case 'custom-html':
    case 'customHTML':
      return `
        <section class="section custom-section" id="section-${sec.id}">
          <div class="container">
            <div data-aos="fade-up">
              ${secData.html || ''}
            </div>
          </div>
        </section>
      `;

    case 'projectList':
    case 'project-list':
      const projListHtml = allProjects.map(p => makeProjectCardHTML(p)).join('');
      return `
        <section class="section custom-section" id="section-${sec.id}">
          <div class="container">
            ${titleHeader}
            <div class="projects-grid">
              ${projListHtml}
            </div>
          </div>
        </section>
      `;

    case 'achievementCards':
    case 'achievement-cards':
      const achs = secData.items || secData.stats || [];
      const achsHtml = achs.map(ach => `
        <div class="glass-card achievement-card" data-aos="fade-up">
          <div class="achievement-icon"><i class="fas ${ach.icon || 'fa-trophy'}"></i></div>
          <div class="achievement-val" data-target="${parseInt(ach.value) || ach.value}">0</div>
          <span class="achievement-label">${ach.label}</span>
        </div>
      `).join('');
      return `
        <section class="section custom-section" id="section-${sec.id}">
          <div class="container">
            ${titleHeader}
            <div class="achievements-grid">
              ${achsHtml}
            </div>
          </div>
        </section>
      `;

    case 'certificationList':
    case 'certification-list':
      const certs = certifications || [];
      const certsHtml = certs.map(c => `
        <div class="glass-card profile-card" data-aos="fade-up" style="border-left: 4px solid ${c.color || 'var(--accent-color)'}; margin-bottom: 20px;">
          <div class="profile-card-header" style="margin-bottom:0; display:flex; align-items:center; gap: 16px;">
            <div class="profile-icon" style="background-color: ${c.color || 'var(--accent-color)'}; display:flex; align-items:center; justify-content:center; width: 48px; height: 48px; border-radius: 50%; color: #fff;">
              <i class="fas fa-certificate"></i>
            </div>
            <div>
              <h3 style="font-size:1.15rem; font-weight:700;">${c.title}</h3>
              <span class="profile-username" style="color: var(--text-muted); font-size:0.85rem;">${c.issuer} • ${c.date}</span>
            </div>
          </div>
          ${c.credentialUrl && c.credentialUrl !== '#' ? `
            <a href="${c.credentialUrl}" target="_blank" class="profile-link-btn" style="margin-top: 16px; display:inline-flex; align-items:center; gap:8px;">
              Verify Credential <i class="fas fa-external-link-alt"></i>
            </a>
          ` : ''}
        </div>
      `).join('');
      return `
        <section class="section custom-section" id="section-${sec.id}">
          <div class="container">
            ${titleHeader}
            <div class="profiles-grid">
              ${certsHtml}
            </div>
          </div>
        </section>
      `;

    default:
      return '';
  }
}

function escapeHTML(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* 9. Contact Section */
function renderContact(contactData) {
  const contactSec = document.getElementById('contact');
  if (!contactSec) return;

  contactSec.innerHTML = `
    <div class="container">
      <div class="section-header" data-aos="fade-up">
        <span class="section-subtitle">Reach Out</span>
        <h2 class="section-title">Get In Touch</h2>
      </div>
      <div class="contact-grid">
        <div class="contact-info" data-aos="fade-right">
          <p class="contact-info-desc">Feel free to send a message. I'll get back to you within 24 hours.</p>
          <div class="contact-details-list">
            
            <div class="contact-detail-item">
              <div class="contact-detail-icon"><i class="fas fa-envelope"></i></div>
              <div class="contact-detail-content">
                <h4>Email</h4>
                <p><a href="mailto:${contactData.email}">${contactData.email}</a></p>
              </div>
            </div>

            <div class="contact-detail-item">
              <div class="contact-detail-icon"><i class="fas fa-phone-alt"></i></div>
              <div class="contact-detail-content">
                <h4>Phone</h4>
                <p>${contactData.phone || 'N/A'}</p>
              </div>
            </div>

            <div class="contact-detail-item">
              <div class="contact-detail-icon"><i class="fas fa-map-marker-alt"></i></div>
              <div class="contact-detail-content">
                <h4>Location</h4>
                <p>${contactData.location}</p>
              </div>
            </div>

          </div>
        </div>

        <div class="contact-form-wrapper" data-aos="fade-left">
          <div class="glass-card contact-form-card">
            <!-- FormSubmit backend-less configuration -->
            <form action="https://formsubmit.co/${contactData.formSubmitEmail}" method="POST" id="contact-form">
              <!-- Auto-redirect to thanks page or back -->
              <input type="hidden" name="_next" value="${window.location.href}">
              <input type="hidden" name="_subject" value="New Portfolio Contact Form Submission!">
              
              <div class="form-row">
                <div class="form-group">
                  <label for="form-name">Your Name</label>
                  <input type="text" name="name" id="form-name" class="form-control" placeholder="John Doe" required>
                </div>
                <div class="form-group">
                  <label for="form-email">Email Address</label>
                  <input type="email" name="email" id="form-email" class="form-control" placeholder="john@example.com" required>
                </div>
              </div>
              <div class="form-group">
                <label for="form-message">Message</label>
                <textarea name="message" id="form-message" class="form-control" placeholder="What would you like to discuss?" required></textarea>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%;">
                Send Message <i class="fas fa-paper-plane" style="margin-left:8px;"></i>
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  `;

  // Prevent default contact behavior and show dynamic success dialog (optional, FormSubmit handles standard post fallback)
}
