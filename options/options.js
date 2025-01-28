let sites = [];
console.log('系统默认站点设置:', defaultSites);


// 加载保存的配置
function loadConfig() {
  chrome.storage.sync.get('sites', function(data) {
    sites = data.sites || window.defaultSites;
    console.log('加载的sites:', sites);
    initializeSiteConfigs();
  });
}

// 获取翻译文本
function getMessage(key, substitutions = null) {
  return chrome.i18n.getMessage(key, substitutions);
}

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
    const message = chrome.i18n.getMessage(key);
    if (message) {
      element.textContent = message;
    }
  });
}

// 等待 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 加载完成');
  initializeSiteConfigs();
  initializeI18n();
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

async function initializeSiteConfigs() {
  try {
    // 1. 获取存储的站点配置
    const { sites = [] } = await chrome.storage.sync.get('sites');
    console.log('获取到的站点数组:', sites);

    // 2. 过滤非隐藏的站点，并分成两组
    const visibleSites = sites.filter(site => site.hidden === false);
    const standaloneSites = visibleSites.filter(site => !site.supportIframe);
    const collectionSites = visibleSites.filter(site => site.supportIframe);
    
    console.log('独立模式站点:', standaloneSites);
    console.log('合集模式站点:', collectionSites);

    // 3. 获取两个容器
    const standaloneContainer = document.getElementById('standaloneSiteConfigs');
    const collectionContainer = document.getElementById('collectionSiteConfigs');
    
    // 4. 清空容器
    standaloneContainer.innerHTML = '';
    collectionContainer.innerHTML = '';

    // 5. 渲染独立模式站点
    standaloneSites.forEach((site, index) => {
      const siteDiv = document.createElement('div');
      siteDiv.className = 'site-config';
      siteDiv.innerHTML = `
        <div class="site-header">
          <label class="switch">
            <input type="checkbox" class="enable-toggle"
              ${site.enabled ? 'checked' : ''} 
              data-index="${index}"
              data-mode="standalone">
            <span class="slider round"></span>
          </label>
          <span class="site-name-display">${site.name}</span>
        </div>
      `;
      standaloneContainer.appendChild(siteDiv);
    });

    // 6. 渲染合集模式站点
    collectionSites.forEach((site, index) => {
      const siteDiv = document.createElement('div');
      siteDiv.className = 'site-config';
      siteDiv.innerHTML = `
        <div class="site-header">
          <label class="switch">
            <input type="checkbox" class="enable-toggle"
              ${site.enabled ? 'checked' : ''} 
              data-index="${index}"
              data-mode="collection">
            <span class="slider round"></span>
          </label>
          <span class="site-name-display">${site.name}</span>
        </div>
      `;
      collectionContainer.appendChild(siteDiv);
    });

    // 7. 添加切换事件监听器
    document.querySelectorAll('.enable-toggle').forEach(toggle => {
      toggle.addEventListener('change', async function() {
        const mode = this.getAttribute('data-mode');
        const index = parseInt(this.getAttribute('data-index'));
        const siteList = mode === 'standalone' ? standaloneSites : collectionSites;
        const site = siteList[index];
        
        try {
          // 更新站点状态
          const allSites = [...sites];
          const siteIndex = allSites.findIndex(s => s.name === site.name);
          if (siteIndex !== -1) {
            allSites[siteIndex] = {
              ...allSites[siteIndex],
              enabled: this.checked
            };
            await chrome.storage.sync.set({ sites: allSites });
            console.log('保存的站点数组:', allSites);
            if (chrome.runtime.lastError) {
              showToast(chrome.i18n.getMessage("saveFailed", [chrome.runtime.lastError.message]));
              return;
            }
            showToast(chrome.i18n.getMessage("saveSuccess"));
            
            // 通知background更新配置
            chrome.runtime.sendMessage({ 
              action: 'configUpdated', 
              sites: allSites 
            });

          }
        } catch (error) {
          console.error('保存设置失败:', error);
          showToast('保存失败');
          // 恢复复选框状态
          this.checked = !this.checked;
        }
      });
    });

  } catch (error) {
    console.error('初始化站点配置失败:', error);
    showToast('加载配置失败');
  }
} 