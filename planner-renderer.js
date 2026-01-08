document.addEventListener('DOMContentLoaded', () => {

    // --- References ---
    const libraryList = document.getElementById('libraryList');
    const weeklyGridBody = document.getElementById('weeklyGridBody');
    const librarySearch = document.getElementById('librarySearch');
    const currentWeekNum = document.getElementById('currentWeekNum');
    const weekDateRange = document.getElementById('weekDateRange');
    const saveTemplateModal = document.getElementById('saveTemplateModal');
    const templateNameInput = document.getElementById('templateNameInput');
    const templateDescInput = document.getElementById('templateDescInput');

    // --- State ---
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    // Mock current date for "Next Week" planning
    let baseDate = new Date();
    // Adjust to Monday of current week
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day == 0 ? -6 : 1);
    let mondayDate = new Date(baseDate.setDate(diff));

    let weeklyPlan = JSON.parse(localStorage.getItem(getUserKey('aureus_weekly_plan'))) || {};

    // --- Initialization ---
    renderHeaderDates();
    renderLibrary();
    renderGridStructure();
    loadSavedPlan();

    document.addEventListener('aureus-global-save', (e) => {
        // For the planner, we usually open the template modal or just save
        if (saveTemplateModal) {
            saveTemplateModal.classList.remove('hidden');
            templateNameInput.value = '';
            templateDescInput.value = '';
            templateNameInput.focus();
        }
    });

    // --- Header Dates ---
    function renderHeaderDates() {
        // Mocking the visual "Oct 16 - Oct 22" matching the user request image, 
        // but normally this would be dynamic based on 'mondayDate'
        const options = { month: 'short', day: 'numeric' };

        // Loop through header cells to update dates
        const dayHeaders = document.querySelectorAll('.day-col-header');
        dayHeaders.forEach((el, index) => {
            let d = new Date(mondayDate);
            d.setDate(mondayDate.getDate() + index);

            const numEl = el.querySelector('.day-num');
            if (numEl) numEl.innerText = d.getDate();

            // Reset classes
            el.classList.remove('weekend');
            const nameEl = el.querySelector('.day-name');
            if (nameEl) nameEl.classList.remove('active');
            if (numEl) numEl.classList.remove('active');

            // Weekend highlight (Saturday is index 5, Sunday is index 6 since we start from Monday)
            if (index === 5 || index === 6) {
                el.classList.add('weekend');
            }

            // Highlight today
            const today = new Date();
            if (d.toDateString() === today.toDateString()) {
                if (nameEl) nameEl.classList.add('active');
                if (numEl) numEl.classList.add('active');
                el.classList.add('today');
            } else {
                el.classList.remove('today');
            }
        });

        // Update range text
        let sunday = new Date(mondayDate);
        sunday.setDate(mondayDate.getDate() + 6);
        weekDateRange.innerText = `${mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }

    // --- Render Library ---
    function renderLibrary(filterString = '') {
        libraryList.innerHTML = '';

        // Get active filter
        const activeTab = document.querySelector('.filter-pill.active');
        const activeFilter = activeTab ? activeTab.dataset.filter : 'all';

        // Initialize Data from LocalStorage if available (SYNC WITH DATABASE)
        let db = JSON.parse(localStorage.getItem(getUserKey('aureus_food_db')));
        if (!db) {
            db = [...foodDatabase];
        }
        let items = [...db];

        // Apply Category Filter

        if (activeFilter !== 'all') {
            if (activeFilter === 'favorites') {
                items = items.filter(f => f.favourite);
            }
        }

        // Apply Search Filter
        if (filterString) {
            items = items.filter(f => f.name.toLowerCase().includes(filterString.toLowerCase()));
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'lib-food-item';
            div.draggable = true; // Enable Drag
            div.dataset.food = JSON.stringify(item); // Store data for touch/click events if needed

            // Choose image or icon
            let media = '';
            if (item.image) {
                media = `<img src="${item.image}" class="lib-thumb">`;
            } else {
                media = `<div class="lib-icon-placeholder"><i class="fa-solid ${item.icon || 'fa-utensils'}"></i></div>`;
            }

            // Status color
            let statusClass = item.status || 'safe';

            div.innerHTML = `
                ${media}
                <div class="lib-info">
                    <div class="lib-name">${item.name}</div>
                    <div class="lib-meta">${item.purines || 0}mg Purines • ${item.carb || 0}g Carb</div>
                </div>
                <div class="lib-status-dot ${statusClass}" style="margin-left: auto; margin-right: 10px;"></div>
                <i class="fa-solid fa-grip-vertical" style="color: #333;"></i>
            `;



            // Drag Event
            div.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify(item));
                e.dataTransfer.effectAllowed = 'copy';
                div.classList.add('dragging');
            });

            div.addEventListener('dragend', () => {
                div.classList.remove('dragging');
            });

            // Click to Edit (New Feature)
            div.addEventListener('click', (e) => {
                // Determine index in global array
                const index = db.findIndex(f => f.id === item.id || f.name === item.name);
                if (index !== -1 && window.openEditor) {
                    window.openEditor(item, index);
                }
            });

            libraryList.appendChild(div);
        });
    }

    // --- Render Grid ---
    function renderGridStructure() {
        const meals = [
            { id: 'breakfast', label: 'BREAKFAST', icon: 'fa-sun' },
            { id: 'lunch', label: 'LUNCH', icon: 'fa-stopwatch' },
            { id: 'dinner', label: 'DINNER', icon: 'fa-moon' },
            { id: 'snack', label: 'SNACK', icon: 'fa-apple-whole' },
            { id: 'drinks', label: 'DRINKS', icon: 'fa-glass-water' }
        ];

        weeklyGridBody.innerHTML = '';

        meals.forEach(meal => {
            const row = document.createElement('div');
            row.className = 'grid-row';

            // Row Label
            const labelCell = document.createElement('div');
            labelCell.className = 'grid-label-cell';
            labelCell.innerHTML = `
                <div class="meal-icon-circle"><i class="fa-solid ${meal.icon}"></i></div>
                <span class="meal-label-text">${meal.label}</span>
            `;
            row.appendChild(labelCell);

            // Day Cells
            days.forEach((day, index) => {
                const cell = document.createElement('div');
                cell.style.minWidth = '0'; // Allow shrinking
                cell.style.width = '100%'; // Fill grid column
                cell.className = 'grid-cell';
                cell.dataset.day = day;
                cell.dataset.meal = meal.id;
                cell.id = `cell-${day}-${meal.id}`; // Unique ID for easy lookup

                // Placeholder "Add" button
                cell.innerHTML = `<div class="add-cell-btn"><i class="fa-solid fa-plus"></i></div>`;

                // Drag Drop Logic
                cell.addEventListener('dragover', (e) => {
                    e.preventDefault(); // Allow drop
                    cell.classList.add('drag-over');
                });

                cell.addEventListener('dragleave', () => {
                    cell.classList.remove('drag-over');
                });

                cell.addEventListener('drop', (e) => {
                    e.preventDefault();
                    cell.classList.remove('drag-over');

                    const stored = e.dataTransfer.getData('text/plain');
                    const sourceDay = e.dataTransfer.getData('source_day');
                    const sourceMeal = e.dataTransfer.getData('source_meal');

                    if (stored) {
                        try {
                            const foodItem = JSON.parse(stored);

                            // Check if it's a move operation (same day/meal move could be blocked if desired, but we'll allow re-ordering intent visually)
                            if (sourceDay && sourceMeal) {
                                // If dropped in same cell, do nothing or handle reorder (we'll just return to prevent dupes if simple list)
                                if (sourceDay === cell.dataset.day && sourceMeal === cell.dataset.meal) return;

                                // Remove from old location
                                removeFromStorage(sourceDay, sourceMeal, foodItem.name);
                                const sourceCell = document.getElementById(`cell-${sourceDay}-${sourceMeal}`);
                                if (sourceCell) {
                                    // Remove the specific tag visually from source
                                    const tags = sourceCell.querySelectorAll('.plan-meal-tag');
                                    for (const t of tags) {
                                        if (t.querySelector('.tag-name').innerText === foodItem.name) {
                                            t.remove();
                                            break;
                                        }
                                    }
                                    // Restore placeholder if empty
                                    if (sourceCell.children.length === 0) {
                                        sourceCell.innerHTML = `<div class="add-cell-btn"><i class="fa-solid fa-plus"></i></div>`;
                                    }
                                }
                            }

                            addFoodToCell(cell, foodItem, true); // true = save to storage
                        } catch (e) { console.error("Drop error", e); }
                    }
                });

                // Click to add placeholder (Optional: could open modal)
                cell.addEventListener('click', (e) => {
                    if (e.target.closest('.add-cell-btn')) {
                        // Placeholder click interaction
                    }
                });

                row.appendChild(cell);
            });

            weeklyGridBody.appendChild(row);
        });
    }

    function addFoodToCell(cell, item, save = false) {
        // Clear cell if it has placeholder
        if (cell.querySelector('.add-cell-btn')) {
            cell.innerHTML = '';
        }

        const tag = document.createElement('div');
        tag.className = 'plan-meal-tag';
        tag.draggable = true; // Enable Drag for Move
        // Fade in
        tag.style.animation = 'fadeIn 0.3s ease';

        tag.innerHTML = `
            <div class="tag-content">
                <span class="tag-dot" style="background:${item.status === 'safe' ? '#d4f458' : (item.status === 'avoid' ? '#ff4d4d' : '#ffa500')}"></span>
                <span class="tag-name">${item.name}</span>
            </div>
            <i class="fa-solid fa-xmark remove-btn"></i>
        `;

        // Drag Start (Move)
        tag.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify(item));
            e.dataTransfer.setData('source_day', cell.dataset.day);
            e.dataTransfer.setData('source_meal', cell.dataset.meal);
            e.dataTransfer.effectAllowed = 'move';
            tag.classList.add('moving');
        });

        tag.addEventListener('dragend', () => {
            tag.classList.remove('moving');
        });

        // Remove listener (Specific X button)
        tag.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent opening edit modal

            // Visual Remove
            tag.remove();

            // Check if empty
            if (cell.children.length === 0) {
                cell.innerHTML = `<div class="add-cell-btn"><i class="fa-solid fa-plus"></i></div>`;
            }

            // Update Storage
            removeFromStorage(cell.dataset.day, cell.dataset.meal, item.name);
        });

        // Optional: Main tag click could show details
        tag.addEventListener('click', () => {
            openEditModal(item, cell);
        });

        cell.appendChild(tag);

        if (save) {
            saveToStorage(cell.dataset.day, cell.dataset.meal, item);
        }
    }

    // --- Storage Logic ---
    function saveToStorage(day, mealType, item) {
        if (!weeklyPlan[day]) weeklyPlan[day] = {};
        if (!weeklyPlan[day][mealType]) weeklyPlan[day][mealType] = [];

        weeklyPlan[day][mealType].push(item);
        localStorage.setItem(getUserKey('aureus_weekly_plan'), JSON.stringify(weeklyPlan));
        updateDailySummaries();
    }

    function removeFromStorage(day, mealType, itemName) {
        if (weeklyPlan[day] && weeklyPlan[day][mealType]) {
            weeklyPlan[day][mealType] = weeklyPlan[day][mealType].filter(i => i.name !== itemName);
            localStorage.setItem(getUserKey('aureus_weekly_plan'), JSON.stringify(weeklyPlan));
            updateDailySummaries();
        }
    }

    function loadSavedPlan() {
        if (!weeklyPlan) return;

        // Iterate through days and meals
        for (const [day, meals] of Object.entries(weeklyPlan)) {
            for (const [mealType, items] of Object.entries(meals)) {
                const cellId = `cell-${day}-${mealType}`;
                const cell = document.getElementById(cellId);
                if (cell && items.length > 0) {
                    items.forEach(item => {
                        addFoodToCell(cell, item, false); // false = don't re-save
                    });
                }
            }
        }
    }

    // --- Daily Summaries ---
    function updateDailySummaries() {
        days.forEach(day => {
            let totalCal = 0;
            let totalPurines = 0;
            let totalFat = 0;
            let totalProt = 0;
            let totalCarb = 0;

            const dayPlan = weeklyPlan[day];
            if (dayPlan) {
                // Iterate breakfast, lunch, dinner
                Object.values(dayPlan).forEach(mealItems => {
                    mealItems.forEach(item => {
                        totalCal += Number(item.cal) || 0;
                        totalPurines += Number(item.purines) || 0;
                        totalFat += Number(item.fat) || 0;
                        totalProt += Number(item.prot) || 0;
                        totalCarb += Number(item.carb) || 0;
                    });
                });
            }

            const summaryEl = document.getElementById(`summary-${day}`);
            if (summaryEl) {
                // Mock layout as per request
                summaryEl.innerHTML = `
                    <div class="sum-cal">${Math.round(totalCal).toLocaleString()} KCAL</div>
                    <div class="sum-line" style="color:#d4f458">${Math.round(totalPurines)}mg Purine</div>
                    <div class="sum-line">
                        <span>Fat ${Math.round(totalFat)}g</span>
                        <span>Prot ${Math.round(totalProt)}g</span>
                        <span>Carb ${Math.round(totalCarb)}g</span>
                    </div>
                `;
            }
        });
    }

    // --- Edit Modal Logic ---
    const editModal = document.getElementById('editMealModal');
    const editName = document.getElementById('editMealName');
    const editCal = document.getElementById('editMealCal');
    const editPurines = document.getElementById('editMealPurines');
    const editFat = document.getElementById('editMealFat');
    const editProt = document.getElementById('editMealProt');
    const editCarb = document.getElementById('editMealCarb');
    const btnSave = document.getElementById('saveEditBtn');
    const btnCancel = document.getElementById('cancelEditBtn');
    const btnDelete = document.getElementById('deleteMealBtn');

    let currentEditItem = null;
    let currentEditCell = null;

    function openEditModal(item, cell) {
        currentEditItem = item;
        currentEditCell = cell;

        editName.value = item.name;
        editCal.value = item.cal || 0;
        editPurines.value = item.purines || 0;
        editFat.value = item.fat || 0;
        editProt.value = item.prot || 0;
        editCarb.value = item.carb || 0;

        editModal.classList.remove('hidden');
    }

    function closeEditModal() {
        editModal.classList.add('hidden');
        currentEditItem = null;
        currentEditCell = null;
    }

    btnCancel.addEventListener('click', closeEditModal);

    btnSave.addEventListener('click', () => {
        if (!currentEditItem || !currentEditCell) return;

        // Update item values
        const newItem = { ...currentEditItem };
        newItem.name = editName.value;
        newItem.cal = Number(editCal.value);
        newItem.purines = Number(editPurines.value);
        newItem.fat = Number(editFat.value);
        newItem.prot = Number(editProt.value);
        newItem.carb = Number(editCarb.value);

        // Update CSS/HTML in cell
        const tags = currentEditCell.querySelectorAll('.plan-meal-tag');
        for (const t of tags) {
            // Find the tag we are editing. 
            // Limitation: If multiple items have exact same name, this might conflict.
            // For now, rely on previous name matching.
            if (t.querySelector('.tag-name').innerText === currentEditItem.name) {
                t.querySelector('.tag-name').innerText = newItem.name;
                // Update color dot if status changed? We don't edit status here, so ignore.

                // Update listeners for new item data (Closure binding fix)
                // Actually easier to just re-render this tag or swap its click handler data.
                // We'll update storage and reload the grid cell.
                break;
            }
        }

        // Update Storage
        updateItemInStorage(currentEditCell.dataset.day, currentEditCell.dataset.meal, currentEditItem.name, newItem);

        closeEditModal();

        // Re-render entire grid or just update UI? 
        // Simplest to just reload saved plan for accuracy or direct DOM manip + storage.
        // Let's do clear cell + re-add for simplicity.
        // Or better: Reload page? No.
        // Let's update storage logic to support edit first.
    });

    btnDelete.addEventListener('click', () => {
        if (!currentEditItem || !currentEditCell) return;
        if (confirm(`Delete ${currentEditItem.name}?`)) {
            // Visual Remove
            const tags = currentEditCell.querySelectorAll('.plan-meal-tag');
            for (const t of tags) {
                if (t.querySelector('.tag-name').innerText === currentEditItem.name) {
                    t.remove();
                    break;
                }
            }
            if (currentEditCell.children.length === 0) {
                currentEditCell.innerHTML = `<div class="add-cell-btn"><i class="fa-solid fa-plus"></i></div>`;
            }

            // Storage Remove
            removeFromStorage(currentEditCell.dataset.day, currentEditCell.dataset.meal, currentEditItem.name);
            closeEditModal();
        }
    });

    function updateItemInStorage(day, mealType, oldName, newItem) {
        if (weeklyPlan[day] && weeklyPlan[day][mealType]) {
            const index = weeklyPlan[day][mealType].findIndex(i => i.name === oldName);
            if (index !== -1) {
                weeklyPlan[day][mealType][index] = newItem;
                localStorage.setItem(getUserKey('aureus_weekly_plan'), JSON.stringify(weeklyPlan));
                updateDailySummaries();

                // Refresh Grid to reflect data binding changes (hacky but safe)
                // Actually, let's just re-render that specific cell.
                const cell = document.getElementById(`cell-${day}-${mealType}`);
                cell.innerHTML = '';
                // Restore logic 
                weeklyPlan[day][mealType].forEach(itm => addFoodToCell(cell, itm, false));
            }
        }
    }


    // --- Search Listener ---
    librarySearch.addEventListener('input', (e) => {
        renderLibrary(e.target.value);
    });

    // --- Tab Listeners ---
    document.querySelectorAll('.filter-pill').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-pill').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderLibrary(librarySearch.value);
        });
    });

    // Initial update
    updateDailySummaries();

    // --- TEMPLATE LOGIC (Added Feature) ---
    // 1. Open Modal handled by global-sync e.dispatchEvent(new CustomEvent('aureus-global-save'))
    // but we can still keep the old ID listener for backward compatibility if needed, 
    // although we changed the ID in HTML to globalSaveBtn.
    const globalBtn = document.getElementById('globalSaveBtn');
    if (globalBtn) {
        // global-sync.js already adds a click listener to this, 
        // we just listen for the custom event.
    }

    const confirmSaveTemplate = document.getElementById('confirmSaveTemplate');
    const templateList = document.getElementById('templateList');
    const closeSaveModalBtns = document.querySelectorAll('.close-modal-save');

    let savedTemplates = JSON.parse(localStorage.getItem(getUserKey('aureus_plan_templates'))) || [];

    // Initialize Templates
    renderTemplates();

    // 2. Close Modal
    if (closeSaveModalBtns) {
        closeSaveModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                saveTemplateModal.classList.add('hidden');
            });
        });
    }

    // 3. Save Logic
    if (confirmSaveTemplate) {
        confirmSaveTemplate.addEventListener('click', () => {
            const name = templateNameInput.value.trim();
            const desc = templateDescInput.value.trim();

            if (!name) {
                alert("Please enter a template name.");
                return;
            }

            // Create Template Object
            const newTemplate = {
                id: Date.now().toString(),
                name: name,
                desc: desc || `${new Date().toLocaleDateString()}`,
                planData: JSON.parse(JSON.stringify(weeklyPlan)), // Deep copy current plan
                dateCreated: new Date().toISOString()
            };

            // Save
            savedTemplates.push(newTemplate);
            localStorage.setItem(getUserKey('aureus_plan_templates'), JSON.stringify(savedTemplates));

            // Update UI
            renderTemplates();
            saveTemplateModal.classList.add('hidden');

            // Optional: Confirmation toast
            // console.log("Template Saved", newTemplate);
        });
    }

    // 4. Render Logic
    function renderTemplates() {
        if (!templateList) return;
        templateList.innerHTML = '';

        if (savedTemplates.length === 0) {
            templateList.innerHTML = `<div style="text-align:center; color:#555; font-size:12px; padding:10px;">No saved templates yet</div>`;
            return;
        }

        savedTemplates.forEach(tmpl => {
            const item = document.createElement('div');
            item.className = 'template-item';

            // Random bar color for visual variety or based on something? 
            // Logic: green vs yellow vs red based on calorie density? 
            // We'll standardise or randomise for now.
            const barColor = ['green', 'yellow', 'purple', 'blue'][Math.floor(Math.random() * 4)];

            item.innerHTML = `
                <div class="tmpl-left">
                    <div class="tmpl-bar ${barColor}"></div>
                    <div class="tmpl-info">
                        <div class="tmpl-name">${tmpl.name}</div>
                        <div class="tmpl-meta">${tmpl.desc}</div>
                    </div>
                </div>
                <div class="tmpl-actions">
                     <button class="btn-delete-tmpl" title="Delete"><i class="fa-solid fa-trash"></i></button>
                     <button class="btn-import-tmpl" title="Load Plan"><i class="fa-solid fa-download"></i></button>
                </div>
             `;

            // Load Action
            item.querySelector('.btn-import-tmpl').addEventListener('click', () => {
                if (confirm(`Load template "${tmpl.name}"? This will overwrite your current week.`)) {
                    weeklyPlan = JSON.parse(JSON.stringify(tmpl.planData));
                    localStorage.setItem(getUserKey('aureus_weekly_plan'), JSON.stringify(weeklyPlan));

                    // Refresh Grid
                    weeklyGridBody.innerHTML = ''; // Clear all
                    renderGridStructure(); // Re-build grid structure
                    loadSavedPlan(); // Load data into grid
                    updateDailySummaries(); // Recalculate properties
                }
            });

            // Delete Action
            item.querySelector('.btn-delete-tmpl').addEventListener('click', () => {
                if (confirm('Delete this template?')) {
                    savedTemplates = savedTemplates.filter(t => t.id !== tmpl.id);
                    localStorage.setItem(getUserKey('aureus_plan_templates'), JSON.stringify(savedTemplates));
                    renderTemplates();
                }
            });

            templateList.appendChild(item);
        });
    }

    // --- SHOPPING LIST LOGIC ---
    const btnShoppingList = document.getElementById('btnShoppingList');
    const shoppingListModal = document.getElementById('shoppingListModal');
    const shoppingListContainer = document.getElementById('shoppingListContainer');
    const closeShoppingBtns = document.querySelectorAll('.close-modal-shopping');
    const btnPrintShopping = document.getElementById('btnPrintShopping');

    if (btnShoppingList) {
        btnShoppingList.addEventListener('click', () => {
            generateShoppingList();
            shoppingListModal.classList.remove('hidden');
        });
    }

    closeShoppingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            shoppingListModal.classList.add('hidden');
        });
    });

    function generateShoppingList() {
        if (!shoppingListContainer) return;
        shoppingListContainer.innerHTML = '';

        const itemCounts = {};

        // Aggregate All Items
        Object.values(weeklyPlan).forEach(dayMeals => {
            Object.values(dayMeals).forEach(mealItems => {
                mealItems.forEach(item => {
                    if (itemCounts[item.name]) {
                        itemCounts[item.name].count++;
                    } else {
                        itemCounts[item.name] = {
                            count: 1,
                            category: item.category || 'Others'
                        };
                    }
                });
            });
        });

        // Group by Category
        const grouped = {};
        Object.entries(itemCounts).forEach(([name, data]) => {
            const cat = data.category;
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ name, count: data.count });
        });

        const catOrder = ['Meats', 'Poultry', 'Seafood', 'Veggies', 'Fruits', 'Dairy', 'Nuts', 'Drinks', 'Fast Food', 'Others'];
        const sortedCats = Object.keys(grouped).sort((a, b) => {
            const idxA = catOrder.indexOf(a);
            const idxB = catOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        if (sortedCats.length === 0) {
            shoppingListContainer.innerHTML = '<div style="color:#666; text-align:center;">No meals planned yet.</div>';
            return;
        }

        sortedCats.forEach(cat => {
            const header = document.createElement('div');
            header.className = 'shopping-cat-header';
            header.innerText = cat;
            shoppingListContainer.appendChild(header);

            // Sort alphabetical
            grouped[cat].sort((a, b) => a.name.localeCompare(b.name)).forEach(item => {
                const row = document.createElement('div');
                row.className = 'shopping-item-row';
                row.innerHTML = `
                    <label class="custom-checkbox">
                        <input type="checkbox">
                        <span class="checkmark"></span>
                    </label>
                    <span class="shop-name">${item.name}</span>
                    <span class="shop-count">x${item.count}</span>
                `;
                shoppingListContainer.appendChild(row);
            });
        });
    }

    if (btnPrintShopping) {
        btnPrintShopping.addEventListener('click', () => {
            let textToCopy = "AUREUS FIT AI - Shopping List\n";

            // Traverse DOM to preserve order
            Array.from(shoppingListContainer.children).forEach(child => {
                if (child.classList.contains('shopping-cat-header')) {
                    textToCopy += `\n[ ${child.innerText.toUpperCase()} ]\n`;
                } else if (child.classList.contains('shopping-item-row')) {
                    const name = child.querySelector('.shop-name').innerText;
                    const count = child.querySelector('.shop-count').innerText;
                    textToCopy += `- [ ] ${name} ${count}\n`;
                }
            });

            navigator.clipboard.writeText(textToCopy).then(() => {
                alert("Shopping list copied to clipboard!");
            });
        });
    }



    // --- PDF REPORT GENERATION ---
    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', generatePDFReport);
    }

    async function generatePDFReport() {
        if (!window.jspdf || !window.jspdf.jsPDF || !window.Chart) {
            alert("Generating PDF resources... please wait a moment.");
            return;
        }

        // RELOAD DATA: Ensure we have the latest plan from storage
        weeklyPlan = JSON.parse(localStorage.getItem(getUserKey('aureus_weekly_plan'))) || {};

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;
        let yPos = 20;

        // --- HELPERS ---
        const loadImage = (url) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = url;
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null); // Continue even if logo fails
            });
        };

        const createChartImage = async (type, data, options, width = 400, height = 200) => {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.style.display = "none"; // Keep hidden
            document.body.appendChild(canvas);

            const ctx = canvas.getContext("2d");

            // Create Chart
            const chartObj = new Chart(ctx, {
                type: type,
                data: data,
                options: {
                    ...options,
                    responsive: false,
                    animation: false,
                    devicePixelRatio: 2 // High res
                }
            });

            // Wait for render ? chart.js sync render if animation false?
            // Usually need a small tick or toBase64 immediately if animation is 0.

            const imgData = canvas.toDataURL("image/png");

            chartObj.destroy();
            document.body.removeChild(canvas);
            return imgData;
        };

        // --- ASSETS LOADING ---
        // 1. Logo
        const logoImg = await loadImage("images/logo.png");

        // 2. data Prep for Charts
        let totalWkCal = 0, totalWkPur = 0, totalWkFat = 0, totalWkProt = 0, totalWkCarb = 0;
        const dailyCals = [];
        const dayLabelsFull = [];

        // Helper map
        const dayMap = {
            mon: "Lunes", tue: "Martes", wed: "Miércoles", thu: "Jueves", fri: "Viernes", sat: "Sábado", sun: "Domingo"
        };
        const shortDays = { mon: "LB", tue: "MA", wed: "MI", thu: "JU", fri: "VI", sat: "SA", sun: "DO" };

        days.forEach(day => {
            let dCal = 0;
            const dayPlan = weeklyPlan[day];
            if (dayPlan) {
                Object.values(dayPlan).forEach(mealItems => {
                    mealItems.forEach(item => {
                        const c = Number(item.cal) || 0;
                        dCal += c;
                        totalWkCal += c;
                        totalWkPur += Number(item.purines) || 0;
                        totalWkFat += Number(item.fat) || 0;
                        totalWkProt += Number(item.prot) || 0;
                        totalWkCarb += Number(item.carb) || 0;
                    });
                });
            }
            dailyCals.push(Math.round(dCal));
            dayLabelsFull.push(dayMap[day].substring(0, 3)); // Short labels
        });

        // 3. Generate Charts
        // A) Macro Distribution (Pie/Doughnut)
        // Global Avgs
        const avgFat = Math.round(totalWkFat / 7);
        const avgProt = Math.round(totalWkProt / 7);
        const avgCarb = Math.round(totalWkCarb / 7);

        const macroChartUrl = await createChartImage("doughnut", {
            labels: ["Prot (g)", "Carb (g)", "Grasa (g)"],
            datasets: [{
                data: [avgProt, avgCarb, avgFat],
                backgroundColor: ["#3b82f6", "#10b981", "#ef4444"], // Blue, Green, Red
                borderWidth: 0
            }]
        }, {
            plugins: { legend: { display: true, position: "right", labels: { boxWidth: 10, font: { size: 10 } } } },
            layout: { padding: 10 }
        }, 300, 180);

        // B) Weekly Calorie Trend (Bar)
        const calChartUrl = await createChartImage("bar", {
            labels: dayLabelsFull,
            datasets: [{
                label: "Calorías Diarias",
                data: dailyCals,
                backgroundColor: "#D4F458", // Lime
                borderRadius: 4
            }]
        }, {
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }, 450, 200);


        // --- PDF GENERATION START ---

        // 1. HEADER (Logo + Title)
        if (logoImg) {
            doc.addImage(logoImg, "PNG", margin, yPos - 5, 14, 14); // Logo small
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(33, 33, 33);
            doc.text("Plan Semanal", margin + 18, yPos + 4);
        } else {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(33, 33, 33);
            doc.text("Plan Semanal de Nutrición", margin, yPos + 4);
        }

        // Subtitle / Branding
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text("AUREUS FIT AI - Clinical Nutrition", pageWidth - margin, yPos + 4, { align: "right" });

        yPos += 20;

        // Date
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100);
        const dateStr = new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        doc.text(`Generado: ${dateStr}`, margin, yPos);
        yPos += 10;

        // Intro
        doc.setFontSize(11);
        doc.setTextColor(60);
        doc.text("A continuación se muestra tu desglose nutricional semanal, distribución de macros y el plan diario detallado para optimizar tus niveles de ácido úrico y nutricionales.", margin, yPos, { maxWidth: pageWidth - (margin * 2) });
        yPos += 15;

        // --- CHARTS SECTION ---
        // Row with 2 charts
        const chartY = yPos;
        // Chart 1: Macros
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(0);
        doc.text("Distribución de Macros (Promedio)", margin, chartY);
        if (macroChartUrl) {
            doc.addImage(macroChartUrl, "PNG", margin, chartY + 5, 80, 50);
        }

        // Chart 2: Calories
        doc.text("Tendencia Calórica Semanal", pageWidth / 2 + 10, chartY);
        if (calChartUrl) {
            doc.addImage(calChartUrl, "PNG", pageWidth / 2 + 10, chartY + 5, 80, 50);
        }

        yPos += 65; // Skip charts height

        // --- WEEKLY STATS TABLE ---
        const divisor = 7;
        const avgCal = Math.round(totalWkCal / divisor);
        const avgPur = Math.round(totalWkPur / divisor);

        doc.autoTable({
            startY: yPos,
            head: [["RESUMEN SEMANAL", "Calorías (Avg)", "Purinas (Avg)", "Grasa", "Prot", "Carb"]],
            body: [[
                "Promedios Diarios",
                avgCal,
                avgPur + " mg",
                avgFat + " g",
                avgProt + " g",
                avgCarb + " g"
            ]],
            theme: "grid",
            headStyles: { fillColor: [30, 30, 30], textColor: [212, 244, 88], fontStyle: "bold", fontSize: 9 }, // Dark bg, Lime text
            bodyStyles: { fontSize: 10, cellPadding: 3, textColor: 50 },
            styles: { minCellHeight: 10, valign: "middle" }
        });

        yPos = doc.lastAutoTable.finalY + 15;

        // --- SHOPPING LIST WITH INGREDIENTS ---
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(33);
        doc.text("Lista de Compras (Ingredientes)", margin, yPos);
        yPos += 8;

        // Collect all ingredients from food items in the weekly plan
        const ingredientMap = {};
        Object.values(weeklyPlan).forEach(dayMeals => {
            Object.values(dayMeals).forEach(mealItems => {
                mealItems.forEach(item => {
                    // Try to get ingredients from item or look up in global foodDatabase
                    let ings = item.ingredients;
                    if (!ings || ings.length === 0) {
                        const normalizedName = item.name.toLowerCase().trim();
                        const sourceItem = (typeof foodDatabase !== 'undefined') ?
                            foodDatabase.find(f => f.name.toLowerCase().trim() === normalizedName) : null;
                        if (sourceItem && sourceItem.ingredients) {
                            ings = sourceItem.ingredients;
                        }
                    }

                    // If we have ingredients, add them to the map
                    if (ings && ings.length > 0) {
                        ings.forEach(ing => {
                            const ingName = ing.name.toLowerCase().trim();
                            if (!ingredientMap[ingName]) {
                                ingredientMap[ingName] = {
                                    name: ing.name,
                                    amounts: [],
                                    count: 0
                                };
                            }
                            ingredientMap[ingName].count++;
                            if (ing.amount) {
                                ingredientMap[ingName].amounts.push(ing.amount);
                            }
                        });
                    } else {
                        // If no ingredients found anywhere, add the item itself as an ingredient
                        const ingName = item.name.toLowerCase().trim();
                        if (!ingredientMap[ingName]) {
                            ingredientMap[ingName] = {
                                name: item.name,
                                amounts: [],
                                count: 0
                            };
                        }
                        ingredientMap[ingName].count++;
                    }
                });
            });
        });

        // Sort ingredients alphabetically
        const sortedIngredients = Object.values(ingredientMap).sort((a, b) =>
            a.name.localeCompare(b.name)
        );

        // Create shopping list table
        const shoppingRows = [];
        sortedIngredients.forEach(ing => {
            const amountStr = aggregateAmounts(ing.amounts);
            // Only show count if we couldn't aggregate any amounts
            const countStr = (ing.count > 1 && !amountStr) ? ` (x${ing.count})` : '';
            shoppingRows.push([`• ${ing.name}${countStr}`, amountStr]);
        });

        if (shoppingRows.length === 0) {
            shoppingRows.push(['No hay ingredientes', '']);
        }

        doc.autoTable({
            startY: yPos,
            head: [["INGREDIENTE", "CANTIDAD"]],
            body: shoppingRows,
            theme: "striped",
            headStyles: { fillColor: [212, 244, 88], textColor: 0, fontStyle: "bold" },
            styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak" },
            columnStyles: {
                0: { cellWidth: 100, textColor: [50, 50, 50] },
                1: { cellWidth: 50, textColor: [100, 100, 100] }
            }
        });

        // --- Helper for Aggregating Amounts ---
        function aggregateAmounts(amounts) {
            if (!amounts || amounts.length === 0) return '';

            const totals = {}; // { unit: total }
            const others = [];

            amounts.forEach(amt => {
                if (!amt) return;

                // Regex to extract number and unit
                // Handles: "150g", "1.5 kg", "2 piezas", "1 cda"
                const match = amt.trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Záéíóúñ]+.*)$/i);

                if (match) {
                    const val = parseFloat(match[1]);
                    let unit = match[2].toLowerCase().trim();

                    // Normalize common units
                    if (unit.startsWith('g')) unit = 'g';
                    else if (unit.startsWith('ml')) unit = 'ml';
                    else if (unit.startsWith('pieza')) unit = 'piezas';
                    else if (unit.startsWith('cda')) unit = 'cdas';
                    else if (unit.startsWith('cdita')) unit = 'cditas';
                    else if (unit.startsWith('taza')) unit = 'tazas';

                    totals[unit] = (totals[unit] || 0) + val;
                } else {
                    if (!others.includes(amt)) others.push(amt);
                }
            });

            const results = [];
            for (const [unit, total] of Object.entries(totals)) {
                // Formatting for display
                let displayUnit = unit;
                if (unit === 'piezas' && total === 1) displayUnit = 'pieza';
                else if (unit === 'tazas' && total === 1) displayUnit = 'taza';
                else if (unit === 'cdas' && total === 1) displayUnit = 'cda';
                else if (unit === 'cditas' && total === 1) displayUnit = 'cdita';

                results.push(`${total % 1 === 0 ? total : total.toFixed(1)} ${displayUnit}`);
            }

            return [...results, ...others].join(', ');
        }


        // --- DAILY PAGES ---
        doc.addPage();
        yPos = 20;

        const mealOrder = ["breakfast", "lunch", "dinner", "snack", "drinks"];
        const mealLabels = { "breakfast": "Desayuno", "lunch": "Almuerzo", "dinner": "Cena", "snack": "Snack", "drinks": "Bebidas" };

        days.forEach((day, index) => {
            // Avoid split
            if (yPos > 240) { doc.addPage(); yPos = 20; }

            const dayNameCap = dayMap[day].toUpperCase();

            // Calculate Daily
            let dCal = 0, dPur = 0, dFat = 0, dProt = 0, dCarb = 0;
            const dPlan = weeklyPlan[day] || {};
            Object.values(dPlan).forEach(mItems => mItems.forEach(i => {
                dCal += Number(i.cal) || 0; dPur += Number(i.purines) || 0;
                dFat += Number(i.fat) || 0; dProt += Number(i.prot) || 0; dCarb += Number(i.carb) || 0;
            }));

            // Header Bar
            doc.setFillColor(212, 244, 88); // Lime Brand Color
            doc.rect(margin, yPos, 4, 14, "F"); // Decoration Bar left

            doc.setFillColor(250, 250, 250);
            doc.rect(margin + 4, yPos, pageWidth - (margin * 2) - 4, 14, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(0);
            doc.text(dayNameCap, margin + 8, yPos + 9);

            // Right side stats
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(80);
            doc.text(`Kcal: ${Math.round(dCal)}  |  Pur: ${Math.round(dPur)}mg`, pageWidth - margin - 5, yPos + 9, { align: "right" });

            yPos += 18;

            // Prepare rows
            const dailyRows = [];
            mealOrder.forEach(mType => {
                const items = dPlan[mType];
                if (items && items.length > 0) {
                    const itemText = items.map(i => "• " + i.name).join("\n");
                    dailyRows.push([mealLabels[mType], itemText]);
                }
            });

            if (dailyRows.length > 0) {
                doc.autoTable({
                    startY: yPos,
                    body: dailyRows,
                    theme: "grid",
                    showHead: "never",
                    styles: { fontSize: 9, cellPadding: 3, valign: "top" },
                    columnStyles: {
                        0: { cellWidth: 30, fontStyle: "bold", textColor: [34, 197, 94] }, // Greenish for Meal Name
                        1: { textColor: 50 }
                    },
                    margin: { left: margin + 4, right: margin } // Indent slightly
                });
                yPos = doc.lastAutoTable.finalY + 10;
            } else {
                doc.setFontSize(9);
                doc.setTextColor(150);
                doc.text("Sin comidas registradas.", margin + 8, yPos);
                yPos += 10;
            }
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(180);
            doc.text(`Página ${i} de ${pageCount}  |  AUREUS FIT AI`, pageWidth / 2, pageHeight - 10, { align: "center" });
        }

        // Output
        const pdfBlobUrl = doc.output("bloburl");
        window.open(pdfBlobUrl, "_blank");
    }
});
