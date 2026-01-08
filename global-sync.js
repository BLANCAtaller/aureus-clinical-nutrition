document.addEventListener('DOMContentLoaded', () => {
    // Inject Auth Styles
    if (!document.getElementById('auth-styles-link')) {
        const link = document.createElement('link');
        link.id = 'auth-styles-link';
        link.rel = 'stylesheet';
        link.href = 'auth-styles.css';
        document.head.appendChild(link);
    }

    migrateLegacyData(); // Migrate old data to default user
    applyGlobalAppearance();
    initGlobalSync();
    initGlobalUserSwitcher();
    initLockScreen(); // New Auth Entry Point
});

/**
 * Global User Key Utility
 * Returns a namespaced key for localStorage based on the current active user.
 */
window.getActiveUser = () => {
    const saved = localStorage.getItem('aureus_active_user');
    if (saved) {
        try {
            const u = JSON.parse(saved);
            return u.name || 'BlindSnk';
        } catch (e) { }
    }
    return 'BlindSnk';
};

window.getUserKey = (baseKey) => {
    const user = window.getActiveUser();
    // Special case for the active user key itself
    if (baseKey === 'aureus_active_user') return baseKey;
    if (baseKey === 'aureus_custom_users') return baseKey;
    return `${user}_${baseKey}`;
};

window.logout = () => {
    console.log("Logging out...");
    localStorage.removeItem('aureus_active_user');
    window.location.reload();
};

/**
 * Migration Utility
 * Moves old data (un-namespaced) to the default user 'BlindSnk'
 */
function migrateLegacyData() {
    const defaultUser = 'BlindSnk';
    const keysToMigrate = [
        'aureus_user_settings',
        'aureus_hydration',
        'aureus_fasting_state',
        'aureus_weekly_plan',
        'aureus_plan_templates',
        'aureus_food_db',
        'aureus_db_version'
    ];

    // 1. Specific Keys
    keysToMigrate.forEach(key => {
        const oldVal = localStorage.getItem(key);
        const newKey = `${defaultUser}_${key}`;
        if (oldVal !== null && localStorage.getItem(newKey) === null) {
            console.log(`Migrating ${key} to ${newKey}`);
            localStorage.setItem(newKey, oldVal);
            // We keep the old one for now just in case, or we could remove it.
            // localStorage.removeItem(key); 
        }
    });

    // 2. Dynamic Log Keys (aureus_log_YYYY-MM-DD)
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Ensure we only migrate un-namespaced log keys
        if (key.startsWith('aureus_log_') && !key.includes('_aureus_log_')) {
            const oldVal = localStorage.getItem(key);
            const newKey = `${defaultUser}_${key}`;
            if (localStorage.getItem(newKey) === null) {
                console.log(`Migrating log ${key} to ${newKey}`);
                localStorage.setItem(newKey, oldVal);
            }
        }
    }
}

/**
 * Global Switch User Function
 * Must be defined globally before initGlobalUserSwitcher
 */
window.switchUser = (userName, userAvatar, isInitial = false) => {
    // Check if there's actually an active user in localStorage
    const savedUser = localStorage.getItem('aureus_active_user');
    const hasActiveUser = savedUser !== null;

    // Only return early if:
    // 1. There IS an active user session
    // 2. It's not the initial load
    // 3. User is clicking the same user they're already logged in as
    if (hasActiveUser && !isInitial && savedUser) {
        try {
            const currentUserObj = JSON.parse(savedUser);
            if (currentUserObj.name === userName) {
                return; // Same user, do nothing
            }
        } catch (e) {
            console.error("Error parsing saved user:", e);
        }
    }

    // Update UI elements if they exist
    const currentUserNameEl = document.getElementById('currentUserName');
    const currentAvatarEl = document.getElementById('currentAvatar');
    const greetingNameEl = document.querySelector('.greeting-container h1');
    const userOptions = document.querySelectorAll('.user-option');

    if (currentUserNameEl) currentUserNameEl.innerText = userName;
    if (currentAvatarEl) currentAvatarEl.src = userAvatar;
    if (greetingNameEl) {
        if (greetingNameEl.innerText.toLowerCase().includes('hello') || greetingNameEl.innerText.toLowerCase().includes('¡hola')) {
            greetingNameEl.innerHTML = `Hello, ${userName} <span class="dot">.</span>`;
        }
    }

    // Update Popover Active State
    userOptions.forEach(opt => {
        opt.classList.remove('current');
        const check = opt.querySelector('.fa-check');
        if (check) check.remove();

        if (opt.dataset.user === userName) {
            opt.classList.add('current');
            const checkIcon = document.createElement('i');
            checkIcon.className = "fa-solid fa-check";
            checkIcon.style.cssText = "margin-left: auto; color: var(--primary-lime);";
            opt.appendChild(checkIcon);
        }
    });

    // Save current user to localStorage
    if (!isInitial) {
        localStorage.setItem('aureus_active_user', JSON.stringify({ name: userName, avatar: userAvatar }));

        // Reload the page to ensure all data for the new user is loaded
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }
};

