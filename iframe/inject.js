
console.log('🎯 inject.js 脚本已加载');

// 动态检查是否在 AI 站点中运行
async function isAISite() {
  try {
    // 使用新的统一站点检测器
    if (window.siteDetector) {
      const isAI = await window.siteDetector.isAISite();
      if (isAI) {
        console.log('🎯 使用新检测器匹配到 AI 站点');
      } else {
        console.log('🎯 使用新检测器：当前站点不在 AI 站点配置中');
      }
      return isAI;
    }
    
    // 降级到原有逻辑
    if (!window.getDefaultSites) {
      console.log('🎯 getDefaultSites 函数不可用，跳过处理');
      return false;
    }
    
    const sites = await window.getDefaultSites();
    
    if (!sites || !Array.isArray(sites)) {
      console.log('🎯 获取站点列表失败，跳过处理');
      return false;
    }
    
    const currentHostname = window.location.hostname;
    
    // 检查当前站点是否在配置中
    const matchedSite = sites.find(site => {
      if (!site.url || site.hidden) return false;
      
      try {
        const siteUrl = new URL(site.url);
        const siteHostname = siteUrl.hostname;
        
        // 检查域名匹配
        return currentHostname === siteHostname || 
               currentHostname.includes(siteHostname) || 
               siteHostname.includes(currentHostname);
      } catch (urlError) {
        return false;
      }
    });
    
    if (matchedSite) {
      console.log('🎯 匹配到 AI 站点:', matchedSite.name);
      return true;
    } else {
      console.log('🎯 当前站点不在 AI 站点配置中，跳过处理');
      return false;
    }
  } catch (error) {
    console.log('🎯 检查 AI 站点配置失败:', error);
    return false;
  }
}

// 等待页面加载完成后检查
let isAISiteChecked = false;
let isAISiteResult = false;

async function checkAISite() {
  if (!isAISiteChecked) {
    isAISiteResult = await isAISite();
    isAISiteChecked = true;
  }
  return isAISiteResult;
}

