// ========== Loader ==========
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  setTimeout(() => {
    loader.classList.add('hidden');
  }, 400);
});

// ========== Section Navigation ==========
const sections = document.querySelectorAll('.section');

function showSection(id) {
  const target = id.replace('#', '');

  sections.forEach(section => {
    section.classList.remove('active');
    section.scrollTop = 0;
  });

  const activeSection = document.getElementById(target);
  if (activeSection) {
    activeSection.classList.add('active');
    history.replaceState(null, '', `#${target}`);
  }
}

// Handle nav link clicks
document.querySelectorAll('[data-nav]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const href = link.getAttribute('href');
    showSection(href);
  });
});

// Handle initial hash on page load
window.addEventListener('DOMContentLoaded', () => {
  const hash = window.location.hash;
  if (hash && document.getElementById(hash.replace('#', ''))) {
    showSection(hash);
  } else {
    showSection('#home');
  }
});

// Handle browser back/forward
window.addEventListener('hashchange', () => {
  const hash = window.location.hash || '#home';
  showSection(hash);
});

// ========== Keyboard Navigation ==========
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    showSection('#home');
  }
});
