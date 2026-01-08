document.addEventListener('DOMContentLoaded', () => {

    // --- State ---
    let fastingState = {
        isFasting: false,
        startTime: null,
        targetHours: 16,
        endTime: null,
        weeklyGoal: 112 // Default to 16h * 7 days
    };

    let hydrationState = {
        total: 1500, // Starting Mock
        goal: 3000
    };

    // --- Elements ---
    // --- Elements ---
    const timerDigits = document.getElementById('timerDigits');
    const badgeText = document.getElementById('badgeText'); // Replaces timerStatusText
    const btnStartFast = document.getElementById('btnStartFast'); // Main Action Button

    // Circular Timer Elements
    const ringProgress = document.getElementById('ringProgress');
    const knobContainer = document.getElementById('knobContainer');
    const progressPercentDisplay = document.getElementById('progressPercentDisplay');
    const targetTimeDisplay = document.getElementById('targetTimeDisplay');

    const tabs = document.querySelectorAll('.timer-tab-btn');

    // Header Status (Optional if present)
    const statusPillText = document.getElementById('headerStatusText');
    const headerGoalText = document.getElementById('headerGoalText');

    // Hydration
    const waterFill = document.querySelector('.water-rect-fill');
    const waterLabel = document.querySelector('.water-rect-text');
    const waterValDisplay = document.querySelector('.header-right-val');

    // Metabolic Timeline Elements
    const timelineFill = document.querySelector('.timeline-progress-bar'); // Updated class
    const phasePoints = document.querySelectorAll('.timeline-point'); // Updated class

    // --- Phase Descriptions ---
    // --- Phase Descriptions (Rich Content) ---
    const phaseData = {
        'Start': {
            name: 'Start',
            time: '0h - 4h',
            icon: 'fa-play',
            markerClass: 'phase-start',
            desc: 'Your body is digesting your last meal and using stored glucose for energy. Blood sugar levels are typically elevated.',
            benefits: [
                "Glucose provided energy",
                "Normal metabolic function",
                "Nutrient absorption"
            ],
            tip: "Drink water to prepare for the fast ahead."
        },
        'Sugar Drop': {
            name: 'Sugar Drop',
            time: '4h - 12h',
            icon: 'fa-cube',
            markerClass: 'phase-sugar',
            desc: 'Insulin levels drop and your body starts to burn through stored glycogen. You might feel hungry as your body adapts.',
            benefits: [
                "Blood sugar stabilizes",
                "Insulin levels decrease",
                "Digestive system rests"
            ],
            tip: "Stay hydrated to manage hunger pangs."
        },
        'Ketosis': {
            name: 'Ketosis',
            time: '12h - 16h',
            icon: 'fa-bolt',
            markerClass: 'phase-ketosis',
            desc: 'Your body runs out of glucose and switches to burning fat for fuel. The liver begins producing ketones.',
            benefits: [
                "Fat burning mode active",
                "Increased mental clarity",
                "Reduced cravings"
            ],
            tip: "Great time for light to moderate exercise."
        },
        'Autophagy': {
            name: 'Autophagy',
            time: '16h - 24h',
            icon: 'fa-recycle',
            markerClass: 'phase-autophagy',
            desc: 'Cellular cleanup begins. Your cells start recycling old components and repairing themselves.',
            benefits: [
                "Cellular repair & renewal",
                "Anti-aging effects",
                "Immune system boost"
            ],
            tip: "Deep focus work is often easier now."
        },
        'Deep Clean': {
            name: 'Deep Clean',
            time: '24h+',
            icon: 'fa-wand-magic-sparkles',
            markerClass: 'phase-deep',
            desc: 'Peak autophagy and growth hormone production. Significant reduction in inflammation and deep tissue repair.',
            benefits: [
                "Maximal inflammation reduction",
                "Growth hormone surge",
                "Gut lining repair"
            ],
            tip: "Listen to your body; break fast if unwell."
        }
    };

    // --- Metabolic Phase Tooltip Logic ---
    let activeTooltip = null;

    const createTooltip = () => {
        // Remove existing if any (cleanup)
        const existing = document.querySelector('.phase-tooltip');
        if (existing) existing.remove();

        const el = document.createElement('div');
        el.className = 'phase-tooltip'; // Use the premium class
        document.body.appendChild(el);
        return el;
    };

    const tooltip = createTooltip();

    phasePoints.forEach(point => {
        point.addEventListener('mouseenter', (e) => {
            const phaseLabel = point.querySelector('.p-lbl');
            if (!phaseLabel) return;

            // Use textContent to get the original text (e.g. "Sugar Drop") 
            // instead of innerText which might be uppercase ("SUGAR DROP") due to CSS.
            const phaseName = phaseLabel.textContent.trim();
            const data = phaseData[phaseName];

            if (data) {
                // Generate Benefits List HTML
                const benefitsHtml = data.benefits.map(b => `<li>${b}</li>`).join('');

                tooltip.innerHTML = `
                    <div class="tooltip-close-btn"><i class="fa-solid fa-xmark"></i></div>
                    
                    <div class="tooltip-header">
                        <div class="tooltip-icon ${data.markerClass}">
                            <i class="fa-solid ${data.icon}"></i>
                        </div>
                        <div class="tooltip-title-group">
                            <h3>${data.name}</h3>
                            <div class="tooltip-time-range">${data.time}</div>
                        </div>
                    </div>

                    <div class="tooltip-description">
                        ${data.desc}
                    </div>

                    <div class="tooltip-benefits">
                        <h4>Key Benefits</h4>
                        <ul>
                            ${benefitsHtml}
                        </ul>
                    </div>

                    <div class="tooltip-tip">
                        <i class="fa-solid fa-lightbulb tooltip-tip-icon"></i>
                        <span class="tooltip-tip-text"><strong>Pro Tip:</strong> ${data.tip}</span>
                    </div>
                `;

                // Add visible class FIRST to measure height accurately
                tooltip.classList.add('visible');

                // Basic positioning logic
                const rect = point.getBoundingClientRect();
                const tooltipHeight = tooltip.offsetHeight || 300;
                const tooltipWidth = tooltip.offsetWidth || 320;

                // Center horizontally
                let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);

                // Position above, flip if too close to top
                let top = rect.top - tooltipHeight - 20;
                if (top < 20) {
                    top = rect.bottom + 20; // Flip to below
                }

                // Boundary checks
                if (left < 20) left = 20;
                if (left + tooltipWidth > window.innerWidth - 20) left = window.innerWidth - tooltipWidth - 20;

                tooltip.style.left = `${left}px`;
                tooltip.style.top = `${top}px`;

                // Close button listener
                const closeBtn = tooltip.querySelector('.tooltip-close-btn');
                if (closeBtn) {
                    closeBtn.onclick = (e) => {
                        e.stopPropagation();
                        tooltip.classList.remove('visible');
                    };
                }
            }
        });

        point.addEventListener('mouseleave', (e) => {
            // Optional: Delay hide to allow moving mouse into tooltip if interactive
            setTimeout(() => {
                if (!tooltip.matches(':hover')) {
                    tooltip.classList.remove('visible');
                }
            }, 100);
        });
    });

    // Add listener to tooltip itself to stay open on hover
    tooltip.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
    });

    if (btnStartFast) {
        btnStartFast.addEventListener('click', () => {
            if (fastingState.isFasting) {
                endFast();
            } else {
                openPlanModal();
            }
        });
    }

    // --- Fasting Plan Modal Logic ---
    const planModal = document.getElementById('fastingPlanModal');
    const closePlanModalBtn = document.getElementById('closePlanModal');

    window.openPlanModal = () => {
        if (planModal) planModal.classList.remove('hidden');
    };

    if (closePlanModalBtn) {
        closePlanModalBtn.addEventListener('click', () => {
            if (planModal) planModal.classList.add('hidden');
        });
    }

    // Global function for onclick in the HTML
    window.selectPlan = (hours) => {
        // Set goal
        fastingState.targetHours = hours;

        // Update headers to reflect choice immediately (optional)
        const headerGoal = document.getElementById('headerGoalText');
        if (headerGoal) headerGoal.innerText = `Goal: ${hours}h TRF`;
        if (headerGoalText) headerGoalText.textContent = `Goal: ${hours}h Fast`; // consistency with var name

        // Start the fast
        startFast();

        // Close modal
        if (planModal) planModal.classList.add('hidden');
    };

    // Make addWater global for direct calls (if we add buttons back, currently removed in simplified UI but good to keep logic)
    window.addWater = (amount) => {
        hydrationState.total += amount;
        saveState();
        updateHydrationUI();
    };


    // --- Core Logic ---

    function startFast() {
        fastingState.isFasting = true;
        fastingState.startTime = new Date().getTime();
        // Calculate End Time
        fastingState.endTime = fastingState.startTime + (fastingState.targetHours * 60 * 60 * 1000);

        saveState();
        updateUIActiveState(true);
        tick();
    }

    function endFast() {
        if (fastingState.startTime) {
            const now = new Date().getTime();
            const duration = now - fastingState.startTime;
            // Only save if duration is meaningful (e.g. > 1 min? For testing maybe any)
            if (duration > 60 * 1000) {
                saveFastToHistory(duration);
            }
        }

        fastingState.isFasting = false;
        fastingState.startTime = null;
        fastingState.endTime = null;
        saveState();
        resetUI();
    }

    function updateUIActiveState(isActive) {
        if (isActive) {
            btnStartFast.innerHTML = `End Fast`;
            btnStartFast.classList.remove('btn-pill-white');
            btnStartFast.classList.add('btn-pill-dark'); // Darken it to indicate 'Stop' or secondary action
            // Or keep it white but change text. Let's invert it for 'Stop'
            btnStartFast.style.backgroundColor = '#ff4444';
            btnStartFast.style.color = '#fff';

            if (statusPillText) statusPillText.innerText = 'Fasting Active';
            if (statusPillText) statusPillText.style.color = '#D4F458'; // Lime
        } else {
            btnStartFast.innerHTML = `Start Fast`;
            btnStartFast.classList.add('btn-pill-white');
            btnStartFast.classList.remove('btn-pill-dark');
            btnStartFast.style.backgroundColor = '';
            btnStartFast.style.color = '';

            if (statusPillText) statusPillText.innerText = 'Not Fasting';
            if (statusPillText) statusPillText.style.color = '#fff';

            if (badgeText) badgeText.innerText = 'READY';
        }

        if (isActive && badgeText) {
            badgeText.innerText = 'KETOSIS ACTIVE'; // Or dynamic based on phase
        }
    }

    function tick() {
        if (!fastingState.isFasting) return;

        const now = new Date().getTime();
        const elapsed = now - fastingState.startTime;
        const totalDuration = fastingState.targetHours * 60 * 60 * 1000;

        let progress = (elapsed / totalDuration) * 100;

        // Visuals
        updateTimerDisplay(elapsed, totalDuration);
        // Visuals
        updateTimerDisplay(elapsed, totalDuration);
        updateTimeline(elapsed / (1000 * 60 * 60)); // Hours elapsed
    }

    function updateTimerDisplay(elapsedMs, totalMs) {
        if (!fastingState.isFasting && !fastingState.startTime) {
            // Ready State
            if (timerDigits) timerDigits.innerText = `${fastingState.targetHours}:00:00`;
            if (badgeText) badgeText.innerText = "READY";

            // Show preview target if not fasting
            if (targetTimeDisplay) {
                const previewEndDate = new Date();
                previewEndDate.setTime(previewEndDate.getTime() + (fastingState.targetHours * 3600 * 1000));
                const endHours = previewEndDate.getHours().toString().padStart(2, '0');
                const endMins = previewEndDate.getMinutes().toString().padStart(2, '0');
                targetTimeDisplay.innerText = `Target: ${endHours}:${endMins}`;
            }

            if (progressPercentDisplay) progressPercentDisplay.innerText = "0%";

            // Reset Ring
            if (ringProgress) {
                ringProgress.style.strokeDashoffset = 848; // Empty
            }
            if (knobContainer) {
                knobContainer.style.transform = `rotate(0deg)`;
            }
            return;
        }

        // Format Elapsed Time HH:MM:SS
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');

        if (timerDigits) timerDigits.innerText = `${hours}:${minutes}:${seconds}`;

        // Update Circular Progress
        let pct = (elapsedMs / totalMs) * 100;
        let drawPct = pct > 100 ? 100 : pct;
        if (drawPct < 0) drawPct = 0;

        const circleCircumference = 848; // 2 * pi * 135
        const dashOffset = circleCircumference - (circleCircumference * drawPct / 100);

        if (ringProgress) {
            ringProgress.style.strokeDashoffset = dashOffset;
        }

        if (knobContainer) {
            knobContainer.style.transform = `rotate(${360 * (drawPct / 100)}deg)`;
        }

        if (progressPercentDisplay) {
            progressPercentDisplay.innerText = `${Math.floor(pct)}%`;
        }

        // Target Time Display
        if (fastingState.endTime && targetTimeDisplay) {
            const endDate = new Date(fastingState.endTime);
            const endHours = endDate.getHours().toString().padStart(2, '0');
            const endMins = endDate.getMinutes().toString().padStart(2, '0');
            targetTimeDisplay.innerText = `Target: ${endHours}:${endMins}`;
        }

        // Determine Phase & Update Badge
        const elapsedHours = totalSeconds / 3600;
        let phaseName = "FASTING";
        let phaseIcon = "fa-play";

        if (elapsedHours >= 24) {
            phaseName = "DEEP CLEAN";
            phaseIcon = "fa-wand-magic-sparkles";
        } else if (elapsedHours >= 16) {
            phaseName = "AUTOPHAGY";
            phaseIcon = "fa-recycle";
        } else if (elapsedHours >= 12) {
            phaseName = "KETOSIS";
            phaseIcon = "fa-bolt";
        } else if (elapsedHours >= 4) {
            phaseName = "SUGAR DROP";
            phaseIcon = "fa-cube";
        }

        if (badgeText) {
            badgeText.innerText = `${phaseName} ACTIVE`;
            // Update icon
            const badgeIcon = badgeText.parentElement.querySelector('i');
            if (badgeIcon) {
                badgeIcon.className = `fa-solid ${phaseIcon}`;
            }
        }
    }

    function resetUI() {
        updateUIActiveState(false);
        updateTimerDisplay(0, 100); // Drives reset via updateTimerDisplay
        updateTimeline(0);
        updateHydrationUI();
    }

    function updateTimeline(elapsedHours) {
        // Logic: 0-4h, 4-12h, 12-16h...
        // Map 24h to 100% width
        let widthPct = (elapsedHours / 24) * 100;
        if (widthPct > 100) widthPct = 100;
        if (timelineFill) timelineFill.style.width = `${widthPct}%`;

        // Update Points
        const milestones = [
            { hour: 0, el: phasePoints[0], name: 'Start' },
            { hour: 4, el: phasePoints[1], name: 'Sugar Drop' },
            { hour: 12, el: phasePoints[2], name: 'Ketosis' },
            { hour: 16, el: phasePoints[3], name: 'Autophagy' },
            { hour: 24, el: phasePoints[4], name: 'Deep Clean' }
        ];

        let currentPhaseIndex = -1;

        milestones.forEach((m, idx) => {
            // Logic: if elapsed >= m.hour, it is "active" (passed)
            if (elapsedHours >= m.hour) {
                m.el.classList.add('active'); // CSS checks .timeline-point.active
                currentPhaseIndex = idx;
            } else {
                m.el.classList.remove('active');
            }
            m.el.classList.remove('current'); // Clean current

            // Clean inline label color from previous ticks
            const label = m.el.querySelector('.timeline-label');
            if (label) label.style.color = '';
        });

        if (currentPhaseIndex >= 0) {
            const activeM = milestones[currentPhaseIndex];
            activeM.el.classList.add('current');

            // Header Badge Update (New Selector)
            const currentPhaseBadge = document.getElementById('currentPhaseBadge');
            if (currentPhaseBadge) currentPhaseBadge.innerText = activeM.name;

            // Fallback for old selector if mixed
            const oldBadge = document.querySelector('.metabolic-card .status-pill-track span');
            if (oldBadge) oldBadge.innerText = activeM.name;

            // Note: We rely on CSS .timeline-point.current .p-lbl for color now.
        } else {
            // Reset if no phase (e.g. 0h but start is 0, so usually always start)
            const currentPhaseBadge = document.getElementById('currentPhaseBadge');
            if (currentPhaseBadge) currentPhaseBadge.innerText = 'Not Started';
        }
    }

    function updateHydrationUI() {
        if (waterValDisplay) waterValDisplay.innerHTML = `${hydrationState.total.toLocaleString()} <small style="font-size:14px; font-weight:400; color:#888;">ml</small>`;

        const pct = Math.min((hydrationState.total / hydrationState.goal) * 100, 100);
        if (waterFill) waterFill.style.height = `${pct}%`;
        if (waterLabel) waterLabel.innerText = `${Math.round(pct)}% Goal`;
    }

    // --- Persistence ---
    function saveState() {
        localStorage.setItem(getUserKey('aureus_fasting_state'), JSON.stringify(fastingState));
        localStorage.setItem(getUserKey('aureus_hydration'), JSON.stringify(hydrationState));
    }

    function loadState() {
        const savedFasting = JSON.parse(localStorage.getItem(getUserKey('aureus_fasting_state')));
        if (savedFasting) fastingState = savedFasting;

        const savedHydro = JSON.parse(localStorage.getItem(getUserKey('aureus_hydration')));
        if (savedHydro) hydrationState = savedHydro;
    }

    // --- Hydration Modal Logic ---
    const hydrationCard = document.querySelector('.card-premium-dark'); // The hydration card
    const hydroModal = document.getElementById('hydrationModal');
    const closeHydroModalBtn = document.getElementById('closeHydroModal');
    const hydroModalValue = document.getElementById('hydroModalValue');
    const hydroModalGoal = document.getElementById('hydroModalGoal');

    // Inputs
    const customWaterInput = document.getElementById('customWaterInput');
    const btnAddCustomWater = document.getElementById('btnAddCustomWater');
    const customGoalInput = document.getElementById('customGoalInput');
    const btnSetGoal = document.getElementById('btnSetGoal');
    const btnResetWater = document.getElementById('btnResetWater');

    // --- Timer Edit Modal Logic ---
    const btnAdjust = document.getElementById('btnAdjust');
    const timerEditModal = document.getElementById('timerEditModal');
    const closeTimerEditModal = document.getElementById('closeTimerEditModal');
    const editStartTimeInput = document.getElementById('editStartTimeInput');
    const editGoalInput = document.getElementById('editGoalInput');
    const btnSaveTimerEdit = document.getElementById('btnSaveTimerEdit');

    if (btnAdjust) {
        btnAdjust.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent modal bubble if nested
            openTimerEditModal();
        });
    }

    if (closeTimerEditModal) {
        closeTimerEditModal.addEventListener('click', () => {
            timerEditModal.classList.add('hidden');
        });
    }

    if (btnSaveTimerEdit) {
        btnSaveTimerEdit.addEventListener('click', () => {
            saveTimerEdit();
            timerEditModal.classList.add('hidden');
        });
    }

    // Quick Shift logic for buttons in Edit Modal
    window.shiftStartTime = (hours) => {
        if (!editStartTimeInput) return;

        let currentDateVal = new Date();
        if (editStartTimeInput.value) {
            currentDateVal = new Date(editStartTimeInput.value);
        }

        // Add hours
        currentDateVal.setTime(currentDateVal.getTime() + (hours * 3600 * 1000));

        // Update input
        // Adjust for timezone to keep local string correct
        const isoLocal = new Date(currentDateVal.getTime() - (currentDateVal.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        editStartTimeInput.value = isoLocal;
    };

    function openTimerEditModal() {
        if (!timerEditModal) return;

        // 1. Set Start Time Input
        if (fastingState.isFasting && fastingState.startTime) {
            // Format datetime-local: YYYY-MM-DDTHH:MM
            const d = new Date(fastingState.startTime);
            // Adjust to local ISO string somewhat manually to ensure local time is shown
            // new Date().toISOString() gives UTC. 
            // Better:
            const isoLocal = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            editStartTimeInput.value = isoLocal;
        } else {
            // Default to now
            const d = new Date();
            const isoLocal = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            editStartTimeInput.value = isoLocal;
        }

        // 2. Set Goal Input
        editGoalInput.value = fastingState.targetHours;

        timerEditModal.classList.remove('hidden');
    }

    function saveTimerEdit() {
        const newStartVal = editStartTimeInput.value;
        const newGoal = parseInt(editGoalInput.value);

        if (newStartVal) {
            // If user wasn't fasting, should we start it? 
            // Assuming "Adjust" implies modifying existing or retroactively starting.
            // Let's assume if not fasting, this starts a fast at that time.
            if (!fastingState.isFasting) {
                fastingState.isFasting = true;
                const btn = document.getElementById('btnStartFast');
                if (btn) btn.innerText = 'End Fast';
            }
            fastingState.startTime = new Date(newStartVal).getTime();
        }

        if (newGoal && newGoal > 0) {
            fastingState.targetHours = newGoal;
            // Update header goal text
            const hGoal = document.getElementById('headerGoalText');
            if (hGoal) hGoal.innerText = `Goal: ${newGoal}h TRF`;
        }

        saveState();
        tick(); // Immediate update
    }

    // --- Hydration Modal Logic ---
    // Open Modal
    if (hydrationCard) {
        hydrationCard.addEventListener('click', (e) => {
            // If user clicked one of the pill buttons, don't open modal
            if (e.target.closest('.btn-water-pill')) return;

            openHydrationModal();
        });
    }

    function openHydrationModal() {
        if (!hydroModal) return;
        hydroModal.classList.remove('hidden');
        updateModalUI();
    }

    function closeHydrationModal() {
        if (!hydroModal) return;
        hydroModal.classList.add('hidden');
    }

    if (closeHydroModalBtn) {
        closeHydroModalBtn.addEventListener('click', closeHydrationModal);
    }

    // Close on backdrop
    if (hydroModal) {
        hydroModal.addEventListener('click', (e) => {
            if (e.target === hydroModal) closeHydrationModal();
        });
    }

    function updateModalUI() {
        if (hydroModalValue) hydroModalValue.innerText = hydrationState.total.toLocaleString();
        if (hydroModalGoal) hydroModalGoal.innerText = hydrationState.goal.toLocaleString();
        if (customGoalInput) customGoalInput.value = hydrationState.goal;
    }

    // Custom Actions in Modal
    window.adjustWater = (amount) => {
        // Prevent negative total
        if (hydrationState.total + amount < 0) {
            hydrationState.total = 0;
        } else {
            hydrationState.total += amount;
        }
        saveState();
        updateHydrationUI();
        updateModalUI();
    };

    if (btnAddCustomWater) {
        btnAddCustomWater.addEventListener('click', () => {
            const val = parseInt(customWaterInput.value);
            if (!isNaN(val) && val > 0) {
                adjustWater(val);
                customWaterInput.value = '';
            }
        });
    }

    if (btnSetGoal) {
        btnSetGoal.addEventListener('click', () => {
            const val = parseInt(customGoalInput.value);
            if (!isNaN(val) && val > 0) {
                hydrationState.goal = val;
                saveState();
                updateHydrationUI();
                updateModalUI();
                alert("Daily goal updated!");
            }
        });
    }

    if (btnResetWater) {
        btnResetWater.addEventListener('click', () => {
            if (confirm("Reset today's water log to 0?")) {
                hydrationState.total = 0;
                saveState();
                updateHydrationUI();
                updateModalUI();
            }
        });
    }

    // --- Chart Tooltip Logic (New) ---
    const chartContainer = document.getElementById('fastingWeeklyChart');
    if (chartContainer) {
        const cols = chartContainer.querySelectorAll('.chart-col');

        const getTooltip = () => {
            let t = document.getElementById('fast-chart-tooltip');
            if (!t) {
                t = document.createElement('div');
                t.id = 'fast-chart-tooltip';
                t.style.position = 'fixed';
                t.style.zIndex = '9999';
                t.style.background = '#18181b';
                t.style.border = '1px solid #3f3f46';
                t.style.borderRadius = '8px';
                t.style.padding = '10px 14px';
                t.style.pointerEvents = 'none';
                t.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.5)';
                t.style.fontFamily = 'Inter, sans-serif';
                t.style.fontSize = '12px';
                t.style.color = '#fff';
                t.style.minWidth = '100px';
                t.style.textAlign = 'center';
                document.body.appendChild(t);
            }
            return t;
        };

        cols.forEach(col => {
            const show = () => {
                const day = col.getAttribute('data-day');
                const hours = col.getAttribute('data-hours');
                const t = getTooltip();

                t.innerHTML = `
                    <div style="font-weight:700; color:#fff; margin-bottom:4px; border-bottom:1px solid #333; padding-bottom:4px;">${day}</div>
                    <div style="color:#a1a1aa;">Fasted <span style="color:#FACC15; font-weight:700; font-size:13px;">${hours}h</span></div>
                `;

                const rect = col.getBoundingClientRect();
                t.style.display = 'block';
                // Center tooltip above bar
                const leftPos = rect.left + (rect.width / 2) - (t.offsetWidth / 2);
                const topPos = rect.top - t.offsetHeight - 10;

                t.style.left = `${leftPos}px`;
                t.style.top = `${topPos}px`;

                // Visual feedback
                const bar = col.querySelector('div');
                if (bar) {
                    bar.style.transform = 'scaleY(1.05)';
                    bar.style.filter = 'brightness(1.3)';
                }
            };

            const hide = () => {
                const t = getTooltip();
                t.style.display = 'none';
                // Reset visual feedback
                const bar = col.querySelector('div');
                if (bar) {
                    bar.style.transform = 'scaleY(1)';
                    bar.style.filter = 'none';
                }
            };

            col.addEventListener('mouseenter', show);
            col.addEventListener('mouseleave', hide);
            col.addEventListener('touchstart', show); // Mobile
        });

        // --- Insights Calculation (New) ---
        function updateWeeklyInsights() {
            const cols = document.querySelectorAll('#fastingWeeklyChart .chart-col');
            let totalDeepHours = 0;
            let totalHours = 0;
            let count = 0;

            cols.forEach(col => {
                const h = parseFloat(col.getAttribute('data-hours') || 0);
                totalHours += h;
                count++;
                // Deep Ketosis usually starts after 12h
                if (h > 12) {
                    totalDeepHours += (h - 12);
                }
            });

            const avgH = totalHours / (count || 1);

            // 1. Deep Ketosis total
            const elDeep = document.getElementById('deepKetosisVal');
            if (elDeep) {
                elDeep.innerHTML = `${Math.round(totalDeepHours * 10) / 10} hours`;
            }

            // 2. AVG Ketones
            const elKetones = document.getElementById('avgKetonesVal');
            if (elKetones) {
                const val = 1.0 + (totalDeepHours / 30);
                elKetones.innerHTML = val.toFixed(1);
            }

            // 3. GKI Index
            const elGKI = document.getElementById('gkiIndexVal');
            if (elGKI) {
                const val = Math.max(25, Math.round(110 - totalDeepHours));
                elGKI.innerHTML = val;
            }
        }

        // Call initially
        setTimeout(updateWeeklyInsights, 100); // Slight delay to ensure DOM is ready

    }

    // Sync from other page (Dashboard)
    window.addEventListener('storage', (e) => {
        if (e.key === getUserKey('aureus_fasting_state')) {
            loadState();
            if (fastingState.isFasting) {
                updateUIActiveState(true);
                tick();
            } else {
                resetUI();
            }
        }
        if (e.key === getUserKey('aureus_hydration')) {
            loadState();
            updateHydrationUI();
        }
    });

    // --- Yearly Fasting History (Heatmap) Logic ---

    // Constants
    const HISTORY_KEY = getUserKey('aureus_fasting_history');

    function getHistory() {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    function saveFastToHistory(durationMs) {
        const history = getHistory();
        const now = new Date();
        const todayStr = formatLocalDate(now);

        // Check if entry for today exists
        const existingIndex = history.findIndex(h => h.date === todayStr);

        const entryData = {
            date: todayStr,
            duration: durationMs,
            completed: true,
            startTime: fastingState.startTime,
            endTime: now.getTime(),
            targetHours: fastingState.targetHours
        };

        if (existingIndex >= 0) {
            // Update existing (merge durations and keep latest times)
            history[existingIndex].duration += durationMs;
            history[existingIndex].endTime = entryData.endTime;
            history[existingIndex].completed = true;
        } else {
            history.push(entryData);
        }

        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        renderHistoryCalendar();
        updateMetabolicCard(); // Refresh metabolic data
    }

    let currentViewDate = new Date();

    function renderHistoryCalendar() {
        const grid = document.getElementById('historyCalendarGrid');
        const monthYearLabel = document.getElementById('currentMonthYear');
        if (!grid || !monthYearLabel) return;

        const history = getHistory();
        const year = currentViewDate.getFullYear();
        const month = currentViewDate.getMonth();

        // Month Names for Label
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthYearLabel.innerText = `${monthNames[month]} ${year}`;

        // Get first day of month and last day of month
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Monday start adjustment (JS 0=Sun, 1=Mon... We want 1-7 basically)
        let startDayIndex = firstDay.getDay(); // 0-6
        startDayIndex = startDayIndex === 0 ? 6 : startDayIndex - 1; // Mon=0 ... Sun=6

        grid.innerHTML = '';

        // Fill empty slots before 1st of month
        for (let i = 0; i < startDayIndex; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day empty';
            grid.appendChild(empty);
        }

        let monthlyTotalMs = 0;
        let daysWithFasts = 0;
        const todayStr = formatLocalDate(new Date());

        // Fill days of month
        for (let d = 1; d <= lastDay.getDate(); d++) {
            const dateObj = new Date(year, month, d);
            const dateStr = formatLocalDate(dateObj);
            const entry = history.find(h => h.date === dateStr);

            const dayEl = document.createElement('div');
            dayEl.className = 'calendar-day';
            dayEl.style.cursor = 'pointer';
            if (dateStr === todayStr) dayEl.classList.add('today');

            const dayNum = document.createElement('span');
            dayNum.className = 'day-num';
            dayNum.innerText = d;
            dayEl.appendChild(dayNum);

            const indicator = document.createElement('div');
            indicator.className = 'status-indicator';
            dayEl.appendChild(indicator);

            if (entry && entry.duration > 0) {
                dayEl.classList.add('completed');
                monthlyTotalMs += entry.duration;
                daysWithFasts++;

                // Tooltip info
                const hours = (entry.duration / (1000 * 60 * 60)).toFixed(1);
                dayEl.title = `${hours}h Fasted`;
            }

            // Click listener for Daily Summary
            dayEl.onclick = () => showDailySummary(dateStr, entry);

            grid.appendChild(dayEl);
        }

        // Update Stats
        const hoursEl = document.getElementById('monthlyTotalHours');
        const daysEl = document.getElementById('monthlyCompletedDays');
        const streakEl = document.getElementById('monthlyBestStreak');

        if (hoursEl) hoursEl.innerText = `${Math.floor(monthlyTotalMs / (1000 * 60 * 60))}h`;
        if (daysEl) daysEl.innerText = daysWithFasts;
        if (streakEl) streakEl.innerText = calculateStreak(history);
    }

    function showDailySummary(dateStr, entry) {
        const modal = document.getElementById('dailySummaryModal');
        const dateEl = document.getElementById('summaryModalDate');
        const totalTimeEl = document.getElementById('summaryTotalTime');
        const startEl = document.getElementById('summaryStartTime');
        const endEl = document.getElementById('summaryEndTime');
        const ketosisEl = document.getElementById('summaryDeepKetosis');
        const targetEl = document.getElementById('summaryTargetGoal');
        const insightEl = document.getElementById('summaryInsightText');

        if (!modal) return;

        // Reset Date Display
        const parsedDate = new Date(dateStr + 'T12:00:00');
        dateEl.innerText = parsedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        if (!entry || !entry.duration) {
            totalTimeEl.innerText = "0h 0m";
            startEl.innerText = "--:--";
            endEl.innerText = "--:--";
            ketosisEl.innerText = "0h";
            targetEl.innerText = "16h";
            insightEl.innerText = "No fasting data recorded for this day. Small steps lead to giant metabolic transformations!";
        } else {
            const hours = Math.floor(entry.duration / (1000 * 60 * 60));
            const mins = Math.round((entry.duration % (1000 * 60 * 60)) / (1000 * 60));
            totalTimeEl.innerText = `${hours}h ${mins}m`;

            // Times
            startEl.innerText = entry.startTime ? new Date(entry.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
            endEl.innerText = entry.endTime ? new Date(entry.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--";
            targetEl.innerText = entry.targetHours ? `${entry.targetHours}h` : "16h";

            // Ketosis approx
            const h = entry.duration / (1000 * 60 * 60);
            const deep = h > 12 ? (h - 12).toFixed(1) : 0;
            ketosisEl.innerText = `${deep}h`;

            // Insights
            const target = entry.targetHours || 16;
            if (h >= target) {
                insightEl.innerText = "Exceptional performance! You completed your goal, reaching deep ketosis and maximizing cellular repair.";
            } else if (h >= 12) {
                insightEl.innerText = "Great effort! You entered metabolic switching. Close to your target, keep pushing for that extra cellular cleanup!";
            } else {
                insightEl.innerText = "Good start. Remember that the magic of autophagy and deep repair usually starts after 16 hours of fasting.";
            }
        }

        modal.classList.remove('hidden');
    }

    function initSummaryModal() {
        const modal = document.getElementById('dailySummaryModal');
        const closeBtn = document.getElementById('closeSummaryModal');
        const doneBtn = document.getElementById('closeSummaryBtn');

        if (!modal) return;

        [closeBtn, doneBtn].forEach(btn => {
            if (btn) btn.onclick = () => modal.classList.add('hidden');
        });

        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        };
    }

    function calculateStreak(history) {
        if (!history || history.length === 0) return 0;
        const sorted = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));

        let streak = 0;
        let current = new Date();
        current.setHours(0, 0, 0, 0);

        for (let i = 0; i < sorted.length; i++) {
            const entryDate = new Date(sorted[i].date);
            entryDate.setHours(0, 0, 0, 0);

            // Allow for "today" still in progress or missed yesterday
            const diff = (current - entryDate) / (1000 * 60 * 60 * 24);

            if (diff <= 1) {
                streak++;
                current = entryDate;
            } else {
                break;
            }
        }
        return streak;
    }

    // Expose helpers globally if needed or just use internally
    window.changeMonth = (offset) => {
        currentViewDate.setMonth(currentViewDate.getMonth() + offset);
        renderHistoryCalendar();
    };

    // Nav Listeners
    const btnPrev = document.getElementById('prevMonth');
    const btnNext = document.getElementById('nextMonth');
    if (btnPrev) btnPrev.onclick = () => changeMonth(-1);
    if (btnNext) btnNext.onclick = () => changeMonth(1);

    // --- Metabolic Flexibility Logic (Linked to History) ---
    function updateMetabolicCard() {
        const deepKetosisEl = document.getElementById('deepKetosisVal');
        const sparklineGrid = document.getElementById('ketosisSparkline');
        const scoreEl = document.getElementById('metabolicScore');
        const fatBurnEl = document.getElementById('fatBurnTime');
        const changeEl = document.getElementById('weeklyChange');
        const insightTextEl = document.getElementById('metabolicInsightText');
        const statusEl = document.getElementById('metabolicStatus');

        if (!deepKetosisEl || !sparklineGrid) return;

        const history = getHistory();
        const today = new Date();

        // Helper: Get range for a specific week
        function getWeekData(date) {
            const d = new Date(date);
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
            const start = new Date(d.setDate(diff));
            start.setHours(0, 0, 0, 0);

            let weeklyDeepHours = 0;
            let weeklyTotalFastingHours = 0;
            const dailyFasting = [];

            for (let i = 0; i < 7; i++) {
                const current = new Date(start);
                current.setDate(start.getDate() + i);
                const dateStr = formatLocalDate(current);
                const entry = history.find(h => h.date === dateStr);

                let dayFasting = 0;
                if (entry && entry.duration) {
                    const h = entry.duration / (1000 * 60 * 60);
                    dayFasting = h;
                    weeklyTotalFastingHours += h;
                    if (h > 12) {
                        weeklyDeepHours += (h - 12);
                    }
                }
                dailyFasting.push(dayFasting);
            }
            return { totalDeep: weeklyDeepHours, totalFasting: weeklyTotalFastingHours, daily: dailyFasting };
        }

        const currentWeek = getWeekData(today);

        // Previous Week Calculation
        const lastWeekDate = new Date();
        lastWeekDate.setDate(today.getDate() - 7);
        const lastWeek = getWeekData(lastWeekDate);

        // Update Main Val
        deepKetosisEl.innerText = `${Math.round(currentWeek.totalDeep)} hours`;

        // Render Sparkline
        let sparkHtml = '';
        const maxVal = Math.max(...currentWeek.daily, 4); // Min 4h for scale
        currentWeek.daily.forEach(val => {
            const height = (val / maxVal) * 100;
            sparkHtml += `<div class="s-bar" style="height: ${Math.max(height, 5)}%" title="${val.toFixed(1)}h"></div>`;
        });
        sparklineGrid.innerHTML = sparkHtml;

        // Update Stats Grid
        if (fatBurnEl) fatBurnEl.innerText = `${Math.round(currentWeek.totalDeep)}h`;

        // Update Weekly Goal Display
        const weeklyGoalDisplay = document.getElementById('weeklyGoalDisplay');
        if (weeklyGoalDisplay) weeklyGoalDisplay.innerText = `${fastingState.weeklyGoal}h`;

        // Metabolic Score (0-100) based on fasting hours vs custom weekly goal
        const score = Math.min(Math.round((currentWeek.totalFasting / (fastingState.weeklyGoal || 1)) * 100), 100);
        if (scoreEl) scoreEl.innerText = `${score}/100`;

        // Weekly Change
        if (changeEl) {
            const diff = currentWeek.totalDeep - lastWeek.totalDeep;
            const sign = diff >= 0 ? '+' : '';
            let pct = 0;
            if (lastWeek.totalDeep > 0) {
                pct = Math.round((diff / lastWeek.totalDeep) * 100);
            } else if (diff > 0) {
                pct = 100;
            }
            changeEl.innerText = `${sign}${pct}%`;
            changeEl.className = diff >= 0 ? 'm-stat-value text-green' : 'm-stat-value text-red';
        }

        // Dynamic Status & Insights
        if (statusEl) {
            if (score >= 90) statusEl.innerText = 'Optimal';
            else if (score >= 70) statusEl.innerText = 'Good';
            else statusEl.innerText = 'Developing';
        }

        if (insightTextEl) {
            if (currentWeek.totalDeep > lastWeek.totalDeep) {
                insightTextEl.innerText = "Excellent improvement! Your body is becoming more efficient at accessing stored fat during deeper fasting windows.";
            } else if (currentWeek.totalDeep > 0) {
                insightTextEl.innerText = "Consistent ketosis levels. Maintaining these windows promotes cellular repair and stable blood glucose levels.";
            } else {
                insightTextEl.innerText = "Focus on reaching the 12h-16h mark to unlock deep ketosis benefits like improved mental clarity and fat adaptation.";
            }
        }
    }

    // Helper to get curr week (Re-adding/Keeping logic)
    function getCurrentWeekDates() {
        const curr = new Date();
        const currentDay = curr.getDay();
        const diffToMon = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(curr);
        monday.setDate(curr.getDate() + diffToMon);
        const week = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            week.push(d.toISOString().split('T')[0]);
        }
        return week;
    }

    // Call render initially
    renderHistoryCalendar();
    updateMetabolicCard();

    // Check for save on endFast is already using internal logic.
    // We just ensure saveFastToHistory calls renderYearlyHistory (Done above).

    /* --- INIT --- */
    loadState();
    setInterval(tick, 1000);

    /* --- MOBILE MENU LOGIC --- */
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileNavDrawer = document.getElementById('mobileNavDrawer');
    const mobileNavOverlay = document.getElementById('mobileNavOverlay');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');

    function openMobileMenu() {
        if (mobileNavDrawer && mobileNavOverlay) {
            mobileNavDrawer.classList.add('open');
            mobileNavOverlay.classList.add('open');
        }
    }

    function closeMobileMenu() {
        if (mobileNavDrawer && mobileNavOverlay) {
            mobileNavDrawer.classList.remove('open');
            mobileNavOverlay.classList.remove('open');
        }
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', openMobileMenu);
    }

    if (drawerCloseBtn) {
        drawerCloseBtn.addEventListener('click', closeMobileMenu);
    }

    if (mobileNavOverlay) {
        mobileNavOverlay.addEventListener('click', closeMobileMenu);
    }

    // --- Shared Helpers ---
    function formatLocalDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    initSummaryModal();

    // --- Weekly Goal Modal Logic ---
    const weeklyGoalModal = document.getElementById('weeklyGoalModal');
    const closeWeeklyGoalModalBtn = document.getElementById('closeWeeklyGoalModal');
    const btnEditWeeklyGoal = document.getElementById('btnEditWeeklyGoal');
    const weeklyGoalInput = document.getElementById('weeklyGoalInput');
    const btnSaveWeeklyGoal = document.getElementById('btnSaveWeeklyGoal');

    function openWeeklyGoalModal() {
        if (!weeklyGoalModal) return;
        if (weeklyGoalInput) weeklyGoalInput.value = fastingState.weeklyGoal || 112;
        weeklyGoalModal.classList.remove('hidden');
    }

    function closeWeeklyGoalModal() {
        if (weeklyGoalModal) weeklyGoalModal.classList.add('hidden');
    }

    if (btnEditWeeklyGoal) {
        btnEditWeeklyGoal.addEventListener('click', openWeeklyGoalModal);
    }

    if (closeWeeklyGoalModalBtn) {
        closeWeeklyGoalModalBtn.addEventListener('click', closeWeeklyGoalModal);
    }

    if (btnSaveWeeklyGoal) {
        btnSaveWeeklyGoal.addEventListener('click', () => {
            const newGoal = parseInt(weeklyGoalInput.value);
            if (!isNaN(newGoal) && newGoal > 0) {
                fastingState.weeklyGoal = newGoal;
                saveState();
                updateMetabolicCard();
                closeWeeklyGoalModal();
            } else {
                alert("Please enter a valid number of hours.");
            }
        });
    }

    // Close on backdrop
    if (weeklyGoalModal) {
        weeklyGoalModal.addEventListener('click', (e) => {
            if (e.target === weeklyGoalModal) closeWeeklyGoalModal();
        });
    }

    // --- Ketones Info Modal Logic ---
    const ketonesInfoModal = document.getElementById('ketonesInfoModal');
    const btnKetonesInfo = document.getElementById('btnKetonesInfo');
    const closeKetonesInfoModalBtn = document.getElementById('closeKetonesInfoModal');
    const btnGotItKetones = document.getElementById('btnGotItKetones');

    function openKetonesInfoModal() {
        if (ketonesInfoModal) ketonesInfoModal.classList.remove('hidden');
    }

    function closeKetonesInfoModal() {
        if (ketonesInfoModal) ketonesInfoModal.classList.add('hidden');
    }

    if (btnKetonesInfo) {
        btnKetonesInfo.addEventListener('click', openKetonesInfoModal);
    }

    if (closeKetonesInfoModalBtn) {
        closeKetonesInfoModalBtn.addEventListener('click', closeKetonesInfoModal);
    }

    if (btnGotItKetones) {
        btnGotItKetones.addEventListener('click', closeKetonesInfoModal);
    }

    if (ketonesInfoModal) {
        ketonesInfoModal.addEventListener('click', (e) => {
            if (e.target === ketonesInfoModal) closeKetonesInfoModal();
        });
    }

});
