// ========== SMOOTH SCROLL ==========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.querySelector('.nav-links').classList.remove('active');
            document.querySelector('.menu-toggle').classList.remove('active');
        }
    });
});

// ========== NAVBAR SCROLL EFFECT ==========
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.pageYOffset > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ========== MOBILE MENU TOGGLE ==========
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
});

// ========== INTERSECTION OBSERVER FOR ANIMATIONS ==========
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.skill-card, .project-card, .contact-card, .stat-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
});

// ========== TERMINAL ANIMATION ==========
const terminalLines = [
    '$ initializing backend server...',
    '> FastAPI server started on port 8000',
    '> Database connection established',
    '  └─ PostgreSQL@14.5 connected',
    '> Redis cache connected',
    '  └─ Redis@7.0 ready on port 6379',
    '> Loading authentication modules...',
    '  ✓ JWT middleware configured',
    '  ✓ OAuth2 endpoints ready',
    '> Starting API endpoints...',
    '  ✓ POST /api/auth/login',
    '  ✓ GET  /api/users/{id}',
    '  ✓ GET  /api/analytics',
    '  ✓ POST /api/data/process',
    '> Docker containers running',
    '  ├─ app: healthy',
    '  ├─ db: healthy',
    '  └─ redis: healthy',
    '> Server running successfully! 🚀',
    '> Ready to handle requests...'
];

let terminalLineIndex = 0;
let terminalAnimationStarted = false;

function typeTerminalLine() {
    const terminalBody = document.getElementById('terminalBody');
    if (!terminalBody) return;
    
    if (terminalLineIndex < terminalLines.length) {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.textContent = terminalLines[terminalLineIndex];
        terminalBody.appendChild(line);
        terminalLineIndex++;
        
        setTimeout(typeTerminalLine, 200);
    } else {
        const cursor = document.createElement('span');
        cursor.className = 'terminal-cursor';
        terminalBody.appendChild(cursor);
    }
}

// Toggle between image and terminal
let showingTerminal = false;
function toggleTerminal() {
    const heroImage = document.getElementById('heroImage');
    const terminalWrapper = document.getElementById('terminalWrapper');
    const toggleText = document.getElementById('terminalToggleText');
    
    showingTerminal = !showingTerminal;
    
    if (showingTerminal) {
        heroImage.style.display = 'none';
        terminalWrapper.style.display = 'flex';
        toggleText.textContent = 'Show Profile';
        
        if (!terminalAnimationStarted) {
            terminalAnimationStarted = true;
            setTimeout(typeTerminalLine, 500);
        }
    } else {
        heroImage.style.display = 'flex';
        terminalWrapper.style.display = 'none';
        toggleText.textContent = 'Show Terminal';
    }
}

// Select contact cards
const emailCard = document.getElementById('emailCard');
const githubCard = document.getElementById('githubCard');
const linkedinCard = document.getElementById('linkedinCard');

// Add click event to each card
emailCard.addEventListener('click', () => {
    window.location.href = 'mailto:saiyedfaizan842@gmail.com';
});

githubCard.addEventListener('click', () => {
    window.open('https://github.com/faizansaiyed123', '_blank');
});

linkedinCard.addEventListener('click', () => {
    window.open('https://www.linkedin.com/in/faizan-saiyed-52b289228/', '_blank');
});


