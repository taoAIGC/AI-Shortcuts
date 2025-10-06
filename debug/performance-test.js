/**
 * 性能测试：缓存 vs chrome.storage.local
 */

async function performanceTest() {
  console.log('🚀 开始性能测试...');
  
  // 测试数据
  const testData = {
    sites: Array.from({ length: 100 }, (_, i) => ({
      name: `Site${i}`,
      url: `https://site${i}.com`,
      enabled: true
    }))
  };
  
  // 写入测试数据到 storage
  await chrome.storage.local.set({ 'remoteSiteHandlers': testData });
  console.log('✅ 测试数据已写入 storage');
  
  // 测试1：直接读取 chrome.storage.local
  console.log('\n📊 测试1：直接读取 chrome.storage.local');
  const directReadTimes = [];
  
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await chrome.storage.local.get('remoteSiteHandlers');
    const end = performance.now();
    directReadTimes.push(end - start);
  }
  
  const avgDirectRead = directReadTimes.reduce((a, b) => a + b, 0) / directReadTimes.length;
  console.log(`平均耗时: ${avgDirectRead.toFixed(3)}ms`);
  console.log(`最快: ${Math.min(...directReadTimes).toFixed(3)}ms`);
  console.log(`最慢: ${Math.max(...directReadTimes).toFixed(3)}ms`);
  
  // 测试2：缓存读取
  console.log('\n📊 测试2：缓存读取');
  const cacheReadTimes = [];
  
  // 先读取一次建立缓存
  const cachedData = await chrome.storage.local.get('remoteSiteHandlers');
  
  for (let i = 0; i < 1000; i++) {
    const start = performance.now();
    // 模拟缓存读取（直接返回内存中的数据）
    const result = cachedData;
    const end = performance.now();
    cacheReadTimes.push(end - start);
  }
  
  const avgCacheRead = cacheReadTimes.reduce((a, b) => a + b, 0) / cacheReadTimes.length;
  console.log(`平均耗时: ${avgCacheRead.toFixed(6)}ms`);
  console.log(`最快: ${Math.min(...cacheReadTimes).toFixed(6)}ms`);
  console.log(`最慢: ${Math.max(...cacheReadTimes).toFixed(6)}ms`);
  
  // 性能对比
  console.log('\n📈 性能对比结果:');
  console.log(`缓存读取比直接读取快: ${(avgDirectRead / avgCacheRead).toFixed(0)} 倍`);
  console.log(`缓存读取延迟: ${avgCacheRead.toFixed(6)}ms`);
  console.log(`直接读取延迟: ${avgDirectRead.toFixed(3)}ms`);
  
  // 清理测试数据
  await chrome.storage.local.remove('remoteSiteHandlers');
  console.log('\n🧹 测试数据已清理');
}

// 运行测试
if (typeof chrome !== 'undefined' && chrome.storage) {
  performanceTest().catch(console.error);
} else {
  console.log('❌ 此测试需要在 Chrome 扩展环境中运行');
}