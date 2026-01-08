document.addEventListener('DOMContentLoaded', () => {
    // --- Data Management (History Aware) ---
    const DB_VERSION = "3.0";
    let savedVersion = localStorage.getItem(getUserKey('aureus_db_version'));
    if (savedVersion !== DB_VERSION) {
        if (typeof foodDatabase !== 'undefined') {
            localStorage.setItem(getUserKey('aureus_food_db'), JSON.stringify(foodDatabase));
            localStorage.setItem(getUserKey('aureus_db_version'), DB_VERSION);
            console.log("Database updated to version", DB_VERSION);
        }
    }

    // Sync Listeners
    window.addEventListener('storage', (e) => {
        if (e.key === 'aureus_targets_updated' || e.key === getUserKey('aureus_user_settings')) {
            // Reload current date to fetch new targets
            loadLogForDate(currentDate);
        }
    });
    window.addEventListener('settings-saved', () => {
        loadLogForDate(currentDate);
    });

    const STORAGE_KEY_PREFIX = 'aureus_log_'; // Store as aureus_log_YYYY-MM-DD
    let currentDate = new Date(); // Start at today

    let logData = null; // Current loaded data

    const DEFAULT_TARGETS = {
        calories: 2000,
        fat: 150,
        prot: 95,
        carb: 45
    };

    const DEFAULT_MEALS = {
        breakfast: { time: "08:30 AM", items: [] },
        lunch: { time: "12:45 PM", items: [] },
        dinner: { time: "07:00 PM", items: [] },
        snacks: { time: "--:--", items: [] }
    };

    // DOM Elements - Date Nav
    const btnPrevDate = document.getElementById('btnPrevDate');
    const btnNextDate = document.getElementById('btnNextDate');
    const dateSelectorLabel = document.getElementById('dateSelectorLabel');
    const displayDateEl = document.getElementById('currentDateDisplay'); // The one in the card header

    // --- Navigation Listeners ---
    if (btnPrevDate && btnNextDate) {
        btnPrevDate.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() - 1);
            loadLogForDate(currentDate);
        });

        btnNextDate.addEventListener('click', () => {
            currentDate.setDate(currentDate.getDate() + 1);
            loadLogForDate(currentDate);
        });
    }

    // --- Quick Add Modal Logic ---
    let currentTargetMeal = null;
    const modal = document.getElementById('quickAddModal');
    const modalTitle = document.getElementById('modalTitle');
    const closeBtn = document.getElementById('closeModalBtn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const favoritesList = document.getElementById('favoritesList');
    const addManualBtn = document.getElementById('addManualBtn');

    // Tab switching functionality
    // Tab switching functionality
    function switchTab(tabName) {
        console.log('switchTab called with:', tabName);

        // Re-query elements to ensure we have the latest DOM state
        const refreshTabBtns = document.querySelectorAll('.tab-btn');
        const refreshTabContents = document.querySelectorAll('.tab-content');

        // Remove active from all tabs
        refreshTabBtns.forEach(btn => btn.classList.remove('active'));
        refreshTabContents.forEach(content => content.classList.remove('active'));

        // Activate selected tab button
        const selectedBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (selectedBtn) selectedBtn.classList.add('active');

        // Handle special case for aiscan -> ID "tabAIScan"
        let contentId;
        if (tabName === 'aiscan') {
            contentId = 'tabAIScan';
        } else {
            contentId = `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`;
        }

        const selectedContent = document.getElementById(contentId);

        if (selectedContent) {
            selectedContent.classList.add('active');
            console.log(`Activated content: ${contentId}`);
        } else {
            console.error('Content not found for ID:', contentId);
        }

        // Add class to modal-body when AI Scan is active (for CSS hooks)
        const modalBody = document.querySelector('#quickAddModal .modal-body');
        if (modalBody) {
            if (tabName === 'aiscan') {
                modalBody.classList.add('ai-scan-active');
            } else {
                modalBody.classList.remove('ai-scan-active');
            }
        }

        // Explicitly handle Search Bar Visibility (for legacy code compatibility)
        const searchContainer = document.querySelector('#quickAddModal .favorites-search-container');
        if (searchContainer) {
            searchContainer.style.display = (tabName === 'favorites') ? 'block' : 'none';
        }
    }

    // Add event listeners to tab buttons
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // Handle Favorites Search
    const favSearchInput = document.querySelector('.favorites-search-input');
    if (favSearchInput) {
        favSearchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.fav-item-row'); // Updated selector
            items.forEach(item => {
                const text = item.innerText.toLowerCase();
                item.style.display = text.includes(term) ? 'flex' : 'none';
            });
        });
    }

    // Close modal on close button click
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    // Close modal on outside click
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    if (addManualBtn) addManualBtn.addEventListener('click', addManualItem);

    // --- Functions ---

    function getStorageKey(date) {
        // Format: YYYY-MM-DD
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return getUserKey(`${STORAGE_KEY_PREFIX}${y}-${m}-${d}`);
    }

    function loadLogForDate(date) {
        const key = getStorageKey(date);
        const stored = localStorage.getItem(key);

        console.log(`Loading log for ${key}...`);

        if (stored) {
            try {
                logData = JSON.parse(stored);
                // FEATURE: Always update targets from Global Settings to ensure sync
                // as per user request: "SI ESTE CAMBIA TODOS LOS LIMITES CAMBIAN"
                const globalSettingsStored = localStorage.getItem(getUserKey('aureus_user_settings'));
                if (globalSettingsStored) {
                    const settings = JSON.parse(globalSettingsStored);
                    if (settings.targets) {
                        logData.targets = { ...settings.targets };
                    }
                }
            } catch (e) {
                console.error("Error parsing stored log data", e);
                logData = null; // Trigger default init
            }
        } else {
            logData = null;
        }

        if (!logData) {
            // Create new entry for this date
            // Start with global settings if available
            let initialTargets = { ...DEFAULT_TARGETS };
            const globalSettingsStored = localStorage.getItem(getUserKey('aureus_user_settings'));
            if (globalSettingsStored) {
                try {
                    const settings = JSON.parse(globalSettingsStored);
                    if (settings.targets) {
                        initialTargets = { ...settings.targets };
                    }
                } catch (e) { console.error("Error loading global settings for log", e); }
            }

            logData = {
                date: date.toLocaleDateString(),
                meals: JSON.parse(JSON.stringify(DEFAULT_MEALS)), // Deep copy default
                targets: initialTargets
            };

            // Migration Logic
            const isToday = date.toDateString() === new Date().toDateString();
            if (isToday) {
                const oldData = localStorage.getItem(getUserKey('aureus_daily_log_v2'));
                if (oldData) {
                    try {
                        const parsedOld = JSON.parse(oldData);
                        if (parsedOld.meals) {
                            console.log("Migrating legacy data to new history format...");
                            // We should merge into structure rather than replace to be safe
                            // But for now, let's just use it if it looks valid
                            logData = parsedOld;
                            logData.date = date.toLocaleDateString();
                            saveLog();
                        }
                    } catch (e) {
                        console.error("Failed to migrate old data", e);
                    }
                }
            }
        }

        updateDateDisplay(date);
        sanitizeLogData();
        renderLog();
        updateStats();
        renderWeeklyHistory();
    }

    function sanitizeLogData() {
        if (!logData) {
            logData = {
                date: new Date().toLocaleDateString(),
                meals: JSON.parse(JSON.stringify(DEFAULT_MEALS)),
                targets: { ...DEFAULT_TARGETS }
            };
        }

        // Ensure meals object exists
        if (!logData.meals) logData.meals = JSON.parse(JSON.stringify(DEFAULT_MEALS));

        // Ensure all required meal keys exist
        const requiredMeals = ['breakfast', 'lunch', 'dinner', 'snacks'];
        requiredMeals.forEach(key => {
            if (!logData.meals[key]) {
                logData.meals[key] = { time: "--:--", items: [] };
            }
            // Ensure items array exists
            if (!logData.meals[key].items) {
                logData.meals[key].items = [];
            }
        });

        // Ensure targets exist
        if (!logData.targets) logData.targets = { ...DEFAULT_TARGETS };
    }

    function saveLog() {
        const key = getStorageKey(currentDate);
        console.log(`Saving log to ${key}...`);
        try {
            localStorage.setItem(key, JSON.stringify(logData));
            renderLog();
            updateStats();
            renderWeeklyHistory();
        } catch (e) {
            console.error("Failed to save log to localStorage", e);
            alert("Storage error: Could not save your data!");
        }
    }

    function updateDateDisplay(date) {
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        const formattedDate = `${d}/${m}/${y}`;

        if (dateSelectorLabel) {
            dateSelectorLabel.innerHTML = `<i class="fa-regular fa-calendar"></i> ${formattedDate}`;
        }

        if (displayDateEl) {
            const fullOpt = { weekday: 'long', month: 'long', day: 'numeric' };
            displayDateEl.innerText = date.toLocaleDateString('en-US', fullOpt);
        }
    }

    // Navigation elements are already defined above...

    // --- DOM Elements ---
    const logTimeline = document.querySelector('.log-timeline');
    const caloriesRemainingEl = document.querySelector('.cals-val .big');
    const caloriesBar = document.querySelector('.mini-progress .bar-fill');

    // Stats Elements
    const ringFat = document.querySelector('.ring-container.yellow');
    const valFat = ringFat ? ringFat.nextElementSibling.querySelector('.val') : null;

    const ringProt = document.querySelector('.ring-container.red');
    const valProt = ringProt ? ringProt.nextElementSibling.querySelector('.val') : null;

    const ringCarb = document.querySelector('.ring-container.green');
    const valCarb = ringCarb ? ringCarb.nextElementSibling.querySelector('.val') : null;

    const riskMarker = document.querySelector('.gauge-marker');
    const riskValue = document.querySelector('.risk-value-center');
    const riskBadge = document.querySelector('.badge-risk');



    // --- Rendering ---



    function renderLog() {
        if (!logTimeline) {
            console.error("Log timeline element not found!");
            return;
        }

        logTimeline.innerHTML = '';

        const mealOrder = [
            { key: 'breakfast', label: 'BREAKFAST', color: 'yellow' },
            { key: 'lunch', label: 'LUNCH', color: 'green' },
            { key: 'dinner', label: 'DINNER', color: 'gray' },
            { key: 'snacks', label: 'SNACK / DRINKS', color: 'purple' }
        ];

        try {
            mealOrder.forEach(meal => {
                const data = logData.meals[meal.key];
                const hasItems = data && data.items && data.items.length > 0;

                const group = document.createElement('div');
                group.className = 'log-group';

                const timeStr = (data && data.time) ? data.time : '--:--';

                // Meal Header
                let headerHtml = `
                    <div class="group-header">
                        <span class="dot ${meal.color}"></span>
                        <div class="meal-title-row">
                            <span class="meal-name">${meal.label}</span>
                            ${hasItems ? `<span class="meal-time">${timeStr}</span>` : ''}
                        </div>
                    </div>
                `;

                // Meal Summary
                const items = hasItems ? data.items : [];
                const totals = calculateMealTotals(items);
                const purineStatus = totals.purine > 100 ? 'high' : 'low';
                const purineIcon = totals.purine > 100 ? '<i class="fa-solid fa-triangle-exclamation"></i> ' : '';
                const purineColor = totals.purine > 100 ? '#EF4444' : '#10B981';

                let summaryHtml = `
                    <div class="meal-summary-row" style="padding-left: 22px; margin-bottom: 12px; font-size: 11px; display: flex; gap: 8px; color: var(--text-gray);">
                        <span class="val-cal" style="color: var(--primary-lime); font-weight: 600;">${Math.round(totals.cals)} kcal</span> •
                        <span class="val-purine" style="color: ${purineColor}; ${totals.purine > 100 ? 'font-weight: 600;' : ''}">${purineIcon}${Math.round(totals.purine)}mg Purine</span> •
                        <span class="val-carb">${Math.round(totals.carb)}g Net Carb</span>
                    </div>
                `;

                let itemsHtml = '';
                if (hasItems) {
                    itemsHtml = `<div class="log-items-container filled">`;
                    items.forEach((item, index) => {
                        const displayCals = item.cals || item.cal || 0;
                        const highPurine = item.highPurine || (item.purines > 150) || (item.purine > 150);
                        const warningClass = highPurine ? 'warning' : '';
                        const warningIcon = highPurine ? ' <i class="fa-solid fa-triangle-exclamation"></i>' : '';

                        itemsHtml += `
                            <div class="log-item">
                                <div class="log-item-details">
                                    <span class="item-name ${warningClass}">${item.name}${warningIcon}</span>
                                    ${item.sub ? `<span class="item-sub">${item.sub}</span>` : ''}
                                </div>
                                 <div style="display:flex; align-items:center; gap:10px;">
                                    <span class="item-cals">${displayCals}</span>
                                    <i class="fa-solid fa-trash-can btn-delete-item" data-meal="${meal.key}" data-index="${index}" style="font-size:14px; cursor:pointer; color:#EF4444; opacity:1; visibility:visible; display:inline-block; transition:0.2s"></i>
                                 </div>
                            </div>
                        `;
                    });

                    // Add Button at the bottom of the card for populated meals
                    itemsHtml += `
                        <div class="log-card-footer btn-add-meal-dynamic" data-meal="${meal.key}" style="cursor: pointer; border-top: 1px solid rgba(255, 255, 255, 0.05); padding: 12px; text-align: center; transition: all 0.2s;"> 
                            <span style="font-size: 12px; font-weight: 700; color: var(--primary-lime); display: flex; align-items: center; justify-content: center; gap: 8px;">
                                <i class="fa-solid fa-plus"></i> Add ${meal.label}
                            </span>
                        </div>
                    `;
                    itemsHtml += `</div>`;
                } else {
                    const mealName = meal.label || meal.key.toUpperCase();
                    itemsHtml = `
                        <div class="log-items-container" style="background:transparent; border:none; padding:0;">
                            <button class="empty-state-box btn-add-meal-dynamic" data-meal="${meal.key}" style="width:100%; text-align:left; background:transparent; border: 1px dashed rgba(255,255,255,0.1); cursor:pointer;">
                                <span class="empty-text">Nothing logged yet</span>
                                <span class="add-text">Add ${mealName}</span>
                            </button>
                        </div>
                    `;
                }

                group.innerHTML = headerHtml + summaryHtml + itemsHtml;
                logTimeline.appendChild(group);
            });
        } catch (e) {
            console.error("Error rendering log timeline", e);
            logTimeline.innerHTML = `<div style="color:red; padding:20px;">Error rendering log: ${e.message}</div>`;
        }

        attachEventListeners();
    }

    function calculateMealTotals(items) {
        if (!items) return { cals: 0, purine: 0, carb: 0 };
        return items.reduce((acc, item) => {
            acc.cals += (item.cals || item.cal || 0);
            acc.purine += (item.purine || item.purines || 0);
            acc.carb += (item.carb || 0);
            return acc;
        }, { cals: 0, purine: 0, carb: 0 });
    }

    function updateStats() {
        if (!logData || !logData.meals) return;

        let totalCals = 0;
        let totalPurine = 0;
        let totalCarb = 0;
        let totalFat = 0;
        let totalProt = 0;

        try {
            Object.values(logData.meals).forEach(meal => {
                if (meal.items) {
                    meal.items.forEach(item => {
                        const cals = item.cals || item.cal || 0;
                        totalCals += cals;
                        totalPurine += (item.purine || item.purines || 0);
                        totalCarb += (item.carb || 0);
                        totalFat += (item.fat || 0);
                        totalProt += (item.prot || 0);
                    });
                }
            });

            // Update Calories
            if (caloriesRemainingEl) {
                const remaining = logData.targets.calories - totalCals;
                caloriesRemainingEl.innerText = remaining > 0 ? remaining : 0;
            }
            if (caloriesBar) {
                const pct = Math.min((totalCals / logData.targets.calories) * 100, 100);
                caloriesBar.style.width = `${pct}% `;
            }

            // Update Large Progress Ring
            const consumedValEl = document.getElementById('totalConsumedVal');
            const progressCircle = document.getElementById('consumedProgressCircle');
            if (consumedValEl) {
                consumedValEl.innerText = totalCals.toLocaleString();
            }
            if (progressCircle) {
                const radius = progressCircle.r.baseVal.value;
                const circumference = 2 * Math.PI * radius;
                const pct = Math.min(totalCals / logData.targets.calories, 2); // Allow up to 200% for visual feedback
                const offset = circumference - (pct * circumference);
                progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
                progressCircle.style.strokeDashoffset = offset;
            }

            // Update Rings
            if (ringFat && valFat) updateRing(ringFat, valFat, totalFat, logData.targets.fat, 'g');
            if (ringProt && valProt) updateRing(ringProt, valProt, totalProt, logData.targets.prot, 'g');
            if (ringCarb && valCarb) updateRing(ringCarb, valCarb, totalCarb, logData.targets.carb, 'g');

            // Update Risk
            if (riskMarker && riskValue && riskBadge) updateRiskGauge(totalPurine);

        } catch (e) {
            console.error("Error updating stats", e);
        }
    }

    function updateRing(ringEl, valEl, current, target, unit) {
        const pct = Math.round((current / target) * 100);
        ringEl.style.setProperty('--p', pct);
        ringEl.querySelector('span').innerText = `${pct}% `;
        valEl.innerText = `${Math.round(current)}${unit} `;
    }

    function updateRiskGauge(purine) {
        const maxSafe = 800;
        const pct = Math.min((purine / maxSafe) * 100, 100);
        riskMarker.style.left = `${pct}% `;
        riskValue.innerText = `${purine}mg Purines`;

        if (purine > 700) {
            riskBadge.innerText = 'HIGH RISK';
            riskBadge.className = 'badge-risk glow';
        } else if (purine > 400) {
            riskBadge.innerText = 'MODERATE';
            riskBadge.className = 'badge-risk';
            riskBadge.style.background = 'rgba(245, 158, 11, 0.2)';
            riskBadge.style.color = '#F59E0B';
        } else {
            riskBadge.innerText = 'LOW RISK';
            riskBadge.className = 'badge-risk';
            riskBadge.style.background = 'rgba(16, 185, 129, 0.2)';
            riskBadge.style.color = '#10B981';
        }
    }

    function attachEventListeners() {
        // Delete buttons
        document.querySelectorAll('.btn-delete-item').forEach(btn => {
            btn.onclick = (e) => {
                const meal = e.currentTarget.dataset.meal;
                const idx = e.currentTarget.dataset.index;
                if (logData.meals[meal] && logData.meals[meal].items) {
                    logData.meals[meal].items.splice(idx, 1);
                    saveLog();
                }
            };
        });

        // Add buttons (Delegation or specific assignment)
        const addButtons = document.querySelectorAll('.btn-add-meal-dynamic');
        addButtons.forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const target = e.currentTarget;
                const mealKey = target.dataset.meal;

                // Fallback for label
                let mealLabel = mealKey.toUpperCase();
                const nameEl = target.querySelector('.add-text');
                if (nameEl) {
                    mealLabel = nameEl.innerText;
                } else {
                    // Check for raw text in span if it's the footer button
                    const span = target.querySelector('span');
                    if (span) mealLabel = span.innerText.replace('Add ', '').trim();
                }

                openQuickAddModal(mealKey, mealLabel);
            };
        });
    }

    // --- QUICK ADD MODAL INTERACTION ---

    function openQuickAddModal(mealKey, mealLabel) {
        if (!modal) {
            console.error("Modal not found in DOM");
            return;
        }
        currentTargetMeal = mealKey;
        const displayLabel = mealLabel.replace('Add ', '').replace('ADD ', '');
        if (modalTitle) modalTitle.innerText = `Add to ${displayLabel}`;

        renderFavorites();
        resetManualForm();

        // Reset Tabs
        if (tabBtns.length > 0) tabBtns[0].click();

        modal.classList.remove('hidden');
        // Force display flex if class hidden style is not working
        modal.style.display = 'flex';
    }

    function closeModal() {
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
        currentTargetMeal = null;
    }

    function renderFavorites(searchTerm = '') {
        if (!favoritesList) return;

        // Sync search input if it exists
        const searchInput = document.querySelector('.favorites-search-input');
        if (searchInput && searchTerm) {
            searchInput.value = searchTerm;
        }

        favoritesList.innerHTML = '';

        // Try to get dynamic DB from localStorage first
        let currentDb = (typeof foodDatabase !== 'undefined') ? foodDatabase : [];
        const storedDb = localStorage.getItem(getUserKey('aureus_food_db'));
        if (storedDb) {
            try {
                currentDb = JSON.parse(storedDb);
            } catch (e) {
                console.error("Error parsing stored DB for favorites", e);
            }
        }

        let favorites = currentDb.filter(item => item.favourite === true);

        if (searchTerm) {
            favorites = favorites.filter(item =>
                item.name.toLowerCase().includes(searchTerm) ||
                (item.category && item.category.toLowerCase().includes(searchTerm))
            );
        }

        if (favorites.length === 0) {
            favoritesList.innerHTML = `
                <div style="text-align:center; padding:40px 20px; color:var(--text-gray);">
                    <i class="fa-regular fa-star" style="font-size:32px; margin-bottom:12px; opacity:0.3;"></i>
                    <p style="font-size:14px;">${searchTerm ? 'No matches found.' : 'No favorites yet.'}</p>
                </div>
            `;
            return;
        }

        const categoryIcons = {
            'Meats': 'fa-drumstick-bite',
            'Seafood': 'fa-fish',
            'Veggie': 'fa-leaf',
            'Fast Food': 'fa-burger',
            'Drinks': 'fa-glass-water',
            'Others': 'fa-utensils'
        };

        favorites.forEach(item => {
            const icon = item.icon || categoryIcons[item.category] || 'fa-utensils';
            const status = item.status || 'safe';

            const card = document.createElement('div');
            card.className = 'fav-item-row';
            card.innerHTML = `
                <div class="fav-icon-wrapper">
                    <i class="fa-solid ${icon}"></i>
                </div>
                <div class="fav-info">
                    <div class="fav-name-row">
                        <span class="fav-name">${item.name}</span>
                        <span class="status-dot ${status}" title="${status.toUpperCase()}"></span>
                    </div>
                    <div class="fav-chips-row">
                        <span class="macro-chip cal">${item.cal || item.cals || 0} kcal</span>
                        <span class="macro-chip p">${item.prot}p</span>
                        <span class="macro-chip f">${item.fat}f</span>
                        <span class="macro-chip c">${item.carb}c</span>
                    </div>
                </div>
                <button class="btn-add-fav" title="Add to Log">
                    <i class="fa-solid fa-plus"></i>
                </button>
            `;

            card.querySelector('.btn-add-fav').addEventListener('click', () => {
                addItemToLog(item);
            });

            favoritesList.appendChild(card);
        });
    }

    // ===== MANUAL ENTRY INGREDIENTS LOGIC =====
    let manualIngredients = [];
    let editingManualIngIdx = -1;

    function renderManualIngredients() {
        const grid = document.getElementById('manualIngredientsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        manualIngredients.forEach((ing, index) => {
            const card = document.createElement('div');
            card.className = 'ingredient-card-edit';
            card.innerHTML = `
                <span class="ing-name">${ing.name}</span>
                <span class="ing-amount">${ing.amount || ''}</span>
            `;
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                openManualIngModal(index);
            });
            grid.appendChild(card);
        });
    }

    function openManualIngModal(index) {
        editingManualIngIdx = index;
        const miniModal = document.getElementById('manualIngMiniModal');
        const titleEl = document.getElementById('manualIngModalTitle');
        const nameInput = document.getElementById('manualIngEditName');
        const amountInput = document.getElementById('manualIngEditAmount');
        const deleteBtn = document.getElementById('btnDeleteManualIng');

        if (index === -1) {
            titleEl.innerText = 'Añadir Ingrediente';
            nameInput.value = '';
            amountInput.value = '';
            deleteBtn.style.display = 'none';
        } else {
            titleEl.innerText = 'Editar Ingrediente';
            nameInput.value = manualIngredients[index].name || '';
            amountInput.value = manualIngredients[index].amount || '';
            deleteBtn.style.display = 'flex';
        }

        miniModal.classList.remove('hidden');
        nameInput.focus();
    }

    function closeManualIngModal() {
        document.getElementById('manualIngMiniModal')?.classList.add('hidden');
        editingManualIngIdx = -1;
    }

    // Manual Ingredients Event Listeners
    document.getElementById('btnAddManualIng')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openManualIngModal(-1);
    });

    document.getElementById('closeManualIngModal')?.addEventListener('click', (e) => {
        e.preventDefault();
        closeManualIngModal();
    });

    document.getElementById('btnSaveManualIng')?.addEventListener('click', (e) => {
        e.preventDefault();
        const name = document.getElementById('manualIngEditName').value.trim();
        const amount = document.getElementById('manualIngEditAmount').value.trim();

        if (!name) {
            alert('Por favor ingresa un nombre para el ingrediente');
            return;
        }

        if (editingManualIngIdx === -1) {
            manualIngredients.push({ name, amount });
        } else {
            manualIngredients[editingManualIngIdx] = { name, amount };
        }

        renderManualIngredients();
        closeManualIngModal();
    });

    document.getElementById('btnDeleteManualIng')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (editingManualIngIdx > -1) {
            manualIngredients.splice(editingManualIngIdx, 1);
            renderManualIngredients();
            closeManualIngModal();
        }
    });

    document.getElementById('manualIngMiniModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'manualIngMiniModal') {
            closeManualIngModal();
        }
    });

    function addManualItem() {
        const nameEl = document.getElementById('manualName');
        const name = nameEl ? nameEl.value.trim() : '';

        const cals = parseInt(document.getElementById('manualCals')?.value) || 0;
        const purine = parseInt(document.getElementById('manualPurine')?.value) || 0;
        const carb = parseInt(document.getElementById('manualCarb')?.value) || 0;
        const fat = parseInt(document.getElementById('manualFat')?.value) || 0;
        const prot = parseInt(document.getElementById('manualProt')?.value) || 0;
        const saveToDb = document.getElementById('chkSaveToDb')?.checked;

        if (!name) {
            alert('Please enter a food name');
            return;
        }

        const item = {
            name: name,
            cals: cals,
            purine: purine,
            carb: carb,
            fat: fat,
            prot: prot,
            highPurine: purine > 150,
            ingredients: manualIngredients.length > 0 ? [...manualIngredients] : undefined
        };

        // If checked, save permanently to the database
        if (saveToDb) {
            saveItemToGlobalDb(item);
        }

        addItemToLog(item);
    }

    function saveItemToGlobalDb(item) {
        let db = [];
        const stored = localStorage.getItem(getUserKey('aureus_food_db'));
        if (stored) {
            try { db = JSON.parse(stored); } catch (e) { }
        }

        // Prepare for DB schema (uses 'cal' and 'purines' instead of 'cals' and 'purine')
        const dbItem = {
            name: item.name,
            category: "Others",
            cal: item.cals,
            purines: item.purine,
            carb: item.carb,
            fat: item.fat,
            prot: item.prot,
            status: item.purine > 150 ? "danger" : (item.purine > 50 ? "caution" : "safe"),
            tip: "Agregado manualmente por el usuario.",
            favourite: true,
            ingredients: item.ingredients || []
        };

        db.push(dbItem);
        localStorage.setItem(getUserKey('aureus_food_db'), JSON.stringify(db));
        console.log("Item saved permanently to global database.");

        // Notify other tabs if needed (though they usually listen to storage event)
        localStorage.setItem(getUserKey('aureus_db_version_update_manual'), Date.now());
    }

    function resetManualForm() {
        if (document.getElementById('manualName')) document.getElementById('manualName').value = '';
        if (document.getElementById('manualCals')) document.getElementById('manualCals').value = '';
        if (document.getElementById('manualPurine')) document.getElementById('manualPurine').value = '';
        if (document.getElementById('manualCarb')) document.getElementById('manualCarb').value = '';
        if (document.getElementById('manualFat')) document.getElementById('manualFat').value = '';
        if (document.getElementById('manualProt')) document.getElementById('manualProt').value = '';
        if (document.getElementById('chkSaveToDb')) document.getElementById('chkSaveToDb').checked = false;
        // Reset manual ingredients
        manualIngredients = [];
        renderManualIngredients();
    }

    function renderWeeklyHistory() {
        // Redesigned for Macros Breakdown (Stacked Bars)
        const container = document.getElementById('macrosChartContainer') || document.querySelector('.weekly-chart-container');
        if (!container) return;

        container.innerHTML = '';
        const anchorDate = new Date(currentDate);
        const last7Days = [];

        // Generate selected week
        for (let i = 6; i >= 0; i--) {
            const d = new Date(anchorDate);
            d.setDate(anchorDate.getDate() - i);
            last7Days.push(d);
        }

        // Fixed max scale for visual height (e.g. 2500 kcal for full bar height relative scaling)
        const MAX_Y = 2500;

        last7Days.forEach(date => {
            const key = getStorageKey(date);
            const stored = localStorage.getItem(key);

            let dFat = 0, dProt = 0, dCarb = 0, dCals = 0;

            if (stored) {
                try {
                    const data = JSON.parse(stored);
                    if (data.meals) {
                        Object.values(data.meals).forEach(meal => {
                            if (meal.items) {
                                meal.items.forEach(item => {
                                    // Use raw grams if available
                                    dFat += (item.fat || 0);
                                    dProt += (item.prot || 0);
                                    dCarb += (item.carb || 0);
                                    dCals += (item.cals || item.cal || 0);
                                });
                            }
                        });
                    }
                } catch (e) { }
            }

            // Convert to Cals for height contribution
            const cFat = dFat * 9;
            const cProt = dProt * 4;
            const cCarb = dCarb * 4;

            // Limit check for Carbs color
            const isHighCarb = dCarb > 25;
            const carbColor = isHighCarb ? '#F97316' : '#FACC15'; // Orange vs Yellow

            // Percentages of MAX_Y for height
            const pctFat = Math.min((cFat / MAX_Y) * 100, 100);
            const pctProt = Math.min((cProt / MAX_Y) * 100, 100);
            const pctCarb = Math.min((cCarb / MAX_Y) * 100, 100);

            const isSelected = date.toDateString() === anchorDate.toDateString();
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

            const group = document.createElement('div');
            group.className = 'macro-bar-group';
            group.style.display = 'flex';
            group.style.flexDirection = 'column';
            group.style.alignItems = 'center';
            group.style.gap = '10px';
            group.style.flex = '1';
            group.style.cursor = 'pointer';

            // Stacked Bar
            // We use flex-col-reverse. Fat is bottom.
            group.innerHTML = `
                <div class="stacked-bar-wrapper" style="
                    width: 42px;
                    height: 160px; 
                    background: rgba(255,255,255,0.03); 
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 21px; 
                    position: relative; 
                    overflow: hidden; 
                    display: flex; 
                    flex-direction: column-reverse;
                    align-items: center;
                    gap: 1px; 
                    ${isSelected ? 'box-shadow: 0 0 0 1px #fff, 0 0 15px rgba(250, 204, 21, 0.2); border-color: #fff;' : ''}
                    transition: all 0.3s ease;
                ">
                    <!-- Fat (Bottom) -->
                    <!-- Fat (Bottom) -->
                    <div class="seg-fat" style="
                        width: 100%; 
                        height: 0%; 
                        background: #27272a; 
                        transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
                        min-height: 2px; /* Ensure visibility if nonzero */
                    " data-h="${pctFat}%"></div>
                    
                    <!-- Prot (Middle) -->
                    <div class="seg-prot" style="
                        width: 100%; 
                        height: 0%; 
                        background: #52525b; 
                        transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s;
                        min-height: 2px;
                    " data-h="${pctProt}%"></div>
                    
                    <!-- Carb (Top) -->
                    <div class="seg-carb" style="
                        width: 100%; 
                        height: 0%; 
                        background: #FACC15; 
                        transition: height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s;
                        border-radius: 2px 2px 0 0;
                        min-height: 2px;
                    " data-h="${pctCarb}%"></div>
                </div>
                <span style="font-size: 11px; letter-spacing: 0.5px; color: ${isSelected ? '#fff' : '#52525b'}; font-weight: ${isSelected ? '700' : '600'}; text-transform: uppercase;">${dayName}</span>
            `;

            container.appendChild(group);

            // Interaction
            const showTooltip = () => {
                const tooltip = getMacroTooltip();
                const rect = group.getBoundingClientRect();

                // Total Cals Calc
                const tot = Math.round(dCals);

                tooltip.innerHTML = `
                    <div style="font-weight:700; margin-bottom:6px; color:#fff; border-bottom:1px solid #333; padding-bottom:4px;">${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                    <div style="display:flex; justify-content:space-between; color:#a1a1aa; gap:16px;"><span>KCAL</span> <span style="color:#fff; font-weight:600;">${tot}</span></div>
                    <div style="display:flex; justify-content:space-between; color:#a1a1aa; gap:16px;"><span>Net Carbs</span> <span style="color:#FACC15; font-weight:600;">${Math.round(dCarb)}g</span></div>
                    <div style="display:flex; justify-content:space-between; color:#a1a1aa; gap:16px;"><span>Protein</span> <span style="color:#9ca3af; font-weight:600;">${Math.round(dProt)}g</span></div>
                    <div style="display:flex; justify-content:space-between; color:#a1a1aa; gap:16px;"><span>Fat</span> <span style="color:#71717a; font-weight:600;">${Math.round(dFat)}g</span></div>
                 `;

                tooltip.style.display = 'block';
                // Calc position
                const leftPos = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
                const topPos = rect.top - tooltip.offsetHeight - 8;

                tooltip.style.left = `${leftPos}px`;
                tooltip.style.top = `${topPos}px`;
            };

            const hideTooltip = () => {
                const tooltip = getMacroTooltip();
                tooltip.style.display = 'none';
            };

            group.addEventListener('mouseenter', showTooltip);
            group.addEventListener('mouseleave', hideTooltip);
            group.addEventListener('click', showTooltip);

            // Animate
            setTimeout(() => {
                const f = group.querySelector('.seg-fat');
                const p = group.querySelector('.seg-prot');
                const c = group.querySelector('.seg-carb');
                if (f) f.style.height = f.dataset.h;
                if (p) p.style.height = p.dataset.h;
                if (c) c.style.height = c.dataset.h;
            }, 100);
        });
    }

    function getMacroTooltip() {
        let t = document.getElementById('macro-chart-tooltip');
        if (!t) {
            t = document.createElement('div');
            t.id = 'macro-chart-tooltip';
            t.style.position = 'fixed';
            t.style.zIndex = '9999';
            t.style.background = '#18181b';
            t.style.border = '1px solid #3f3f46';
            t.style.borderRadius = '8px';
            t.style.padding = '12px';
            t.style.pointerEvents = 'none';
            t.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5)';
            t.style.fontFamily = 'Inter, sans-serif';
            t.style.fontSize = '12px';
            t.style.lineHeight = '1.6';
            t.style.minWidth = '140px';
            document.body.appendChild(t);
        }
        return t;
    }

    function addItemToLog(item) {
        if (!currentTargetMeal) return;

        console.log(`Adding item to ${currentTargetMeal}:`, item);

        const newItem = {
            ...item,
            highPurine: item.highPurine !== undefined ? item.highPurine : ((item.purines || 0) > 150)
        };

        if (newItem.cal !== undefined && newItem.cals === undefined) {
            newItem.cals = newItem.cal;
        }
        if (newItem.purines !== undefined && newItem.purine === undefined) {
            newItem.purine = newItem.purines;
        }

        if (logData && logData.meals && logData.meals[currentTargetMeal]) {
            logData.meals[currentTargetMeal].items.push(newItem);
            saveLog();
            closeModal();
            console.log("Item added and log saved.");

            // Refresh chart
            renderWeeklyHistory();
        } else {
            console.error("Could not add item, invalid logData structure");
        }
    }

    // Initial render
    seedMockHistory();
    loadLogForDate(currentDate);

    function seedMockHistory() {
        // Only run if flag not set? Or just run. User asked for it.
        // We will inject data for Dec 14-20, 2025.
        const mockDays = [
            { day: 14, cals: 1850 }, // Sun
            { day: 15, cals: 2100 }, // Mon
            { day: 16, cals: 1950 }, // Tue
            { day: 17, cals: 2250 }, // Wed
            { day: 18, cals: 1700 }, // Thu
            { day: 19, cals: 2400 }, // Fri
            { day: 20, cals: 1900 }  // Sat
        ];

        mockDays.forEach(md => {
            const dateStr = `2025-12-${md.day}`;
            const key = getUserKey(`aureus_log_${dateStr}`);

            // Skip if user already has data for this date
            if (localStorage.getItem(key)) return;

            const totalCals = md.cals;
            // Random noise 0.9 - 1.1
            const r = () => 0.9 + Math.random() * 0.2;

            // Varied macros proportional to Calories
            const pCals = totalCals * 0.25 * r();
            const fCals = totalCals * 0.35 * r();
            const cCals = totalCals * 0.40 * r();

            const pGrams = Math.floor(pCals / 4);
            const fGrams = Math.floor(fCals / 9);
            const cGrams = Math.floor(cCals / 4);

            const split = (val) => [Math.floor(val * 0.3), Math.floor(val * 0.4), Math.floor(val * 0.3)];

            const pS = split(pGrams);
            const fS = split(fGrams);
            const cS = split(cGrams);
            const calS = split(totalCals);

            const mockLog = {
                date: `${md.day}/12/2025`,
                meals: {
                    breakfast: {
                        time: "08:30 AM",
                        items: [{ name: "Balanced Breakfast", cals: calS[0], prot: pS[0], carb: cS[0], fat: fS[0] }]
                    },
                    lunch: {
                        time: "01:00 PM",
                        items: [{ name: "Power Lunch", cals: calS[1], prot: pS[1], carb: cS[1], fat: fS[1] }]
                    },
                    dinner: {
                        time: "07:30 PM",
                        items: [{ name: "Recovery Dinner", cals: calS[2], prot: pS[2], carb: cS[2], fat: fS[2] }]
                    },
                    snacks: { time: "--:--", items: [] }
                },
                targets: { calories: 2000, fat: 150, prot: 150, carb: 100 }
            };

            localStorage.setItem(key, JSON.stringify(mockLog));
        });
        console.log("Mock history re-seeded with varied macros.");
    }

    // Sync from other page
    window.addEventListener('storage', (e) => {
        if (e.key === getUserKey('aureus_user_settings') ||
            (e.key && e.key.includes('_aureus_log_')) ||
            e.key === getUserKey('aureus_targets_updated') ||
            e.key === 'aureus_active_user') {
            loadLogForDate(currentDate);
        }
    });

    // --- Global Save Button Integration ---
    // Listen for the global save event from the header's "SAVE CHANGES" button
    document.addEventListener('aureus-global-save', (e) => {
        console.log('Global save event received in Food Logger');

        // Force save current log data to localStorage
        if (logData) {
            saveLog();
            console.log('Food log saved via global save button');
        }

        // Optional: Sync to Supabase if available
        if (window.aureusSupabase && logData) {
            syncToSupabase();
        }
    });

    // Optional Supabase sync function
    async function syncToSupabase() {
        if (!window.aureusSupabase || !logData) return;

        try {
            const dateKey = getStorageKey(currentDate);
            const userId = window.getActiveUser();

            console.log('Syncing to Supabase...', { userId, dateKey });

            const { data, error } = await window.aureusSupabase.client
                .from('food_logs')
                .upsert({
                    user_id: userId,
                    date_key: dateKey,
                    log_data: logData,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            console.log('Food log synced to Supabase successfully');
        } catch (err) {
            console.error('Supabase sync failed:', err);
            // Fail silently - data is still saved to localStorage
        }
    }

    // ===== AI FOOD SCANNER =====
    const btnAIScan = document.getElementById('btnAIScan');
    const btnTakePhoto = document.getElementById('btnTakePhoto');
    const btnUploadPhoto = document.getElementById('btnUploadPhoto');
    const photoInput = document.getElementById('photoInput');
    const imagePreview = document.getElementById('imagePreview');
    const btnAddScannedFood = document.getElementById('btnAddScannedFood');
    const btnScanAgain = document.getElementById('btnScanAgain');

    let scannedFoodData = null;

    function openAIScanModal() {
        console.log('openAIScanModal: Function called');

        // Read API key dynamically each time
        const GEMINI_API_KEY = localStorage.getItem('gemini_api_key') || 'AIzaSyAxz_OBQAxeRyTVNxCfD4iNv2f7EIhN9s0';
        console.log('openAIScanModal: API Key exists:', !!GEMINI_API_KEY);

        if (!GEMINI_API_KEY) {
            console.warn('openAIScanModal: No API key configured');
            alert('⚠️ Necesitas configurar tu API Key de Google Gemini primero.\n\nVisita: https://aistudio.google.com/app/apikey\n\nLuego guárdala en la configuración de la app o en la consola:\nlocalStorage.setItem("gemini_api_key", "TU_API_KEY")');
            return;
        }

        console.log('openAIScanModal: Opening Quick Add modal...');
        // Open Quick Add modal and switch to AI Scan tab
        openQuickAddModal('breakfast', 'BREAKFAST');

        console.log('openAIScanModal: Switching to aiscan tab...');
        switchTab('aiscan');

        console.log('openAIScanModal: Resetting scan modal...');
        resetScanModal();

        console.log('openAIScanModal: Complete!');
    }


    function resetScanModal() {
        document.querySelectorAll('.scan-section').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        const inputSection = document.getElementById('scanInputSection');
        if (inputSection) {
            inputSection.classList.add('active');
            inputSection.classList.remove('hidden');
        }

        if (imagePreview) {
            imagePreview.classList.add('hidden'); // This will use the new global .hidden class
            imagePreview.innerHTML = '';
        }
        scannedFoodData = null;
    }

    async function processImageWithAI(imageFile) {
        // Switch to processing
        document.querySelectorAll('.scan-section').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        const processingSection = document.getElementById('scanProcessingSection');
        if (processingSection) {
            processingSection.classList.add('active');
            processingSection.classList.remove('hidden');
        }

        try {
            // Convert image to base64
            const base64Image = await fileToBase64(imageFile);

            // Call Gemini Vision API
            const result = await analyzeFood(base64Image);

            // Show results
            displayScanResults(result);
        } catch (error) {
            console.error('AI scan error:', error);
            alert('❌ Error al analizar la imagen: ' + error.message);
            resetScanModal();
        }
    }

    // List of Gemini models to try (in order of preference)
    const GEMINI_MODELS = [
        'gemini-2.5-flash-lite',    // Fast and lightweight
        'gemini-2.0-flash',          // Good balance
        'gemini-1.5-flash',          // Stable fallback
        'gemini-1.5-flash-latest',   // Latest 1.5
        'gemini-pro-vision'          // Legacy vision model
    ];

    async function analyzeFood(base64Image) {
        const GEMINI_API_KEY = localStorage.getItem('gemini_api_key') || 'AIzaSyAxz_OBQAxeRyTVNxCfD4iNv2f7EIhN9s0';
        if (!GEMINI_API_KEY) {
            throw new Error('API Key no configurada');
        }

        const prompt = `Analiza esta imagen de comida y extrae la información nutricional estimada para una porción típica. 

Responde SOLO en formato JSON sin markdown, sin bloques de código, solo el objeto JSON puro:
{
  "name": "nombre del plato en español",
  "calories": número de calorías (solo el número),
  "purines": miligramos de purinas (usa 0 si no sabes, o estima basado en ingredientes),
  "carbs": gramos de carbohidratos netos (solo el número),
  "fat": gramos de grasa (solo el número),
  "protein": número de proteína (solo el número),
  "confidence": "high/medium/low",
  "portionSize": "descripción breve del tamaño de porción",
  "ingredients": [
    {"name": "nombre del ingrediente", "amount": "ej: 100g o 2 piezas"}
  ]
}

IMPORTANTE: 
- Responde SOLO el JSON, sin texto adicional
- Todos los números deben ser enteros sin unidades
- Si ves carne roja, mariscos o vísceras, estima purinas altas (150-200mg)
- Si es pollo/pescado blanco, purinas medias (50-100mg)
- Si son vegetales/frutas, purinas bajas (0-30mg)`;

        let lastError = null;

        // Try each model until one works
        for (const model of GEMINI_MODELS) {
            try {
                console.log(`🤖 Trying model: ${model}...`);

                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: prompt },
                                    {
                                        inline_data: {
                                            mime_type: 'image/jpeg',
                                            data: base64Image
                                        }
                                    }
                                ]
                            }]
                        })
                    }
                );

                // Check for rate limit error (429)
                if (response.status === 429) {
                    console.warn(`⚠️ Model ${model} hit rate limit, trying next...`);
                    continue; // Try next model
                }

                if (!response.ok) {
                    const errorData = await response.json();
                    const errorMsg = errorData.error?.message || 'Unknown error';

                    // If it's a quota/rate error, try next model
                    if (errorMsg.toLowerCase().includes('quota') ||
                        errorMsg.toLowerCase().includes('rate') ||
                        errorMsg.toLowerCase().includes('exceeded')) {
                        console.warn(`⚠️ Model ${model} quota exceeded, trying next...`);
                        continue;
                    }

                    throw new Error(errorMsg);
                }

                const data = await response.json();
                const text = data.candidates[0].content.parts[0].text;

                // Parse JSON response (remove markdown if present)
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    console.log(`✅ Success with model: ${model}`);

                    // Ensure all values are numbers
                    return {
                        name: parsed.name,
                        calories: parseInt(parsed.calories) || 0,
                        purines: parseInt(parsed.purines) || 0,
                        carbs: parseInt(parsed.carbs) || 0,
                        fat: parseInt(parsed.fat) || 0,
                        protein: parseInt(parsed.protein) || 0,
                        confidence: parsed.confidence || 'medium',
                        portionSize: parsed.portionSize || 'Porción estándar',
                        ingredients: parsed.ingredients || []
                    };
                }

                throw new Error('No se pudo extraer información nutricional');

            } catch (error) {
                console.warn(`❌ Model ${model} failed:`, error.message);
                lastError = error;
                // Continue to next model
            }
        }

        // All models failed
        throw new Error(lastError?.message || 'Todos los modelos de IA están saturados. Por favor intenta en unos minutos.');
    }

    let currentQuantity = 1;
    let baseCalories = 0;

    function displayScanResults(data) {
        scannedFoodData = data;
        currentQuantity = 1;
        baseCalories = data.calories;

        document.querySelectorAll('.scan-section').forEach(s => {
            s.classList.remove('active');
            s.classList.add('hidden');
        });
        const resultsSection = document.getElementById('scanResultsSection');
        if (resultsSection) {
            resultsSection.classList.add('active');
            resultsSection.classList.remove('hidden');
            resultsSection.style.display = 'block';
        }

        // 1. Update Header / Summary Card
        document.getElementById('detectedFoodName').innerText = data.name;
        const confidenceBadge = document.getElementById('confidenceBadge');
        if (confidenceBadge) {
            confidenceBadge.innerText = (data.confidence || 'medium').toUpperCase();
            confidenceBadge.style.background = data.confidence === 'high' ? 'rgba(34, 197, 94, 0.2)' :
                data.confidence === 'medium' ? 'rgba(245, 158, 11, 0.2)' :
                    'rgba(239, 68, 68, 0.2)';
            confidenceBadge.style.color = data.confidence === 'high' ? '#22c55e' :
                data.confidence === 'medium' ? '#F59E0B' :
                    '#EF4444';
        }

        // Update Thumbnail
        const thumb = document.getElementById('scanResultImageThumb');
        const photoInput = document.getElementById('photoInput');
        if (thumb && photoInput && photoInput.files && photoInput.files[0]) {
            const url = URL.createObjectURL(photoInput.files[0]);
            thumb.style.backgroundImage = `url(${url})`;
        }

        // Populate Nutritional Summary Bar
        const resPurines = document.getElementById('resPurines');
        if (resPurines) resPurines.innerText = data.purines || 0;
        const resCarbs = document.getElementById('resCarbs');
        if (resCarbs) resCarbs.innerText = data.carbs || 0;
        const resFat = document.getElementById('resFat');
        if (resFat) resFat.innerText = data.fat || 0;
        const resProtein = document.getElementById('resProtein');
        if (resProtein) resProtein.innerText = data.protein || 0;

        // Initialize Manual Controls
        const qtyEl = document.getElementById('scanQuantity');
        if (qtyEl) qtyEl.innerText = currentQuantity;
        const calInput = document.getElementById('scanCalorieInput');
        if (calInput) calInput.value = data.calories;

        renderIngredientsGrid();
    }

    // --- INTERACTIVE INGREDIENTS LOGIC ---
    let editingIngredientIndex = -1;

    function renderIngredientsGrid() {
        const grid = document.getElementById('ingredientsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const ingredients = scannedFoodData.ingredients || [];

        // Render ingredient cards
        ingredients.forEach((ing, index) => {
            const card = document.createElement('div');
            card.className = 'ingredient-card';
            card.style.cursor = 'pointer'; // Make it clear it's clickable

            // Add click handler for editing
            card.onclick = () => openIngredientEdit(index);

            card.innerHTML = `
                <span class="ing-name">${ing.name}</span>
                <span class="ing-amount">${ing.amount || ''}</span>
            `;
            grid.appendChild(card);
        });

        // Add "Add Ingredient" card
        const addCard = document.createElement('div');
        addCard.className = 'ingredient-card add-ingredient-card';
        addCard.onclick = openIngredientSearch;
        addCard.innerHTML = `
            <i class="fa-solid fa-plus"></i>
            <span class="ing-name">Añadir</span>
        `;
        grid.appendChild(addCard);
    }

    function openIngredientSearch() {
        const modal = document.getElementById('ingredientSearchModal');
        if (modal) {
            modal.classList.remove('hidden');
            const input = document.getElementById('ingredientSearchInput');
            if (input) {
                input.value = '';
                input.focus();
            }
            const results = document.getElementById('ingredientSearchResults');
            if (results) results.innerHTML = '';
        }
    }

    function closeIngredientSearch() {
        document.getElementById('ingredientSearchModal')?.classList.add('hidden');
    }

    function openIngredientEdit(index) {
        editingIngredientIndex = index;
        const ing = scannedFoodData.ingredients[index];
        document.getElementById('editIngName').value = ing.name;
        document.getElementById('editIngAmount').value = ing.amount || '';
        document.getElementById('ingredientEditModal')?.classList.remove('hidden');
    }

    function closeIngredientEdit() {
        document.getElementById('ingredientEditModal')?.classList.add('hidden');
        editingIngredientIndex = -1;
    }

    // --- Search Logic ---
    const searchInput = document.getElementById('ingredientSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const resultsContainer = document.getElementById('ingredientSearchResults');
            resultsContainer.innerHTML = '';

            if (term.length < 2) return;

            // Search in foodDatabase (global)
            let matches = [];
            if (typeof foodDatabase !== 'undefined') {
                matches = Object.values(foodDatabase).filter(f =>
                    f.name.toLowerCase().includes(term)
                ).slice(0, 8);
            }

            matches.forEach(food => {
                const item = document.createElement('div');
                item.className = 'mini-result-item';
                item.innerHTML = `
                    <div class="mini-result-icon">${food.icon || '🍽️'}</div>
                    <div class="mini-result-info">
                        <h4>${food.name}</h4>
                    </div>
                `;
                item.onclick = () => selectIngredientToAdd(food);
                resultsContainer.appendChild(item);
            });

            if (matches.length === 0) {
                resultsContainer.innerHTML = '<div style="padding:10px; color:#aaa; font-size:12px; text-align:center;">No se encontraron resultados</div>';
            }
        });
    }

    function selectIngredientToAdd(food) {
        if (!scannedFoodData.ingredients) scannedFoodData.ingredients = [];
        scannedFoodData.ingredients.push({
            name: food.name,
            amount: food.amount || "1 porción"
        });
        renderIngredientsGrid();
        closeIngredientSearch();
    }

    // --- Edit Modal Actions ---
    const btnSaveIng = document.getElementById('btnSaveIngredient');
    if (btnSaveIng) {
        btnSaveIng.addEventListener('click', () => {
            if (editingIngredientIndex > -1 && scannedFoodData.ingredients) {
                const newAmount = document.getElementById('editIngAmount').value;
                scannedFoodData.ingredients[editingIngredientIndex].amount = newAmount;
                renderIngredientsGrid();
                closeIngredientEdit();
            }
        });
    }

    const btnDeleteIng = document.getElementById('btnDeleteIngredient');
    if (btnDeleteIng) {
        btnDeleteIng.addEventListener('click', () => {
            if (editingIngredientIndex > -1 && scannedFoodData.ingredients) {
                scannedFoodData.ingredients.splice(editingIngredientIndex, 1);
                renderIngredientsGrid();
                closeIngredientEdit();
            }
        });
    }

    // --- Manual Add Logic ---
    document.getElementById('btnAddManualIngredient')?.addEventListener('click', () => {
        const name = document.getElementById('manualIngName').value;
        const amount = document.getElementById('manualIngAmount').value;

        if (name && amount) {
            selectIngredientToAdd({ name: name, amount: amount });

            // Clear inputs
            document.getElementById('manualIngName').value = '';
            document.getElementById('manualIngAmount').value = '';
        }
    });

    // --- Modal Close Listeners ---
    document.getElementById('closeIngredientSearchBtn')?.addEventListener('click', closeIngredientSearch);
    document.getElementById('cancelIngredientSearch')?.addEventListener('click', closeIngredientSearch);
    document.getElementById('closeIngredientEditBtn')?.addEventListener('click', closeIngredientEdit);

    // Set up Adjustment listeners once (when the script loads)
    function initAdjustmentControls() {
        const btnMinus = document.getElementById('btnDecreaseQty');
        const btnPlus = document.getElementById('btnIncreaseQty');
        const qtyEl = document.getElementById('scanQuantity');
        const calInput = document.getElementById('scanCalorieInput');

        if (btnMinus) {
            btnMinus.onclick = () => {
                // User requirement: This button should decrease calories by 10
                if (calInput) {
                    let val = parseInt(calInput.value) || 0;
                    val = Math.max(0, val - 10);
                    calInput.value = val;
                }
            };
        }
        if (btnPlus) {
            btnPlus.onclick = () => {
                // User requirement: This button should increase calories by 10
                if (calInput) {
                    let val = parseInt(calInput.value) || 0;
                    val += 10;
                    calInput.value = val;
                }
            };
        }
    }

    // Call init (this assumes it's within the scope where these IDs exist)
    setTimeout(initAdjustmentControls, 500);

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // Event Listeners
    console.log('AI Scanner: btnAIScan element:', btnAIScan);
    if (btnAIScan) {
        console.log('AI Scanner: Adding event listener to btnAIScan');
        btnAIScan.addEventListener('click', () => {
            console.log('AI Scanner: Button clicked!');
            openAIScanModal();
        });
    } else {
        console.error('AI Scanner: btnAIScan element not found!');
    }


    if (btnTakePhoto) {
        btnTakePhoto.addEventListener('click', () => {
            photoInput.setAttribute('capture', 'environment');
            photoInput.click();
        });
    }

    if (btnUploadPhoto) {
        btnUploadPhoto.addEventListener('click', () => {
            photoInput.removeAttribute('capture');
            photoInput.click();
        });
    }

    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Show preview
                const url = URL.createObjectURL(file);
                imagePreview.innerHTML = `<img src="${url}" alt="Food preview" style="width: 100%; border-radius: 12px;">`;
                imagePreview.classList.remove('hidden');

                // Process with AI
                setTimeout(() => processImageWithAI(file), 500);
            }
        });
    }

    if (btnAddScannedFood) {
        btnAddScannedFood.addEventListener('click', () => {
            if (scannedFoodData) {
                const calInput = document.getElementById('scanCalorieInput');
                const qtyEl = document.getElementById('scanQuantity');

                const finalCals = calInput ? (parseInt(calInput.value) || 0) : scannedFoodData.calories;
                const finalQty = qtyEl ? (parseInt(qtyEl.innerText) || 1) : 1;

                // User manual edit on calories is treated as the FINAL TOTAL calories.
                // Macros are scaled by quantity from the original base detection.
                const item = {
                    name: scannedFoodData.name,
                    cals: finalCals,
                    purine: scannedFoodData.purines * finalQty,
                    carb: scannedFoodData.carbs * finalQty,
                    fat: scannedFoodData.fat * finalQty,
                    prot: scannedFoodData.protein * finalQty,
                    qty: finalQty
                };

                // Check if user wants to save as favorite
                const saveAsFavorite = document.getElementById('chkSaveScannedAsFavorite')?.checked;

                if (saveAsFavorite) {
                    // Save to food database as favorite
                    const dbItem = {
                        name: item.name,
                        category: "AI Scanned",
                        cal: item.cals,
                        purines: item.purine,
                        carb: item.carb,
                        fat: item.fat,
                        prot: item.prot,
                        status: item.purine > 150 ? "danger" : (item.purine > 50 ? "caution" : "safe"),
                        tip: `Escaneado con IA - ${scannedFoodData.portionSize}`,
                        favourite: true,
                        icon: "fa-camera",
                        ingredients: scannedFoodData.ingredients || []
                    };

                    let db = [];
                    const stored = localStorage.getItem(getUserKey('aureus_food_db'));
                    if (stored) {
                        try { db = JSON.parse(stored); } catch (e) { }
                    }

                    // Check if already exists
                    const exists = db.find(f => f.name.toLowerCase() === item.name.toLowerCase());
                    if (!exists) {
                        db.push(dbItem);
                        localStorage.setItem(getUserKey('aureus_food_db'), JSON.stringify(db));
                        console.log('✅ Food saved to favorites database');
                    } else {
                        console.log('ℹ️ Food already exists in favorites');
                    }
                }

                // Add to log directly
                addItemToLog(item);
            }
        });
    }

    if (btnScanAgain) {
        btnScanAgain.addEventListener('click', resetScanModal);
    }


});
