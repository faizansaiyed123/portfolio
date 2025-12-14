// ========== COMPLETE PORTFOLIO JAVASCRIPT ==========

// ========== SMOOTH SCROLL ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            // Close mobile menu after navigation
            document.querySelector('.nav-links')?.classList.remove('active');
            document.querySelector('.menu-toggle')?.classList.remove('active');
        }
    });
});

// ========== NAVBAR SCROLL EFFECTS ==========
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const scrollProgress = document.querySelector('.scroll-progress');
    
    // Navbar scroll effect
    if (window.pageYOffset > 50) {
        navbar?.classList.add('scrolled');
    } else {
        navbar?.classList.remove('scrolled');
    }
    
    // Scroll progress indicator
    const scrollPercent = (window.pageYOffset / (document.body.scrollHeight - window.innerHeight)) * 100;
    if (scrollProgress) {
        scrollProgress.style.width = scrollPercent + '%';
    }
});

// ========== MOBILE MENU TOGGLE ==========
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
    });
}

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
        navLinks.classList.remove('active');
        menuToggle.classList.remove('active');
    }
});

// ========== SCROLL ANIMATIONS ==========
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('animate');
        }
    });
}, observerOptions);

// Observe all sections
document.querySelectorAll('section').forEach(section => {
    sectionObserver.observe(section);
});

// Card animations
const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.skill-card, .project-card, .contact-card, .stat-card, .testimonial-card, .blog-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    cardObserver.observe(el);
});

// ========== STATS COUNTER ANIMATION ==========
function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'));
    const duration = 2500;
    const increment = target / (duration / 16);
    let current = 0;
    
    const updateCounter = () => {
        current += increment;
        if (current < target) {
            element.textContent = Math.floor(current).toLocaleString();
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = target.toLocaleString();
        }
    };
    
    updateCounter();
}

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const counters = entry.target.querySelectorAll('.stat-number, .github-stat-number');
            counters.forEach(counter => {
                if (!counter.classList.contains('animated')) {
                    animateCounter(counter);
                    counter.classList.add('animated');
                }
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.stats-section, .github-section').forEach(section => {
    statsObserver.observe(section);
});

// Skill progress bars
const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const progressBars = entry.target.querySelectorAll('.skill-progress');
            progressBars.forEach(bar => {
                const width = bar.getAttribute('data-width');
                bar.style.width = width + '%';
            });
            skillObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.skills').forEach(section => {
    skillObserver.observe(section);
});

// ========== PROJECT FILTERING ==========
const filterButtons = document.querySelectorAll('.filter-btn');
const projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Update active filter
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        const filter = button.getAttribute('data-filter');
        
        projectCards.forEach(card => {
            const categories = card.getAttribute('data-categories');
            if (filter === 'all' || categories.includes(filter)) {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
                card.style.pointerEvents = 'auto';
            } else {
                card.style.opacity = '0.3';
                card.style.transform = 'translateY(20px)';
                card.style.pointerEvents = 'none';
            }
        });
    });
});

// ========== API PLAYGROUND ==========
function switchAPITab(index) {
    document.querySelectorAll('.playground-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
        tab.setAttribute('aria-selected', i === index);
        tab.setAttribute('tabindex', i === index ? '0' : '-1');
    });
    document.querySelectorAll('.playground-panel').forEach((panel, i) => {
        panel.classList.toggle('active', i === index);
    });
}

function showLoading(responseId) {
    const response = document.getElementById(responseId);
    const button = event?.target.closest('button');
    
    if (button) {
        const spinner = button.querySelector('.loading-spinner');
        if (spinner) spinner.style.display = 'inline-block';
        button.disabled = true;
    }
    
    response.innerHTML = '<pre class="loading">🔄 Processing request...\n\nResponse time: <span id="response-timer">...</span></pre>';
    
    let elapsed = 0;
    const timer = setInterval(() => {
        elapsed += 50;
        const timerEl = document.getElementById('response-timer');
        if (timerEl) timerEl.textContent = (elapsed / 1000).toFixed(2) + 's';
    }, 50);
    
    return { timer, elapsed };
}

function testAuthAPI(e) {
    e.preventDefault();
    const loading = showLoading('authResponse');
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    setTimeout(() => {
        clearInterval(loading.timer);
        const mockResponse = {
            status: 'success',
            status_code: 200,
            message: 'Authentication successful',
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: {
                id: 12345,
                email: email,
                name: 'John Doe',
                role: 'admin',
                permissions: ['read', 'write', 'delete']
            },
            expires_in: 3600,
            refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            timestamp: new Date().toISOString(),
            response_time: `${loading.elapsed / 1000}s`
        };
        document.getElementById('authResponse').innerHTML = `<pre>${JSON.stringify(mockResponse, null, 2)}</pre>`;
        resetButton('authResponse');
    }, 1500);
}

