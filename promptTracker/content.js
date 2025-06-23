class ChatNavigator {
    constructor() {
        this.chatEntries = [];
        this.currentSite = this.detectSite();
        this.obeserver = null;
        this.init();
    }

    getSelectors() {
        const selectors = {
            chatgpt: {
                userMessage: '[data-message-author-role="user"]',
                aiMessage: '[data-message-author-role="assistant"]',
                container: '[role="main"]'
            },
        };
        return selectors[this.currentSite] || selectors.chatgpt;
    }

    detectSite() {
        const hostname = window.location.hostname;
        if (hostname.includes('chatgpt.com')) return 'chatgpt';
        if (hostname.includes('claude.ai')) return 'claude';
        else return 'unknown';
    }

    init() {
        this.createNavigationPanel();
        this.startObserving();
        this.loadStoredEntries();
    }
    createNavigationPanel() {
        const panel = document.createElement('div');
        panel.id = 'chat-navigator-panel';
        panel.innerHTML = `
        <div class="nav-header">
            <h3>Chat Navigator</h3>
            <button id="nav-toggle" class="nav-btn">−</button>
        </div>
        <div class="nav-content">
            <div class="nav-controls">
                <button id="nav-refresh" class="nav-btn">Refresh</button>
                <button id="nav-clear" class="nav-btn">Clear</button>
            </div>
        <div id="nav-entries" class="nav-entries"></div>
        </div>
        `
        document.body.appendChild(panel);
        this.setupPanelEvents();
    }

    setupPanelEvents() {
        document.getElementById('nav-toggle').addEventListener('click', () => {
            const content = document.querySelector('.nav-content');
            const toggle = document.getElementById('nav-toggle');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                toggle.textContent = '-';
            } else {
                content.style.display = 'none';
                toggle.textContent = '+';
            }
        });

        document.getElementById('nav-refresh').addEventListener('click', () => {
            this.scanForEntries();
        })

        document.getElementById('nav-clear').addEventListener('click', () => {
            this.clearEntries();
        })
    }
    startObserving() {
        const selectors = this.getSelectors();
        const container = document.querySelector(selectors.container);

        if (!container) {
            //if no cotnainer found repeat the process after 1 second
            setTimeout(() => this.startObserving(), 1000);
            return;
        }
        //watch for changes made to the DOM tree
        this.obeserver = new MutationObserver((mutations) => {
            let shouldScan = false;
            mutations.forEach(mutation => {
                //if new nodes were added to the tree set scan to true
                if (mutation.addedNodes.length > 0) {
                    shouldScan = true;
                }
            });
            if (shouldScan) {
                setTimeout(() => this.scanForEntries(), 500);
            }
        });

        this.obeserver.observe(container, {
            childList: true,
            subtree: true
        });
        this.scanForEntries();
    }

    scanForEntries() {
        const selectors = this.getSelectors();
        const userMessages = document.querySelectorAll(selectors.userMessage);
        const aiMessages = document.querySelectorAll(selectors.aiMessage)

        this.chatEntries = [];

        userMessages.forEach((userMsg, idx) => {
            const userText = this.extractText(userMsg);
            const aiMsg = aiMessages[idx];
            const aiText = aiMsg ? this.extractText(aiMsg) : 'No response yet';

            if (userText.trim()) {
                this.chatEntries.push({
                    id: idx + 1,
                    userPrompt: userText,
                    aiResponse: aiText,
                    userElement: userMsg,
                    aiElement: aiMsg,
                    timestamp: Date.now()
                });
            }
        });
        this.updateNavigationPanel();
        this.saveEntries();
    }

    extractText(element) {
        if (!element) return '';

        const clone = element.cloneNode(true);
        const unwanted = clone.querySelectorAll('button, svg, .copy-button, .edit-button, [class*="icon"]');
        unwanted.forEach(el => el.remove());

        return clone.textContent.trim();
    }

    updateNavigationPanel() {
        const entriesContainer = document.getElementById('nav-entries');
        if (!entriesContainer) return;

        entriesContainer.innerHTML = '';

        this.chatEntries.forEach((entry, index) => {
            const entryDiv = document.createElement('div')
            entryDiv.className = 'nav-entry'
            entryDiv.innerHTML = `
        <div class="entry-header">
          <span class="entry-number">#${entry.id}</span>
          <span class="entry-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="entry-prompt" title="${entry.userPrompt}">
          ${entry.userPrompt.substring(0, 60)}${entry.userPrompt.length > 60 ? '...' : ''}
        </div>
        `
            entryDiv.addEventListener('click', () => {
                this.jumpToEntry(entry);
            });

            entriesContainer.appendChild(entryDiv);
        })
    }

    jumpToEntry(entry) {
        if (entry.userElement) {
            entry.userElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            })
            entry.userElement.style.backgroundColor = '#707b7c';
            if (entry.aiElement) {
                entry.aiElement.style.backgroundColor = '#707b7c';
            }
            setTimeout(() => {
                entry.userElement.style.backgroundColor = '';
                if (entry.aiElement) {
                    entry.aiElement.style.backgroundColor = '';
                }
            }, 1000)
        }

    }
    saveEntries() {
        const chatId = this.getCurrentChatId();
        const storageKey = `chat_navigator_${this.currentSite}_${chatId}`;

        chrome.storage.local.set({
            [storageKey]: {
                entries: this.chatEntries.map(entry => ({
                    id: entry.id,
                    userPrompt: entry.userPrompt,
                    aiResponse: entry.aiResponse,
                    timestamp: entry.timestamp
                })),
                lastUpdated: Date.now()
            }
        })

    }
    loadStoredEntries() {
        const chatId = this.getCurrentChatId();
        const storageKey = `chat_navigator_${this.currentSite}_${chatId}`;

        chrome.storage.local.get([storageKey], (result) => {
            if (result[storageKey]) {
                // We have stored entries, but we still need to scan for current DOM elements
                setTimeout(() => this.scanForEntries(), 1000);
            }
        });
    }
    getCurrentChatId() {
        const url = window.location.href;
        return btoa(url.split('/').slice(-2).join('/')).substring(0, 10);
    }

    clearEntries() {
        this.chatEntries = [];
        this.updateNavigationPanel();

        const chatId = this.getCurrentChatId();
        const storageKey = `chat_navigator_${this.currentSite}_${chatId}`;
        chrome.storage.local.remove(storageKey);
    }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ChatNavigator();
    });
} else {
    new ChatNavigator();
}