function initGlobalUserSwitcher() {
    const userProfileBtn = document.getElementById('userProfileBtn');
    const userSwitcherPopover = document.getElementById('userSwitcherPopover');
    const userOptions = document.querySelectorAll('.user-option');
    const currentUserNameEl = document.getElementById('currentUserName');
    const currentAvatarEl = document.getElementById('currentAvatar');
    const greetingNameEl = document.querySelector('.greeting-container h1');

    if (userProfileBtn && userSwitcherPopover) {
        // --- DYNAMIC USERS LOGIC ---
        const CUSTOM_USERS_KEY = 'aureus_custom_users';
        // const addUserBtn = userSwitcherPopover.querySelector('.add-user-option');
        const popoverDivider = userSwitcherPopover.querySelector('.popover-divider');

        function loadCustomUsers() {
            const stored = localStorage.getItem(CUSTOM_USERS_KEY);
            return stored ? JSON.parse(stored) : [];
        }

        function saveCustomUser(name, avatar) {
            const users = loadCustomUsers();
            if (!users.find(u => u.name === name)) {
                users.push({ name, avatar });
                localStorage.setItem(CUSTOM_USERS_KEY, JSON.stringify(users));
                return true;
            }
            return false;
        }

        function renderCustomUsers() {
            // Remove existing dynamic ones (if any) to avoid duplicates on multi-init
            userSwitcherPopover.querySelectorAll('.user-option.dynamic').forEach(el => el.remove());

            const customUsers = loadCustomUsers();
            const currentUser = getActiveUser();

            customUsers.forEach(u => {
                // Only render if it's the current user (as requested: "vamos a trabajar en una sesión")
                if (u.name !== currentUser) return;

                const opt = document.createElement('div');
                opt.className = 'user-option dynamic';
                opt.dataset.user = u.name;
                opt.dataset.avatar = u.avatar;
                opt.innerHTML = `
                    <img src="${u.avatar}" alt="${u.name}">
                    <span class="name">${u.name}</span>
                    <i class="fa-solid fa-trash-can btn-remove-user" style="margin-left: auto; opacity: 0.3; font-size: 11px; padding: 5px;"></i>
                `;

                // Switch User Listener
                opt.addEventListener('click', (e) => {
                    if (e.target.classList.contains('btn-remove-user')) return;
                    e.stopPropagation();
                    switchUser(u.name, u.avatar);
                    userSwitcherPopover.classList.remove('active');
                });

                // Remove User Listener
                const removeBtn = opt.querySelector('.btn-remove-user');
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`¿Estás seguro de que quieres eliminar la cuenta de ${u.name}?`)) {
                        removeUser(u.name);
                    }
                });

                if (popoverDivider) {
                    userSwitcherPopover.insertBefore(opt, popoverDivider);
                }
            });

            // Re-sync the 'current' checkmark
            const activeSessionUser = getActiveUser();
            userSwitcherPopover.querySelectorAll('.user-option').forEach(opt => {
                opt.classList.remove('current');
                const check = opt.querySelector('.fa-check');
                if (check) check.remove();

                if (opt.dataset.user === activeSessionUser) {
                    opt.classList.add('current');
                    const checkIcon = document.createElement('i');
                    checkIcon.className = "fa-solid fa-check";
                    checkIcon.style.cssText = "margin-left: auto; color: var(--primary-lime);";
                    opt.appendChild(checkIcon);
                }
            });
        }

        /* 
        if (addUserBtn) {
            addUserBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                userSwitcherPopover.classList.remove('active');
                // Trigger the Lock Screen's Create User flow by logging out
                if (confirm("Para agregar una cuenta nueva desde cero, cerraremos la sesión actual. ¿Continuar?")) {
                    logout();
                }
            });
        }
        */

        // Add Logout Option to Popover if it doesn't exist
        if (!userSwitcherPopover.querySelector('.logout-option')) {
            const logoutOpt = document.createElement('div');
            logoutOpt.className = 'add-user-option logout-option';
            logoutOpt.style.color = '#EF4444';
            logoutOpt.innerHTML = `
                <i class="fa-solid fa-right-from-bracket" style="background: rgba(239, 68, 68, 0.1); color: #EF4444;"></i>
                <span>Cerrar sesión</span>
            `;
            logoutOpt.addEventListener('click', (e) => {
                e.stopPropagation();
                logout();
            });
            userSwitcherPopover.appendChild(logoutOpt);
        }

        // Initial filter for hardcoded users (Only show the active one in the sidebar)
        const initialActive = getActiveUser();
        userSwitcherPopover.querySelectorAll('.user-option:not(.dynamic)').forEach(opt => {
            if (opt.dataset.user !== initialActive) {
                opt.style.display = 'none';
            } else {
                opt.style.display = 'flex';
                opt.classList.add('current');
                if (!opt.querySelector('.fa-check')) {
                    const checkIcon = document.createElement('i');
                    checkIcon.className = "fa-solid fa-check";
                    checkIcon.style.cssText = "margin-left: auto; color: var(--primary-lime);";
                    opt.appendChild(checkIcon);
                }
            }
        });

        renderCustomUsers();
        // --- END DYNAMIC USERS ---

        userProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            userSwitcherPopover.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            userSwitcherPopover.classList.remove('active');
        });

        // Static options (the ones hardcoded in HTML)
        const staticOptions = userSwitcherPopover.querySelectorAll('.user-option:not(.dynamic)');
        staticOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const userName = option.dataset.user;
                const userAvatar = option.dataset.avatar;
                switchUser(userName, userAvatar);
                userSwitcherPopover.classList.remove('active');
            });
        });

        // Load saved user (Don't reload here as it's the initial load)
        const savedUser = localStorage.getItem('aureus_active_user');
        if (savedUser) {
            try {
                const u = JSON.parse(savedUser);
                switchUser(u.name, u.avatar, true);
            } catch (e) { }
        }

        // Listen for changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'aureus_active_user') {
                window.location.reload();
            }
            if (e.key === CUSTOM_USERS_KEY) {
                renderCustomUsers();
            }
        });
    }
}