function testUserDataAPI(e) {
    e.preventDefault();
    const loading = showLoading('userResponse');
    
    const userId = document.getElementById('userId').value;
    
    setTimeout(() => {
        clearInterval(loading.timer);
        const mockResponse = {
            status: 'success',
            status_code: 200,
            data: {
                id: parseInt(userId),
                name: 'John Doe',
                email: 'john.doe@example.com',
                role: 'senior_developer',
                created_at: '2024-01-15T10:30:00Z',
                projects: 8,
                total_commits: 1234,
                profile_completion: 95
            },
            meta: {
                request_id: 'req_' + Math.random().toString(36).substr(2, 9),
                response_time: `${loading.elapsed / 1000}s`
            }
        };
        document.getElementById('userResponse').innerHTML = `<pre>${JSON.stringify(mockResponse, null, 2)}</pre>`;
        resetButton('userResponse');
    }, 1200);
}

function getAnalyticsAPI() {
    const loading = showLoading('analyticsResponse');
    
    setTimeout(() => {
        clearInterval(loading.timer);
        const mockResponse = {
            status: 'success',
            status_code: 200,
            analytics: {
                overview: {
                    total_requests: 45678,
                    successful_requests: 44523,
                    uptime_percentage: 99.9
                },
                traffic: {
                    requests_today: 1234,
                    peak_traffic_time: '14:30 UTC'
                },
                response_time: `${loading.elapsed / 1000}s`
            }
        };
        document.getElementById('analyticsResponse').innerHTML = `<pre>${JSON.stringify(mockResponse, null, 2)}</pre>`;
        resetButton('analyticsResponse');
    }, 1800);
}

function resetButton(responseId) {
    const button = event?.target.closest('button');
    if (button) {
        const spinner = button.querySelector('.loading-spinner');
        if (spinner) spinner.style.display = 'none';
        button.disabled = false;
    }
}

function copyResponse(responseId) {
    const responseElement = document.getElementById(responseId);
    const text = responseElement.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const btn = event.target.closest('.copy-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.style.background = 'rgba(16, 185, 129, 0.8)';
        btn.style.borderColor = 'rgba(16, 185, 129, 0.5)';
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
            btn.style.borderColor = '';
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    });
}

// ========== RESUME MODAL ==========
const resumeModal = document.getElementById('resumeModal');
const resumeBtn = document.getElementById('resumeBtn');
const resumeClose = document.getElementById('resumeClose');
const resumeIframe = document.getElementById('resumeIframe');

const RESUME_URL = 'assets/resume.pdf'; // Local fallback

function openResumeModal() {
    if (resumeIframe) resumeIframe.src = RESUME_URL;
    if (resumeModal) resumeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
}

function closeResumeModal() {
    if (resumeModal) resumeModal.classList.remove('active');
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    setTimeout(() => {
        if (resumeIframe) resumeIframe.src = '';
    }, 300);
}

if (resumeBtn) resumeBtn.addEventListener('click', openResumeModal);
if (resumeClose) resumeClose.addEventListener('click', closeResumeModal);

// Close modal on outside click
if (resumeModal) {
    resumeModal.addEventListener('click', (e) => {
        if (e.target === resumeModal) closeResumeModal();
    });
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeResumeModal();
        // Close chatbot if open
        const chatbotContainer = document.getElementById('chatbotContainer');
        if (chatbotContainer?.classList.contains('active')) {
            chatbotContainer.classList.remove('active');
        }
    }
});

// ========== THEME TOGGLE ==========
function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const themeToggle = document.querySelector('.theme-toggle i');
    if (themeToggle) {
        themeToggle.classList.toggle('fa-moon');
        themeToggle.classList.toggle('fa-sun');
    }
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

// Load saved theme
if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-theme');
}

// ========== CONTACT FORM ==========
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(contactForm);
        const responseDiv = document.getElementById('formResponse');
        const submitBtn = contactForm.querySelector('button[type="submit"]');
        
        // Show loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
        if (responseDiv) {
            responseDiv.className = 'form-response';
            responseDiv.innerHTML = 'Sending message...';
        }
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Mock success response
            if (responseDiv) {
                responseDiv.className = 'form-response success';
                responseDiv.innerHTML = '✅ Message sent successfully! I\'ll get back to you within 24 hours.';
            }
            
            contactForm.reset();
        } catch (error) {
            if (responseDiv) {
                responseDiv.className = 'form-response error';
                responseDiv.innerHTML = '❌ Failed to send message. Please try again.';
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
        }
    });
}

