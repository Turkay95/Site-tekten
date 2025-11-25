'use strict';

/**
 * @typedef {Object} Product
 * @property {number} id
 * @property {string} name
 * @property {string} category
 * @property {number} price
 * @property {string} image
 */

/**
 * @typedef {Object} CartItem
 * @property {number} id
 * @property {string} name
 * @property {number} price
 * @property {number} qty
 */

/* =========================================
   1. GLOBAL STATE & UTILS
   ========================================= */
const AppState = {
    /** @type {CartItem[]} */
    cart: JSON.parse(localStorage.getItem('tektenCart')) || [],
    isChatbotOpen: false,
    /** @type {Product[]} */
    products: [],
    config: {
        cpu: null, motherboard: null, ram: null, gpu: null, ssd: null, case: null, psu: null
    }
};

const Utils = {
    formatPrice: (price) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price),

    saveCart: () => {
        try {
            localStorage.setItem('tektenCart', JSON.stringify(AppState.cart));
        } catch (e) {
            console.error('Error saving cart:', e);
        }
    },

    escapeHtml: (text) => {
        if (!text) return '';
        return text.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    },

    /**
     * @param {string} selector 
     * @returns {HTMLElement|null}
     */
    $: (selector) => document.querySelector(selector),

    /**
     * @param {string} selector 
     * @returns {NodeListOf<HTMLElement>}
     */
    $$: (selector) => document.querySelectorAll(selector)
};

/* =========================================
   2. CHATBOT MODULE
   ========================================= */
