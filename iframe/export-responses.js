// ==================== 导出回答功能实现 ====================

// 安全的国际化函数
function getI18nMessage(key, fallback) {
  try {
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
      const message = chrome.i18n.getMessage(key);
      return message || fallback;
    }
  } catch (error) {
    console.warn('国际化函数调用失败:', error);
  }
  return fallback;
}

// 内容质量检测
function isHighQualityContent(content) {
  if (!content || content.length < 10) return false;
  
  // 检查是否包含AI回答的特征
  const aiIndicators = [
    '回答', '回复', 'response', 'answer',
    '根据', '基于', '建议', '推荐',
    '分析', '总结', '解释', '说明',
    '首先', '其次', '最后', '总结',
    '我认为', '建议', '推荐', '可以',
    '以下', '如下', '具体', '详细'
  ];
  
  const hasAIIndicator = aiIndicators.some(indicator => 
    content.toLowerCase().includes(indicator.toLowerCase())
  );
  
  // 检查内容长度和结构
  const hasStructure = content.includes('\n') || content.includes('。') || content.includes('.');
  
  // 检查是否包含代码块或列表
  const hasCodeOrList = content.includes('```') || content.includes('- ') || content.includes('1. ');
  
  // 检查是否包含完整的句子
  const hasCompleteSentences = content.includes('。') || content.includes('!') || content.includes('?');
  
  return hasAIIndicator && (hasStructure || hasCodeOrList) && hasCompleteSentences;
}

// Toast 提示函数
function showToast(message, duration = 2000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #333;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    max-width: 400px;
    text-align: center;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  // 添加显示动画
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);
  
  // 定时移除
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, duration);
}

