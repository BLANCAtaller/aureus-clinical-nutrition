/**
 * Settings Renderer - Handles Profile & Metabolic Logic
 * Calculations for BMR, TDEE, and Macros
 */

document.addEventListener('DOMContentLoaded', () => {
    initSettings();
});

function initSettings() {
    // 1. DOM Elements
    const elements = {
        inputs: {
            age: document.getElementById('inputAge'),
            gender: document.getElementById('inputGender'),
            height: document.getElementById('inputHeight'),
            weight: document.getElementById('inputWeight'),
            activity: document.getElementById('activitySlider')
        },
        displays: {
            activityLabel: document.getElementById('activityValueDisplay'),
            bmr: document.getElementById('bmrValue'),
            tdee: document.getElementById('tdeeValue'),
            targetCals: document.getElementById('targetCalsDisplay'),
            targetFat: document.getElementById('targetFatGrams'),
            targetProt: document.getElementById('targetProtGrams'),
            targetCarb: document.getElementById('targetCarbGrams'),
            safetyBmr: document.getElementById('safetyBmr')
        },
        buttons: {
            save: document.getElementById('globalSaveBtn'),
            bottomSave: document.getElementById('bottomSaveBtn')
        },
        chips: {
            protocols: document.querySelectorAll('.protocol-chip'),
            exclusions: document.querySelectorAll('.exclude-chip'),
            ifItems: document.querySelectorAll('.if-item'),
            colorOrbs: document.querySelectorAll('.color-orb'),
            themeCards: document.querySelectorAll('.theme-card'),
            fontChips: document.querySelectorAll('.font-chip')
        },
        appearance: {
            glassToggle: document.getElementById('checkGlass'),
            radiusSlider: document.getElementById('radiusSlider'),
            radiusVal: document.getElementById('radiusVal')
        }
    };

    // 2. State
    let currentSettings = loadSettings();
    window.currentGoalDeficit = currentSettings.goalDeficit || 0;
    window.currentMacroRatios = currentSettings.macroRatios || { fat: 0.70, protein: 0.25, carb: 0.05 };

    // 3. Initial UI Sync
    syncUIWithSettings(elements, currentSettings);
    updateCalculations(elements);

    // --- Manual Goal Setting Interaction ---
    const goalFooter = document.querySelector('.goal-footer-box');
    if (goalFooter) {
        goalFooter.style.cursor = 'pointer';
        goalFooter.title = "Click to change Goal";
        goalFooter.addEventListener('click', () => {
            openGoalModal();
        });
    }

    // 4. Event Listeners
    document.addEventListener('aureus-global-save', (e) => {
        // Trigger existing save logic
        gatherSettings(elements);
        // Optionally prevent the default toast if this page handles its own
        // e.preventDefault(); 
    });

    // Input changes
    Object.values(elements.inputs).forEach(input => {
        input.addEventListener('input', () => {
            updateCalculations(elements);
        });
    });

    // Protocol selection
    elements.chips.protocols.forEach(chip => {
        chip.addEventListener('click', () => {
            elements.chips.protocols.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            // 1. Map Protocol to Ratios
            const p = chip.dataset.protocol;
            let newRatios = { fat: 0.70, protein: 0.25, carb: 0.05 }; // Default Keto

            if (p === 'standard') newRatios = { fat: 0.70, protein: 0.25, carb: 0.05 };
            else if (p === 'vegetarian') newRatios = { fat: 0.35, protein: 0.30, carb: 0.35 };
            else if (p === 'vegan') newRatios = { fat: 0.30, protein: 0.25, carb: 0.45 };
            else if (p === 'carnivore') newRatios = { fat: 0.65, protein: 0.35, carb: 0.00 };

            window.currentMacroRatios = newRatios;

            // 2. Update UI
            updateCalculations(elements);

            // 3. Auto-save for immediate feedback
            const newSettings = gatherSettings(elements);
            saveSettings(newSettings);
            syncLogTargets(newSettings);
            showToast(`Protocolo ${p} aplicado.`);
        });
    });

    // Exclusion selection
    elements.chips.exclusions.forEach(chip => {
        chip.addEventListener('click', () => {
            chip.classList.toggle('active');

            // Auto-save logic
            const newSettings = gatherSettings(elements);
            saveSettings(newSettings);
            showToast("Preferencias actualizadas.");
        });
    });

    // IF Protocol selection
    elements.chips.ifItems.forEach(item => {
        item.addEventListener('click', () => {
            elements.chips.ifItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Auto-save logic
            const newSettings = gatherSettings(elements);
            saveSettings(newSettings);
            showToast(`Ayuno ${item.dataset.if} seleccionado.`);
        });
    });

    // Macro Targets Card Click to open Goal Modal
    const macroCard = document.querySelector('.macros-card-premium');
    if (macroCard) {
        macroCard.style.cursor = 'pointer';
        macroCard.addEventListener('click', (e) => {
            // Avoid triggering if clicking child buttons if we add them later
            if (e.target.closest('.legend-row')) return;
            openGoalModal();
        });
    }

    // Color Orb Selection
    elements.chips.colorOrbs.forEach(orb => {
        orb.addEventListener('click', () => {
            elements.chips.colorOrbs.forEach(o => o.classList.remove('active'));
            orb.classList.add('active');
            // Permanent live preview for current session
            document.body.dataset.accent = orb.dataset.color;
        });
    });

    // Theme Card Selection
    elements.chips.themeCards.forEach(card => {
        card.addEventListener('click', () => {
            elements.chips.themeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            document.body.dataset.theme = card.dataset.theme;
        });
    });

    // Font selection
    elements.chips.fontChips.forEach(chip => {
        chip.addEventListener('click', () => {
            elements.chips.fontChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            document.body.dataset.font = chip.dataset.font;
        });
    });

    // Glass toggle
    if (elements.appearance.glassToggle) {
        elements.appearance.glassToggle.addEventListener('change', (e) => {
            document.body.dataset.glass = e.target.checked;
        });
    }

    // Radius slider
    if (elements.appearance.radiusSlider) {
        elements.appearance.radiusSlider.addEventListener('input', (e) => {
            const val = e.target.value + 'px';
            if (elements.appearance.radiusVal) elements.appearance.radiusVal.innerText = val;
            document.body.style.setProperty('--app-radius', val);
        });
    }

    // Save logic
    const handleSave = () => {
        const newSettings = gatherSettings(elements);
        saveSettings(newSettings);
        showToast("Settings saved successfully!");

        // Sync with today's log targets
        syncLogTargets(newSettings);

        // Broadcast event for same-window updates
        window.dispatchEvent(new CustomEvent('settings-saved'));
    };

    if (elements.buttons.save) elements.buttons.save.addEventListener('click', handleSave);
    if (elements.buttons.bottomSave) elements.buttons.bottomSave.addEventListener('click', handleSave);


    // Activity Slider Label Update
    elements.inputs.activity.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        let label = "Moderate (x1.55)";
        if (val <= 1.2) label = "Sedentary (x1.2)";
        else if (val <= 1.375) label = "Light (x1.375)";
        else if (val <= 1.55) label = "Moderate (x1.55)";
        else if (val <= 1.725) label = "Active (x1.725)";
        else label = "Athlete (x1.9)";
        elements.displays.activityLabel.innerText = label;
    });
}

