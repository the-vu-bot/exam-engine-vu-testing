 // GLOBAL VARIABLES
 let masterBank = [];
 let questions = [];
 let state = []; 
 let currentQ = 0;
 let totalSeconds = 0;
 let sectionalSeconds = 0;
 let timeSpentGlobal = 0;
 let timerId;
 let currentMode = 'home'; 
 let examType = 'mock';
 let defaultLang = 'hi';
 let currentLang = 'hi';
 let forcedEn = false; 
 let isCalcDrill = false; 
 let isPaused = false;

 // INTELLIGENT MEMORY VARIABLES
 let globalActiveSubjects = JSON.parse(localStorage.getItem('vu_global_subjects')) || [];
 const defaultCalcTopics = ['Mixed', 'Addition', 'Subtraction', 'Multiplication', 'Division', 'Add & Sub', 'Mult & Div', 'Squares', 'Cubes', 'Triplet Completion'];
 let globalCalcSubjects = JSON.parse(localStorage.getItem('vu_calc_subjects')) || [...defaultCalcTopics];
 
 let userSprintTime = parseInt(localStorage.getItem('vu_sprint_time')) || 15;
 let userSprintQs = parseInt(localStorage.getItem('vu_sprint_qs')) || 25;
 let userMockGlobalTime = parseInt(localStorage.getItem('vu_mock_global_time')) || 60;
 let userMockGlobalQs = parseInt(localStorage.getItem('vu_mock_global_qs')) || 100;
 let userMockSplitMode = localStorage.getItem('vu_mock_split_mode') || 'auto';
 let userMockSecData = JSON.parse(localStorage.getItem('vu_mock_sec_data') || '{}');

 // Review Mode Filters
 let reviewFilteredIndices = [];
 let activeReviewStatuses = [];
 let isReviewSluggish = false;

 // Revision Engine Constants
 let revFilters = []; 
 let revCurrentPage = 1;
 let revSubjectState = 'all';
 let revTopicState = 'all';
 let activeSliderUid = null;

 let mockBoundaries = []; 
 let activeSectionIndex = 0; 

 const STORAGE_SEEN = 'VU_ENGINE_SEEN_UIDS';
 const STORAGE_WRONG = 'VU_ENGINE_WRONG_UIDS';
 const STORAGE_SESSION = 'VU_ACTIVE_SESSION';
 const STORAGE_IMAGES = 'VU_IMAGE_SOLUTIONS';
 const STORAGE_GITHUB_TOKEN = 'VU_GITHUB_TOKEN';
 const STORAGE_TIME = 'VU_ENGINE_TIME_MAP';
 
 // --- NAVIGATION FUNCTIONS (FIXED) ---
 function goHomeAlert() {
     closeSlider();
     if(currentMode === 'test' || currentMode === 'practice') {
         if(!confirm("Exit to Dashboard? Your progress will be permanently lost.")) return;
     }
     
     // 1. Clear session memory to prevent auto-restore on next refresh
     localStorage.removeItem(STORAGE_SESSION);
     
     // 2. Stop any active timers
     clearInterval(timerId);
     
     // 3. Reset internal mode
     currentMode = 'home';
     
     // 4. Update UI Visibility
     const screens = ['lock-screen', 'home-screen', 'revision-screen', 'analysis-screen', 'cbt-screen'];
     screens.forEach(s => {
         const el = document.getElementById(s);
         if(el) el.style.display = (s === 'home-screen') ? 'flex' : 'none';
     });
     
     // 5. Hard Reset questions to save memory
     questions = [];
     state = [];
 }

 function exitRevisionPage() {
     goHomeAlert();
 }

 // --- SETTINGS MODAL ---
 function openSettings() {
     document.getElementById('set-sprint-time').value = userSprintTime;
     document.getElementById('set-sprint-qs').value = userSprintQs;
     document.getElementById('set-mock-global-time').value = userMockGlobalTime;
     document.getElementById('set-mock-global-qs').value = userMockGlobalQs;
     
     const modalContainer = document.getElementById('modal-subject-toggles');
     modalContainer.innerHTML = '';
     const subjects = [...new Set(masterBank.map(q => q.subject).filter(Boolean))];
     
     subjects.forEach(sub => {
         const btn = document.createElement('button');
         btn.className = 'sub-toggle-btn' + (globalActiveSubjects.includes(sub) ? ' active' : '');
         btn.innerText = sub;
         btn.onclick = () => { toggleGlobalSubject(sub, btn); renderSectionalDistribution(); };
         modalContainer.appendChild(btn);
     });

     const calcContainer = document.getElementById('modal-calc-toggles');
     calcContainer.innerHTML = '';
     defaultCalcTopics.forEach(sub => {
         const btn = document.createElement('button');
         btn.className = 'sub-toggle-btn' + (globalCalcSubjects.includes(sub) ? ' active' : '');
         btn.innerText = sub;
         btn.onclick = () => { toggleCalcSubject(sub, btn); };
         calcContainer.appendChild(btn);
     });
     
     setSplitMode(userMockSplitMode);
     document.getElementById('settings-overlay').style.display = 'flex';
 }

 function closeSettings() { document.getElementById('settings-overlay').style.display = 'none'; }

 function switchSettingsTab(tabName) {
     document.querySelectorAll('.master-tab').forEach(t => t.classList.remove('active'));
     document.querySelectorAll('.settings-pane').forEach(p => p.classList.remove('active'));
     document.getElementById(`tab-${tabName}`).classList.add('active');
     document.getElementById(`pane-${tabName}`).classList.add('active');
 }

 function toggleCalcSubject(sub, btn) {
     const idx = globalCalcSubjects.indexOf(sub);
     if (idx > -1) {
         if (globalCalcSubjects.length === 1) { alert("Keep at least one active!"); return; }
         globalCalcSubjects.splice(idx, 1); btn.classList.remove('active');
     } else { globalCalcSubjects.push(sub); btn.classList.add('active'); }
     localStorage.setItem('vu_calc_subjects', JSON.stringify(globalCalcSubjects));
 }

 function setSplitMode(mode) {
     userMockSplitMode = mode;
     const isAuto = mode === 'auto';
     document.getElementById('btn-auto-split').style.background = isAuto ? 'var(--cbt-blue)' : '#eee';
     document.getElementById('btn-auto-split').style.color = isAuto ? 'white' : '#555';
     document.getElementById('btn-custom-split').style.background = !isAuto ? 'var(--cbt-blue)' : '#eee';
     document.getElementById('btn-custom-split').style.color = !isAuto ? 'white' : '#555';
     if(isAuto) syncFromGlobal(); else renderSectionalDistribution();
 }

 function syncFromGlobal() {
     if(userMockSplitMode === 'auto' && globalActiveSubjects.length > 0) {
         let totalTime = parseInt(document.getElementById('set-mock-global-time').value) || 0;
         let timePerSec = Math.floor(totalTime / globalActiveSubjects.length); 
         globalActiveSubjects.forEach(sub => {
             if(!userMockSecData[sub]) userMockSecData[sub] = { qs: 25 }; 
             userMockSecData[sub].time = timePerSec;
         });
     }
     renderSectionalDistribution();
 }

 function syncFromSectional() {
     let totalTime = 0, totalQs = 0;
     globalActiveSubjects.forEach(sub => {
         let timeInput = document.getElementById(`sec-time-${sub}`), qsInput = document.getElementById(`sec-qs-${sub}`);
         if(timeInput) totalTime += parseInt(timeInput.value) || 0;
         if(qsInput) totalQs += parseInt(qsInput.value) || 0;
         userMockSecData[sub] = { time: timeInput ? parseInt(timeInput.value) || 0 : 0, qs: qsInput ? parseInt(qsInput.value) || 0 : 0 };
     });
     if (userMockSplitMode === 'custom') document.getElementById('set-mock-global-time').value = totalTime;
     document.getElementById('set-mock-global-qs').value = totalQs;
 }

 function renderSectionalDistribution() {
     let container = document.getElementById('sectional-distribution-container'); container.innerHTML = '';
     if (globalActiveSubjects.length === 0) { container.innerHTML = '<div style="text-align:center; color:#888;">No active subjects.</div>'; return; }
     globalActiveSubjects.forEach(sub => {
         if(!userMockSecData[sub]) userMockSecData[sub] = { time: 15, qs: 25 };
         let isAuto = userMockSplitMode === 'auto';
         let row = document.createElement('div'); row.className = 'settings-row';
         row.style.cssText = 'background:#fcfcfc; padding:8px 12px; border-radius:6px; border:1px solid #eee;';
         let tInputHTML = isAuto ? `<input type="number" id="sec-time-${sub}" class="settings-input" value="${userMockSecData[sub].time}" disabled style="background:#e9ecef;">` : `<input type="number" id="sec-time-${sub}" class="settings-input" value="${userMockSecData[sub].time}" oninput="syncFromSectional()">`;
         row.innerHTML = `<div style="font-weight:bold; color:var(--cbt-blue); flex:1;">${sub}</div><div class="aligned-input-grid">${tInputHTML}<span style="font-size:0.8rem; color:#888;">Min</span><input type="number" id="sec-qs-${sub}" class="settings-input" value="${userMockSecData[sub].qs}" oninput="syncFromSectional()"><span style="font-size:0.8rem; color:#888;">Qs</span></div>`;
         container.appendChild(row);
     });
 }

 function saveSettings() {
     userSprintTime = parseInt(document.getElementById('set-sprint-time').value) || 15;
     userSprintQs = parseInt(document.getElementById('set-sprint-qs').value) || 25;
     userMockGlobalTime = parseInt(document.getElementById('set-mock-global-time').value) || 60;
     userMockGlobalQs = parseInt(document.getElementById('set-mock-global-qs').value) || 100;
     syncFromSectional(); 
     localStorage.setItem('vu_sprint_time', userSprintTime); localStorage.setItem('vu_sprint_qs', userSprintQs);
     localStorage.setItem('vu_mock_global_time', userMockGlobalTime); localStorage.setItem('vu_mock_global_qs', userMockGlobalQs);
     localStorage.setItem('vu_mock_split_mode', userMockSplitMode); localStorage.setItem('vu_mock_sec_data', JSON.stringify(userMockSecData));
     updateDashboardDropdowns(); closeSettings();
 }

 // --- CLOUD SYNC ---
 async function pushToCloud() {
     let token = localStorage.getItem(STORAGE_GITHUB_TOKEN);
     if (!token) { token = prompt("Enter GitHub PAT:"); if (!token) return; localStorage.setItem(STORAGE_GITHUB_TOKEN, token); }
     const payload = { seen: JSON.parse(localStorage.getItem(STORAGE_SEEN) || '[]'), wrongMap: JSON.parse(localStorage.getItem(STORAGE_WRONG) || '{}'), images: JSON.parse(localStorage.getItem(STORAGE_IMAGES) || '{}'), timeMap: JSON.parse(localStorage.getItem(STORAGE_TIME) || '{}'), settings: { subjects: globalActiveSubjects, calcSubjects: globalCalcSubjects, sprintTime: userSprintTime, sprintQs: userSprintQs, mockGlobalTime: userMockGlobalTime, mockGlobalQs: userMockGlobalQs, mockSplitMode: userMockSplitMode, mockSecData: userMockSecData } };
     const btn = document.getElementById('cloud-push-btn'); const oT = btn.innerHTML; btn.innerHTML = "Syncing... ⏳";
     try {
         const apiUrl = GITHUB_API_BASE + GITHUB_SYNC_FILE; let sha = null;
         const checkRes = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
         if (checkRes.ok) { sha = (await checkRes.json()).sha; }
         const contentB64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2)))); 
         const res = await fetch(apiUrl, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Vault Sync: ${new Date().toISOString()}`, content: contentB64, sha: sha }) });
         if (res.ok) { btn.innerHTML = "✅ Synced!"; setTimeout(() => btn.innerHTML = oT, 3000); } else { alert("Failed."); btn.innerHTML = oT; }
     } catch (e) { console.error(e); btn.innerHTML = oT; }
 }

 async function pullFromCloud() {
     let token = localStorage.getItem(STORAGE_GITHUB_TOKEN);
     if (!token) { token = prompt("Enter GitHub PAT:"); if (!token) return; localStorage.setItem(STORAGE_GITHUB_TOKEN, token); }
     const btn = document.getElementById('cloud-pull-btn'); const oT = btn.innerHTML; btn.innerHTML = "Pulling... ⏳";
     try {
         const apiUrl = GITHUB_API_BASE + GITHUB_SYNC_FILE;
         const res = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
         if (res.ok) {
             const data = JSON.parse(decodeURIComponent(escape(atob((await res.json()).content))));
             if (data.seen) localStorage.setItem(STORAGE_SEEN, JSON.stringify(data.seen));
             if (data.wrongMap) localStorage.setItem(STORAGE_WRONG, JSON.stringify(data.wrongMap));
             if (data.images) localStorage.setItem(STORAGE_IMAGES, JSON.stringify(data.images));
             if (data.timeMap) { let localTM = JSON.parse(localStorage.getItem(STORAGE_TIME) || '{}'); for(let uid in data.timeMap) { localTM[uid] = Math.max(localTM[uid] || 0, data.timeMap[uid]); } localStorage.setItem(STORAGE_TIME, JSON.stringify(localTM)); }
             if (data.settings) { if (data.settings.subjects) { globalActiveSubjects = data.settings.subjects; localStorage.setItem('vu_global_subjects', JSON.stringify(globalActiveSubjects)); } if (data.settings.calcSubjects) { globalCalcSubjects = data.settings.calcSubjects; localStorage.setItem('vu_calc_subjects', JSON.stringify(globalCalcSubjects)); } if (data.settings.sprintTime !== undefined) { userSprintTime = data.settings.sprintTime; localStorage.setItem('vu_sprint_time', userSprintTime); } if (data.settings.sprintQs !== undefined) { userSprintQs = data.settings.sprintQs; localStorage.setItem('vu_sprint_qs', userSprintQs); } if (data.settings.mockGlobalTime !== undefined) { userMockGlobalTime = data.settings.mockGlobalTime; localStorage.setItem('vu_mock_global_time', userMockGlobalTime); } if (data.settings.mockGlobalQs !== undefined) { userMockGlobalQs = data.settings.mockGlobalQs; localStorage.setItem('vu_mock_global_qs', userMockGlobalQs); } if (data.settings.mockSplitMode) { userMockSplitMode = data.settings.mockSplitMode; localStorage.setItem('vu_mock_split_mode', userMockSplitMode); } if (data.settings.mockSecData) { userMockSecData = data.settings.mockSecData; localStorage.setItem('vu_mock_sec_data', JSON.stringify(userMockSecData)); } updateDashboardDropdowns(); if(document.getElementById('settings-overlay').style.display === 'flex') openSettings(); }
             btn.innerHTML = "✅ Restored!"; setTimeout(() => btn.innerHTML = oT, 3000);
         } else { alert("Failed."); btn.innerHTML = oT; }
     } catch (e) { console.error(e); btn.innerHTML = oT; }
 }

 // --- AUTHENTICATION ---
 async function checkAuth() {
     const savedKey = localStorage.getItem('vu_unlocked_key');
     if(savedKey) {
         try {
             const res = await fetch(savedKey + '.json?t=' + new Date().getTime());
             if(res.ok) { masterBank = await res.json(); setupDashboard(); if(!restoreSession()) { document.getElementById('lock-screen').style.display = 'none'; document.getElementById('home-screen').style.display = 'flex'; } return; }
         } catch(e) {}
     }
     document.getElementById('lock-screen').style.display = 'flex'; document.getElementById('home-screen').style.display = 'none';
 }

 async function verifyPin() {
     const input = document.getElementById('pin-input').value.trim(); if(!input) return;
     const btn = document.getElementById('unlock-btn'); btn.innerText = "Verifying...";
     try {
         const res = await fetch(input + '.json?t=' + new Date().getTime());
         if (!res.ok) { alert("❌ File not found!"); btn.innerText = "Unlock Engine"; return; }
         masterBank = await res.json(); localStorage.setItem('vu_unlocked_key', input); setupDashboard();
         if(!restoreSession()) { document.getElementById('lock-screen').style.display = 'none'; document.getElementById('home-screen').style.display = 'flex'; }
     } catch (e) { alert("Error."); }
     btn.innerText = "Unlock Engine";
 }

 function lockEngine() { localStorage.removeItem('vu_unlocked_key'); localStorage.removeItem(STORAGE_SESSION); location.reload(); }

 // --- DASHBOARD ---
 function setupDashboard() {
     document.getElementById('db-stats').innerText = `${masterBank.length} VU Patterns Loaded`;
     const subjects = [...new Set(masterBank.map(q => q.subject).filter(Boolean))];
     if (globalActiveSubjects.length === 0) { globalActiveSubjects = [...subjects]; localStorage.setItem('vu_global_subjects', JSON.stringify(globalActiveSubjects)); }
     updateDashboardDropdowns();
     fetchPrivateImage(`https://raw.githubusercontent.com/the-vu-bot/exam-engine-vu/main/solutions/VU-logo.jpg?v=${Date.now()}`, 'home-logo');
 }

 function toggleGlobalSubject(sub, btn) {
     const idx = globalActiveSubjects.indexOf(sub);
     if (idx > -1) { if (globalActiveSubjects.length === 1) { alert("Need at least one active subject."); return; } globalActiveSubjects.splice(idx, 1); btn.classList.remove('active'); } else { globalActiveSubjects.push(sub); btn.classList.add('active'); }
     localStorage.setItem('vu_global_subjects', JSON.stringify(globalActiveSubjects)); saveTestState(); updateDashboardDropdowns();
 }

 function updateDashboardDropdowns() {
     let oHtml = `<option value="all">Mixed (Active Subjects)</option>`;
     globalActiveSubjects.forEach(sub => { oHtml += `<option value="${sub}">${sub}</option>`; });
     document.getElementById('sprint-subject').innerHTML = oHtml; document.getElementById('practice-subject').innerHTML = oHtml;
 }

 async function startCalculationMode() {
     const currentKey = localStorage.getItem('vu_unlocked_key'); const btn = document.getElementById('calc-btn'); btn.innerText = "Loading...";
     try {
         const res = await fetch(currentKey + '_calc.json?t=' + new Date().getTime());
         if (res.ok) { masterBank = await res.json(); startExam('practice', 'calc_drill', true); } else { alert("❌ Calc file missing."); }
     } catch (e) { alert("Error."); }
     btn.innerText = "Start Drills";
 }

 function editJsonOnGithub() { const k = localStorage.getItem('vu_unlocked_key'); const s = isCalcDrill ? '_calc.json' : '.json'; window.open(`https://github.com/the-vu-bot/exam-engine-vu/edit/main/${k}${s}`, '_blank'); }

 // --- SESSION RESTORE ---
 function saveTestState() {
     if (document.getElementById('rev-subj-filter')) { revSubjectState = document.getElementById('rev-subj-filter').value; revTopicState = document.getElementById('rev-topic-filter').value; }
     const session = { questions, state, currentQ, totalSeconds, sectionalSeconds, activeSectionIndex, examType, defaultLang, currentLang, mockBoundaries, timeSpentGlobal, currentMode, forcedEn, isCalcDrill, revFilters, revCurrentPage, revSubjectState, revTopicState, globalActiveSubjects };
     localStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
 }

 function restoreSession() {
     const sStr = localStorage.getItem(STORAGE_SESSION);
     if(sStr) {
         const s = JSON.parse(sStr);
         questions = s.questions; state = s.state; currentQ = s.currentQ; totalSeconds = s.totalSeconds; sectionalSeconds = s.sectionalSeconds; activeSectionIndex = s.activeSectionIndex; examType = s.examType; defaultLang = s.defaultLang; currentLang = s.currentLang; mockBoundaries = s.mockBoundaries; timeSpentGlobal = s.timeSpentGlobal; currentMode = s.currentMode; forcedEn = s.forcedEn || false; isCalcDrill = s.isCalcDrill || false; isPaused = s.isPaused || false;
         if(s.globalActiveSubjects && s.globalActiveSubjects.length > 0) globalActiveSubjects = s.globalActiveSubjects;
         if (currentMode === 'home') return false; 
         document.getElementById('lock-screen').style.display = 'none'; document.getElementById('home-screen').style.display = 'none';
         fetchPrivateImage(`https://raw.githubusercontent.com/the-vu-bot/exam-engine-vu/main/solutions/VU-logo.jpg`, 'home-logo');
         if (currentMode === 'revision') { let oH = `<option value="all">Active Subjects</option>`; globalActiveSubjects.forEach(sub => { oH += `<option value="${sub}">${sub}</option>`; }); document.getElementById('rev-subj-filter').innerHTML = oH; document.getElementById('rev-subj-filter').value = revSubjectState; updateTopicDropdown(); document.getElementById('rev-topic-filter').value = revTopicState; document.getElementById('revision-screen').style.display = 'flex'; renderRevisionFeed(); return true; }
         if (examType === 'mock') document.getElementById('cbt-title').innerHTML = `Full Mock <span style="font-size:0.8rem; color:#888;">(VU)</span>`; else document.getElementById('cbt-title').innerHTML = `${examType === 'sprint' ? "Sprint" : "Practice"} <span style="font-size:0.8rem; color:#888;">(VU)</span>`;
         if (currentMode === 'analysis') { renderAnalyticsDisplay(); showDashboard(); return true; }
         document.getElementById('cbt-screen').style.display = 'flex'; document.getElementById('default-lang-select').value = defaultLang; document.getElementById('lang-select').value = currentLang;
         if(examType === 'mock') document.getElementById('sectional-timer-wrapper').style.display = 'flex'; else document.getElementById('sectional-timer-wrapper').style.display = 'none';
         buildPalette();
         if (currentMode === 'review') { document.getElementById('header-timer-area').style.display = 'none'; document.getElementById('action-bar-test').style.display = 'none'; document.getElementById('action-bar-review').style.display = 'flex'; document.getElementById('review-filter-bar').style.display = 'flex'; document.getElementById('mobile-submit-btn').classList.add('hide-for-review'); setupReviewFilters(); } else { document.getElementById('review-filter-bar').style.display = 'none'; document.getElementById('mobile-submit-btn').classList.remove('hide-for-review'); loadQuestion(currentQ); pauseTest(); }
         return true;
     }
     return false;
 }

 // --- EXAM LOGIC ---
 function formatTime(secs) { let m = Math.floor(secs / 60).toString().padStart(2, '0'); let s = (secs % 60).toString().padStart(2, '0'); return `${m}:${s}`; }
 function pauseTest() { isPaused = true; clearInterval(timerId); document.getElementById('pause-overlay').style.display = 'flex'; saveTestState(); }
 function resumeTest() { isPaused = false; document.getElementById('pause-overlay').style.display = 'none'; startTestTimer(); }

 function startTestTimer() {
     clearInterval(timerId);
     timerId = setInterval(() => {
         if(isPaused) return; timeSpentGlobal++; if(currentMode === 'test' || currentMode === 'practice') state[currentQ].timeTaken++;
         if (examType === 'mock' && currentMode === 'test') {
             totalSeconds--; sectionalSeconds--; document.getElementById('timer').innerText = formatTime(totalSeconds); document.getElementById('sec-timer').innerText = formatTime(sectionalSeconds);
             if (sectionalSeconds <= 0) { activeSectionIndex++; if (activeSectionIndex < mockBoundaries.length) { sectionalSeconds = mockBoundaries[activeSectionIndex].allocatedTime; loadQuestion(mockBoundaries[activeSectionIndex].start); buildPalette(); } else { submitExam(); } }
         } else if (examType === 'sprint' && currentMode === 'test') { totalSeconds--; document.getElementById('timer').innerText = formatTime(totalSeconds); if(totalSeconds <= 0) submitExam(); } else if(currentMode === 'practice') { document.getElementById('global-timer-label').innerText = 'Stopwatch'; document.getElementById('timer').innerText = formatTime(timeSpentGlobal); }
         if(timeSpentGlobal % 5 === 0) saveTestState();
     }, 1000);
 }

 function renderAnalyticsDisplay() {
     document.getElementById('header-timer-area').style.display = 'none';
     let correct = 0, attempted = 0, wrongTotal = 0; let subStats = {};
     mockBoundaries.forEach(b => { subStats[b.name] = { total: 0, att: 0, correct: 0, wrong: 0, time: 0 }; });
     state.forEach((s, i) => { const sub = questions[i].subject || 'General'; if(!subStats[sub]) subStats[sub] = { total: 0, att: 0, correct: 0, wrong: 0, time: 0 }; subStats[sub].total++; subStats[sub].time += s.timeTaken; if(s.selected !== null) { attempted++; subStats[sub].att++; if(s.selected === questions[i].correct) { correct++; subStats[sub].correct++; } else { wrongTotal++; subStats[sub].wrong++; } } });
     let finalScore = (correct - (wrongTotal / 3)).toFixed(2); let acc = attempted > 0 ? Math.round((correct/attempted)*100) : 0;
     document.getElementById('dash-score').innerText = `${finalScore}`; document.getElementById('dash-correct').innerText = correct; document.getElementById('dash-wrong').innerText = wrongTotal; document.getElementById('dash-acc').innerText = `${acc}%`; document.getElementById('dash-att').innerText = `${attempted} / ${questions.length}`; document.getElementById('dash-time').innerText = formatTime(timeSpentGlobal);
     let cHtml = ''; let textLog = `POSTMORTEM | ${new Date().toLocaleString()}\nMode: ${examType.toUpperCase()}\nScore: ${finalScore}\n----------------------------------\n`;
     for(const [sub, data] of Object.entries(subStats)) {
         if (data.total === 0) continue; 
         let sAcc = data.att > 0 ? Math.round((data.correct/data.att)*100) : 0; let skipped = data.total - data.att;
         let pC = (data.correct / data.total) * 100, pW = (data.wrong / data.total) * 100, pS = (skipped / data.total) * 100;
         cHtml += `<div class="!bg-[#170a2b] !border !border-purple-600/30 !rounded-2xl !p-6 !mb-6 !shadow-[0_10px_30px_rgba(0,0,0,0.5)]"><div class="!flex !justify-between !items-center !mb-5"><h4 class="!text-xl md:!text-2xl !font-black !text-white !tracking-widest !uppercase !drop-shadow-md">${sub}</h4><span class="!text-xs md:!text-sm !font-black !px-4 !py-1.5 !rounded-full !bg-fuchsia-900/50 !text-fuchsia-300 !border !border-fuchsia-500/50 !shadow-[0_0_15px_rgba(217,70,239,0.2)]">ACC: ${sAcc}%</span></div><div class="!w-full !h-4 md:!h-5 !bg-[#080311] !rounded-full !overflow-hidden !flex !mb-8 !border !border-purple-900/80 !shadow-inner"><div style="width: ${pC}%" class="!bg-emerald-400 !shadow-[0_0_10px_rgba(52,211,153,0.8)] !transition-all !duration-1000"></div><div style="width: ${pW}%" class="!bg-rose-500 !shadow-[0_0_10px_rgba(244,63,94,0.8)] !transition-all !duration-1000"></div><div style="width: ${pS}%" class="!bg-purple-900/60 !transition-all !duration-1000"></div></div><div class="!grid !grid-cols-4 !gap-3 md:!gap-5 !text-center"><div class="!bg-[#1e103c] !rounded-xl !py-3 md:!py-4 !border !border-purple-700/50 !shadow-sm"><div class="!text-purple-300 !text-[10px] md:!text-xs !uppercase !tracking-widest !mb-1 !font-black">Total</div><div class="!font-black !text-white !text-lg md:!text-xl">${data.total}</div></div><div class="!bg-[#152e23] !rounded-xl !py-3 md:!py-4 !border !border-emerald-700/50 !shadow-sm"><div class="!text-emerald-400 !text-[10px] md:!text-xs !uppercase !tracking-widest !mb-1 !font-black">Right</div><div class="!font-black !text-emerald-300 !text-lg md:!text-xl">${data.correct}</div></div><div class="!bg-[#35151e] !rounded-xl !py-3 md:!py-4 !border !border-rose-700/50 !shadow-sm"><div class="!text-rose-400 !text-[10px] md:!text-xs !uppercase !tracking-widest !mb-1 !font-black">Wrong</div><div class="!font-black !text-rose-300 !text-lg md:!text-xl">${data.wrong}</div></div><div class="!bg-[#161c3c] !rounded-xl !py-3 md:!py-4 !border !border-indigo-700/50 !shadow-sm"><div class="!text-indigo-300 !text-[10px] md:!text-xs !uppercase !tracking-widest !mb-1 !font-black">Time</div><div class="!font-black !text-indigo-300 !text-lg md:!text-xl">${formatTime(data.time)}</div></div></div></div>`;
         textLog += `[${sub.toUpperCase()}] Acc: ${sAcc}% | Att: ${data.att}/${data.total} | R: ${data.correct} | W: ${data.wrong} | Time: ${formatTime(data.time)}\n`;
     }
     document.getElementById('detailed-stats-area').innerHTML = cHtml; document.getElementById('insight-text').value = textLog;
 }

 function showDashboard() { renderAnalyticsDisplay(); document.getElementById('cbt-screen').style.display = 'none'; document.getElementById('analysis-screen').style.display = 'flex'; }

 window.onload = () => { checkAuth(); };