function applyGlobalAppearance() {
    const stored = localStorage.getItem(getUserKey('aureus_user_settings'));
    if (stored) {
        try {
            const settings = JSON.parse(stored);
            if (settings.appearance) {
                const app = settings.appearance;
                document.body.dataset.accent = app.accent || 'aureus';
                document.body.dataset.theme = app.theme || 'dark';
                document.body.dataset.glass = app.glass !== false;
                document.body.dataset.font = app.font || 'Outfit';

                if (app.radius !== undefined) {
                    document.body.style.setProperty('--app-radius', app.radius + 'px');
                }
            }
        } catch (e) {
            console.error("Error applying appearance", e);
        }
    } else {
        // Defaults
        document.body.dataset.accent = 'aureus';
        document.body.dataset.theme = 'dark';
        document.body.dataset.glass = 'true';
        document.body.dataset.font = 'Outfit';
        document.body.style.setProperty('--app-radius', '16px');
    }
}

function initGlobalSync() {
    const globalSaveBtn = document.getElementById('globalSaveBtn');

    // Always listen for storage changes
    window.addEventListener('storage', (e) => {
        if (e.key === getUserKey('aureus_user_settings')) {
            applyGlobalAppearance();
        }
    });

    if (!globalSaveBtn) return;

    globalSaveBtn.addEventListener('click', (e) => {
        const saveEvent = new CustomEvent('aureus-global-save', {
            detail: { timestamp: new Date() },
            bubbles: true,
            cancelable: true
        });

        const wasCancelled = !document.dispatchEvent(saveEvent);

        if (!wasCancelled) {
            handleStandardSaveFeedback(globalSaveBtn);
        }
    });
}