const Chatbot = {
    elements: {},

    init() {
        this.injectHTML();
        this.cacheElements();
        this.restoreMessages();
        this.bindEvents();
    },

    cacheElements() {
        this.elements = {
            container: Utils.$('#chatbot-container'),
            window: Utils.$('#chatbot-window'),
            messages: Utils.$('#chatbot-messages'),
            input: Utils.$('#chatbot-input'),
            toggleBtn: Utils.$('#chatbot-toggle')
        };
    },

    injectHTML() {
        const container = Utils.$('#chatbot-container');
        if (!container) return;

        container.innerHTML = `
            <div id="chatbot-window" class="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-48px)] h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 transform translate-y-10 opacity-0 pointer-events-none z-50">
                <div class="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-t-2xl flex justify-between items-center shadow-md">
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <div class="w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-white absolute -right-1 -bottom-1"></div>
                            <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <i data-lucide="bot" class="w-5 h-5"></i>
                            </div>
                        </div>
                        <div>
                            <h3 class="font-bold text-sm">Assistant Tekten</h3>
                            <p class="text-[10px] text-indigo-100 opacity-90">En ligne • Réponse immédiate</p>
                        </div>
                    </div>
                    <button id="chatbot-close" class="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                
                <div id="chatbot-messages" class="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"></div>

                <div class="p-4 bg-white border-t border-slate-100 rounded-b-2xl">
                    <div class="flex gap-2 items-center bg-slate-50 p-1.5 rounded-full border border-slate-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                        <input type="text" id="chatbot-input" placeholder="Posez votre question..." class="flex-1 px-4 py-2 bg-transparent text-sm focus:outline-none text-slate-700 placeholder:text-slate-400">
                        <button id="chatbot-send" class="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md transform hover:scale-105">
                            <i data-lucide="send" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>

            <button id="chatbot-toggle" class="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-indigo-500/30 transition-all transform hover:scale-110 flex items-center justify-center z-50 group">
                <i data-lucide="message-circle" class="w-7 h-7 group-hover:rotate-12 transition-transform"></i>
                <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
        `;

        if (window.lucide) lucide.createIcons();
    },

    bindEvents() {
        // Global accessors for inline HTML calls (if any remain)
        window.toggleChatbot = () => this.toggle();

        // Event Listeners
        Utils.$('#chatbot-toggle')?.addEventListener('click', () => this.toggle());
        Utils.$('#chatbot-close')?.addEventListener('click', () => this.toggle());
        Utils.$('#chatbot-send')?.addEventListener('click', () => this.sendMessage());
        Utils.$('#chatbot-input')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
    },

    toggle() {
        this.cacheElements(); // Re-cache if needed
        const { window: win, input } = this.elements;
        if (!win) return;

        AppState.isChatbotOpen = !AppState.isChatbotOpen;

        if (AppState.isChatbotOpen) {
            win.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
            win.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');
            setTimeout(() => input?.focus(), 100);
        } else {
            win.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
            win.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
        }
    },

    addMessage(text, sender) {
        const { messages } = this.elements;
        if (!messages) return;

        const isUser = sender === 'user';
        const html = `
            <div class="flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up">
                <div class="${isUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'} px-4 py-3 rounded-2xl shadow-sm max-w-[85%] text-sm leading-relaxed">
                    ${Utils.escapeHtml(text)}
                </div>
            </div>
        `;

        messages.insertAdjacentHTML('beforeend', html);
        messages.scrollTop = messages.scrollHeight;
        try {
            sessionStorage.setItem('tektenChatMessages', messages.innerHTML);
        } catch (e) { console.warn('Session storage full'); }
    },

    restoreMessages() {
        const { messages } = this.elements;
        if (!messages) return;

        const saved = sessionStorage.getItem('tektenChatMessages');
        if (saved) {
            messages.innerHTML = saved;
        } else {
            this.addMessage("👋 Bonjour ! Je suis l'IA de Tekten. Je peux vous aider à choisir votre PC ou répondre à vos questions.", 'bot');
        }
    },

    sendMessage() {
        const { input } = this.elements;
        const text = input?.value.trim();
        if (!text) return;

        this.addMessage(text, 'user');
        input.value = '';

        // Simulate AI response
        setTimeout(() => {
            const response = this.generateResponse(text);
            this.addMessage(response, 'bot');
        }, 600);
    },

    generateResponse(msg) {
        const m = msg.toLowerCase();
        if (m.includes('bonjour') || m.includes('salut')) return "Bonjour ! Comment puis-je vous aider aujourd'hui ?";
        if (m.includes('pc') || m.includes('ordi')) return "Nous avons une large gamme de PC. Cherchez-vous un portable ou une tour ?";
        if (m.includes('prix') || m.includes('coût')) return "Nos prix sont très compétitifs. Vous pouvez voir tous nos produits dans la boutique.";
        if (m.includes('contact') || m.includes('adresse')) return "Nous sommes situés au 27 Rue du Général Leclerc à Saint-Ouen-l'Aumône.";
        return "Je ne suis pas sûr de comprendre. Pouvez-vous reformuler ou contacter notre support au 01 30 37 30 31 ?";
    }
};

/* =========================================
   3. CART MODULE
   ========================================= */
