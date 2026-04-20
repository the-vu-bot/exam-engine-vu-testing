// GLOBAL VARIABLES
 let masterBank = [], questions = [], state = [], currentQ = 0, totalSeconds = 0, sectionalSeconds = 0, timeSpentGlobal = 0, timerId;
 let currentMode = 'home', examType = 'mock', defaultLang = 'hi', currentLang = 'hi', forcedEn = false, isCalcDrill = false, isPaused = false;
 let globalActiveSubjects = JSON.parse(localStorage.getItem('vu_global_subjects')) || [];
 const defaultCalcTopics = ['Mixed', 'Addition', 'Subtraction', 'Multiplication', 'Division', 'Add & Sub', 'Mult & Div', 'Squares', 'Cubes', 'Triplet Completion'];
 let globalCalcSubjects = JSON.parse(localStorage.getItem('vu_calc_subjects')) || [...defaultCalcTopics];
 let userSprintTime = parseInt(localStorage.getItem('vu_sprint_time')) || 15, userSprintQs = parseInt(localStorage.getItem('vu_sprint_qs')) || 25;
 let userMockGlobalTime = parseInt(localStorage.getItem('vu_mock_global_time')) || 60, userMockGlobalQs = parseInt(localStorage.getItem('vu_mock_global_qs')) || 100;
 let userMockSplitMode = localStorage.getItem('vu_mock_split_mode') || 'auto', userMockSecData = JSON.parse(localStorage.getItem('vu_mock_sec_data') || '{}');
 let reviewFilteredIndices = [], activeReviewStatuses = [], isReviewSluggish = false, revFilters = [], revCurrentPage = 1, revSubjectState = 'all', revTopicState = 'all', activeSliderUid = null, mockBoundaries = [], activeSectionIndex = 0;
 const STORAGE_SEEN = 'VU_ENGINE_SEEN_UIDS', STORAGE_WRONG = 'VU_ENGINE_WRONG_UIDS', STORAGE_SESSION = 'VU_ACTIVE_SESSION', STORAGE_IMAGES = 'VU_IMAGE_SOLUTIONS', STORAGE_GITHUB_TOKEN = 'VU_GITHUB_TOKEN', STORAGE_TIME = 'VU_ENGINE_TIME_MAP';

 function goHomeAlert() {
     if (typeof closeSlider === 'function') closeSlider();
     if((currentMode === 'test' || currentMode === 'practice') && !confirm("Exit to Dashboard? progress will be lost.")) return;
     localStorage.removeItem(STORAGE_SESSION); clearInterval(timerId); currentMode = 'home';
     ['lock-screen', 'home-screen', 'revision-screen', 'analysis-screen', 'cbt-screen'].forEach(s => {
         const el = document.getElementById(s); if(el) el.style.setProperty('display', (s === 'home-screen') ? 'flex' : 'none', 'important');
     });
     questions = []; state = [];
 }

 async function checkAuth() {
     const savedKey = localStorage.getItem('vu_unlocked_key');
     if(savedKey) { try { const res = await fetch(savedKey + '.json?t=' + Date.now()); if(res.ok) { masterBank = await res.json(); setupDashboard(); if(!restoreSession()) goHomeAlert(); return; } } catch(e) {} }
     document.getElementById('lock-screen').style.display = 'flex'; document.getElementById('home-screen').style.display = 'none';
 }

 async function verifyPin() {
     const input = document.getElementById('pin-input').value.trim(); if(!input) return;
     const btn = document.getElementById('unlock-btn'); btn.innerText = "Verifying...";
     try {
         const res = await fetch(input + '.json?t=' + Date.now());
         if (!res.ok) { alert("❌ File not found!"); btn.innerText = "Unlock"; return; }
         masterBank = await res.json(); localStorage.setItem('vu_unlocked_key', input); setupDashboard(); goHomeAlert();
     } catch (e) { alert("Network Error."); }
     btn.innerText = "Initialize Engine";
 }

 function setupDashboard() {
     const dbS = document.getElementById('db-stats'); if(dbS) dbS.innerText = `${masterBank.length} VU Patterns Loaded`;
     const subjects = [...new Set(masterBank.map(q => q.subject).filter(Boolean))];
     if (globalActiveSubjects.length === 0) { globalActiveSubjects = [...subjects]; localStorage.setItem('vu_global_subjects', JSON.stringify(globalActiveSubjects)); }
     updateDashboardDropdowns();
 }

 function updateDashboardDropdowns() {
     let o = `<option value="all">Mixed (Active Subjects)</option>`; globalActiveSubjects.forEach(s => { o += `<option value="${s}">${s}</option>`; });
     if(document.getElementById('sprint-subject')) document.getElementById('sprint-subject').innerHTML = o;
     if(document.getElementById('practice-subject')) document.getElementById('practice-subject').innerHTML = o;
 }

 function startExam(type, subject) {
     localStorage.removeItem(STORAGE_SESSION); defaultLang = document.getElementById('default-lang-select').value; currentLang = defaultLang;
     examType = type; currentMode = type === 'practice' ? 'practice' : 'test';
     let filtered = (subject === 'all' ? masterBank.filter(q => globalActiveSubjects.includes(q.subject)) : masterBank.filter(q => q.subject === subject));
     questions = filtered.sort(() => 0.5 - Math.random()).slice(0, type === 'sprint' ? userSprintQs : 50);
     mockBoundaries = [{ name: 'EXAM', start: 0, end: questions.length - 1 }];
     totalSeconds = type === 'sprint' ? userSprintTime * 60 : 0; timeSpentGlobal = 0;
     state = questions.map(() => ({ selected: null, status: 'unvisited', timeTaken: 0 }));
     document.getElementById('home-screen').style.display = 'none'; document.getElementById('cbt-screen').style.display = 'flex';
     loadQuestion(0); startTestTimer();
 }

 function loadQuestion(index) {
     currentQ = index; const q = questions[index]; document.getElementById('q-num-display').innerText = index + 1;
     document.getElementById('q-text').innerHTML = (currentLang === 'hi' ? q.q_hi : q.q_en);
     const opts = currentLang === 'hi' ? q.options_hi : q.options_en; let h = '';
     opts.forEach((opt, i) => { h += `<div onclick="state[currentQ].selected=${i};loadQuestion(currentQ)" style="padding:15px; border:1px solid #ccc; margin-bottom:10px; border-radius:5px; cursor:pointer; background:${state[index].selected===i?'#e6f0fa':'white'}">${opt}</div>`; });
     document.getElementById('options-container').innerHTML = h; buildPalette();
 }

 function startTestTimer() { clearInterval(timerId); timerId = setInterval(() => { if(!isPaused) timeSpentGlobal++; document.getElementById('timer').innerText = formatTime(totalSeconds > 0 ? totalSeconds-- : timeSpentGlobal); if(totalSeconds <= 0 && examType !== 'practice') submitExam(); }, 1000); }
 function formatTime(s) { return `${Math.floor(Math.max(0,s)/60).toString().padStart(2,'0')}:${(Math.max(0,s)%60).toString().padStart(2,'0')}`; }
 function buildPalette() { const w = document.getElementById('palette-wrapper'); if(!w) return; w.innerHTML = ''; questions.forEach((_, i) => { const b = document.createElement('button'); b.innerText = i + 1; b.style.cssText = `padding:10px; border:1px solid #ccc; cursor:pointer; background:${state[i].selected!==null?'#2fa534':'white'}; color:${state[i].selected!==null?'white':'black'}`; b.onclick = () => loadQuestion(i); w.appendChild(b); }); }
 function submitExam() { clearInterval(timerId); currentMode = 'analysis'; document.getElementById('cbt-screen').style.display = 'none'; document.getElementById('analysis-screen').style.display = 'flex'; }
 function closeSlider() { const s = document.getElementById('revision-slider'); if(s) s.style.transform = 'translateY(100%)'; activeSliderUid = null; }
 function togglePassword() { const i = document.getElementById('pin-input'), e = document.getElementById('eye-icon'); if (i.type === 'password') { i.type = 'text'; e.innerText = '🙈'; } else { i.type = 'password'; e.innerText = '👁️'; } }
 function lockEngine() { localStorage.clear(); location.reload(); }
 function saveTestState() {} function restoreSession() { return false; } function submitExamManually() { if(confirm("Submit?")) submitExam(); } function saveAndNext() { if(currentQ < questions.length -1) loadQuestion(currentQ+1); } function loadPrevious() { if(currentQ > 0) loadQuestion(currentQ-1); } function openSettings() {} function closeSettings() {}

 window.onload = () => { checkAuth(); };
