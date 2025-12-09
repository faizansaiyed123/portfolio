        // Smooth scroll
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    // Close mobile menu if open
                    document.querySelector('.nav-links').classList.remove('active');
                    document.querySelector('.menu-toggle').classList.remove('active');
                }
            });
        });

        // Navbar scroll effect
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const navbar = document.querySelector('.navbar');
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
            
            lastScroll = currentScroll;
        });

        // Mobile menu toggle
        const menuToggle = document.querySelector('.menu-toggle');
        const navLinks = document.querySelector('.nav-links');

        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Intersection Observer for animations
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

        // Observe skill cards and project cards
        document.querySelectorAll('.skill-card, .project-card, .contact-card').forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s ease';
            observer.observe(el);
        });

        // Chatbot functionality
        const chatbotToggle = document.getElementById('chatbotToggle');
        const chatbotContainer = document.getElementById('chatbotContainer');
        const chatbotClose = document.getElementById('chatbotClose');

        chatbotToggle.addEventListener('click', () => {
            chatbotContainer.classList.add('active');
            chatbotToggle.style.display = 'none';
        });

        chatbotClose.addEventListener('click', () => {
            chatbotContainer.classList.remove('active');
            chatbotToggle.style.display = 'flex';
        });

        // Close chatbot when clicking outside
        document.addEventListener('click', (e) => {
            if (!chatbotContainer.contains(e.target) && !chatbotToggle.contains(e.target)) {
                if (chatbotContainer.classList.contains('active')) {
                    chatbotContainer.classList.remove('active');
                    chatbotToggle.style.display = 'flex';
                }
            }
        });

        // ========== INTEGRATED CHATBOT LOGIC ==========
        const API_URL = "https://faizan-bot-worker.fai1ggj.workers.dev/";
        const chatBox = document.getElementById("chat-box");
        const input = document.getElementById("user-input");
        const sendBtn = document.getElementById("send-btn");

        // Generate a simple user ID for conversation continuity
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        function addMessage(text, sender) {
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

            previewBtn.addEventListener("mouseenter", () => {
                previewBtn.style.background = "linear-gradient(90deg, #2563eb, #1d4ed8)";
                previewBtn.style.transform = "scale(1.05)";
            });
            previewBtn.addEventListener("mouseleave", () => {
                previewBtn.style.background = "linear-gradient(90deg, #3b82f6, #2563eb)";
                previewBtn.style.transform = "scale(1)";
            });

            previewBtn.addEventListener("click", async () => {
                previewBtn.textContent = "🔍 Loading Preview...";
                previewBtn.disabled = true;
                try {
                    const response = await fetch(API_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ previewResume: true }),
                    });

                    if (!response.ok) throw new Error("Failed to load preview");

                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);

                    const existingPreview = document.querySelector('.resume-preview-container');
                    if (existingPreview) existingPreview.remove();

                    const previewContainer = document.createElement("div");
                    previewContainer.classList.add("message", "bot", "resume-preview-container");
                    previewContainer.innerHTML = `
                        <p><strong>📄 Resume Preview:</strong></p>
                        <iframe src="${url}" width="100%" height="400px" style="border-radius: 8px; border: 1px solid #475569; background: #fff; margin-top: 10px;"></iframe>
                        <p style="font-size: 11px; color: #94a3b8; margin-top: 8px;">Tip: You can scroll within the preview to view the full resume</p>
                    `;
                    chatBox.appendChild(previewContainer);
                    chatBox.scrollTop = chatBox.scrollHeight;

                    previewBtn.textContent = "👁️ Preview Again";
                } catch (err) {
                    console.error(err);
                    addMessage("❌ Could not load preview. Please try downloading instead.", "bot");
                    previewBtn.textContent = "❌ Preview Failed";
                } finally {
                    previewBtn.disabled = false;
                }
            });

            const downloadBtn = document.createElement("button");
            downloadBtn.textContent = "📄 Download Resume";
            downloadBtn.classList.add("resume-download-btn");
            downloadBtn.style.background = "linear-gradient(90deg, #10b981, #059669)";

            downloadBtn.addEventListener("mouseenter", () => {
                downloadBtn.style.background = "linear-gradient(90deg, #059669, #047857)";
                downloadBtn.style.transform = "scale(1.05)";
            });
            downloadBtn.addEventListener("mouseleave", () => {
                downloadBtn.style.background = "linear-gradient(90deg, #10b981, #059669)";
                downloadBtn.style.transform = "scale(1)";
            });

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

            // Add typing animation CSS if not exists
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

        sendBtn.addEventListener("click", sendMessage);
        input.addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendMessage();
        });

        // Initialize chatbot with welcome message when opened
        chatbotToggle.addEventListener("click", () => {
            chatbotContainer.classList.add("active");
            chatbotToggle.style.display = "none";
            
            // Add welcome message only once
            if (chatBox.children.length === 0) {
                setTimeout(() => {
                    addMessage("Hi! I'm Faizan's AI assistant. Feel free to ask me anything about Faizan's skills, projects, or experience! 😊", "bot");
                }, 300);
            }
        });