const Cart = {
    init() {
        this.updateDisplay();
        this.bindEvents();

        // Expose global for inline onclicks (legacy support)
        window.toggleCart = (show) => this.toggle(show);
        window.addToCart = (id, name, price) => this.add(id, name, price);
        window.removeFromCart = (id) => this.remove(id);
    },

    bindEvents() {
        Utils.$('#cart-overlay')?.addEventListener('click', () => this.toggle(false));
        Utils.$('#cart-close')?.addEventListener('click', () => this.toggle(false));
    },

    toggle(show) {
        const sidebar = Utils.$('#cart-sidebar');
        const overlay = Utils.$('#cart-overlay');

        if (show) {
            sidebar?.classList.remove('translate-x-full');
            overlay?.classList.remove('hidden', 'opacity-0');
            document.body.classList.add('overflow-hidden');
        } else {
            sidebar?.classList.add('translate-x-full');
            overlay?.classList.add('opacity-0');
            setTimeout(() => overlay?.classList.add('hidden'), 300);
            document.body.classList.remove('overflow-hidden');
        }
    },

    add(id, name, price) {
        const existing = AppState.cart.find(item => item.id === id);
        if (existing) {
            existing.qty++;
        } else {
            AppState.cart.push({ id, name, price, qty: 1 });
        }
        Utils.saveCart();
        this.updateDisplay();
        this.toggle(true);
    },

    remove(id) {
        AppState.cart = AppState.cart.filter(item => item.id != id);
        Utils.saveCart();
        this.updateDisplay();
    },

    updateDisplay() {
        const countEl = Utils.$('#cart-count');
        const itemsEl = Utils.$('#cart-items');
        const totalEl = Utils.$('#cart-total');

        // Update badge
        const totalQty = AppState.cart.reduce((sum, item) => sum + item.qty, 0);
        if (countEl) {
            countEl.innerText = totalQty;
            if (totalQty > 0) countEl.classList.remove('scale-0');
            else countEl.classList.add('scale-0');
        }

        // Update list
        if (itemsEl) {
            if (AppState.cart.length === 0) {
                itemsEl.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-64 text-slate-400">
                        <i data-lucide="shopping-cart" class="w-12 h-12 mb-4 opacity-20"></i>
                        <p>Votre panier est vide</p>
                    </div>
                `;
            } else {
                itemsEl.innerHTML = AppState.cart.map(item => `
                    <div class="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-white/5 animate-fade-in-up">
                        <div>
                            <h4 class="font-bold text-white text-sm">${Utils.escapeHtml(item.name)}</h4>
                            <p class="text-xs text-slate-400 mt-1">${item.qty} x ${Utils.formatPrice(item.price)}</p>
                        </div>
                        <button onclick="window.removeFromCart('${item.id}')" class="text-red-400 hover:text-red-300 p-2 hover:bg-red-400/10 rounded-lg transition-colors">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                `).join('');
            }
            if (window.lucide) lucide.createIcons();
        }

        // Update total
        if (totalEl) {
            const total = AppState.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            totalEl.innerText = Utils.formatPrice(total);
        }
    }
};

/* =========================================
   4. SHOP MODULE
   ========================================= */
const Shop = {
    async init() {
        if (!Utils.$('#shop-grid')) return;
        await this.loadProducts();
        this.render('all');
        this.bindEvents();
    },

    async loadProducts() {
        try {
            // Simulate API latency
            // await new Promise(r => setTimeout(r, 500));

            AppState.products = [
                { id: 101, name: "PC Gamer Starter", category: "desktop", price: 999, image: "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=500" },
                { id: 102, name: "MacBook Air M2", category: "laptop", price: 1199, image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500" },
                { id: 103, name: "iPhone 15", category: "mobile", price: 969, image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500" },
                { id: 104, name: "Samsung S24 Ultra", category: "mobile", price: 1159, image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=500" },
                { id: 105, name: "Asus ROG Zephyrus", category: "laptop", price: 2499, image: "https://images.unsplash.com/photo-1531297461136-82lw9z2l19?w=500" },
                { id: 106, name: "Clavier Mécanique", category: "accessoire", price: 129, image: "https://images.unsplash.com/photo-1595225476474-87563907a212?w=500" }
            ];
        } catch (error) {
            console.error('Failed to load products', error);
            const grid = Utils.$('#shop-grid');
            if (grid) grid.innerHTML = '<p class="text-red-400 text-center col-span-full">Erreur lors du chargement des produits.</p>';
        }
    },

    render(category) {
        const grid = Utils.$('#shop-grid');
        if (!grid) return;

        const items = category === 'all' ? AppState.products : AppState.products.filter(p => p.category === category);

        grid.innerHTML = items.map(p => `
            <div class="bg-slate-800 rounded-2xl overflow-hidden border border-white/5 group hover:border-indigo-500/50 transition-all duration-300 animate-fade-in-up">
                <div class="h-48 overflow-hidden relative">
                    <img src="${p.image}" class="w-full h-full object-cover transform group-hover:scale-110 transition duration-700" alt="${Utils.escapeHtml(p.name)}">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                </div>
                <div class="p-5">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-bold text-lg text-white">${Utils.escapeHtml(p.name)}</h3>
                        <span class="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-2 py-1 rounded-full uppercase">${p.category}</span>
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <span class="text-xl font-bold text-white">${Utils.formatPrice(p.price)}</span>
                        <button onclick="window.addToCart(${p.id}, '${Utils.escapeHtml(p.name)}', ${p.price})" class="bg-white text-slate-900 p-2 rounded-lg hover:bg-indigo-500 hover:text-white transition-colors">
                            <i data-lucide="plus" class="w-5 h-5"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        if (window.lucide) lucide.createIcons();
    },

    bindEvents() {
        Utils.$$('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                Utils.$$('.filter-btn').forEach(b => {
                    b.classList.remove('bg-indigo-600', 'text-white');
                    b.classList.add('bg-slate-800', 'text-slate-300');
                });
                e.currentTarget.classList.remove('bg-slate-800', 'text-slate-300');
                e.currentTarget.classList.add('bg-indigo-600', 'text-white');

                // Filter
                this.render(e.currentTarget.dataset.category);
            });
        });
    }
};