// ========== STATS COUNTER ANIMATION ==========
function animateCounter(element) {
    const target = parseInt(element.getAttribute('data-target'));
    const duration = 2000;
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
            const counters = entry.target.querySelectorAll('.stat-number');
            counters.forEach(counter => animateCounter(counter));
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.stats-section');
if (statsSection) {
    statsObserver.observe(statsSection);
}

// ========== API PLAYGROUND ==========
function switchAPITab(index) {
    document.querySelectorAll('.playground-tab').forEach((tab, i) => {
        tab.classList.toggle('active', i === index);
    });
    document.querySelectorAll('.playground-panel').forEach((panel, i) => {
        panel.classList.toggle('active', i === index);
    });
}

function showLoading(responseId) {
    const response = document.getElementById(responseId);
    response.innerHTML = '<pre class="loading">Loading...\n<span class="loader">▓▓▓▓▓░░░░░</span></pre>';
}

function testAuthAPI(e) {
    e.preventDefault();
    showLoading('authResponse');
    
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    setTimeout(() => {
        const mockResponse = {
            status: 'success',
            message: 'Authentication successful',
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
            user: {
                id: 12345,
                email: email,
                name: 'John Doe',
                role: 'admin',
                permissions: ['read', 'write', 'delete']
            },
            expires_in: 3600,
            refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            timestamp: new Date().toISOString()
        };
        document.getElementById('authResponse').innerHTML = 
            `<pre>${JSON.stringify(mockResponse, null, 2)}</pre>`;
    }, 1000);
}

function testUserDataAPI(e) {
    e.preventDefault();
    showLoading('userResponse');
    
    const userId = document.getElementById('userId').value;
    
    setTimeout(() => {
        const mockResponse = {
            status: 'success',
            data: {
                id: parseInt(userId),
                name: 'John Doe',
                email: 'john.doe@example.com',
                phone: '+1-555-0123',
                created_at: '2024-01-15T10:30:00Z',
                last_login: '2024-12-12T08:45:23Z',
                projects: 8,
                role: 'senior_developer',
                status: 'active',
                skills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker'],
                total_commits: 1234,
                profile_completion: 95
            },
            meta: {
                request_id: 'req_' + Math.random().toString(36).substr(2, 9),
                response_time: '45ms'
            }
        };
        document.getElementById('userResponse').innerHTML = 
            `<pre>${JSON.stringify(mockResponse, null, 2)}</pre>`;
    }, 1000);
}

function getAnalyticsAPI() {
    showLoading('analyticsResponse');
    
    setTimeout(() => {
        const mockResponse = {
            status: 'success',
            analytics: {
                overview: {
                    total_requests: 45678,
                    successful_requests: 44523,
                    failed_requests: 1155,
                    avg_response_time: '45ms',
                    uptime_percentage: 99.9
                },
                traffic: {
                    requests_today: 1234,
                    requests_this_week: 8567,
                    requests_this_month: 32456,
                    peak_traffic_time: '14:30 UTC'
                },
                users: {
                    active_users: 234,
                    new_users_today: 15,
                    total_registered: 5432
                },
                endpoints: {
                    most_used: '/api/users',
                    fastest: '/api/health (12ms)',
                    slowest: '/api/analytics (89ms)'
                },
                system: {
                    cpu_usage: '23%',
                    memory_usage: '1.2GB / 4GB',
                    disk_usage: '45%',
                    database_connections: 15
                }
            },
            timestamp: new Date().toISOString(),
            server: 'production-01'
        };
        document.getElementById('analyticsResponse').innerHTML = 
            `<pre>${JSON.stringify(mockResponse, null, 2)}</pre>`;
    }, 1200);
}

function copyResponse(responseId) {
    const responseElement = document.getElementById(responseId);
    const text = responseElement.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const btn = event.target.closest('.copy-btn');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        btn.style.background = '#10b981';
        
        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.style.background = '';
        }, 2000);
    });
}

// ========== RESUME MODAL ==========
const resumeModal = document.getElementById('resumeModal');
const resumeBtn = document.getElementById('resumeBtn');
const resumeClose = document.getElementById('resumeClose');
const resumeIframe = document.getElementById('resumeIframe');
const downloadResume = document.getElementById('downloadResume');
const printResume = document.getElementById('printResume');

const RESUME_URL = 'https://github.com/faizansaiyed123/resume/raw/main/Faizan_Saiyed_Resume.pdf';
const RESUME_VIEWER_URL = `https://docs.google.com/viewer?url=${encodeURIComponent(RESUME_URL)}&embedded=true`;

function openResumeModal() {
    resumeIframe.src = RESUME_VIEWER_URL;
    resumeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeResumeModal() {
    resumeModal.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
        resumeIframe.src = '';
    }, 300);
}

if (resumeBtn) {
    resumeBtn.addEventListener('click', openResumeModal);
}

if (resumeClose) {
    resumeClose.addEventListener('click', closeResumeModal);
}

resumeModal.addEventListener('click', (e) => {
    if (e.target === resumeModal) {
        closeResumeModal();
    }
});

if (downloadResume) {
    downloadResume.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = RESUME_URL;
        link.download = 'Faizan_Saiyed_Resume.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

if (printResume) {
    printResume.addEventListener('click', () => {
        window.open(RESUME_URL, '_blank');
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && resumeModal.classList.contains('active')) {
        closeResumeModal();
    }
});

// ========== THEME TOGGLE ==========
function toggleTheme() {
    alert('Theme toggle feature coming soon! Currently showing dark mode.');
}

// ========== CHATBOT ==========
const chatbotToggle = document.getElementById('chatbotToggle');
const chatbotContainer = document.getElementById('chatbotContainer');
const chatbotClose = document.getElementById('chatbotClose');
const chatBox = document.getElementById('chat-box');
const input = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

const API_URL = "https://faizan-bot-worker.fai1ggj.workers.dev/";
const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

if (chatbotToggle && chatbotContainer && chatbotClose) {
    chatbotToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        chatbotContainer.classList.add('active');
        chatbotToggle.style.display = 'none';
        
        if (chatBox && chatBox.children.length === 0) {
            setTimeout(() => {
                addMessage("Hi! I'm Faizan's AI assistant. Feel free to ask me anything about Faizan's skills, projects, or experience! 😊", "bot");
            }, 300);
        }
    });

    chatbotClose.addEventListener('click', () => {
        chatbotContainer.classList.remove('active');
        chatbotToggle.style.display = 'flex';
    });

    document.addEventListener('click', (e) => {
        if (!chatbotContainer.contains(e.target) && !chatbotToggle.contains(e.target)) {
            if (chatbotContainer.classList.contains('active')) {
                chatbotContainer.classList.remove('active');
                chatbotToggle.style.display = 'flex';
            }
        }
    });
}

