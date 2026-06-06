/* Single Project Page Controller */
import { projectService } from './services/projectService.js';
import { profileService } from './services/profileService.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize common UI (theme, navbar, mobile menu)
  await initCommon();

  // Get project ID from URL parameters
  const params = new URLSearchParams(window.location.search);
  const projectId = params.get('id');

  if (!projectId) {
    window.location.href = 'index.html#projects';
    return;
  }

  // Load data from services
  const project = await projectService.get(projectId);
  const projects = await projectService.getAll();
  const portfolio = await profileService.get();

  if (!project) {
    showToast('Project not found. Redirecting...', 'error');
    setTimeout(() => {
      window.location.href = 'index.html#projects';
    }, 2000);
    return;
  }

  // Render Footer Socials
  if (portfolio && portfolio.contact) {
    renderFooterSocials(portfolio.contact.social);
  }

  // Populate dynamic SEO metadata tags
  document.title = `${project.title} | Nihar GNV`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', project.shortDescription);
  }

  // Fill in textual information
  document.getElementById('proj-title').textContent = project.title;
  document.getElementById('proj-category').textContent = project.category || 'Project Detail';
  document.getElementById('proj-short-desc').textContent = project.shortDescription;
  document.getElementById('proj-status').textContent = project.status || 'Active';
  document.getElementById('proj-year').textContent = project.year || 'N/A';

  // Action Buttons
  const demoBtn = document.getElementById('proj-demo-btn');
  if (project.demoLink && project.demoLink !== '#') {
    demoBtn.href = project.demoLink;
  } else {
    demoBtn.style.display = 'none';
  }

  const gitBtn = document.getElementById('proj-github-btn');
  if (project.githubLink) {
    gitBtn.href = project.githubLink;
  } else {
    gitBtn.style.display = 'none';
  }

  // Problems and Solutions Blocks
  document.getElementById('proj-problem-text').textContent = project.problemStatement;
  document.getElementById('proj-solution-text').textContent = project.solution;

  // Key Features Checklist
  const featuresList = document.getElementById('proj-features-list');
  featuresList.innerHTML = '';
  project.features.forEach(feat => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${feat.split(' - ')[0]}</strong>: ${feat.split(' - ')[1] || feat}`;
    featuresList.appendChild(li);
  });

  // Future Scope widget
  const futureText = document.getElementById('proj-future-text');
  if (project.futureScope) {
    futureText.textContent = project.futureScope;
  } else {
    document.getElementById('proj-future-widget').style.display = 'none';
  }

  // Achievements widget list
  const achWidget = document.getElementById('proj-achievements-widget');
  const achList = document.getElementById('proj-achievements-list');
  achList.innerHTML = '';
  if (project.achievements && project.achievements.length > 0) {
    project.achievements.forEach(ach => {
      const li = document.createElement('li');
      li.className = 'interest-item';
      li.innerHTML = `<i class="fas fa-trophy" style="color: var(--warning-color);"></i> <span>${ach}</span>`;
      achList.appendChild(li);
    });
  } else {
    achWidget.style.display = 'none';
  }

  // Tech Stack tags
  const techList = document.getElementById('proj-tech-list');
  techList.innerHTML = '';
  project.techStack.forEach(tech => {
    const span = document.createElement('span');
    span.className = 'tech-badge-large';
    span.textContent = tech;
    techList.appendChild(span);
  });

  // Development Timeline
  const timelineContainer = document.getElementById('proj-timeline');
  timelineContainer.innerHTML = '';
  if (project.timeline && project.timeline.length > 0) {
    project.timeline.forEach((tl, idx) => {
      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.setAttribute('data-aos', 'fade-up');
      item.innerHTML = `
        <div class="timeline-dot" style="border-color: var(--accent-color); width: 18px; height: 18px; left: 24px; top: 12px;"></div>
        <div class="glass-card timeline-card" style="padding: 20px;">
          <div class="timeline-meta" style="margin-bottom: 4px;">
            <h4 class="timeline-role" style="font-size:1.1rem;">${tl.title}</h4>
            <span class="timeline-duration" style="font-size:0.75rem; padding: 2px 8px;">${tl.date}</span>
          </div>
          <p class="timeline-desc" style="font-size: 0.9rem; margin-bottom: 0;">${tl.description}</p>
        </div>
      `;
      timelineContainer.appendChild(item);
    });
  } else {
    document.getElementById('proj-timeline-block').style.display = 'none';
  }

  // Challenges list
  const challengesList = document.getElementById('proj-challenges-list');
  challengesList.innerHTML = '';
  if (project.challenges && project.challenges.length > 0) {
    project.challenges.forEach(chal => {
      const div = document.createElement('div');
      div.className = 'challenge-item';
      div.innerHTML = `<p>${chal}</p>`;
      challengesList.appendChild(div);
    });
  } else {
    document.getElementById('proj-challenges-block').style.display = 'none';
  }

  // YouTube demos embed list
  const videosWidget = document.getElementById('proj-videos-widget');
  const videosList = document.getElementById('proj-videos-list');
  videosList.innerHTML = '';
  if (project.youtubeVideos && project.youtubeVideos.length > 0) {
    project.youtubeVideos.forEach(v => {
      const item = document.createElement('div');
      item.className = 'youtube-demo-item';
      item.innerHTML = `
        <div class="video-wrapper">
          <iframe src="https://www.youtube.com/embed/${v.id}" title="${v.title}" allowfullscreen></iframe>
        </div>
        <span style="font-size:0.85rem; color:var(--text-secondary); display:block; margin-top:8px; font-weight:500;">${v.title}</span>
      `;
      videosList.appendChild(item);
    });
  } else {
    videosWidget.style.display = 'none';
  }

  // Render Carousel & indicators
  renderCarousel(project.images);

  // Render Related Projects list (same category or general)
  renderRelatedProjects(projects, project);

  // Initialize AOS
  AOS.init({ duration: 800, once: true });

  // Lightbox init
  setupLightbox('.carousel-slide img');

  // Hide loader
  document.getElementById('loader').classList.add('hidden');
});

// Carousel Slideshow logic
function renderCarousel(images) {
  const track = document.getElementById('carousel-track');
  const indicatorsContainer = document.getElementById('carousel-indicators');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');

  if (!track || !images || images.length === 0) {
    document.getElementById('project-gallery-section').style.display = 'none';
    return;
  }

  track.innerHTML = '';
  indicatorsContainer.innerHTML = '';

  images.forEach((img, idx) => {
    // slide
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.innerHTML = `
      <img src="${img.url}" alt="${img.caption || ''}" class="lightbox-trigger" data-caption="${img.caption || ''}" onerror="this.src='https://placehold.co/1200x600/121216/f3f4f6?text=Screenshot'">
      ${img.caption ? `<div class="carousel-slide-caption">${img.caption}</div>` : ''}
    `;
    track.appendChild(slide);

    // indicator
    const ind = document.createElement('span');
    ind.className = `carousel-indicator ${idx === 0 ? 'active' : ''}`;
    ind.setAttribute('data-slide-to', idx);
    indicatorsContainer.appendChild(ind);
  });

  // Carousel slider state variables
  let currentIndex = 0;
  const totalSlides = images.length;

  if (totalSlides <= 1) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    indicatorsContainer.style.display = 'none';
    return;
  }

  function updateCarousel() {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
    
    // indicators update
    const inds = indicatorsContainer.querySelectorAll('.carousel-indicator');
    inds.forEach((ind, idx) => {
      if (idx === currentIndex) {
        ind.classList.add('active');
      } else {
        ind.classList.remove('active');
      }
    });
  }

  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
    updateCarousel();
  });

  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % totalSlides;
    updateCarousel();
  });

  indicatorsContainer.addEventListener('click', (e) => {
    const ind = e.target.closest('.carousel-indicator');
    if (ind) {
      currentIndex = parseInt(ind.getAttribute('data-slide-to'));
      updateCarousel();
    }
  });
}

// Related projects renderer
function renderRelatedProjects(allProjects, currentProject) {
  const grid = document.getElementById('related-projects-grid');
  if (!grid) return;

  grid.innerHTML = '';

  // Filter projects by category/type excluding current
  let related = allProjects.filter(p => p.id !== currentProject.id && p.category === currentProject.category);
  
  // fallback if none match category
  if (related.length === 0) {
    related = allProjects.filter(p => p.id !== currentProject.id);
  }

  // Get top 3
  related = related.slice(0, 3);

  if (related.length === 0) {
    document.getElementById('related-projects-section').style.display = 'none';
    return;
  }

  related.forEach(project => {
    const card = makeProjectCardHTML(project);
    grid.insertAdjacentHTML('beforeend', card);
  });
}