// 显示导出模态框
function showExportModal() {
  console.log('🎯 开始显示导出模态框');
  
  // 测试 showToast 函数是否可用
  try {
    showToast('导出功能正在加载...', 1000);
  } catch (error) {
    console.error('showToast 函数测试失败:', error);
  }
  
  // 创建模态框
  const modal = document.createElement('div');
  modal.className = 'export-modal';
  modal.innerHTML = `
    <div class="export-modal-content">
      <div class="export-modal-header">
        <h3 class="export-modal-title">📄 ${getI18nMessage('exportModalTitle', '导出AI回答')}</h3>
        <button class="export-close-btn" id="exportCloseBtn">×</button>
      </div>
      
        <div class="export-dev-notice">
          <div class="export-dev-notice-content">
            ⚠️ ${getI18nMessage('devNotice', '功能在开发中，可能会有错误或不足')}
          </div>
        </div>
      
      <div class="export-options">
        <div class="export-option-group">
          <label class="export-option-label">${getI18nMessage('exportFormat', '导出格式')}</label>
          <div class="export-format-buttons">
            <button class="export-format-btn active" data-format="markdown">📝 Markdown</button>
            <button class="export-format-btn" data-format="txt">📄 纯文本</button>
            <button class="export-format-btn" data-format="html">🌐 HTML</button>
          </div>
        </div>
        
        <div class="export-option-group">
          <label class="export-option-label">${getI18nMessage('selectSites', '选择站点')}</label>
          <div class="export-site-selection" id="exportSiteSelection">
            <!-- 站点选项将动态生成 -->
          </div>
        </div>
      </div>
      
      <div class="export-preview">
        <div class="export-preview-title">📋 ${getI18nMessage('preview', '预览')}</div>
        <div class="export-preview-content" id="exportPreviewContent">
          选择站点和格式后将显示预览...
        </div>
      </div>
      
      <div class="export-actions">
        <button class="export-btn export-btn-secondary" id="exportCancelBtn">${getI18nMessage('cancel', '取消')}</button>
        <button class="export-btn export-btn-primary" id="exportConfirmBtn">${getI18nMessage('export', '导出')}</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  console.log('🎯 导出模态框已添加到页面');
  
  // 初始化模态框功能
  initializeExportModal(modal);
}

// 初始化导出模态框功能
function initializeExportModal(modal) {
  const closeBtn = modal.querySelector('#exportCloseBtn');
  const cancelBtn = modal.querySelector('#exportCancelBtn');
  const confirmBtn = modal.querySelector('#exportConfirmBtn');
  const formatButtons = modal.querySelectorAll('.export-format-btn');
  const siteSelection = modal.querySelector('#exportSiteSelection');
  const previewContent = modal.querySelector('#exportPreviewContent');
  
  let selectedFormat = 'markdown';
  let selectedSites = new Set();
  
  // 关闭模态框
  const closeModal = () => {
    modal.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => {
      if (modal.parentElement) {
        modal.remove();
      }
    }, 300);
  };
  
  // 事件监听器
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  
  // 点击背景关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // 格式选择
  formatButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      formatButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedFormat = btn.dataset.format;
      updatePreview();
    });
  });
  
  // 加载站点列表
  loadExportSites(siteSelection, modal);
  
  // 更新预览
  function updatePreview() {
    if (!modal.selectedSites || modal.selectedSites.size === 0) {
      previewContent.textContent = '请选择要导出的站点...';
      return;
    }
    
    // 收集选中站点的回答内容
    collectResponses(modal.selectedSites).then(responses => {
      const preview = generatePreview(responses, selectedFormat);
      previewContent.textContent = preview;
    }).catch(error => {
      previewContent.textContent = `预览生成失败: ${error.message}`;
    });
  }
  
  // 确认导出
  confirmBtn.addEventListener('click', async () => {
    console.log('导出按钮被点击，当前选中的站点:', Array.from(modal.selectedSites || new Set()));
    
    if (!modal.selectedSites || modal.selectedSites.size === 0) {
      showToast(getI18nMessage('selectSitesToExport', '请选择要导出的站点'));
      return;
    }
    
    try {
      confirmBtn.disabled = true;
      confirmBtn.textContent = '导出中...';
      
      // 收集回答内容
      const responses = await collectResponses(modal.selectedSites);
      
      // 生成导出内容
      const exportContent = generateExportContent(responses, selectedFormat);
      
      // 执行导出
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `ai-responses-${timestamp}.${selectedFormat === 'txt' ? 'txt' : selectedFormat}`;
      const mimeType = selectedFormat === 'html' ? 'text/html' : 
                      selectedFormat === 'txt' ? 'text/plain' : 'text/markdown';
      
      downloadFile(exportContent, filename, mimeType);
      
      showToast(getI18nMessage('exportSuccess', '导出成功！'));
      closeModal();
      
    } catch (error) {
      console.error('导出失败:', error);
      showToast(getI18nMessage('exportFailed', '导出失败') + ': ' + error.message);
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = getI18nMessage('export', '导出');
    }
  });
}

// 加载导出站点列表
function loadExportSites(container, modal) {
  const iframes = document.querySelectorAll('.ai-iframe');
  const selectedSites = new Set();
  
  iframes.forEach(iframe => {
    const siteName = iframe.getAttribute('data-site');
    if (!siteName) return;
    
    const siteItem = document.createElement('div');
    siteItem.className = 'export-site-item';
    siteItem.innerHTML = `
      <input type="checkbox" class="export-site-checkbox" id="site-${siteName}" checked>
      <label class="export-site-name" for="site-${siteName}">${siteName}</label>
    `;
    
    // 添加到选中列表
    selectedSites.add(siteName);
    
    // 添加选择事件
    const checkbox = siteItem.querySelector('.export-site-checkbox');
    checkbox.addEventListener('change', (e) => {
      console.log(`站点 ${siteName} 选择状态改变:`, e.target.checked);
      
      if (e.target.checked) {
        selectedSites.add(siteName);
      } else {
        selectedSites.delete(siteName);
      }
      
      console.log('当前选中的站点:', Array.from(selectedSites));
      
      // 更新预览
      const previewContent = modal.querySelector('#exportPreviewContent');
      if (selectedSites.size === 0) {
        previewContent.textContent = '请选择要导出的站点...';
      } else {
        collectResponses(selectedSites).then(responses => {
          const formatButtons = modal.querySelectorAll('.export-format-btn');
          const activeFormat = modal.querySelector('.export-format-btn.active').dataset.format;
          const preview = generatePreview(responses, activeFormat);
          previewContent.textContent = preview;
        }).catch(error => {
          previewContent.textContent = `预览生成失败: ${error.message}`;
        });
      }
    });
    
    container.appendChild(siteItem);
  });
  
  // 将 selectedSites 存储到模态框对象上
  modal.selectedSites = selectedSites;
  
  console.log('初始选中的站点:', Array.from(selectedSites));
  
  // 初始化预览
  setTimeout(() => {
    const previewContent = modal.querySelector('#exportPreviewContent');
    if (selectedSites.size > 0) {
      collectResponses(selectedSites).then(responses => {
        const formatButtons = modal.querySelectorAll('.export-format-btn');
        const activeFormat = modal.querySelector('.export-format-btn.active').dataset.format;
        const preview = generatePreview(responses, activeFormat);
        previewContent.textContent = preview;
      }).catch(error => {
        previewContent.textContent = `预览生成失败: ${error.message}`;
      });
    }
  }, 100);
}

// 收集iframe中的回答内容
async function collectResponses(selectedSites) {
  console.log('🎯 开始收集回答内容，选择的站点:', selectedSites);
  
  const responses = [];
  
  for (const siteName of selectedSites) {
    try {
      const iframe = document.querySelector(`[data-site="${siteName}"]`);
      if (!iframe) {
        console.log(`⚠️ 未找到 ${siteName} 的iframe`);
        continue;
      }
      
      console.log(`🎯 开始提取 ${siteName} 的内容...`);
      
      // 尝试从iframe中提取内容
      const extractResult = await extractIframeContent(iframe, siteName);
      
      // 处理新的返回格式
      let content, thinking, quality, extractionMethod;
      
      if (typeof extractResult === 'string') {
        // 旧格式 - 只是字符串内容
        content = extractResult;
        thinking = '';
        quality = isHighQualityContent(content) ? 'high' : 'low';
        extractionMethod = 'legacy';
      } else if (extractResult && typeof extractResult === 'object') {
        // 新格式 - 包含详细信息的对象
        content = extractResult.content || '';
        thinking = extractResult.thinking || '';
        quality = extractResult.quality || 'low';
        extractionMethod = extractResult.extractionMethod || 'unknown';
      } else {
        content = '';
        thinking = '';
        quality = 'error';
        extractionMethod = 'failed';
      }
      
      if (content && content.trim()) {
        const responseData = {
          siteName: siteName,
          content: content.trim(),
          thinking: thinking.trim(),
          timestamp: new Date().toISOString(),
          quality: quality,
          extractionMethod: extractionMethod,
          length: content.length,
          url: iframe.src || 'unknown'
        };
        
        // 如果有thinking内容，添加到描述中
        if (thinking) {
          responseData.hasThinking = true;
          responseData.thinkingLength = thinking.length;
        }
        
         responses.push(responseData);
         console.log(`✅ 成功提取 ${siteName} 内容，长度: ${content.length}${thinking ? `, thinking: ${thinking.length}` : ''}, 质量: ${quality}, 方法: ${extractionMethod}`);
       } else {
         console.log(`⚠️ ${siteName} 未提取到内容`);
       }
    } catch (error) {
      console.error(`❌ 提取 ${siteName} 内容失败:`, error);
      responses.push({
        siteName: siteName,
        content: `内容提取失败: ${error.message}`,
        timestamp: new Date().toISOString(),
        error: true,
        quality: 'error'
      });
    }
  }
  
  console.log(`🎯 收集完成，共获得 ${responses.length} 个回答`);
  
  return responses;
}

// 从iframe中提取内容
async function extractIframeContent(iframe, siteName) {
  // 优先使用消息通信方式（适用于跨域iframe）
  try {
    console.log(`尝试通过消息通信获取 ${siteName} 内容...`);
    const result = await requestIframeContent(iframe, siteName);
    if (result && result.trim()) {
      console.log(`✅ 成功通过消息通信获取 ${siteName} 内容`);
      return result;
    }
  } catch (error) {
    console.log(`消息通信获取 ${siteName} 内容失败:`, error.message);
  }
  
  // 备用方案：尝试直接访问（仅适用于同域iframe）
  try {
    console.log(`尝试直接访问 ${siteName} iframe内容...`);
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    if (iframeDoc) {
      const result = await extractContentFromDocument(iframeDoc, siteName);
      if (result && result.trim()) {
        console.log(`✅ 成功直接访问 ${siteName} 内容`);
        return result;
      }
    }
  } catch (error) {
    console.log(`无法直接访问 ${siteName} iframe内容 (跨域限制):`, error.message);
  }
  
  // 最后备用方案：提供手动复制提示
  console.log(`⚠️ 无法自动提取 ${siteName} 内容，请手动复制`);
  return `无法自动提取 ${siteName} 的详细内容，请手动复制。\n\n提示：您可以：\n1. 在 ${siteName} 页面中手动选择并复制内容\n2. 或者尝试刷新页面后再次导出`;
}

// 通用思考块过滤器：提取正式回答，过滤思考内容
async function extractContentWithThinkingFilter(element, thinkingBlockFilters, siteName = 'Unknown') {
  try {
    console.log(`🎯 ${siteName} 思考块过滤开始`);
    
    // 克隆元素以避免修改原始DOM
    const clonedElement = element.cloneNode(true);
    
    // 移除思考块元素
    if (thinkingBlockFilters && thinkingBlockFilters.length > 0) {
      for (const filter of thinkingBlockFilters) {
        const thinkingBlocks = clonedElement.querySelectorAll(filter);
        console.log(`🎯 找到 ${thinkingBlocks.length} 个思考块元素 (${filter})`);
        
        thinkingBlocks.forEach(block => {
          // 通用思考块识别规则
          const blockText = block.textContent || '';
          const isThinkingBlock = isThinkingContent(blockText, block);
          
          if (isThinkingBlock) {
            console.log(`🎯 移除${siteName}思考块:`, blockText.substring(0, 100));
            block.remove();
          }
        });
      }
    }
    
    // 提取过滤后的内容
    const content = await extractElementContent(clonedElement);
    console.log(`🎯 ${siteName} 过滤后内容长度:`, content.length);
    
    return content;
  } catch (error) {
    console.error(`❌ ${siteName} 思考块过滤失败:`, error);
    // 降级到直接提取
    return await extractElementContent(element);
  }
}

// 通用思考内容识别函数
function isThinkingContent(text, element) {
  // 文本内容关键词识别（支持多语言）
  const thinkingKeywords = [
    // 英文关键词
    'thinking', 'thought', 'consider', 'analysis', 'reasoning', 'pondering',
    'reflecting', 'deliberating', 'contemplating', 'processing',
    
    // 中文关键词
    '思考', '考虑', '分析', '推理', '反思', '琢磨', '思量', '深思',
    '分析中', '思考中', '处理中', '推理过程',
    
    // 其他语言
    'réflexion', 'pensée', 'análisis', 'pensamiento', // 法语、西语
    'nachdenken', 'überlegung', 'analisi', 'riflessione' // 德语、意语
  ];
  
  // 检查文本关键词
  const lowerText = text.toLowerCase();
  const hasThinkingKeyword = thinkingKeywords.some(keyword => 
    lowerText.includes(keyword.toLowerCase())
  );
  
  // DOM特征识别
  const hasThinkingDOMFeatures = 
    element.querySelector('button[aria-expanded]') || // 可展开的思考块
    element.classList.contains('transition-all') || // 动画样式的思考块
    element.classList.contains('thinking') ||
    element.classList.contains('reasoning') ||
    element.querySelector('.thinking') ||
    element.querySelector('.reasoning') ||
    element.querySelector('[class*="thinking"]') ||
    element.querySelector('[class*="reasoning"]') ||
    element.querySelector('[class*="analysis"]');
  
  // 特殊模式识别
  const hasThinkingPatterns = 
    lowerText.match(/^(thinking|thought|考虑|思考)[:：]?\s*/) || // 以思考开头
    lowerText.match(/(let me think|让我想想|我来思考)/) || // 思考表达
    lowerText.match(/\[thinking\]/i) || // 标记格式
    lowerText.match(/\*thinking\*/i) || // markdown格式
    element.hasAttribute('data-thinking') || // 特殊属性
    element.hasAttribute('data-internal'); // 内部思考属性
  
  return hasThinkingKeyword || hasThinkingDOMFeatures || hasThinkingPatterns;
}

// 从文档中提取内容
async function extractContentFromDocument(doc, siteName) {
  try {
    // 获取站点特定的内容提取配置
    const siteConfig = await getSiteContentExtractorConfig(siteName);
    console.log(`📋 ${siteName} 使用配置:`, siteConfig);
    
    let responses = [];
    
    // 使用新的配置结构
    if (siteConfig && siteConfig.messageContainer) {
      // 方法1: 使用messageContainer查找AI消息容器
      responses = await extractMessagesWithContainer(doc, siteName, siteConfig);
    } else if (siteConfig && siteConfig.contentSelectors) {
      // 方法2: 使用contentSelectors直接查找内容（向后兼容）
      const content = await extractWithSelectors(doc, siteConfig.contentSelectors, siteConfig.excludeSelectors, siteName);
      if (content.trim()) {
        responses.push({
          siteName: siteName,
          content: content.trim(),
          thinking: '',
          quality: isHighQualityContent(content) ? 'high' : 'low',
          extractionMethod: 'contentSelectors'
        });
      }
    } else if (siteConfig && siteConfig.selectors) {
      // 方法3: 向后兼容旧配置结构
      const content = await extractWithSelectors(doc, siteConfig.selectors, siteConfig.excludeSelectors, siteName);
      if (content.trim()) {
        responses.push({
          siteName: siteName,
          content: content.trim(),
          thinking: '',
          quality: isHighQualityContent(content) ? 'high' : 'low',
          extractionMethod: 'legacy'
        });
      }
    }
    
    // 如果没有找到内容，使用fallback方式
    if (responses.length === 0) {
      const fallbackSelectors = siteConfig?.fallbackSelectors || [
        '[data-message-author-role="assistant"]',
        '.markdown',
        '.prose',
        '[class*="message"]',
        '[class*="response"]',
        '[class*="answer"]',
        '[class*="content"]',
        'main',
        'article',
        '.container'
      ];
      
      const content = await extractWithSelectors(doc, fallbackSelectors, siteConfig?.excludeSelectors, siteName);
      if (content.trim()) {
        responses.push({
          siteName: siteName,
          content: content.trim(),
          thinking: '',
          quality: isHighQualityContent(content) ? 'high' : 'low',
          extractionMethod: 'fallback'
        });
      }
    }
    
    // 如果还是没有找到内容，返回页面文本
    if (responses.length === 0) {
      const pageText = doc.body ? (doc.body.textContent || doc.body.innerText || '').trim() : '';
      if (pageText) {
        responses.push({
          siteName: siteName,
          content: pageText.slice(0, 1000) + (pageText.length > 1000 ? '...' : ''),
          thinking: '',
          quality: 'low',
          extractionMethod: 'page_text'
        });
      }
    }
    
    // 合并多个回答的内容
    if (responses.length > 0) {
      const mainContent = responses.map(r => r.content).join('\n\n---\n\n');
      const allThinking = responses.filter(r => r.thinking).map(r => r.thinking).join('\n\n');
      
      return {
        content: mainContent,
        thinking: allThinking,
        quality: responses.some(r => r.quality === 'high') ? 'high' : 'low',
        extractionMethod: responses[0].extractionMethod,
        messageCount: responses.length
      };
    }
    
    return `无法从 ${siteName} 提取内容`;
  } catch (error) {
    console.error(`提取 ${siteName} 内容时出错:`, error);
    return `提取 ${siteName} 内容时出错: ${error.message}`;
  }
}

// 使用messageContainer配置提取消息
async function extractMessagesWithContainer(doc, siteName, siteConfig) {
  const responses = [];
  
  try {
    console.log(`🔍 ${siteName} 开始查找消息容器:`, siteConfig.messageContainer);
    
    // 如果有containerSelector，限定搜索范围
    let searchRoot = doc;
    if (siteConfig.containerSelector) {
      const container = doc.querySelector(siteConfig.containerSelector);
      if (container) {
        searchRoot = container;
        console.log(`📍 ${siteName} 使用容器范围:`, siteConfig.containerSelector);
      } else {
        console.log(`⚠️ ${siteName} 未找到指定容器:`, siteConfig.containerSelector);
      }
    }
    
    // 检查编辑模式（如Gemini的textarea编辑状态）
    if (siteConfig.editModeCheck) {
      const editElements = searchRoot.querySelectorAll(siteConfig.editModeCheck);
      if (editElements.length > 0) {
        console.log(`⏸️ ${siteName} 检测到编辑模式，跳过内容提取`);
        return responses;
      }
    }
    
    // 查找所有AI消息容器
    const messageContainers = searchRoot.querySelectorAll(siteConfig.messageContainer);
    console.log(`📝 ${siteName} 找到 ${messageContainers.length} 个消息容器`);
    
    if (messageContainers.length === 0) {
      console.log(`⚠️ ${siteName} 未找到消息容器，使用fallback`);
      return responses;
    }
    
    for (const [index, container] of messageContainers.entries()) {
      // 检查是否应该排除此容器
      const shouldExclude = siteConfig.excludeSelectors && siteConfig.excludeSelectors.some(excludeSelector => {
        try {
          return container.matches(excludeSelector) || container.closest(excludeSelector);
        } catch (e) {
          return false;
        }
      });
      
      if (shouldExclude) {
        console.log(`⏭️ ${siteName} 跳过被排除的容器 ${index + 1}`);
        continue;
      }
      
      // 检查是否包含用户消息（避免提取用户输入）
      if (siteConfig.userMessageSelector) {
        const userMessageElement = container.querySelector(siteConfig.userMessageSelector);
        if (userMessageElement) {
          console.log(`👤 ${siteName} 容器 ${index + 1} 包含用户消息，跳过`);
          continue;
        }
      }
      
      let mainContent = '';
      let thinkingContent = '';
      
      // 提取主要内容
      if (siteConfig.contentSelectors && siteConfig.contentSelectors.length > 0) {
        for (const contentSelector of siteConfig.contentSelectors) {
          const contentElements = container.querySelectorAll(contentSelector);
          if (contentElements.length > 0) {
            for (const element of contentElements) {
              // 通用思考块过滤处理
              if (siteConfig.thinkingBlockFilters && siteConfig.thinkingBlockFilters.length > 0) {
                const filteredContent = await extractContentWithThinkingFilter(
                  element, 
                  siteConfig.thinkingBlockFilters, 
                  siteName
                );
                if (filteredContent.trim()) {
                  mainContent += (mainContent ? '\n\n' : '') + filteredContent.trim();
                  break;
                }
              } else {
                const text = await extractElementContent(element);
                if (text.trim()) {
                  mainContent += (mainContent ? '\n\n' : '') + text.trim();
                  break; // 找到内容就停止
                }
              }
            }
            if (mainContent) break; // 找到内容就停止尝试其他选择器
          }
        }
      }
      
      // 如果没找到主要内容，直接从容器提取
      if (!mainContent) {
        mainContent = await extractElementContent(container);
      }
      
      // 提取thinking内容（如果配置了）
      if (siteConfig.extractThinking && siteConfig.thinkingSelector) {
        try {
          const thinkingElements = container.querySelectorAll(siteConfig.thinkingSelector);
          for (const element of thinkingElements) {
            // 确保thinking元素不包含主要内容
            if (!element.querySelector('.markdown') && !element.classList.contains('markdown')) {
              const text = element.textContent || element.innerText || '';
              if (text.trim() && !text.includes('button') && text.length > 10) {
                thinkingContent += (thinkingContent ? '\n\n' : '') + text.trim();
              }
            }
          }
        } catch (error) {
          console.warn(`提取 ${siteName} thinking内容失败:`, error);
        }
      }
      
      // 如果找到了有效内容，添加到响应列表
      if (mainContent && mainContent.trim()) {
        const quality = isHighQualityContent(mainContent);
        responses.push({
          siteName: siteName,
          content: mainContent.trim(),
          thinking: thinkingContent.trim(),
          quality: quality ? 'high' : 'low',
          extractionMethod: 'messageContainer',
          position: index
        });
        
        console.log(`✅ ${siteName} 成功提取消息 ${index + 1}${thinkingContent ? ' (含thinking)' : ''}`);
      }
    }
    
    // 按位置排序消息
    responses.sort((a, b) => a.position - b.position);
    
    console.log(`🎯 ${siteName} 共提取到 ${responses.length} 条有效回答`);
    return responses;
  } catch (error) {
    console.error(`${siteName} extractMessagesWithContainer 出错:`, error);
    return responses;
  }
}

// 使用选择器提取内容
// 优化版选择器提取内容
async function extractWithSelectors(doc, selectors, excludeSelectors = [], siteName = '') {
  let content = '';
  
  // 使用 Promise.all 并行处理选择器
  const extractionPromises = selectors.map(async (selector) => {
    try {
      const elements = doc.querySelectorAll(selector);
      
      if (elements.length === 0) return '';
      
      let selectorContent = '';
      
      for (const [elementIndex, element] of elements.entries()) {
        // 检查是否应该排除此元素
        const shouldExclude = excludeSelectors && excludeSelectors.some(excludeSelector => {
          try {
            return element.matches(excludeSelector) || element.closest(excludeSelector);
          } catch (e) {
            return false;
          }
        });
        
        if (shouldExclude) continue;
        
        // 等待元素内容加载完成
        await waitForContentLoad(element);
        
        // 尝试提取内容
        let text = await extractElementContent(element);
        
        if (text.trim()) {
          // 内容质量检测
          const quality = isHighQualityContent(text);
          const qualityLabel = quality ? '' : ' (低质量)';
          
          // 如果有siteName，添加标题，否则直接添加内容
          if (siteName) {
            selectorContent += `\n\n## ${siteName} 回答 ${elementIndex + 1}${qualityLabel}\n\n${text.trim()}\n`;
          } else {
            selectorContent += (selectorContent ? '\n\n' : '') + text.trim();
          }
        }
      }
      
      return selectorContent;
    } catch (error) {
      console.warn(`选择器 ${selector} 提取失败:`, error);
      return '';
    }
  });
  
  // 等待所有选择器处理完成
  const results = await Promise.all(extractionPromises);
  
  // 合并结果并返回第一个有效内容
  for (const result of results) {
    if (result.trim()) {
      content = result.trim();
      break; // 找到第一个有效结果就停止
    }
  }
  
  return content;
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