// 通用的配置化站点处理器 - 基于流程的标准化处理
async function executeSiteHandler(query, handlerConfig) {
  console.log('🚀 executeSiteHandler 开始执行');
  console.log('🔍 调试信息 - 查询内容:', query);
  console.log('🔍 调试信息 - 处理器配置:', handlerConfig);
  
  if (!handlerConfig || !handlerConfig.steps) {
    console.error('❌ 无效的处理器配置');
    return;
  }

  console.log('✅ 开始执行配置化处理器，步骤数:', handlerConfig.steps.length);

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
        case 'replace':
          await executeReplace(step, query);
          break;
        case 'wait':
          await executeWait(step);
          break;
        case 'custom':
          await executeCustom(step, query);
          break;
        case 'paste':
          await executePaste(step);
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

// 执行粘贴操作
async function executePaste(step) {
  console.log('🎯 执行粘贴操作');
  console.log('粘贴步骤配置:', step);
  
  // 验证配置加载状态
  console.log('🔍 配置验证:');
  console.log('- window.AppConfigManager 存在:', !!window.AppConfigManager);
  if (window.AppConfigManager) {
    try {
      const testTypes = await window.AppConfigManager.getAllSupportedFileTypes();
      console.log('- 配置加载成功，支持文件类型数量:', testTypes.length);
    } catch (error) {
      console.error('- 配置加载失败:', error);
    }
  }
  
  try {
    // 优先使用全局存储的文件数据（来自父页面传递）
    if (window._currentFileData) {
      console.log('🎯 使用传递的文件数据进行粘贴');
      await handleFileDataPaste(window._currentFileData);
      return;
    }
    
    // 检查剪贴板权限
    const permissionStatus = await navigator.permissions.query({ name: 'clipboard-read' });
    console.log('剪贴板权限状态:', permissionStatus.state);
    console.log('权限详情:', permissionStatus);
    
    if (permissionStatus.state === 'denied') {
      console.log('❌ 剪贴板权限被拒绝，无法执行粘贴操作');
      throw new Error('剪贴板权限被拒绝');
    }
    
    if (permissionStatus.state === 'prompt') {
      console.log('🔄 剪贴板权限需要用户授权，尝试请求权限...');
    }
    
    // 确保文档获得焦点（解决多iframe环境下的焦点问题）
    console.log('🔍 检查文档焦点状态...');
    if (!document.hasFocus()) {
      console.log('⚠️ 文档没有焦点，尝试获取焦点...');
      window.focus();
      // 等待一小段时间让焦点生效
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 检查当前聚焦的元素
    const activeElement = document.activeElement;
    console.log('当前聚焦元素:', activeElement);
    
    // 读取剪贴板内容
    console.log('📋 尝试读取剪贴板内容...');
    let clipboardData;
    try {
      clipboardData = await navigator.clipboard.read();
    } catch (clipboardError) {
      console.log('❌ 剪贴板读取失败:', clipboardError.message);
      
      // 如果是焦点问题，尝试通过用户交互触发
      if (clipboardError.name === 'NotAllowedError' && clipboardError.message.includes('not focused')) {
        console.log('🔄 检测到焦点问题，尝试通过模拟用户交互解决...');
        
        // 创建一个临时的用户交互事件
        const tempButton = document.createElement('button');
        tempButton.style.position = 'fixed';
        tempButton.style.top = '-1000px';
        tempButton.style.left = '-1000px';
        tempButton.style.opacity = '0';
        tempButton.style.pointerEvents = 'none';
        document.body.appendChild(tempButton);
        
        // 模拟点击事件来获取用户交互上下文
        tempButton.focus();
        tempButton.click();
        
        // 再次尝试读取剪贴板
        try {
          clipboardData = await navigator.clipboard.read();
          console.log('✅ 通过用户交互成功读取剪贴板');
        } catch (retryError) {
          console.log('❌ 重试仍然失败:', retryError.message);
          throw retryError;
        } finally {
          // 清理临时按钮
          document.body.removeChild(tempButton);
        }
      } else {
        throw clipboardError;
      }
    }
    console.log('剪切板内容:', clipboardData);
    console.log('剪贴板项目数量:', clipboardData.length);
    
    if (clipboardData.length === 0) {
      console.log('❌ 剪贴板为空');
      throw new Error('剪贴板为空');
    }
    
    // 处理剪贴板中的文件
    // 从配置中获取支持的文件类型
    const fileTypes = await window.AppConfigManager.getAllSupportedFileTypes();
    console.log('从配置获取支持的文件类型:', fileTypes);
    
    for (const item of clipboardData) {
      console.log('剪贴板项目类型:', item.types);
      
      // 检查是否是文件类型
      const isFile = fileTypes.some(type => item.types.includes(type));
      
      if (isFile) {
        console.log('🎯 检测到文件在剪贴板中，类型:', item.types);
        
        // 尝试获取文件数据
        let file = null;
        let fileType = null;
        
        // 首先尝试获取 Files 类型
        if (item.types.includes('Files')) {
          file = await item.getType('Files');
          fileType = 'Files';
        } else {
          // 如果没有 Files 类型，尝试获取其他文件类型
          for (const type of fileTypes) {
            if (item.types.includes(type)) {
              file = await item.getType(type);
              fileType = type;
              break;
            }
          }
        }
        
        console.log('文件对象:', file);
        console.log('文件类型:', fileType);
        
        // 创建 DataTransfer 对象
        const dataTransfer = new DataTransfer();
        if (file) {
          // 如果获取到的是 Blob，需要转换为 File 对象 - 使用智能文件名生成
          let fileToAdd = file;
          if (file instanceof Blob && !(file instanceof File)) {
            // 使用智能文件名生成
            let fileName = null;
            if (window.AppConfigManager) {
              fileName = await window.AppConfigManager.generateFileName(null, fileType, 'clipboard');
              console.log('🎯 生成智能文件名:', fileName, '基于 MIME 类型:', fileType);
            } else {
              // 降级处理
              const extension = await getFileExtensionFromMimeType(fileType);
              fileName = `clipboard-${Date.now()}.${extension}`;
            }
            
            fileToAdd = new File([file], fileName, { type: fileType });
            console.log('将 Blob 转换为 File:', {
              name: fileToAdd.name,
              type: fileToAdd.type,
              size: fileToAdd.size,
              originalType: fileType
            });
          }
          dataTransfer.items.add(fileToAdd);
        }
        
        // 创建文件粘贴事件
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: dataTransfer,
          bubbles: true,
          cancelable: true
        });
        
        // 触发粘贴事件到当前聚焦的元素
        const activeElement = document.activeElement;
        if (activeElement) {
          console.log('已向聚焦元素发送文件粘贴事件:', activeElement);
          activeElement.dispatchEvent(pasteEvent);
        } else {
          console.log('没有聚焦的元素，向 document 发送文件粘贴事件');
          document.dispatchEvent(pasteEvent);
        }
        
        console.log('✅ 文件粘贴事件已触发');
        
      } else if (item.types.includes('text/plain')) {
        console.log('🎯 检测到文本在剪贴板中');
        
        // 获取文本内容
        const textContent = await item.getType('text/plain');
        console.log('文本内容:', textContent);
        
        // 创建 DataTransfer 对象
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', textContent);
        
        // 创建文本粘贴事件
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: dataTransfer,
          bubbles: true,
          cancelable: true
        });
        
        // 触发粘贴事件
        const activeElement = document.activeElement;
        if (activeElement) {
          console.log('已向聚焦元素发送文本粘贴事件:', activeElement);
          activeElement.dispatchEvent(pasteEvent);
        } else {
          console.log('没有聚焦的元素，向 document 发送文本粘贴事件');
          document.dispatchEvent(pasteEvent);
        }
        
        console.log('✅ 文本粘贴事件已触发');
      }
    }
    
    console.log('✅ 粘贴操作执行完成');
    
  } catch (error) {
    console.error('❌ 粘贴操作失败:', error);
    throw error;
  }
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

  // 如果指定了重试机制，则使用重试逻辑
  if (step.retryOnDisabled) {
    const maxAttempts = step.maxAttempts || 5;
    const retryInterval = step.retryInterval || 200;
    let attempts = 0;
    
    const tryClick = () => {
      if (!element.disabled) {
        element.click();
        console.log('点击元素:', foundSelector);
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        console.log(`按钮被禁用，${retryInterval}ms后重试 (${attempts}/${maxAttempts})`);
        setTimeout(tryClick, retryInterval);
      } else {
        console.error('达到最大尝试次数，按钮仍然被禁用');
      }
    };
    
    // 延迟100ms开始尝试，给页面一些时间
    setTimeout(tryClick, 100);
  } else {
    element.click();
    console.log('点击元素:', foundSelector);
  }
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
    // 使用配置驱动的特殊处理
    await executeSpecialSetValue(step, query, element);
  } else {
    // 普通输入框
    element.value = query;
  }

  console.log('设置元素值:', foundSelector);
}

// 配置驱动的特殊值设置
async function executeSpecialSetValue(step, query, element) {
  const specialConfig = step.specialConfig;
  
  if (!specialConfig) {
    // 兼容旧的 customSetValue 方式
    await executeLegacySpecialSetValue(step, query);
    return;
  }
  
  switch (specialConfig.type) {
    case 'lexical-editor':
      await handleLexicalEditor(specialConfig, query);
      break;
    case 'growing-textarea':
      await handleGrowingTextarea(specialConfig, query);
      break;
    case 'custom-element':
      await handleCustomElement(specialConfig, query);
      break;
    case 'multi-sync':
      await handleMultiSync(specialConfig, query);
      break;
    default:
      console.warn('未知的特殊处理类型:', specialConfig.type);
      // 回退到普通处理
      element.value = query;
  }
}

