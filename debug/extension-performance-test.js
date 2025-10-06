// AI Shortcuts 扩展专用性能测试脚本
// 使用方法：在 DevTools Console 中运行此脚本

console.log('🚀 AI Shortcuts 扩展性能测试开始...');
console.log('='.repeat(60));

// 性能测试配置
const TEST_CONFIG = {
  iterations: 10,
  memoryThreshold: 50 * 1024 * 1024, // 50MB
  responseTimeThreshold: 200, // 200ms
  domNodeThreshold: 100
};

// 测试结果存储
const testResults = {
  memory: [],
  responseTime: [],
  domNodes: [],
  errors: []
};

// 1. 内存使用测试
function testMemoryUsage() {
  console.log('📊 测试内存使用情况...');
  
  if (!performance.memory) {
    console.warn('⚠️ 内存信息不可用，请确保在 Chrome 中运行');
    return;
  }
  
  const memory = performance.memory;
  const usedMB = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
  const totalMB = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
  const limitMB = (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
  
  console.log(`  已使用内存: ${usedMB} MB`);
  console.log(`  总内存: ${totalMB} MB`);
  console.log(`  内存限制: ${limitMB} MB`);
  
  const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(2);
  console.log(`  内存使用率: ${usagePercent}%`);
  
  if (usagePercent > 80) {
    console.error('❌ 内存使用率过高！');
    testResults.errors.push('内存使用率过高');
  } else if (usagePercent > 60) {
    console.warn('⚠️ 内存使用率较高');
  } else {
    console.log('✅ 内存使用正常');
  }
  
  testResults.memory.push({
    used: memory.usedJSHeapSize,
    total: memory.totalJSHeapSize,
    limit: memory.jsHeapSizeLimit,
    usagePercent: parseFloat(usagePercent)
  });
}

// 2. 扩展启动性能测试
async function testExtensionStartup() {
  console.log('🚀 测试扩展启动性能...');
  
  const startTime = performance.now();
  
  try {
    // 测试配置加载
    const configStart = performance.now();
    const config = await chrome.storage.sync.get(['buttonConfig', 'favoriteSites']);
    const configTime = performance.now() - configStart;
    
    console.log(`  配置加载时间: ${configTime.toFixed(2)}ms`);
    
    if (configTime > 100) {
      console.warn('⚠️ 配置加载较慢');
    }
    
    // 测试站点列表获取
    const sitesStart = performance.now();
    if (typeof window.getDefaultSites === 'function') {
      const sites = await window.getDefaultSites();
      const sitesTime = performance.now() - sitesStart;
      console.log(`  站点列表获取时间: ${sitesTime.toFixed(2)}ms`);
      console.log(`  站点数量: ${sites ? sites.length : 0}`);
    }
    
    const totalTime = performance.now() - startTime;
    console.log(`  总启动时间: ${totalTime.toFixed(2)}ms`);
    
    if (totalTime > 200) {
      console.warn('⚠️ 启动时间较慢');
      testResults.errors.push('启动时间过慢');
    } else {
      console.log('✅ 启动性能正常');
    }
    
    testResults.responseTime.push({
      operation: 'startup',
      time: totalTime,
      configTime: configTime
    });
    
  } catch (error) {
    console.error('❌ 启动测试失败:', error);
    testResults.errors.push(`启动测试失败: ${error.message}`);
  }
}

// 3. 浮动按钮性能测试
function testFloatButtonPerformance() {
  console.log('🎯 测试浮动按钮性能...');
  
  const button = document.querySelector('.multi-ai-container');
  if (!button) {
    console.warn('⚠️ 未找到浮动按钮');
    return;
  }
  
  // 测试按钮渲染时间
  const renderStart = performance.now();
  const buttonRect = button.getBoundingClientRect();
  const renderTime = performance.now() - renderStart;
  
  console.log(`  按钮渲染时间: ${renderTime.toFixed(2)}ms`);
  console.log(`  按钮位置: (${buttonRect.left}, ${buttonRect.top})`);
  console.log(`  按钮大小: ${buttonRect.width}x${buttonRect.height}`);
  
  // 测试事件监听器数量
  const eventListeners = countEventListeners(button);
  console.log(`  事件监听器数量: ${eventListeners}`);
  
  if (eventListeners > 10) {
    console.warn('⚠️ 事件监听器过多');
  }
  
  // 测试 DOM 节点数量
  const domNodes = button.querySelectorAll('*').length;
  console.log(`  DOM 节点数量: ${domNodes}`);
  
  if (domNodes > 50) {
    console.warn('⚠️ DOM 节点过多');
  }
  
  testResults.domNodes.push({
    renderTime: renderTime,
    eventListeners: eventListeners,
    domNodes: domNodes
  });
}

// 4. 消息传递性能测试
async function testMessagePerformance() {
  console.log('📨 测试消息传递性能...');
  
  const messageTests = [
    { action: 'ping', expectedTime: 50 },
    { action: 'getSites', expectedTime: 100 },
    { action: 'getConfig', expectedTime: 100 }
  ];
  
  for (const test of messageTests) {
    const startTime = performance.now();
    
    try {
      await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(test, (response) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(response);
          }
        });
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`  ${test.action}: ${duration.toFixed(2)}ms`);
      
      if (duration > test.expectedTime) {
        console.warn(`⚠️ ${test.action} 响应时间过长`);
      }
      
      testResults.responseTime.push({
        operation: test.action,
        time: duration
      });
      
    } catch (error) {
      console.error(`❌ ${test.action} 测试失败:`, error);
      testResults.errors.push(`${test.action} 测试失败`);
    }
  }
}

