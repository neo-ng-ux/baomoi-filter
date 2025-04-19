document.addEventListener('DOMContentLoaded', restoreOptions);

// Lấy các phần tử DOM một lần và lưu vào biến
const elements = {
  keywords: document.getElementById('keywords'),
  sources: document.getElementById('sources'),
  selector: document.getElementById('selector'),
  opacity: document.getElementById('opacitySlider'),
  save: document.getElementById('save'),
  status: document.getElementById('status')
};

// Thêm sự kiện cho nút lưu
elements.save.addEventListener('click', saveOptions);

// Hàm tiện ích để xử lý chuỗi đầu vào
function processInputArray(input) {
  return input.split('\n').map(item => item.trim()).filter(item => item);
}

// Sử dụng async/await để xử lý bất đồng bộ
async function saveOptions() {
  try {
    const options = {
      keywords: processInputArray(elements.keywords.value),
      sources: processInputArray(elements.sources.value),
      selector: elements.selector.value || '.bm-card',
      opacity: String(elements.opacity.value)
    };

    // Sử dụng Promise để xử lý chrome.storage.sync.set
    await new Promise(resolve => chrome.storage.sync.set(options, resolve));
    
    // Hiển thị thông báo
    elements.status.textContent = 'Đã lưu!';
    setTimeout(() => elements.status.textContent = '', 1500);
    console.log('Options saved:', options);
    
    // Tải lại tab hiện tại
    const tabs = await new Promise(resolve => 
      chrome.tabs.query({active: true, currentWindow: true}, resolve)
    );
    if (tabs && tabs[0]) {
      chrome.tabs.reload(tabs[0].id);
    }
  } catch (error) {
    console.error('Error saving options:', error);
    elements.status.textContent = 'Lỗi khi lưu!';
    setTimeout(() => elements.status.textContent = '', 1500);
  }
}

async function restoreOptions() {
  try {
    const defaults = {
      keywords: [],
      sources: [],
      selector: '.bm-card',
      opacity: '0.2'
    };

    // Sử dụng Promise để xử lý chrome.storage.sync.get
    const items = await new Promise(resolve => 
      chrome.storage.sync.get(defaults, resolve)
    );
    
    elements.keywords.value = items.keywords.join('\n');
    elements.sources.value = items.sources.join('\n');
    elements.selector.value = items.selector;
    elements.opacity.value = items.opacity;
  } catch (error) {
    console.error('Error restoring options:', error);
  }
}
