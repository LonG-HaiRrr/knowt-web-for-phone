// ================= STATE & ĐIỀU HƯỚNG MÀN HÌNH =================
let flashcards = [];
let currentIndex = 0;
let isAnswered = false;
let timeoutId = null;
let lobbyInterval = null;

const lobbyScreen = document.getElementById('lobby-screen');
const quizScreen = document.getElementById('quiz-screen');

function showLobby() {
  quizScreen.classList.add('hidden');
  quizScreen.classList.remove('flex');
  lobbyScreen.classList.remove('hidden');
  lobbyScreen.classList.add('flex');
  
  fetchDeckList(); // Load ngay lập tức
  // Kích hoạt lại bộ quét mỗi 10s khi đang ở trang chủ
  lobbyInterval = setInterval(fetchDeckList, 10000); 
}

function showQuiz(fileUrl, deckName) {
  clearInterval(lobbyInterval); // Tắt quét nền khi đang học
  
  lobbyScreen.classList.add('hidden');
  lobbyScreen.classList.remove('flex');
  quizScreen.classList.remove('hidden');
  quizScreen.classList.add('flex');

  // Đổi text chỉ để thông báo bài
  document.getElementById('current-deck-name').innerText = `◯ ${deckName.toUpperCase()}`;
  loadDeck(fileUrl);
}

// Bấm nút X thì thoát ra Lobby
document.getElementById('btn-exit').addEventListener('click', showLobby);

// ================= LẤY DANH SÁCH BÀI HỌC (LOBBY) =================
async function fetchDeckList() {
  try {
    // Thêm timestamp để trình duyệt không lấy cache cũ
    const response = await fetch('data/list.json?t=' + new Date().getTime());
    if (!response.ok) throw new Error();
    const decks = await response.json();
    
    const container = document.getElementById('deck-list');
    container.innerHTML = '';
    
    decks.forEach(deck => {
      const btn = document.createElement('button');
      btn.className = "w-full bg-[#1c1c1e] hover:bg-[#2c2c2e] border-2 border-[#2c2c2e] rounded-2xl p-5 text-left flex justify-between items-center transition-colors shadow-lg";
      btn.innerHTML = `
        <span class="text-xl font-bold text-gray-200">${deck.name.toUpperCase()}</span>
        <span class="text-blue-500 font-bold">Bắt đầu ➔</span>
      `;
      btn.onclick = () => showQuiz(deck.file, deck.name);
      container.appendChild(btn);
    });
  } catch (error) {
    document.getElementById('deck-list').innerHTML = `<p class="text-orange-400 text-center">Đang chờ quét file hoặc chưa chạy lệnh 'node auto_scan.js'</p>`;
  }
}

// ================= LẤY DỮ LIỆU TỪ FILE JSON VÀ RENDER =================
async function loadDeck(fileUrl) {
  try {
    const response = await fetch(fileUrl);
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
    document.getElementById('q-hira').innerText = "Lỗi tải file bài học!";
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
    showLobby(); // Học xong tự văng ra Lobby chọn bài khác
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
const modal = document.getElementById('settings-modal');
const content = document.getElementById('settings-content');

// Mở settings từ cả Lobby và Quiz
document.getElementById('btn-settings-lobby').addEventListener('click', openSettings);
document.getElementById('btn-settings-quiz').addEventListener('click', openSettings);

function openSettings() {
  modal.classList.remove('hidden'); modal.classList.add('flex');
  setTimeout(() => content.classList.add('open'), 10);
}

document.getElementById('btn-close-settings').addEventListener('click', () => {
  content.classList.remove('open');
  setTimeout(() => {
    modal.classList.add('hidden'); modal.classList.remove('flex');
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

// ================= KHỞI ĐỘNG =================
showLobby();