// 处理 Lexical 编辑器（如文心一言）
async function handleLexicalEditor(config, query) {
  const container = document.querySelector(config.containerSelector);
  if (!container) {
    throw new Error(`未找到容器元素: ${config.containerSelector}`);
  }
  
  // 清空容器
  if (config.clearContainer !== false) {
    container.innerHTML = '';
  }
  
  // 创建元素
  const element = document.createElement(config.elementType || 'span');
  
  // 设置属性
  if (config.attributes) {
    Object.entries(config.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  // 设置内容
  if (config.contentType === 'innerHTML') {
    element.innerHTML = query;
  } else {
    element.textContent = query;
  }
  
  // 添加到容器
  container.appendChild(element);
  
  console.log('Lexical 编辑器内容已设置');
}

// 处理自适应文本框（如 POE）
async function handleGrowingTextarea(config, query) {
  const container = document.querySelector(config.containerSelector);
  if (!container) {
    throw new Error(`未找到容器元素: ${config.containerSelector}`);
  }
  
  // 设置容器属性
  if (config.containerAttribute) {
    container.setAttribute(config.containerAttribute, query);
  }
  
  // 设置内部输入框
  if (config.inputSelector) {
    const input = container.querySelector(config.inputSelector);
    if (input) {
      input.value = query;
    }
  }
  
  console.log('自适应文本框内容已设置');
}

// 处理自定义元素
async function handleCustomElement(config, query) {
  const element = document.querySelector(config.selector);
  if (!element) {
    throw new Error(`未找到元素: ${config.selector}`);
  }
  
  // 执行自定义方法
  if (config.method === 'setAttribute') {
    element.setAttribute(config.attribute, query);
  } else if (config.method === 'setProperty') {
    element[config.property] = query;
  } else if (config.method === 'innerHTML') {
    element.innerHTML = query;
  } else if (config.method === 'textContent') {
    element.textContent = query;
  }
  
  console.log('自定义元素内容已设置');
}

// 处理多元素同步
async function handleMultiSync(config, query) {
  const elements = config.elements || [];
  
  for (const elementConfig of elements) {
    const element = document.querySelector(elementConfig.selector);
    if (element) {
      if (elementConfig.method === 'value') {
        element.value = query;
      } else if (elementConfig.method === 'attribute') {
        element.setAttribute(elementConfig.attribute, query);
      } else if (elementConfig.method === 'textContent') {
        element.textContent = query;
      }
    }
  }
  
  console.log('多元素同步完成');
}

// 兼容旧的特殊处理方式
async function executeLegacySpecialSetValue(step, query) {
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
    const growingTextArea = document.querySelector('.GrowingTextArea_growWrap__im5W3');
    if (growingTextArea) {
      growingTextArea.setAttribute('data-replicated-value', query);
      const textarea = growingTextArea.querySelector('textarea');
      if (textarea) {
        textarea.value = query;
      }
    }
  }
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
  } else {
    console.warn('不支持的按键类型:', step.keys);
  }
}

// 执行元素替换操作
async function executeReplace(step, query) {
  console.log('🔧 executeReplace 开始执行');
  console.log('🔧 步骤配置:', step);
  console.log('🔧 查询内容:', query);
  
  let element = null;
  let foundSelector = null;
  
  // 支持多个选择器
  const selectors = Array.isArray(step.selector) ? step.selector : [step.selector];
  console.log('🔧 尝试的选择器:', selectors);
  
  for (const selector of selectors) {
    element = document.querySelector(selector);
    console.log(`🔧 选择器 ${selector} 结果:`, element);
    if (element) {
      foundSelector = selector;
      break;
    }
  }
  
  if (!element) {
    throw new Error(`未找到任何元素，尝试的选择器: ${selectors.join(', ')}`);
  }

  console.log('🔧 找到元素:', element);
  console.log('🔧 元素当前HTML:', element.innerHTML);
  
  // 清空容器内容
  element.innerHTML = '';
  console.log('🔧 清空后HTML:', element.innerHTML);
  
  // 创建并插入新元素
  if (step.write && Array.isArray(step.write)) {
    console.log('🔧 开始创建元素，配置数量:', step.write.length);
    for (const elementConfig of step.write) {
      console.log('🔧 创建元素配置:', elementConfig);
      const newElement = createElementFromConfig(elementConfig, query);
      console.log('🔧 创建的元素:', newElement);
      console.log('🔧 创建的元素HTML:', newElement.outerHTML);
      element.appendChild(newElement);
    }
  }
  
  console.log('🔧 最终元素HTML:', element.innerHTML);
  console.log('✅ 元素替换完成:', foundSelector, '内容:', query);
}

// 根据配置创建DOM元素
function createElementFromConfig(config, query) {
  console.log('🔧 createElementFromConfig 开始，配置:', config, '查询:', query);
  
  const element = document.createElement(config.tag);
  console.log('🔧 创建元素:', config.tag, element);
  
  // 设置属性
  if (config.attributes) {
    console.log('🔧 设置属性:', config.attributes);
    Object.entries(config.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
      console.log(`🔧 设置属性 ${key} = ${value}`);
    });
  }
  
  // 设置文本内容
  if (config.text) {
    // 替换 $query 为实际查询内容
    const text = config.text.replace(/\$query/g, query);
    console.log('🔧 设置文本内容:', text);
    element.textContent = text;
  }
  
  // 设置HTML内容
  if (config.html) {
    // 替换 $query 为实际查询内容
    const html = config.html.replace(/\$query/g, query);
    console.log('🔧 设置HTML内容:', html);
    element.innerHTML = html;
  }
  
  // 递归创建子元素
  if (config.children && Array.isArray(config.children)) {
    console.log('🔧 创建子元素，数量:', config.children.length);
    config.children.forEach((childConfig, index) => {
      console.log(`🔧 创建子元素 ${index}:`, childConfig);
      const childElement = createElementFromConfig(childConfig, query);
      element.appendChild(childElement);
    });
  }
  
  console.log('🔧 最终创建的元素:', element.outerHTML);
  return element;
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
    // 已废弃：retry_click 功能已合并到 click action 中
    console.warn('retry_click 已废弃，请使用 click action 配合 retryOnDisabled 参数');
  } else if (step.customAction === 'url_query') {
    console.log('站点使用URL查询，无需搜索处理器');
  } else if (step.customAction === 'placeholder') {
    console.log('站点暂未实现搜索处理器');
  }
  
  console.log('执行自定义操作:', step.customAction);
}

