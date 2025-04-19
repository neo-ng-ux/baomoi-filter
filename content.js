// Lưu trữ cấu hình để tránh truy vấn lặp lại
let cachedConfig = null;
// Theo dõi các phần tử tin tức đã xử lý
let processedItems = new WeakSet();

// Hàm lấy cấu hình từ storage, sử dụng Promise để xử lý bất đồng bộ
function getConfig() {
  if (cachedConfig) return Promise.resolve(cachedConfig);
  
  return new Promise(resolve => {
    chrome.storage.sync.get(
      {
        keywords: [],
        sources: [],
        selector: '.bm-card',
        opacity: '0.2'
      },
      items => {
        cachedConfig = items;
        resolve(items);
      }
    );
  });
}

// Hàm kiểm tra xem một mục tin có nên ẩn không và trả về lý do
function shouldHideItem(item, keywords, sources) {
  if (keywords.length === 0 && sources.length === 0) return { hide: false };
  
  const textContent = item.innerText.toLowerCase();
  
  // Kiểm tra từ khóa
  if (keywords.length > 0) {
    const matchedKeywords = keywords.filter(keyword => 
      textContent.includes(keyword.toLowerCase())
    );
    
    if (matchedKeywords.length > 0) {
      return { 
        hide: true, 
        reason: 'keyword', 
        matches: matchedKeywords 
      };
    }
  }
  
  // Kiểm tra nguồn tin
  if (sources.length > 0) {
    const sourceElement = item.querySelector('a.bm-card-source');
    if (sourceElement) {
      const sourceName = (sourceElement.getAttribute('title') || sourceElement.innerText).toLowerCase();
      const matchedSources = sources.filter(source => 
        sourceName.includes(source.toLowerCase())
      );
      
      if (matchedSources.length > 0) {
        return { 
          hide: true, 
          reason: 'source', 
          matches: matchedSources,
          sourceName: sourceName
        };
      }
    }
  }
  
  return { hide: false };
}

// Hàm trích xuất tiêu đề tin tức
function getNewsTitle(item) {
  const titleElement = item.querySelector('h3, h2, .title');
  return titleElement ? titleElement.innerText.trim() : 'Không có tiêu đề';
}

// Áp dụng hiệu ứng ẩn cho các mục tin
function applyHidingEffect(item, opacity, hideResult) {
  // Log thông tin về việc ẩn tin tức
  const title = getNewsTitle(item);
  console.log(`%c🚫 "${title}"`, 'color: #e74c3c; font-weight: bold');
  if (hideResult.reason === 'keyword') {
    console.log(`-- từ khóa: ${hideResult.matches.join(', ')}`);
  } else if (hideResult.reason === 'source') {
    console.log(`-- nguồn: ${hideResult.matches.join(', ')}`);
  }
  
  // Áp dụng hiệu ứng ẩn
  if (opacity === '0') {
    item.style.display = 'none';
  } else {
    item.style.opacity = opacity;
    // Thêm transition để hiệu ứng mượt mà hơn
    item.style.transition = 'opacity 0.3s ease';
  }
}

// Xử lý từng phần tử tin tức
async function processNewsItem(item) {
  // Kiểm tra xem phần tử đã được xử lý chưa
  if (processedItems.has(item)) return;
  
  // Đánh dấu phần tử đã được xử lý
  processedItems.add(item);
  
  try {
    const { keywords, sources, opacity } = await getConfig();
    
    // Nếu không có từ khóa và nguồn nào được thiết lập, không cần lọc
    if (keywords.length === 0 && sources.length === 0) return;
    
    // Kiểm tra và áp dụng bộ lọc
    const hideResult = shouldHideItem(item, keywords, sources);
    if (hideResult.hide) {
      applyHidingEffect(item, opacity, hideResult);
    }
  } catch (error) {
    console.error('Error in processNewsItem:', error);
  }
}

// Hàm chính để ẩn các mục tin
async function hideNewsItems() {
  try {
    const { keywords, sources, selector, opacity } = await getConfig();
    
    // Nếu không có từ khóa và nguồn nào được thiết lập, không cần lọc
    if (keywords.length === 0 && sources.length === 0) return;
    
    console.log('%c=== Bắt đầu quá trình lọc tin tức ===', 'color: #3498db; font-weight: bold');
    console.log(`Từ khóa bị chặn: ${keywords.length > 0 ? keywords.join(', ') : 'Không có'}`);
    console.log(`Nguồn bị chặn: ${sources.length > 0 ? sources.join(', ') : 'Không có'}`);
    
    // Lấy danh sách các phần tử tin tức dựa theo selector
    const newsItems = document.querySelectorAll(selector);
    if (!newsItems || newsItems.length === 0) {
      console.log('Không tìm thấy tin tức nào với selector:', selector);
      return;
    }
    
    console.log(`Đã tìm thấy ${newsItems.length} tin tức để kiểm tra`);
    
    // Reset opacity của tất cả các mục tin
    newsItems.forEach(item => {
      item.style.opacity = '1';
      if (item.style.display === 'none') {
        item.style.display = '';
      }
    });
    
    let hiddenCount = 0;
    
    // Áp dụng hiệu ứng ẩn cho các mục tin phù hợp
    for (const item of newsItems) {
      // Đánh dấu phần tử đã được xử lý
      processedItems.add(item);
      
      const hideResult = shouldHideItem(item, keywords, sources);
      if (hideResult.hide) {
        applyHidingEffect(item, opacity, hideResult);
        hiddenCount++;
      }
    }
    
    console.log(`%c=== Kết thúc lọc: Đã ẩn ${hiddenCount}/${newsItems.length} tin tức ===`, 'color: #2ecc71; font-weight: bold');
  } catch (error) {
    console.error('Error in hideNewsItems:', error);
  }
}