// --- Logic Functions ---

function loadSettings() {
    const defaultSettings = {
        age: 34,
        gender: 'male',
        height: 178,
        weight: 82.5,
        activity: 1.55,
        protocol: 'standard',
        exclusions: ['Peanuts'],
        ifProtocol: '16:8',
        protocol: 'standard',
        exclusions: ['Peanuts'],
        ifProtocol: '16:8',
        goalDeficit: 0, // 0 = Maintenance
        macroRatios: { fat: 0.70, protein: 0.25, carb: 0.05 },
        appearance: {
            accent: 'aureus',
            theme: 'dark',
            glass: true,
            radius: 16,
            font: 'Outfit'
        }
    };
    const stored = localStorage.getItem(getUserKey('aureus_user_settings'));
    return stored ? JSON.parse(stored) : defaultSettings;
}

function saveSettings(settings) {
    localStorage.setItem(getUserKey('aureus_user_settings'), JSON.stringify(settings));
}

function gatherSettings(elements) {
    const age = parseInt(elements.inputs.age.value) || 34;
    const gender = elements.inputs.gender.value;
    const height = parseFloat(elements.inputs.height.value) || 178;
    const weight = parseFloat(elements.inputs.weight.value) || 82.5;
    const activity = parseFloat(elements.inputs.activity.value) || 1.55;

    // Recalculate targets for storage
    let bmr = (gender === 'male')
        ? (10 * weight) + (6.25 * height) - (5 * age) + 5
        : (10 * weight) + (6.25 * height) - (5 * age) - 161;
    const tdee = bmr * activity;
    // Maintenance (as requested)
    const targetCals = Math.round(tdee);

    return {
        age,
        gender,
        height,
        weight,
        activity,
        protocol: document.querySelector('.protocol-chip.active')?.dataset.protocol || 'standard',
        exclusions: Array.from(document.querySelectorAll('.exclude-chip.active')).map(c => c.innerText),
        ifProtocol: document.querySelector('.if-item.active')?.dataset.if || '16:8',
        goalDeficit: window.currentGoalDeficit || 0,
        purineLimit: (() => {
            const s = localStorage.getItem(getUserKey('aureus_user_settings'));
            return s ? (JSON.parse(s).purineLimit || 800) : 800;
        })(),
        macroRatios: window.currentMacroRatios || { fat: 0.70, protein: 0.25, carb: 0.05 },
        appearance: {
            accent: document.querySelector('.color-orb.active')?.dataset.color || 'aureus',
            theme: document.querySelector('.theme-card.active')?.dataset.theme || 'dark',
            glass: elements.appearance.glassToggle?.checked || false,
            radius: parseInt(elements.appearance.radiusSlider?.value) || 16,
            font: document.querySelector('.font-chip.active')?.dataset.font || 'Outfit'
        },
        // New: Saved calculated targets
        targets: {
            calories: Math.round(tdee - (window.currentGoalDeficit || 0)),
            fat: Math.round(((tdee - (window.currentGoalDeficit || 0)) * (window.currentMacroRatios?.fat || 0.70)) / 9),
            prot: Math.round(((tdee - (window.currentGoalDeficit || 0)) * (window.currentMacroRatios?.protein || 0.25)) / 4),
            carb: Math.round(((tdee - (window.currentGoalDeficit || 0)) * (window.currentMacroRatios?.carb || 0.05)) / 4)
        }
    };
}

