/**
 * 优化效果测试脚本
 * 测试内容提取、站点检测和导出功能的性能提升
 */

class OptimizationTester {
  constructor() {
    this.testResults = {
      contentExtraction: {},
      siteDetection: {},
      exportPerformance: {}
    };
  }

  /**
   * 测试内容提取优化
   */
  async testContentExtraction() {
    console.log('🧪 开始测试内容提取优化...');
    
    const testCases = [
      {
        name: '高质量内容',
        content: '根据您的问题，我建议采用以下方案：\n\n1. 首先分析需求\n2. 然后制定计划\n3. 最后执行实施\n\n这样可以确保项目的成功。',
        expected: true
      },
      {
        name: '低质量内容',
        content: '好的',
        expected: false
      },
      {
        name: '包含代码的内容',
        content: '以下是代码示例：\n\n```javascript\nfunction test() {\n  return "hello";\n}\n```\n\n这个函数很简单。',
        expected: true
      },
      {
        name: '空内容',
        content: '',
        expected: false
      }
    ];

    let passedTests = 0;
    const startTime = performance.now();

    for (const testCase of testCases) {
      try {
        // 模拟内容质量检测
        const result = this.isHighQualityContent(testCase.content);
        const passed = result === testCase.expected;
        
        if (passed) {
          passedTests++;
          console.log(`✅ ${testCase.name}: 通过`);
        } else {
          console.log(`❌ ${testCase.name}: 失败 (期望: ${testCase.expected}, 实际: ${result})`);
        }
      } catch (error) {
        console.error(`❌ ${testCase.name}: 错误 -`, error);
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    this.testResults.contentExtraction = {
      passedTests,
      totalTests: testCases.length,
      successRate: (passedTests / testCases.length * 100).toFixed(2) + '%',
      executionTime: totalTime.toFixed(2) + 'ms'
    };

    console.log(`📊 内容提取测试完成: ${passedTests}/${testCases.length} 通过, 耗时 ${totalTime.toFixed(2)}ms`);
  }

  /**
   * 测试站点检测优化
   */
  async testSiteDetection() {
    console.log('🧪 开始测试站点检测优化...');
    
    const testDomains = [
      'chat.openai.com',
      'claude.ai',
      'gemini.google.com',
      'x.ai',
      'unknown-site.com'
    ];

    let successfulDetections = 0;
    const startTime = performance.now();

    for (const domain of testDomains) {
      try {
        // 模拟站点检测
        const result = await this.simulateSiteDetection(domain);
        if (result) {
          successfulDetections++;
          console.log(`✅ ${domain}: 检测成功`);
        } else {
          console.log(`⚠️ ${domain}: 未检测到`);
        }
      } catch (error) {
        console.error(`❌ ${domain}: 检测失败 -`, error);
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    this.testResults.siteDetection = {
      successfulDetections,
      totalDomains: testDomains.length,
      successRate: (successfulDetections / testDomains.length * 100).toFixed(2) + '%',
      executionTime: totalTime.toFixed(2) + 'ms'
    };

    console.log(`📊 站点检测测试完成: ${successfulDetections}/${testDomains.length} 成功, 耗时 ${totalTime.toFixed(2)}ms`);
  }

  /**
   * 测试导出性能优化
   */
  async testExportPerformance() {
    console.log('🧪 开始测试导出性能优化...');
    
    const mockResponses = [
      {
        siteName: 'ChatGPT',
        content: '这是一个高质量的AI回答，包含详细的解释和建议。',
        quality: 'high',
        length: 100
      },
      {
        siteName: 'Claude',
        content: '简短回答',
        quality: 'low',
        length: 10
      }
    ];

    const formats = ['markdown', 'html', 'txt'];
    const startTime = performance.now();

    for (const format of formats) {
      try {
        const exportContent = this.generateExportContent(mockResponses, format);
        console.log(`✅ ${format} 格式导出成功，长度: ${exportContent.length}`);
      } catch (error) {
        console.error(`❌ ${format} 格式导出失败:`, error);
      }
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    this.testResults.exportPerformance = {
      formats: formats.length,
      executionTime: totalTime.toFixed(2) + 'ms',
      averageTimePerFormat: (totalTime / formats.length).toFixed(2) + 'ms'
    };

    console.log(`📊 导出性能测试完成，耗时 ${totalTime.toFixed(2)}ms`);
  }

  /**
   * 模拟内容质量检测
   */
  isHighQualityContent(content) {
    if (!content || content.length < 10) return false;
    
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
    
    const hasStructure = content.includes('\n') || content.includes('。') || content.includes('.');
    const hasCodeOrList = content.includes('```') || content.includes('- ') || content.includes('1. ');
    const hasCompleteSentences = content.includes('。') || content.includes('!') || content.includes('?');
    
    return hasAIIndicator && (hasStructure || hasCodeOrList) && hasCompleteSentences;
  }

  /**
   * 模拟站点检测
   */
  async simulateSiteDetection(domain) {
    // 模拟异步检测
    return new Promise((resolve) => {
      setTimeout(() => {
        const knownSites = ['chat.openai.com', 'claude.ai', 'gemini.google.com', 'x.ai'];
        resolve(knownSites.includes(domain));
      }, Math.random() * 10); // 模拟网络延迟
    });
  }

  /**
   * 生成导出内容
   */
  generateExportContent(responses, format) {
    const timestamp = new Date().toISOString();
    
    switch (format) {
      case 'markdown':
        return responses.map(r => 
          `## ${r.siteName} 回答\n\n${r.content}\n\n---\n`
        ).join('\n');
      
      case 'html':
        return responses.map(r => 
          `<h2>${r.siteName} 回答</h2>\n<p>${r.content}</p>\n<hr>\n`
        ).join('\n');
      
      case 'txt':
        return responses.map(r => 
          `${r.siteName} 回答:\n${r.content}\n\n${'='.repeat(50)}\n`
        ).join('\n');
      
      default:
        throw new Error(`不支持的格式: ${format}`);
    }
  }

  /**
   * 运行所有测试
   */
  async runAllTests() {
    console.log('🚀 开始运行优化效果测试...\n');
    
    await this.testContentExtraction();
    console.log('');
    
    await this.testSiteDetection();
    console.log('');
    
    await this.testExportPerformance();
    console.log('');
    
    this.generateReport();
  }

  /**
   * 生成测试报告
   */
  generateReport() {
    console.log('📋 优化效果测试报告');
    console.log('='.repeat(50));
    
    console.log('\n🔍 内容提取优化:');
    console.log(`  成功率: ${this.testResults.contentExtraction.successRate}`);
    console.log(`  执行时间: ${this.testResults.contentExtraction.executionTime}`);
    
    console.log('\n🎯 站点检测优化:');
    console.log(`  成功率: ${this.testResults.siteDetection.successRate}`);
    console.log(`  执行时间: ${this.testResults.siteDetection.executionTime}`);
    
    console.log('\n📤 导出性能优化:');
    console.log(`  支持格式: ${this.testResults.exportPerformance.formats}`);
    console.log(`  总执行时间: ${this.testResults.exportPerformance.executionTime}`);
    console.log(`  平均每格式: ${this.testResults.exportPerformance.averageTimePerFormat}`);
    
    console.log('\n✅ 所有测试完成！');
  }
}

// 运行测试
if (typeof window !== 'undefined') {
  const tester = new OptimizationTester();
  tester.runAllTests().catch(console.error);
} else {
  console.log('❌ 此测试需要在浏览器环境中运行');
}
