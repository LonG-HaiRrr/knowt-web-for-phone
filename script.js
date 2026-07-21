// ================= STATE & ĐIỀU HƯỚNG MÀN HÌNH =================
let flashcards = [];
let fullDeck = []; 
let currentIndex = 0;
let isAnswered = false;
let timeoutId = null;

// Khởi tạo Audio dùng chung cho "Giọng Google Mạng" để vượt rào Mobile
const cloudAudio = new Audio();
cloudAudio.setAttribute('playsinline', ''); 
let isAudioUnlocked = false;

const lobbyScreen = document.getElementById('lobby-screen');
const quizScreen = document.getElementById('quiz-screen');

function showLobby() {
  quizScreen.classList.add('hidden');
  quizScreen.classList.remove('flex');
  lobbyScreen.classList.remove('hidden');
  lobbyScreen.classList.add('flex');
  
  fullDeck = []; 
  window.speechSynthesis.cancel();
  cloudAudio.pause();
  
  fetchDeckList(); 
}

function showQuiz(fileUrl, deckName) {
  // Đánh thức cả 2 công nghệ âm thanh ngay khi chạm nút "Bắt đầu"
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(''));
  
  if (!isAudioUnlocked) {
    cloudAudio.src = 'data:audio/mp3;base64,//OExAAAAANIAAAAAExBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
    cloudAudio.play().then(() => { isAudioUnlocked = true; }).catch(e => console.log(e));
  }

  lobbyScreen.classList.add('hidden');
  lobbyScreen.classList.remove('flex');
  quizScreen.classList.remove('hidden');
  quizScreen.classList.add('flex');
  
  document.getElementById('current-deck-name').innerText = `◯ ${deckName}`;
  loadDeck(fileUrl);
}

document.getElementById('btn-exit').addEventListener('click', showLobby);

// ================= LẤY DANH SÁCH BÀI HỌC (LOBBY) =================
async function fetchDeckList() {
  try {
    const response = await fetch('data/list.json?t=' + new Date().getTime());
    if (!response.ok) throw new Error();
    const decks = await response.json();
    
    const container = document.getElementById('deck-list');
    container.innerHTML = '';
    
    decks.forEach(deck => {
      const btn = document.createElement('button');
      btn.className = "w-full bg-[#1c1c1e] hover:bg-[#2c2c2e] border-2 border-[#2c2c2e] rounded-2xl p-5 text-left flex justify-between items-center transition-colors shadow-lg";
      btn.innerHTML = `
        <span class="text-xl font-bold text-gray-200">${deck.name}</span>
        <span class="text-blue-500 font-bold">Bắt đầu ➔</span>
      `;
      btn.onclick = () => showQuiz(deck.file, deck.name);
      container.appendChild(btn);
    });
  } catch (error) {
    document.getElementById('deck-list').innerHTML = `<p class="text-gray-400 text-center">Đang nạp dữ liệu từ GitHub...</p>`;
  }
}

// ================= LẤY DỮ LIỆU TỪ FILE JSON VÀ RENDER =================
async function loadDeck(fileUrl) {
  try {
    const response = await fetch(fileUrl + '?t=' + new Date().getTime());
    if (!response.ok) throw new Error("File không tồn tại");
    const data = await response.json();
    
    if (data && data.length >= 4) {
      fullDeck = data.map(card => ({...card, seen: 0}));
      startSession();
    } else {
      document.getElementById('q-hira').innerText = "Cần ít nhất 4 từ/file";
    }
  } catch (error) {
    document.getElementById('q-hira').innerText = "Lỗi tải bài học!";
  }
}

function startSession() {
  if (fullDeck.length === 0) return;

  const limitInput = parseInt(document.getElementById('set-question-limit').value);
  const limit = (isNaN(limitInput) || limitInput < 4) ? 20 : limitInput;

  fullDeck.sort((a, b) => {
    if (a.seen === b.seen) return 0.5 - Math.random();
    return a.seen - b.seen;
  });

  flashcards = fullDeck.slice(0, limit);
  flashcards.forEach(card => card.seen += 1);

  currentIndex = 0;
  renderQuestion();
}

function generateMultipleChoice(correctCard) {
  let options = [correctCard];
  let distractors = fullDeck.filter(c => c.id !== correctCard.id);
  distractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 3);
  options.push(...distractors);
  return options.sort(() => 0.5 - Math.random());
}