// ========== CHATBOT ==========
const chatbotToggle = document.getElementById('chatbotToggle');
const chatbotContainer = document.getElementById('chatbotContainer');
const chatbotClose = document.getElementById('chatbotClose');
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

function addMessage(text, sender) {
    if (!chatBox) return;
    
    const msg = document.createElement("div");
    msg.classList.add("message", sender);
    
    // Sanitize and format message
    let cleanText = text
        .replace(/<\/?[^>]+(>|$)/g, "")
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    
    let html = cleanText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
    
    msg.innerHTML = html;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
    
    return msg;
}

if (chatbotToggle && chatbotContainer && chatbotClose) {
    chatbotToggle.addEventListener('click', () => {
        chatbotContainer.classList.add('active');
        chatbotToggle.style.display = 'none';
        
        if (chatBox && chatBox.children.length === 0) {
            setTimeout(() => {
                addMessage("Hi! 👋 I'm Faizan's AI assistant. Ask me about his skills, projects, or experience!", "bot");
            }, 300);
        }
    });
    
    chatbotClose.addEventListener('click', () => {
        chatbotContainer.classList.remove('active');
        chatbotToggle.style.display = 'flex';
    });
    
    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!chatbotContainer.contains(e.target) && !chatbotToggle.contains(e.target)) {
            chatbotContainer.classList.remove('active');
            chatbotToggle.style.display = 'flex';
        }
    });
}

if (sendBtn && userInput) {
    const sendMessage = async () => {
        const text = userInput.value.trim();
        if (!text) return;
        
        addMessage(text, "user");
        userInput.value = "";
        userInput.focus();
        
        // Show typing indicator
        const typingMsg = addMessage("🤔 Thinking...", "bot");
        
        // Mock AI response
        setTimeout(() => {
            typingMsg.remove();
            const responses = [
                "Faizan specializes in FastAPI backend development with PostgreSQL and Docker! 🚀",
                "Check out his AI Chat Backend project with Redis queues and Stripe integration 💬",
                "He has 2+ years experience building scalable APIs and microservices ⚡",
                "Want his resume? Click the buttons below! 📄",
                "Faizan excels at clean, documented code with comprehensive READMEs 📚"
            ];
            const response = responses[Math.floor(Math.random() * responses.length)];
            addMessage(response, "bot");
        }, 1500);
    };
    
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

// ========== PROJECT MODALS ==========
function openProjectModal(index) {
    const modalContent = document.getElementById('projectModalContent');
    const projectData = [
        {
            title: "AI Chat Backend System",
            description: "Scalable real-time chat platform with AI integration. Features JWT auth, Redis queues, WebSocket support, and Stripe payments.",
            challenge: "Handle 500+ concurrent users with <100ms response times",
            solution: "FastAPI + Redis + PostgreSQL + Docker multi-container setup",
            impact: "10x faster delivery, 99.9% uptime, production-ready",
            metrics: "500+ concurrent users, 45ms avg response",
            tech: ["FastAPI", "PostgreSQL", "Redis", "Docker", "Stripe", "WebSocket"]
        }
    ];
    
    if (modalContent) {
        modalContent.innerHTML = `
            <h2>${projectData[0]?.title}</h2>
            <p>${projectData[0]?.description}</p>
            <div class="project-modal-stats">
                <div><strong>Challenge:</strong> ${projectData[0]?.challenge}</div>
                <div><strong>Solution:</strong> ${projectData[0]?.solution}</div>
                <div><strong>Impact:</strong> ${projectData[0]?.impact}</div>
            </div>
        `;
        document.getElementById('projectModal')?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeProjectModal() {
    document.getElementById('projectModal')?.classList.remove('active');
    document.body.style.overflow = '';
}

// ========== PERFORMANCE OPTIMIZATION ==========
function optimizePerformance() {
    // Lazy load images
    const images = document.querySelectorAll('img[loading="lazy"]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src || img.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
    
    // Preload critical resources
    const links = [
        '/assets/profile.jpeg',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
    ];
    
    links.forEach(href => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = 'image';
        document.head.appendChild(link);
    });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Theme initialization
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Performance optimizations
    optimizePerformance();
    
    // Focus management for accessibility
    document.querySelector('.navbar')?.setAttribute('role', 'navigation');
    document.querySelectorAll('button, [tabindex]:not([tabindex="-1"])').forEach(el => {
        el.addEventListener('focus', () => el.style.outline = '2px solid var(--primary)');
        el.addEventListener('blur', () => el.style.outline = '');
    });
});

// Handle window resize
window.addEventListener('resize', () => {
    // Close mobile menu on resize
    navLinks?.classList.remove('active');
    menuToggle?.classList.remove('active');
});

// Error handling
window.addEventListener('error', (e) => {
    console.error('Portfolio error:', e.error);
});

// PWA readiness
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Service worker not critical
        });
    });
}