function syncUIWithSettings(elements, settings) {
    elements.inputs.age.value = settings.age;
    elements.inputs.gender.value = settings.gender;
    elements.inputs.height.value = settings.height;
    elements.inputs.weight.value = settings.weight;
    elements.inputs.activity.value = settings.activity;

    // Trigger activity label update
    elements.inputs.activity.dispatchEvent(new Event('input'));

    // Chips
    elements.chips.protocols.forEach(c => {
        if (c.dataset.protocol === settings.protocol) c.classList.add('active');
        else c.classList.remove('active');
    });

    elements.chips.exclusions.forEach(c => {
        if (settings.exclusions.includes(c.innerText)) c.classList.add('active');
        else c.classList.remove('active');
    });

    elements.chips.ifItems.forEach(i => {
        if (i.dataset.if === settings.ifProtocol) i.classList.add('active');
        else i.classList.remove('active');
    });

    // Appearance Sync
    const appearance = settings.appearance || { accent: 'aureus', theme: 'dark' };

    elements.chips.colorOrbs.forEach(orb => {
        if (orb.dataset.color === appearance.accent) orb.classList.add('active');
        else orb.classList.remove('active');
    });

    elements.chips.themeCards.forEach(card => {
        if (card.dataset.theme === appearance.theme) card.classList.add('active');
        else card.classList.remove('active');
    });

    elements.chips.fontChips.forEach(chip => {
        if (chip.dataset.font === (appearance.font || 'Outfit')) chip.classList.add('active');
        else chip.classList.remove('active');
    });

    if (elements.appearance.glassToggle) {
        elements.appearance.glassToggle.checked = appearance.glass !== false;
    }

    if (elements.appearance.radiusSlider) {
        const r = appearance.radius || 16;
        elements.appearance.radiusSlider.value = r;
        if (elements.appearance.radiusVal) elements.appearance.radiusVal.innerText = r + 'px';
        document.body.style.setProperty('--app-radius', r + 'px');
    }

    // Apply to body immediately on settings load
    document.body.dataset.accent = appearance.accent;
    document.body.dataset.theme = appearance.theme;
    document.body.dataset.glass = appearance.glass !== false;
    document.body.dataset.font = appearance.font || 'Outfit';
}