function renderQuestion() {
  if (flashcards.length === 0) return;
  isAnswered = false;
  document.getElementById('next-btn-container').classList.add('hidden');

  const currentCard = flashcards[currentIndex];
  document.getElementById('q-hira').innerText = currentCard.hira_kata;
  document.getElementById('q-kanji').innerText = currentCard.kanji || '';
  document.getElementById('card-counter').innerText = currentIndex + 1;
  document.getElementById('progress-bar').style.width = `${((currentIndex) / flashcards.length) * 100}%`;

  const container = document.getElementById('options-container');
  container.innerHTML = ''; 
  const currentOptions = generateMultipleChoice(currentCard);

  currentOptions.forEach((opt, index) => {
    const letter = String.fromCharCode(65 + index); 
    const btn = document.createElement('button');
    btn.className = "option-btn w-full text-left bg-[#1c1c1e] border-2 border-[#3a3a3c] hover:border-gray-500 rounded-2xl p-4 flex items-center gap-4 cursor-pointer";
    btn.innerHTML = `
      <div class="icon w-8 h-8 rounded-full bg-[#2c3238] flex items-center justify-center font-bold text-gray-300 shrink-0 transition-colors">${letter}</div>
      <span class="meaning-text leading-relaxed whitespace-pre-wrap">${opt.meaning.replace(/\\n/g, '\n')}</span>
    `;
    btn.dataset.id = opt.id; 
    btn.onclick = () => handleAnswer(btn, opt.id, currentCard.id);
    container.appendChild(btn);
  });

  if (document.getElementById('set-auto-q').checked) {
    if (timeoutId) clearTimeout(timeoutId);
    const delayMs = parseFloat(document.getElementById('set-delay').value) * 1000;
    timeoutId = setTimeout(() => playQuestionAudio(), delayMs);
  }
}

function handleAnswer(clickedBtn, selectedId, correctId) {
  if (isAnswered) return;
  isAnswered = true;

  const allBtns = document.querySelectorAll('.option-btn');
  allBtns.forEach(btn => btn.disabled = true);

  if (selectedId === correctId) {
    clickedBtn.classList.add('correct');
  } else {
    clickedBtn.classList.add('wrong');
    allBtns.forEach(btn => {
      if (btn.dataset.id == correctId) btn.classList.add('correct');
    });
  }

  if (document.getElementById('set-auto-ans').checked) {
    const currentCard = flashcards[currentIndex];
    // Đáp án luôn ép ưu tiên tiếng Việt
    playCustomAudio(currentCard.meaning.replace(/\\n/g, ' '), 'vi'); 
  }

  const isAutoNext = document.getElementById('set-auto-next').checked;
  if (isAutoNext) {
    setTimeout(goToNextQuestion, 1500);
  } else {
    document.getElementById('next-btn-container').classList.remove('hidden');
  }
}

function goToNextQuestion() {
  if (currentIndex < flashcards.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    startSession();
  }
}

document.getElementById('btn-manual-next').addEventListener('click', goToNextQuestion);

// ================= HỆ THỐNG ÂM THANH MỚI: HYBRID (CLOUD + SYSTEM) =================

let availableVoices = [];
function loadDynamicVoices() {
  availableVoices = window.speechSynthesis.getVoices();
  const voiceSelect = document.getElementById('set-voice');
  if (!voiceSelect) return;
  
  voiceSelect.innerHTML = '<option value="auto">🤖 Tự động (Ưu tiên Giọng Mạng)</option>';
  
  // 1. CHÈN THỦ CÔNG GIỌNG GOOGLE ĐÁM MÂY (Luôn có trên mọi thiết bị)
  const optGroupCloud = document.createElement('optgroup');
  optGroupCloud.label = "☁️ Giọng Đám Mây (Cần mạng - Chuẩn nhất)";
  optGroupCloud.innerHTML = `
    <option value="api-ja">⭐ Google Mạng - Tiếng Nhật</option>
    <option value="api-vi">⭐ Google Mạng - Tiếng Việt</option>
    <option value="api-en">⭐ Google Mạng - Tiếng Anh</option>
  `;
  voiceSelect.appendChild(optGroupCloud);

  // 2. CHÈN GIỌNG HỆ THỐNG CỦA MÁY
  if (availableVoices.length > 0) {
    const optGroupSys = document.createElement('optgroup');
    optGroupSys.label = "📱 Giọng Hệ Thống (Có sẵn trong máy)";
    availableVoices.forEach((voice, index) => {
      if (voice.lang.includes('ja') || voice.lang.includes('vi') || voice.lang.includes('en')) {
        const option = document.createElement('option');
        option.value = index; 
        const isGoogle = voice.name.includes('Google') ? '⭐ ' : '';
        option.textContent = `${isGoogle}${voice.name} (${voice.lang})`;
        optGroupSys.appendChild(option);
      }
    });
    voiceSelect.appendChild(optGroupSys);
  }
}