// ========== CUSTOM ANIMATIONS FOR PORTFOLIO ==========

// ========== 1. TYPEWRITER EFFECT FOR HERO ==========
class Typewriter {
    constructor(element, words, wait = 3000) {
        this.element = element;
        this.words = words;
        this.txt = '';
        this.wordIndex = 0;
        this.wait = parseInt(wait, 10);
        this.isDeleting = false;
        this.type();
    }

    type() {
        const current = this.wordIndex % this.words.length;
        const fullTxt = this.words[current];

        if (this.isDeleting) {
            this.txt = fullTxt.substring(0, this.txt.length - 1);
        } else {
            this.txt = fullTxt.substring(0, this.txt.length + 1);
        }

        this.element.innerHTML = `<span class="txt">${this.txt}</span><span class="cursor">|</span>`;

        let typeSpeed = 100;

        if (this.isDeleting) {
            typeSpeed /= 2;
        }

        if (!this.isDeleting && this.txt === fullTxt) {
            typeSpeed = this.wait;
            this.isDeleting = true;
        } else if (this.isDeleting && this.txt === '') {
            this.isDeleting = false;
            this.wordIndex++;
            typeSpeed = 500;
        }

        setTimeout(() => this.type(), typeSpeed);
    }
}

// ========== 2. SCROLL REVEAL ANIMATIONS ==========
class ScrollReveal {
    constructor() {
        this.sections = document.querySelectorAll('section');
        this.cards = document.querySelectorAll('.project-card, .stat-card, .contact-card, .blog-card, .testimonial-card');
        this.init();
    }

    init() {
        this.observeSections();
        this.observeCards();
    }

    observeSections() {
        const options = {
            threshold: 0.15,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                }
            });
        }, options);

        this.sections.forEach(section => {
            observer.observe(section);
        });
    }

    observeCards() {
        const options = {
            threshold: 0.2,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
                    }, index * 100);
                    observer.unobserve(entry.target);
                }
            });
        }, options);

        this.cards.forEach(card => {
            card.style.opacity = '0';
            observer.observe(card);
        });
    }
}

// ========== 3. FLOATING PARTICLES BACKGROUND ==========
class ParticleBackground {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 50;
        this.init();
    }

    init() {
        this.canvas.id = 'particleCanvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '-1';
        this.canvas.style.pointerEvents = 'none';
        document.querySelector('.bg-animation').appendChild(this.canvas);

        this.resize();
        this.createParticles();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;

            if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
            if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;

            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(0, 245, 255, ${particle.opacity})`;
            this.ctx.fill();
        });

        // Draw connections
        this.particles.forEach((p1, i) => {
            this.particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 150) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(p1.x, p1.y);
                    this.ctx.lineTo(p2.x, p2.y);
                    this.ctx.strokeStyle = `rgba(0, 245, 255, ${0.2 * (1 - distance / 150)})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.stroke();
                }
            });
        });

        requestAnimationFrame(() => this.animate());
    }
}

// ========== 4. SMOOTH NUMBER COUNTER ==========
class NumberCounter {
    constructor() {
        this.counters = document.querySelectorAll('.stat-number');
        this.hasAnimated = false;
        this.init();
    }

    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.hasAnimated) {
                    this.hasAnimated = true;
                    this.animateCounters();
                }
            });
        }, { threshold: 0.5 });

        const statsSection = document.querySelector('.stats-section');
        if (statsSection) {
            observer.observe(statsSection);
        }
    }

    animateCounters() {
        this.counters.forEach(counter => {
            const target = parseInt(counter.getAttribute('data-target'));
            const duration = 2000;
            const step = target / (duration / 16);
            let current = 0;

            const updateCounter = () => {
                current += step;
                if (current < target) {
                    counter.textContent = Math.floor(current).toLocaleString();
                    requestAnimationFrame(updateCounter);
                } else {
                    counter.textContent = target.toLocaleString();
                }
            };

            updateCounter();
        });
    }
}