// 获取站点特定的内容提取配置
async function getSiteContentExtractorConfig(siteName) {
  try {
    // 优先使用新的统一站点检测器
    if (window.siteDetector) {
      const sites = await window.siteDetector.getSites();
      const site = sites.find(s => s.name === siteName);
      
      if (site && site.contentExtractor) {
        console.log(`✅ 使用新检测器找到 ${siteName} 的内容提取配置`);
        return site.contentExtractor;
      }
    }
    
    // 降级到原有逻辑
    if (typeof window.getDefaultSites === 'function') {
      const sites = await window.getDefaultSites();
      const site = sites.find(s => s.name === siteName);
      return site?.contentExtractor || null;
    } else {
      console.warn('window.getDefaultSites 函数不可用');
      return null;
    }
  } catch (error) {
    console.error('获取站点配置失败:', error);
    return null;
  }
}

// 通过消息通信请求iframe内容
function requestIframeContent(iframe, siteName) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('请求超时'));
    }, 5000);
    
    const messageHandler = (event) => {
      if (event.data.type === 'EXTRACTED_CONTENT' && event.data.siteName === siteName) {
        clearTimeout(timeout);
        window.removeEventListener('message', messageHandler);
        resolve(event.data.content);
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // 发送提取内容请求
    iframe.contentWindow.postMessage({
      type: 'EXTRACT_CONTENT',
      siteName: siteName
    }, '*');
  });
}

