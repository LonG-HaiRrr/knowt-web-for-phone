
/// version ok
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
      // Xáo trộn từ vựng ngẫu nhiên mỗi lần load bài
      flashcards = data.sort(() => 0.5 - Math.random());
      currentIndex = 0;
      renderQuestion();
    } else {
      document.getElementById('q-hira').innerText = "Cần ít nhất 4 từ/file";
    }
  } catch (error) {
    console.error("Lỗi:", error);
    document.getElementById('q-hira').innerText = "Lỗi tải file!";
    document.getElementById('q-kanji').innerText = "Chưa có file " + fileUrl;
  }
}

// Bắt sự kiện khi bạn chọn bài khác trong Dropdown
document.getElementById('deck-selector').addEventListener('change', (e) => {
  loadDeck(e.target.value);
});

// ================= THUẬT TOÁN TẠO ĐÁP ÁN NHIỄU =================
function generateMultipleChoice(correctCard) {
  let options = [correctCard];
  // Tìm các từ khác trong mảng làm đáp án gây nhiễu
  let distractors = flashcards.filter(c => c.id !== correctCard.id);
  // Trộn và bốc đúng 3 từ sai
  distractors = distractors.sort(() => 0.5 - Math.random()).slice(0, 3);
  options.push(...distractors);
  // Trộn lại 4 đáp án để nút đúng không bị kẹt ở vị trí A
  return options.sort(() => 0.5 - Math.random());
}

// ================= RENDER CÂU HỎI VÀ NÚT =================
function renderQuestion() {
  if (flashcards.length === 0) return;
  isAnswered = false;

  const currentCard = flashcards[currentIndex];
  document.getElementById('q-hira').innerText = currentCard.hira_kata;
  document.getElementById('q-kanji').innerText = currentCard.kanji || '';
  document.getElementById('card-counter').innerText = currentIndex + 1;
  document.getElementById('progress-bar').style.width = `${((currentIndex) / flashcards.length) * 100}%`;

  const container = document.getElementById('options-container');
  container.innerHTML = ''; 

  const currentOptions = generateMultipleChoice(currentCard);

  currentOptions.forEach((opt, index) => {
    const letter = String.fromCharCode(65 + index); // Tạo A, B, C, D
    const btn = document.createElement('button');
    btn.className = "option-btn w-full text-left bg-[#1c1c1e] border-2 border-[#3a3a3c] hover:border-gray-500 rounded-2xl p-4 flex items-center gap-4 cursor-pointer";
    btn.innerHTML = `
      <div class="icon w-8 h-8 rounded-full bg-[#2c3238] flex items-center justify-center font-bold text-gray-300 shrink-0 transition-colors">${letter}</div>
      <span class="text-[15px] leading-relaxed whitespace-pre-wrap">${opt.meaning.replace(/\\n/g, '\n')}</span>
    `;
    
    btn.dataset.id = opt.id; 
    btn.onclick = () => handleAnswer(btn, opt.id, currentCard.id);
    container.appendChild(btn);
  });

  // Tự động đọc
  if (document.getElementById('set-auto-q').checked) {
    if (timeoutId) clearTimeout(timeoutId);
    const delayMs = parseFloat(document.getElementById('set-delay').value) * 1000;
    timeoutId = setTimeout(() => {
      playAudio(currentCard.hira_kata, 'ja-JP');
    }, delayMs);
  }
}

// ================= XỬ LÝ ĐÚNG/SAI =================
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

  // Đợi 1.5s tự qua câu mới
  setTimeout(() => {
    if (currentIndex < flashcards.length - 1) {
      currentIndex++;
      renderQuestion();
    } else {
      alert("Bạn đã hoàn thành bài!");
      currentIndex = 0;
      // Tự động load lại để trộn bài lần nữa
      loadDeck(document.getElementById('deck-selector').value);
    }
  }, 1500);
}

// ================= ÂM THANH NATIVE =================
function playAudio(text, lang) {
  if (!text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.volume = 1.0;
  window.speechSynthesis.speak(utterance);
}

function playQuestionAudio() {
  const currentCard = flashcards[currentIndex];
  if (currentCard) playAudio(currentCard.hira_kata, 'ja-JP');
}

// ================= UI SETTINGS MODAL =================
const modal = document.getElementById('settings-modal');
const content = document.getElementById('settings-content');

document.getElementById('btn-settings').addEventListener('click', () => {
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  setTimeout(() => content.classList.add('open'), 10);
});

document.getElementById('btn-close-settings').addEventListener('click', () => {
  content.classList.remove('open');
  setTimeout(() => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }, 300);
});

document.getElementById('set-delay').addEventListener('input', (e) => {
  document.getElementById('delay-val').innerText = e.target.value + 's';
});

// Chạy mặc định bài 1 khi vừa mở web
loadDeck('data/bai1.json');