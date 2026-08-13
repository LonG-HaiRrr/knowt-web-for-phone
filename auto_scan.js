const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const listFile = path.join(dataDir, 'list.json');

function scanDirectory() {
    // Đọc toàn bộ file trong thư mục data/
    fs.readdir(dataDir, (err, files) => {
        if (err) return console.error('Lỗi đọc thư mục:', err);
        
        // Lọc ra các file .json (bỏ qua file list.json)
        const decks = files
            .filter(f => f.endsWith('.json') && f !== 'list.json')
            .map(f => {
                // Đọc thông tin thời gian của file để phục vụ sắp xếp
                const stats = fs.statSync(path.join(dataDir, f));
                return {
                    file: `data/${f}`,
                    name: f.replace('.json', ''), // Lấy tên bài làm hiển thị (VD: bai1)
                    birthtime: stats.birthtimeMs, // Ngày tạo file
                    mtime: stats.mtimeMs          // Ngày sửa file gần nhất
                };
            });
            
        // Ghi lại vào file list.json
        fs.writeFileSync(listFile, JSON.stringify(decks, null, 2));
        console.log(`[${new Date().toLocaleTimeString()}] Đã cập nhật ${decks.length} bài học vào list.json`);
    });
}

// Chạy ngay lần đầu, sau đó lặp lại mỗi 10 giây
scanDirectory();
setInterval(scanDirectory, 10000);