// ================= STATE & ĐIỀU HƯỚNG MÀN HÌNH =================
let flashcards = [];
let currentIndex = 0;
let isAnswered = false;
let timeoutId = null;

const lobbyScreen = document.getElementById('lobby-screen');
const quizScreen = document.getElementById('quiz-screen');

function showLobby() {
  quizScreen.classList.add('hidden');
  quizScreen.classList.remove('flex');
  lobbyScreen.classList.remove('hidden');
  lobbyScreen.classList.add('flex');
  fetchDeckList(); 
}

function showQuiz(fileUrl, deckName) {
  lobbyScreen.classList.add('hidden');
  lobbyScreen.classList.remove('flex');
  quizScreen.classList.remove('hidden');
  quizScreen.classList.add('flex');
  
  // Đã bỏ lệnh toUpperCase() để giữ nguyên chữ hoa/thường của tên file
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
      flashcards = data.sort(() => 0.5 - Math.random());
      currentIndex = 0;
      renderQuestion();
    } else {
      document.getElementById('q-hira').innerText = "Cần ít nhất 4 từ/file";
    }
  } catch (error) {
    console.error("Lỗi:", error);
    document.getElementById('q-hira').innerText = "Lỗi tải bài học!";
  }
}

function generateMultipleChoice(correctCard) {
  let options = [correctCard];
  let distractors = flashcards.filter(c => c.id !== correctCard.id);
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
    timeoutId = setTimeout(() => playAudio(currentCard.hira_kata, 'ja-JP'), delayMs);
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
    playAudio(currentCard.meaning.replace(/\\n/g, ' '), 'vi-VN');
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
    alert("Bạn đã hoàn thành bài!");
    showLobby();
  }
}

document.getElementById('btn-manual-next').addEventListener('click', goToNextQuestion);

function playAudio(text, lang) {
  if (!text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  window.speechSynthesis.speak(utterance);
}
function playQuestionAudio() {
  const currentCard = flashcards[currentIndex];
  if (currentCard) playAudio(currentCard.hira_kata, 'ja-JP');
}

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

// Lắng nghe thao tác gõ và đổi delimiter để tự parse
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
      const meaning = parts.slice(1).join(termDefSep).trim(); // Ghép lại nếu nghĩa chứa kí tự trùng delimiter
      
      let hira = termRaw;
      let kanji = "";
      
      // Bóc tách Kanji nằm trong ngoặc đơn. Vd: おいしい (美味しい)
      // Chấp nhận ngoặc tròn () thường hoặc ngoặc tròn full-width của Nhật （）
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

// Lưu ra file JSON
document.getElementById('btn-save-import').addEventListener('click', () => {
  if (parsedImportData.length === 0) {
    alert("Chưa có dữ liệu hợp lệ để lưu!");
    return;
  }
  
  let fileName = document.getElementById('import-filename').value.trim();
  if (!fileName) fileName = "bai_moi";
  if (!fileName.endsWith('.json')) fileName += '.json';

  const jsonString = JSON.stringify(parsedImportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  
  alert("Lưu thành công file " + fileName + ". Hãy đẩy file này vào thư mục data/ trên GitHub nhé!");
  closeImport();
});

// ================= KHỞI ĐỘNG =================
showLobby();