function handleStandardSaveFeedback(btn) {
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> SAVING...`;
    btn.disabled = true;
    btn.style.opacity = '0.8';

    // Simulate save delay
    setTimeout(() => {
        btn.innerHTML = `<i class="fa-solid fa-check"></i> SAVED`;
        btn.classList.add('saved-success');

        showToast("Progress saved to local storage.");

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.classList.remove('saved-success');
        }, 2000);
    }, 600);
}

function showToast(msg) {
    // Remove existing toast
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> <span>${msg}</span>`;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Animate out
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}
/**
 * LOCK SCREEN / AUTH ARCHITECTURE
 */
function initLockScreen() {
    const activeUser = localStorage.getItem('aureus_active_user');

    // If user is already active, do nothing
    if (activeUser) return;

    // Create Lock Screen Overlay
    const lockScreen = document.createElement('div');
    lockScreen.className = 'auth-lock-screen';
    lockScreen.id = 'aureusLockScreen';

    lockScreen.innerHTML = `
        <div class="auth-card">
            <img src="images/logo.png" alt="AUREUS" class="auth-logo">
            <h1 class="auth-title">AUREUS</h1>
            <p class="auth-subtitle">Clinical Nutrition & Fit OS</p>
            
            <div class="auth-accounts" id="authAccountGrid">
                <!-- User accounts will be injected here -->
            </div>

            <div class="auth-actions">
                <div id="g_id_onload"
                     data-client_id="YOUR_GOOGLE_CLIENT_ID"
                     data-callback="handleGoogleLogin"
                     data-auto_prompt="false">
                </div>
                
                <button class="btn-auth-google" id="btnGoogleLoginFallback">
                    <img src="https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png" alt="Google">
                    Acceder con Google
                </button>
                
                <button class="btn-auth-secondary" id="btnShowCreateUser">
                    <i class="fa-solid fa-user-plus"></i> Crear Nueva Cuenta
                </button>
            </div>
            
            <div id="createUserForm" class="hidden" style="margin-top: 20px;">
                <div class="auth-input-group">
                    <label class="auth-label">Nombre Completo</label>
                    <input type="text" id="newUserName" class="auth-input" placeholder="e.g. John Doe">
                </div>
                <div class="auth-input-group">
                    <label class="auth-label">Correo Electrónico</label>
                    <input type="email" id="newUserEmail" class="auth-input" placeholder="correo@ejemplo.com">
                </div>
                <div class="auth-input-group">
                    <label class="auth-label">Contraseña</label>
                    <input type="password" id="newUserPassword" class="auth-input" placeholder="••••••••">
                </div>
                <button class="btn-auth-primary" id="btnFinalCreateUser">Empezar ahora</button>
                <button class="btn-auth-secondary" id="btnCancelCreateUser" style="background:transparent; border:none; opacity:0.6;">Cancelar</button>
            </div>
        </div>
    `;

    document.body.appendChild(lockScreen);

    // Hide app container to prevent interaction
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.style.display = 'none';

    renderLockAccounts();

    // Event Listeners
    document.getElementById('btnShowCreateUser').addEventListener('click', () => {
        document.querySelector('.auth-accounts').classList.add('hidden');
        document.querySelector('.auth-actions').classList.add('hidden');
        document.getElementById('createUserForm').classList.remove('hidden');
    });

    document.getElementById('btnCancelCreateUser').addEventListener('click', () => {
        document.querySelector('.auth-accounts').classList.remove('hidden');
        document.querySelector('.auth-actions').classList.remove('hidden');
        document.getElementById('createUserForm').classList.add('hidden');
    });

    document.getElementById('btnFinalCreateUser').addEventListener('click', async () => {
        const btn = document.getElementById('btnFinalCreateUser');
        const nameInput = document.getElementById('newUserName');
        const emailInput = document.getElementById('newUserEmail');
        const passInput = document.getElementById('newUserPassword');

        const name = nameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passInput.value.trim();

        if (!name || !email || !password) {
            alert("Por favor completa todos los campos.");
            return;
        }

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="auth-loading-dot"></span> Creando cuenta...';

            const data = await window.aureusSupabase.signUp(email, password, name);

            if (data.user) {
                const avatar = 'images/item_profile.png';
                saveCustomUser(name, avatar);
                switchUser(name, avatar);
            }
        } catch (error) {
            console.error(error);
            alert("Error al crear cuenta: " + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Empezar ahora';
        }
    });

    document.getElementById('btnGoogleLoginFallback').addEventListener('click', (e) => {
        e.preventDefault();
        alert("Integración de Google Login en progreso. Debido a seguridad del navegador (file://), esta función requiere un servidor local para activarse completamente.");
    });
}