/* =========================================
   5. BUILDER MODULE
   ========================================= */
const Builder = {
    parts: {
        cpu: [
            { id: 'c1', name: "Intel Core i5-13600K", price: 340, image: "https://via.placeholder.com/50?text=i5" },
            { id: 'c2', name: "Intel Core i7-14700K", price: 460, image: "https://via.placeholder.com/50?text=i7" },
            { id: 'c3', name: "Intel Core i9-14900K", price: 650, image: "https://via.placeholder.com/50?text=i9" },
            { id: 'c4', name: "AMD Ryzen 7 7800X3D", price: 430, image: "https://via.placeholder.com/50?text=R7" }
        ],
        motherboard: [
            { id: 'm1', name: "MSI B760 Gaming Plus", price: 180, image: "https://via.placeholder.com/50?text=MB" },
            { id: 'm2', name: "Asus ROG Strix Z790", price: 450, image: "https://via.placeholder.com/50?text=ROG" }
        ],
        ram: [
            { id: 'r1', name: "Corsair Vengeance 32Go DDR5", price: 130, image: "https://via.placeholder.com/50?text=RAM" },
            { id: 'r2', name: "Kingston Fury 16Go DDR5", price: 80, image: "https://via.placeholder.com/50?text=RAM" }
        ],
        gpu: [
            { id: 'g1', name: "NVIDIA RTX 4060", price: 330, image: "https://via.placeholder.com/50?text=4060" },
            { id: 'g2', name: "NVIDIA RTX 4070 Super", price: 680, image: "https://via.placeholder.com/50?text=4070" },
            { id: 'g3', name: "NVIDIA RTX 4090", price: 2100, image: "https://via.placeholder.com/50?text=4090" }
        ],
        ssd: [
            { id: 's1', name: "Samsung 980 Pro 1To", price: 100, image: "https://via.placeholder.com/50?text=SSD" },
            { id: 's2', name: "Crucial P3 2To", price: 140, image: "https://via.placeholder.com/50?text=SSD" }
        ],
        case: [
            { id: 'ca1', name: "Corsair 4000D Airflow", price: 105, image: "https://via.placeholder.com/50?text=Case" },
            { id: 'ca2', name: "NZXT H9 Flow", price: 190, image: "https://via.placeholder.com/50?text=Case" }
        ],
        psu: [
            { id: 'p1', name: "Corsair RM850e (850W)", price: 130, image: "https://via.placeholder.com/50?text=PSU" },
            { id: 'p2', name: "MSI A1000G (1000W)", price: 180, image: "https://via.placeholder.com/50?text=PSU" }
        ]
    },

    init() {
        if (!Utils.$('#builder-container')) return;

        this.render();
        this.updateSummary();

        // Expose for inline onclicks
        window.toggleBuilderSection = (key) => this.toggleSection(key);
        window.selectPart = (type, id) => this.selectPart(type, id);
    },

    render() {
        const container = Utils.$('#builder-container');
        const labels = { cpu: "1. Processeur", motherboard: "2. Carte Mère", ram: "3. Mémoire RAM", gpu: "4. Carte Graphique", ssd: "5. Stockage", case: "6. Boîtier", psu: "7. Alimentation" };

        container.innerHTML = Object.keys(this.parts).map(key => `
            <div class="mb-4 bg-slate-800 rounded-xl border border-white/5 overflow-hidden">
                <button id="header-${key}" onclick="window.toggleBuilderSection('${key}')" class="w-full text-left p-4 font-bold flex justify-between items-center hover:bg-white/5 transition-colors">
                    <span class="text-white">${labels[key]}</span>
                    <i data-lucide="chevron-down" class="w-5 h-5 text-slate-400 transform transition-transform duration-300"></i>
                </button>
                <div id="content-${key}" class="hidden p-4 bg-slate-900/50 border-t border-white/5">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        ${this.parts[key].map(p => `
                            <div id="card-${p.id}" onclick="window.selectPart('${key}', '${p.id}')" class="part-card cursor-pointer bg-slate-800 p-3 rounded-lg border border-white/5 flex justify-between items-center hover:border-indigo-500/50 transition-all">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                                        <i data-lucide="cpu" class="w-5 h-5 text-slate-400"></i>
                                    </div>
                                    <span class="font-bold text-sm text-slate-200">${p.name}</span>
                                </div>
                                <span class="text-indigo-400 font-bold">${p.price}€</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');

        // Open first section
        this.toggleSection('cpu');
        if (window.lucide) lucide.createIcons();
    },

    toggleSection(key) {
        // Close all
        Utils.$$('[id^="content-"]').forEach(el => el.classList.add('hidden'));
        Utils.$$('[id^="header-"] i').forEach(el => el.style.transform = 'rotate(0deg)');

        // Open target
        const content = Utils.$(`#content-${key}`);
        const icon = Utils.$(`#header-${key} i`);

        if (content) {
            content.classList.remove('hidden');
            if (icon) icon.style.transform = 'rotate(180deg)';
        }
    },

    selectPart(type, id) {
        const part = this.parts[type].find(p => p.id === id);
        AppState.config[type] = part;

        // Visual feedback
        const container = Utils.$(`#content-${type}`);
        container.querySelectorAll('.part-card').forEach(el => {
            el.classList.remove('border-indigo-500', 'bg-indigo-500/10');
            el.classList.add('border-white/5', 'bg-slate-800');
        });

        const card = Utils.$(`#card-${id}`);
        if (card) {
            card.classList.remove('border-white/5', 'bg-slate-800');
            card.classList.add('border-indigo-500', 'bg-indigo-500/10');
        }

        this.updateSummary();

        // Auto advance
        const types = Object.keys(this.parts);
        const idx = types.indexOf(type);
        if (idx < types.length - 1) {
            setTimeout(() => this.toggleSection(types[idx + 1]), 300);
        }
    },

    updateSummary() {
        const list = Utils.$('#config-list');
        const totalEl = Utils.$('#config-total');
        const btn = Utils.$('#btn-config');

        if (!list) return;

        let total = 0;
        let count = 0;
        list.innerHTML = '';

        const labels = { cpu: "Processeur", motherboard: "Carte Mère", ram: "RAM", gpu: "Carte Graphique", ssd: "SSD", case: "Boîtier", psu: "Alim" };

        Object.keys(this.parts).forEach(key => {
            const item = AppState.config[key];
            if (item) {
                total += item.price;
                count++;
                list.innerHTML += `
                    <div class="flex justify-between text-sm py-2 border-b border-white/5">
                        <span class="text-white">${item.name}</span>
                        <span class="font-bold text-indigo-400">${item.price}€</span>
                    </div>`;
            } else {
                list.innerHTML += `
                    <div class="flex justify-between text-sm py-2 border-b border-white/5 text-slate-500">
                        <span>${labels[key]}</span>
                        <span>--</span>
                    </div>`;
            }
        });

        if (totalEl) totalEl.innerText = Utils.formatPrice(total);

        if (btn) {
            if (count === 7) {
                btn.disabled = false;
                btn.innerHTML = `Ajouter au panier <i data-lucide="shopping-cart" class="w-4 h-4 ml-2"></i>`;
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
                btn.onclick = () => window.addToCart('custom-' + Date.now(), 'PC Configuré Sur Mesure', total);
            } else {
                btn.disabled = true;
                btn.innerText = `Configuration incomplète (${count}/7)`;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    }
};

/* =========================================
   6. HOME MODULE
   ========================================= */
const Home = {
    async init() {
        if (!Utils.$('#featured-products')) return;
        await this.loadFeatured();
    },

    async loadFeatured() {
        try {
            const response = await fetch('/api/featured');
            if (!response.ok) throw new Error('Network response was not ok');
            const products = await response.json();
            this.render(products);
        } catch (error) {
            console.error('Failed to load featured products', error);
            const container = Utils.$('#featured-products');
            if (container) container.innerHTML = '<p class="text-red-400 text-center col-span-full">Impossible de charger les derniers arrivages.</p>';
        }
    },

    render(products) {
        const container = Utils.$('#featured-products');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<p class="text-slate-400 text-center col-span-full">Aucun produit mis en avant pour le moment.</p>';
            return;
        }

        container.innerHTML = products.map(p => `
            <div class="group relative bg-slate-800 rounded-3xl overflow-hidden border border-white/5 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10">
                <div class="absolute top-4 left-4 z-20">
                    <span class="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">Nouveau</span>
                </div>
                <div class="h-64 overflow-hidden bg-slate-700/50 relative">
                    <img src="${p.image || 'https://via.placeholder.com/500x300?text=No+Image'}" 
                         class="w-full h-full object-cover transform group-hover:scale-110 transition duration-700" 
                         alt="${Utils.escapeHtml(p.name)}">
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60"></div>
                    ${p.stock > 0 ? `
                    <button onclick="window.addToCart(${p.id}, '${Utils.escapeHtml(p.name)}', ${p.price})" 
                            class="absolute bottom-4 right-4 bg-white text-slate-900 p-3 rounded-full shadow-lg transform translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-indigo-500 hover:text-white" 
                            aria-label="Ajouter au panier">
                        <i data-lucide="plus" class="w-5 h-5"></i>
                    </button>` : ''}
                </div>
                <div class="p-6">
                    <h3 class="font-bold text-xl mb-2 group-hover:text-indigo-400 transition-colors">${Utils.escapeHtml(p.name)}</h3>
                    <p class="text-slate-400 text-sm mb-4 line-clamp-2">${Utils.escapeHtml(p.description || '')}</p>
                    <div class="flex justify-between items-center">
                        <span class="text-2xl font-bold text-white">${Utils.formatPrice(p.price)}</span>
                        <div class="flex gap-1">
                            <i data-lucide="star" class="w-4 h-4 text-yellow-500 fill-yellow-500"></i>
                            <i data-lucide="star" class="w-4 h-4 text-yellow-500 fill-yellow-500"></i>
                            <i data-lucide="star" class="w-4 h-4 text-yellow-500 fill-yellow-500"></i>
                            <i data-lucide="star" class="w-4 h-4 text-yellow-500 fill-yellow-500"></i>
                            <i data-lucide="star" class="w-4 h-4 text-yellow-500 fill-yellow-500"></i>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        if (window.lucide) lucide.createIcons();
    }
};

/* =========================================
   7. INITIALIZATION
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    try {
        Chatbot.init();
        Cart.init();
        Shop.init();
        Builder.init();
        Home.init();

        // Initialize Lucide icons
        if (window.lucide) lucide.createIcons();

        // Navbar scroll effect
        const navbar = Utils.$('#navbar');
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar?.classList.add('shadow-lg', 'bg-slate-900/90');
            } else {
                navbar?.classList.remove('shadow-lg', 'bg-slate-900/90');
            }
        });
    } catch (e) {
        console.error('Initialization error:', e);
    }
});