function addMessage(text, sender) {
    if (!chatBox) return;
    
    const msg = document.createElement("div");
    msg.classList.add("message", sender);

    let cleanText = text
        .replace(/<\/?[^>]+(>|$)/g, "")
        .replace(/%3C/g, "<")
        .replace(/%3E/g, ">")
        .replace(/%20/g, " ")
        .replace(/%22/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"');

    let html = cleanText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    html = html.replace(/(?<!href="|">)(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank">$1</a>');
    html = html.replace(/\n/g, '<br>');

    msg.innerHTML = html;
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addResumeDownloadButton() {
    if (!chatBox) return;
    
    const btnContainer = document.createElement("div");
    btnContainer.classList.add("message", "bot");
    btnContainer.style.display = "flex";
    btnContainer.style.alignItems = "center";
    btnContainer.style.gap = "10px";
    btnContainer.style.flexWrap = "wrap";

    const previewBtn = document.createElement("button");
    previewBtn.textContent = "👁️ Preview Resume";
    previewBtn.classList.add("resume-download-btn");
    previewBtn.style.background = "linear-gradient(90deg, #3b82f6, #2563eb)";

    previewBtn.addEventListener("click", () => {
        openResumeModal();
    });

    const downloadBtn = document.createElement("button");
    downloadBtn.textContent = "📄 Download Resume";
    downloadBtn.classList.add("resume-download-btn");
    downloadBtn.style.background = "linear-gradient(90deg, #10b981, #059669)";

    downloadBtn.addEventListener("click", async () => {
        downloadBtn.textContent = "⏳ Downloading...";
        downloadBtn.disabled = true;
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ downloadResume: true }),
            });
            if (!response.ok) throw new Error("Failed to download resume");
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "Faizan_Saiyed_Resume.pdf";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            downloadBtn.textContent = "✅ Downloaded!";
            setTimeout(() => {
                downloadBtn.textContent = "📄 Download Again";
                downloadBtn.disabled = false;
            }, 2000);
        } catch (err) {
            console.error(err);
            downloadBtn.textContent = "❌ Download Failed";
            setTimeout(() => {
                downloadBtn.textContent = "📄 Try Again";
                downloadBtn.disabled = false;
            }, 2000);
        }
    });

    btnContainer.appendChild(previewBtn);
    btnContainer.appendChild(downloadBtn);
    chatBox.appendChild(btnContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    if (!input || !chatBox) return;
    
    const userText = input.value.trim();
    if (!userText) return;

    addMessage(userText, "user");
    input.value = "";

    const typingMsg = document.createElement("div");
    typingMsg.classList.add("message", "bot");
    typingMsg.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <div style="display: flex; gap: 4px;">
                <span style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%; animation: typing 1.4s infinite; animation-delay: 0s;"></span>
                <span style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%; animation: typing 1.4s infinite; animation-delay: 0.2s;"></span>
                <span style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%; animation: typing 1.4s infinite; animation-delay: 0.4s;"></span>
            </div>
            <span style="font-size: 12px; color: #94a3b8;">AI is thinking...</span>
        </div>
    `;
    chatBox.appendChild(typingMsg);
    chatBox.scrollTop = chatBox.scrollHeight;

    if (!document.getElementById('typingAnimation')) {
        const style = document.createElement('style');
        style.id = 'typingAnimation';
        style.textContent = `
            @keyframes typing {
                0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
                30% { transform: translateY(-10px); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userText, userId }),
        });

        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const data = await response.json();
        typingMsg.remove();

        addMessage(data.reply || "Sorry, I couldn't understand that.", "bot");

        if (data.showResumeDownload) addResumeDownloadButton();
    } catch (err) {
        console.error(err);
        typingMsg.remove();
        addMessage("⚠️ Error connecting to Faizan's AI. Try again.", "bot");
    }
}

if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
}

if (input) {
    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });
}