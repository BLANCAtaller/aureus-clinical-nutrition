document.addEventListener('DOMContentLoaded', () => {
    // Quick Add Modal Elements
    const modal = document.getElementById('quickAddModal');
    const modalTitle = document.getElementById('modalTitle');
    const closeBtn = document.getElementById('closeModalBtn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const favoritesList = document.getElementById('favoritesList');
    const addManualBtn = document.getElementById('addManualBtn');
    let currentTargetMeal = null;

    // Attach Listeners to Dashboard Meal Buttons
    const mealBtns = document.querySelectorAll('.meal-btn');
    mealBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const meal = btn.dataset.meal;
            let label = "Meal";
            const span = btn.querySelector('span');
            if (span) label = span.innerText;

            if (meal) {
                openQuickAddModal(meal, "Add " + label);
            }
        });
    });

    // Modal Listeners
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const tabId = `tab${btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1)}`;
            const tab = document.getElementById(tabId);
            if (tab) tab.classList.add('active');

            // Show/hide search bar only for favorites
            const searchContainer = document.querySelector('.fav-search-container');
            if (searchContainer) {
                searchContainer.style.display = btn.dataset.tab === 'favorites' ? 'block' : 'none';
            }
        });
    });

    if (addManualBtn) addManualBtn.addEventListener('click', addManualItem);

    // --- Functions ---
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

        let currentDb = (typeof foodDatabase !== 'undefined') ? foodDatabase : [];
        const storedDb = localStorage.getItem(getUserKey('aureus_food_db'));
        if (storedDb) {
            try { currentDb = JSON.parse(storedDb); } catch (e) { }
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
            highPurine: purine > 150
        };

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
            favourite: true
        };
        db.push(dbItem);
        localStorage.setItem(getUserKey('aureus_food_db'), JSON.stringify(db));
    }

    function resetManualForm() {
        if (document.getElementById('manualName')) document.getElementById('manualName').value = '';
        if (document.getElementById('manualCals')) document.getElementById('manualCals').value = '';
        if (document.getElementById('manualPurine')) document.getElementById('manualPurine').value = '';
        if (document.getElementById('manualCarb')) document.getElementById('manualCarb').value = '';
        if (document.getElementById('manualFat')) document.getElementById('manualFat').value = '';
        if (document.getElementById('manualProt')) document.getElementById('manualProt').value = '';
        if (document.getElementById('chkSaveToDb')) document.getElementById('chkSaveToDb').checked = false;
    }

    function addItemToLog(item) {
        if (!currentTargetMeal) return;

        const date = new Date();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const key = getUserKey(`aureus_log_${y}-${m}-${d}`);

        let logData = null;
        const stored = localStorage.getItem(key);
        if (stored) {
            try { logData = JSON.parse(stored); } catch (e) { }
        }

        if (!logData) {
            // Init if not exists
            logData = {
                date: date.toLocaleDateString(),
                meals: {
                    breakfast: { time: "08:30 AM", items: [] },
                    lunch: { time: "12:30 PM", items: [] },
                    dinner: { time: "07:00 PM", items: [] },
                    snacks: { time: "--:--", items: [] }
                },
                targets: { calories: 2000, fat: 150, prot: 95, carb: 45 }
            };
        }

        const newItem = {
            ...item,
            highPurine: item.highPurine !== undefined ? item.highPurine : ((item.purines || 0) > 150)
        };
        if (newItem.cal !== undefined && newItem.cals === undefined) newItem.cals = newItem.cal;
        if (newItem.purines !== undefined && newItem.purine === undefined) newItem.purine = newItem.purines;

        if (logData.meals && logData.meals[currentTargetMeal]) {
            logData.meals[currentTargetMeal].items.push(newItem);
            localStorage.setItem(key, JSON.stringify(logData));

            closeModal();

            // Update Dashboard Chart immediately
            if (typeof initMacroChart === 'function') {
                initMacroChart();
            }

            // Create simple notification
            showNotification(`Added ${item.name} to ${currentTargetMeal}`);
        } else {
            alert('Error: Invalid meal structure in log.');
        }
    }

    function showNotification(msg) {
        const notif = document.createElement('div');
        notif.style.position = 'fixed';
        notif.style.bottom = '20px';
        notif.style.right = '20px';
        notif.style.background = '#10B981';
        notif.style.color = '#fff';
        notif.style.padding = '10px 20px';
        notif.style.borderRadius = '8px';
        notif.style.zIndex = '10000';
        notif.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        notif.innerText = msg;
        document.body.appendChild(notif);
        setTimeout(() => {
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 500);
        }, 3000);
    }
});
