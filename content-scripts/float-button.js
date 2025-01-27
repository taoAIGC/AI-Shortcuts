// 创建浮动按钮和对话框
async function createFloatButton() {
  console.log('脚本开始加载');
  
  // 获取当前语言的翻译
  const i18n = {
    inputPlaceholder: await chrome.i18n.getMessage('inputPlaceholder'),
    startCompare: await chrome.i18n.getMessage('startCompare')
  };
  
  // 创建整体容器
  const container = document.createElement('div');
  container.className = 'multi-ai-container';

  // 创建浮动按钮
  const button = document.createElement('div');
  button.className = 'multi-ai-float-button';
  
  // 添加主按钮图标
  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('icons/icon48.png');
  button.appendChild(img);

  // 创建对话框
  const dialog = document.createElement('div');
  dialog.className = 'multi-ai-dialog';
  dialog.innerHTML = `
    <input 
      type="text" 
      placeholder="${i18n.inputPlaceholder}" 
      id="multiAiInput"
      autocomplete="off"
    >
    <div class="site-list"></div>
    <div class="buttons">
      <button class="search-button">
        ${i18n.startCompare}
      </button>
      <img src="${chrome.runtime.getURL('icons/more_32.png')}" class="more-icon">
    </div>
  `;

  // 创建关闭按钮
  const closeBtn = document.createElement('div');
  closeBtn.className = 'close-button';
  closeBtn.innerHTML = '×';

  // 修改关闭按钮的点击事件处理
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();  // 阻止事件冒泡
    e.preventDefault();   // 阻止默认行为
    container.remove();   // 移除整个容器
    return false;        // 确保事件不会继续传播
  });

  // 将关闭按钮添加到按钮中
  button.appendChild(closeBtn);

  // 按钮的点击事件
  button.addEventListener('click', () => {
    if (!hasMoved) {  // 只有在没有拖动的情况下才触发点击事件
      dialog.classList.toggle('show');
      if (dialog.classList.contains('show')) {
        const input = dialog.querySelector('#multiAiInput');
        if (input) input.focus();
      }
    }
  });

  // 检测操作系统类型
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  // 设置提示文本
  const shortcutText = isMac ? '⌘+M' : 'Ctrl+M';
  // 添加提示框
  button.addEventListener('mouseenter', () => {
    const tooltip = document.createElement('div');
    tooltip.className = 'multi-ai-tooltip';
    tooltip.textContent = shortcutText;
    button.appendChild(tooltip);
    setTimeout(() => {
      if (tooltip && tooltip.parentNode === button) {
        tooltip.remove();
      }
    }, 500);
  });

  // 创建图标容器
  const iconContainer = document.createElement('div');
  iconContainer.className = 'icon-container';

  // 创建设置图标
  const settingIcon = document.createElement('img');
  settingIcon.src = chrome.runtime.getURL('icons/extension-setting.png');
  settingIcon.className = 'bottom-icon setting-icon';
  settingIcon.title = '设置';

  // 通过发送消息来打开设置页面
  settingIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ action: 'openOptionsPage' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
      }
    });
  });

  // 创建反馈图标
  const feedbackIcon = document.createElement('img');
  feedbackIcon.src = chrome.runtime.getURL('icons/feedback.png');
  feedbackIcon.className = 'bottom-icon feedback-icon';
  feedbackIcon.title = '反馈';

  // 添加图标到容器
  iconContainer.appendChild(settingIcon);
  iconContainer.appendChild(feedbackIcon);

  // 将按钮和图标容器添加到整体容器中
  container.appendChild(button);
  container.appendChild(iconContainer);

  // 添加到页面
  document.body.appendChild(container);
  document.body.appendChild(dialog);

  // 加载站点列表
  loadSites();
  
  // 初始化时就设置具体的 top 值，而不是用 transform
  const initialTop = window.innerHeight / 2 - container.offsetHeight / 2;
  container.style.top = `${initialTop}px`;
  container.style.transform = 'none';  // 移除 transform

  // 添加拖动功能
  let isDragging = false;
  let startY = 0;
  let startTop = 0;
  let hasMoved = false;

  // 鼠标按下
  button.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDragging = true;
    hasMoved = false;  // 重置移动标记
    startY = e.clientY;
    const rect = container.getBoundingClientRect();
    startTop = rect.top;
    container.classList.add('dragging');
  });

  // 鼠标移动
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    hasMoved = true;  // 标记发生了移动
    const deltaY = e.clientY - startY;
    const newTop = startTop + deltaY;
    
    const maxTop = window.innerHeight - container.offsetHeight;
    const boundedTop = Math.max(0, Math.min(newTop, maxTop));
    
    container.style.top = `${boundedTop}px`;
    container.style.transform = 'none';
  });

  // 鼠标松开
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      container.classList.remove('dragging');
    }
  });

  // 防止拖动时选中文本
  button.addEventListener('selectstart', (e) => e.preventDefault());

  // 添加快捷键监听
  document.addEventListener('keydown', (e) => {
    // 检查是否按下 Ctrl+M (Windows) 或 Command+M (Mac)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
      e.preventDefault(); // 阻止默认行为
      dialog.classList.toggle('show');
      if (dialog.classList.contains('show')) {
        const input = dialog.querySelector('#multiAiInput');
        input.focus();
      }
    }
  });

  // 点击 more-icon 打开设置页面
  const moreIcon = dialog.querySelector('.more-icon');
  moreIcon.addEventListener('click', (e) => {
    e.stopPropagation();
    chrome.runtime.sendMessage({ action: 'openOptionsPage' });
  });
  
  // 点击外部关闭对话框
  document.addEventListener('click', (e) => {
    if (!dialog.contains(e.target) && !button.contains(e.target)) {
      dialog.classList.remove('show');
    }
  });
  
  // 绑定按钮事件
  const searchButton = dialog.querySelector('.search-button');
  const input = dialog.querySelector('#multiAiInput');
  
  searchButton.addEventListener('click', () => {
    console.log('searchButton clicked');
    const query = input.value.trim();
    if (!query) {
      input.classList.add('shake');
      setTimeout(() => {
        input.classList.remove('shake');
      }, 500);  // 500ms 后移除闪烁效果
      return;
    }
    console.log('query:', query);
    const selectedSites = getSelectedSites();
    console.log('selectedSites:', selectedSites);
    if (selectedSites.length === 0) return;
    
    chrome.runtime.sendMessage({
      action: 'processQuery',
      query: query,
      sites: selectedSites
    });
  });
}

