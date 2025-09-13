// 删除不再需要的 getCurrentDomain 函数

// 通用的配置化站点处理器 - 基于三步流程的标准化处理
async function executeSiteHandler(query, handlerConfig) {
  if (!handlerConfig || !handlerConfig.steps) {
    console.error('无效的处理器配置');
    return;
  }

  console.log('开始执行配置化处理器，步骤数:', handlerConfig.steps.length);

  for (let i = 0; i < handlerConfig.steps.length; i++) {
    const step = handlerConfig.steps[i];
    console.log(`执行步骤 ${i + 1}:`, step.action);

    try {
      switch (step.action) {
        case 'click':
          await executeClick(step);
          break;
        case 'focus':
          await executeFocus(step);
          break;
        case 'setValue':
          await executeSetValue(step, query);
          break;
        case 'triggerEvents':
          await executeTriggerEvents(step);
          break;
        case 'sendKeys':
          await executeSendKeys(step, query);
          break;
        case 'wait':
          await executeWait(step);
          break;
        case 'custom':
          await executeCustom(step, query);
          break;
        default:
          console.warn('未知的步骤类型:', step.action);
      }

      // 步骤间等待
      if (step.waitAfter) {
        await new Promise(resolve => setTimeout(resolve, step.waitAfter));
      }
    } catch (error) {
      console.error(`步骤 ${i + 1} 执行失败:`, error);
      if (step.required !== false) { // 默认必需步骤
        throw error;
      }
    }
  }

  console.log('配置化处理器执行完成');
}

// 执行点击操作
async function executeClick(step) {
  let element = null;
  let foundSelector = null;
  
  // 支持多个选择器
  const selectors = Array.isArray(step.selector) ? step.selector : [step.selector];
  
  for (const selector of selectors) {
    element = document.querySelector(selector);
    if (element) {
      foundSelector = selector;
      break;
    }
  }
  
  if (!element) {
    throw new Error(`未找到任何元素，尝试的选择器: ${selectors.join(', ')}`);
  }
  
  if (step.condition) {
    // 检查条件
    const conditionElement = document.querySelector(step.condition.selector);
    if (!conditionElement) {
      console.log(`条件元素不存在，跳过点击: ${step.condition.selector}`);
      return;
    }
  }

  element.click();
  console.log('点击元素:', foundSelector);
}

// 执行聚焦操作
async function executeFocus(step) {
  let element = null;
  let foundSelector = null;
  
  // 支持多个选择器
  const selectors = Array.isArray(step.selector) ? step.selector : [step.selector];
  
  for (const selector of selectors) {
    element = document.querySelector(selector);
    if (element) {
      foundSelector = selector;
      break;
    }
  }
  
  if (!element) {
    throw new Error(`未找到任何元素，尝试的选择器: ${selectors.join(', ')}`);
  }
  
  element.focus();
  console.log('聚焦元素:', foundSelector);
}

// 执行设置值操作
async function executeSetValue(step, query) {
  let element = null;
  let foundSelector = null;
  
  // 支持多个选择器
  const selectors = Array.isArray(step.selector) ? step.selector : [step.selector];
  
  for (const selector of selectors) {
    element = document.querySelector(selector);
    if (element) {
      foundSelector = selector;
      break;
    }
  }
  
  if (!element) {
    throw new Error(`未找到任何元素，尝试的选择器: ${selectors.join(', ')}`);
  }

  if (step.inputType === 'contenteditable') {
    // 处理 contenteditable 元素
    const pElement = element.querySelector('p');
    if (pElement) {
      pElement.innerText = query;
    } else {
      element.innerHTML = '<p></p>';
      element.querySelector('p').innerText = query;
    }
  } else if (step.inputType === 'special') {
    // 处理特殊输入方式
    if (step.customSetValue === 'wenxin') {
      const p = document.querySelector('p.yc-editor-paragraph');
      if (p) {
        p.innerHTML = '';
      }
      const span = document.createElement('span');
      span.setAttribute('data-lexical-text', 'true');
      span.textContent = query;
      p.appendChild(span);
    } else if (step.customSetValue === 'poe') {
      // POE 特殊处理
      const growingTextArea = document.querySelector('.GrowingTextArea_growWrap__im5W3');
      if (growingTextArea) {
        growingTextArea.setAttribute('data-replicated-value', query);
        const textarea = growingTextArea.querySelector('textarea');
        if (textarea) {
          textarea.value = query;
        }
      }
    }
  } else {
    // 普通输入框
    element.value = query;
  }

  console.log('设置元素值:', foundSelector);
}