// Tìm container chứa tin tức để theo dõi
function findNewsContainer() {
  // Thử tìm các container phổ biến
  const selectors = [
    '.news-container', 
    '.feed-container', 
    '.news-feed',
    '.content-feed',
    'main', 
    '#content',
    '.content-area'
  ];
  
  for (const selector of selectors) {
    const container = document.querySelector(selector);
    if (container) return container;
  }
  
  // Nếu không tìm thấy container cụ thể, thử tìm container chứa các phần tử tin tức
  const config = cachedConfig || { selector: '.bm-card' };
  const newsItem = document.querySelector(config.selector);
  if (newsItem) {
    // Tìm parent node gần nhất có thể là container
    let parent = newsItem.parentElement;
    while (parent && parent !== document.body) {
      // Kiểm tra xem parent có chứa nhiều tin tức không
      if (parent.querySelectorAll(config.selector).length > 1) {
        return parent;
      }
      parent = parent.parentElement;
    }
  }
  
  // Fallback về body nếu không tìm thấy
  return document.body;
}

// Xử lý các node mới được thêm vào
function handleNewNodes(addedNodes) {
  if (!cachedConfig) return;
  
  const selector = cachedConfig.selector;
  
  // Lọc ra các node là Element
  const elementNodes = Array.from(addedNodes).filter(node => node.nodeType === 1);
  
  for (const node of elementNodes) {
    // Kiểm tra nếu node là phần tử tin tức
    if (node.matches && node.matches(selector)) {
      processNewsItem(node);
    }
    
    // Kiểm tra các phần tử tin tức con
    if (node.querySelectorAll) {
      const newsItems = node.querySelectorAll(selector);
      for (const item of newsItems) {
        processNewsItem(item);
      }
    }
  }
}

// Sử dụng throttle để tránh gọi hideNewsItems quá nhiều lần
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Kiểm tra các phần tử tin tức mới định kỳ
function checkForNewItems() {
  if (!cachedConfig) return;
  
  const newsItems = document.querySelectorAll(cachedConfig.selector);
  let newItemsCount = 0;
  
  for (const item of newsItems) {
    if (!processedItems.has(item)) {
      newItemsCount++;
      processNewsItem(item);
    }
  }
  
  if (newItemsCount > 0) {
    console.log(`Đã phát hiện và xử lý ${newItemsCount} phần tử tin tức mới`);
  }
}

// Thiết lập MutationObserver để theo dõi thay đổi DOM
const setupMutationObserver = () => {
  const throttledHideNewsItems = throttle(hideNewsItems, 300);
  const throttledCheckNewItems = throttle(checkForNewItems, 300);
  
  const observer = new MutationObserver((mutationsList) => {
    let hasNewNodes = false;
    
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        hasNewNodes = true;
        handleNewNodes(mutation.addedNodes);
      }
    }
    
    if (hasNewNodes) {
      console.log('Phát hiện thay đổi DOM, kiểm tra tin tức mới...');
      // Sử dụng setTimeout để đảm bảo DOM đã được cập nhật hoàn toàn
      setTimeout(throttledCheckNewItems, 100);
    }
  });
  
  // Tìm container chứa tin tức để theo dõi
  const newsContainer = findNewsContainer();
  console.log('Thiết lập theo dõi thay đổi DOM trên:', newsContainer);
  
  // Thiết lập observer với cấu hình phù hợp
  observer.observe(newsContainer, { 
    childList: true, 
    subtree: true,
    attributes: false,
    characterData: false
  });
  
  // Thiết lập kiểm tra định kỳ để bắt các tin tức mới có thể bị bỏ qua
  setInterval(checkForNewItems, 2000);
  
  return observer;
};

// Khởi tạo extension
async function initExtension() {
  try {
    // Lấy cấu hình
    await getConfig();
    
    // Thực hiện lọc ban đầu
    await hideNewsItems();
    
    // Thiết lập observer sau khi đã có cấu hình
    const observer = setupMutationObserver();
    
    // Lắng nghe thay đổi cấu hình
    chrome.storage.onChanged.addListener(changes => {
      console.log('Cấu hình đã thay đổi, cập nhật lại bộ lọc...');
      cachedConfig = null; // Reset cache khi cấu hình thay đổi
      getConfig().then(() => hideNewsItems());
    });
    
    console.log('Extension đã được khởi tạo thành công');
  } catch (error) {
    console.error('Lỗi khi khởi tạo extension:', error);
  }
}

// Khởi chạy extension khi trang đã tải
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initExtension);
} else {
  initExtension();
}
