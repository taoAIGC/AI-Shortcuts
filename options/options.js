let sites = [];
let currentButtonConfig = null;
console.log('系统默认站点设置:', defaultSites);


// 加载保存的配置
function loadConfig() {
  chrome.storage.sync.get('sites', function(data) {
    sites = data.sites || window.defaultSites;
    console.log('加载的sites:', sites);
    initializeSiteConfigs();
  });

  chrome.storage.sync.get('buttonConfig', function(data) {
    currentButtonConfig = data.buttonConfig || window.defaultButtonConfig;
    console.log('加载的buttonConfig:', currentButtonConfig);
    initializeButtonConfigs();
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

// 初始化快捷入口配置
async function initializeButtonConfigs() {
  try {
    // 获取存储的按钮配置
    let { buttonConfig } = await chrome.storage.sync.get(['buttonConfig']);
    let currentConfig = buttonConfig || {
      floatButton: true,
      selectionSearch: true,
      contextMenu: true,
      searchEngine: true
    };

    console.log('初始配置:', currentConfig);

    // 配置项定义
    const configItems = [
      { id: 'floatButtonSwitch', configKey: 'floatButton', name: '悬浮按钮' },
      { id: 'selectionSearchSwitch', configKey: 'selectionSearch', name: '划词搜索' },
      { id: 'contextMenuSwitch', configKey: 'contextMenu', name: '右键菜单' },
      { id: 'searchEngineSwitch', configKey: 'searchEngine', name: '搜索引擎' }
    ];

    const buttonContainer = document.getElementById('buttonSiteConfigs');
    if (!buttonContainer) return;
    
    buttonContainer.innerHTML = '';

    configItems.forEach(item => {
      const configDiv = document.createElement('div');
      configDiv.className = 'site-config';
      configDiv.innerHTML = `
        <div class="site-header">
          <label class="switch">
            <input type="checkbox" id="${item.id}"
              ${currentConfig[item.configKey] ? 'checked' : ''}>
            <span class="slider round"></span>
          </label>
          <span class="site-name-display">${item.name}</span>
        </div>
      `;
      buttonContainer.appendChild(configDiv);

      const switchElement = configDiv.querySelector(`#${item.id}`);
      switchElement.addEventListener('change', async (e) => {
        // 每次更改前先获取最新的配置
        const { buttonConfig: latestConfig } = await chrome.storage.sync.get(['buttonConfig']);
        const updatedConfig = {
          ...(latestConfig || currentConfig),  // 使用最新的配置作为基础
          [item.configKey]: e.target.checked
        };
        
        await chrome.storage.sync.set({ buttonConfig: updatedConfig });
        // 更新当前配置
        currentConfig = updatedConfig;
        console.log(`已更新${item.name}配置:`, updatedConfig);
        if (chrome.runtime.lastError) {
          showToast(chrome.i18n.getMessage("saveFailed", [chrome.runtime.lastError.message]));
          return;
        }
        showToast(chrome.i18n.getMessage("saveSuccess"));
        
      });
    });

  } catch (error) {
    console.error('初始化按钮配置失败:', error);
  }
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

// 在页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
  initializeI18n();
  loadConfig();
}); 