function updateCalculations(elements) {
    const age = parseInt(elements.inputs.age.value) || 0;
    const gender = elements.inputs.gender.value;
    const height = parseFloat(elements.inputs.height.value) || 0;
    const weight = parseFloat(elements.inputs.weight.value) || 0;
    const activity = parseFloat(elements.inputs.activity.value) || 1.2;

    // 1. BMR (Mifflin-St Jeor)
    let bmr = 0;
    if (gender === 'male') {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }

    // 2. TDEE
    const tdee = bmr * activity;

    // 3. Target (TDEE - Deficit)
    const targetCals = tdee - (window.currentGoalDeficit || 0);

    // 4. Update Displays
    elements.displays.bmr.innerText = Math.round(bmr).toLocaleString();
    elements.displays.tdee.innerText = Math.round(tdee).toLocaleString();
    elements.displays.targetCals.innerText = Math.round(targetCals).toLocaleString();
    elements.displays.safetyBmr.innerText = Math.round(bmr).toLocaleString();

    // 5. Update Macros (Dynamic Ratios)
    const ratios = window.currentMacroRatios || { fat: 0.70, protein: 0.25, carb: 0.05 };

    const fatTarget = (targetCals * ratios.fat) / 9;
    const protTarget = (targetCals * ratios.protein) / 4;
    const carbTarget = (targetCals * ratios.carb) / 4;

    elements.displays.targetFat.innerText = `${Math.round(fatTarget)}g`;
    elements.displays.targetProt.innerText = `${Math.round(protTarget)}g`;
    elements.displays.targetCarb.innerText = `${Math.round(carbTarget)}g`;

    // Update Percentage Labels in Legend
    document.querySelector('.legend-item .pct.lime-text').innerText = `${Math.round(ratios.fat * 100)}%`;
    document.querySelector('.legend-item .pct.grey-text').innerText = `${Math.round(ratios.protein * 100)}%`;
    document.querySelector('.legend-item .pct.dark-text').innerText = `${Math.round(ratios.carb * 100)}%`;

    // 6. Update Goal Footer
    const footerTitle = document.querySelector('.goal-title');
    const footerSub = document.querySelector('.goal-sub');
    if (footerTitle && footerSub) {
        const deficit = Math.round(tdee - targetCals);
        if (deficit > 50) {
            footerTitle.innerText = "GOAL: FAT LOSS";
            footerSub.innerText = `-${deficit.toLocaleString()}kcal daily deficit`;
        } else if (deficit < -50) {
            footerTitle.innerText = "GOAL: MUSCLE GAIN";
            footerSub.innerText = `+${Math.abs(deficit).toLocaleString()}kcal surplus`;
        } else {
            footerTitle.innerText = "GOAL: MAINTENANCE";
            footerSub.innerText = "0kcal daily deficit";
        }
    }

    // 7. Update Chart
    updateChart(fatTarget * 9, protTarget * 4, carbTarget * 4, targetCals);
}

