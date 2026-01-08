document.addEventListener('DOMContentLoaded', () => {
    // Check for "Select Mode" (Adding to Log)
    const params = new URLSearchParams(window.location.search);
    const selectMode = params.get('mode') === 'select';
    const targetMeal = params.get('meal');

    const foodGrid = document.querySelector('.food-db-grid');
    const searchInput = document.getElementById('foodSearch');

    // Visual Feedback for Select Mode
    if (selectMode && targetMeal) {
        const headerTitle = document.querySelector('.greeting-container h1');
        const headerSubtitle = document.querySelector('.greeting-container .date-subtitle');
        if (headerTitle) headerTitle.innerText = `Adding to ${targetMeal.charAt(0).toUpperCase() + targetMeal.slice(1)}`;
        if (headerSubtitle) headerSubtitle.innerText = "Select a food item to add to your log";

        // Hide "New Food" button to focus on selection
        const btnNew = document.getElementById('btnAddFood');
        if (btnNew) {
            btnNew.innerHTML = `<i class="fa-solid fa-xmark"></i> Cancel Selection`;
            btnNew.className = "btn-header-dark";
            btnNew.style.display = 'flex';
            btnNew.onclick = () => window.location.href = 'food-log.html';
        }
    }
    // ... rest of code

    const filterPills = document.querySelectorAll('.filter-pill-modern');
    const loadMoreBtn = document.querySelector('.btn-load-more');
    const btnAddFood = document.getElementById('btnAddFood');

    // Modal Elements
    const modal = document.getElementById('foodEditorModal');
    const editForm = document.getElementById('foodEditorForm');
    const closeBtn = document.querySelector('.close-modal');
    const cancelBtn = document.getElementById('btnCancelEdit');
    const iconDisplay = document.getElementById('iconDisplay');
    const btnChangeIcon = document.getElementById('btnChangeIcon');
    const iconPicker = document.getElementById('iconPicker');

    // New Favorites Elements
    const favoritesGrid = document.getElementById('favoritesGrid');
    const favoritesSection = document.getElementById('favoritesSection');
    const btnManageFavs = document.getElementById('btnManageFavs');
    const btnFilterFavs = document.getElementById('btnFilterFavs');

    // Initialize Data from LocalStorage or Fallback to Static Data
    // Initialize Data
    const DB_VERSION = "7.0"; // Ingredients Sync Update
    let savedVersion = localStorage.getItem(getUserKey('aureus_db_version'));
    let db = JSON.parse(localStorage.getItem(getUserKey('aureus_food_db')));

    // If version mismatch or no DB, perform a safe merge
    if (!db || savedVersion !== DB_VERSION) {
        if (!db) {
            db = [...foodDatabase];
        } else {
            // MERGE & SYNC LOGIC
            const localNamesMap = new Map();
            db.forEach((item, idx) => localNamesMap.set(item.name.toLowerCase().trim(), idx));

            foodDatabase.forEach(sourceItem => {
                const normalizedName = sourceItem.name.toLowerCase().trim();
                if (!localNamesMap.has(normalizedName)) {
                    // New item: Add it
                    console.log(`Merging new system item: ${sourceItem.name}`);
                    db.push(sourceItem);
                } else {
                    // Existing item: Sync missing fields
                    const idx = localNamesMap.get(normalizedName);

                    // Always sync icon if provided in source
                    if (sourceItem.icon) {
                        db[idx].icon = sourceItem.icon;
                    }

                    // Sync ingredients if source has them and local doesn't
                    if (sourceItem.ingredients && sourceItem.ingredients.length > 0) {
                        if (!db[idx].ingredients || db[idx].ingredients.length === 0) {
                            console.log(`Syncing ingredients for: ${sourceItem.name}`);
                            db[idx].ingredients = [...sourceItem.ingredients];
                        }
                    }

                    // If source now has NO image but has an icon, and local has an image,
                    // we might want to respect the system change if it's a system item.
                    // For now, let's just Sync image if provided and missing locally.
                    if (!db[idx].image && sourceItem.image) {
                        db[idx].image = sourceItem.image;
                    } else if (db[idx].image && !sourceItem.image && sourceItem.icon) {
                        // System removed image in favor of icon
                        console.log(`Removing image in favor of icon for: ${sourceItem.name}`);
                        delete db[idx].image;
                    }
                }
            });
        }
        localStorage.setItem(getUserKey('aureus_db_version'), DB_VERSION);
        localStorage.setItem(getUserKey('aureus_food_db'), JSON.stringify(db));
    }

    let selectedIcon = "fa-utensils";
    let currentIngredients = []; // For ingredients editor
    let editingIngredientIndex = -1;

    function saveToStorage() {
        localStorage.setItem(getUserKey('aureus_food_db'), JSON.stringify(db));
    }

    function renderFoodItems(items) {
        foodGrid.innerHTML = '';

        items.forEach((item) => {
            // Find the true index in the main 'db' array
            const trueIndex = db.indexOf(item);

            const card = document.createElement('div');
            card.className = 'db-food-card';

            const statusLabel = item.status.toUpperCase();

            // Handle Icon vs Image
            let visualElement = '';
            if (item.image) {
                // Fallback to icon if image fails
                const iconFallback = item.icon ? item.icon : 'fa-utensils';
                visualElement = `<img src="${item.image}" alt="${item.name}" class="db-card-custom-img" onerror="this.onerror=null; this.outerHTML='<i class=\\'fa-solid ${iconFallback}\\'></i>'">`;
            } else {
                const iconClass = item.icon ? item.icon : 'fa-utensils';
                visualElement = `<i class="fa-solid ${iconClass}"></i>`;
            }

            // Handle Favorite State
            const isFav = item.favourite === true;
            const bookmarkIcon = isFav ? 'fa-solid' : 'fa-regular';
            const bookmarkActive = isFav ? 'active' : '';

            card.innerHTML = `
                <div class="db-card-image">
                    ${visualElement}
                    <span class="status-badge ${item.status}">● ${statusLabel}</span>
                </div>
                <div class="db-card-content">
                    <div class="db-card-header">
                        <h3>${item.name}</h3>
                        <i class="${bookmarkIcon} fa-bookmark bookmark-btn ${bookmarkActive}"></i>
                    </div>
                    <p class="db-category">${item.category}</p>
                    
                    <div class="db-stats-capsule">
                        <div class="db-stat-group">
                            <span class="stat-label">PURINES</span>
                            <span class="stat-value purine">${item.purines}mg <small>/100g</small></span>
                        </div>
                        <div class="stat-divider"></div>
                        <div class="db-stat-group">
                            <span class="stat-label">NET CARBS</span>
                            <span class="stat-value carb">${item.carb}g <small>/100g</small></span>
                        </div>
                    </div>

                    <div class="db-tip-section">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <p>${item.tip}</p>
                    </div>
                </div>
            `;

            // Click to edit OR Select
            card.addEventListener('click', (e) => {
                // Don't open editor if we click the bookmark
                if (!e.target.classList.contains('bookmark-btn')) {
                    if (selectMode && targetMeal) {
                        addToLog(item, targetMeal);
                    } else {
                        openEditor(item, trueIndex);
                    }
                }
            });

            // Bookmark Toggle
            const bBtn = card.querySelector('.bookmark-btn');
            bBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavourite(item);
            });

            foodGrid.appendChild(card);
        });
    }

    function toggleFavourite(item) {
        item.favourite = !item.favourite;
        saveToStorage();
        renderFavorites();
        applyFilters();
    }

    function renderFavorites() {
        if (!favoritesGrid) return;

        const favs = db.filter(item => item.favourite === true);

        if (favs.length === 0) {
            favoritesSection.classList.add('hidden');
            return;
        }

        favoritesSection.classList.remove('hidden');
        favoritesGrid.innerHTML = '';

        favs.forEach(item => {
            const favCard = document.createElement('div');
            favCard.className = 'fav-food-card';

            let favVisual = '';
            if (item.image) {
                const iconFallback = item.icon ? item.icon : 'fa-utensils';
                favVisual = `<img src="${item.image}" alt="${item.name}" class="fav-custom-img" onerror="this.onerror=null; this.parentElement.innerHTML='<i class=\\'fa-solid ${iconFallback}\\'></i>'">`;
            } else {
                const iconClass = item.icon ? item.icon : 'fa-utensils';
                favVisual = `<i class="fa-solid ${iconClass}"></i>`;
            }

            favCard.innerHTML = `
                <div class="fav-food-icon">
                    ${favVisual}
                </div>
                <h4>${item.name}</h4>
            `;

            favCard.addEventListener('click', () => {
                const trueIndex = db.indexOf(item);
                openEditor(item, trueIndex);
            });

            favoritesGrid.appendChild(favCard);
        });
    }

    // Modal Logic
    function openEditor(item, index) {
        document.getElementById('editIndex').value = index;
        // Show delete button when editing existing item
        const btnDelete = document.getElementById('btnDeleteFood');
        if (btnDelete) btnDelete.classList.remove('hidden');

        document.getElementById('editName').value = item.name;
        document.getElementById('editCategory').value = item.category;
        document.getElementById('editPurines').value = item.purines;
        document.getElementById('editCarbs').value = item.carb;
        document.getElementById('editProt').value = item.prot;
        document.getElementById('editFat').value = item.fat;
        document.getElementById('editCal').value = item.cal;
        document.getElementById('editStatus').value = item.status;
        document.getElementById('editTip').value = item.tip;
        document.getElementById('editImage').value = item.image || "";

        selectedIcon = item.icon || "fa-utensils";
        updateModalIcon(selectedIcon, item.image);

        // Load ingredients - if item has none, try to sync from foodDatabase
        if (item.ingredients && item.ingredients.length > 0) {
            currentIngredients = [...item.ingredients];
        } else {
            // Try to find ingredients from source database
            currentIngredients = [];
            const normalizedName = item.name.toLowerCase().trim();
            const sourceItem = foodDatabase.find(f => f.name.toLowerCase().trim() === normalizedName);
            if (sourceItem && sourceItem.ingredients && sourceItem.ingredients.length > 0) {
                currentIngredients = [...sourceItem.ingredients];
                // Also sync ingredients to the item for future use
                item.ingredients = [...sourceItem.ingredients];
            }
        }
        renderIngredientsEditor();

        document.querySelector('.modal-header h2').innerText = 'Editar Alimento';
        modal.classList.remove('hidden');
    }

    // Expose for Meal Planner
    window.openEditor = openEditor;

    function openAddModal() {
        document.getElementById('editIndex').value = "";
        // Hide delete button for new items
        const btnDelete = document.getElementById('btnDeleteFood');
        if (btnDelete) btnDelete.classList.add('hidden');

        document.getElementById('editName').value = "";
        document.getElementById('editImage').value = "";
        document.getElementById('editPurines').value = "0";
        document.getElementById('editCarbs').value = "0";
        document.getElementById('editProt').value = "0";
        document.getElementById('editFat').value = "0";
        document.getElementById('editCal').value = "0";
        document.getElementById('editStatus').value = "safe";
        document.getElementById('editTip').value = "";

        selectedIcon = "fa-utensils";
        updateModalIcon(selectedIcon, "");

        // Reset ingredients
        currentIngredients = [];
        renderIngredientsEditor();

        document.querySelector('.modal-header h2').innerText = 'Nuevo Alimento';
        modal.classList.remove('hidden');
    }

    function updateModalIcon(iconClass, imageUrl) {
        if (imageUrl) {
            iconDisplay.innerHTML = `<img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;">`;
        } else {
            iconDisplay.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        }
        selectedIcon = iconClass;
        iconPicker.classList.add('hidden');
    }

    // Live update of icon display when typing URL
    document.getElementById('editImage').addEventListener('input', (e) => {
        updateModalIcon(selectedIcon, e.target.value);
    });

    // Icon Picker logic
    const iconSearch = document.getElementById('iconSearchInput');
    const pickerGrid = document.getElementById('iconPickerGrid');
    const pickerIcons = document.querySelectorAll('#iconPickerGrid i');

    btnChangeIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        iconPicker.classList.toggle('hidden');
    });

    if (iconSearch) {
        iconSearch.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            pickerIcons.forEach(icon => {
                const iconName = icon.dataset.icon.toLowerCase();
                const title = icon.getAttribute('title') ? icon.getAttribute('title').toLowerCase() : "";
                if (iconName.includes(term) || title.includes(term)) {
                    icon.style.display = 'flex';
                } else {
                    icon.style.display = 'none';
                }
            });
        });
    }

    pickerIcons.forEach(icon => {
        icon.addEventListener('click', () => {
            // Clear image URL if an icon is selected from picker
            document.getElementById('editImage').value = "";
            selectedIcon = icon.dataset.icon;
            updateModalIcon(selectedIcon, "");
            iconPicker.classList.add('hidden');

            // Highlight selected icon
            pickerIcons.forEach(i => i.classList.remove('selected'));
            icon.classList.add('selected');
        });
    });

    // Close modal
    [closeBtn, cancelBtn].forEach(btn => {
        btn.addEventListener('click', () => modal.classList.add('hidden'));
    });

    // Save changes
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const index = document.getElementById('editIndex').value;

        // Update data in the main array
        const foodData = {
            name: document.getElementById('editName').value,
            category: document.getElementById('editCategory').value,
            purines: parseInt(document.getElementById('editPurines').value) || 0,
            carb: parseFloat(document.getElementById('editCarbs').value) || 0,
            prot: parseFloat(document.getElementById('editProt').value) || 0,
            fat: parseFloat(document.getElementById('editFat').value) || 0,
            cal: parseInt(document.getElementById('editCal').value) || 0,
            status: document.getElementById('editStatus').value,
            tip: document.getElementById('editTip').value,
            image: document.getElementById('editImage').value,
            icon: selectedIcon,
            ingredients: currentIngredients.length > 0 ? [...currentIngredients] : undefined
        };

        if (index === "") {
            db.unshift(foodData);
        } else {
            db[index] = {
                ...db[index],
                ...foodData
            };
        }

        saveToStorage();
        modal.classList.add('hidden');
        applyFilters();
    });

    // Delete persistence logic
    const deleteBtn = document.createElement('button');
    deleteBtn.type = "button";
    deleteBtn.className = "btn-delete-modern hidden";
    deleteBtn.id = "btnDeleteFood";
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
    document.querySelector('.modal-footer').prepend(deleteBtn);

    deleteBtn.addEventListener('click', () => {
        const index = document.getElementById('editIndex').value;
        if (index !== "" && confirm('¿Estás seguro de eliminar este alimento?')) {
            db.splice(index, 1);
            saveToStorage();
            modal.classList.add('hidden');
            applyFilters();
        }
    });

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const activeFilter = document.querySelector('.filter-pill-modern.active').innerText;

        let filtered = db.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm) ||
                item.category.toLowerCase().includes(searchTerm);

            let matchesFilter = true;
            if (activeFilter === 'Safe') matchesFilter = (item.status === 'safe');
            else if (activeFilter === 'Caution') matchesFilter = (item.status === 'caution');
            else if (activeFilter === 'Avoid') matchesFilter = (item.status === 'avoid');
            else if (activeFilter === 'Meats') matchesFilter = (item.category === 'Meats' || item.category === 'Poultry');
            else if (activeFilter === 'Seafood') matchesFilter = (item.category === 'Seafood');
            else if (activeFilter === 'Veggies') matchesFilter = (item.category === 'Veggies');
            else if (activeFilter === 'Drinks') matchesFilter = (item.category === 'Drinks');
            else if (activeFilter.includes('Favorites')) matchesFilter = (item.favourite === true);

            return matchesSearch && matchesFilter;
        });

        renderFoodItems(filtered);
    }

    // Event Listeners
    searchInput.addEventListener('input', applyFilters);

    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            applyFilters();
        });
    });

    if (btnAddFood) {
        btnAddFood.addEventListener('click', openAddModal);
    }

    // Manage/Filter Favorites
    if (btnManageFavs && btnFilterFavs) {
        btnManageFavs.addEventListener('click', () => {
            btnFilterFavs.click();
            // Scroll to grid
            foodGrid.scrollIntoView({ behavior: 'smooth' });
        });
    }

    // ===== INGREDIENTS EDITOR LOGIC =====
    function renderIngredientsEditor() {
        const grid = document.getElementById('editIngredientsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        currentIngredients.forEach((ing, index) => {
            const card = document.createElement('div');
            card.className = 'ingredient-card-edit';
            card.innerHTML = `
                <span class="ing-name">${ing.name}</span>
                <span class="ing-amount">${ing.amount || ''}</span>
            `;
            card.addEventListener('click', (e) => {
                e.stopPropagation();
                openIngredientMiniModal(index);
            });
            grid.appendChild(card);
        });
    }

    function openIngredientMiniModal(index) {
        editingIngredientIndex = index;
        const miniModal = document.getElementById('ingredientMiniModal');
        const titleEl = document.getElementById('miniModalTitle');
        const nameInput = document.getElementById('ingEditName');
        const amountInput = document.getElementById('ingEditAmount');
        const deleteBtn = document.getElementById('btnDeleteIng');

        if (index === -1) {
            // Adding new ingredient
            titleEl.innerText = 'Añadir Ingrediente';
            nameInput.value = '';
            amountInput.value = '';
            deleteBtn.style.display = 'none';
        } else {
            // Editing existing
            titleEl.innerText = 'Editar Ingrediente';
            nameInput.value = currentIngredients[index].name || '';
            amountInput.value = currentIngredients[index].amount || '';
            deleteBtn.style.display = 'flex';
        }

        miniModal.classList.remove('hidden');
        nameInput.focus();
    }

    function closeIngredientMiniModal() {
        document.getElementById('ingredientMiniModal')?.classList.add('hidden');
        editingIngredientIndex = -1;
    }

    // Add Ingredient Button
    const btnAddIng = document.getElementById('btnAddIngredient');
    if (btnAddIng) {
        btnAddIng.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openIngredientMiniModal(-1);
        });
    }

    // Close Mini Modal
    const closeMiniBtn = document.getElementById('closeMiniModal');
    if (closeMiniBtn) {
        closeMiniBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeIngredientMiniModal();
        });
    }

    // Save Ingredient
    const btnSaveIng = document.getElementById('btnSaveIng');
    if (btnSaveIng) {
        btnSaveIng.addEventListener('click', (e) => {
            e.preventDefault();
            const name = document.getElementById('ingEditName').value.trim();
            const amount = document.getElementById('ingEditAmount').value.trim();

            if (!name) {
                alert('Por favor ingresa un nombre para el ingrediente');
                return;
            }

            if (editingIngredientIndex === -1) {
                // Add new
                currentIngredients.push({ name, amount });
            } else {
                // Update existing
                currentIngredients[editingIngredientIndex] = { name, amount };
            }

            renderIngredientsEditor();
            closeIngredientMiniModal();
        });
    }

    // Delete Ingredient
    const btnDelIng = document.getElementById('btnDeleteIng');
    if (btnDelIng) {
        btnDelIng.addEventListener('click', (e) => {
            e.preventDefault();
            if (editingIngredientIndex > -1) {
                currentIngredients.splice(editingIngredientIndex, 1);
                renderIngredientsEditor();
                closeIngredientMiniModal();
            }
        });
    }

    // Close mini modal when clicking outside
    document.getElementById('ingredientMiniModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'ingredientMiniModal') {
            closeIngredientMiniModal();
        }
    });

    // Initial render
    renderFoodItems(db);
    renderFavorites();

    function addToLog(item, mealKey) {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const LOG_KEY = getUserKey(`aureus_log_${y}-${m}-${d}`);

        let logData = JSON.parse(localStorage.getItem(LOG_KEY));

        if (!logData) {
            logData = {
                date: now.toLocaleDateString(),
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
            name: item.name,
            sub: item.category,
            cals: item.cal || 0,
            purine: (item.purines !== undefined) ? item.purines : (item.purine || 0),
            carb: item.carb || 0,
            fat: item.fat || 0,
            prot: item.prot || 0,
            highPurine: ((item.purines || 0) > 100)
        };

        if (logData.meals[mealKey]) {
            logData.meals[mealKey].items.push(newItem);
            localStorage.setItem(LOG_KEY, JSON.stringify(logData));
            window.location.href = 'food-log.html';
        } else {
            console.error("Invalid meal key:", mealKey);
            alert("Error: Invalid meal selected.");
        }
    }
});