if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadDynamicVoices;
}
setTimeout(loadDynamicVoices, 500); // Back-up gọi thủ công nếu onvoiceschanged delay

function detectLanguage(text) {
  if (!text) return 'en';
  const jpRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
  if (jpRegex.test(text)) return 'ja';
  
  const viRegex = /[àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỹỷỵ]/i;
  if (viRegex.test(text)) return 'vi';
  
  return 'en';
}

function playCustomAudio(text, forcedLangCode = null) {
  if (!text) return;
  
  const voiceSelect = document.getElementById('set-voice');
  let selectedSetting = voiceSelect ? voiceSelect.value : 'auto';
  let targetLang = forcedLangCode || detectLanguage(text);

  // Xử lý logic nút Auto
  if (selectedSetting === 'auto') {
    selectedSetting = `api-${targetLang}`; // Auto sẽ mặc định điều hướng về Giọng Đám Mây cho xịn
  }

  if (typeof selectedSetting === 'string' && selectedSetting.startsWith('api-')) {
    // --- CHẾ ĐỘ 1: ĐỌC BẰNG API GOOGLE ONLINE ---
    const apiLang = selectedSetting.split('-')[1];
    window.speechSynthesis.cancel();
    cloudAudio.pause();
    cloudAudio.currentTime = 0;
    
    const url = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${apiLang}&q=${encodeURIComponent(text)}`;
    cloudAudio.referrerPolicy = "no-referrer"; 
    cloudAudio.src = url;
    
    // Fallback: Lỡ mạng rớt hoặc bị Cốc Cốc bóp, chuyển ngay sang giọng máy
    cloudAudio.onerror = () => triggerSystemVoice(text, apiLang);
    cloudAudio.play().catch(e => triggerSystemVoice(text, apiLang));
    
  } else {
    // --- CHẾ ĐỘ 2: ĐỌC BẰNG HỆ THỐNG OFFLINE ---
    cloudAudio.pause();
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = availableVoices[selectedSetting];
    window.speechSynthesis.speak(utterance);
  }
}

// Hàm cứu viện khi Giọng Mạng bị lỗi
function triggerSystemVoice(text, targetLang) {
    const utterance = new SpeechSynthesisUtterance(text);
    const bestVoice = availableVoices.find(v => v.lang.includes(targetLang) && v.name.includes('Google')) 
                   || availableVoices.find(v => v.lang.includes(targetLang));
                   
    if (bestVoice) utterance.voice = bestVoice;
    else {
      if (targetLang === 'vi') utterance.lang = 'vi-VN';
      else if (targetLang === 'ja') utterance.lang = 'ja-JP';
      else utterance.lang = 'en-US';
    }
    window.speechSynthesis.speak(utterance);
}

function playQuestionAudio() {
  const currentCard = flashcards[currentIndex];
  if (currentCard) {
    playCustomAudio(currentCard.hira_kata);
  }
}

// BẮT PHÍM TẮT ĐỌC (NUMPAD)
document.addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (e.code === 'Numpad0' || e.code === 'NumpadDecimal') {
      playQuestionAudio();
  }
}, true);


// ================= UI SETTINGS & CẬP NHẬT BIẾN CSS =================
const modalSettings = document.getElementById('settings-modal');
const contentSettings = document.getElementById('settings-content');

document.getElementById('btn-settings-lobby').addEventListener('click', openSettings);
document.getElementById('btn-settings-quiz').addEventListener('click', openSettings);

function openSettings() {
  modalSettings.classList.remove('hidden'); modalSettings.classList.add('flex');
  setTimeout(() => contentSettings.classList.add('open'), 10);
}

document.getElementById('btn-close-settings').addEventListener('click', () => {
  contentSettings.classList.remove('open');
  setTimeout(() => {
    modalSettings.classList.add('hidden'); modalSettings.classList.remove('flex');
  }, 300);
});

document.getElementById('set-delay').addEventListener('input', (e) => {
  document.getElementById('delay-val').innerText = e.target.value + 's';
});

const root = document.documentElement;
const updateFont = (type, prop, value, displayId, suffix = '') => {
  root.style.setProperty(`--${prop}-${type}`, value + suffix);
  if(displayId) document.getElementById(displayId).innerText = value + suffix;
};

document.getElementById('fs-hira').addEventListener('input', (e) => updateFont('hira', 'fs', e.target.value, 'fs-hira-val', 'px'));
document.getElementById('fs-kanji').addEventListener('input', (e) => updateFont('kanji', 'fs', e.target.value, 'fs-kanji-val', 'px'));
document.getElementById('fs-mean').addEventListener('input', (e) => updateFont('mean', 'fs', e.target.value, 'fs-mean-val', 'px'));

document.getElementById('ff-hira').addEventListener('change', (e) => updateFont('hira', 'ff', e.target.value));
document.getElementById('ff-kanji').addEventListener('change', (e) => updateFont('kanji', 'ff', e.target.value));
document.getElementById('ff-mean').addEventListener('change', (e) => updateFont('mean', 'ff', e.target.value));


// ================= GIAO DIỆN NHẬP DỮ LIỆU (IMPORT LOGIC) =================
const importModal = document.getElementById('import-modal');
let parsedImportData = [];

document.getElementById('btn-open-import').addEventListener('click', () => {
  importModal.classList.remove('hidden');
  importModal.classList.add('flex');
});

const closeImport = () => {
  importModal.classList.add('hidden');
  importModal.classList.remove('flex');
  document.getElementById('import-textarea').value = '';
  renderImportPreview();
};

document.getElementById('btn-close-import').addEventListener('click', closeImport);
document.getElementById('btn-cancel-import').addEventListener('click', closeImport);

const importInputs = document.querySelectorAll('#import-textarea, input[name="term_def"], input[name="card_sep"], #custom-term-def, #custom-card-sep');
importInputs.forEach(el => el.addEventListener('input', renderImportPreview));

function getDelimiter(name, customId) {
  const selected = document.querySelector(`input[name="${name}"]:checked`).value;
  if (selected === 'tab') return '\t';
  if (selected === 'comma') return ',';
  if (selected === 'newline') return '\n';
  if (selected === 'semicolon') return ';';
  return document.getElementById(customId).value || (name === 'term_def' ? '\t' : '\n');
}

function renderImportPreview() {
  const text = document.getElementById('import-textarea').value;
  const termDefSep = getDelimiter('term_def', 'custom-term-def');
  const cardSep = getDelimiter('card_sep', 'custom-card-sep');
  
  const previewBox = document.getElementById('import-preview-box');
  const previewCount = document.getElementById('preview-count');
  
  if (!text.trim()) {
    previewBox.innerHTML = '<p class="text-gray-500 text-sm">Không có nội dung để xem trước</p>';
    previewCount.innerText = '0 thẻ';
    parsedImportData = [];
    return;
  }

  const rawCards = text.split(cardSep).filter(c => c.trim() !== '');
  parsedImportData = [];
  let html = '';

  rawCards.forEach((raw, index) => {
    const parts = raw.split(termDefSep);
    if (parts.length >= 2) {
      const termRaw = parts[0].trim();
      const meaning = parts.slice(1).join(termDefSep).trim(); 
      
      let hira = termRaw;
      let kanji = "";
      
      const regex = /^(.*?)(?:\s*[\(（](.*?)[\)）])?$/;
      const match = termRaw.match(regex);
      
      if (match) {
        hira = match[1].trim();
        kanji = match[2] ? match[2].trim() : "";
      }

      parsedImportData.push({ id: index + 1, hira_kata: hira, kanji: kanji, meaning: meaning });
      
      html += `
        <div class="flex border-b border-[#2a2c41] pb-2 mb-2">
          <div class="w-1/2 pr-2 border-r border-[#2a2c41]">
            <div class="font-bold text-blue-400">${hira}</div>
            <div class="text-gray-500 text-sm">${kanji}</div>
          </div>
          <div class="w-1/2 pl-2 text-orange-400 text-sm whitespace-pre-wrap">${meaning}</div>
        </div>
      `;
    }
  });

  previewBox.innerHTML = html || '<p class="text-red-500 text-sm">Không thể phân tích dữ liệu. Kiểm tra lại dấu phân cách.</p>';
  previewCount.innerText = `${parsedImportData.length} thẻ`;
}

document.getElementById('btn-save-import').addEventListener('click', async () => {
  if (parsedImportData.length === 0) return; 
  
  let fileName = document.getElementById('import-filename').value.trim();
  if (!fileName) fileName = "bai_moi";
  if (!fileName.endsWith('.json')) fileName += '.json';

  const jsonString = JSON.stringify(parsedImportData, null, 2);

  try {
    if (window.showSaveFilePicker) {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'JSON Files',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      closeImport();
    } else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      closeImport();
    }
  } catch (err) {
    console.error("Đã hủy lưu:", err);
  }
});

// ================= KHỞI ĐỘNG =================
showLobby();