// 执行触发事件操作
async function executeTriggerEvents(step) {
  let element = null;
  let foundSelector = null;
  
  // 支持多个选择器
  const selectors = Array.isArray(step.selector) ? step.selector : [step.selector];
  
  for (const selector of selectors) {
    element = document.querySelector(selector);
    if (element) {
      foundSelector = selector;
      break;
    }
  }
  
  if (!element) {
    throw new Error(`未找到任何元素，尝试的选择器: ${selectors.join(', ')}`);
  }

  const events = step.events || ['input', 'change'];
  events.forEach(eventName => {
    if (eventName === 'input' && step.inputType === 'special') {
      // 特殊输入事件
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: element.value || element.innerText
      });
      element.dispatchEvent(inputEvent);
    } else {
      element.dispatchEvent(new Event(eventName, { bubbles: true }));
    }
  });

  console.log('触发事件:', events, '在元素:', foundSelector);
}

// 执行发送按键操作
async function executeSendKeys(step, query) {
  let element = null;
  let foundSelector = null;
  
  // 支持多个选择器
  const selectors = Array.isArray(step.selector) ? step.selector : [step.selector];
  
  for (const selector of selectors) {
    element = document.querySelector(selector);
    if (element) {
      foundSelector = selector;
      break;
    }
  }
  
  if (!element) {
    throw new Error(`未找到任何元素，尝试的选择器: ${selectors.join(', ')}`);
  }

  if (step.keys === 'Enter') {
    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      location: 0,
      repeat: false,
      isComposing: false
    });
    element.dispatchEvent(enterEvent);
    console.log('发送回车键到元素:', foundSelector);
  } else if (step.keys === 'Ctrl+V') {
    const pasteEvent = new KeyboardEvent('keydown', {
      key: 'v',
      code: 'KeyV',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(pasteEvent);
    console.log('发送 Ctrl+V 到元素:', foundSelector);
  }
}

// 执行等待操作
async function executeWait(step) {
  await new Promise(resolve => setTimeout(resolve, step.duration));
  console.log('等待:', step.duration + 'ms');
}

// 执行自定义操作
async function executeCustom(step, query) {
  if (step.customAction === 'metaso_recommend') {
    const iframeUrl = window.frameElement ? window.frameElement.src : window.location.href;
    if (iframeUrl.includes('/search/')) {
      const recommendBox = document.querySelector('div.MuiBox-root.css-qtri4c');
      if (recommendBox) {
        recommendBox.click();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  } else if (step.customAction === 'send_message') {
    window.parent.postMessage({ type: 'message_received', originalType: step.messageType }, '*');
  } else if (step.customAction === 'retry_click') {
    const maxAttempts = step.maxAttempts || 5;
    let attempts = 0;
    const tryClick = () => {
      const sendButton = document.querySelector(step.selector);
      if (sendButton && !sendButton.disabled) {
        sendButton.click();
        return true;
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(tryClick, step.retryInterval || 200);
      } else {
        console.error('达到最大尝试次数，按钮仍然被禁用');
      }
    };
    setTimeout(tryClick, 100);
  } else if (step.customAction === 'url_query') {
    console.log('站点使用URL查询，无需搜索处理器');
  } else if (step.customAction === 'placeholder') {
    console.log('站点暂未实现搜索处理器');
  }
  
  console.log('执行自定义操作:', step.customAction);
}

// 根据域名获取站点处理器 - 统一处理 E F H 环节
async function getSiteHandler(domain) {
  try {
    // E: 从远程配置获取站点列表
    let sites = [];
    if (window.RemoteConfigManager) {
      sites = await window.RemoteConfigManager.getCurrentSites('CN');
    }
    
    // F: 检查配置可用性，如果远程配置失败，从本地存储获取
    if (!sites || sites.length === 0) {
      console.log('远程配置不可用，尝试从本地存储获取站点配置');
      const result = await chrome.storage.local.get('sites');
      sites = result.sites || [];
    }
    
    // H: 使用配置
    if (!sites || sites.length === 0) {
      console.warn('没有找到站点配置，请检查网络连接或重新加载扩展');
      return null;
    }
    
    // 根据域名查找对应的站点配置
    const site = sites.find(s => {
      if (!s.url) return false;
      try {
        const siteUrl = new URL(s.url);
        const siteDomain = siteUrl.hostname;
        return domain === siteDomain || domain.includes(siteDomain) || siteDomain.includes(domain);
      } catch (urlError) {
        return false;
      }
    });
    
    if (!site) {
      console.warn('未找到匹配的站点配置:', domain);
      return null;
    }
    
    return {
      name: site.name,
      searchHandler: site.searchHandler
    };
  } catch (error) {
    console.error('获取站点处理器失败:', error);
    return null;
  }
}

// 监听来自扩展的消息
window.addEventListener('message', async function(event) {
    // 过滤消息：只处理来自 MultiAI 扩展的消息
    if (!event.data || typeof event.data !== 'object') {
        return;
    }
    
    // 检查是否是 MultiAI 扩展的消息
    if (!event.data.query && !event.data.type) {
        return;
    }
    
    // 过滤掉其他扩展的消息（如广告拦截器等）
    if (event.data.type && (
        event.data.type.includes('ad-finder') || 
        event.data.type.includes('wxt') ||
        event.data.type.includes('content-script-started') ||
        event.data.type.includes('ads#') ||
        event.data.type.includes('adblock') ||
        event.data.type.includes('ublock') ||
        event.data.type.includes('ghostery') ||
        event.data.type.includes('privacy') ||
        event.data.type.startsWith('laankejkbhbdhmipfmgcngdelahlfoji') ||
        event.data.type.includes('INIT') ||
        event.data.type.includes('EXTENSION_')
    )) {
        return;
    }
    
    // 只处理 MultiAI 扩展的特定消息类型
    const validMultiAITypes = ['TRIGGER_PASTE', 'search'];
    
    if (!validMultiAITypes.includes(event.data.type)) {
        return;
    }
    
    // 对于搜索消息，必须包含 query 字段
    if (event.data.type !== 'TRIGGER_PASTE' && !event.data.query) {
        return;
    }
    
    console.log('收到query:',event.data.query, '收到type:',event.data.type);
    console.log('收到消息event 原始:',event);

  // 处理文件粘贴消息
  if (event.data.type === 'TRIGGER_PASTE') {
    console.log('收到文件粘贴触发消息');
    await triggerPasteInIframe();
    return;
  }

  // 使用新的统一处理逻辑
  const domain = event.data.domain || window.location.hostname;
  const siteHandler = await getSiteHandler(domain);
  
  if (siteHandler && siteHandler.searchHandler && event.data.query) {
    console.log(`使用 ${siteHandler.name} 配置化处理器处理消息`);
    try {
      // 使用配置化处理器执行
      await executeSiteHandler(event.data.query, siteHandler.searchHandler);
    } catch (error) {
      console.error(`${siteHandler.name} 处理失败:`, error);
    }
    return;
  }

  // 如果没有找到对应的处理器，记录警告
  console.warn('未找到对应的站点处理器，消息类型:', event.data.type);
}); 

// 标记是否已经添加了点击处理器
let clickHandlerAdded = false;

// 统一的点击处理函数
function handleLinkClick(e) {
  console.log("handleLinkClick 触发")
  const link = e.target.closest('a');
  if (link && link.href) {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡
    window.parent.postMessage({
      type: 'LINK_CLICK',
      href: link.href
    }, '*');
  }
}

// 在 iframe 中触发粘贴操作
async function triggerPasteInIframe() {
  try {
    console.log('开始触发 iframe 中的粘贴操作');
    
    // 查找输入框
    const inputSelectors = [
      'input[type="text"]',
      'textarea',
      '[contenteditable="true"]',
      '#prompt-textarea',
      '.input-area',
      '[role="textbox"]'
    ];
    
    let inputElement = null;
    for (const selector of inputSelectors) {
      inputElement = document.querySelector(selector);
      if (inputElement) {
        console.log('找到输入框:', selector);
        break;
      }
    }
    
    if (!inputElement) {
      console.log('未找到输入框，尝试聚焦文档');
      document.body.focus();
      window.focus();
      
      // 尝试读取剪切板以触发权限请求
      try {
        await navigator.clipboard.readText();
      } catch (err) {
        console.log('剪切板读取失败:', err.name, err.message);
        if (err.name === 'NotAllowedError') {
          showClipboardPermissionTip();
        }
      }
      return;
    }
    
    // 聚焦输入框
    inputElement.focus();
    document.body.focus();
    window.focus();
    
    // 等待一小段时间确保聚焦完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 模拟 Ctrl+V 键盘事件
    const pasteEvent = new KeyboardEvent('keydown', {
      key: 'v',
      code: 'KeyV',
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    });
    
    inputElement.dispatchEvent(pasteEvent);
    
    // 也尝试直接读取剪切板
    try {
      const clipboardData = await navigator.clipboard.read();
      console.log('剪切板内容:', clipboardData);
      
      // 如果有文件，尝试处理
      for (const item of clipboardData) {
        if (item.types.includes('Files')) {
          console.log('检测到文件在剪切板中');
          // 这里可以添加文件处理逻辑
        }
      }
    } catch (err) {
      console.log('剪切板访问失败:', err.name, err.message);
      if (err.name === 'NotAllowedError') {
        showClipboardPermissionTip();
      }
    }
    
  } catch (error) {
    console.error('触发粘贴操作失败:', error);
  }
}

// 显示剪切板权限提示
function showClipboardPermissionTip() {
  console.log('提示: 需要用户授权剪切板访问权限');
  console.log('解决方法: 请重新加载扩展以应用新的权限设置');
  console.log('或者点击页面获得焦点后重试');
}

// 监听来自父窗口的消息
window.addEventListener('message', (event) => {
  if (event.data.type === 'INJECT_CLICK_HANDLER' && !clickHandlerAdded) {
    document.addEventListener('click', handleLinkClick);
    console.log("收到Iframe消息 添加消息处理 ")
    clickHandlerAdded = true;
  }
});

// 如果还没有添加点击处理器，则添加
if (!clickHandlerAdded) {
  document.addEventListener('click', handleLinkClick);
  console.log("document.addEventListener('click', handleLinkClick); 触发")
  clickHandlerAdded = true;
}