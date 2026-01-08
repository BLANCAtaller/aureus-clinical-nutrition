document.addEventListener('DOMContentLoaded', function () {
    // initialize Charts
    initMacroChart();
    initHydration();

    // 3. Listen for changes locally
    window.addEventListener('storage', (e) => {
        if (e.key === getUserKey('aureus_log_' + getTodayStr()) || e.key === getUserKey('aureus_user_settings') || e.key === 'aureus_targets_updated') {
            initMacroChart();
        }
        if (e.key === getUserKey('aureus_hydration')) {
            initHydration();
        }
    });

    window.addEventListener('settings-saved', () => {
        initMacroChart();
    });

    // Purine Edit Button
    const btnEditPurine = document.getElementById('btnEditPurine');
    if (btnEditPurine) {
        btnEditPurine.addEventListener('click', () => {
            const stored = localStorage.getItem(getUserKey('aureus_user_settings'));
            let currentLimit = 800;
            if (stored) {
                try {
                    const s = JSON.parse(stored);
                    if (s.purineLimit) currentLimit = s.purineLimit;
                } catch (e) { }
            }

            const val = prompt("Define Purine Limit (mg/day):", currentLimit);
            if (val !== null) {
                const num = parseInt(val);
                if (!isNaN(num) && num > 0) {
                    let settings = stored ? JSON.parse(stored) : {};
                    settings.purineLimit = num;
                    localStorage.setItem(getUserKey('aureus_user_settings'), JSON.stringify(settings));
                    initMacroChart();
                }
            }
        });
    }

    // Quick Add Meal Listeners - Handled by quick-add-dashboard.js
});