// 生成预览内容
function generatePreview(responses, format) {
  if (responses.length === 0) {
    return '没有找到可导出的内容';
  }
  
  let preview = '';
  
  responses.forEach((response, index) => {
    if (format === 'markdown') {
      preview += `## ${response.siteName}\n\n`;
      preview += response.content.substring(0, 200);
      if (response.content.length > 200) {
        preview += '...\n';
      }
      preview += '\n\n---\n\n';
    } else if (format === 'html') {
      preview += `<h2>${response.siteName}</h2>\n`;
      preview += `<p>${response.content.substring(0, 200)}`;
      if (response.content.length > 200) {
        preview += '...</p>\n';
      } else {
        preview += '</p>\n';
      }
      preview += '<hr>\n\n';
    } else {
      preview += `${response.siteName}:\n`;
      preview += response.content.substring(0, 200);
      if (response.content.length > 200) {
        preview += '...\n';
      }
      preview += '\n\n' + '='.repeat(50) + '\n\n';
    }
  });
  
  return preview;
}

// 生成导出内容
function generateExportContent(responses, format) {
  const timestamp = new Date().toLocaleString();
  const query = document.getElementById('searchInput').value || '未指定查询';
  
  let content = '';
  
  if (format === 'markdown') {
    content = `# AI回答汇总\n\n`;
    content += `**查询内容:** ${query}\n`;
    content += `**导出时间:** ${timestamp}\n`;
    content += `**包含站点:** ${responses.length} 个\n\n`;
    content += `---\n\n`;
    
    responses.forEach((response, responseIndex) => {
      content += `## ${responseIndex + 1}. ${response.siteName}\n\n`;
      
      // 添加thinking内容（如果存在）
      if (response.thinking && response.thinking.trim()) {
        content += `### 💭 思考过程\n\n`;
        content += response.thinking + '\n\n';
        content += `### 📝 回答内容\n\n`;
      }
      
      content += response.content + '\n\n';
      
      // 添加元数据
      if (response.quality || response.extractionMethod) {
        content += `> **质量:** ${response.quality === 'high' ? '高' : response.quality === 'low' ? '低' : response.quality}`;
        if (response.extractionMethod) {
          content += ` | **提取方法:** ${response.extractionMethod}`;
        }
        content += '\n\n';
      }
      
      content += `---\n\n`;
    });
    
  } else if (format === 'html') {
    content = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI回答汇总</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        h3 { color: #666; margin-top: 20px; }
        .meta { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .thinking { background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107; margin: 15px 0; border-radius: 4px; }
        .response-meta { font-size: 0.9em; color: #666; margin-top: 10px; }
        .quality-high { color: #28a745; font-weight: bold; }
        .quality-low { color: #ffc107; font-weight: bold; }
        .quality-error { color: #dc3545; font-weight: bold; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
        code { background: #f8f9fa; padding: 2px 4px; border-radius: 3px; }
    </style>
</head>
<body>
    <h1>AI回答汇总</h1>
    <div class="meta">
        <p><strong>查询内容:</strong> ${query}</p>
        <p><strong>导出时间:</strong> ${timestamp}</p>
        <p><strong>包含站点:</strong> ${responses.length} 个</p>
    </div>`;
    
    responses.forEach((response, responseIndex) => {
      content += `<h2>${responseIndex + 1}. ${response.siteName}</h2>`;
      
      // 添加thinking内容（如果存在）
      if (response.thinking && response.thinking.trim()) {
        content += `<h3>💭 思考过程</h3>`;
        content += `<div class="thinking">${response.thinking.replace(/\n/g, '<br>')}</div>`;
        content += `<h3>📝 回答内容</h3>`;
      }
      
      content += `<div>${response.content.replace(/\n/g, '<br>')}</div>`;
      
      // 添加元数据
      if (response.quality || response.extractionMethod) {
        const qualityClass = response.quality === 'high' ? 'quality-high' : response.quality === 'low' ? 'quality-low' : 'quality-error';
        content += `<div class="response-meta">`;
        content += `<span class="${qualityClass}">质量: ${response.quality === 'high' ? '高' : response.quality === 'low' ? '低' : response.quality}</span>`;
        if (response.extractionMethod) {
          content += ` | 提取方法: ${response.extractionMethod}`;
        }
        content += `</div>`;
      }
      
      if (responseIndex < responses.length - 1) {
        content += '<hr>';
      }
    });
    
    content += `</body></html>`;
    
  } else { // txt format
    content = `AI回答汇总\n\n`;
    content += `查询内容: ${query}\n`;
    content += `导出时间: ${timestamp}\n`;
    content += `包含站点: ${responses.length} 个\n\n`;
    content += `${'='.repeat(50)}\n\n`;
    
    responses.forEach((response, responseIndex) => {
      content += `${responseIndex + 1}. ${response.siteName}\n`;
      content += `${'-'.repeat(response.siteName.length + 3)}\n\n`;
      
      // 添加thinking内容（如果存在）
      if (response.thinking && response.thinking.trim()) {
        content += `💭 思考过程:\n`;
        content += response.thinking + '\n\n';
        content += `📝 回答内容:\n`;
      }
      
      content += response.content + '\n\n';
      
      // 添加元数据
      if (response.quality || response.extractionMethod) {
        content += `[质量: ${response.quality === 'high' ? '高' : response.quality === 'low' ? '低' : response.quality}`;
        if (response.extractionMethod) {
          content += ` | 提取方法: ${response.extractionMethod}`;
        }
        content += ']\n\n';
      }
      
      content += `${'='.repeat(50)}\n\n`;
    });
  }
  
  return content;
}

// 执行导出
async function exportContent(content, format) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const query = document.getElementById('searchInput').value || 'AI回答';
  const filename = `AI回答汇总_${query}_${timestamp}`;
  
  if (format === 'markdown') {
    downloadFile(content, `${filename}.md`, 'text/markdown');
  } else if (format === 'html') {
    downloadFile(content, `${filename}.html`, 'text/html');
  } else {
    downloadFile(content, `${filename}.txt`, 'text/plain');
  }
}

// 下载文件
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
}

// HTML到Markdown转换函数（优化版）
function convertHtmlToMarkdown(html) {
  try {
    if (!html || typeof html !== 'string') return '';
    
    // 创建临时容器来解析HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 移除script和style标签
    tempDiv.querySelectorAll('script, style').forEach(el => el.remove());
    
    // 获取处理后的HTML
    let markdown = tempDiv.innerHTML
      // 代码块（需要在其他处理之前）
      .replace(/<pre[^>]*><code[^>]*class="[^"]*language-([^"]*)"[^>]*>(.*?)<\/code><\/pre>/gis, '```$1\n$2\n```\n\n')
      .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n')
      .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n')
      
      // 标题（h1-h6）
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
      
      // 行内代码
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      
      // 列表处理
      .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
        const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
        return items + '\n';
      })
      .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
        let counter = 1;
        const items = content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. ${arguments[1]}\n`);
        return items + '\n';
      })
      
      // 引用
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
        return content.split('\n').map(line => '> ' + line.trim()).join('\n') + '\n\n';
      })
      
      // 表格（基础支持）
      .replace(/<table[^>]*>(.*?)<\/table>/gis, (match, content) => {
        // 简化的表格处理
        const rows = content.match(/<tr[^>]*>(.*?)<\/tr>/gi);
        if (rows && rows.length > 0) {
          let tableMarkdown = '';
          let isFirstRow = true;
          
          for (const row of rows) {
            const cells = row.match(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi);
            if (cells) {
              const cellContents = cells.map(cell => 
                cell.replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi, '$1').trim()
              );
              tableMarkdown += '| ' + cellContents.join(' | ') + ' |\n';
              
              if (isFirstRow) {
                tableMarkdown += '|' + ' --- |'.repeat(cellContents.length) + '\n';
                isFirstRow = false;
              }
            }
          }
          return tableMarkdown + '\n';
        }
        return content;
      })
      
      // 段落和div
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n')
      
      // 换行
      .replace(/<br[^>]*\/?>/gi, '\n')
      
      // 水平线
      .replace(/<hr[^>]*\/?>/gi, '\n---\n\n')
      
      // 清理HTML标签
      .replace(/<[^>]+>/g, '')
      
      // HTML实体解码
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      
      // 清理多余的空行
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    return markdown;
  } catch (error) {
    console.warn('HTML转Markdown失败:', error);
    // 降级到纯文本
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }
}
