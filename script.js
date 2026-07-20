// ================= STATE HỆ THỐNG =================
let flashcards = [];
let currentIndex = 0;
let isAnswered = false;
let timeoutId = null;

// ================= LẤY DỮ LIỆU TỪ FILE JSON LOCAL =================
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
    document.getElementById('q-hira').innerText = "Lỗi tải file!";
  }
}

document.getElementById('deck-selector').addEventListener('change', (e) => loadDeck(e.target.value));

// ================= THUẬT TOÁN TẠO ĐÁP ÁN NHIỄU =================
function generateMultipleChoice(correctCard) {
  let options = [correctCard];
  let distractors = flashcards.filter(c => c.id !== correctCard.id);
  distractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 3);
  options.push(...distractors);
  return options.sort(() => 0.5 - Math.random());
}

// ================= RENDER CÂU HỎI VÀ NÚT =================
function renderQuestion() {
  if (flashcards.length === 0) return;
  isAnswered = false;
  
  // Ẩn nút Next khi vừa render câu mới
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
    // Thêm class 'meaning-text' để ăn thuộc tính biến CSS
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

// ================= XỬ LÝ ĐÚNG/SAI & CHUYỂN CÂU =================
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

  // KIỂM TRA TRẠNG THÁI AUTO-NEXT
  const isAutoNext = document.getElementById('set-auto-next').checked;
  if (isAutoNext) {
    setTimeout(goToNextQuestion, 1500); // Đợi 1.5s tự động nhảy
  } else {
    // Hiện nút Tiếp theo để ấn thủ công
    document.getElementById('next-btn-container').classList.remove('hidden');
  }
}

// Hàm tách rời để dùng chung cho cả Auto và Bấm nút
function goToNextQuestion() {
  if (currentIndex < flashcards.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    alert("Bạn đã hoàn thành bài!");
    currentIndex = 0;
    loadDeck(document.getElementById('deck-selector').value);
  }
}

// Sự kiện bấm nút Next thủ công
document.getElementById('btn-manual-next').addEventListener('click', goToNextQuestion);

// ================= ÂM THANH NATIVE =================
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

document.getElementById('btn-settings').addEventListener('click', () => {
  modal.classList.remove('hidden'); modal.classList.add('flex');
  setTimeout(() => content.classList.add('open'), 10);
});

document.getElementById('btn-close-settings').addEventListener('click', () => {
  content.classList.remove('open');
  setTimeout(() => {
    modal.classList.add('hidden'); modal.classList.remove('flex');
  }, 300);
});

document.getElementById('set-delay').addEventListener('input', (e) => {
  document.getElementById('delay-val').innerText = e.target.value + 's';
});

// Logic Lắng nghe thay đổi Cỡ chữ / Font chữ và Update vào CSS Variables
const root = document.documentElement;

const updateFont = (type, prop, value, displayId, suffix = '') => {
  root.style.setProperty(`--${prop}-${type}`, value + suffix);
  if(displayId) document.getElementById(displayId).innerText = value + suffix;
};

// Lắng nghe Size
document.getElementById('fs-hira').addEventListener('input', (e) => updateFont('hira', 'fs', e.target.value, 'fs-hira-val', 'px'));
document.getElementById('fs-kanji').addEventListener('input', (e) => updateFont('kanji', 'fs', e.target.value, 'fs-kanji-val', 'px'));
document.getElementById('fs-mean').addEventListener('input', (e) => updateFont('mean', 'fs', e.target.value, 'fs-mean-val', 'px'));

// Lắng nghe Family
document.getElementById('ff-hira').addEventListener('change', (e) => updateFont('hira', 'ff', e.target.value));
document.getElementById('ff-kanji').addEventListener('change', (e) => updateFont('kanji', 'ff', e.target.value));
document.getElementById('ff-mean').addEventListener('change', (e) => updateFont('mean', 'ff', e.target.value));

// Chạy bài đầu tiên
loadDeck('data/bai1.json');