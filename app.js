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

 // PHASE 2 & 3: INTELLIGENT MEMORY VARIABLES
 let globalActiveSubjects = JSON.parse(localStorage.getItem('vu_global_subjects')) || [];
 const defaultCalcTopics = ['Mixed', 'Addition', 'Subtraction', 'Multiplication', 'Division', 'Add & Sub', 'Mult & Div', 'Squares', 'Cubes', 'Triplet Completion'];
 let globalCalcSubjects = JSON.parse(localStorage.getItem('vu_calc_subjects')) || [...defaultCalcTopics];
 
 let userSprintTime = parseInt(localStorage.getItem('vu_sprint_time')) || 15;
 let userSprintQs = parseInt(localStorage.getItem('vu_sprint_qs')) || 25;
 let userMockGlobalTime = parseInt(localStorage.getItem('vu_mock_global_time')) || 60;
 let userMockGlobalQs = parseInt(localStorage.getItem('vu_mock_global_qs')) || 100;
 let userMockSplitMode = localStorage.getItem('vu_mock_split_mode') || 'auto';
 let userMockSecData = JSON.parse(localStorage.getItem('vu_mock_sec_data') || '{}');

 // Review Mode Filters (Phase 3)
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
 
 // --- PHASE 2 & 3: EXPANDED MODAL FUNCTIONS ---
 function openSettings() {
     document.getElementById('set-sprint-time').value = userSprintTime;
     document.getElementById('set-sprint-qs').value = userSprintQs;
     document.getElementById('set-mock-global-time').value = userMockGlobalTime;
     document.getElementById('set-mock-global-qs').value = userMockGlobalQs;
     
     // Populate Tests Tab Subjects
     const modalContainer = document.getElementById('modal-subject-toggles');
     modalContainer.innerHTML = '';
     const subjects = [...new Set(masterBank.map(q => q.subject).filter(Boolean))];
     
     subjects.forEach(sub => {
         const btn = document.createElement('button');
         btn.className = 'sub-toggle-btn' + (globalActiveSubjects.includes(sub) ? ' active' : '');
         btn.innerText = sub;
         btn.onclick = () => {
             toggleGlobalSubject(sub, btn);
             renderSectionalDistribution(); 
         };
         modalContainer.appendChild(btn);
     });

     // Populate Calc Tab Subjects
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
         if (globalCalcSubjects.length === 1) { alert("You must keep at least one Calc Topic active!"); return; }
         globalCalcSubjects.splice(idx, 1);
         btn.classList.remove('active');
     } else {
         globalCalcSubjects.push(sub);
         btn.classList.add('active');
     }
     localStorage.setItem('vu_calc_subjects', JSON.stringify(globalCalcSubjects));
 }

 function setSplitMode(mode) {
     userMockSplitMode = mode;
     if(mode === 'auto') {
         document.getElementById('btn-auto-split').style.background = 'var(--cbt-blue)';
         document.getElementById('btn-auto-split').style.color = 'white';
         document.getElementById('btn-custom-split').style.background = '#eee';
         document.getElementById('btn-custom-split').style.color = '#555';
         syncFromGlobal(); 
     } else {
         document.getElementById('btn-custom-split').style.background = 'var(--cbt-blue)';
         document.getElementById('btn-custom-split').style.color = 'white';
         document.getElementById('btn-auto-split').style.background = '#eee';
         document.getElementById('btn-auto-split').style.color = '#555';
         renderSectionalDistribution();
     }
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
     let totalTime = 0;
     let totalQs = 0;
     globalActiveSubjects.forEach(sub => {
         let timeInput = document.getElementById(`sec-time-${sub}`);
         let qsInput = document.getElementById(`sec-qs-${sub}`);
         if(timeInput) totalTime += parseInt(timeInput.value) || 0;
         if(qsInput) totalQs += parseInt(qsInput.value) || 0;
         userMockSecData[sub] = {
             time: timeInput ? parseInt(timeInput.value) || 0 : 0,
             qs: qsInput ? parseInt(qsInput.value) || 0 : 0
         };
     });
     if (userMockSplitMode === 'custom') { document.getElementById('set-mock-global-time').value = totalTime; }
     document.getElementById('set-mock-global-qs').value = totalQs;
 }

 function renderSectionalDistribution() {
     let container = document.getElementById('sectional-distribution-container');
     container.innerHTML = '';
     if (globalActiveSubjects.length === 0) {
         container.innerHTML = '<div style="text-align:center; padding:10px; color:#888;">No active subjects selected.</div>';
         return;
     }
     globalActiveSubjects.forEach(sub => {
         if(!userMockSecData[sub]) { userMockSecData[sub] = { time: 15, qs: 25 }; }
         let isAuto = userMockSplitMode === 'auto';
         let row = document.createElement('div');
         row.className = 'settings-row';
         row.style.cssText = 'background:#fcfcfc; padding:8px 12px; border-radius:6px; border:1px solid #eee;';
         
         let timeInputHTML = isAuto 
             ? `<input type="number" id="sec-time-${sub}" class="settings-input" value="${userMockSecData[sub].time}" disabled style="background:#e9ecef; color:#888; border-color:#ccc;" title="Auto-Split Mode controls this">` 
             : `<input type="number" id="sec-time-${sub}" class="settings-input" value="${userMockSecData[sub].time}" oninput="syncFromSectional()">`;
         
         row.innerHTML = `
             <div style="font-weight:bold; color:var(--cbt-blue); flex:1;">${sub}</div>
             <div class="aligned-input-grid">
                 ${timeInputHTML}
                 <span style="font-size:0.8rem; color:#888;">Min</span>
                 <input type="number" id="sec-qs-${sub}" class="settings-input" value="${userMockSecData[sub].qs}" oninput="syncFromSectional()">
                 <span style="font-size:0.8rem; color:#888;">Qs</span>
             </div>
         `;
         container.appendChild(row);
     });
 }

 function saveSettings() {
     userSprintTime = parseInt(document.getElementById('set-sprint-time').value) || 15;
     userSprintQs = parseInt(document.getElementById('set-sprint-qs').value) || 25;
     userMockGlobalTime = parseInt(document.getElementById('set-mock-global-time').value) || 60;
     userMockGlobalQs = parseInt(document.getElementById('set-mock-global-qs').value) || 100;
     syncFromSectional(); 
     localStorage.setItem('vu_sprint_time', userSprintTime);
     localStorage.setItem('vu_sprint_qs', userSprintQs);
     localStorage.setItem('vu_mock_global_time', userMockGlobalTime);
     localStorage.setItem('vu_mock_global_qs', userMockGlobalQs);
     localStorage.setItem('vu_mock_split_mode', userMockSplitMode);
     localStorage.setItem('vu_mock_sec_data', JSON.stringify(userMockSecData));
     updateDashboardDropdowns();
     closeSettings();
 }

 // ☁️ GITHUB VAULT SYNC LOGIC
 const GITHUB_SYNC_FILE = 'user_sync.json';
 const GITHUB_API_BASE = 'https://api.github.com/repos/the-vu-bot/exam-engine-vu/contents/';

 async function pushToCloud() {
     let token = localStorage.getItem(STORAGE_GITHUB_TOKEN);
     if (!token) {
         token = prompt("Enter your GitHub PAT for Vault Sync:");
         if (!token) return;
         localStorage.setItem(STORAGE_GITHUB_TOKEN, token);
     }
     const payload = {
         seen: JSON.parse(localStorage.getItem(STORAGE_SEEN) || '[]'),
         wrongMap: JSON.parse(localStorage.getItem(STORAGE_WRONG) || '{}'),
         images: JSON.parse(localStorage.getItem(STORAGE_IMAGES) || '{}'),
         timeMap: JSON.parse(localStorage.getItem(STORAGE_TIME) || '{}'),
         settings: {
             subjects: globalActiveSubjects,
             calcSubjects: globalCalcSubjects,
             sprintTime: userSprintTime,
             sprintQs: userSprintQs,
             mockGlobalTime: userMockGlobalTime,
             mockGlobalQs: userMockGlobalQs,
             mockSplitMode: userMockSplitMode,
             mockSecData: userMockSecData
         }
     };
     const btn = document.getElementById('cloud-push-btn');
     const origText = btn.innerHTML;
     btn.innerHTML = "Syncing... ⏳";
     try {
         const apiUrl = GITHUB_API_BASE + GITHUB_SYNC_FILE;
         let sha = null;
         const checkRes = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
         if (checkRes.ok) { const existingFileData = await checkRes.json(); sha = existingFileData.sha; }
         const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2)))); 
         const response = await fetch(apiUrl, {
             method: 'PUT',
             headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
             body: JSON.stringify({ message: `Vault Sync: ${new Date().toISOString()}`, content: contentBase64, sha: sha })
         });
         if (response.ok) { btn.innerHTML = "✅ Synced to GitHub!"; setTimeout(() => btn.innerHTML = origText, 3000); } 
         else { alert("GitHub Sync Failed. Check token permissions."); btn.innerHTML = origText; }
     } catch (e) { console.error(e); alert("Network Error."); btn.innerHTML = origText; }
 }

 async function pullFromCloud() {
     let token = localStorage.getItem(STORAGE_GITHUB_TOKEN);
     if (!token) {
         token = prompt("Enter your GitHub PAT for Vault Sync:");
         if (!token) return;
         localStorage.setItem(STORAGE_GITHUB_TOKEN, token);
     }
     const btn = document.getElementById('cloud-pull-btn');
     const origText = btn.innerHTML;
     btn.innerHTML = "Pulling... ⏳";
     try {
         const apiUrl = GITHUB_API_BASE + GITHUB_SYNC_FILE;
         const response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
         if (response.ok) {
             const fileData = await response.json();
             const jsonString = decodeURIComponent(escape(atob(fileData.content)));
             const data = JSON.parse(jsonString);

             if (data.seen) localStorage.setItem(STORAGE_SEEN, JSON.stringify(data.seen));
             if (data.wrongMap) localStorage.setItem(STORAGE_WRONG, JSON.stringify(data.wrongMap));
             if (data.images) localStorage.setItem(STORAGE_IMAGES, JSON.stringify(data.images));
             if (data.timeMap) {
                 let localTimeMap = JSON.parse(localStorage.getItem(STORAGE_TIME) || '{}');
                 for(let uid in data.timeMap) { localTimeMap[uid] = Math.max(localTimeMap[uid] || 0, data.timeMap[uid]); }
                 localStorage.setItem(STORAGE_TIME, JSON.stringify(localTimeMap));
             }
             if (data.settings) {
                 if (data.settings.subjects) { globalActiveSubjects = data.settings.subjects; localStorage.setItem('vu_global_subjects', JSON.stringify(globalActiveSubjects)); }
                 if (data.settings.calcSubjects) { globalCalcSubjects = data.settings.calcSubjects; localStorage.setItem('vu_calc_subjects', JSON.stringify(globalCalcSubjects)); }
                 if (data.settings.sprintTime !== undefined) { userSprintTime = data.settings.sprintTime; localStorage.setItem('vu_sprint_time', userSprintTime); }
                 if (data.settings.sprintQs !== undefined) { userSprintQs = data.settings.sprintQs; localStorage.setItem('vu_sprint_qs', userSprintQs); }
                 if (data.settings.mockGlobalTime !== undefined) { userMockGlobalTime = data.settings.mockGlobalTime; localStorage.setItem('vu_mock_global_time', userMockGlobalTime); }
                 if (data.settings.mockGlobalQs !== undefined) { userMockGlobalQs = data.settings.mockGlobalQs; localStorage.setItem('vu_mock_global_qs', userMockGlobalQs); }
                 if (data.settings.mockSplitMode) { userMockSplitMode = data.settings.mockSplitMode; localStorage.setItem('vu_mock_split_mode', userMockSplitMode); }
                 if (data.settings.mockSecData) { userMockSecData = data.settings.mockSecData; localStorage.setItem('vu_mock_sec_data', JSON.stringify(userMockSecData)); }
                 updateDashboardDropdowns();
                 if(document.getElementById('settings-overlay').style.display === 'flex') openSettings(); 
             }
             btn.innerHTML = "✅ Vault Restored!"; setTimeout(() => btn.innerHTML = origText, 3000);
         } else { alert("Failed to pull GitHub backup."); btn.innerHTML = origText; }
     } catch (e) { console.error(e); alert("Network Error during Pull."); btn.innerHTML = origText; }
 }

 // 📷 DIRECT GITHUB IMAGE UPLOAD
 async function fetchPrivateImage(url, imgId) {
     let token = localStorage.getItem(STORAGE_GITHUB_TOKEN);
     let imgEl = document.getElementById(imgId);
     let wrapper = document.getElementById(`${imgId}-wrapper`);
     if (!imgEl) return;

     if (!url.includes('githubusercontent')) {
         imgEl.src = url;
         if(wrapper) wrapper.style.display = 'none';
         imgEl.style.display = 'block';
         return;
     }

     let apiUrl = url;
     if (url.includes('raw.githubusercontent.com')) {
         apiUrl = url.replace('raw.githubusercontent.com/the-vu-bot/exam-engine-vu/main/', 'api.github.com/repos/the-vu-bot/exam-engine-vu/contents/');
     }
     try {
         let response = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' } });
         if (response.ok) {
             let data = await response.json();
             imgEl.src = 'data:image/jpeg;base64,' + data.content.replace(/\n/g, '');
             if(wrapper) wrapper.style.display = 'none';
             imgEl.style.display = 'block';
         }
     } catch (e) {}
 }

 async function handleImageUpload(uid) {
     let token = localStorage.getItem(STORAGE_GITHUB_TOKEN);
     if (!token) {
         token = prompt("Enter your GitHub PAT:");
         if (!token) return;
         localStorage.setItem(STORAGE_GITHUB_TOKEN, token);
     }
     const input = document.createElement('input');
     input.type = 'file';
     input.accept = 'image/*';
     input.onchange = async (e) => {
         const file = e.target.files[0];
         if (!file) return;
         let btn = document.getElementById(`cam-btn`) || document.getElementById(`slider-cam-btn`); 
         const origText = btn ? btn.innerHTML : "📷";
         if(btn) btn.innerHTML = "⏳";
         const reader = new FileReader();
         reader.onload = async (ev) => {
             const base64String = ev.target.result.split(',')[1];
             const filename = `solutions/${uid}.jpg`; 
             const apiUrl = `https://api.github.com/repos/the-vu-bot/exam-engine-vu/contents/${filename}`;
             try {
                 let sha = null;
                 const checkRes = await fetch(apiUrl, { headers: { 'Authorization': `Bearer ${token}` } });
                 if (checkRes.ok) {
                     const existingFileData = await checkRes.json();
                     sha = existingFileData.sha;
                 }
                 const response = await fetch(apiUrl, {
                     method: 'PUT',
                     headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                     body: JSON.stringify({ message: `Update solution image for ${uid}`, content: base64String, sha: sha })
                 });
                 if (response.ok) {
                     const imgUrl = `https://raw.githubusercontent.com/the-vu-bot/exam-engine-vu/main/${filename}?v=${Date.now()}`;
                     let imageSolutions = JSON.parse(localStorage.getItem(STORAGE_IMAGES) || '{}');
                     imageSolutions[uid] = imgUrl;
                     localStorage.setItem(STORAGE_IMAGES, JSON.stringify(imageSolutions));
                     pushToCloud();
                     if (currentMode === 'revision') openSlider(uid); else loadQuestion(currentQ);
                 }
             } catch (err) {}
             if(btn) btn.innerHTML = origText;
         };
         reader.readAsDataURL(file);
     };
     input.click();
 }

 // AUTHENTICATION
 async function checkAuth() {
     const savedKey = localStorage.getItem('vu_unlocked_key');
     if(savedKey) {
         try {
             const response = await fetch(savedKey + '.json?t=' + new Date().getTime());
             if(response.ok) {
                 try { masterBank = await response.json(); } catch(e) { alert("⚠️ FORMAT ERROR"); return; }
                 setupDashboard();
                 if(!restoreSession()) {
                     document.getElementById('lock-screen').style.display = 'none';
                     document.getElementById('home-screen').style.display = 'flex';
                 }
                 return;
             }
         } catch(e) {}
     }
     document.getElementById('lock-screen').style.display = 'flex';
     document.getElementById('home-screen').style.display = 'none';
 }

 async function verifyPin() {
     const input = document.getElementById('pin-input').value.trim();
     if(!input) return;
     const btn = document.getElementById('unlock-btn');
     btn.innerText = "Verifying...";
     try {
         const response = await fetch(input + '.json?t=' + new Date().getTime());
         if (!response.ok) { alert("❌ File not found!"); btn.innerText = "Unlock Engine"; return; }
         masterBank = await response.json();
         localStorage.setItem('vu_unlocked_key', input);
         setupDashboard();
         if(!restoreSession()) {
             document.getElementById('lock-screen').style.display = 'none';
             document.getElementById('home-screen').style.display = 'flex';
         }
     } catch (e) { alert("Network error."); }
     btn.innerText = "Unlock Engine";
 }

 function lockEngine() {
     localStorage.removeItem('vu_unlocked_key');
     localStorage.removeItem(STORAGE_SESSION);
     location.reload();
 }

 document.getElementById("pin-input").addEventListener("keypress", (e) => { if (e.key === "Enter") verifyPin(); });

 // DASHBOARD SETUP
 function setupDashboard() {
     document.getElementById('db-stats').innerText = `${masterBank.length} VU Patterns Loaded`;
     const subjects = [...new Set(masterBank.map(q => q.subject).filter(Boolean))];
     if (globalActiveSubjects.length === 0) {
         globalActiveSubjects = [...subjects];
         localStorage.setItem('vu_global_subjects', JSON.stringify(globalActiveSubjects));
     }
     updateDashboardDropdowns();
     fetchPrivateImage(`https://raw.githubusercontent.com/the-vu-bot/exam-engine-vu/main/solutions/VU-logo.jpg?v=${Date.now()}`, 'home-logo');
 }

 function toggleGlobalSubject(sub, btn) {
     const idx = globalActiveSubjects.indexOf(sub);
     if (idx > -1) {
         if (globalActiveSubjects.length === 1) { alert("You must keep at least one subject active for the engine to run!"); return; }
         globalActiveSubjects.splice(idx, 1);
         btn.classList.remove('active');
     } else {
         globalActiveSubjects.push(sub);
         btn.classList.add('active');
     }
     localStorage.setItem('vu_global_subjects', JSON.stringify(globalActiveSubjects));
     saveTestState();
     updateDashboardDropdowns();
 }

 function updateDashboardDropdowns() {
     let optionsHtml = `<option value="all">Mixed (Active Subjects)</option>`;
     globalActiveSubjects.forEach(sub => { optionsHtml += `<option value="${sub}">${sub}</option>`; });
     document.getElementById('sprint-subject').innerHTML = optionsHtml;
     document.getElementById('practice-subject').innerHTML = optionsHtml;
 }

 async function startCalculationMode() {
     const currentKey = localStorage.getItem('vu_unlocked_key');
     const btn = document.getElementById('calc-btn');
     btn.innerText = "Loading...";
     try {
         const response = await fetch(currentKey + '_calc.json?t=' + new Date().getTime());
         if (response.ok) {
             masterBank = await response.json(); 
             startExam('practice', 'calc_drill', true); 
         } else { alert("❌ Calculation file not found."); }
     } catch (e) { alert("Error connecting."); }
     btn.innerText = "Start Drills";
 }

 function editJsonOnGithub() {
     const currentKey = localStorage.getItem('vu_unlocked_key');
     const suffix = isCalcDrill ? '_calc.json' : '.json';
     window.open(`https://github.com/the-vu-bot/exam-engine-vu/edit/main/${currentKey}${suffix}`, '_blank');
 }

 // PERSISTENCE
 function saveTestState() {
     if (document.getElementById('rev-subj-filter')) {
         revSubjectState = document.getElementById('rev-subj-filter').value;
         revTopicState = document.getElementById('rev-topic-filter').value;
     }

     const session = {
         questions, state, currentQ, totalSeconds, sectionalSeconds, 
         activeSectionIndex, examType, defaultLang, currentLang, 
         mockBoundaries, timeSpentGlobal, currentMode, forcedEn, isCalcDrill,
         revFilters, revCurrentPage, revSubjectState, revTopicState, globalActiveSubjects
     };
     localStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
 }

 function restoreSession() {
     const sessionStr = localStorage.getItem(STORAGE_SESSION);
     if(sessionStr) {
         const s = JSON.parse(sessionStr);
         questions = s.questions; state = s.state; currentQ = s.currentQ; totalSeconds = s.totalSeconds; 
         sectionalSeconds = s.sectionalSeconds; activeSectionIndex = s.activeSectionIndex; 
         examType = s.examType; defaultLang = s.defaultLang; currentLang = s.currentLang; 
         mockBoundaries = s.mockBoundaries; timeSpentGlobal = s.timeSpentGlobal; currentMode = s.currentMode;
         forcedEn = s.forcedEn || false; isCalcDrill = s.isCalcDrill || false; 
         if(s.globalActiveSubjects && s.globalActiveSubjects.length > 0) globalActiveSubjects = s.globalActiveSubjects;
         
         if (currentMode === 'home') return false; 

         document.getElementById('lock-screen').style.display = 'none';
         document.getElementById('home-screen').style.display = 'none';
         fetchPrivateImage(`https://raw.githubusercontent.com/the-vu-bot/exam-engine-vu/main/solutions/VU-logo.jpg`, 'home-logo');
         
         if (currentMode === 'revision') {
             let optionsHtml = `<option value="all">Active Subjects</option>`;
             globalActiveSubjects.forEach(sub => { optionsHtml += `<option value="${sub}">${sub}</option>`; });
             document.getElementById('rev-subj-filter').innerHTML = optionsHtml;
             
             document.getElementById('rev-subj-filter').value = revSubjectState;
             updateTopicDropdown();
             document.getElementById('rev-topic-filter').value = revTopicState;
             
             document.getElementById('exam-screen') && (document.getElementById('exam-screen').style.display = 'none');
             document.getElementById('cbt-screen').style.display = 'none';
             document.getElementById('analysis-screen').style.display = 'none';
             document.getElementById('revision-screen').style.display = 'flex';
             renderRevisionFeed();
             return true; 
         }
         
         if (examType === 'mock') document.getElementById('cbt-title').innerHTML = `Full Mock <span style="font-size:0.8rem; color:#888;">(VU)</span>`;
         else document.getElementById('cbt-title').innerHTML = `${examType === 'sprint' ? "Sprint" : "Practice"} <span style="font-size:0.8rem; color:#888;">(VU)</span>`;

         if (currentMode === 'analysis') {
             renderAnalyticsDisplay(); showDashboard(); return true;
         }

         document.getElementById('cbt-screen').style.display = 'flex';
         document.getElementById('default-lang-select').value = defaultLang;
         document.getElementById('lang-select').value = currentLang;

         if(examType === 'mock') document.getElementById('sectional-timer-wrapper').style.display = 'flex';
         else document.getElementById('sectional-timer-wrapper').style.display = 'none';
         
         buildPalette();

         if (currentMode === 'review') {
             document.getElementById('header-timer-area').style.display = 'none';
             document.getElementById('action-bar-test').style.display = 'none';
             document.getElementById('action-bar-review').style.display = 'flex';
             document.getElementById('review-filter-bar').style.display = 'flex';
             document.getElementById('mobile-submit-btn').classList.add('hide-for-review');
             setupReviewFilters(); // Re-init filters
         } else {
             document.getElementById('review-filter-bar').style.display = 'none';
             document.getElementById('mobile-submit-btn').classList.remove('hide-for-review');
             loadQuestion(currentQ); pauseTest(); 
         }
         return true;
     }
     return false;
 }

 // ==========================================
 // EXAM LOGIC & SHUFFLE
 // ==========================================
 function shuffleOptionsForQuestions(qs) {
     return qs.map(q => {
         let qCopy = JSON.parse(JSON.stringify(q));
         let defaultEng = qCopy.options_en || [];
         let optionsHi = qCopy.options_hi || defaultEng;
         if(!optionsHi || optionsHi.length < 4) optionsHi = defaultEng;
         if(!defaultEng || defaultEng.length < 4) return qCopy; 
         let indices = [0, 1, 2, 3];
         for (let i = indices.length - 1; i > 0; i--) {
             const j = Math.floor(Math.random() * (i + 1));
             [indices[i], indices[j]] = [indices[j], indices[i]];
         }
         qCopy.options_en = indices.map(i => defaultEng[i]);
         qCopy.options_hi = indices.map(i => optionsHi[i]);
         qCopy.correct = indices.indexOf(qCopy.correct);
         return qCopy;
     });
 }

 function getSmartSelection(source, count) {
     let seen = [], wrongMap = {};
     try { seen = JSON.parse(localStorage.getItem(STORAGE_SEEN) || '[]'); wrongMap = JSON.parse(localStorage.getItem(STORAGE_WRONG) || '{}'); } catch(e) {}
     let weighted = source.map(q => ({ ...q, weight: (wrongMap[q.uid] || 0) + (seen.includes(q.uid) ? 0 : 5) }));
     weighted.sort((a, b) => b.weight - a.weight + (Math.random() - 0.5) * 2);
     return weighted.slice(0, count);
 }

 function goHomeAlert() {
     closeSlider(); // Fix home redirect slider bug
     if(currentMode === 'test' || currentMode === 'practice') {
         if(confirm("Exit to Dashboard? Your progress will be permanently lost.")) {
             currentMode = 'home'; localStorage.removeItem(STORAGE_SESSION); location.reload();
         }
     } else { currentMode = 'home'; localStorage.removeItem(STORAGE_SESSION); location.reload(); }
 }

 function formatTime(secs) {
     let m = Math.floor(secs / 60).toString().padStart(2, '0');
     let s = (secs % 60).toString().padStart(2, '0');
     return `${m}:${s}`;
 }

 function pauseTest() { isPaused = true; clearInterval(timerId); document.getElementById('pause-overlay').style.display = 'flex'; saveTestState(); }
 function resumeTest() { isPaused = false; document.getElementById('pause-overlay').style.display = 'none'; startTestTimer(); }

 function startTestTimer() {
     clearInterval(timerId);
     timerId = setInterval(() => {
         if(isPaused) return; 
         timeSpentGlobal++;
         if(currentMode === 'test' || currentMode === 'practice') state[currentQ].timeTaken++;

         if (examType === 'mock' && currentMode === 'test') {
             totalSeconds--; sectionalSeconds--;
             document.getElementById('timer').innerText = formatTime(totalSeconds);
             document.getElementById('sec-timer').innerText = formatTime(sectionalSeconds);
             
             if (sectionalSeconds <= 0) {
                 activeSectionIndex++;
                 if (activeSectionIndex < mockBoundaries.length) {
                     sectionalSeconds = mockBoundaries[activeSectionIndex].allocatedTime; 
                     loadQuestion(mockBoundaries[activeSectionIndex].start); buildPalette();
                 } else { submitExam(); }
             }
         } else if (examType === 'sprint' && currentMode === 'test') {
             totalSeconds--; document.getElementById('timer').innerText = formatTime(totalSeconds);
             if(totalSeconds <= 0) submitExam();
         } else if(currentMode === 'practice') {
             document.getElementById('global-timer-label').innerText = 'Stopwatch';
             document.getElementById('timer').innerText = formatTime(timeSpentGlobal);
         }
         if(timeSpentGlobal % 5 === 0) saveTestState();
     }, 1000);
 }

 function startExam(type, subject, isCalcFlag = false) {
     localStorage.removeItem(STORAGE_SESSION); 
     document.getElementById('mobile-submit-btn').classList.remove('hide-for-review');
     document.getElementById('review-filter-bar').style.display = 'none'; // Hide filters
     defaultLang = document.getElementById('default-lang-select').value;
     currentLang = defaultLang;
     document.getElementById('lang-select').value = currentLang;
     forcedEn = false; isCalcDrill = isCalcFlag; examType = type;
     currentMode = type === 'practice' ? 'practice' : 'test';
     questions = []; mockBoundaries = []; timeSpentGlobal = 0; isPaused = false; 
     
     if (type === 'mock') {
         globalActiveSubjects.forEach(secName => {
             let limitQs = userMockSecData[secName] ? userMockSecData[secName].qs : 25;
             let limitTime = userMockSecData[secName] ? userMockSecData[secName].time : 15;
             let secQs = masterBank.filter(q => q.subject === secName);
             secQs = getSmartSelection(secQs, limitQs);
             secQs = shuffleOptionsForQuestions(secQs);
             if(secQs.length > 0) {
                 let startIndex = questions.length;
                 questions = questions.concat(secQs);
                 mockBoundaries.push({ name: secName, start: startIndex, end: questions.length - 1, allocatedTime: limitTime * 60 });
             }
         });
         if(questions.length === 0) { alert("Add questions to JSON first or select active subjects!"); return; }
         activeSectionIndex = 0;
         sectionalSeconds = mockBoundaries.length > 0 ? mockBoundaries[0].allocatedTime : 0; 
         totalSeconds = mockBoundaries.reduce((sum, b) => sum + b.allocatedTime, 0); 
         document.getElementById('cbt-title').innerHTML = `Full Mock <span style="font-size:0.8rem; color:#888;">(VU)</span>`;
         document.getElementById('sectional-timer-wrapper').style.display = 'flex';
     } else {
         let filtered = [];
         if (isCalcDrill) { 
             filtered = masterBank.filter(q => globalCalcSubjects.includes(q.subject)); 
         } 
         else {
             if (subject !== 'all') filtered = masterBank.filter(q => q.subject === subject && globalActiveSubjects.includes(q.subject));
             else filtered = masterBank.filter(q => globalActiveSubjects.includes(q.subject));
         }
         questions = type === 'sprint' ? getSmartSelection(filtered, userSprintQs) : getSmartSelection(filtered, 50);
         questions = shuffleOptionsForQuestions(questions);
         if(questions.length === 0) { alert("No questions found for this category!"); return; }
         activeSectionIndex = 0; 
         mockBoundaries = [{ name: isCalcDrill ? 'CALCULATION' : (subject === 'all' ? 'MIXED' : subject), start: 0, end: questions.length - 1 }];
         totalSeconds = type === 'sprint' ? userSprintTime * 60 : 0; 
         document.getElementById('cbt-title').innerHTML = `${type === 'sprint' ? "Sprint" : "Practice"} <span style="font-size:0.8rem; color:#888;">(VU)</span>`;
         document.getElementById('sectional-timer-wrapper').style.display = 'none';
     }

     state = questions.map(() => ({ selected: null, status: 'unvisited', timeTaken: 0 }));
     document.getElementById('home-screen').style.display = 'none';
     document.getElementById('cbt-screen').style.display = 'flex';
     buildPalette(); loadQuestion(0); startTestTimer(); saveTestState();
 }

 // PALETTE UI
 function toggleMobilePalette() {
     const panel = document.getElementById('right-panel-id');
     panel.classList.toggle('open');
     const toggleText = document.getElementById('palette-toggle-text');
     if(panel.classList.contains('open')) toggleText.innerText = "▼ Hide Question Palette";
     else toggleText.innerText = "▲ Show Question Palette";
 }

 function buildPalette() {
     const wrapper = document.getElementById('palette-wrapper');
     wrapper.innerHTML = '';
     if (!mockBoundaries || mockBoundaries.length === 0) mockBoundaries = [{ name: 'ALL', start: 0, end: questions.length - 1 }];

     mockBoundaries.forEach((sec, bIndex) => {
         const titleDiv = document.createElement('div');
         titleDiv.className = 'palette-section-title';
         let lockStatus = '';
         if(examType === 'mock' && currentMode === 'test') {
             if (bIndex < activeSectionIndex) lockStatus = ' <span style="color:#888;">(Done)</span>';
             else if (bIndex > activeSectionIndex) lockStatus = ' <span style="color:#d9534f;">(Locked)</span>';
             else lockStatus = ' <span style="color:var(--cbt-green);">(Active)</span>';
         }
         titleDiv.innerHTML = `<span>${sec.name.toUpperCase()}</span> ${lockStatus}`;
         wrapper.appendChild(titleDiv);
         
         const gridDiv = document.createElement('div');
         gridDiv.className = 'palette-grid';
         wrapper.appendChild(gridDiv);

         for(let i = sec.start; i <= sec.end; i++) {
             const btn = document.createElement('button');
             btn.className = 'pal-btn'; btn.id = `pal-${i}`; btn.innerText = i + 1;
             btn.onclick = () => {
                 if (examType === 'mock' && currentMode === 'test' && bIndex !== activeSectionIndex) return; 
                 if (currentMode === 'review' && reviewFilteredIndices.length > 0 && !reviewFilteredIndices.includes(i)) return; // Phase 3 protection
                 loadQuestion(i);
             };
             gridDiv.appendChild(btn);
         }
     });
     updatePaletteUI();
 }

 function toggleLanguage() { currentLang = document.getElementById('lang-select').value; forcedEn = false; loadQuestion(currentQ); saveTestState(); }
 function copyUID(uid, btnElement) {
     navigator.clipboard.writeText(uid).then(() => {
         const originalText = btnElement.innerHTML; btnElement.innerHTML = "✅ Copied!";
         btnElement.style.cssText = "background-color: #e8f5e9; border-color: var(--cbt-green); color: var(--cbt-green);";
         setTimeout(() => {
             btnElement.innerHTML = originalText;
             btnElement.style.cssText = "background-color: #fff; border-color: var(--cbt-blue); color: var(--cbt-blue);";
         }, 2000);
     }).catch(err => {});
 }

 function loadQuestion(index) {
     if (examType === 'mock' && currentMode === 'test') {
         let currentBounds = mockBoundaries[activeSectionIndex];
         if (index < currentBounds.start || index > currentBounds.end) return; 
     }
     currentQ = index;
     const q = questions[currentQ];

     if (window.innerWidth <= 768) {
         const panel = document.getElementById('right-panel-id');
         if(panel && panel.classList.contains('open')) toggleMobilePalette();
     }

     if((currentMode === 'test' || currentMode === 'practice') && state[currentQ].status === 'unvisited') {
         state[currentQ].status = 'not-answered';
     }

     document.getElementById('q-num-display').innerText = currentQ + 1;
     
     const isEnglishSubject = q.subject && q.subject.toLowerCase() === 'english';
     if(isEnglishSubject) {
         document.getElementById('lang-toggle-container').style.display = 'none';
         if(currentLang !== 'en') { currentLang = 'en'; forcedEn = true; }
     } else {
         document.getElementById('lang-toggle-container').style.display = 'flex';
         if(forcedEn) { currentLang = defaultLang; forcedEn = false; }
         document.getElementById('lang-select').value = currentLang;
     }

     let warningHtml = '';
     if(!isEnglishSubject && currentLang !== defaultLang && currentMode !== 'review') {
         warningHtml = `<div style="color:var(--cbt-red); font-size:0.85rem; margin-bottom:10px; font-weight:normal; background: #ffeeee; padding: 5px 10px; border-radius: 4px; border: 1px solid #ffcccc;">⚠ Viewing in ${currentLang === 'hi' ? 'Hindi' : 'English'}. Switch back to your default language to mark answers.</div>`;
     }

     let qTextHtml = `<div style="color:var(--cbt-blue); font-size:0.85rem; margin-bottom:10px;">[${q.subject || 'General'}]</div>`;
     document.getElementById('q-text').innerHTML = qTextHtml + warningHtml + (currentLang === 'hi' ? (q.q_hi || q.q_en) : q.q_en);
     
     const badgeContainer = document.getElementById('q-status-badge');
     if(currentMode === 'review') {
         const isCorrect = state[currentQ].selected === q.correct;
         const isAtt = state[currentQ].selected !== null;
         let bHtml = !isAtt ? `<span class="badge" style="background:#888;">Skipped</span>` : (isCorrect ? `<span class="badge" style="background:var(--cbt-green);">Correct</span>` : `<span class="badge" style="background:var(--cbt-red);">Incorrect</span>`);
         bHtml += `<span class="badge" style="background:#555; margin-left:5px;">⏱ ${formatTime(state[currentQ].timeTaken)}</span>`;
         badgeContainer.innerHTML = bHtml;
     } else badgeContainer.innerHTML = '';
     
     const optsContainer = document.getElementById('options-container');
     optsContainer.innerHTML = '';
     
     const opts = currentLang === 'hi' ? (q.options_hi || q.options_en) : q.options_en;
     opts.forEach((opt, i) => {
         const row = document.createElement('div'); 
         row.className = 'option-row';
         
         if(currentMode === 'review') {
             if(i === q.correct) row.classList.add('opt-correct');
             else if (state[currentQ].selected === i) row.classList.add('opt-incorrect');
         } else if(state[currentQ].selected === i) { row.style.borderColor = 'var(--cbt-blue)'; }

         const square = document.createElement('div');
         square.className = 'radio-square';
         const radio = document.createElement('input'); 
         radio.type = 'radio'; radio.name = 'opt'; radio.value = i;
         if(state[currentQ].selected === i) radio.checked = true;
         
         const canEdit = isEnglishSubject || (currentLang === defaultLang);
         if(currentMode === 'review' || !canEdit) { radio.disabled = true; }

         row.onclick = () => {
             if(currentMode === 'review' || !canEdit) return;
             if(state[currentQ].selected === i) {
                 state[currentQ].selected = null; state[currentQ].status = 'not-answered';
             } else {
                 state[currentQ].selected = i; state[currentQ].status = 'answered';
             }
             loadQuestion(currentQ); updatePaletteUI();
         };
         
         square.appendChild(radio);
         const textDiv = document.createElement('div');
         textDiv.className = 'option-text'; textDiv.appendChild(document.createTextNode(opt));
         row.appendChild(square); row.appendChild(textDiv);
         optsContainer.appendChild(row);
     });

     const solContainer = document.getElementById('solution-container');
     if(currentMode === 'review') {
         solContainer.style.display = 'block';
         let imageSolutions = JSON.parse(localStorage.getItem(STORAGE_IMAGES) || '{}');
         let customImgHtml = '';
         if (imageSolutions[q.uid]) {
             let imgId = `sol-img-${q.uid}`;
             customImgHtml = `
                 <div id="${imgId}-wrapper" style="width:100%; min-height:100px; background:#f4f8fb; border: 1px dashed var(--cbt-blue); border-radius:8px; margin-bottom:15px; display:flex; align-items:center; justify-content:center; color:var(--cbt-blue); font-size:0.9rem; font-weight:bold;">
                     Decrypting Private Image... ⏳
                 </div>
                 <img id="${imgId}" style="width:100%; border-radius:8px; margin-bottom:15px; border: 1px solid var(--border); display:none;">
             `;
             setTimeout(() => fetchPrivateImage(imageSolutions[q.uid], imgId), 50);
         }

         solContainer.innerHTML = `
             <div class="solution-box" style="position:relative; padding-top:35px;">
                 <button id="cam-btn" onclick="handleImageUpload('${q.uid}')" title="Upload Photo to GitHub" style="position:absolute; top:10px; right:10px; background:white; border:1px solid #ccc; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:1.1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">📷</button>
                 <div style="font-weight:bold; color:var(--cbt-blue); margin-bottom:15px;">Solution & Analysis</div>
                 ${customImgHtml}
                 <strong>VU Logic:</strong> ${q.logic || 'No text logic provided.'}<br><br>
                 <strong>Trap Alert:</strong> ${q.trap || 'None.'}<br>
                 <button class="uid-tag" onclick="copyUID('${q.uid}', this)" title="Click to Copy">📋 Copy UID: ${q.uid}</button>
             </div>`;
     } else { solContainer.style.display = 'none'; }
     
     updatePaletteUI();
     saveTestState();
 }

 function saveAndNext() { state[currentQ].status = state[currentQ].selected !== null ? 'answered' : 'not-answered'; loadNext(); }
 function markForReview() { state[currentQ].status = 'review'; loadNext(); }
 
 function loadNext() { 
     if (currentMode === 'review' && reviewFilteredIndices.length > 0) {
         let idx = reviewFilteredIndices.indexOf(currentQ);
         if (idx !== -1 && idx < reviewFilteredIndices.length - 1) {
             loadQuestion(reviewFilteredIndices[idx + 1]);
         }
         return;
     }
     let targetQ = currentQ + 1;
     if (examType === 'mock' && currentMode === 'test') {
         if(targetQ > mockBoundaries[activeSectionIndex].end) { updatePaletteUI(); return; }
     } else if (targetQ >= questions.length) { updatePaletteUI(); return; }
     loadQuestion(targetQ); 
 }

 function loadPrevious() { 
     if (currentMode === 'review' && reviewFilteredIndices.length > 0) {
         let idx = reviewFilteredIndices.indexOf(currentQ);
         if (idx > 0) {
             loadQuestion(reviewFilteredIndices[idx - 1]);
         }
         return;
     }
     let targetQ = currentQ - 1;
     if (examType === 'mock' && currentMode === 'test') {
         if(targetQ < mockBoundaries[activeSectionIndex].start) return; 
     } else if (targetQ < 0) return;
     loadQuestion(targetQ); 
 }

 // --- PHASE 3: LOCAL SESSION FILTERS FOR REVIEW MODE ---
 function setupReviewFilters() {
     activeReviewStatuses = [];
     isReviewSluggish = false;
     
     ['correct', 'wrong', 'skipped', 'sluggish'].forEach(f => {
         let el = document.getElementById(`rev-filt-${f}`);
         if(el) el.classList.remove('active');
     });

     const subjSelect = document.getElementById('review-subj-filter');
     let subs = new Set();
     questions.forEach(q => { if(q.subject) subs.add(q.subject); });
     subjSelect.innerHTML = '<option value="all">All Subjects</option>';
     Array.from(subs).sort().forEach(s => subjSelect.innerHTML += `<option value="${s}">${s}</option>`);
     
     updateReviewTopicDropdown();
     applyReviewFilters();
 }

 function updateReviewTopicDropdown() {
     const subj = document.getElementById('review-subj-filter').value;
     const topicSelect = document.getElementById('review-topic-filter');
     let tops = new Set();
     questions.forEach(q => {
         if ((subj === 'all' || q.subject === subj) && q.topic) tops.add(q.topic);
     });
     topicSelect.innerHTML = '<option value="all">All Topics</option>';
     Array.from(tops).sort().forEach(t => topicSelect.innerHTML += `<option value="${t}">${t}</option>`);
 }

 function toggleReviewStatusFilter(status) {
     let idx = activeReviewStatuses.indexOf(status);
     let el = document.getElementById(`rev-filt-${status}`);
     if(idx > -1) {
         activeReviewStatuses.splice(idx, 1); el.classList.remove('active');
     } else {
         activeReviewStatuses.push(status); el.classList.add('active');
     }
     applyReviewFilters();
 }

 function toggleReviewSort(sortType) {
     isReviewSluggish = !isReviewSluggish;
     let el = document.getElementById(`rev-filt-sluggish`);
     if(isReviewSluggish) el.classList.add('active');
     else el.classList.remove('active');
     applyReviewFilters();
 }

 function applyReviewFilters() {
     const subj = document.getElementById('review-subj-filter').value;
     const topic = document.getElementById('review-topic-filter').value;

     reviewFilteredIndices = [];
     for (let i = 0; i < questions.length; i++) {
         const q = questions[i];
         const s = state[i];
         const sel = s.selected;
         const isCorrect = sel === q.correct;

         let qStatus = 'unvisited';
         if(s.status !== 'unvisited' && sel === null) qStatus = 'skipped';
         else if (sel !== null && isCorrect) qStatus = 'correct';
         else if (sel !== null && !isCorrect) qStatus = 'wrong';

         let passSubj = (subj === 'all' || q.subject === subj);
         let passTopic = (topic === 'all' || q.topic === topic);
         let passStatus = (activeReviewStatuses.length === 0 || activeReviewStatuses.includes(qStatus));

         if (passSubj && passTopic && passStatus) {
             reviewFilteredIndices.push(i);
         }
     }

     if (isReviewSluggish) {
         reviewFilteredIndices.sort((a, b) => state[b].timeTaken - state[a].timeTaken);
     } else {
         reviewFilteredIndices.sort((a, b) => a - b); // Reset to chronological
     }

     updatePaletteUI(); // This will visually hide/dim the buttons

     if (reviewFilteredIndices.length > 0) {
         if (!reviewFilteredIndices.includes(currentQ)) {
             loadQuestion(reviewFilteredIndices[0]);
         } else {
             loadQuestion(currentQ); // Just refresh UI
         }
     } else {
         document.getElementById('q-text').innerHTML = "<div style='text-align:center; color:#888; margin-top:20px; font-size:1.2rem;'>No questions match these filters.</div>";
         document.getElementById('options-container').innerHTML = '';
         document.getElementById('solution-container').style.display = 'none';
         document.getElementById('q-num-display').innerText = '-';
         document.getElementById('q-status-badge').innerHTML = '';
     }
 }

 function updatePaletteUI() {
     let tCounts = { answered: 0, notAnswered: 0, review: 0, unvisited: 0 };
     let rCounts = { correct: 0, wrong: 0, skipped: 0, unvisited: 0 };

     questions.forEach((_, i) => {
         const s = state[i].status;
         const sel = state[i].selected;
         const isCorrect = sel === questions[i].correct;

         if(s === 'answered') tCounts.answered++;
         else if(s === 'not-answered') tCounts.notAnswered++;
         else if(s === 'review') tCounts.review++;
         else tCounts.unvisited++;

         if(s === 'unvisited') rCounts.unvisited++;
         else if(sel === null) rCounts.skipped++;
         else if(isCorrect) rCounts.correct++;
         else rCounts.wrong++;

         const btn = document.getElementById(`pal-${i}`);
         if(!btn) return;
         
         btn.className = 'pal-btn'; 
         
         if(currentMode === 'test' || currentMode === 'practice') {
             let isLocked = false;
             if(examType === 'mock') {
                 let secBounds = mockBoundaries[activeSectionIndex];
                 if (i < secBounds.start || i > secBounds.end) isLocked = true;
             }

             if (isLocked) {
                 btn.classList.add('status-locked');
             } else {
                 if(s === 'answered') btn.classList.add('status-answered');
                 else if(s === 'not-answered') btn.classList.add('status-not-answered');
                 else if(s === 'review') btn.classList.add('status-review');
                 if(i === currentQ) btn.classList.add('status-active');
             }
         } else if (currentMode === 'review') {
             // Phase 3 Filter Dimming
             if (!reviewFilteredIndices.includes(i)) {
                 btn.classList.add('filtered-out');
             } else {
                 if(s === 'unvisited') { /* White */ } 
                 else if(sel === null) btn.classList.add('rev-skipped');
                 else if (isCorrect) btn.classList.add('rev-correct');
                 else btn.classList.add('rev-incorrect');
                 if(i === currentQ) btn.classList.add('status-active');
             }
         }
     });

     if(currentMode === 'review') {
         document.getElementById('legend-test-mode').style.display = 'none';
         document.getElementById('legend-review-mode').style.display = 'grid';
         if(document.getElementById('count-correct')) {
             document.getElementById('count-correct').innerText = rCounts.correct;
             document.getElementById('count-wrong').innerText = rCounts.wrong;
             document.getElementById('count-skipped').innerText = rCounts.skipped;
             document.getElementById('count-rev-unvisited').innerText = rCounts.unvisited;
         }
     } else {
         document.getElementById('legend-review-mode').style.display = 'none';
         document.getElementById('legend-test-mode').style.display = 'grid';
         if(document.getElementById('count-answered')) {
             document.getElementById('count-answered').innerText = tCounts.answered;
             document.getElementById('count-not-answered').innerText = tCounts.notAnswered;
             document.getElementById('count-review').innerText = tCounts.review;
             document.getElementById('count-unvisited').innerText = tCounts.unvisited;
         }
     }
     saveTestState();
 }

 // --- EXAM SUBMISSION & ANALYSIS ---
 function submitExamManually() { if(confirm("Submit test and view analytics?")) submitExam(); }

 function submitExam() {
     clearInterval(timerId); currentMode = 'analysis';
     const seen = JSON.parse(localStorage.getItem(STORAGE_SEEN) || '[]');
     const wrongMap = JSON.parse(localStorage.getItem(STORAGE_WRONG) || '{}');
     const timeMap = JSON.parse(localStorage.getItem(STORAGE_TIME) || '{}');
     
     state.forEach((s, i) => {
         const uid = questions[i].uid;
         if(uid) {
             if(!seen.includes(uid)) seen.push(uid);
             if(s.selected !== null) {
                 if(s.selected === questions[i].correct) { if(wrongMap[uid]) wrongMap[uid]--; } 
                 else { wrongMap[uid] = (wrongMap[uid] || 0) + 1; }
                 
                 if(s.timeTaken > 0) {
                     if(!timeMap[uid]) timeMap[uid] = s.timeTaken;
                     else timeMap[uid] = Math.round((timeMap[uid] + s.timeTaken) / 2);
                 }
             }
         }
     });
     
     localStorage.setItem(STORAGE_SEEN, JSON.stringify(seen.slice(-500))); 
     localStorage.setItem(STORAGE_WRONG, JSON.stringify(wrongMap));
     localStorage.setItem(STORAGE_TIME, JSON.stringify(timeMap));

     renderAnalyticsDisplay(); showDashboard(); saveTestState(); 
 }

 function renderAnalyticsDisplay() {
     document.getElementById('header-timer-area').style.display = 'none';
     let correct = 0, attempted = 0, wrongTotal = 0;
     let subStats = {};

     mockBoundaries.forEach(b => { subStats[b.name] = { total: 0, att: 0, correct: 0, wrong: 0, time: 0 }; });

     state.forEach((s, i) => {
         const sub = questions[i].subject || 'General';
         if(!subStats[sub]) subStats[sub] = { total: 0, att: 0, correct: 0, wrong: 0, time: 0 };
         
         subStats[sub].total++; subStats[sub].time += s.timeTaken;
         
         if(s.selected !== null) {
             attempted++; subStats[sub].att++;
             if(s.selected === questions[i].correct) { correct++; subStats[sub].correct++; } 
             else { wrongTotal++; subStats[sub].wrong++; }
         }
     });

     let finalScore = (correct - (wrongTotal / 3)).toFixed(2);
     let acc = attempted > 0 ? Math.round((correct/attempted)*100) : 0;

     document.getElementById('dash-score').innerText = `${finalScore}`;
     document.getElementById('dash-correct').innerText = correct;
     document.getElementById('dash-wrong').innerText = wrongTotal;
     document.getElementById('dash-acc').innerText = `${acc}%`;
     document.getElementById('dash-att').innerText = `${attempted} / ${questions.length}`;
     document.getElementById('dash-time').innerText = formatTime(timeSpentGlobal);

     let cardsHtml = '';
     let now = new Date();
     let textLog = `VU POWER POSTMORTEM | ${now.toLocaleDateString('en-IN')} ${now.toLocaleTimeString('en-IN')}\n`;
     textLog += `Mode: ${examType.toUpperCase()}\nScore: ${finalScore}/${questions.length} | Acc: ${acc}% | Time: ${formatTime(timeSpentGlobal)}\n`;
     textLog += `Overall: Att: ${attempted} | Right: ${correct} | Wrong: ${wrongTotal}\n-------------------------------------------------\n`;

     for(const [sub, data] of Object.entries(subStats)) {
         if (data.total === 0) continue; 
         let subAcc = data.att > 0 ? Math.round((data.correct/data.att)*100) : 0;
         let skipped = data.total - data.att;

         // 📊 Calculating Graph Widths
         let pCorrect = (data.correct / data.total) * 100;
         let pWrong = (data.wrong / data.total) * 100;
         let pSkipped = (skipped / data.total) * 100;

         cardsHtml += `
             <div class="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/20 rounded-2xl p-5 mb-5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-md">
                 <div class="flex justify-between items-center mb-4">
                     <h4 class="text-lg md:text-xl font-black text-white tracking-widest uppercase drop-shadow-md">${sub}</h4>
                     <span class="text-xs md:text-sm font-bold px-3 py-1 rounded-full bg-fuchsia-900/40 text-fuchsia-300 border border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.15)]">ACC: ${subAcc}%</span>
                 </div>

                 <div class="w-full h-3 md:h-4 bg-[#0b0514] rounded-full overflow-hidden flex mb-6 border border-purple-900/50 shadow-inner">
                     <div style="width: ${pCorrect}%" class="bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] transition-all duration-1000"></div>
                     <div style="width: ${pWrong}%" class="bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)] transition-all duration-1000"></div>
                     <div style="width: ${pSkipped}%" class="bg-purple-900/50 transition-all duration-1000"></div>
                 </div>

                 <div class="grid grid-cols-4 gap-2 md:gap-4 text-center">
                     <div class="bg-purple-950/40 rounded-xl py-3 border border-purple-700/30 shadow-sm">
                         <div class="text-purple-300 text-[9px] md:text-xs uppercase tracking-widest mb-1 font-bold">Total</div>
                         <div class="font-black text-white text-base md:text-lg">${data.total}</div>
                     </div>
                     <div class="bg-emerald-950/30 rounded-xl py-3 border border-emerald-700/30 shadow-sm">
                         <div class="text-emerald-400 text-[9px] md:text-xs uppercase tracking-widest mb-1 font-bold">Right</div>
                         <div class="font-black text-emerald-300 text-base md:text-lg">${data.correct}</div>
                     </div>
                     <div class="bg-rose-950/30 rounded-xl py-3 border border-rose-700/30 shadow-sm">
                         <div class="text-rose-400 text-[9px] md:text-xs uppercase tracking-widest mb-1 font-bold">Wrong</div>
                         <div class="font-black text-rose-300 text-base md:text-lg">${data.wrong}</div>
                     </div>
                     <div class="bg-indigo-950/30 rounded-xl py-3 border border-indigo-700/30 shadow-sm">
                         <div class="text-indigo-400 text-[9px] md:text-xs uppercase tracking-widest mb-1 font-bold">Time</div>
                         <div class="font-black text-indigo-300 text-base md:text-lg">${formatTime(data.time)}</div>
                     </div>
                 </div>
             </div>`;
         textLog += `[${sub.toUpperCase()}] Acc: ${subAcc}% | Att: ${data.att}/${data.total} | R: ${data.correct} | W: ${data.wrong} | Time: ${formatTime(data.time)}\n`;
     }
     
     document.getElementById('detailed-stats-area').innerHTML = cardsHtml;
     document.getElementById('insight-text').value = textLog;
 }

 function showDashboard() {
     renderAnalyticsDisplay(); 
     document.getElementById('cbt-screen').style.display = 'none';
     document.getElementById('analysis-screen').style.display = 'flex';
 }

 function copyInsights(btnElement) {
     const text = document.getElementById('insight-text'); text.select();
     navigator.clipboard.writeText(text.value).then(() => {
         const originalText = btnElement.innerHTML; btnElement.innerHTML = "✅ Copied!";
         btnElement.classList.replace('text-blue-400', 'text-emerald-400');
         setTimeout(() => { btnElement.innerHTML = originalText; btnElement.classList.replace('text-emerald-400', 'text-blue-400'); }, 2000);
     }).catch(err => {});
 }

 function startReviewMode() {
     currentMode = 'review';
     document.getElementById('analysis-screen').style.display = 'none';
     document.getElementById('cbt-screen').style.display = 'flex';
     
     document.getElementById('action-bar-test').style.display = 'none';
     document.getElementById('action-bar-review').style.display = 'flex';
     document.getElementById('header-timer-area').style.display = 'none';
     document.getElementById('review-filter-bar').style.display = 'flex'; 
     
     document.getElementById('mobile-submit-btn').classList.add('hide-for-review');
     
     buildPalette(); 
     setupReviewFilters(); 
 }

 // --- VU REVISION PAGE LOGIC ---
 function exitRevisionPage() {
     closeSlider(); 
     currentMode = 'home'; saveTestState();
     document.getElementById('revision-screen').style.display = 'none';
     document.getElementById('home-screen').style.display = 'flex';
 }

 function updateTopicDropdown() {
     const subject = document.getElementById('rev-subj-filter').value;
     const topicSelect = document.getElementById('rev-topic-filter');
     topicSelect.innerHTML = '<option value="all">All Topics</option>';
     let topics = new Set();
     masterBank.forEach(q => { if ((subject === 'all' || q.subject === subject) && q.topic) topics.add(q.topic); });
     Array.from(topics).sort().forEach(t => topicSelect.innerHTML += `<option value="${t}">${t}</option>`);
 }

 function openRevisionPage() {
     currentMode = 'revision';
     document.getElementById('home-screen').style.display = 'none';
     if(document.getElementById('exam-screen')) document.getElementById('exam-screen').style.display = 'none';
     document.getElementById('cbt-screen').style.display = 'none';
     document.getElementById('analysis-screen').style.display = 'none';
     document.getElementById('revision-screen').style.display = 'flex';
     
     let optionsHtml = `<option value="all">Active Subjects</option>`;
     globalActiveSubjects.forEach(sub => { optionsHtml += `<option value="${sub}">${sub}</option>`; });
     document.getElementById('rev-subj-filter').innerHTML = optionsHtml;

     updateTopicDropdown(); renderRevisionFeed(); saveTestState();
 }

 function resetRevPage() { revCurrentPage = 1; }

 function toggleRevFilter(type) {
     let idx = revFilters.indexOf(type);
     if (idx > -1) { revFilters.splice(idx, 1); } else { if(revFilters.length < 4) revFilters.push(type); }
     revCurrentPage = 1; saveTestState(); renderRevisionFeed();
 }

 function changeRevPage(p) {
     revCurrentPage = p; saveTestState(); renderRevisionFeed();
     document.getElementById('revision-feed-scroll-area').scrollTop = 0; 
 }

 function toggleCardLang(uid) {
     let el = document.getElementById(`rev-text-${uid}`);
     let current = el.innerHTML;
     let isNowHi = (current === el.getAttribute('data-en') && el.getAttribute('data-hi'));
     el.innerHTML = isNowHi ? el.getAttribute('data-hi') : el.getAttribute('data-en');
     
     let btns = document.getElementById(`rev-card-${uid}`).querySelectorAll('.rev-opt-btn');
     btns.forEach((btn, idx) => { btn.innerHTML = `${idx + 1}. ${isNowHi ? btn.getAttribute('data-hi') : btn.getAttribute('data-en')}`; });
 }

 function renderRevisionFeed() {
     const container = document.getElementById('revision-feed-container');
     container.innerHTML = '';
     
     ['wrong', 'slow', 'unattended', 'unseen'].forEach(f => {
         let btn = document.getElementById(`filter-${f}`);
         let idx = revFilters.indexOf(f);
         if(idx > -1) { btn.classList.add('active'); btn.innerHTML = btn.innerHTML.replace(/ \(\d+\)/, '') + ` (${idx + 1})`; } 
         else { btn.classList.remove('active'); btn.innerHTML = btn.innerHTML.replace(/ \(\d+\)/, ''); }
     });

     const subject = document.getElementById('rev-subj-filter').value;
     const topic = document.getElementById('rev-topic-filter').value;
     
     let pool = masterBank.filter(q => globalActiveSubjects.includes(q.subject));
     if (subject !== 'all') pool = pool.filter(q => q.subject === subject);
     if (topic !== 'all') pool = pool.filter(q => q.topic === topic);

     let wrongMap = JSON.parse(localStorage.getItem(STORAGE_WRONG) || '{}');
     let seen = JSON.parse(localStorage.getItem(STORAGE_SEEN) || '[]');
     let timeMap = JSON.parse(localStorage.getItem(STORAGE_TIME) || '{}');

     if (revFilters.includes('unseen')) pool = pool.filter(q => !seen.includes(q.uid));
     if (revFilters.includes('unattended')) pool = pool.filter(q => seen.includes(q.uid) && !timeMap[q.uid] && (wrongMap[q.uid]||0) === 0);

     pool.sort((a, b) => {
         let sequence = revFilters.length > 0 ? revFilters : ['wrong', 'slow']; 
         for(let i=0; i<sequence.length; i++) {
             let type = sequence[i];
             if (type === 'wrong') { let wA = wrongMap[a.uid] || 0; let wB = wrongMap[b.uid] || 0; if (wA !== wB) return wB - wA; }
             if (type === 'slow') { let tA = timeMap[a.uid] || 0; let tB = timeMap[b.uid] || 0; if (tA !== tB) return tB - tA; }
             if (type === 'unseen') { let uA = !seen.includes(a.uid) ? 1 : 0; let uB = !seen.includes(b.uid) ? 1 : 0; if (uA !== uB) return uB - uA; }
             if (type === 'unattended') { let unA = (seen.includes(a.uid) && !timeMap[a.uid]) ? 1 : 0; let unB = (seen.includes(b.uid) && !timeMap[b.uid]) ? 1 : 0; if (unA !== unB) return unB - unA; }
         }
         return 0; 
     });

     let totalPages = Math.max(1, Math.ceil(pool.length / 50));
     if (revCurrentPage > totalPages) revCurrentPage = totalPages;
     let pagedPool = pool.slice((revCurrentPage - 1) * 50, revCurrentPage * 50);

     if (pagedPool.length === 0) { container.innerHTML = `<div style="text-align:center; padding:30px; color:#888;">No questions match this filter matrix. You're doing great!</div>`; } 
     else {
         pagedPool.forEach((q) => {
             let wCount = wrongMap[q.uid] || 0;
             let isSeenStr = !seen.includes(q.uid) ? 'New' : (!timeMap[q.uid] && wCount===0 ? 'Unattended' : 'Seen');
             let avgTime = timeMap[q.uid] ? formatTime(timeMap[q.uid]) : '--:--';
             let tagText = q.topic ? `[${q.subject} - ${q.topic}]` : `[${q.subject}]`;
             let defaultEng = q.options_en || []; let options = q.options_hi || defaultEng;
             if (!options || options.length < 4) options = defaultEng; if(!options || options.length < 4) return; 

             let indices = [0, 1, 2, 3];
             for (let i = indices.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [indices[i], indices[j]] = [indices[j], indices[i]]; }
             let shuffledCorrect = indices.indexOf(q.correct);
             let optEn = indices.map(i => defaultEng[i]); let optHi = indices.map(i => options[i]);
             let isHindi = document.getElementById('default-lang-select').value === 'hi';
             let displayQ = isHindi ? q.q_hi || q.q_en : q.q_en;
             
             container.innerHTML += `
             <div class="rev-card" id="rev-card-${q.uid}">
                 <div class="rev-stats-bar">
                     <span>⏱ <b style="color:var(--cbt-blue);">${avgTime}</b> | ⚠️ Wrongs: <b style="color:var(--cbt-red);">${wCount}</b> | 👁️ ${isSeenStr}</span>
                     <div class="rev-actions"><button class="rev-action-btn sol-toggle-btn" id="sol-btn-${q.uid}" onclick="toggleSlider('${q.uid}')">Solution</button><button class="rev-action-btn" onclick="toggleCardLang('${q.uid}')">🌐 Switch</button></div>
                 </div>
                 <div style="font-size:0.75rem; color:var(--cbt-purple); font-weight:bold; margin-bottom:8px;">${tagText}</div>
                 <div class="rev-q-text" id="rev-text-${q.uid}" data-en="${(q.q_en || "").replace(/"/g, '&quot;')}" data-hi="${(q.q_hi || q.q_en || "").replace(/"/g, '&quot;')}">${displayQ}</div>
                 <div class="rev-options-grid">
                     <button class="rev-opt-btn" data-en="${optEn[0].replace(/"/g, '&quot;')}" data-hi="${optHi[0].replace(/"/g, '&quot;')}" onclick="checkRevAns('${q.uid}', 0, ${shuffledCorrect}, this)">1. ${isHindi ? optHi[0] : optEn[0]}</button>
                     <button class="rev-opt-btn" data-en="${optEn[1].replace(/"/g, '&quot;')}" data-hi="${optHi[1].replace(/"/g, '&quot;')}" onclick="checkRevAns('${q.uid}', 1, ${shuffledCorrect}, this)">2. ${isHindi ? optHi[1] : optEn[1]}</button>
                     <button class="rev-opt-btn" data-en="${optEn[2].replace(/"/g, '&quot;')}" data-hi="${optHi[2].replace(/"/g, '&quot;')}" onclick="checkRevAns('${q.uid}', 2, ${shuffledCorrect}, this)">3. ${isHindi ? optHi[2] : optEn[2]}</button>
                     <button class="rev-opt-btn" data-en="${optEn[3].replace(/"/g, '&quot;')}" data-hi="${optHi[3].replace(/"/g, '&quot;')}" onclick="checkRevAns('${q.uid}', 3, ${shuffledCorrect}, this)">4. ${isHindi ? optHi[3] : optEn[3]}</button>
                 </div>
             </div>`;
         });
     }

     const pagContainer = document.getElementById('rev-pagination-container');
     pagContainer.style.display = 'flex'; 
     let pageHtml = `<div style="display:flex; justify-content:center; align-items:center; flex-wrap:wrap; gap:8px; width:100%;">`;
     pageHtml += `<button class="btn btn-outline" style="padding:6px 12px;" onclick="changeRevPage(${revCurrentPage - 1})" ${revCurrentPage <= 1 ? 'disabled' : ''}>◀ Prev</button>`;
     
     let startP = Math.max(1, revCurrentPage - 2); let endP = Math.min(totalPages, revCurrentPage + 2);
     if(startP > 1) pageHtml += `<button class="btn btn-outline" style="padding:6px 12px;" onclick="changeRevPage(1)">1</button><span style="color:#888; font-weight:bold;">...</span>`;
     for(let p = startP; p <= endP; p++) {
         if(p === revCurrentPage) pageHtml += `<button class="btn btn-blue" style="padding:6px 12px; font-weight:900;">${p}</button>`;
         else pageHtml += `<button class="btn btn-outline" style="padding:6px 12px;" onclick="changeRevPage(${p})">${p}</button>`;
     }
     if(endP < totalPages) pageHtml += `<span style="color:#888; font-weight:bold;">...</span><button class="btn btn-outline" style="padding:6px 12px;" onclick="changeRevPage(${totalPages})">${totalPages}</button>`;
     pageHtml += `<button class="btn btn-outline" style="padding:6px 12px;" onclick="changeRevPage(${revCurrentPage + 1})" ${revCurrentPage >= totalPages ? 'disabled' : ''}>Next ▶</button></div>`;
     pagContainer.innerHTML = pageHtml; saveTestState();
 }

 function checkRevAns(uid, selectedIdx, correctIdx, btnEl) {
     let card = document.getElementById(`rev-card-${uid}`);
     let btns = card.querySelectorAll('.rev-opt-btn');
     btns.forEach(b => b.disabled = true);
     if (selectedIdx === correctIdx) { btnEl.style.cssText = 'background-color:#d4edda; border-color:#28a745; color:#155724;'; } 
     else {
         btnEl.style.cssText = 'background-color:#f8d7da; border-color:#dc3545; color:#721c24;';
         if(btns[correctIdx]) btns[correctIdx].style.cssText = 'background-color:#d4edda; border-color:#28a745;';
         if (document.getElementById('rev-auto-show').checked) setTimeout(() => { openSlider(uid); }, 400); 
     }
 }

 // --- ENHANCED SLIDER TOGGLE & OUTSIDE CLICK LOGIC ---
 function toggleSlider(uid) {
     let slider = document.getElementById('revision-slider');
     if (activeSliderUid === uid && slider.classList.contains('open')) {
         closeSlider();
     } else {
         openSlider(uid);
     }
 }

 function openSlider(uid) {
     let q = masterBank.find(x => x.uid === uid);
     if(!q) return;

     document.querySelectorAll('.sol-toggle-btn').forEach(btn => btn.innerText = 'Solution');
     let activeBtn = document.getElementById(`sol-btn-${uid}`);
     if(activeBtn) activeBtn.innerText = 'Hide';
     activeSliderUid = uid;

     let slider = document.getElementById('revision-slider');
     let content = document.getElementById('slider-content');
     let imgSolutions = JSON.parse(localStorage.getItem(STORAGE_IMAGES) || '{}');
     let privateImgUrl = imgSolutions[uid] || null;
     let imgBlock = '';
     
     if(privateImgUrl) {
         let imgId = `slider-img-${uid}`;
         imgBlock = `<div id="${imgId}-wrapper" style="text-align:center; padding:20px; background:#f9f9f9; border-radius:8px; border:1px dashed #ccc; margin-bottom: 15px;">⏳ Decrypting Private Image...</div><img id="${imgId}" style="width:100%; max-width:600px; border-radius:8px; display:none; border:1px solid #ddd; margin:0 auto 15px auto;" />`;
         setTimeout(() => fetchPrivateImage(privateImgUrl, imgId), 50);
     }

     content.innerHTML = `
         <div style="position:relative; padding-top:5px;">
             <button id="slider-cam-btn" onclick="handleImageUpload('${q.uid}')" title="Upload Photo to GitHub" style="position:absolute; top:0px; right:0px; background:white; border:1px solid #ccc; border-radius:4px; padding:4px 8px; cursor:pointer; font-size:1.1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 10;">📷</button>
             <h4 style="margin-top:0; color:var(--cbt-blue); padding-right: 40px;">Solution & Analysis</h4>
             <div style="background:#e8f4f8; padding:15px; border-radius:8px; margin-bottom:15px; font-size:0.95rem; border-left:4px solid var(--cbt-blue);">
                 <strong>Logic:</strong> ${q.logic || 'No text logic provided.'}<br><br><strong>Trap Alert:</strong> ${q.trap || 'None.'}
             </div>
             ${imgBlock}
             <button class="uid-tag" onclick="copyUID('${q.uid}', this)" title="Click to Copy" style="margin-top: 5px;">📋 Copy UID: ${q.uid}</button>
         </div>`;
     slider.classList.add('open');
 }

 function closeSlider() { 
     document.getElementById('revision-slider').classList.remove('open'); 
     activeSliderUid = null;
     document.querySelectorAll('.sol-toggle-btn').forEach(btn => btn.innerText = 'Solution');
 }

 document.addEventListener('click', function(event) {
     // Revision Slider closure logic
     let slider = document.getElementById('revision-slider');
     if (slider && slider.classList.contains('open')) {
         if (!slider.contains(event.target) && !event.target.closest('.sol-toggle-btn') && !event.target.closest('.rev-opt-btn')) {
             closeSlider();
         }
     }

     // Mobile Palette closure logic
     if (window.innerWidth <= 768) {
         let panel = document.getElementById('right-panel-id');
         let toggleBtn = document.querySelector('.mobile-palette-toggle');
         if (panel && panel.classList.contains('open')) {
             if (!panel.contains(event.target) && !toggleBtn.contains(event.target)) {
                 toggleMobilePalette();
             }
         }
     }
 });

 window.onload = () => { checkAuth(); };