// 加载站点列表
async function loadSites() {
  console.log('loadSites');
  const { sites } = await chrome.storage.sync.get('sites');
  const visibleSites = sites.filter(site => !site.hidden);
  const siteList = document.querySelector('.multi-ai-dialog .site-list');
  
  visibleSites.forEach(site => {
    const div = document.createElement('div');
    div.className = 'site-item';
    div.innerHTML = `
      <input type="checkbox" 
             id="site_${site.name}" 
             ${site.enabled ? 'checked' : ''}>
      <label for="site_${site.name}">${site.name}</label>
      <img src="${chrome.runtime.getURL('icons/发送-24.png')}" 
           class="send-icon"
           title="单独使用此AI">
    `;
    siteList.appendChild(div);
    // 为发送图标添加点击事件
    const sendIcon = div.querySelector('.send-icon');
    sendIcon.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      const input = document.querySelector('#multiAiInput');  // 获取输入框元素
      const query = input.value.trim();
      if(!query) {
        input.classList.add('shake');
        setTimeout(() => {
          input.classList.remove('shake');
        }, 500);  // 500ms 后移除闪烁效果
        return;
      }
      
      const siteName = site.name;
      
      // 发送消息到 background
      chrome.runtime.sendMessage({
        action: 'singleSiteSearch',
        query: query,
        siteName: siteName
      });
    });

    // 如果需要监听状态变化
    document.querySelector(`#site_${site.name}`).addEventListener('change', function(e) {
      // 不需要手动修改 checked，浏览器会自动处理
      console.log(`${site.name} checked状态: ${e.target.checked}`);
    });

  });
}

// 获取选中的站点
function getSelectedSites() {
  const checkboxes = document.querySelectorAll('.multi-ai-dialog .site-item input[type="checkbox"]');
  
  // 调试代码，检查每个复选框的状态
  checkboxes.forEach(cb => {
    console.log(`${cb.id}: checked = ${cb.checked}`);
  });

  return Array.from(checkboxes)
    .filter(cb => {
      // 确保只返回真正被选中的复选框
      return cb.checked === true;  // 显式比较
    })
    .map(cb => cb.id.replace('site_', ''));
}

// 初始化
createFloatButton(); 