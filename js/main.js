/* ============================================================
   INDESIGN SCALP & HAIR CARE CENTER — MAIN JAVASCRIPT
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ===== PRELOADER =====
  const preloader = document.getElementById('preloader');
  window.addEventListener('load', () => {
    setTimeout(() => {
      preloader.classList.add('hidden');
    }, 800);
  });

  // Fallback: hide preloader after 3s
  setTimeout(() => {
    preloader.classList.add('hidden');
  }, 3000);

  // ===== HEADER SCROLL =====
  const header = document.getElementById('header');
  const scrollTopBtn = document.getElementById('scrollTop');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    // Header sticky
    if (scrollY > 100) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Scroll-to-top button
    if (scrollY > 600) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ===== MOBILE NAVIGATION =====
  const mobileToggle = document.getElementById('mobileToggle');
  const mainNav = document.getElementById('main-nav');

  mobileToggle.addEventListener('click', () => {
    mobileToggle.classList.toggle('active');
    mainNav.classList.toggle('open');
    document.body.style.overflow = mainNav.classList.contains('open') ? 'hidden' : '';
  });

  // Mobile dropdown toggles
  document.querySelectorAll('.has-dropdown > a').forEach(link => {
    link.addEventListener('click', (e) => {
      if (window.innerWidth <= 1024) {
        e.preventDefault();
        link.parentElement.classList.toggle('open');
      }
    });
  });

  // Close mobile nav on link click
  document.querySelectorAll('.dropdown a').forEach(link => {
    link.addEventListener('click', () => {
      if (mainNav.classList.contains('open')) {
        mobileToggle.classList.remove('active');
        mainNav.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  });

  // ===== HERO SLIDER =====
  const slides = document.querySelectorAll('.hero-slide');
  const dotsContainer = document.querySelector('.hero-dots');
  const prevBtn = document.querySelector('.hero-prev');
  const nextBtn = document.querySelector('.hero-next');
  let currentSlide = 0;
  let slideInterval;

  // Create dots
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.classList.add('hero-dot');
    if (i === 0) dot.classList.add('active');
    dot.setAttribute('aria-label', `슬라이드 ${i + 1}`);
    dot.addEventListener('click', () => goToSlide(i));
    dotsContainer.appendChild(dot);
  });

  const dots = document.querySelectorAll('.hero-dot');

  function goToSlide(index) {
    slides[currentSlide].classList.remove('active');
    dots[currentSlide].classList.remove('active');
    currentSlide = index;
    slides[currentSlide].classList.add('active');
    dots[currentSlide].classList.add('active');
  }

  function nextSlide() {
    goToSlide((currentSlide + 1) % slides.length);
  }

  function prevSlide() {
    goToSlide((currentSlide - 1 + slides.length) % slides.length);
  }

  prevBtn.addEventListener('click', () => {
    prevSlide();
    resetInterval();
  });

  nextBtn.addEventListener('click', () => {
    nextSlide();
    resetInterval();
  });

  function startInterval() {
    slideInterval = setInterval(nextSlide, 5000);
  }

  function resetInterval() {
    clearInterval(slideInterval);
    startInterval();
  }

  startInterval();

  // ===== SCROLL ANIMATIONS (AOS-like) =====
  const animatedElements = document.querySelectorAll('[data-aos]');

  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.getAttribute('data-aos-delay') || 0;
        setTimeout(() => {
          entry.target.classList.add('aos-animate');
        }, parseInt(delay));
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animatedElements.forEach(el => observer.observe(el));

  // ===== COUNTER ANIMATION =====
  const counters = document.querySelectorAll('.stat-number[data-count]');

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.getAttribute('data-count'));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        const update = () => {
          current += step;
          if (current >= target) {
            entry.target.textContent = target.toLocaleString();
          } else {
            entry.target.textContent = Math.floor(current).toLocaleString();
            requestAnimationFrame(update);
          }
        };

        requestAnimationFrame(update);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => counterObserver.observe(counter));

  // ===== BEFORE & AFTER FILTER =====
  const baTabs = document.querySelectorAll('.ba-tab');
  const baCards = document.querySelectorAll('.ba-card');

  baTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      baTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');

      baCards.forEach(card => {
        if (filter === 'all' || card.getAttribute('data-category') === filter) {
          card.classList.remove('hidden');
          card.style.display = '';
        } else {
          card.classList.add('hidden');
          card.style.display = 'none';
        }
      });
    });
  });

  // ===== FAQ ACCORDION =====
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isActive = item.classList.contains('active');

      // Close all
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

      // Toggle current
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // ===== FORM SUBMISSION =====
  const form = document.getElementById('reservationForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      // Validate required fields
      if (!data.name || !data.phone || !data.concern || !form.querySelector('#privacy').checked) {
        alert('필수 항목을 모두 입력해 주세요.');
        return;
      }

      // Simulate submission
      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.textContent = '접수 중...';
      submitBtn.disabled = true;

      setTimeout(() => {
        alert('상담 신청이 완료되었습니다.\n빠른 시일 내에 연락드리겠습니다.\n감사합니다.');
        form.reset();
        submitBtn.textContent = '상담 신청하기';
        submitBtn.disabled = false;
      }, 1200);
    });
  }

  // ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: elementPosition - headerOffset,
          behavior: 'smooth'
        });

        // Close mobile nav if open
        if (mainNav.classList.contains('open')) {
          mobileToggle.classList.remove('active');
          mainNav.classList.remove('open');
          document.body.style.overflow = '';
        }
      }
    });
  });

  // ===== ACTIVE NAV HIGHLIGHT ON SCROLL =====
  const sections = document.querySelectorAll('section[id]');

  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 200;

    sections.forEach(section => {
      const top = section.offsetTop;
      const height = section.offsetHeight;
      const id = section.getAttribute('id');

      if (scrollPos >= top && scrollPos < top + height) {
        document.querySelectorAll('.nav-item > a').forEach(link => {
          link.parentElement.classList.remove('active');
          if (link.getAttribute('href') === '#' + id) {
            link.parentElement.classList.add('active');
          }
        });
      }
    });
  });

  // ===== PARALLAX EFFECT ON HERO =====
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const heroSection = document.querySelector('.hero-section');
    if (heroSection && scrollY < heroSection.offsetHeight) {
      const activeSlide = document.querySelector('.hero-slide.active');
      if (activeSlide) {
        activeSlide.style.backgroundPositionY = `${scrollY * 0.4}px`;
      }
    }
  });

});