// 根据域名获取站点处理器
async function getSiteHandler(domain) {
  try {
    // 优先使用新的统一站点检测器
    if (window.siteDetector) {
      const siteHandler = await window.siteDetector.getSiteHandler(domain);
      if (siteHandler) {
        console.log(`✅ 使用新检测器找到站点配置: ${siteHandler.name}`);
        return siteHandler;
      }
    }
    
    // 降级到原有逻辑
    let sites = [];
    try {
      if (!window.getDefaultSites) {
        console.error('window.getDefaultSites 不可用，请检查 baseConfig.js 是否正确加载');
        return null;
      }
      
      sites = await window.getDefaultSites();
      console.log('从 getDefaultSites 获取站点配置成功，数量:', sites.length);
    } catch (error) {
      console.error('获取站点配置失败:', error);
    }
    
    // 使用配置
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
    
    console.log(`找到站点配置: ${site.name}`);
    console.log('站点配置详情:', {
      name: site.name,
      hasSearchHandler: !!site.searchHandler,
      hasFileUploadHandler: !!site.fileUploadHandler
    });
    
    return {
      name: site.name,
      searchHandler: site.searchHandler,
      fileUploadHandler: site.fileUploadHandler,
      contentExtractor: site.contentExtractor
    };
  } catch (error) {
    console.error('获取站点处理器失败:', error);
    return null;
  }
}