// 5. 存储操作性能测试
async function testStoragePerformance() {
  console.log('💾 测试存储操作性能...');
  
  const storageTests = [
    { type: 'sync', key: 'test_sync', value: { test: 'data' } },
    { type: 'local', key: 'test_local', value: { test: 'data' } }
  ];
  
  for (const test of storageTests) {
    const startTime = performance.now();
    
    try {
      // 写入测试
      await new Promise((resolve, reject) => {
        chrome.storage[test.type].set({ [test.key]: test.value }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
      
      // 读取测试
      await new Promise((resolve, reject) => {
        chrome.storage[test.type].get(test.key, (result) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(result);
          }
        });
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`  ${test.type} 存储操作: ${duration.toFixed(2)}ms`);
      
      if (duration > 100) {
        console.warn(`⚠️ ${test.type} 存储操作较慢`);
      }
      
      testResults.responseTime.push({
        operation: `${test.type}_storage`,
        time: duration
      });
      
    } catch (error) {
      console.error(`❌ ${test.type} 存储测试失败:`, error);
      testResults.errors.push(`${test.type} 存储测试失败`);
    }
  }
}

// 6. 网络请求性能测试
function testNetworkPerformance() {
  console.log('🌐 测试网络请求性能...');
  
  const resources = performance.getEntriesByType('resource');
  const extensionResources = resources.filter(r => 
    r.name.includes('chrome-extension://') || 
    r.name.includes('chrome-extension:')
  );
  
  console.log(`  扩展资源数量: ${extensionResources.length}`);
  
  let slowResources = 0;
  let totalLoadTime = 0;
  
  extensionResources.forEach(resource => {
    const loadTime = resource.responseEnd - resource.startTime;
    totalLoadTime += loadTime;
    
    if (loadTime > 500) {
      slowResources++;
      console.warn(`⚠️ 慢资源: ${resource.name.split('/').pop()} (${loadTime.toFixed(2)}ms)`);
    }
  });
  
  const avgLoadTime = extensionResources.length > 0 ? totalLoadTime / extensionResources.length : 0;
  console.log(`  平均加载时间: ${avgLoadTime.toFixed(2)}ms`);
  console.log(`  慢资源数量: ${slowResources}`);
  
  if (slowResources > 2) {
    console.warn('⚠️ 慢资源过多');
    testResults.errors.push('慢资源过多');
  }
}

// 7. 长时间任务检测
function testLongTasks() {
  console.log('⏱️ 检测长时间运行的任务...');
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    let longTasks = 0;
    
    entries.forEach(entry => {
      if (entry.duration > 50) {
        longTasks++;
        console.warn(`⚠️ 长时间任务: ${entry.duration.toFixed(2)}ms`);
      }
    });
    
    if (longTasks > 5) {
      console.warn('⚠️ 长时间任务过多');
      testResults.errors.push('长时间任务过多');
    }
  });
  
  observer.observe({ entryTypes: ['longtask'] });
  
  // 5秒后停止观察
  setTimeout(() => {
    observer.disconnect();
    console.log('✅ 长时间任务检测完成');
  }, 5000);
}