function renderLockAccounts() {
    const grid = document.getElementById('authAccountGrid');
    if (!grid) return;

    grid.innerHTML = '';

    // Core built-in users
    const coreUsers = [
        { name: 'BlindSnk', avatar: 'images/item_profile.png' },
        { name: 'Gio Bardales', avatar: 'images/gio_profile.png' }
    ];

    const customUsers = loadCustomUsers();
    const allUsers = [...coreUsers, ...customUsers];

    allUsers.forEach(u => {
        const item = document.createElement('div');
        item.className = 'auth-account-item';
        item.innerHTML = `
            <div class="auth-avatar-wrapper">
                <img src="${u.avatar}" alt="${u.name}">
            </div>
            <div class="auth-account-name">${u.name}</div>
        `;
        item.addEventListener('click', () => {
            if (window.switchUser) {
                window.switchUser(u.name, u.avatar);
            } else {
                console.error("switchUser function not found!");
            }
        });
        grid.appendChild(item);
    });
}

// Global hook for Google Login
window.handleGoogleLogin = (response) => {
    // Decodificar JWT si es necesario
    console.log("Google Login Response:", response);
    // Simulación:
    const name = "Google User";
    const avatar = "images/item_profile.png";
    saveCustomUser(name, avatar);
    switchUser(name, avatar);
};

// Utility to save custom user (re-using from switcher but making it global)
function loadCustomUsers() {
    const stored = localStorage.getItem('aureus_custom_users');
    return stored ? JSON.parse(stored) : [];
}

function saveCustomUser(name, avatar) {
    const users = loadCustomUsers();
    if (!users.find(u => u.name === name)) {
        users.push({ name, avatar });
        localStorage.setItem('aureus_custom_users', JSON.stringify(users));
        return true;
    }
    return false;
}

function removeUser(name) {
    let users = loadCustomUsers();
    users = users.filter(u => u.name !== name);
    localStorage.setItem('aureus_custom_users', JSON.stringify(users));

    // If the removed user was the active one, logout
    const active = getActiveUser();
    if (active === name) {
        logout();
    } else {
        window.location.reload();
    }
}

// MOBILE NAVIGATION LOGIC (Global)
document.addEventListener('DOMContentLoaded', () => {
    initMobileNav();
});

function initMobileNav() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNavDrawer = document.getElementById('mobileNavDrawer');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');

    if (!mobileMenuBtn || !mobileNavDrawer || !mobileNavOverlay || !drawerCloseBtn) return;

    function openDrawer() {
        mobileNavDrawer.classList.add('open');
        mobileNavOverlay.classList.add('open');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }

    function closeDrawer() {
        mobileNavDrawer.classList.remove('open');
        mobileNavOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    mobileMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openDrawer();
    });

    drawerCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeDrawer();
    });

    mobileNavOverlay.addEventListener('click', () => {
        closeDrawer();
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileNavDrawer.classList.contains('open')) {
            closeDrawer();
        }
    });
}
