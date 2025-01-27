let sites = [];
console.log('系统默认站点设置:', defaultSites);


// 加载保存的配置
function loadConfig() {
  chrome.storage.sync.get('sites', function(data) {
    sites = data.sites || window.defaultSites;
    console.log('加载的sites:', sites);
    renderSites();
  });
}

// 获取翻译文本
function getMessage(key, substitutions = null) {
  return chrome.i18n.getMessage(key, substitutions);
}

// 渲染站点配置
function renderSites() {
  const container = document.getElementById('siteConfigs');
  container.innerHTML = '';
  
  // 设置标题
  document.querySelector('h1').textContent = getMessage('configTitle');
    
  
  // 4. 过滤并显示非隐藏的站点
  const visibleSites = sites.filter(site => site.hidden === false);
  console.log('过滤后的站点数组:', visibleSites);

  // 5. 渲染站点列表
  visibleSites.forEach((site, index) => {
    const siteDiv = document.createElement('div');
    siteDiv.className = 'site-config';
    siteDiv.innerHTML = `
      <div class="site-header">
        <label class="switch">
          <input type="checkbox" class="enable-toggle"
            ${site.enabled ? 'checked' : ''} 
            data-index="${index}">
          <span class="slider round"></span>
        </label>
        <span class="site-name-display">${site.name}</span>
      </div>
    `;
    container.appendChild(siteDiv);
  });
  
  // 6. 保存合并后的配置
  saveConfig();
}

// 使用事件委托处理开关事件
document.getElementById('siteConfigs').addEventListener('change', function(e) {
  const target = e.target;
  if (target.classList.contains('enable-toggle')) {
    const index = parseInt(target.dataset.index);
    // 使用相同的过滤逻辑
    const visibleSites = sites.filter(site => site.hidden === false);
    const siteToUpdate = visibleSites[index];
    
    // 更新原始数组中的站点状态
    const originalIndex = sites.findIndex(s => s.name === siteToUpdate.name);
    if (originalIndex !== -1) {
      sites[originalIndex].enabled = target.checked;
      saveConfig();
    }
  }
});

// 保存配置
function saveConfig() {
  chrome.storage.sync.set({ sites: sites }, function() {
    if (chrome.runtime.lastError) {
      showToast(chrome.i18n.getMessage("saveFailed", [chrome.runtime.lastError.message]));
      return;
    }
    showToast(chrome.i18n.getMessage("saveSuccess"));
    
    // 通知background更新配置
    chrome.runtime.sendMessage({ 
      action: 'configUpdated', 
      sites: sites 
    });

  });
}

// 显示吐司提示
function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.classList.remove('show');
  void toast.offsetWidth;
  
  toast.textContent = message;
  toast.classList.add('show');
  
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }
  
  toast.timeoutId = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// 初始化页面文本
function initializeI18n() {
  // 更新页面标题
  document.title = chrome.i18n.getMessage("appName");

  
  // 更新所有带有 data-i18n 属性的元素
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = chrome.i18n.getMessage(key);
  });
}

// 等待 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 加载完成');
  loadConfig();
});

// 显示消息
function showMessage(message, isError = false) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${isError ? 'error' : 'success'}`;
  messageElement.textContent = message;
  
  document.body.appendChild(messageElement);
  
  setTimeout(() => {
    messageElement.remove();
  }, 3000);
}

// 在页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  initializeI18n();
  loadConfig();
}); 