const GOAL_PROFILES = [
    {
        icon: '🔥', title: 'Pérdida de Peso (Keto)',
        desc: 'Quema de grasa eficiente. Mantiene saciedad.',
        deficit: 500, ratio: { fat: 0.70, protein: 0.25, carb: 0.05 },
        macrosStr: '70% FAT • 25% PROT • 5% CARB'
    },
    {
        icon: '🥗', title: 'Pérdida de Peso (Balanceada)',
        desc: 'Bajar de peso con dieta variada.',
        deficit: 500, ratio: { fat: 0.35, protein: 0.30, carb: 0.35 },
        macrosStr: '35% FAT • 30% PROT • 35% CARB'
    },
    {
        icon: '⚖️', title: 'Mantenimiento (Keto/Actual)',
        desc: 'Mantener peso y energía estable.',
        deficit: 0, ratio: { fat: 0.70, protein: 0.25, carb: 0.05 },
        macrosStr: '70% FAT • 25% PROT • 5% CARB'
    },
    {
        icon: '💪', title: 'Aumento Masa Muscular',
        desc: 'Volumen limpio, minimizando grasa.',
        deficit: -300, ratio: { fat: 0.30, protein: 0.30, carb: 0.40 },
        macrosStr: '30% FAT • 30% PROT • 40% CARB'
    },
    {
        icon: '⚡', title: 'Rendimiento Deportivo',
        desc: 'Maximizar depósitos de glucógeno.',
        deficit: 0, ratio: { fat: 0.20, protein: 0.25, carb: 0.55 },
        macrosStr: '20% FAT • 25% PROT • 55% CARB'
    },
    {
        icon: '🔄', title: 'Recomposición Corporal',
        desc: 'Perder grasa y ganar músculo a la vez.',
        deficit: 0, ratio: { fat: 0.30, protein: 0.40, carb: 0.30 },
        macrosStr: '30% FAT • 40% PROT • 30% CARB'
    }
];