// 监听来自扩展的消息
window.addEventListener('message', async function(event) {
    // 首先检查是否在 AI 站点中运行
    const isAI = await checkAISite();
    if (!isAI) {
        return; // 不在 AI 站点中，跳过所有处理
    }
    
    // 过滤消息：只处理来自 AIShortcuts扩展的消息
    if (!event.data || typeof event.data !== 'object') {
        return; // 静默跳过非对象消息
    }
    
    // 检查是否是 AIShortcuts 扩展的消息
    if (!event.data.query && !event.data.type && !event.data.fileData) {
        return; // 静默跳过缺少必要字段的消息
    }
    
    // 过滤掉来自 AI 站点的内部消息
    if (event.data.action || event.data.payload || event.data._stripeJsV3 || 
        event.data.sourceFrameId || event.data.targetFrameId || 
        event.data.controllerAppFrameId) {
        return; // 静默跳过 AI 站点的内部消息
    }
    
    // 只记录有效的 AIShortcuts 消息
    console.log('🎯🎯🎯 inject.js 收到 AIShortcuts 消息:', event.data, '来源:', event.origin);
    
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
    
    // 只处理 AIShortcuts 扩展的特定消息类型
    const validMultiAITypes = ['TRIGGER_PASTE', 'search', 'EXTRACT_CONTENT'];
    
    if (!validMultiAITypes.includes(event.data.type)) {
        return;
    }
    
    console.log('收到消息类型:', event.data.type);
    
    // 处理文件粘贴消息 - 优先使用站点特定处理器
    if (event.data.type === 'TRIGGER_PASTE') {
        console.log('🎯 收到文件粘贴触发消息');
        console.log('消息详情:', event.data);
        
        if (event.data.index && event.data.total) {
            console.log(`🎯 当前处理进度: ${event.data.index}/${event.data.total}`);
        }
        
        // 检查消息模式
        if (event.data.fallback) {
            console.log('🎯 降级模式：iframe 自行尝试读取剪贴板');
        } else if (event.data.useSiteHandler) {
            console.log('🎯 优先模式：使用站点特定的文件上传处理器');
        } else if (event.data.global) {
            console.log('🎯 全局文件粘贴操作');
            if (event.data.forced) {
                console.log('🎯 强制处理模式');
            }
        } else {
            console.log('🎯 单个 iframe 的文件粘贴操作');
        }
        
        // 获取站点处理器
        const domain = event.data.domain || window.location.hostname;
        const siteHandler = await getSiteHandler(domain);
        
        if (siteHandler && siteHandler.fileUploadHandler) {
            console.log(`🎯 使用 ${siteHandler.name} 的文件上传处理器`);
            console.log('站点处理器配置:', siteHandler.fileUploadHandler);
            
            try {
                // 如果有传递文件数据，先将其存储到全局变量供处理器使用
                if (event.data.fileData) {
                    console.log('🎯 收到传递的文件数据，存储供站点处理器使用');
                    window._currentFileData = event.data.fileData;
                }
                
                await executeSiteHandler(null, siteHandler.fileUploadHandler);
                console.log('🎯 站点文件上传处理器执行完成');
                
                // 清理临时数据
                if (window._currentFileData) {
                    delete window._currentFileData;
                }
                
            } catch (error) {
                console.error(`${siteHandler.name} 文件上传处理失败:`, error);
                
                // 降级策略：如果有文件数据，尝试直接粘贴
                if (event.data.fileData) {
                    console.log('🎯 降级到直接文件数据粘贴');
                    try {
                        await handleFileDataPaste(event.data.fileData);
                        console.log('✅ 降级文件数据粘贴成功');
                    } catch (fallbackError) {
                        console.error('❌ 降级文件数据粘贴也失败:', fallbackError);
                        // 最后的降级：默认粘贴操作
                        await executeSiteHandler(null, { 
                            steps: [{ 
                                action: 'paste', 
                                description: '最后降级：默认粘贴操作' 
                            }] 
                        });
                    }
                } else {
                    // 没有文件数据时的降级
                    console.log('🎯 降级到默认粘贴操作');
                    await executeSiteHandler(null, { 
                        steps: [{ 
                            action: 'paste', 
                            description: '降级：默认粘贴操作' 
                        }] 
                    });
                }
            }
        } else {
            console.log('❌ 未找到文件上传处理器');
            
            // 如果没有站点处理器，但有文件数据，尝试直接粘贴
            if (event.data.fileData) {
                console.log('🎯 使用直接文件数据粘贴');
                try {
                    await handleFileDataPaste(event.data.fileData);
                    console.log('✅ 直接文件数据粘贴成功');
                } catch (error) {
                    console.error('❌ 直接文件数据粘贴失败:', error);
                }
            } else {
                console.log('🎯 使用默认粘贴处理方式');
                await executeSiteHandler(null, { 
                    steps: [{ 
                        action: 'paste', 
                        description: '默认粘贴操作' 
                    }] 
                });
            }
        }
        return;
    }

    // 处理内容提取消息
    if (event.data.type === 'EXTRACT_CONTENT') {
        console.log('🎯 收到内容提取请求:', event.data);
        
        // 使用 async/await 处理异步内容提取
        (async () => {
            try {
                // 提取页面内容
                const content = await extractPageContent();
                
                // 提取当前页面的URL（去掉locale等参数）
                let pageUrl = window.location.href;
                try {
                    // 查找alternate链接获取清洁的URL
                    const alternateLinks = document.querySelectorAll('link[rel="alternate"]');
                    for (const link of alternateLinks) {
                        const href = link.getAttribute('href');
                        if (href && href.includes('chatgpt.com/c/')) {
                            const url = new URL(href);
                            url.searchParams.delete('locale');
                            pageUrl = url.toString();
                            console.log(`🔗 从alternate标签获取清洁URL: ${pageUrl}`);
                            break;
                        }
                    }
                } catch (error) {
                    console.log('⚠️ URL清理失败，使用原始URL:', error);
                }
                
                // 发送提取结果回主窗口
                window.parent.postMessage({
                    type: 'EXTRACTED_CONTENT',
                    siteName: event.data.siteName,
                    content: content,
                    url: pageUrl
                }, '*');
                
                console.log('✅ 内容提取完成，已发送结果');
            } catch (error) {
                console.error('❌ 内容提取失败:', error);
                
                // 发送错误结果
                window.parent.postMessage({
                    type: 'EXTRACTED_CONTENT',
                    siteName: event.data.siteName,
                    content: `内容提取失败: ${error.message}`
                }, '*');
            }
        })();
        return;
    }

    // 对于搜索消息，必须包含 query 字段
    if (event.data.type !== 'TRIGGER_PASTE' && !event.data.query) {
        return;
    }
    
    console.log('收到query:',event.data.query, '收到type:',event.data.type);
    console.log('收到消息event 原始:',event);

    // 使用新的统一处理逻辑
    const domain = event.data.domain || window.location.hostname;
    console.log('🔍 调试信息 - 域名:', domain, '当前hostname:', window.location.hostname);
    
    const siteHandler = await getSiteHandler(domain);
    console.log('🔍 调试信息 - 站点处理器:', siteHandler);
    
    if (siteHandler && siteHandler.searchHandler && event.data.query) {
        console.log(`✅ 使用 ${siteHandler.name} 配置化处理器处理消息`);
        console.log('🔍 调试信息 - 搜索处理器配置:', siteHandler.searchHandler);
        try {
            // 使用配置化处理器执行
            await executeSiteHandler(event.data.query, siteHandler.searchHandler);
            console.log(`✅ ${siteHandler.name} 处理完成`);
        } catch (error) {
            console.error(`❌ ${siteHandler.name} 处理失败:`, error);
        }
        return;
    }

    // 如果没有找到对应的处理器，记录警告
    console.warn('❌ 未找到对应的站点处理器');
    console.warn('🔍 调试信息 - 域名:', domain);
    console.warn('🔍 调试信息 - 站点处理器:', siteHandler);
    console.warn('🔍 调试信息 - 消息类型:', event.data.type);
    console.warn('🔍 调试信息 - 查询内容:', event.data.query);
}); 

