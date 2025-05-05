document.addEventListener('DOMContentLoaded', function() {
  // 初始化多语言支持
  function initializeI18n() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = chrome.i18n.getMessage(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      element.placeholder = chrome.i18n.getMessage(key);
    });
  }

  // 初始化多语言
  initializeI18n();

  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');

  // 自动聚焦到输入框
  if (searchInput) {
    searchInput.focus();
    
    // 将光标移到文本末尾
    const length = searchInput.value.length;
    searchInput.setSelectionRange(length, length);
  }

  // 执行搜索
  function performSearch() {
    const query = searchInput.value.trim();
    if (query) {
      // 发送消息到 background script
      chrome.runtime.sendMessage({
        action: 'createComparisonPage',  // 使用与 popup 相同的 action
        query: query
      });
    }
  }

  // 绑定搜索按钮点击事件
  if (searchButton) {
    searchButton.addEventListener('click', performSearch);
  }

  // 绑定回车键
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        performSearch();
      }
    });
  }

  // 配置站点链接
  try {
    const configLink = document.getElementById('openSettings');
    console.log('configLink:', configLink);
    
    if (configLink) {
      configLink.addEventListener('click', function(e) {
        e.preventDefault();
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        } else {
          window.open(chrome.runtime.getURL('options/options.html'));
        }
      });
    }
  } catch (error) {
    console.error('处理配置站点入口时出错:', error);
  }
}); 