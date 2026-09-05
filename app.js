        // VIRTUAL KEYBOARD LOGIC
        let activeVkTarget = null;
        let vkCursorPos = 0;

        function openVk(elementId) {
            activeVkTarget = document.getElementById(elementId);
            if (!activeVkTarget) return;
            
            // Mask password characters if we are editing the auth code
            const inputEl = document.getElementById('vk-input');
            if (activeVkTarget.type === 'password') {
                inputEl.type = 'password';
            } else {
                inputEl.type = 'text';
            }
            
            inputEl.value = activeVkTarget.value;
            vkCursorPos = activeVkTarget.value.length;
            document.getElementById('keyboard-modal').style.display = 'flex';
        }

        function vkPress(char) {
            const input = document.getElementById('vk-input');
            const val = input.value;
            input.value = val.slice(0, vkCursorPos) + char + val.slice(vkCursorPos);
            vkCursorPos++;
            
            // Auto update target so passwords look responsive
            if (activeVkTarget) activeVkTarget.value = input.value;
        }

        function vkBackspace() {
            const input = document.getElementById('vk-input');
            const val = input.value;
            if (vkCursorPos > 0) {
                input.value = val.slice(0, vkCursorPos - 1) + val.slice(vkCursorPos);
                vkCursorPos--;
            }
            if (activeVkTarget) activeVkTarget.value = input.value;
        }

        function vkConfirm() {
            if (activeVkTarget) {
                activeVkTarget.value = document.getElementById('vk-input').value;
            }
            vkCancel();
        }

        function vkCancel() {
            document.getElementById('keyboard-modal').style.display = 'none';
            activeVkTarget = null;
        }

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(()=>{}); });
        }

        // 1. Initialize state variables FIRST
        const storedItems = localStorage.getItem('pipboy-items');
        const storedQuests = localStorage.getItem('pipboy-quests');
        const storedUser = localStorage.getItem('pipboy-user');
        const storedFactions = localStorage.getItem('pipboy-factions');

        let userProfile = storedUser ? JSON.parse(storedUser) : {
            isInitiated: false,
            name: "UNKNOWN",
            maxHp: 100,
            origin: null,
            trait: null,
            hasCalculatedBaseSpecial: false,
            special: { S: 1, P: 1, E: 1, C: 1, I: 1, A: 1, L: 1 },
            perk: null
        };

        let items = storedItems ? JSON.parse(storedItems) : [
            { id: 1, name: "10MM PISTOL", type: "weapons", effects: "DMG: 18", quantity: 1, equipped: true },
            { id: 4, name: "DRINK TICKET", type: "aid", effects: "Restores Thirst", quantity: 2, equipped: false }
        ];
        
        let quests = storedQuests ? JSON.parse(storedQuests) : [
            { id: 1, name: "THE GATHERING", type: "MAIN", giver: "VAULT-TEC SURVIVORS", location: "VENUE ENTRANCE", timeStr: "--:--", expireTime: null, objectives: ["Find the venue entrance.", "Check in with Overseer."], completed: false, expired: false, abandoned: false },
            { id: 2, name: "SCAVENGER HUNT", type: "SIDE", giver: "SCAVENGERS GUILD", location: "BAR AREA", timeStr: "23:59", expireTime: new Date().setHours(23, 59, 59, 999), objectives: ["Locate 3 hidden Nuka-Colas", "Return to bartender for prize"], completed: false, expired: false, abandoned: false }
        ];

        let factions = storedFactions ? JSON.parse(storedFactions) : [
            { id: 1, name: "THE WAR BOYS", rep: 25, leader: "Immortan Joe", blurb: "Cult fanatical foot soldiers loyal to the Immortan.", bio: "Raised from birth to serve the Immortan, these pale warriors live half-lives, sustained by bloodbags and the promise of Valhalla.", members: ["Slit", "Nux", "Morsov", "Rictus Erectus"] },
            { id: 2, name: "SCAVENGERS GUILD", rep: 60, leader: "The Keeper of the Scales", blurb: "Nomads who trade pre-war junk for water and guzzoline.", bio: "Wandering merchants and scrappers. They hold no allegiance except to the highest bidder and the promise of survival.", members: ["The Merchant", "Scrap-Iron", "Rust"] },
            { id: 3, name: "THE BUZZARDS", rep: -20, leader: "Unknown", blurb: "Spiky, Russian-speaking raiders who prowl the wastes.", bio: "Vicious scavengers known for driving spike-covered vehicles. They attack unprovoked and take no prisoners.", members: ["Buzzard 1", "Buzzard 2"] },
            { id: 4, name: "VAULT-TEC SURVIVORS", rep: 0, leader: "The Overseer", blurb: "Tunnel-dwellers who recently surfaced with high-tech gear.", bio: "Emerged from the deep underground bunkers. They have pristine jumpsuits and zero understanding of how the wasteland actually works.", members: ["Vault Boy", "Gary 1", "Gary 2"] }
        ];

        let waypoints = JSON.parse(localStorage.getItem('pipboy-waypoints')) || [
            // Example Pre-loaded Waypoints
            { id: 101, name: "VIP LOUNGE", lat: -31.9505, lng: 115.8605, discovered: false },
            { id: 102, name: "NUKA-COLA BAR", lat: -31.9515, lng: 115.8615, discovered: false }
        ];

        let activeItemId = null;
        let currentInvTab = 'weapons';
        let currentDataTab = 'quests';

        const themes = [
            { name: "GREEN", hex: "#1aff80", dim: "#0f8f48", rgb: "26, 255, 128" },
            { name: "AMBER", hex: "#ffb642", dim: "#b37200", rgb: "255, 182, 66" },
            { name: "BLUE", hex: "#42b6ff", dim: "#006bb3", rgb: "66, 182, 255" },
            { name: "WHITE", hex: "#ffffff", dim: "#888888", rgb: "255, 255, 255" }
        ];
        let currentThemeIndex = 0;

        function saveToStorage() {
            localStorage.setItem('pipboy-items', JSON.stringify(items));
            localStorage.setItem('pipboy-quests', JSON.stringify(quests));
            localStorage.setItem('pipboy-user', JSON.stringify(userProfile));
            localStorage.setItem('pipboy-waypoints', JSON.stringify(waypoints));
            localStorage.setItem('pipboy-factions', JSON.stringify(factions));
        }

        // ONBOARDING LOGIC
        let obPoints = 11; // Reduced to 11 because 10 points are distributed by the 5-question G.O.A.T. exam
        const obSpecial = { S: 1, P: 1, E: 1, C: 1, I: 1, A: 1, L: 1 };
        const specialNames = { S: 'STRENGTH', P: 'PERCEPTION', E: 'ENDURANCE', C: 'CHARISMA', I: 'INTELLIGENCE', A: 'AGILITY', L: 'LUCK' };
        
        let obOriginId = null;
        const obOrigins = [
            { id: 'vault', name: 'VAULT-TEC DEFECTOR', desc: 'You woke up in a tunnel. Now you drive. [Grants: Vault Suit, Pistol. +1 INT. -1 PER]', stats: { I: 1, P: -1 } },
            { id: 'warboy', name: 'WAR BOY RUNAWAY', desc: 'Half-life is not enough. You want it all. [Grants: Thunderstick. +1 END. -1 INT]', stats: { E: 1, I: -1 } },
            { id: 'scavenger', name: 'WASTELAND DRIFTER', desc: 'You survive on scrap and wits. [Grants: Machete, Fuel. +1 LCK. -1 CHA]', stats: { L: 1, C: -1 } }
        ];

        let obTraitId = null;
        const obTraits = [
            { id: 'guzzoline', name: 'GUZZOLINE ADDICT', desc: 'Start with 2 Guzzoline Tickets. Max HP permanently reduced to 80.' },
            { id: 'kamikaze', name: 'KAMIKAZE', desc: 'Massive melee damage. +2 Strength. -2 Endurance.' },
            { id: 'heavy', name: 'HEAVY HANDED', desc: 'You break things. +20 Melee Skill. +1 Strength. -2 Intelligence.' },
            { id: 'four_eyes', name: 'GOGGLE WEARER', desc: 'You need your goggles. +2 Perception. -1 Charisma.' },
            { id: 'small_frame', name: 'SMALL FRAME', desc: 'Hard to hit. +2 Agility. -1 Strength.' }
        ];

        const obExamQuestions = [
            {
                q: "You are approached by a frenzied <del style='opacity:0.5'>Vault Security Officer</del> <span style='color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;'>War Boy</span>. He demands your <del style='opacity:0.5'>Sweetroll</del> <span style='color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;'>Guzzoline</span>. Do you:",
                a: [
                    { text: "Shoot him in the face. (+STR, +AGI)", stats: ['S', 'A'] },
                    { text: "Give it to him, then steal it back. (+PER, +AGI)", stats: ['P', 'A'] },
                    { text: "Talk him into joining your crew. (+CHA, +LUK)", stats: ['C', 'L'] }
                ]
            },
            {
                q: "While exploring an abandoned <del style='opacity:0.5'>Super Duper Mart</del> <span style='color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;'>Scrap Fortress</span>, you find a locked <del style='opacity:0.5'>Safe</del> <span style='color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;'>V8 Engine Block</span>. Do you:",
                a: [
                    { text: "Smash it open with a rock. (+STR, +END)", stats: ['S', 'E'] },
                    { text: "Pick the lock with a rusty wire. (+PER, +INT)", stats: ['P', 'I'] },
                    { text: "Find someone else to open it for a cut. (+CHA, +INT)", stats: ['C', 'I'] }
                ]
            },
            {
                q: "The <del style='opacity:0.5'>Overseer</del> <span style='color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;'>Immortan</span> has summoned you for a <del style='opacity:0.5'>routine checkup</del> <span style='color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;'>bloodbag harvesting</span>. Do you:",
                a: [
                    { text: "Run into the wasteland. (+AGI, +END)", stats: ['A', 'E'] },
                    { text: "Rig the medical bay to explode. (+INT, +LUK)", stats: ['I', 'L'] },
                    { text: "Demand he witnesses you instead. (+CHA, +STR)", stats: ['C', 'S'] }
                ]
            },
            {
                q: "You find a <del style='opacity:0.5'>Radroach</del> <span style='color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;'>two-headed lizard</span> roasting on a spit. It belongs to a sleeping <del style='opacity:0.5'>Ghoul</del> <span style='color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;'>Buzzard Raider</span>. Do you:",
                a: [
                    { text: "Sneak up and steal the lizard. (+AGI, +PER)", stats: ['A', 'P'] },
                    { text: "Wake him up and challenge him for it. (+STR, +END)", stats: ['S', 'E'] },
                    { text: "Wait until he leaves and scavenge the bones. (+LUK, +INT)", stats: ['L', 'I'] }
                ]
            },
            {
                q: "A <del style='opacity:0.5'>Deathclaw</del> <span style='color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;'>War Rig</span> is charging directly at you. You have a single <del style='opacity:0.5'>Stimpak</del> <span style='color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;'>Thunderstick</span>. Do you:",
                a: [
                    { text: "Throw it at the engine and dive for cover. (+PER, +INT)", stats: ['P', 'I'] },
                    { text: "Stand your ground and scream. (+CHA, +END)", stats: ['C', 'E'] },
                    { text: "Close your eyes and throw it wildly. (+LUK, +STR)", stats: ['L', 'S'] }
                ]
            }
        ];

        let obExamStep = 0;

        const availablePerks = [
            { id: 'witness', name: 'WITNESS ME!', desc: 'Ride eternal, shiny and chrome. +10 to combat skills.' },
            { id: 'blackthumb', name: 'BLACKTHUMB MECHANIC', desc: 'You speak to the engines. Master of scrap and repairs.' },
            { id: 'bloodbag', name: 'UNIVERSAL BLOODBAG', desc: 'High octane blood. +10 to Pox Survival and Endurance limits.' },
            { id: 'ayatollah', name: 'LORD OF THE WASTELAND', desc: 'The Ayatollah of Rock-n-Rolla! Starts with 2 free Guzzoline (Drink) Tickets.' },
            { id: 'feral', name: 'FERAL BITER', desc: 'Words are hard. Biting is easy. Extra Unarmed damage.' }
        ];
        let selectedPerkId = 'witness';

        function initOnboarding() {
            if (userProfile.isInitiated) {
                // If user exists, skip straight to app (hide boot screen instantly)
                document.getElementById('boot-splash').style.display = 'none';
                document.getElementById('onboarding-overlay').style.display = 'none';
                document.getElementById('pre-boot-overlay').style.display = 'none';
                renderProfile();
                return;
            }

            // Show Calibration Screen first instead of jumping straight to Boot
            document.getElementById('pre-boot-overlay').style.display = 'flex';
        }

        function startBootSequence() {
            document.getElementById('pre-boot-overlay').style.display = 'none';
            runBootSequence();
        }

        function runBootSequence() {
            const logs = [
                { id: 'boot-log-1', delay: 500 },
                { id: 'boot-log-2', delay: 1000 },
                { id: 'boot-log-3', delay: 1500 },
                { id: 'boot-log-4', delay: 2500 },
                { id: 'boot-log-5', delay: 3000 },
                { id: 'boot-log-6', delay: 4200 }, // Error
                { id: 'boot-log-7', delay: 5500 }, // Locking
                { id: 'boot-log-8', delay: 7000 }, // Hacking...
                { id: 'boot-log-9', delay: 7800 },
                { id: 'boot-log-10', delay: 8600 },
                { id: 'boot-log-11', delay: 9400 },
                { id: 'boot-log-12', delay: 9800, action: runDecodeAnimation }, // Decoding Animation
                { id: 'boot-log-13', delay: 12500 }, // Access Granted
                { id: 'boot-log-14', delay: 13500 }, // Sideloading
                { id: 'boot-log-15', delay: 14500 }  // Please Stand By
            ];

            logs.forEach(log => {
                setTimeout(() => {
                    const el = document.getElementById(log.id);
                    if (el) {
                        el.style.display = 'block';
                    }
                    if(log.action) log.action();
                }, log.delay);
            });

            // After sequence finishes, hide boot screen and show VTARS form
            setTimeout(() => {
                document.getElementById('boot-splash').style.display = 'none';
                document.getElementById('onboarding-overlay').style.display = 'flex';
                renderObStep();
            }, 16500);
        }

        function runDecodeAnimation() {
            const el = document.getElementById('hack-decode-text');
            const target = "0x7F8E: OVERRIDE_LOCKDOWN_PROTOCOL";
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
            let iterations = 0;
            const maxIterations = 30;
            
            const interval = setInterval(() => {
                let currentStr = "";
                for(let i=0; i<target.length; i++) {
                    if (iterations > maxIterations/2 && Math.random() > 0.5) {
                        currentStr += target[i]; // Start locking in letters
                    } else {
                        currentStr += chars[Math.floor(Math.random() * chars.length)];
                    }
                }
                el.innerText = currentStr;
                iterations++;
                
                if(iterations >= maxIterations) {
                    clearInterval(interval);
                    el.innerText = target;
                }
            }, 75);
        }

        let obStep = 1;

        function renderObStep(preventScroll = false) {
            const container = document.getElementById('ob-dynamic-container');
            // Scroll to the top of the container every time a new step or question is rendered
            if (!preventScroll) {
                container.parentElement.scrollTop = 0;
            }
            
            let html = '';

            if (obStep === 1) {
                const isOptIn = localStorage.getItem('pipboy-opt-in') === 'true';
                html = `
                    <h2>WELCOME WASTELANDER</h2><br>
                    <p>Enter user designation:</p><br>
                    <div class="form-group">
                        <input type="text" id="ob-name" class="pip-input vk-target" readonly onclick="openVk('ob-name')" placeholder="ENTER NAME..." style="font-size: 1.5rem; text-align: center;" value="${userProfile.name !== 'UNKNOWN' ? userProfile.name : ''}">
                    </div>
                    <div class="item-row" style="flex-direction: column; cursor: pointer; ${isOptIn ? 'background: var(--pip-color-dim); color: var(--pip-bg); text-shadow: none;' : ''}" onclick="toggleOptIn()">
                        <div style="font-weight: bold; padding: 5px 0;">
                            ${isOptIn ? '☑' : '□'} OPT-IN: LIVE LOCATION TRACKING
                        </div>
                        <div style="font-size: 0.8rem; opacity: 0.8;">I understand that enabling my Pip-Boy GPS will permanently broadcast my Last Known Location to all other event attendees on the global map.</div>
                    </div>
                    <button class="pip-btn" onclick="obNext()">CONTINUE</button>
                `;
            } 
            else if (obStep === 2) {
                html = `
                    <h2>SELECT ORIGIN</h2><br>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${obOrigins.map(o => `
                            <div class="item-row" style="flex-direction: column; ${obOriginId === o.id ? 'background: var(--pip-color-dim); color: var(--pip-bg); text-shadow: none;' : ''}" onclick="selectObOrigin('${o.id}')">
                                <div style="font-weight: bold;">${obOriginId === o.id ? '■' : '□'} ${o.name}</div>
                                <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 5px;">${o.desc}</div>
                            </div>
                        `).join('')}
                    </div>
                    <br>
                    <button class="pip-btn" onclick="obNext()">CONTINUE</button>
                `;
            }
            else if (obStep === 3) {
                html = `
                    <h2>THE G.O.A.T. EXAM</h2><br>
                    <p style="font-size: 1.1rem; line-height: 1.4; margin-bottom: 15px;">To accurately assess your combat capability and societal worth within the <del style="opacity:0.5;">Vault</del> <span style="color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;">Wasteland</span>, you must complete the <strong>G.O.A.T.</strong> Assessment.</p>
                    <ul style="list-style-type: square; padding-left: 20px; font-size: 1.1rem; margin-bottom: 25px; opacity: 0.9; line-height: 1.3;">
                        <li><span style="color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;">G</span>ENERALIZED</li>
                        <li><span style="color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;">O</span>CCUPATIONAL</li>
                        <li><span style="color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;">A</span>PTITUDE</li>
                        <li><span style="color:#ffb642; font-weight:bold; text-shadow:0 0 5px #ffb642;">T</span>EST</li>
                    </ul>
                    <p style="font-size: 1rem; opacity: 0.8; margin-bottom: 25px;">Your responses will permanently define your starting S.P.E.C.I.A.L. attributes.</p>
                    <button class="pip-btn" onclick="obNext()">BEGIN EXAM</button>
                `;
            }
            else if (obStep === 4) {
                const qData = obExamQuestions[obExamStep];
                html = `
                    <h2>G.O.A.T. EXAM (Q${obExamStep + 1}/5)</h2><br>
                    <p style="font-size: 1.2rem; line-height: 1.4; margin-bottom: 20px;">${qData.q}</p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${qData.a.map((ans, idx) => {
                            const isActive = tempExamAnswer === idx;
                            return `
                            <div class="item-row" style="flex-direction: column; ${isActive ? 'background: var(--pip-color-dim); color: var(--pip-bg); text-shadow: none;' : ''}" onclick="answerExam(${idx})">
                                <div style="font-weight: bold; padding: 5px 0;">${isActive ? '■' : '□'} ${ans.text}</div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                    <br>
                    <button class="pip-btn" onclick="confirmExamAnswer()">CONFIRM</button>
                `;
            }
            else if (obStep === 5) {
                html = `
                    <h2>S.P.E.C.I.A.L. ASSIGNMENT</h2><br>
                    <p style="text-align: center; margin-bottom: 15px;">FREE POINTS: <span id="ob-points">${obPoints}</span></p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${Object.keys(obSpecial).map(key => `
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--pip-color-dim); padding-bottom: 5px;">
                                <span style="width: 120px;">${specialNames[key]}</span>
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <button class="theme-btn" onclick="adjustObSpecial('${key}', -1)" style="font-size: 1.2rem;">-</button>
                                    <span style="font-size: 1.2rem; width: 20px; text-align: center;">${obSpecial[key]}</span>
                                    <button class="theme-btn" onclick="adjustObSpecial('${key}', 1)" style="font-size: 1.2rem;">+</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <br>
                    <button class="pip-btn" onclick="obNext()">CONTINUE</button>
                `;
            }
            else if (obStep === 6) {
                html = `
                    <h2>SELECT DOUBLE-EDGED TRAIT</h2><br>
                    <p style="opacity: 0.8; font-size: 0.9rem; margin-bottom: 10px;">Traits offer powerful buffs, but come with a permanent penalty.</p>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${obTraits.map(t => `
                            <div class="item-row" style="flex-direction: column; ${obTraitId === t.id ? 'background: var(--pip-color-dim); color: var(--pip-bg); text-shadow: none;' : ''}" onclick="selectObTrait('${t.id}')">
                                <div style="font-weight: bold;">${obTraitId === t.id ? '■' : '□'} ${t.name}</div>
                                <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 5px;">${t.desc}</div>
                            </div>
                        `).join('')}
                    </div>
                    <br>
                    <button class="pip-btn" onclick="obNext()">CONTINUE</button>
                `;
            }
            else if (obStep === 7) {
                html = `
                    <h2>SELECT SURVIVOR PERK</h2><br>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${availablePerks.map(p => `
                            <div class="item-row" style="flex-direction: column; ${selectedPerkId === p.id ? 'background: var(--pip-color-dim); color: var(--pip-bg); text-shadow: none;' : ''}" onclick="selectObPerk('${p.id}')">
                                <div style="font-weight: bold;">${selectedPerkId === p.id ? '■' : '□'} ${p.name}</div>
                                <div style="font-size: 0.9rem; opacity: 0.8; margin-top: 5px;">${p.desc}</div>
                            </div>
                        `).join('')}
                    </div>
                    <br>
                    <button class="pip-btn" onclick="finishOnboarding()" style="font-weight: bold; border-style: dashed;">COMPLETE REGISTRATION</button>
                `;
            }

            container.innerHTML = html;
        }

        function selectObOrigin(id) { obOriginId = id; renderObStep(true); }
        function selectObTrait(id) { obTraitId = id; renderObStep(true); }
        function selectObPerk(id) { selectedPerkId = id; renderObStep(true); }

        let tempExamAnswer = null;

        function answerExam(ansIdx) {
            tempExamAnswer = ansIdx;
            renderObStep(true); // Re-render without scrolling to show selected state
        }

        function confirmExamAnswer() {
            if (tempExamAnswer === null) return showNotification("PLEASE SELECT AN ANSWER.");
            
            const qData = obExamQuestions[obExamStep];
            const ans = qData.a[tempExamAnswer];
            
            ans.stats.forEach(stat => {
                if (obSpecial[stat] < 10) obSpecial[stat]++;
            });

            obExamStep++;
            tempExamAnswer = null; // Reset for next question
            
            if (obExamStep >= obExamQuestions.length) {
                obStep = 5; // Move to special allocation
                renderObStep(); // Scroll to top for the brand new screen
            } else {
                renderObStep(); // Scroll to top so they can read the next question
            }
        }

        function toggleOptIn() {
            let current = localStorage.getItem('pipboy-opt-in') === 'true';
            localStorage.setItem('pipboy-opt-in', !current);
            renderObStep(true);
        }

        function obNext() {
            if (obStep === 1) {
                const name = document.getElementById('ob-name').value.trim();
                if (!name) return showNotification("IDENTITY CANNOT BE BLANK.");
                if (localStorage.getItem('pipboy-opt-in') !== 'true') return showNotification("YOU MUST AGREE TO THE SATELLITE TRACKING WAIVER TO PROCEED.");
                userProfile.name = name.toUpperCase();
                obStep = 2;
            } else if (obStep === 2) {
                if (!obOriginId) return showNotification("PLEASE SELECT AN ORIGIN.");
                obStep = 3;
            } else if (obStep === 3) {
                obStep = 4;
            } else if (obStep === 4) {
                // If they are on the exam questions, clicking "CONTINUE" does nothing 
                // because they have to answer the question to advance.
                return;
            } else if (obStep === 5) {
                if (obPoints > 0) return showNotification("PLEASE DISTRIBUTE ALL FREE POINTS.");
                userProfile.special = {...obSpecial};
                obStep = 6;
            } else if (obStep === 6) {
                if (!obTraitId) return showNotification("PLEASE SELECT A TRAIT.");
                obStep = 7;
            }
            renderObStep();
        }

        function adjustObSpecial(stat, amount) {
            const current = obSpecial[stat];
            if (amount > 0 && obPoints > 0 && current < 10) {
                obSpecial[stat]++;
                obPoints--;
            } else if (amount < 0 && current > 1) {
                // Prevent them from reducing stats below what they gained from the exam
                obSpecial[stat]--;
                obPoints++;
            }
            renderObStep(true); // Don't scroll when just clicking + and - buttons
        }

        // Removed unused render functions as they are now handled by renderObStep()

        function finishOnboarding() {
            if (!selectedPerkId) return showNotification("PLEASE SELECT A SURVIVOR PERK.");

            // Store origin and trait
            const originData = obOrigins.find(o => o.id === obOriginId);
            const traitData = obTraits.find(t => t.id === obTraitId);
            const perkData = availablePerks.find(p => p.id === selectedPerkId);
            
            userProfile.origin = originData;
            userProfile.trait = traitData;
            userProfile.perk = perkData;
            userProfile.isInitiated = true;

            // Apply ORIGIN inventory bonuses (Stats are applied in calculateSkills)
            if (obOriginId === 'vault') {
                items.push({ id: Date.now(), name: "10MM PISTOL", type: "weapons", effects: "DMG: 18", quantity: 1, equipped: true });
                items.push({ id: Date.now()+1, name: "VAULT SUIT", type: "apparel", effects: "DR: 5", quantity: 1, equipped: true });
                const f = factions.find(fac => fac.name === "VAULT-TEC SURVIVORS");
                if (f) f.rep += 20;
            } else if (obOriginId === 'warboy') {
                items.push({ id: Date.now(), name: "THUNDERSTICK", type: "weapons", effects: "DMG: 40 (Explosive)", quantity: 1, equipped: true });
                items.push({ id: Date.now()+1, name: "CHROME SPRAY", type: "aid", effects: "WITNESS ME", quantity: 1, equipped: false });
                const f1 = factions.find(fac => fac.name === "THE WAR BOYS");
                if (f1) f1.rep += 20;
            } else if (obOriginId === 'scavenger') {
                items.push({ id: Date.now(), name: "RUSTY MACHETE", type: "weapons", effects: "DMG: 12", quantity: 1, equipped: true });
                items.push({ id: Date.now()+1, name: "JERRY CAN", type: "misc", effects: "Contains Guzzoline", quantity: 1, equipped: false });
                const f = factions.find(fac => fac.name === "SCAVENGERS GUILD");
                if (f) f.rep += 20;
            }

            // Apply TRAIT inventory/health bonuses (Stats are applied in calculateSkills)
            if (obTraitId === 'guzzoline') {
                items.push({ id: Date.now()+2, name: "DRINK TICKET", type: "aid", effects: "Restores Thirst", quantity: 2, equipped: false });
                userProfile.maxHp = 80;
            }

            // Apply PERK bonuses
            if (perkData.id === 'ayatollah') {
                const dt = items.find(i => i.name === 'DRINK TICKET');
                if (dt) dt.quantity += 2;
                else items.push({ id: Date.now()+3, name: "DRINK TICKET", type: "aid", effects: "Restores Thirst", quantity: 2, equipped: false });
            }

            calculateSkills();

            saveToStorage(); 
            
            document.getElementById('onboarding-overlay').style.display = 'none';
            renderProfile();
        }

        function calculateSkills() {
            // Apply Origin Stat Modifiers ONLY ONCE
            if (!userProfile.hasCalculatedBaseSpecial) {
                if (userProfile.origin) {
                    if (userProfile.origin.stats) {
                        for (let stat in userProfile.origin.stats) {
                            userProfile.special[stat] += userProfile.origin.stats[stat];
                        }
                    }
                }

                // Apply Trait Stat Modifiers
                if (userProfile.trait) {
                    if (userProfile.trait.id === 'kamikaze') {
                        userProfile.special.S += 2;
                        userProfile.special.E -= 2;
                    } else if (userProfile.trait.id === 'heavy') {
                        userProfile.special.S += 1;
                        userProfile.special.I -= 2;
                    } else if (userProfile.trait.id === 'four_eyes') {
                        userProfile.special.P += 2;
                        userProfile.special.C -= 1;
                    } else if (userProfile.trait.id === 'small_frame') {
                        userProfile.special.A += 2;
                        userProfile.special.S -= 1;
                    }
                }

                // Cap all stats between 1 and 10 after modifiers
                for (let key in userProfile.special) {
                    if (userProfile.special[key] < 1) userProfile.special[key] = 1;
                    if (userProfile.special[key] > 10) userProfile.special[key] = 10;
                }
                
                userProfile.hasCalculatedBaseSpecial = true;
            }

            const sp = userProfile.special;
            const lck = sp.L;
            
            // Apply Heavy Handed extra logic to skills
            const meleeBonus = userProfile.trait && userProfile.trait.id === 'heavy' ? 20 : 0;
            
            // Base logic: 5 + (Stat * 2) + Luck
            userProfile.skills = [
                { name: "GUZZOLINE BARTER", val: 5 + (sp.C * 2) + lck },
                { name: "BOOM-BOY EXPLOSIVES", val: 5 + (sp.P * 2) + lck },
                { name: "BLOODBAG MEDICINE", val: 5 + (sp.I * 2) + lck },
                { name: "THUNDERSTICK MELEE", val: 5 + (sp.S * 2) + lck + meleeBonus },
                { name: "BLACKTHUMB REPAIR", val: 5 + (sp.I * 2) + lck },
                { name: "OLD WORLD LORE", val: 5 + (sp.I * 2) + lck },
                { name: "LEAD SLINGERS", val: 5 + (sp.A * 2) + lck },
                { name: "WASTELAND GHOST", val: 5 + (sp.A * 2) + lck },
                { name: "CULT DEMAGOGUE", val: 5 + (sp.C * 2) + lck },
                { name: "BARE-KNUCKLE BRAWL", val: 5 + (sp.E * 2) + lck + meleeBonus },
                { name: "POX SURVIVAL", val: 5 + (sp.E * 2) + lck },
                { name: "RIG & RIDE (PILOT)", val: 5 + (sp.A * 2) + lck }
            ];

            // Assign Title based on highest stat
            const highestStat = Object.keys(sp).reduce((a, b) => sp[a] > sp[b] ? a : b);
            const titles = { S: "BRUISER", P: "SCOUT", E: "BLOODBAG", C: "WARLORD", I: "BLACKTHUMB", A: "NIGHTRIDER", L: "SCAVENGER" };
            userProfile.title = titles[highestStat] + " OF THE ECLIPSE";
        }

        function renderProfile() {
            if (!userProfile.skills) calculateSkills(); // fallback if missing
            
            document.getElementById('stat-name-display').innerText = 'NAME: ' + userProfile.name;
            
            // Update Title
            const titleEl = document.querySelector('#sub-stat-status p:nth-of-type(2)');
            if(titleEl) titleEl.innerText = `LVL 1 - ${userProfile.title}`;
            
            // Update HP based on trait
            const hpFill = document.getElementById('hp-bar-fill');
            if (hpFill) hpFill.style.width = userProfile.maxHp + '%';
            
            let spHTML = '';
            for (let key in userProfile.special) {
                spHTML += `<p><span>${specialNames[key]}</span> <span>${userProfile.special[key]}</span></p>`;
            }
            document.getElementById('special-list-display').innerHTML = spHTML;

            // Render Themed Skills
            let skHTML = '';
            userProfile.skills.forEach(sk => {
                skHTML += `<p><span>${sk.name}:</span> <span>${sk.val}</span></p>`;
            });
            document.getElementById('skills-list-display').innerHTML = skHTML;

            let pkHTML = '';
            if (userProfile.perk) {
                pkHTML += `
                <div class="item-row">
                    <div class="item-info">
                        <div>${userProfile.perk.name}</div>
                        <div class="item-effects">${userProfile.perk.desc}</div>
                    </div>
                </div>`;
            }
            document.getElementById('perks-list-display').innerHTML = pkHTML;
        }

        // 2. NOW setup the clock which depends on quests
        let glitchThreshold = Math.floor(Math.random() * 5) + 5; // Glitch every 5 to 10 seconds
        let glitchTimer = 0;

        function updateClock() {
            const now = new Date();
            const dateStr = now.toLocaleDateString();
            const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
            document.getElementById('pip-clock').innerText = `DATE: ${dateStr} - TIME: ${timeStr}`;
            
            // Easter Egg: OS Name Glitch
            glitchTimer++;
            if (glitchTimer >= glitchThreshold) { 
                const titleEl = document.getElementById('main-os-title');
                
                // Show the glitch
                titleEl.innerText = "PIP-BOY 3000";
                titleEl.style.color = "#ff3333";
                titleEl.style.textShadow = "0 0 10px #ff3333";
                
                // Randomize how long the glitch holds (from 0.1s up to 1 second)
                const holdDuration = 100 + Math.random() * 900;

                setTimeout(() => {
                    titleEl.innerText = "POX-BOY 3026";
                    titleEl.style.color = "var(--pip-color)";
                    titleEl.style.textShadow = "none";
                }, holdDuration);
                
                // Reset timer and randomize the NEXT threshold
                glitchTimer = 0;
                glitchThreshold = Math.floor(Math.random() * 5) + 5; 
            }

            checkQuestTimers(now);
            if (document.getElementById('tab-data').classList.contains('active')) {
                updateQuestCountdowns(now);
            }
        }
        setInterval(updateClock, 1000);
        updateClock();

        // UI & Setup
        function switchMainTab(tabId) {
            document.querySelectorAll('.nav-tabs .nav-item').forEach(el => el.classList.remove('active'));
            event.target.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.getElementById('tab-' + tabId).classList.add('active');

            // Button Visibility Logic
            document.getElementById('add-item-btn').style.display = (tabId === 'inv') ? 'inline-block' : 'none';
            document.getElementById('add-quest-btn').style.display = (tabId === 'data' && currentDataTab === 'quests') ? 'inline-block' : 'none';
            document.getElementById('faction-controls').style.display = (tabId === 'data' && currentDataTab === 'factions') ? 'flex' : 'none';
            document.getElementById('dev-controls').style.display = (tabId === 'data' && currentDataTab === 'stats') ? 'flex' : 'none';
            document.getElementById('map-controls').style.display = (tabId === 'map') ? 'flex' : 'none';

            if (tabId === 'inv') renderInventory(currentInvTab);
            if (tabId === 'data') {
                if (currentDataTab === 'quests') renderQuests();
                if (currentDataTab === 'factions') renderFactions();
                if (currentDataTab === 'stats') renderStatsTab();
            }
            if (tabId === 'map') {
                // Leaflet needs to calculate size AFTER display block is applied
                setTimeout(initPipMap, 50); 
            }
            if (tabId !== 'cam') {
                // Turn off the camera if they navigate away to save battery
                stopCamera();
            }
        }

        function switchSubTab(parentTab, subTabId) {
            const subNav = document.getElementById(`${parentTab}-sub-nav`);
            subNav.querySelectorAll('.sub-nav-item').forEach(el => el.classList.remove('active'));
            event.target.classList.add('active');
            
            if (parentTab === 'inv') { 
                currentInvTab = subTabId; 
                renderInventory(subTabId); 
            } else if (parentTab === 'data') {
                currentDataTab = subTabId;
                document.getElementById('add-quest-btn').style.display = (subTabId === 'quests') ? 'inline-block' : 'none';
                document.getElementById('faction-controls').style.display = (subTabId === 'factions') ? 'flex' : 'none';
                document.getElementById('dev-controls').style.display = (subTabId === 'stats') ? 'flex' : 'none';

                document.getElementById(`tab-${parentTab}`).querySelectorAll('.sub-tab-content').forEach(el => el.classList.remove('active'));
                document.getElementById(`sub-${parentTab}-${subTabId}`).classList.add('active');
                if (subTabId === 'quests') renderQuests();
                if (subTabId === 'factions') renderFactions();
                if (subTabId === 'stats') renderStatsTab();
            } else {
                document.getElementById(`tab-${parentTab}`).querySelectorAll('.sub-tab-content').forEach(el => el.classList.remove('active'));
                document.getElementById(`sub-${parentTab}-${subTabId}`).classList.add('active');
            }
        }

        function cycleTheme() {
            currentThemeIndex = (currentThemeIndex + 1) % themes.length;
            const t = themes[currentThemeIndex];
            const root = document.documentElement;
            root.style.setProperty('--pip-color', t.hex);
            root.style.setProperty('--pip-color-dim', t.dim);
            root.style.setProperty('--crt-flicker', `rgba(${t.rgb}, 0.05)`);
            document.getElementById('theme-display').innerText = `[${t.name}]`;
        }

        async function toggleFullscreen() {
            try {
                const doc = window.document;
                const docEl = doc.documentElement;

                const requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
                const cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

                if (!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
                    if (requestFullScreen) {
                        await requestFullScreen.call(docEl);
                    }
                    
                    const fsBtn = document.getElementById('fs-btn');
                    if (fsBtn) fsBtn.innerText = '[EXIT FULL]';
                    const pbFsBtn = document.getElementById('pb-fs-btn');
                    if (pbFsBtn) pbFsBtn.innerText = '[1] DISABLE FULLSCREEN';
                    
                    if (screen.orientation && screen.orientation.lock) {
                        // await screen.orientation.lock('landscape').catch(()=>{});
                    }
                } else {
                    if (cancelFullScreen) {
                        await cancelFullScreen.call(doc);
                    }
                    
                    const fsBtn = document.getElementById('fs-btn');
                    if (fsBtn) fsBtn.innerText = '[FULLSCREEN]';
                    const pbFsBtn = document.getElementById('pb-fs-btn');
                    if (pbFsBtn) pbFsBtn.innerText = '[1] ENABLE FULLSCREEN';
                }
            } catch (err) {
                console.error("Fullscreen API Error:", err);
                showNotification("FULLSCREEN BLOCKED BY DEVICE OS.");
            }
        }

        let sizeIndex = 2; // Default to SHRINK 2
        const paddingModes = [0, 15, 30]; 
        const sizeLabels = ["MAX", "SHRINK 1", "SHRINK 2"];
        
        function cycleSize() {
            sizeIndex = (sizeIndex + 1) % paddingModes.length;
            const label = sizeLabels[sizeIndex];
            document.body.style.padding = `${paddingModes[sizeIndex]}px`;
            
            const mainBtn = document.getElementById('size-display');
            if (mainBtn) mainBtn.innerText = `[SIZE: ${label}]`;
            const pbBtn = document.getElementById('pb-size-btn');
            if (pbBtn) pbBtn.innerText = `[2] SCREEN PADDING: ${label}`;
        }
        
        // Apply default size immediately
        document.body.style.padding = `${paddingModes[sizeIndex]}px`;

        // Inventory Logic
        function renderInventory(category) {
            const container = document.getElementById('inv-container');
            container.innerHTML = '';
            const filtered = items.filter(i => i.type === category);
            if (filtered.length === 0) return container.innerHTML = '<p style="text-align:center; opacity:0.5;">NO ITEMS</p>';
            filtered.forEach(item => {
                const el = document.createElement('div'); el.className = 'item-row'; el.onclick = () => openActionModal(item.id);
                el.innerHTML = `<div class="item-info"><div><span style="white-space: pre;">${item.equipped ? '■ ' : '  '}</span>${item.name}</div>
                <div class="item-effects">${item.effects}</div></div><div class="item-qty">${item.quantity > 1 ? 'x'+item.quantity : ''}</div>`;
                container.appendChild(el);
            });
        }

        // Quests & Timers Logic
        function checkQuestTimers(now) {
            let changed = false;
            quests.forEach(q => {
                if (!q.completed && !q.expired && q.expireTime) {
                    if (now.getTime() >= q.expireTime) {
                        q.expired = true;
                        changed = true;
                        showNotification("QUEST EXPIRED: " + q.name);
                    }
                }
            });
            if (changed) {
                saveToStorage();
                if(document.getElementById('tab-data').classList.contains('active')) renderQuests();
            }
        }

        function updateQuestCountdowns(now) {
            quests.forEach(q => {
                if(!q.completed && !q.expired && q.expireTime) {
                    const el = document.getElementById(`timer-${q.id}`);
                    if(el) {
                        const diff = q.expireTime - now.getTime();
                        if(diff > 0) {
                            const hh = Math.floor(diff / (1000 * 60 * 60));
                            const mm = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                            const ss = Math.floor((diff % (1000 * 60)) / 1000);
                            el.innerText = `[T-${hh.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}]`;
                        }
                    }
                }
            });
        }

        function showNotification(msg) {
            // In-app modal
            document.getElementById('notification-text').innerText = msg;
            document.getElementById('notification-modal').style.display = 'flex';
            
            // Native push notification if allowed
            if (Notification.permission === "granted") {
                new Notification("PIP-BOY ALERT", { body: msg, icon: "icon.png" });
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") new Notification("PIP-BOY ALERT", { body: msg, icon: "icon.png" });
                });
            }
            
            // Haptic vibration
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        }

        // Custom in-app confirmation replacement
        function showCustomPrompt(text, buttons) {
            document.getElementById('cp-text').innerText = text;
            const btnContainer = document.getElementById('cp-buttons');
            btnContainer.innerHTML = '';
            
            buttons.forEach(b => {
                const btnEl = document.createElement('button');
                btnEl.className = 'pip-btn';
                btnEl.innerText = b.label;
                if (b.color) {
                    btnEl.style.borderColor = b.color;
                    btnEl.style.color = b.color;
                }
                btnEl.onclick = () => {
                    document.getElementById('custom-prompt-modal').style.display = 'none';
                    if (b.action) b.action();
                };
                btnContainer.appendChild(btnEl);
            });
            
            document.getElementById('custom-prompt-modal').style.display = 'flex';
        }

        function renderQuests() {
            const container = document.getElementById('sub-data-quests');
            container.innerHTML = '';
            if (quests.length === 0) return container.innerHTML = '<p style="text-align:center; opacity:0.5;">NO QUESTS ACTIVE</p>';
            
            quests.forEach(q => {
                const el = document.createElement('div'); 
                el.className = `item-row ${(q.completed || q.expired || q.abandoned) ? 'quest-completed' : ''}`;
                el.style.flexDirection = 'column';
                el.onclick = () => openQuestActionModal(q.id);
                
                let timeDisplay = `[${q.timeStr || q.time || '--:--'}]`;
                if (q.expired) timeDisplay = `<span style="opacity: 0.5;">[EXPIRED]</span>`;
                else if (q.completed) timeDisplay = `[COMPLETED]`;
                else if (q.abandoned) timeDisplay = `[ABANDONED]`;
                else if (q.expireTime) timeDisplay = `<span id="timer-${q.id}"></span>`;

                let objHTML = q.objectives.map(obj => `<div class="quest-objective">${obj}</div>`).join('');
                
                let giverLine = q.giver ? `<div style="font-size: 0.85rem; opacity: 0.7; padding-left: 15px; margin-top: 2px;">GIVER: ${q.giver}</div>` : '';

                if (q.abandoned) {
                    el.innerHTML = `
                        <div style="display: flex; justify-content: space-between;">
                            <div><del>☒ ${q.name}</del></div>
                            <div style="font-size: 0.9rem; opacity: 0.7;">${timeDisplay}</div>
                        </div>
                        <div style="font-size: 0.85rem; opacity: 0.7; padding-left: 15px; margin-top: 4px; text-decoration: line-through;">LOC: ${q.location} | TYPE: ${q.type}</div>
                        <div style="font-size: 0.85rem; opacity: 0.7; padding-left: 15px; margin-top: 2px; text-decoration: line-through;">${giverLine ? giverLine.replace(/<[^>]*>?/gm, '') : ''}</div>
                    `;
                } else {
                    el.innerHTML = `
                        <div style="display: flex; justify-content: space-between;">
                            <div>${q.completed ? '☑' : (q.expired ? '☒' : '■')} ${q.name}</div>
                            <div style="font-size: 0.9rem; opacity: 0.7;">${timeDisplay}</div>
                        </div>
                        <div style="font-size: 0.85rem; opacity: 0.7; padding-left: 15px; margin-top: 4px;">LOC: ${q.location} | TYPE: ${q.type}</div>
                        ${giverLine}
                        <div style="margin-top: 8px;">${objHTML}</div>
                    `;
                }
                container.appendChild(el);
            });
        }

        function getFactionRelation(rep) {
            if (rep <= -10) return { text: "HOSTILE", color: "#ff3333" };
            if (rep < 20) return { text: "CAUTIOUS", color: "#ffff33" };
            if (rep < 50) return { text: "NEUTRAL", color: "var(--pip-color)" };
            return { text: "ALLIED", color: "#33ff33" };
        }

        function renderFactions() {
            const container = document.getElementById('factions-list-display');
            container.innerHTML = '';
            
            factions.forEach(f => {
                const relation = getFactionRelation(f.rep);

                const el = document.createElement('div');
                el.className = 'item-row';
                el.style.flexDirection = 'column';
                el.style.cursor = 'pointer';
                el.style.marginBottom = '10px';
                
                // Add left click for detail view, and right click / long press for quick edit
                el.setAttribute('onclick', `openFactionDetail(${f.id})`);
                el.setAttribute('oncontextmenu', `openFactionAuth('EDIT_SPECIFIC', ${f.id}); return false;`);
                
                let memberPreview = '';
                if (f.leader) {
                    memberPreview += `LEADER: ${f.leader}`;
                }
                if (f.members && f.members.length > 0) {
                    if (memberPreview !== '') memberPreview += ' | ';
                    memberPreview += `MEMBERS: ${f.members.join(', ')}`;
                }

                let secondaryLine = '';
                if (memberPreview !== '') {
                    secondaryLine = `<div style="font-size: 0.85rem; opacity: 0.6; margin-top: 5px; font-style: italic;">${memberPreview}</div>`;
                }

                el.innerHTML = `
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--pip-color-dim); padding-bottom: 5px; margin-bottom: 5px;">
                        <div style="font-weight: bold; font-size: 1.3rem;">${f.name}</div>
                        <div style="font-weight: bold; color: ${relation.color}; text-shadow: 0 0 5px ${relation.color};">[${relation.text}]</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="font-size: 1rem; opacity: 0.8; line-height: 1.2; padding-right: 15px; flex-grow: 1;">
                            ${f.blurb}
                            ${secondaryLine}
                        </div>
                        <div style="display: flex; gap: 5px; align-items: center; border: 1px dashed var(--pip-color-dim); padding: 5px;" onclick="event.stopPropagation();">
                            <button class="theme-btn" onclick="openRepAuthModal(${f.id}, false)" style="padding: 0 8px;">-</button>
                            <span style="font-weight: bold; width: 45px; text-align: center;">${f.rep}</span>
                            <button class="theme-btn" onclick="openRepAuthModal(${f.id}, true)" style="padding: 0 8px;">+</button>
                        </div>
                    </div>
                `;
                container.appendChild(el);
            });
        }

        function openRepAuthModal(id, isPositive) {
            pendingAuthAction = 'REP';
            pendingRepId = id;
            pendingRepIsPositive = isPositive;
            document.getElementById('auth-code').value = '';
            document.getElementById('rep-amount').value = '5'; // default
            
            document.getElementById('auth-amount-group').style.display = 'block';
            
            // visually indicate if we are adding or subtracting in the modal title
            const titleEl = document.getElementById('auth-title');
            titleEl.innerText = isPositive ? "OVERSEER AUTHORIZATION (+)" : "OVERSEER AUTHORIZATION (-)";
            document.getElementById('auth-desc').innerText = "Enter security code to modify faction reputation.";
            
            document.getElementById('auth-modal').style.display = 'flex';
        }

        function openFactionDetail(id) {
            const f = factions.find(fac => fac.id === id);
            if (!f) return;
            
            const relation = getFactionRelation(f.rep);
            
            document.getElementById('fd-name').innerText = f.name;
            document.getElementById('fd-relation').innerText = relation.text;
            document.getElementById('fd-relation').style.color = relation.color;
            document.getElementById('fd-rep').innerText = f.rep;
            
            // Render Leader dynamically
            const bioEl = document.getElementById('fd-bio');
            if (f.leader) {
                bioEl.innerHTML = `<span style="font-weight:bold; font-size:1.2rem;">LEADER:</span> <span style="font-size:1.2rem;">${f.leader}</span><br><br>` + (f.bio || "No expanded lore available in the archives.");
            } else {
                bioEl.innerText = f.bio || "No expanded lore available in the archives.";
            }
            
            const membersUl = document.getElementById('fd-members');
            membersUl.innerHTML = '';
            if (f.members && f.members.length > 0) {
                f.members.forEach(m => {
                    const li = document.createElement('li');
                    li.innerText = m;
                    membersUl.appendChild(li);
                });
            } else {
                membersUl.innerHTML = '<li><span style="opacity:0.5;">No known notable members.</span></li>';
            }

            document.getElementById('faction-detail-modal').style.display = 'flex';
        }

        function openFactionAuth(action, specificId = null) {
            pendingAuthAction = action; // 'ADD', 'EDIT', or 'EDIT_SPECIFIC'
            if (specificId !== null) pendingRepId = specificId;
            
            document.getElementById('auth-code').value = '';
            document.getElementById('auth-amount-group').style.display = 'none';
            document.getElementById('auth-title').innerText = "OVERSEER AUTHORIZATION";
            document.getElementById('auth-desc').innerText = `Enter security code to access faction database.`;
            document.getElementById('auth-modal').style.display = 'flex';
        }

        function confirmAuth() {
            const code = document.getElementById('auth-code').value;
            
            if (code !== '1234') {
                closeModals();
                showNotification("ACCESS DENIED: INVALID AUTHORIZATION CODE.");
                return;
            }

            if (pendingAuthAction === 'REP') {
                let amount = parseInt(document.getElementById('rep-amount').value, 10);
                if (isNaN(amount) || amount <= 0) {
                    showNotification("INVALID AMOUNT. PLEASE ENTER A NUMBER GREATER THAN 0.");
                    return;
                }

                const f = factions.find(fac => fac.id === pendingRepId);
                if (f) {
                    if (!pendingRepIsPositive) amount = -amount;
                    f.rep += amount;
                    
                    saveToStorage();
                    if (document.getElementById('tab-data').classList.contains('active') && currentDataTab === 'factions') {
                        renderFactions();
                    }
                    showNotification("REPUTATION UPDATED SUCCESSFULLY.");
                }
                closeModals();
            } else if (pendingAuthAction === 'ADD') {
                closeModals();
                document.getElementById('fac-name').value = '';
                document.getElementById('fac-rep').value = '0';
                document.getElementById('fac-blurb').value = '';
                document.getElementById('add-faction-modal').style.display = 'flex';
            } else if (pendingAuthAction === 'EDIT' || pendingAuthAction === 'EDIT_SPECIFIC') {
                closeModals();
                const select = document.getElementById('fac-edit-select');
                select.innerHTML = '';
                if (factions.length === 0) {
                    select.innerHTML = '<option value="">NO FACTIONS</option>';
                    populateEditFaction();
                } else {
                    factions.forEach(f => {
                        const opt = document.createElement('option');
                        opt.value = f.id;
                        opt.innerText = f.name;
                        select.appendChild(opt);
                    });
                    
                    if (pendingAuthAction === 'EDIT_SPECIFIC') {
                        select.value = pendingRepId;
                    }
                    populateEditFaction();
                }
                document.getElementById('edit-faction-modal').style.display = 'flex';
            }
        }

        function saveNewFaction() {
            const name = document.getElementById('fac-name').value.trim() || 'UNKNOWN FACTION';
            const rep = parseInt(document.getElementById('fac-rep').value, 10) || 0;
            const blurb = document.getElementById('fac-blurb').value.trim() || 'No data available.';
            const bio = document.getElementById('fac-bio').value.trim() || '';
            const rawMembers = document.getElementById('fac-members').value;
            const members = rawMembers ? rawMembers.split(',').map(m => m.trim()) : [];
            
            factions.push({ id: Date.now(), name: name.toUpperCase(), rep: rep, blurb: blurb, bio: bio, members: members });
            saveToStorage();
            if (currentDataTab === 'factions') renderFactions();
            closeModals();
        }

        function populateEditFaction() {
            const id = parseInt(document.getElementById('fac-edit-select').value, 10);
            const f = factions.find(fac => fac.id === id);
            if (f) {
                document.getElementById('edit-fac-name').value = f.name;
                document.getElementById('edit-fac-rep').value = f.rep;
                document.getElementById('edit-fac-blurb').value = f.blurb;
                document.getElementById('edit-fac-bio').value = f.bio || '';
                document.getElementById('edit-fac-members').value = f.members ? f.members.join(', ') : '';
            } else {
                document.getElementById('edit-fac-name').value = '';
                document.getElementById('edit-fac-rep').value = '';
                document.getElementById('edit-fac-blurb').value = '';
                document.getElementById('edit-fac-bio').value = '';
                document.getElementById('edit-fac-members').value = '';
            }
        }

        function saveEditFaction() {
            const id = parseInt(document.getElementById('fac-edit-select').value, 10);
            const f = factions.find(fac => fac.id === id);
            if (f) {
                f.name = (document.getElementById('edit-fac-name').value.trim() || 'UNKNOWN FACTION').toUpperCase();
                f.rep = parseInt(document.getElementById('edit-fac-rep').value, 10) || 0;
                f.blurb = document.getElementById('edit-fac-blurb').value.trim() || 'No data available.';
                f.bio = document.getElementById('edit-fac-bio').value.trim() || '';
                const rawMembers = document.getElementById('edit-fac-members').value;
                f.members = rawMembers ? rawMembers.split(',').map(m => m.trim()).filter(m => m !== '') : [];
                
                saveToStorage();
                if (currentDataTab === 'factions') renderFactions();
                closeModals();
            }
        }

        function deleteFaction() {
            const id = parseInt(document.getElementById('fac-edit-select').value, 10);
            factions = factions.filter(fac => fac.id !== id);
            saveToStorage();
            if (currentDataTab === 'factions') renderFactions();
            closeModals();
        }

        let activeQuestId = null;

        function openQuestActionModal(id) {
            activeQuestId = id;
            const q = quests.find(x => x.id === id);
            if (!q) return;

            document.getElementById('qa-title').innerText = q.name;
            document.getElementById('qa-giver').innerText = "GIVER: " + (q.giver || "UNKNOWN");
            document.getElementById('qa-loc').innerText = "LOCATION: " + (q.location || "UNKNOWN");
            
            let timeText = q.timeStr || "--:--";
            if (q.expired) timeText += " (EXPIRED)";
            else if (q.abandoned) timeText += " (ABANDONED)";
            document.getElementById('qa-time').innerText = "TIME LIMIT: " + timeText;

            let objHTML = q.objectives.map(o => `<div>- ${o}</div>`).join('');
            document.getElementById('qa-obj').innerHTML = objHTML;

            const toggleBtn = document.getElementById('qa-toggle-btn');
            const abandonBtn = document.getElementById('qa-abandon-btn');

            if (q.completed) {
                toggleBtn.style.display = 'block';
                toggleBtn.innerText = "MARK AS INCOMPLETE";
                abandonBtn.style.display = 'none';
            } else if (q.abandoned) {
                toggleBtn.style.display = 'none';
                abandonBtn.style.display = 'block';
                abandonBtn.innerText = "RE-ENGAGE QUEST";
                abandonBtn.onclick = executeQuestReengage;
            } else {
                toggleBtn.style.display = 'block';
                toggleBtn.innerText = "MARK AS COMPLETE";
                abandonBtn.style.display = 'block';
                abandonBtn.innerText = "ABANDON QUEST";
                abandonBtn.onclick = executeQuestAbandon;
            }

            document.getElementById('quest-action-modal').style.display = 'flex';
        }

        function executeQuestToggle() {
            if (!activeQuestId) return;
            const quest = quests.find(q => q.id === activeQuestId);
            if (!quest) return;

            // If it's already completed and they are UN-checking it, just do it.
            if (quest.completed) {
                quest.completed = false;
                if (quest.giver && quest.giver !== "UNKNOWN WASTELANDER") {
                    const linkedFaction = factions.find(f => f.name === quest.giver);
                    if (linkedFaction) linkedFaction.rep -= 10;
                }
                saveToStorage();
                renderQuests();
                closeModals();
                return;
            }

            // If they are trying to COMPLETE it, ask for confirmation to prevent accidental clicks
            showCustomPrompt(`MARK "${quest.name}" AS COMPLETE?`, [
                {
                    label: "YES, COMPLETE QUEST",
                    action: () => {
                        quest.completed = true;
                        if (quest.giver && quest.giver !== "UNKNOWN WASTELANDER") {
                            const linkedFaction = factions.find(f => f.name === quest.giver);
                            if (linkedFaction) {
                                linkedFaction.rep += 10;
                                showNotification(`QUEST COMPLETE! +10 REP WITH ${linkedFaction.name}`);
                            }
                        } else {
                            showNotification(`QUEST COMPLETE: ${quest.name}`);
                        }
                        saveToStorage(); 
                        renderQuests(); 
                        closeModals();
                    }
                },
                {
                    label: "CANCEL",
                    color: "var(--pip-color-dim)",
                    action: () => { /* Do nothing */ }
                }
            ]);
        }

        function executeQuestAbandon() {
            if (!activeQuestId) return;
            const quest = quests.find(q => q.id === activeQuestId);
            if (quest) {
                quest.abandoned = true;
                saveToStorage();
                renderQuests();
                closeModals();
            }
        }

        function executeQuestReengage() {
            if (!activeQuestId) return;
            const quest = quests.find(q => q.id === activeQuestId);
            if (quest) {
                showCustomPrompt(`WHAT WOULD YOU LIKE TO DO WITH "${quest.name}"?`, [
                    {
                        label: "RE-ENGAGE QUEST",
                        action: () => {
                            quest.abandoned = false;
                            saveToStorage();
                            renderQuests();
                            closeModals();
                        }
                    },
                    {
                        label: "PERMANENTLY DELETE",
                        color: "#ff3333",
                        action: () => {
                            quests = quests.filter(q => q.id !== activeQuestId);
                            saveToStorage();
                            renderQuests();
                            closeModals();
                        }
                    },
                    {
                        label: "CANCEL",
                        color: "var(--pip-color-dim)",
                        action: () => { /* Do nothing */ }
                    }
                ]);
            }
        }

        // Modals Logic
        let pendingAuthAction = null;
        let pendingRepId = null;
        let pendingRepIsPositive = true;

        function openActionModal(id) {
            activeItemId = id; const item = items.find(i => i.id === id); if (!item) return;
            document.getElementById('action-title').innerText = item.name; document.getElementById('action-effects').innerText = item.effects;
            const pBtn = document.getElementById('btn-primary-action');
            if (item.type === 'aid') { pBtn.innerText = 'CONSUME'; pBtn.style.display = 'block'; pBtn.onclick = () => modifyItem(-1); } 
            else if (item.type === 'weapons' || item.type === 'apparel') { pBtn.innerText = item.equipped ? 'UNEQUIP' : 'EQUIP'; pBtn.style.display = 'block'; pBtn.onclick = () => toggleEquip(id); } 
            else { pBtn.style.display = 'none'; }
            document.getElementById('action-modal').style.display = 'flex';
        }
        function openAddModal() { document.getElementById('add-name').value = ''; document.getElementById('add-modal').style.display = 'flex'; }
        function openAddQuestModal() { 
            document.getElementById('q-name').value = ''; 
            const giverSelect = document.getElementById('q-giver');
            giverSelect.innerHTML = '<option value="UNKNOWN WASTELANDER">UNKNOWN WASTELANDER</option>';
            factions.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.name;
                opt.innerText = f.name;
                giverSelect.appendChild(opt);
            });
            document.getElementById('add-quest-modal').style.display = 'flex'; 
        }
        
        let tempWpLat = null;
        let tempWpLng = null;
        function openAddWaypointModal(lat, lng) { 
            document.getElementById('wp-name').value = ''; 
            if (lat !== undefined && lng !== undefined) {
                tempWpLat = lat; tempWpLng = lng;
            } else if (pipMap) {
                const c = pipMap.getCenter();
                tempWpLat = c.lat; tempWpLng = c.lng;
            }
            document.getElementById('add-waypoint-modal').style.display = 'flex'; 
        }

        function openRemoveWaypointModal() {
            const select = document.getElementById('wp-remove-select');
            select.innerHTML = '';
            if (waypoints.length === 0) {
                select.innerHTML = '<option value="">NO MARKERS TO REMOVE</option>';
            } else {
                waypoints.forEach(wp => {
                    const opt = document.createElement('option');
                    opt.value = wp.id;
                    opt.innerText = wp.name;
                    select.appendChild(opt);
                });
            }
            document.getElementById('remove-waypoint-modal').style.display = 'flex';
        }
        
        function closeModals() { 
            document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); 
            activeItemId = null; 
            if (html5QrCode) stopQRScanner();
        }

        let html5QrCode = null;

        function startQRScanner() {
            document.getElementById('qr-scan-modal').style.display = 'flex';
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("qr-reader");
            }
            
            // By not specifying aspectRatio, it will use the default camera feed dimensions.
            // We use 'environment' to specifically request the back camera on phones.
            const config = { 
                fps: 10, 
                qrbox: function(viewfinderWidth, viewfinderHeight) {
                    let minEdgePercentage = 0.70; // 70% of the smallest edge
                    let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                    let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                    return {
                        width: qrboxSize,
                        height: qrboxSize
                    };
                }
            };
            
            // Add a small delay to ensure the modal is fully visible before initializing the camera feed
            setTimeout(() => {
                html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
                .catch(err => {
                    console.error(err);
                    document.getElementById('qr-scan-modal').style.display = 'none';
                    showNotification("CAMERA BLOCKED: MUST USE HTTPS SECURE SERVER OR DEVICE PERMISSION DENIED.");
                });
            }, 100);
        }

        function stopQRScanner() {
            // First, immediately hide the modal so the user isn't stuck waiting
            document.getElementById('qr-scan-modal').style.display = 'none';
            
            // Then cleanly shut down the camera hardware in the background
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().then(() => {
                    html5QrCode.clear();
                }).catch(err => {
                    console.error("Error stopping scanner:", err);
                    html5QrCode.clear();
                });
            }
        }

        function onScanSuccess(decodedText, decodedResult) {
            stopQRScanner();
            document.getElementById('qr-scan-modal').style.display = 'none';
            
            try {
                const data = JSON.parse(decodedText);
                
                if (data.action === 'TRADE_ITEM') {
                    // Look if we already have it
                    const existing = items.find(i => i.name === data.item.name && i.type === data.item.type);
                    if (existing) {
                        existing.quantity += 1;
                    } else {
                        const newItem = {...data.item};
                        newItem.id = Date.now();
                        newItem.quantity = 1;
                        newItem.equipped = false;
                        items.push(newItem);
                    }
                    saveToStorage();
                    renderInventory(currentInvTab);
                    showNotification(`RECEIVED P2P ITEM: ${data.item.name}`);
                } 
                else if (data.action === 'SHARE_QUEST') {
                    // Check if already got it
                    if (quests.find(q => q.name === data.quest.name)) {
                        showNotification("QUEST LOG ALREADY CONTAINS THIS ENTRY.");
                        return;
                    }
                    
                    const newQuest = {...data.quest};
                    newQuest.id = Date.now();
                    quests.push(newQuest);
                    saveToStorage();
                    if (currentDataTab === 'quests') renderQuests();
                    showNotification(`NEW QUEST UPLOADED: ${newQuest.name}`);
                }
                else {
                    showNotification("UNRECOGNIZED P2P DATA PROTOCOL.");
                }

            } catch(e) {
                showNotification("DATA CORRUPTION ERROR. P2P TRANSFER FAILED.");
            }
        }

        function generateQR(payloadStr) {
            document.getElementById('qr-code-canvas').innerHTML = ''; // clear old
            new QRCode(document.getElementById("qr-code-canvas"), {
                text: payloadStr,
                width: 250,
                height: 250,
                colorDark : "#051005",
                colorLight : "#1aff80", // Using pipboy colors for the code!
                correctLevel : QRCode.CorrectLevel.L
            });
            document.getElementById('qr-display-modal').style.display = 'flex';
        }

        let pendingRefundItem = null;

        function closeQRDisplay(wasSuccessful) {
            document.getElementById('qr-display-modal').style.display = 'none';
            if (!wasSuccessful && pendingRefundItem) {
                // User aborted the trade, refund the item
                const existing = items.find(i => i.name === pendingRefundItem.name && i.type === pendingRefundItem.type);
                if (existing) {
                    existing.quantity += 1;
                } else {
                    const newItem = {...pendingRefundItem};
                    newItem.id = Date.now();
                    newItem.quantity = 1;
                    newItem.equipped = false;
                    items.push(newItem);
                }
                saveToStorage();
                renderInventory(currentInvTab);
                showNotification("TRADE ABORTED. ITEM REFUNDED.");
            }
            pendingRefundItem = null;
        }

        function generateItemQR() {
            if (!activeItemId) return;
            const item = items.find(i => i.id === activeItemId);
            if (!item) return;

            showCustomPrompt(`TRADING ITEM: ${item.name}. YOU WILL LOSE 1 QUANTITY FROM YOUR INVENTORY. PROCEED?`, [
                {
                    label: "GENERATE CODE",
                    action: () => {
                        pendingRefundItem = { name: item.name, type: item.type, effects: item.effects };
                        modifyItem(-1); // Takes it from their inventory
                        const payload = {
                            action: 'TRADE_ITEM',
                            item: { name: item.name, type: item.type, effects: item.effects }
                        };
                        generateQR(JSON.stringify(payload));
                    }
                },
                { label: "CANCEL", color: "var(--pip-color-dim)", action: () => {} }
            ]);
        }

        function generateQuestQR() {
            if (!activeQuestId) return;
            const quest = quests.find(q => q.id === activeQuestId);
            if (!quest) return;

            const payload = {
                action: 'SHARE_QUEST',
                quest: { 
                    name: quest.name, 
                    type: quest.type, 
                    giver: quest.giver,
                    location: quest.location,
                    timeStr: quest.timeStr,
                    expireTime: quest.expireTime,
                    objectives: [...quest.objectives],
                    completed: false,
                    expired: false,
                    abandoned: false
                }
            };
            generateQR(JSON.stringify(payload));
        }

        function modifyItem(amount) {
            const i = items.findIndex(x => x.id === activeItemId);
            if (i > -1) { items[i].quantity += amount; if (items[i].quantity <= 0) items.splice(i, 1); closeModals(); saveToStorage(); renderInventory(currentInvTab); }
        }
        function toggleEquip(id) { const i = items.find(x => x.id === id); if (i) { i.equipped = !i.equipped; closeModals(); saveToStorage(); renderInventory(currentInvTab); } }

        function saveNewItem() {
            items.push({ id: Date.now(), name: (document.getElementById('add-name').value || 'ITEM').toUpperCase(), type: document.getElementById('add-type').value, effects: document.getElementById('add-effects').value, quantity: 1, equipped: false });
            saveToStorage(); switchSubTab('inv', document.getElementById('add-type').value); closeModals();
        }

        function saveNewQuest() {
            try {
                let rawObjs = document.getElementById('q-obj').value;
                let objectivesList = rawObjs ? rawObjs.split(',').map(o => o.trim()) : ["No objectives given"];
                
                let timeInputEl = document.getElementById('q-time');
                let timeInput = timeInputEl ? timeInputEl.value.trim() : "";
                
                let expireTimestamp = null;
                let displayTime = '--:--';

                if(timeInput) {
                    let h = NaN, m = NaN;
                    
                    let looksLikeClockTime = timeInput.includes(':') || /^\d{3,4}$/.test(timeInput);

                    if (looksLikeClockTime) {
                        if(timeInput.includes(':')) {
                            let parts = timeInput.split(':');
                            h = parseInt(parts[0], 10);
                            m = parseInt(parts[1], 10);
                        } else {
                            let clean = timeInput.replace(/[^0-9]/g, '');
                            if(clean.length >= 3) {
                                h = parseInt(clean.substring(0, clean.length-2), 10);
                                m = parseInt(clean.substring(clean.length-2), 10);
                            }
                        }
                    }

                    if(!isNaN(h) && !isNaN(m)) {
                        const d = new Date();
                        d.setHours(h, m, 0, 0);
                        if (d < new Date()) d.setDate(d.getDate() + 1);
                        expireTimestamp = d.getTime();
                        displayTime = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
                    } else {
                        displayTime = timeInput; 
                    }
                }

                let newQuest = {
                    id: Date.now(),
                    name: (document.getElementById('q-name').value || 'UNKNOWN QUEST').toUpperCase(),
                    type: document.getElementById('q-type').value,
                    giver: document.getElementById('q-giver').value,
                    location: (document.getElementById('q-loc').value || 'UNKNOWN').toUpperCase(),
                    timeStr: displayTime,
                    expireTime: expireTimestamp,
                    objectives: objectivesList,
                    completed: false,
                    expired: false
                };
                
                quests.push(newQuest);
                
                saveToStorage(); 
                renderQuests(); 
                closeModals();
            } catch(e) {
                console.error("Quest save error", e);
                showNotification("SYSTEM ERROR SAVING QUEST.");
            }
        }

        // Radio Logic
        let audioPlayer = new Audio();
        audioPlayer.loop = true;

        function playRadio(element, trackUrl) {
            document.querySelectorAll('.radio-station').forEach(st => st.classList.remove('playing'));
            element.classList.add('playing');
            
            audioPlayer.pause();
            if (trackUrl) {
                audioPlayer.src = trackUrl;
                audioPlayer.play().catch(err => {
                    showNotification("RADIO ERROR: BROWSER BLOCKED AUTO-PLAY. TAP ANYWHERE FIRST.");
                });
            }
        }

        // Leaflet Maps Logic (Free API)
        let pipMap = null;
        let markersGroup = null;
        let otherPlayersGroup = null;
        let userMarker = null;
        let gpsWatchId = null;
        let liveTrackingEnabled = false;

        function initPipMap() {
            if (pipMap) {
                pipMap.invalidateSize();
                renderMarkers();
                return;
            }
            
            // Initialize map centered on Perth (or first waypoint)
            const initialCenter = waypoints.length > 0 ? [waypoints[0].lat, waypoints[0].lng] : [-31.9505, 115.8605];
            
            pipMap = L.map('map-container', {
                zoomControl: true,
                attributionControl: true
            }).setView(initialCenter, 14);

            // Using CartoDB Dark Matter (Free, no API key needed) and styling it with CSS filters
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO',
                maxZoom: 19
            }).addTo(pipMap);
            
            // Listen for long-press / right-click
            pipMap.on('contextmenu', function(e) {
                openAddWaypointModal(e.latlng.lat, e.latlng.lng);
            });

            markersGroup = L.layerGroup().addTo(pipMap);
            otherPlayersGroup = L.layerGroup().addTo(pipMap);
            renderMarkers();
            
            // Start listening to Firebase for other players
            if (window.db) {
                const usersRef = window.firebaseRef(window.db, 'wastelanders/');
                window.firebaseOnValue(usersRef, (snapshot) => {
                    otherPlayersGroup.clearLayers();
                    const data = snapshot.val();
                    if (!data) return;
                    
                    const otherPlayerIcon = L.divIcon({
                        className: 'custom-pip-marker',
                        html: `<div style="background-color: transparent; width: 14px; height: 14px; border-radius: 50%; border: 2px dashed #ffb642; box-shadow: 0 0 10px #ffb642;"></div>`,
                        iconSize: [14, 14],
                        iconAnchor: [7, 7]
                    });

                    const myUid = localStorage.getItem('pipboy-uid');

                    for (let uid in data) {
                        if (uid === myUid) continue; // Don't draw ourselves twice
                        
                        const p = data[uid];
                        
                        // Calculate how old this data is
                        const ageInMinutes = Math.floor((Date.now() - p.timestamp) / 60000);
                        let nameLabel = p.name;
                        
                        // If the data is older than 5 minutes, mark them as 'Last Known Location'
                        if (ageInMinutes > 5) {
                            nameLabel += ` (LKL: ${ageInMinutes}m ago)`;
                        }

                        L.marker([p.lat, p.lng], {icon: otherPlayerIcon, zIndexOffset: 900})
                            .bindTooltip(nameLabel, {
                                permanent: false, 
                                direction: 'top', 
                                className: 'pip-tooltip'
                            })
                            .addTo(otherPlayersGroup);
                    }
                });
            }
        }

        function renderMarkers() {
            if (!pipMap || !markersGroup) return;
            markersGroup.clearLayers();

            const customIcon = L.divIcon({
                className: 'custom-pip-marker',
                html: `<div style="background-color: var(--pip-color); width: 12px; height: 12px; transform: rotate(45deg); border: 2px solid var(--pip-bg); box-shadow: 0 0 10px var(--pip-color);"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });

            waypoints.forEach(wp => {
                const marker = L.marker([wp.lat, wp.lng], {icon: customIcon})
                    .bindTooltip(wp.name, {
                        permanent: true, 
                        direction: 'top', 
                        className: 'pip-tooltip'
                    })
                    .addTo(markersGroup);
            });
            
            // Re-center map to fit all markers if there are any
            if (waypoints.length > 0) {
                const group = new L.featureGroup(waypoints.map(wp => L.marker([wp.lat, wp.lng])));
                pipMap.fitBounds(group.getBounds().pad(0.2));
            }
        }

        function saveNewWaypoint() {
            const name = document.getElementById('wp-name').value.trim() || 'UNKNOWN LOCATION';
            
            if (tempWpLat === null || tempWpLng === null) return;

            waypoints.push({
                id: Date.now(),
                name: name.toUpperCase(),
                lat: tempWpLat,
                lng: tempWpLng,
                discovered: false // By default, user-created waypoints can also be "discovered"
            });

            saveToStorage();
            if (document.getElementById('tab-map').classList.contains('active')) {
                renderMarkers();
            }
            closeModals();
        }

        function deleteWaypoint() {
            const selectId = document.getElementById('wp-remove-select').value;
            if (!selectId) {
                closeModals();
                return;
            }
            
            const idToRemove = parseInt(selectId, 10);
            waypoints = waypoints.filter(wp => wp.id !== idToRemove);
            
            saveToStorage();
            if (document.getElementById('tab-map').classList.contains('active')) {
                renderMarkers();
            }
            closeModals();
        }

        // Geofencing helper function (Haversine formula to get distance in meters)
        function getDistance(lat1, lon1, lat2, lon2) {
            const R = 6371e3; // Earth radius in meters
            const φ1 = lat1 * Math.PI/180;
            const φ2 = lat2 * Math.PI/180;
            const Δφ = (lat2-lat1) * Math.PI/180;
            const Δλ = (lon2-lon1) * Math.PI/180;
            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c; 
        }

        function toggleGPS() {
            const btn = document.getElementById('gps-btn');
            
            // Check opt-in status
            if (localStorage.getItem('pipboy-opt-in') !== 'true') {
                showNotification("GPS TRACKING ABORTED. YOU MUST OPT-IN TO SATELLITE TRACKING TO ENABLE THIS FEATURE.");
                return;
            }

            // Ensure user has a persistent UID for Firebase
            let myUid = localStorage.getItem('pipboy-uid');
            if (!myUid) {
                myUid = 'user_' + Date.now() + Math.floor(Math.random()*1000);
                localStorage.setItem('pipboy-uid', myUid);
            }

            if (gpsWatchId !== null) {
                // Turn off GPS
                navigator.geolocation.clearWatch(gpsWatchId);
                gpsWatchId = null;
                btn.innerText = "[ENABLE GPS TRACKING]";
                btn.style.background = "transparent";
                btn.style.color = "var(--pip-color)";
                if (userMarker && markersGroup) {
                    markersGroup.removeLayer(userMarker);
                    userMarker = null;
                }
                // Wipe our tracking data from Firebase so we disappear from other maps
                if (window.db) {
                    window.firebaseSet(window.firebaseRef(window.db, 'wastelanders/' + myUid), null);
                }
                return;
            }

            // Turn on GPS
            if (!navigator.geolocation) {
                showNotification("GEOLOCATION IS NOT SUPPORTED BY YOUR DEVICE.");
                return;
            }

            btn.innerText = "[LOCATING SATELLITE...]";
            
            const userIcon = L.divIcon({
                className: 'custom-pip-marker',
                html: `<div style="background-color: var(--pip-color); width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--pip-bg); box-shadow: 0 0 15px var(--pip-color); animation: pulse-border 1.5s infinite;"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7]
            });

            gpsWatchId = navigator.geolocation.watchPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    
                    btn.innerText = "[DISABLE GPS TRACKING]";
                    btn.style.background = "var(--pip-color-dim)";
                    btn.style.color = "var(--pip-bg)";

                    if (!userMarker) {
                        userMarker = L.marker([lat, lng], {icon: userIcon, zIndexOffset: 1000})
                            .bindTooltip("YOU ARE HERE", {
                                permanent: true, 
                                direction: 'top', 
                                className: 'pip-tooltip'
                            })
                            .addTo(markersGroup);
                        pipMap.setView([lat, lng], 16); 
                    } else {
                        userMarker.setLatLng([lat, lng]);
                    }
                    // Push live location to Firebase!
                    if (window.db) {
                        const myRef = window.firebaseRef(window.db, 'wastelanders/' + myUid);
                        window.firebaseSet(myRef, {
                            name: userProfile.name,
                            lat: lat,
                            lng: lng,
                            timestamp: Date.now()
                        });
                        // Removed auto-delete on disconnect. The last known location will stay forever!
                    }

                    // --- GEOFENCING LOGIC (DISCOVER WAYPOINTS) ---
                    let changed = false;
                    waypoints.forEach(wp => {
                        if (!wp.discovered) {
                            const dist = getDistance(lat, lng, wp.lat, wp.lng);
                            // If user is within 30 meters of the waypoint
                            if (dist < 30) {
                                wp.discovered = true;
                                changed = true;
                                showNotification("LOCATION DISCOVERED: " + wp.name);
                            }
                        }
                    });

                    if (changed) {
                        saveToStorage();
                        // Also update the "LOCATIONS DISCOVERED" stat in the DATA tab!
                        renderStatsTab();
                    }
                },
                (error) => {
                    showNotification("SATELLITE LINK FAILED. PLEASE CHECK DEVICE SETTINGS.");
                    toggleGPS(); // Reset button
                },
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
        }

        function renderStatsTab() {
            const discoveredCount = waypoints.filter(wp => wp.discovered).length;
            const container = document.getElementById('sub-data-stats');
            if (container) {
                container.innerHTML = `
                    <h2>GENERAL STATS</h2><br>
                    <p>LOCATIONS DISCOVERED: ${discoveredCount}</p>
                    <p>DAYS PASSED: 0</p>
                    <p>NUKA-COLAS DRUNK: 0</p>
                `;
            }
        }

        function triggerDevReset() {
            showCustomPrompt("INITIATE FULL FACTORY RESET? THIS WILL WIPE ALL LOCALLY SAVED DATA (USER, ITEMS, QUESTS, FACTIONS, WAYPOINTS).", [
                {
                    label: "YES, WIPE MEMORY",
                    color: "#ff3333",
                    action: () => {
                        localStorage.clear();
                        window.location.reload();
                    }
                },
                {
                    label: "CANCEL",
                    color: "var(--pip-color-dim)",
                    action: () => { /* Do nothing */ }
                }
            ]);
        }

        // Custom CSS for map tooltips to match Pip-Boy style
        const style = document.createElement('style');
        style.innerHTML = `
            .pip-tooltip {
                background-color: var(--pip-bg) !important;
                color: var(--pip-color) !important;
                border: 1px solid var(--pip-color) !important;
                font-family: 'VT323', monospace !important;
                font-size: 1.1rem !important;
                box-shadow: 0 0 5px var(--pip-color) !important;
                text-shadow: none !important;
            }
            .pip-tooltip::before { display: none !important; }
        `;
        document.head.appendChild(style);

        // Camera & Photo Mode Logic
        let rawVideoStream = null;
        let currentFacingMode = "environment";
        
        function startCamera() {
            const video = document.getElementById('cam-video');
            const placeholder = document.getElementById('cam-placeholder');
            const startBtn = document.getElementById('cam-start-btn');
            const snapBtn = document.getElementById('cam-snap-btn');
            const flipBtn = document.getElementById('cam-flip-btn');
            const crtOverlay = document.getElementById('cam-crt-overlay');
            const reticle = document.getElementById('cam-reticle');

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                showNotification("CAMERA API NOT SUPPORTED. PLEASE USE SECURE HTTPS.");
                return;
            }

            if (rawVideoStream) {
                rawVideoStream.getTracks().forEach(track => track.stop());
            }

            navigator.mediaDevices.getUserMedia({ video: { facingMode: currentFacingMode }, audio: false })
            .then(stream => {
                rawVideoStream = stream;
                video.srcObject = stream;
                
                // If using the front-facing "selfie" camera, flip the live video feed so it acts like a mirror
                if (currentFacingMode === 'user') {
                    video.style.transform = 'scaleX(-1)';
                } else {
                    video.style.transform = 'scaleX(1)';
                }

                // UI Updates
                placeholder.style.display = 'none';
                video.style.display = 'block';
                crtOverlay.style.display = 'block';
                reticle.style.display = 'block';
                startBtn.style.display = 'none';
                snapBtn.style.display = 'block';
                flipBtn.style.display = 'block';
                
            })
            .catch(err => {
                console.error(err);
                showNotification("CAMERA ACCESS DENIED OR HARDWARE UNAVAILABLE.");
            });
        }

        function flipCamera() {
            currentFacingMode = currentFacingMode === "environment" ? "user" : "environment";
            startCamera();
        }

        function stopCamera() {
            if (rawVideoStream) {
                rawVideoStream.getTracks().forEach(track => track.stop());
                rawVideoStream = null;
            }
            
            // Reset UI
            document.getElementById('cam-video').style.display = 'none';
            document.getElementById('cam-canvas').style.display = 'none';
            document.getElementById('cam-crt-overlay').style.display = 'none';
            document.getElementById('cam-reticle').style.display = 'none';
            document.getElementById('cam-placeholder').style.display = 'block';
            document.getElementById('cam-start-btn').style.display = 'block';
            document.getElementById('cam-snap-btn').style.display = 'none';
            document.getElementById('cam-flip-btn').style.display = 'none';
            document.getElementById('cam-save-controls').style.display = 'none';
        }

        function takePhoto() {
            const video = document.getElementById('cam-video');
            const canvas = document.getElementById('cam-canvas');
            
            // Set canvas to exact video dimensions
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Draw current video frame to canvas
            const ctx = canvas.getContext('2d');

            // If using the front-facing camera, we need to flip the canvas horizontally 
            // so the photo doesn't save backwards!
            if (currentFacingMode === 'user') {
                ctx.translate(canvas.width, 0);
                ctx.scale(-1, 1);
            }
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Reset transform just in case
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            // Swap display so it freezes on the picture
            video.style.display = 'none';
            canvas.style.display = 'block';
            
            // We can now stop the video stream to save battery while they look at the picture
            if (rawVideoStream) {
                rawVideoStream.getTracks().forEach(track => track.stop());
                rawVideoStream = null;
            }
            
            document.getElementById('cam-snap-btn').style.display = 'none';
            document.getElementById('cam-flip-btn').style.display = 'none';
            document.getElementById('cam-save-controls').style.display = 'flex';
        }

        function resetCamera() {
            document.getElementById('cam-canvas').style.display = 'none';
            document.getElementById('cam-save-controls').style.display = 'none';
            
            // Reset button states for next photo
            document.getElementById('cam-download-btn').style.display = 'block';
            document.getElementById('cam-next-btn').style.display = 'none';
            
            startCamera(); // Reboot the feed
        }

        let photoArchive = JSON.parse(localStorage.getItem('pipboy-photos')) || [];

        function savePhoto() {
            const canvas = document.getElementById('cam-canvas');
            
            // Create a temporary hidden off-screen canvas to permanently bake the CSS filters into the image data
            const bakedCanvas = document.createElement('canvas');
            bakedCanvas.width = canvas.width;
            bakedCanvas.height = canvas.height;
            const ctx = bakedCanvas.getContext('2d');
            
            // Draw a black background first just in case
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, bakedCanvas.width, bakedCanvas.height);
            
            // Apply the updated, grittier CSS filters
            ctx.filter = "sepia(100%) hue-rotate(85deg) saturate(300%) brightness(0.8) contrast(1.8)";
            ctx.drawImage(canvas, 0, 0);

            // Add a Pip-Boy watermark overlay before saving
            ctx.filter = "none"; // reset filter for text
            ctx.fillStyle = "#1aff80";
            ctx.font = "30px 'Courier New', Courier, monospace";
            ctx.fillText("POX-BOY 3026 OS", 20, 40);

            // Convert baked canvas to image URL
            const dataURL = bakedCanvas.toDataURL('image/png');
            
            // Trigger download
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = `Wasteland_Snapshot_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            // Save to in-app archive (keep it small by resizing if necessary, but dataURL works for now)
            photoArchive.unshift(dataURL);
            localStorage.setItem('pipboy-photos', JSON.stringify(photoArchive));

            document.body.removeChild(a);
            
            document.getElementById('cam-download-btn').style.display = 'none';
            document.getElementById('cam-next-btn').style.display = 'block';
            
            showNotification("IMAGE SAVED TO DEVICE DATABANKS AND ARCHIVE.");
        }

        function openPhotoArchive() {
            stopCamera();
            const archiveEl = document.getElementById('photo-archive-modal');
            const galleryEl = document.getElementById('photo-gallery');
            galleryEl.innerHTML = '';
            
            if (photoArchive.length === 0) {
                galleryEl.innerHTML = '<p style="text-align:center; opacity:0.5; margin-top:20px;">NO IMAGES IN DATABANK</p>';
            } else {
                photoArchive.forEach((url, idx) => {
                    galleryEl.innerHTML += `
                        <div style="margin-bottom: 20px; border: 2px solid var(--pip-color); padding: 5px;">
                            <img src="${url}" style="width: 100%; height: auto; display: block;">
                            <button class="pip-btn" onclick="deletePhoto(${idx})" style="border-color: #ff3333; color: #ff3333; margin-top: 5px; width: 100%;">DELETE IMAGE</button>
                        </div>
                    `;
                });
            }
            
            archiveEl.style.display = 'flex';
        }

        function deletePhoto(idx) {
            showCustomPrompt("DELETE THIS IMAGE FROM DATABANKS?", [
                {
                    label: "YES, DELETE",
                    color: "#ff3333",
                    action: () => {
                        photoArchive.splice(idx, 1);
                        localStorage.setItem('pipboy-photos', JSON.stringify(photoArchive));
                        openPhotoArchive(); // refresh gallery
                    }
                },
                { label: "CANCEL", color: "var(--pip-color-dim)", action: () => {} }
            ]);
        }

        function closePhotoArchive() {
            document.getElementById('photo-archive-modal').style.display = 'none';
            // Only reboot camera if we are still on the cam tab
            if (document.getElementById('tab-cam').classList.contains('active')) {
                startCamera();
            }
        }

        renderQuests();
        initOnboarding();