function initMacroChart() {
    // 1. Fetch Data for Today
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const storageKey = getUserKey(`aureus_log_${y}-${m}-${d}`);

    let totalCals = 0;
    let totalFat = 0;
    let totalProt = 0;
    let totalCarb = 0;
    let totalPurine = 0;

    let targetCals = 2000;
    let targetFat = 150;
    let targetProt = 95;
    let targetCarb = 45;
    let targetPurine = 800; // Standard max baseline

    // Try to load global settings first as baseline
    const globalSettingsStored = localStorage.getItem(getUserKey('aureus_user_settings'));
    if (globalSettingsStored) {
        try {
            const settings = JSON.parse(globalSettingsStored);
            if (settings.targets) {
                targetCals = settings.targets.calories || targetCals;
                targetFat = settings.targets.fat || targetFat;
                targetProt = settings.targets.prot || targetProt;
                targetCarb = settings.targets.carb || targetCarb;
            }
            // Load custom Purine Limit if exists
            if (settings.purineLimit) {
                targetPurine = settings.purineLimit;
            }
        } catch (e) { console.error("Error loading global settings", e); }
    }

    const stored = localStorage.getItem(storageKey);
    if (stored) {
        try {
            const logData = JSON.parse(stored);
            if (logData.meals) {
                Object.values(logData.meals).forEach(meal => {
                    if (meal.items) {
                        meal.items.forEach(item => {
                            totalCals += (item.cals || item.cal || 0);
                            totalFat += (item.fat || 0);
                            totalProt += (item.prot || 0);
                            totalCarb += (item.carb || 0);
                            totalPurine += (item.purine || item.purines || 0);
                        });
                    }
                });
            }
            // FIX: Only use log targets if we DIDN'T load global settings.
            // This ensures live settings updates (e.g. changing goals) are reflected immediately
            // even if the log for today was created with old targets.
            if (!globalSettingsStored && logData.targets) {
                targetCals = logData.targets.calories || targetCals;
                targetFat = logData.targets.fat || targetFat;
                targetProt = logData.targets.prot || targetProt;
                targetCarb = logData.targets.carb || targetCarb;
            }
        } catch (e) {
            console.error("Error parsing log data for dashboard", e);
        }
    }

    // 2. Update UI Elements
    const totalConsumedDisplay = document.querySelector('.chart-center-text .value');
    if (totalConsumedDisplay) totalConsumedDisplay.innerText = totalCals.toLocaleString();

    // Update Macro Stat Cards
    const fatVal = document.querySelector('.macro-stat-card.fat .value');
    const fatPct = document.querySelector('.macro-stat-card.fat .percent');
    if (fatVal) fatVal.innerText = `${Math.round(totalFat)}g`;
    if (fatPct) fatPct.innerText = `${Math.round((totalFat / (targetFat || 1)) * 100)}%`;

    const protVal = document.querySelector('.macro-stat-card.protein .value');
    const protPct = document.querySelector('.macro-stat-card.protein .percent');
    if (protVal) protVal.innerText = `${Math.round(totalProt)}g`;
    if (protPct) protPct.innerText = `${Math.round((totalProt / (targetProt || 1)) * 100)}%`;

    const carbVal = document.querySelector('.macro-stat-card.carbs .value');
    const carbPct = document.querySelector('.macro-stat-card.carbs .percent');
    if (carbVal) carbVal.innerText = `${Math.round(totalCarb)}g`;
    if (carbPct) carbPct.innerText = `${Math.round((totalCarb / (targetCarb || 1)) * 100)}%`;

    // Update Macro Targets Card Subtitle & Goal Display if exists
    const macroSubtitle = document.querySelector('.macro-card .subtitle');
    if (macroSubtitle) {
        macroSubtitle.innerText = `Targeting ${Math.round((targetFat * 9 / targetCals) * 100)}% Fat, ${Math.round((targetProt * 4 / targetCals) * 100)}% Protein, ${Math.round((targetCarb * 4 / targetCals) * 100)}% Carbs`;
    }

    // Update the targets display (Grams) in the stat cards if needed 
    // (Optional: adding target grams to the subtitle of each macro card for clarity)
    const fatName = document.querySelector('.macro-stat-card.fat .name');
    if (fatName) fatName.innerHTML = `Fat <small style="opacity:0.5; font-size:0.8em;">/ ${Math.round(targetFat)}g</small>`;

    const protName = document.querySelector('.macro-stat-card.protein .name');
    if (protName) protName.innerHTML = `Protein <small style="opacity:0.5; font-size:0.8em;">/ ${Math.round(targetProt)}g</small>`;

    const carbName = document.querySelector('.macro-stat-card.carbs .name');
    if (carbName) carbName.innerHTML = `Carbs <small style="opacity:0.5; font-size:0.8em;">/ ${Math.round(targetCarb)}g</small>`;

    // Update Purine Card
    const purinePill = document.getElementById('purineValuePill');
    if (purinePill) {
        // Parse the denominator if it exists in the HTML, else use target
        const currentText = purinePill.innerText;
        const currentMax = currentText.includes('/') ? currentText.split('/')[1].replace('mg', '').trim() : targetPurine;
        purinePill.innerHTML = `${Math.round(totalPurine)}mg / ${currentMax}mg`;
    }

    // Update Segments
    updatePurineSegments(totalPurine, targetPurine);

    // Update Net Carbs Card
    const carbConsumedValEl = document.getElementById('carbConsumedVal');
    const carbTargetValEl = document.getElementById('carbTargetVal');
    const carbStatusTextEl = document.getElementById('carbStatusText');
    const carbLeftTextEl = document.getElementById('carbLeftText');
    const carbProgBarEl = document.getElementById('carbProgBar');
    const carbBadgeEl = document.getElementById('carbBadge');
    const carbImpactStatusEl = document.getElementById('carbImpactStatus');
    const carbImpactDotsEl = document.getElementById('carbImpactDots');

    if (carbConsumedValEl) carbConsumedValEl.innerText = Math.round(totalCarb);
    if (carbTargetValEl) carbTargetValEl.innerText = `/ ${targetCarb}g`;

    // Logic for Carbs Status
    if (carbStatusTextEl) {
        if (totalCarb <= targetCarb * 0.5) {
            carbStatusTextEl.innerText = "In deep ketosis";
            if (carbBadgeEl) carbBadgeEl.innerText = "DEEP KETOSIS";
            if (carbImpactStatusEl) carbImpactStatusEl.innerText = "Optimal";
        } else if (totalCarb <= targetCarb) {
            carbStatusTextEl.innerText = "In ketosis";
            if (carbBadgeEl) carbBadgeEl.innerText = "KETOSIS";
            if (carbImpactStatusEl) carbImpactStatusEl.innerText = "Good";
        } else {
            carbStatusTextEl.innerText = "Out of ketosis";
            if (carbBadgeEl) carbBadgeEl.innerText = "HIGH CARB";
            if (carbImpactStatusEl) {
                carbImpactStatusEl.innerText = "High";
                carbImpactStatusEl.className = "status-text red";
            }
        }
    }

    if (carbLeftTextEl) {
        const left = targetCarb - totalCarb;
        carbLeftTextEl.innerText = left > 0 ? `${Math.round(left)}g left` : "Limit reached";
    }

    if (carbProgBarEl) {
        const pct = Math.min(100, (totalCarb / (targetCarb || 1)) * 100);
        carbProgBarEl.style.width = `${pct}%`;
        if (pct > 100) carbProgBarEl.style.backgroundColor = "#EF4444";
    }

    // Update Impact Dots
    if (carbImpactDotsEl) {
        const dots = carbImpactDotsEl.querySelectorAll('.dot');
        const activeCount = totalCarb > targetCarb ? 1 : (totalCarb > targetCarb * 0.5 ? 3 : 5);
        dots.forEach((dot, idx) => {
            if (idx < activeCount) dot.classList.add('active');
            else dot.classList.remove('active');
        });
    }

    // Update Calories Remaining Card (First card on dashboard)
    const calRemValueEl = document.getElementById('calRemValue');
    const calConsumedTextEl = document.getElementById('calConsumedText');
    const calGoalTextEl = document.getElementById('calGoalText');
    const calProgBarEl = document.getElementById('calProgBar');

    if (calRemValueEl) calRemValueEl.innerText = Math.max(0, targetCals - totalCals).toLocaleString();
    if (calConsumedTextEl) calConsumedTextEl.innerText = `${totalCals.toLocaleString()} consumed`;
    if (calGoalTextEl) calGoalTextEl.innerText = `Goal: ${targetCals.toLocaleString()}`;
    if (calProgBarEl) calProgBarEl.style.width = `${Math.min(100, (totalCals / targetCals) * 100)}%`;

    // Update Goal Badge
    const calGoalBadgeEl = document.getElementById('calGoalBadge');
    if (calGoalBadgeEl && globalSettingsStored) {
        try {
            const settings = JSON.parse(globalSettingsStored);
            const deficit = settings.goalDeficit || 0;
            if (deficit > 50) {
                calGoalBadgeEl.innerText = "FAT LOSS";
                calGoalBadgeEl.style.display = 'block';
                calGoalBadgeEl.className = "badge-tag orange-bg";
            } else if (deficit < -50) {
                calGoalBadgeEl.innerText = "MUSCLE GAIN";
                calGoalBadgeEl.style.display = 'block';
                calGoalBadgeEl.className = "badge-tag blue-bg";
            } else {
                calGoalBadgeEl.innerText = "MAINTENANCE";
                calGoalBadgeEl.style.display = 'block';
                calGoalBadgeEl.className = "badge-tag lime-bg";
            }
        } catch (e) { }
    }

    // Update Purine Intake Card
    const purineStatusTextEl = document.getElementById('purineStatusText');
    const purineValuePillEl = document.getElementById('purineValuePill');
    const purineMeterEl = document.getElementById('purineMeter');
    const purinePredictionTextEl = document.getElementById('purinePredictionText');

    if (purineValuePillEl) purineValuePillEl.innerText = `${Math.round(totalPurine)}mg / ${targetPurine}mg`;

    if (purineStatusTextEl) {
        // Calculate Percentages for Segments
        // Seg 1 (Green): 0 - 50% of Target
        // Seg 2 (Orange): 50% - 85% of Target (Window: 35%)
        // Seg 3 (Red): 85% - 100%+ of Target (Window: 15%+)

        const pct = (totalPurine / targetPurine) * 100;

        const segments = purineMeterEl ? purineMeterEl.querySelectorAll('.seg-fill') : [];
        if (segments.length >= 3) {
            // Segment 1 Logic (0-50%)
            // If pct >= 50, fill 100%. Else pct / 50 * 100
            const seg1Fill = Math.min(100, (pct / 50) * 100);
            segments[0].style.width = `${seg1Fill}%`;

            // Segment 2 Logic (50-85%) - Range is 35 units
            // If pct <= 50, fill 0%. If pct >= 85, fill 100%. 
            // Else (pct - 50) / 35 * 100
            let seg2Fill = 0;
            if (pct > 50) {
                seg2Fill = Math.min(100, ((pct - 50) / 35) * 100);
            }
            segments[1].style.width = `${seg2Fill}%`;

            // Segment 3 Logic (85%+)
            let seg3Fill = 0;
            if (pct > 85) {
                // Open ended, or cap at 100% of the segment? Let's cap at 100 for visual sanity
                seg3Fill = Math.min(100, ((pct - 85) / 15) * 100);
            }
            segments[2].style.width = `${seg3Fill}%`;
        }

        // Text Status Update
        if (pct > 85) {
            purineStatusTextEl.innerText = "High";
            purineStatusTextEl.className = "stat-value-big red-text";
            if (purinePredictionTextEl) purinePredictionTextEl.innerText = "Warning: High purine intake detected.";
        } else if (pct > 50) {
            purineStatusTextEl.innerText = "Moderate";
            purineStatusTextEl.className = "stat-value-big orange-text";
            if (purinePredictionTextEl) purinePredictionTextEl.innerText = "Uric acid levels may be rising.";
        } else {
            purineStatusTextEl.innerText = "Low";
            purineStatusTextEl.className = "stat-value-big green-text";
            if (purinePredictionTextEl) purinePredictionTextEl.innerText = "Your uric acid prediction is stable.";
        }
    }

    // 3. Initialize Chart
    const ctx = document.getElementById('macroChart').getContext('2d');

    // Calculate Chart Percentages (Relative to each other for the donut)
    const sumMacros = totalFat + totalProt + totalCarb;
    const chartData = sumMacros > 0
        ? [totalFat, totalProt, totalCarb]
        : [70, 25, 5]; // Fallback to dummy data if empty

    const data = {
        labels: ['Fat', 'Protein', 'Carbs'],
        datasets: [{
            data: chartData,
            backgroundColor: [
                '#D4F458', // Lime (Fat)
                '#71717a', // Zinc 500 (Protein)
                '#27272a'  // Zinc 800 (Carbs)
            ],
            borderWidth: 0,
            hoverOffset: 4,
            cutout: '85%',
            borderRadius: 20
        }]
    };

    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            animation: { animateScale: true, animateRotate: true }
        }
    };

    // Destroy existing chart if it exists (for refreshes/syncs)
    if (window.myMacroChart) window.myMacroChart.destroy();
    window.myMacroChart = new Chart(ctx, config);

    // --- Sync Listener ---
    if (!window.hasMacroSyncListener) {
        window.addEventListener('storage', (e) => {
            if (e.key === storageKey || (e.key && e.key.includes('_aureus_log_'))) {
                initMacroChart();
            }
        });
        window.hasMacroSyncListener = true;
    }

    // --- Fasting Timer Logic ---
    if (!window.fastingTimerInitDone) {
        initFastingTimer();
        window.fastingTimerInitDone = true;
    }

    // --- Hydration Widget Logic ---
    if (!window.hydrationInitDone) {
        initHydrationWidget();
        window.hydrationInitDone = true;
    }
}

