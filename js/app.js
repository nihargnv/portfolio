/* Shared Application Logic */

// Common JSON Fetcher
async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error(`Could not fetch JSON from ${url}:`, error);
    showToast(`Failed to load data from ${url}`, 'error');
    return null;
  }
}

// Global Toast System
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  // Automatically remove toast after 4s
  setTimeout(() => {
    toast.style.animation = 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Initialize theme switcher and nav handlers
async function initCommon() {
  // Theme management
  const themeToggleBtn = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('theme-icon-sun');
  const moonIcon = document.getElementById('theme-icon-moon');
  const html = document.documentElement;

  // Retrieve setting
  const savedTheme = localStorage.getItem('theme') || 'dark';
  setTheme(savedTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = html.classList.contains('theme-light') ? 'light' : 'dark';
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
    });
  }

  function setTheme(theme) {
    if (theme === 'light') {
      html.classList.remove('theme-dark');
      html.classList.add('theme-light');
      if (sunIcon && moonIcon) {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'inline-block';
      }
    } else {
      html.classList.remove('theme-light');
      html.classList.add('theme-dark');
      if (sunIcon && moonIcon) {
        sunIcon.style.display = 'inline-block';
        moonIcon.style.display = 'none';
      }
    }
    localStorage.setItem('theme', theme);
  }

  // Mobile menu toggle
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      const icon = menuToggle.querySelector('i');
      if (navMenu.classList.contains('active')) {
        icon.className = 'fas fa-times';
      } else {
        icon.className = 'fas fa-bars';
      }
    });

    // Close menu when clicking link
    navMenu.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        const icon = menuToggle.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';
      });
    });
  }

  // Scroll position handlers (Progress and Navbar compress)
  const navbar = document.getElementById('navbar');
  const progress = document.getElementById('scroll-progress');

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    if (progress) {
      progress.style.width = `${scrollPercent}%`;
    }

    if (navbar) {
      if (scrollTop > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  });

  // Footer year update
  const yearSpan = document.getElementById('current-year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }

  // Scroll spy active link handler
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  if (navLinks.length > 0 && sections.length > 0) {
    window.addEventListener('scroll', () => {
      let currentId = '';
      sections.forEach(sec => {
        const top = sec.offsetTop - 120;
        const height = sec.offsetHeight;
        if (window.scrollY >= top && window.scrollY < top + height) {
          currentId = sec.getAttribute('id');
        }
      });

      if (currentId) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${currentId}` || link.getAttribute('href') === `index.html#${currentId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }
}

// Lightbox Modal functions
let activeLightboxGallery = [];
let activeLightboxIndex = 0;

function setupLightbox(gallerySelector = '.lightbox-trigger') {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const closeBtn = document.getElementById('lightbox-close');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');

  if (!lightbox) return;

  // Trigger clicks
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest(gallerySelector);
    if (trigger) {
      e.preventDefault();
      
      // Build index list of images in this gallery container
      const parentGallery = trigger.closest('[data-gallery-container]') || document.body;
      const allTriggers = Array.from(parentGallery.querySelectorAll(gallerySelector));
      
      activeLightboxGallery = allTriggers.map(t => ({
        url: t.getAttribute('href') || t.getAttribute('data-src') || t.src,
        caption: t.getAttribute('data-caption') || t.alt || ''
      }));
      
      activeLightboxIndex = allTriggers.indexOf(trigger);
      openLightbox();
    }
  });

  function openLightbox() {
    updateLightboxImage();
    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  function updateLightboxImage() {
    const item = activeLightboxGallery[activeLightboxIndex];
    if (item) {
      lightboxImg.src = item.url;
      lightboxCaption.textContent = item.caption;
      
      // Toggle navigation arrow displays
      if (activeLightboxGallery.length > 1) {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
      } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
      }
    }
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeLightboxIndex = (activeLightboxIndex - 1 + activeLightboxGallery.length) % activeLightboxGallery.length;
      updateLightboxImage();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      activeLightboxIndex = (activeLightboxIndex + 1) % activeLightboxGallery.length;
      updateLightboxImage();
    });
  }

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // ESC Close / Arrows
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && activeLightboxGallery.length > 1) {
      activeLightboxIndex = (activeLightboxIndex - 1 + activeLightboxGallery.length) % activeLightboxGallery.length;
      updateLightboxImage();
    }
    if (e.key === 'ArrowRight' && activeLightboxGallery.length > 1) {
      activeLightboxIndex = (activeLightboxIndex + 1) % activeLightboxGallery.length;
      updateLightboxImage();
    }
  });
}

// Global dynamic socials renderer
function renderFooterSocials(socialsObj) {
  const container = document.getElementById('footer-socials');
  if (!container) return;
  
  container.innerHTML = '';
  const platforms = [
    { key: 'github', icon: 'fab fa-github', label: 'GitHub' },
    { key: 'linkedin', icon: 'fab fa-linkedin', label: 'LinkedIn' },
    { key: 'twitter', icon: 'fab fa-twitter', label: 'Twitter' },
    { key: 'instagram', icon: 'fab fa-instagram', label: 'Instagram' },
    { key: 'youtube', icon: 'fab fa-youtube', label: 'YouTube' }
  ];

  platforms.forEach(p => {
    const url = socialsObj[p.key];
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.className = 'btn-icon';
      a.setAttribute('aria-label', p.label);
      a.innerHTML = `<i class="${p.icon}"></i>`;
      container.appendChild(a);
    }
  });
}