// 8. 内存泄漏检测
function testMemoryLeak() {
  console.log('🔍 检测内存泄漏...');
  
  if (!performance.memory) {
    console.warn('⚠️ 内存信息不可用');
    return;
  }
  
  const initialMemory = performance.memory.usedJSHeapSize;
  
  // 执行一些操作来测试内存泄漏
  for (let i = 0; i < 100; i++) {
    // 模拟用户操作
    const div = document.createElement('div');
    div.className = 'test-element';
    div.textContent = `Test ${i}`;
    document.body.appendChild(div);
    document.body.removeChild(div);
  }
  
  // 强制垃圾回收（如果可用）
  if (window.gc) {
    window.gc();
  }
  
  const finalMemory = performance.memory.usedJSHeapSize;
  const memoryIncrease = finalMemory - initialMemory;
  
  console.log(`  内存增长: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
  
  if (memoryIncrease > 10 * 1024 * 1024) { // 10MB
    console.error('❌ 可能存在内存泄漏！');
    testResults.errors.push('可能存在内存泄漏');
  } else {
    console.log('✅ 内存使用正常');
  }
}

// 9. 事件监听器检测
function countEventListeners(element) {
  let count = 0;
  const events = ['click', 'mousedown', 'mouseup', 'keydown', 'keyup', 'scroll', 'resize'];
  
  events.forEach(eventType => {
    const listeners = element.querySelectorAll(`[on${eventType}]`);
    count += listeners.length;
  });
  
  return count;
}

// 10. 生成性能报告
function generatePerformanceReport() {
  console.log('\n📋 性能测试报告');
  console.log('='.repeat(60));
  
  // 内存使用统计
  if (testResults.memory.length > 0) {
    const avgMemory = testResults.memory.reduce((sum, m) => sum + m.usagePercent, 0) / testResults.memory.length;
    console.log(`📊 平均内存使用率: ${avgMemory.toFixed(2)}%`);
  }
  
  // 响应时间统计
  if (testResults.responseTime.length > 0) {
    const avgResponseTime = testResults.responseTime.reduce((sum, r) => sum + r.time, 0) / testResults.responseTime.length;
    console.log(`⏱️ 平均响应时间: ${avgResponseTime.toFixed(2)}ms`);
  }
  
  // DOM 节点统计
  if (testResults.domNodes.length > 0) {
    const avgDomNodes = testResults.domNodes.reduce((sum, d) => sum + d.domNodes, 0) / testResults.domNodes.length;
    console.log(`🌳 平均 DOM 节点数: ${avgDomNodes.toFixed(0)}`);
  }
  
  // 错误统计
  if (testResults.errors.length > 0) {
    console.log(`❌ 发现 ${testResults.errors.length} 个问题:`);
    testResults.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
  } else {
    console.log('✅ 未发现性能问题');
  }
  
  // 性能评分
  let score = 100;
  if (testResults.errors.length > 0) {
    score -= testResults.errors.length * 10;
  }
  
  console.log(`\n🎯 性能评分: ${Math.max(0, score)}/100`);
  
  if (score >= 90) {
    console.log('🌟 性能优秀！');
  } else if (score >= 70) {
    console.log('👍 性能良好');
  } else if (score >= 50) {
    console.log('⚠️ 性能一般，建议优化');
  } else {
    console.log('❌ 性能较差，需要优化');
  }
}

// 11. 运行所有测试
async function runAllTests() {
  console.log('🧪 开始运行所有性能测试...\n');
  
  try {
    testMemoryUsage();
    await testExtensionStartup();
    testFloatButtonPerformance();
    await testMessagePerformance();
    await testStoragePerformance();
    testNetworkPerformance();
    testLongTasks();
    testMemoryLeak();
    
    // 等待一段时间让长时间任务检测完成
    setTimeout(() => {
      generatePerformanceReport();
    }, 6000);
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 12. 快速测试（仅关键指标）
function quickTest() {
  console.log('⚡ 快速性能测试...');
  
  testMemoryUsage();
  testFloatButtonPerformance();
  testNetworkPerformance();
  
  setTimeout(() => {
    generatePerformanceReport();
  }, 1000);
}

// 导出测试函数
window.extensionPerformanceTest = {
  runAll: runAllTests,
  quick: quickTest,
  memory: testMemoryUsage,
  startup: testExtensionStartup,
  button: testFloatButtonPerformance,
  messages: testMessagePerformance,
  storage: testStoragePerformance,
  network: testNetworkPerformance,
  longTasks: testLongTasks,
  memoryLeak: testMemoryLeak,
  report: generatePerformanceReport
};

// 自动运行测试
console.log('🎯 可用的测试命令:');
console.log('  extensionPerformanceTest.runAll() - 运行所有测试');
console.log('  extensionPerformanceTest.quick() - 快速测试');
console.log('  extensionPerformanceTest.memory() - 内存测试');
console.log('  extensionPerformanceTest.startup() - 启动测试');
console.log('  extensionPerformanceTest.button() - 按钮测试');
console.log('  extensionPerformanceTest.messages() - 消息测试');
console.log('  extensionPerformanceTest.storage() - 存储测试');
console.log('  extensionPerformanceTest.network() - 网络测试');
console.log('  extensionPerformanceTest.longTasks() - 长时间任务测试');
console.log('  extensionPerformanceTest.memoryLeak() - 内存泄漏测试');
console.log('  extensionPerformanceTest.report() - 生成报告');

// 自动运行快速测试
quickTest();