function getTodayStr() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function initHydration() {
    const saved = localStorage.getItem(getUserKey('aureus_hydration'));
    let state = { total: 0, goal: 2500 };
    if (saved) {
        state = JSON.parse(saved);
    }

    const countEl = document.querySelector('.hydration-header .water-count');
    if (countEl) {
        countEl.innerHTML = `${state.total.toLocaleString()} / <br> ${state.goal.toLocaleString()}ml`;
    }

    const pct = Math.min((state.total / (state.goal || 1)) * 100, 100);
    const drops = document.querySelectorAll('.drops-container i');
    const activeCount = Math.floor((pct / 100) * drops.length);

    drops.forEach((drop, idx) => {
        if (idx < activeCount) drop.classList.add('active');
        else drop.classList.remove('active');
    });

    // Add Button listener (one-time or check)
    const btnAdd = document.querySelector('.hydration-card .btn-dashed');
    if (btnAdd && !btnAdd.dataset.listenerAdded) {
        btnAdd.addEventListener('click', () => {
            state.total += 250;
            localStorage.setItem(getUserKey('aureus_hydration'), JSON.stringify(state));
            initHydration();
        });
        btnAdd.dataset.listenerAdded = "true";
    }
}

function updatePurineSegments(current, target) {
    const segments = document.querySelectorAll('.segmented-meter .seg-fill');
    if (segments.length < 3) return;

    // Reset
    segments.forEach(s => s.style.width = '0%');

    const pct = (current / (target || 1)) * 100;

    if (pct <= 33) {
        segments[0].style.width = `${(pct / 33) * 100}%`;
    } else if (pct <= 66) {
        segments[0].style.width = '100%';
        segments[1].style.width = `${((pct - 33) / 33) * 100}%`;
    } else {
        segments[0].style.width = '100%';
        segments[1].style.width = '100%';
        segments[2].style.width = `${Math.min(((pct - 66) / 34) * 100, 100)}%`;
    }
}