// 处理传递的文件数据粘贴
async function handleFileDataPaste(fileData) {
    console.log('🎯 开始处理传递的文件数据');
    console.log('文件数据:', fileData);
    
    if (!fileData || (!fileData.blob && !fileData.data)) {
        console.error('❌ 无效的文件数据');
        return;
    }
    
    try {
        // 确保文档获得焦点
        console.log('🔍 检查文档焦点状态...');
        if (!document.hasFocus()) {
            console.log('⚠️ 文档没有焦点，尝试获取焦点...');
            window.focus();
            // 等待一小段时间让焦点生效
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // 创建 File 对象 - 使用改进的文件名生成逻辑
        const blobData = fileData.blob || fileData.data; // 支持两种数据结构
        let file = blobData;
        
        if (blobData instanceof Blob && !(blobData instanceof File)) {
            // 使用传递的智能文件名，如果没有则生成一个
            let fileName = fileData.fileName || fileData.name;
            if (!fileName && window.AppConfigManager) {
                fileName = await window.AppConfigManager.generateFileName(
                    fileData.originalName, 
                    fileData.type, 
                    'clipboard'
                );
                console.log('🎯 生成智能文件名:', fileName);
            } else if (!fileName) {
                // 最后的降级处理
                const extension = await getFileExtensionFromMimeType(fileData.type);
                fileName = `clipboard-${Date.now()}.${extension}`;
            }
            
            file = new File([blobData], fileName, { type: fileData.type });
            console.log('将 Blob 转换为 File:', {
                name: file.name,
                type: file.type,
                size: file.size,
                originalData: fileData
            });
        }
        
        // 创建 DataTransfer 对象
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        
        // 创建文件粘贴事件
        const pasteEvent = new ClipboardEvent('paste', {
            clipboardData: dataTransfer,
            bubbles: true,
            cancelable: true
        });
        
        // 触发粘贴事件到当前聚焦的元素
        const activeElement = document.activeElement;
        if (activeElement) {
            console.log('已向聚焦元素发送文件粘贴事件:', activeElement);
            activeElement.dispatchEvent(pasteEvent);
        } else {
            console.log('没有聚焦的元素，向 document 发送文件粘贴事件');
            document.dispatchEvent(pasteEvent);
        }
        
        console.log('✅ 文件数据粘贴事件已触发');
        
    } catch (error) {
        console.error('❌ 文件数据粘贴失败:', error);
        throw error;
    }
}

// 辅助函数：从 MIME 类型获取文件扩展名
async function getFileExtensionFromMimeType(mimeType) {
    if (window.AppConfigManager) {
        return await window.AppConfigManager.getFileExtensionByMimeType(mimeType);
    }
    
    // 简单的降级映射
    const basicMappings = {
        'application/pdf': 'pdf',
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'text/plain': 'txt',
        'Files': 'file'
    };
    
    return basicMappings[mimeType] || 'bin';
} 

// 显示剪切板权限提示
function showClipboardPermissionTip() {
  console.log('提示: 需要用户授权剪切板访问权限');
  console.log('解决方法: 请重新加载扩展以应用新的权限设置');
  console.log('或者点击页面获得焦点后重试');
}

// 提取页面内容
async function extractPageContent() {
    console.log('🔍 开始提取页面内容...');
    
    try {
        // 获取当前域名
        const domain = window.location.hostname;
        console.log('🔍 当前域名:', domain);
        
        
        // 获取站点配置
        const siteHandler = await getSiteHandler(domain);
        console.log('🔍 站点处理器:', siteHandler);
        
        let content = '';
        
        if (siteHandler && siteHandler.contentExtractor) {
            // 使用配置文件中的提取规则
            console.log('✅ 使用配置文件中的内容提取规则');
            content = await extractWithConfig(siteHandler.contentExtractor, siteHandler.name);
        } else {
            // 没有找到站点配置，返回提示信息
            const siteName = siteHandler ? siteHandler.name : domain;
            console.log(`⚠️ 未找到 ${siteName} 的内容提取配置，返回提示信息`);
            content = `无法自动提取 ${siteName} 的详细内容，请手动复制。\n\n提示：该站点可能尚未配置内容提取规则，或者页面结构发生了变化。`;
        }
        
        console.log('✅ 内容提取完成，长度:', content.length);
        return content;
        
    } catch (error) {
        console.error('❌ 内容提取失败:', error);
        return `内容提取失败: ${error.message}`;
    }
}

// 使用配置文件提取内容（优化版）
async function extractWithConfig(contentExtractor, siteName) {
    console.log(`🔍 使用 ${siteName} 配置提取内容...`);
    console.log('🔍 内容提取配置:', contentExtractor);
    
    const startTime = performance.now();
    let content = '';
    let extractionMethod = '';
    
    try {
        // 1. 首先尝试主要选择器
        if (contentExtractor.contentSelectors && contentExtractor.contentSelectors.length > 0) {
            console.log('🔍 尝试主要选择器...');
            content = await extractWithSelectorsOptimized(
                contentExtractor.contentSelectors, 
                siteName, 
                contentExtractor.excludeSelectors,
                contentExtractor.messageContainer
            );
            
            if (content.trim() && !content.includes('无法自动提取')) {
                extractionMethod = '主要选择器';
                console.log('✅ 主要选择器提取成功');
                return content;
            }
        }
        
        // 2. 如果主要选择器失败，尝试备用选择器
        if (contentExtractor.fallbackSelectors && contentExtractor.fallbackSelectors.length > 0) {
            console.log('🔍 主要选择器失败，尝试备用选择器...');
            content = await extractWithSelectorsOptimized(
                contentExtractor.fallbackSelectors, 
                siteName, 
                contentExtractor.excludeSelectors,
                contentExtractor.messageContainer
            );
            
            if (content.trim() && !content.includes('无法自动提取')) {
                extractionMethod = '备用选择器';
                console.log('✅ 备用选择器提取成功');
                return content;
            }
        }
        
        // 3. 尝试智能内容检测
        console.log('🔍 尝试智能内容检测...');
        content = await intelligentContentDetection(siteName);
        
        if (content.trim() && !content.includes('无法自动提取')) {
            extractionMethod = '智能检测';
            console.log('✅ 智能内容检测成功');
            return content;
        }
        
        // 4. 最后尝试通用内容提取
        console.log('🔍 尝试通用内容提取...');
        content = await genericContentExtraction(siteName);
        
        if (content.trim() && !content.includes('无法自动提取')) {
            extractionMethod = '通用提取';
            console.log('✅ 通用内容提取成功');
            return content;
        }
        
    } catch (error) {
        console.error('❌ 内容提取过程中发生错误:', error);
        return `内容提取失败: ${error.message}`;
    } finally {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.log(`📊 内容提取完成 - 方法: ${extractionMethod || '失败'}, 耗时: ${duration.toFixed(2)}ms`);
    }
    
    // 如果都失败了，返回提示信息
    console.log('⚠️ 所有提取方法都失败，返回提示信息');
    return `无法自动提取 ${siteName} 的详细内容，请手动复制。\n\n提示：该站点可能尚未配置内容提取规则，或者页面结构发生了变化。`;
}

// 验证选择器有效性
function validateSelectors(selectors, searchRoot = document) {
    const validSelectors = [];
    for (const selector of selectors) {
        try {
            const elements = searchRoot.querySelectorAll(selector);
            if (elements.length > 0) {
                validSelectors.push(selector);
                console.log(`✅ 选择器 ${selector} 有效，找到 ${elements.length} 个元素`);
            } else {
                console.log(`⚠️ 选择器 ${selector} 无效，未找到元素`);
            }
        } catch (error) {
            console.error(`❌ 选择器 ${selector} 语法错误:`, error);
        }
    }
    return validSelectors;
}


// 优化版选择器提取内容
async function extractWithSelectorsOptimized(selectors, siteName, excludeSelectors = [], messageContainer = null) {
    console.log(`🔍 开始提取 ${siteName} 的内容...`);
    console.log(`🔍 使用选择器:`, selectors);
    console.log(`🔍 排除选择器:`, excludeSelectors);
    console.log(`🔍 消息容器:`, messageContainer);
    
    let content = '';
    
    // 默认排除的选择器
    const defaultExcludeSelectors = ['nav', 'header', 'footer', '.sidebar', '.menu'];
    const allExcludeSelectors = [...defaultExcludeSelectors, ...(excludeSelectors || [])];
    
    // 如果指定了消息容器，先查找容器
    let searchRoot = document;
    let messageContainers = [];
    if (messageContainer) {
        messageContainers = Array.from(document.querySelectorAll(messageContainer));
        console.log(`🔍 找到 ${messageContainers.length} 个消息容器`);
        
        if (messageContainers.length === 0) {
            console.log(`⚠️ 未找到消息容器 ${messageContainer}，使用整个文档`);
        } else {
            console.log(`🔍 将在 ${messageContainers.length} 个消息容器中搜索内容`);
        }
    }
    
    // 如果没有消息容器，使用整个文档
    if (messageContainers.length === 0) {
        messageContainers = [document];
    }
    
    // 遍历所有消息容器进行内容提取
    for (const [containerIndex, container] of messageContainers.entries()) {
        console.log(`🔍 处理第 ${containerIndex + 1}/${messageContainers.length} 个消息容器`);
        
        
        // 验证选择器有效性
        const validSelectors = validateSelectors(selectors, container);
        console.log(`🔍 容器内有效选择器数量: ${validSelectors.length}/${selectors.length}`);
    
        // 使用 Promise.all 并行处理选择器
        const extractionPromises = validSelectors.map(async (selector) => {
            try {
                const elements = container.querySelectorAll(selector);
                // 移除重复日志，已在 validateSelectors 中输出
            
            if (elements.length === 0) return '';
            
            let selectorContent = '';
            
            for (const [index, element] of elements.entries()) {
                // 检查是否应该排除此元素
                const shouldExclude = allExcludeSelectors.some(excludeSelector => 
                    element.closest(excludeSelector)
                );
                
                if (shouldExclude) {
                    console.log(`🔍 排除元素:`, element);
                    continue;
                }
                
                // 等待元素内容加载完成
                await waitForContentLoad(element);
                
                // 尝试提取 markdown 格式的内容
                let text = await extractElementContent(element);
                
                if (text.trim()) {
                    selectorContent += `\n\n${text.trim()}\n`;
                }
            }
            
            return selectorContent;
            } catch (error) {
                console.warn(`容器内选择器 ${selector} 提取失败:`, error);
                return '';
            }
        });
        
        // 等待所有选择器处理完成
        const results = await Promise.all(extractionPromises);
        
        // 合并结果，去重处理
        const uniqueResults = [];
        const seenContent = new Set();
        
        for (const result of results) {
            if (result.trim() && !seenContent.has(result.trim())) {
                uniqueResults.push(result);
                seenContent.add(result.trim());
            }
        }
        
        content += uniqueResults.join('\n');
    }
    
    if (!content.trim()) {
        content = `无法自动提取 ${siteName} 的详细内容，请手动复制。`;
    }
    
    return content.trim();
}

// 等待内容加载完成
async function waitForContentLoad(element, timeout = 1000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkContent = () => {
            const hasContent = element.textContent && element.textContent.trim().length > 10;
            const isTimeout = Date.now() - startTime > timeout;
            
            if (hasContent || isTimeout) {
                resolve();
            } else {
                setTimeout(checkContent, 50);
            }
        };
        
        checkContent();
    });
}