// ========== 5. PARALLAX EFFECT ==========
class ParallaxEffect {
    constructor() {
        this.heroImage = document.querySelector('.hero-image-wrapper');
        this.init();
    }

    init() {
        if (!this.heroImage) return;

        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;
            this.heroImage.style.transform = `translateY(${rate}px)`;
        });
    }
}

// ========== 6. MAGNETIC BUTTONS ==========
class MagneticButtons {
    constructor() {
        this.buttons = document.querySelectorAll('.btn, .project-btn');
        this.init();
    }

    init() {
        this.buttons.forEach(button => {
            button.addEventListener('mousemove', (e) => {
                const rect = button.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                button.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'translate(0, 0)';
            });
        });
    }
}

// ========== 7. TEXT REVEAL ON SCROLL ==========
class TextReveal {
    constructor() {
        this.elements = document.querySelectorAll('.section-title, .section-subtitle, .about-text p');
        this.init();
    }

    init() {
        this.elements.forEach(el => {
            const text = el.textContent;
            el.innerHTML = '';
            
            text.split('').forEach((char, i) => {
                const span = document.createElement('span');
                span.textContent = char;
                span.style.opacity = '0';
                span.style.display = 'inline-block';
                span.style.animation = `fadeInChar 0.05s ease forwards ${i * 0.02}s`;
                el.appendChild(span);
            });
        });

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.querySelectorAll('span').forEach((span, i) => {
                        span.style.animation = `fadeInChar 0.05s ease forwards ${i * 0.02}s`;
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        this.elements.forEach(el => observer.observe(el));
    }
}

// ========== 8. CURSOR TRAIL EFFECT ==========
class CursorTrail {
    constructor() {
        this.trail = [];
        this.maxTrail = 20;
        this.init();
    }

    init() {
        document.addEventListener('mousemove', (e) => {
            this.addTrailDot(e.clientX, e.clientY);
        });
    }

    addTrailDot(x, y) {
        const dot = document.createElement('div');
        dot.className = 'cursor-trail-dot';
        dot.style.left = x + 'px';
        dot.style.top = y + 'px';
        document.body.appendChild(dot);

        this.trail.push(dot);

        setTimeout(() => {
            dot.remove();
            this.trail.shift();
        }, 500);

        if (this.trail.length > this.maxTrail) {
            this.trail[0].remove();
            this.trail.shift();
        }
    }
}

// ========== 9. PROGRESS BAR ANIMATION ==========
class ProgressBarAnimation {
    constructor() {
        this.bars = document.querySelectorAll('.bar');
        this.hasAnimated = false;
        this.init();
    }

    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.hasAnimated) {
                    this.hasAnimated = true;
                    this.animateBars();
                }
            });
        }, { threshold: 0.5 });

        const skillsSection = document.querySelector('.skills');
        if (skillsSection) {
            observer.observe(skillsSection);
        }
    }

    animateBars() {
        this.bars.forEach((bar, index) => {
            const width = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = width;
                bar.style.transition = 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
            }, index * 100);
        });
    }
}

// ========== INITIALIZE ALL ANIMATIONS ==========
document.addEventListener('DOMContentLoaded', () => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (!prefersReducedMotion) {
        // Typewriter effect for hero subtitle
        const typewriterElement = document.querySelector('.hero h2');
        if (typewriterElement) {
            const originalText = typewriterElement.textContent;
            const words = [
                'Full Stack Developer',
                'Backend-Focused API Engineer',
                'FastAPI Specialist',
                'Building Scalable Systems'
            ];
            new Typewriter(typewriterElement, words);
        }

        // Initialize all animations
        new ScrollReveal();
        new ParticleBackground();
        new NumberCounter();
        new ParallaxEffect();
        new MagneticButtons();
        new ProgressBarAnimation();
        
        // Optional: Uncomment for more effects
        // new TextReveal();
        // new CursorTrail();
    }
});

// ========== CSS ANIMATIONS (Add to your CSS) ==========
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInChar {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .cursor {
        animation: blink 1s infinite;
    }

    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
    }

    .cursor-trail-dot {
        position: fixed;
        width: 8px;
        height: 8px;
        background: rgba(0, 245, 255, 0.6);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        animation: trailFade 0.5s ease-out forwards;
    }

    @keyframes trailFade {
        to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0);
        }
    }

    /* Smooth transitions for magnetic buttons */
    .btn, .project-btn {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    /* Card entrance animations */
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(40px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

const backToTopBtn = document.getElementById("backToTopBtn");

  window.onscroll = () => {
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
      backToTopBtn.style.display = "block";
    } else {
      backToTopBtn.style.display = "none";
    }
  };

  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  