function initHydrationWidget() {
    const waterCountEl = document.querySelector('.hydration-card .water-count');
    const dropsContainer = document.querySelector('.hydration-card .drops-container');
    const btnAddWater = document.querySelector('.hydration-card .btn-dashed');

    if (!waterCountEl || !dropsContainer) return;

    let hydrationState = {
        total: 1000,
        goal: 3000
    };

    function loadState() {
        const saved = localStorage.getItem(getUserKey('aureus_hydration'));
        if (saved) {
            hydrationState = JSON.parse(saved);
        }
    }

    function saveState() {
        localStorage.setItem(getUserKey('aureus_hydration'), JSON.stringify(hydrationState));
    }

    function updateUI() {
        // Text update: "1,250 / <br> 2,500ml"
        // We'll trust the goal from state, or default 2500 if not in state? 
        // fasting-renderer.js used 3000 default. Let's stick to what's in state.

        let goal = hydrationState.goal || 2500;

        waterCountEl.innerHTML = `${hydrationState.total.toLocaleString()} / <br> ${goal.toLocaleString()}ml`;

        // Drops update
        // We have 8 drops in HTML.
        const drops = dropsContainer.querySelectorAll('.fa-droplet');
        const percentage = Math.min(hydrationState.total / goal, 1);
        const activeCount = Math.floor(percentage * drops.length);

        drops.forEach((drop, idx) => {
            if (idx < activeCount) {
                drop.classList.add('active');
                drop.style.color = '#3B82F6'; // Ensure color is blue
                drop.style.filter = 'drop-shadow(0 0 5px rgba(59, 130, 246, 0.5))'; // Add glow
            } else {
                drop.classList.remove('active');
                drop.style.color = ''; // Reset to CSS default (usually gray/dark)
                drop.style.filter = '';
            }
        });
    }

    // Init
    loadState();
    updateUI();

    // Listener
    if (btnAddWater) {
        btnAddWater.addEventListener('click', () => {
            const amount = 250;
            hydrationState.total += amount;
            saveState();
            updateUI();
        });
    }

    // Listen for storage changes (if modified in another tab)
    window.addEventListener('storage', (e) => {
        if (e.key === getUserKey('aureus_hydration')) {
            loadState();
            updateUI();
        }
    });
}