// 提取元素内容（优化版）
async function extractElementContent(element) {
    let text = '';
    
    try {
        // 方法1: 检查是否是 markdown 容器，直接使用 innerHTML
        if (element.classList.contains('markdown') || 
            element.classList.contains('response-content-markdown') ||
            element.classList.contains('prose')) {
            // ChatGPT、GROK 等站点的 markdown 容器，直接使用 innerHTML 然后转换
            const html = element.innerHTML || '';
            if (html.trim()) {
                text = convertHtmlToMarkdown(html);
            } else {
                text = element.textContent || element.innerText || '';
            }
        } else if (element.dataset.markdown) {
            // 方法2: 尝试获取 markdown 属性或数据
            text = element.dataset.markdown;
        } else if (element.getAttribute('data-markdown')) {
            text = element.getAttribute('data-markdown');
        } else {
            // 方法3: 使用 innerHTML 保留格式，然后转换为 markdown
            const html = element.innerHTML || '';
            if (html.trim()) {
                text = convertHtmlToMarkdown(html);
            } else {
                // 方法4: 降级到纯文本
                text = element.textContent || element.innerText || '';
            }
        }
        
        // 清理和优化文本
        text = cleanExtractedText(text);
        
    } catch (error) {
        console.warn('提取元素内容失败:', error);
        text = element.textContent || element.innerText || '';
    }
    
    return text;
}

