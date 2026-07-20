import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. KẾT NỐI SUPABASE
const supabaseUrl = 'https://wryjfdfzxwxluqtfcrjm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndyeWpmZGZ6eHd4bHVxdGZjcmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1Mjk5NDIsImV4cCI6MjEwMDEwNTk0Mn0.TV8TLrQCkIbVYgIo4FnHk8CTQ0KpHsrGavDA_4lTYEI'; // <--- DÁN KEY VÀO ĐÂY
const supabase = createClient(supabaseUrl, supabaseKey);

export default function FlashcardApp() {
  const [theme, setTheme] = useState('dark');
  const [currentTab, setCurrentTab] = useState('study');

  // State Dữ liệu
  const [flashcards, setFlashcards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // State Cài đặt âm thanh & hình ảnh
  const [settings, setSettings] = useState({
    showImage: true, autoPlayQ: true, autoPlayAns: false, delayEnabled: true, delayTime: 1.5, volQ: 100, volAns: 100
  });

  // State Import
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState([]);
  const [importDeckName, setImportDeckName] = useState('Bài Mới');
  const timeoutRef = useRef(null);

  // 2. LẤY DỮ LIỆU TỪ DATABASE KHI LOAD WEB
  useEffect(() => {
    const fetchCards = async () => {
      const { data, error } = await supabase.from('data_bai_hoc').select('*').order('id', { ascending: true });
      if (error) console.error("Lỗi:", error);
      else if (data && data.length > 0) setFlashcards(data);
    };
    fetchCards();
  }, []);

  // 3. HỆ THỐNG ÂM THANH (TTS)
  const speak = (text, lang = 'ja-JP', volumePercent) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.volume = volumePercent / 100;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;

    if (!isFlipped && settings.autoPlayQ) {
      const delay = settings.delayEnabled ? settings.delayTime * 1000 : 0;
      timeoutRef.current = setTimeout(() => speak(currentCard.hira_kata, 'ja-JP', settings.volQ), delay);
    } else if (isFlipped && settings.autoPlayAns) {
      speak(currentCard.meaning.replace(/\\n/g, ' '), 'vi-VN', settings.volAns);
    }
  }, [currentIndex, isFlipped, flashcards, settings]);

  // 4. ĐIỀU KHIỂN THẺ
  const nextCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev < flashcards.length - 1 ? prev + 1 : prev));
  };
  const prevCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  // 5. IMPORT LÊN SUPABASE
  const handleImportChange = (e) => {
    const text = e.target.value;
    setImportText(text);
    const lines = text.split('\n');
    const parsed = lines.filter(line => line.trim() !== '').map((line, index) => {
      const parts = line.split('\t'); 
      return { id: `preview-${index}`, hira_kata: parts[0] || '', kanji: parts[1] || '', meaning: parts[2] || '' };
    });
    setImportPreview(parsed);
  };

  const submitImport = async () => {
    const newCards = importPreview.map(card => ({
      deck_name: importDeckName, hira_kata: card.hira_kata, kanji: card.kanji, meaning: card.meaning, image_url: ''
    }));
    const { data, error } = await supabase.from('data_bai_hoc').insert(newCards).select();
    if (error) alert('Lỗi: ' + error.message);
    else {
      setFlashcards([...flashcards, ...data]);
      setImportText(''); setImportPreview([]);
      alert('Đã đẩy dữ liệu lên database thành công!');
    }
  };

  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  // RENDER GIAO DIỆN
  return (
    <div className={`${theme === 'dark' ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-100 dark:bg-[#111111] text-gray-900 dark:text-white font-sans flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        
        <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1c1c1e] shadow-sm">
          <div className="flex gap-2">
            <button onClick={() => setCurrentTab('study')} className={`px-3 py-1 rounded-lg ${currentTab === 'study' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-[#333]'}`}>Học</button>
            <button onClick={() => setCurrentTab('import')} className={`px-3 py-1 rounded-lg ${currentTab === 'import' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-[#333]'}`}>Import</button>
          </div>
          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#333] flex items-center justify-center text-xl">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {currentTab === 'study' && (
          <div className="flex-1 flex flex-col px-4 py-4 max-w-md mx-auto w-full">
            <div onClick={() => setIsFlipped(!isFlipped)} className="relative flex-1 bg-white dark:bg-[#1c1c1e] rounded-3xl p-6 shadow-xl border border-gray-200 dark:border-[#2c2c2e] flex flex-col items-center justify-center cursor-pointer min-h-[300px]">
              <div className="absolute top-4 left-4 right-4 flex justify-between text-gray-500 text-sm">
                <span>{flashcards[currentIndex]?.deck_name || 'Đang tải...'}</span>
                <span>{flashcards.length > 0 ? currentIndex + 1 : 0} / {flashcards.length}</span>
              </div>
              {!isFlipped ? (
                <div className="text-center">
                   {settings.showImage && flashcards[currentIndex]?.image_url && (
                      <img src={flashcards[currentIndex].image_url} alt="Hinh" className="w-32 h-32 object-cover rounded-xl mx-auto mb-4" />
                   )}
                  <h1 className="text-4xl font-bold mb-2">{flashcards[currentIndex]?.hira_kata}</h1>
                  <h2 className="text-2xl text-gray-500">{flashcards[currentIndex]?.kanji}</h2>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-2xl font-medium whitespace-pre-wrap text-blue-600 dark:text-blue-400">
                    {flashcards[currentIndex]?.meaning.replace(/\\n/g, '\n')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-6 gap-4">
               <button onClick={prevCard} disabled={currentIndex === 0} className="flex-1 py-4 bg-gray-300 dark:bg-[#2c2c2e] rounded-2xl disabled:opacity-50 font-bold">Quay lại</button>
               <button onClick={nextCard} disabled={currentIndex === flashcards.length - 1 || flashcards.length === 0} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl disabled:opacity-50 font-bold">Tiếp theo</button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 text-sm justify-center">
              {/* Các nút Cài đặt (Rút gọn hiển thị cơ bản) */}
              <div className="flex items-center gap-2 bg-[#101a2a] text-white p-2 rounded-lg border border-gray-700">
                <span className="font-bold text-xs">Đọc C.Hỏi</span>
                <input type="checkbox" checked={settings.autoPlayQ} onChange={(e) => updateSetting('autoPlayQ', e.target.checked)} className="w-4 h-4"/>
              </div>
              <div className="flex items-center gap-2 bg-[#2a1010] text-white p-2 rounded-lg border border-gray-700">
                <span className="font-bold text-xs">Đọc Đ.Án</span>
                <input type="checkbox" checked={settings.autoPlayAns} onChange={(e) => updateSetting('autoPlayAns', e.target.checked)} className="w-4 h-4"/>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'import' && (
          <div className="flex-1 flex flex-col px-4 py-4 max-w-md mx-auto w-full overflow-y-auto">
             <h2 className="text-xl font-bold mb-2 border-b border-gray-700 pb-2">Thêm Flashcard lên Supabase</h2>
             <input type="text" value={importDeckName} onChange={(e) => setImportDeckName(e.target.value)} placeholder="Tên bài (VD: Bài 2)" className="w-full bg-white dark:bg-[#1c1c1e] border border-gray-700 p-3 rounded-xl mb-3 outline-none" />
             <textarea rows="6" value={importText} onChange={handleImportChange} placeholder="ăn&#9;食べる&#9;taberu" className="w-full bg-white dark:bg-[#1c1c1e] border border-gray-700 p-3 rounded-xl outline-none font-mono text-sm" />
             {importPreview.length > 0 && (
                <div className="mt-4">
                   <h3 className="text-sm font-bold text-green-500 mb-2">Preview ({importPreview.length} thẻ):</h3>
                   <button onClick={submitImport} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl">Lưu vào Database</button>
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
}