// --- Goal Modal Logic ---
function openGoalModal() {
    const existing = document.querySelector('.goal-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'goal-modal-overlay';

    // Helper to check equality
    const currentDeficit = window.currentGoalDeficit || 0;
    const currentRatios = window.currentMacroRatios || { fat: 0.70, protein: 0.25, carb: 0.05 };
    const isRatioEq = (r1, r2) => r1 && r2 && r1.fat === r2.fat && r1.protein === r2.protein && r1.carb === r2.carb;

    let htmlOptions = GOAL_PROFILES.map((p, index) => {
        const isActive = (p.deficit === currentDeficit) && isRatioEq(p.ratio, currentRatios);
        return `
        <div class="goal-option-btn rich ${isActive ? 'active' : ''}" data-index="${index}">
            <div class="opt-left">
                <div class="opt-title">${p.icon} ${p.title}</div>
                <div class="opt-desc">${p.desc}</div>
                <div class="opt-macros">${p.macrosStr}</div>
            </div>
            <div class="opt-right">
                <span class="val-tag">${p.deficit === 0 ? 'MAINTENANCE' : (p.deficit > 0 ? `-${p.deficit}` : `+${Math.abs(p.deficit)}`)}</span>
            </div>
        </div>
        `;
    }).join('');

    htmlOptions += `
        <div class="goal-option-btn rich" id="btnCustomGoal">
            <div class="opt-left">
                <div class="opt-title">⚙️ Custom Deficit</div>
                <div class="opt-desc">Define tu propio déficit calórico manualmente.</div>
            </div>
            <div class="opt-right"><span class="val-tag">...</span></div>
        </div>
    `;

    overlay.innerHTML = `
        <div class="goal-modal wide">
            <h2>Selecciona tu Objetivo</h2>
            <p>Elige un perfil macro para adaptar tus metas.</p>
            <div class="goal-options-scroll">
                ${htmlOptions}
            </div>
            <button class="goal-close" id="btnCloseGoal">Cancelar</button>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('active'));

    // Attach Listeners
    overlay.querySelectorAll('.goal-option-btn[data-index]').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            const p = GOAL_PROFILES[index];
            setGoal(p.deficit, p.ratio);
        });
    });

    const customBtn = overlay.querySelector('#btnCustomGoal');
    if (customBtn) customBtn.addEventListener('click', () => setCustomGoal());

    const closeBtn = overlay.querySelector('#btnCloseGoal');
    if (closeBtn) closeBtn.addEventListener('click', () => closeGoalModal());

    window.closeGoalModal = () => {
        overlay.classList.remove('active');
        setTimeout(() => overlay.remove(), 300);
    };

    window.setGoal = (deficit, ratios) => {
        try {
            console.log("Setting goal:", deficit, ratios);
            window.currentGoalDeficit = deficit;
            if (ratios) window.currentMacroRatios = ratios;

            // Trigger update to UI (Calculations)
            const elements = {
                inputs: {
                    age: document.getElementById('inputAge'),
                    gender: document.getElementById('inputGender'),
                    height: document.getElementById('inputHeight'),
                    weight: document.getElementById('inputWeight'),
                    activity: document.getElementById('activitySlider')
                },
                displays: {
                    bmr: document.getElementById('bmrValue'),
                    tdee: document.getElementById('tdeeValue'),
                    targetCals: document.getElementById('targetCalsDisplay'),
                    targetFat: document.getElementById('targetFatGrams'),
                    targetProt: document.getElementById('targetProtGrams'),
                    targetCarb: document.getElementById('targetCarbGrams'),
                    safetyBmr: document.getElementById('safetyBmr')
                }
            };

            // Validate elements exist
            if (!elements.inputs.age) throw new Error("Settings inputs not found");

            updateCalculations(elements);

            // AUTO-SAVE LOGIC
            const fullElements = {
                inputs: elements.inputs,
                chips: {
                    protocols: document.querySelectorAll('.protocol-chip'),
                    exclusions: document.querySelectorAll('.exclude-chip'),
                    ifItems: document.querySelectorAll('.if-item')
                },
                appearance: {
                    glassToggle: document.getElementById('checkGlass'),
                    radiusSlider: document.getElementById('radiusSlider'),
                    radiusVal: document.getElementById('radiusVal')
                }
            };

            const newSettings = gatherSettings(fullElements);
            saveSettings(newSettings);
            syncLogTargets(newSettings);
            window.dispatchEvent(new CustomEvent('settings-saved'));

            showToast("Objetivo guardado.");
            closeGoalModal();
        } catch (e) {
            console.error("Set Goal Error:", e);
            alert("Error saving goal: " + e.message);
        }
    };

    window.setCustomGoal = () => {
        const val = prompt("Ingresa el déficit calórico (positivo para perder, negativo para ganar):", "500");
        if (val !== null) {
            const num = parseInt(val);
            if (!isNaN(num)) setGoal(num, null);
        }
    };
}

function updateChart(fatCals, protCals, carbCals, totalCals) {
    const ctx = document.getElementById('settingMacroChart');
    if (!ctx) return;

    const data = {
        datasets: [{
            data: [fatCals, protCals, carbCals],
            backgroundColor: ['#D4F458', '#71717a', '#27272a'],
            borderWidth: 0,
            cutout: '80%',
            borderRadius: 10
        }]
    };

    if (window.settingChart) {
        window.settingChart.data = data;
        window.settingChart.update();
    } else {
        window.settingChart = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                cutout: '80%'
            }
        });
    }
}

// Global Sync
function syncLogTargets(settings) {
    // Also save to today's log if it exists
    // FIX: Use Local Time to match script.js and food-log-renderer.js
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const logKey = getUserKey(`aureus_log_${year}-${month}-${day}`);

    // Read or init
    const stored = localStorage.getItem(logKey);
    let logData = stored ? JSON.parse(stored) : { meals: {}, targets: {} };

    // Apply new targets
    if (settings.targets) {
        logData.targets = { ...settings.targets };
    }

    localStorage.setItem(logKey, JSON.stringify(logData));
    localStorage.setItem(getUserKey('aureus_targets_updated'), Date.now());
    window.dispatchEvent(new Event('storage'));
}