// 清理提取的文本
function cleanExtractedText(text) {
    if (!text) return '';
    
    // 移除多余的空白字符
    text = text.replace(/\s+/g, ' ').trim();
    
    // 移除常见的无用内容
    const unwantedPatterns = [
        /^Loading\.\.\.$/i,
        /^Please wait\.\.\.$/i,
        /^Generating\.\.\.$/i,
        /^Thinking\.\.\.$/i,
        /^Processing\.\.\.$/i
    ];
    
    for (const pattern of unwantedPatterns) {
        text = text.replace(pattern, '');
    }
    
    return text.trim();
}

// 智能内容检测
async function intelligentContentDetection(siteName) {
    console.log(`🧠 开始智能内容检测 ${siteName}...`);
    
    try {
        // 1. 检测流式内容
        const streamingContent = await detectStreamingContent();
        if (streamingContent) {
            console.log('✅ 检测到流式内容');
            return streamingContent;
        }
        
        // 2. 检测最新生成的内容
        const latestContent = await detectLatestContent();
        if (latestContent) {
            console.log('✅ 检测到最新内容');
            return latestContent;
        }
        
        // 3. 检测高价值内容区域
        const valuableContent = await detectValuableContent();
        if (valuableContent) {
            console.log('✅ 检测到高价值内容');
            return valuableContent;
        }
        
    } catch (error) {
        console.error('智能内容检测失败:', error);
    }
    
    return '';
}

// 检测流式内容
async function detectStreamingContent() {
    const streamingSelectors = [
        '.streaming',
        '.typing',
        '.generating',
        '[class*="stream"]',
        '[class*="typing"]',
        '[class*="generating"]',
        '.result-streaming',
        '.response-streaming'
    ];
    
    for (const selector of streamingSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            const content = await extractElementContent(elements[0]);
            if (content) {
                return content;
            }
        }
    }
    
    return '';
}

// 检测最新生成的内容
async function detectLatestContent() {
    // 查找最近添加的元素
    const recentElements = document.querySelectorAll('[class*="message"], [class*="response"], [class*="answer"]');
    
    if (recentElements.length === 0) return '';
    
    // 按时间戳或位置排序，获取最新的
    const latestElement = Array.from(recentElements).pop();
    const content = await extractElementContent(latestElement);
    
    if (content) {
        return content;
    }
    
    return '';
}

// 检测高价值内容区域
async function detectValuableContent() {
    const valuableSelectors = [
        'main',
        'article',
        '.content',
        '.main-content',
        '.chat-content',
        '.conversation',
        '.messages'
    ];
    
    for (const selector of valuableSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
            const content = await extractElementContent(elements[0]);
            if (content && content.length > 100) {
                return content;
            }
        }
    }
    
    return '';
}

// 通用内容提取
async function genericContentExtraction(siteName) {
    console.log(`🔧 开始通用内容提取 ${siteName}...`);
    
    try {
        // 获取页面主要内容
        const mainContent = document.querySelector('main') || document.querySelector('article') || document.body;
        
        if (mainContent) {
            const content = await extractElementContent(mainContent);
            if (content && content.length > 50) {
                return content;
            }
        }
        
        // 如果主要内容提取失败，尝试提取整个页面
        const bodyContent = document.body ? document.body.textContent || document.body.innerText : '';
        if (bodyContent && bodyContent.length > 100) {
            return cleanExtractedText(bodyContent);
        }
        
    } catch (error) {
        console.error('通用内容提取失败:', error);
    }
    
    return '';
}


// 将 HTML 转换为 Markdown
function convertHtmlToMarkdown(html) {
    try {
        // 创建一个临时容器来解析 HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // 简单的 HTML 到 Markdown 转换
        let markdown = html
            // 标题
            .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
            .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n')
            .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n')
            
            // 粗体和斜体
            .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
            
            // 链接
            .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            
            // 代码
            .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
            .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gi, '```\n$1\n```')
            
            // 列表
            .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
                return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
            })
            .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
                let counter = 1;
                return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
            })
            
            // 段落
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            
            // 换行
            .replace(/<br[^>]*>/gi, '\n')
            
            // 表格（简单处理）
            .replace(/<table[^>]*>(.*?)<\/table>/gis, (match, content) => {
                // 提取表头
                const headerMatch = content.match(/<thead[^>]*>(.*?)<\/thead>/is);
                const bodyMatch = content.match(/<tbody[^>]*>(.*?)<\/tbody>/is);
                
                if (headerMatch && bodyMatch) {
                    // 处理表头
                    const headers = headerMatch[1].match(/<th[^>]*>(.*?)<\/th>/gi) || [];
                    const headerRow = headers.map(h => h.replace(/<[^>]*>/g, '').trim()).join(' | ');
                    
                    // 处理表体
                    const rows = bodyMatch[1].match(/<tr[^>]*>(.*?)<\/tr>/gi) || [];
                    const dataRows = rows.map(row => {
                        const cells = row.match(/<td[^>]*>(.*?)<\/td>/gi) || [];
                        return cells.map(cell => cell.replace(/<[^>]*>/g, '').trim()).join(' | ');
                    });
                    
                    return `\n${headerRow}\n${headers.map(() => '---').join(' | ')}\n${dataRows.join('\n')}\n\n`;
                }
                return match;
            })
            
            // 移除其他 HTML 标签
            .replace(/<[^>]*>/g, '')
            
            // 清理多余的空行
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        
        return markdown;
        
    } catch (error) {
        console.warn('HTML 到 Markdown 转换失败:', error);
        // 降级到纯文本
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    }
}