function initFastingTimer() {
    const timerDigits = document.getElementById('timerDigits');
    const badgeText = document.getElementById('badgeText');
    const ringProgress = document.getElementById('ringProgress');
    const knobContainer = document.getElementById('knobContainer');
    const targetTimeDisplay = document.getElementById('targetTimeDisplay');
    const progressPercentDisplay = document.getElementById('progressPercentDisplay');
    const dashboardPhaseBadge = document.getElementById('dashboardPhaseBadge');

    const btnStart = document.getElementById('btnStartFast');
    const activeControls = document.getElementById('activeControls');
    const btnEnd = document.getElementById('btnEndFast');
    const btnRestart = document.getElementById('btnRestartFast');

    // State
    let fastingState = {
        isFasting: false,
        startTime: null,
        targetHours: 16,
        endTime: null
    };

    let timerInterval;

    function loadState() {
        const saved = localStorage.getItem(getUserKey('aureus_fasting_state'));
        if (saved) {
            fastingState = JSON.parse(saved);
        }
    }

    function saveState() {
        localStorage.setItem(getUserKey('aureus_fasting_state'), JSON.stringify(fastingState));
    }

    function updateTimer() {
        if (!fastingState.isFasting || !fastingState.startTime) {
            // UI Reset / Ready State
            if (timerDigits) timerDigits.innerText = `${fastingState.targetHours}:00:00`;
            if (badgeText) badgeText.innerText = "READY";
            if (targetTimeDisplay) targetTimeDisplay.innerText = `Target: --:--`;
            if (progressPercentDisplay) progressPercentDisplay.innerText = "0%";
            if (ringProgress) ringProgress.style.strokeDashoffset = 848;
            if (knobContainer) knobContainer.style.transform = `rotate(0deg)`;

            btnStart.classList.remove('hidden');
            activeControls.classList.add('hidden');
            return;
        }

        const now = new Date().getTime();
        const elapsed = now - fastingState.startTime;
        const totalDuration = fastingState.targetHours * 3600 * 1000;

        // Format Elapsed
        const totalSeconds = Math.floor(elapsed / 1000);
        const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');

        if (timerDigits) timerDigits.innerText = `${hours}:${minutes}:${seconds}`;

        // Circular Progress
        let pct = (elapsed / totalDuration) * 100;
        let drawPct = pct > 100 ? 100 : pct;
        if (drawPct < 0) drawPct = 0;

        const circleCircumference = 848;
        const dashOffset = circleCircumference - (circleCircumference * drawPct / 100);

        if (ringProgress) ringProgress.style.strokeDashoffset = dashOffset;
        if (knobContainer) knobContainer.style.transform = `rotate(${360 * (drawPct / 100)}deg)`;
        if (progressPercentDisplay) progressPercentDisplay.innerText = `${Math.floor(pct)}%`;

        if (fastingState.endTime && targetTimeDisplay) {
            const endDate = new Date(fastingState.endTime);
            const endHours = endDate.getHours().toString().padStart(2, '0');
            const endMins = endDate.getMinutes().toString().padStart(2, '0');
            targetTimeDisplay.innerText = `Target: ${endHours}:${endMins}`;
        }

        // Phase Check
        const elapsedHours = totalSeconds / 3600;
        let phaseName = "FASTING";
        let phaseIcon = "fa-play";

        if (elapsedHours >= 24) { phaseName = "DEEP CLEAN"; phaseIcon = "fa-wand-magic-sparkles"; }
        else if (elapsedHours >= 16) { phaseName = "AUTOPHAGY"; phaseIcon = "fa-recycle"; }
        else if (elapsedHours >= 12) { phaseName = "KETOSIS"; phaseIcon = "fa-bolt"; }
        else if (elapsedHours >= 4) { phaseName = "SUGAR DROP"; phaseIcon = "fa-cube"; }

        if (badgeText) {
            badgeText.innerText = `${phaseName} ACTIVE`;
            const icon = badgeText.parentElement.querySelector('i');
            if (icon) icon.className = `fa-solid ${phaseIcon}`;
        }

        if (dashboardPhaseBadge) {
            dashboardPhaseBadge.innerText = `${fastingState.targetHours}:8 IF`;
        }

        // Toggle Buttons
        btnStart.classList.add('hidden');
        activeControls.classList.remove('hidden');
    }

    function startFast() {
        console.log("Start Fasting Clicked");
        fastingState.isFasting = true;
        fastingState.startTime = new Date().getTime();
        fastingState.endTime = fastingState.startTime + (fastingState.targetHours * 3600 * 1000);
        saveState();
        updateTimer();
    }

    function endFast() {
        console.log("End Fast Clicked");
        // Removing confirm() temporarily to ensure functionality
        fastingState.isFasting = false;
        fastingState.startTime = null;
        fastingState.endTime = null;
        saveState();
        updateTimer();
    }

    function restartFast() {
        console.log("Restart Fast Clicked");
        startFast();
    }

    // Init
    loadState();
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);

    // listeners
    if (btnStart) btnStart.addEventListener('click', startFast);
    if (btnEnd) btnEnd.addEventListener('click', endFast);
    if (btnRestart) btnRestart.addEventListener('click', restartFast);

    // Sync from other page
    window.addEventListener('storage', (e) => {
        if (e.key === getUserKey('aureus_fasting_state')) {
            loadState();
            updateTimer();
        }
        if (e.key === getUserKey('aureus_user_settings') || (e.key && e.key.includes('_aureus_log_')) || e.key === 'aureus_targets_updated') {
            initMacroChart();
        }
    });
}

