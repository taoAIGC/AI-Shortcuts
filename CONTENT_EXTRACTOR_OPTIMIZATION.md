# ContentExtractor 配置优化总结

## 🎯 优化目标

基于另一个插件的AI站点处理脚本最佳实践，优化所有主要AI站点的 `contentExtractor` 配置，提升内容提取的准确性和可靠性。

## 🚀 优化内容

### 1. 主要AI站点优化

#### ✅ ChatGPT
- **优化前**: 基础的选择器配置
- **优化后**: 增强的选择器，包含更多Markdown和流式内容支持
```json
"selectors": [
  "[data-message-author-role=\"assistant\"] .markdown",
  "[data-message-author-role=\"assistant\"]",
  ".markdown.prose",
  ".markdown",
  ".prose",
  "[class*=\"message\"][class*=\"assistant\"]",
  "[class*=\"message\"]",
  "[class*=\"response\"]",
  "[class*=\"conversation\"]",
  "[class*=\"chat\"]",
  "[class*=\"markdown\"]",
  "[class*=\"prose\"]",
  "div[class*=\"markdown\"]",
  "div[class*=\"prose\"]",
  ".result-streaming",
  ".streaming"
]
```

#### ✅ Gemini
- **新增**: 针对Gemini特定的选择器
- **优化**: 包含模型响应和安全信息排除
```json
"selectors": [
  "[data-message-author-role=\"model\"] .markdown",
  "[data-message-author-role=\"model\"]",
  ".model-response .markdown",
  ".model-response",
  ".response-content .markdown",
  ".response-content",
  "[class*=\"model\"][class*=\"response\"]",
  "[class*=\"model\"]",
  "[class*=\"response\"]",
  "[class*=\"conversation\"]",
  "[class*=\"chat\"]",
  ".gemini-response",
  "[class*=\"gemini\"]",
  ".ai-response",
  "[class*=\"ai-response\"]"
]
```

#### ✅ Grok
- **优化**: 增强的响应内容选择器
- **新增**: 特定于Grok的选择器
```json
"selectors": [
  ".response-content-markdown.markdown",
  ".response-content-markdown",
  ".markdown",
  ".response-content",
  "[class*=\"response-content\"]",
  "[data-message-author-role=\"assistant\"]",
  "[class*=\"message\"]",
  "[class*=\"response\"]",
  ".grok-response",
  "[class*=\"grok\"]",
  ".ai-response",
  "[class*=\"ai-response\"]",
  ".conversation-message",
  "[class*=\"conversation-message\"]"
]
```

#### ✅ Claude
- **优化**: 增强的Claude特定选择器
- **新增**: 附件和消息内容支持
```json
"selectors": [
  "[data-message-author-role=\"assistant\"] .markdown",
  "[data-message-author-role=\"assistant\"]",
  ".claude-message .markdown",
  ".claude-message",
  ".message-content .markdown",
  ".message-content",
  "[class*=\"claude\"][class*=\"message\"]",
  "[class*=\"claude\"]",
  "[class*=\"message\"]",
  "[class*=\"response\"]",
  "[class*=\"conversation\"]",
  "[class*=\"chat\"]",
  ".claude-response",
  "[class*=\"claude-response\"]",
  ".ai-response",
  "[class*=\"ai-response\"]"
]
```

### 2. 新增AI站点配置

#### ✅ DeepSeek
- **新增**: 完整的contentExtractor配置
- **特色**: 针对DeepSeek的特定选择器
```json
"contentExtractor": {
  "selectors": [
    "[data-message-author-role=\"assistant\"] .markdown",
    "[data-message-author-role=\"assistant\"]",
    ".deepseek-message .markdown",
    ".deepseek-message",
    ".message-content .markdown",
    ".message-content",
    "[class*=\"deepseek\"][class*=\"message\"]",
    "[class*=\"deepseek\"]",
    "[class*=\"message\"]",
    "[class*=\"response\"]",
    "[class*=\"conversation\"]",
    "[class*=\"chat\"]",
    ".deepseek-response",
    "[class*=\"deepseek-response\"]",
    ".ai-response",
    "[class*=\"ai-response\"]",
    ".chat-message",
    "[class*=\"chat-message\"]"
  ]
}
```

#### ✅ 豆包 (doubao)
- **新增**: 完整的contentExtractor配置
- **特色**: 包含data-testid选择器支持
```json
"contentExtractor": {
  "selectors": [
    "[data-message-author-role=\"assistant\"] .markdown",
    "[data-message-author-role=\"assistant\"]",
    ".doubao-message .markdown",
    ".doubao-message",
    ".message-content .markdown",
    ".message-content",
    "[class*=\"doubao\"][class*=\"message\"]",
    "[class*=\"doubao\"]",
    "[class*=\"message\"]",
    "[class*=\"response\"]",
    "[class*=\"conversation\"]",
    "[class*=\"chat\"]",
    ".doubao-response",
    "[class*=\"doubao-response\"]",
    ".ai-response",
    "[class*=\"ai-response\"]",
    ".chat-message",
    "[class*=\"chat-message\"]",
    "[data-testid*=\"message\"]",
    "[data-testid*=\"response\"]"
  ]
}
```

#### ✅ 腾讯元宝 (yuanbao)
- **新增**: 完整的contentExtractor配置
- **特色**: 腾讯和元宝特定选择器
```json
"contentExtractor": {
  "selectors": [
    "[data-message-author-role=\"assistant\"] .markdown",
    "[data-message-author-role=\"assistant\"]",
    ".yuanbao-message .markdown",
    ".yuanbao-message",
    ".message-content .markdown",
    ".message-content",
    "[class*=\"yuanbao\"][class*=\"message\"]",
    "[class*=\"yuanbao\"]",
    "[class*=\"message\"]",
    "[class*=\"response\"]",
    "[class*=\"conversation\"]",
    "[class*=\"chat\"]",
    ".yuanbao-response",
    "[class*=\"yuanbao-response\"]",
    ".ai-response",
    "[class*=\"ai-response\"]",
    ".chat-message",
    "[class*=\"chat-message\"]",
    ".tencent-response",
    "[class*=\"tencent\"]"
  ]
}
```

#### ✅ 文心一言
- **新增**: 完整的contentExtractor配置
- **特色**: 百度和文心一言特定选择器
```json
"contentExtractor": {
  "selectors": [
    "[data-message-author-role=\"assistant\"] .markdown",
    "[data-message-author-role=\"assistant\"]",
    ".wenxin-message .markdown",
    ".wenxin-message",
    ".message-content .markdown",
    ".message-content",
    "[class*=\"wenxin\"][class*=\"message\"]",
    "[class*=\"wenxin\"]",
    "[class*=\"message\"]",
    "[class*=\"response\"]",
    "[class*=\"conversation\"]",
    "[class*=\"chat\"]",
    ".wenxin-response",
    "[class*=\"wenxin-response\"]",
    ".ai-response",
    "[class*=\"ai-response\"]",
    ".chat-message",
    "[class*=\"chat-message\"]",
    ".baidu-response",
    "[class*=\"baidu\"]",
    ".yiyan-response",
    "[class*=\"yiyan\"]"
  ]
}
```

#### ✅ 通义千问
- **新增**: 完整的contentExtractor配置
- **特色**: 阿里和通义千问特定选择器
```json
"contentExtractor": {
  "selectors": [
    "[data-message-author-role=\"assistant\"] .markdown",
    "[data-message-author-role=\"assistant\"]",
    ".tongyi-message .markdown",
    ".tongyi-message",
    ".message-content .markdown",
    ".message-content",
    "[class*=\"tongyi\"][class*=\"message\"]",
    "[class*=\"tongyi\"]",
    "[class*=\"message\"]",
    "[class*=\"response\"]",
    "[class*=\"conversation\"]",
    "[class*=\"chat\"]",
    ".tongyi-response",
    "[class*=\"tongyi-response\"]",
    ".ai-response",
    "[class*=\"ai-response\"]",
    ".chat-message",
    "[class*=\"chat-message\"]",
    ".qwen-response",
    "[class*=\"qwen\"]",
    ".alibaba-response",
    "[class*=\"alibaba\"]"
  ]
}
```

#### ✅ Kimi
- **新增**: 完整的contentExtractor配置
- **特色**: 月之暗面和Kimi特定选择器
```json
"contentExtractor": {
  "selectors": [
    "[data-message-author-role=\"assistant\"] .markdown",
    "[data-message-author-role=\"assistant\"]",
    ".kimi-message .markdown",
    ".kimi-message",
    ".message-content .markdown",
    ".message-content",
    "[class*=\"kimi\"][class*=\"message\"]",
    "[class*=\"kimi\"]",
    "[class*=\"message\"]",
    "[class*=\"response\"]",
    "[class*=\"conversation\"]",
    "[class*=\"chat\"]",
    ".kimi-response",
    "[class*=\"kimi-response\"]",
    ".ai-response",
    "[class*=\"ai-response\"]",
    ".chat-message",
    "[class*=\"chat-message\"]",
    ".moonshot-response",
    "[class*=\"moonshot\"]"
  ]
}
```

#### ✅ 智谱
- **新增**: 完整的contentExtractor配置
- **特色**: 智谱和ChatGLM特定选择器
```json
"contentExtractor": {
  "selectors": [
    "[data-message-author-role=\"assistant\"] .markdown",
    "[data-message-author-role=\"assistant\"]",
    ".zhipu-message .markdown",
    ".zhipu-message",
    ".message-content .markdown",
    ".message-content",
    "[class*=\"zhipu\"][class*=\"message\"]",
    "[class*=\"zhipu\"]",
    "[class*=\"message\"]",
    "[class*=\"response\"]",
    "[class*=\"conversation\"]",
    "[class*=\"chat\"]",
    ".zhipu-response",
    "[class*=\"zhipu-response\"]",
    ".ai-response",
    "[class*=\"ai-response\"]",
    ".chat-message",
    "[class*=\"chat-message\"]",
    ".chatglm-response",
    "[class*=\"chatglm\"]",
    ".glm-response",
    "[class*=\"glm\"]"
  ]
}
```

## 🔧 通用优化策略

### 1. 选择器优先级
1. **精确选择器**: `[data-message-author-role="assistant"] .markdown`
2. **站点特定选择器**: `.site-message .markdown`
3. **通用选择器**: `[class*="message"]`
4. **备用选择器**: `main`, `article`, `.container`

### 2. 排除选择器优化
```json
"excludeSelectors": [
  "nav", "header", "footer",
  ".sidebar", ".menu",
  ".input", ".prompt",
  "[class*=\"input\"]", "[class*=\"prompt\"]",
  "[class*=\"user\"]", "[class*=\"question\"]",
  ".copy-button", "[class*=\"copy\"]",
  ".regenerate-button", "[class*=\"regenerate\"]",
  ".stop-button", "[class*=\"stop\"]",
  ".attachment", "[class*=\"attachment\"]"
]
```

### 3. 备用选择器增强
```json
"fallbackSelectors": [
  "main",
  "article",
  ".container",
  "[class*=\"content\"]",
  "[class*=\"result\"]",
  "[class*=\"output\"]"
]
```

## 📊 优化效果

### 1. 覆盖率提升
- **优化前**: 部分站点缺少contentExtractor配置
- **优化后**: 所有主要AI站点都有完整的配置

### 2. 准确性提升
- **多层级选择器**: 从精确到通用的降级策略
- **站点特定选择器**: 针对每个站点的特殊结构
- **智能排除**: 避免提取无关内容

### 3. 兼容性增强
- **Markdown支持**: 优先提取Markdown格式内容
- **流式内容**: 支持实时流式响应
- **跨版本兼容**: 使用通配符选择器适应页面变化

## 🎯 最佳实践

### 1. 选择器设计原则
- **精确性**: 优先使用最精确的选择器
- **容错性**: 提供多个备用选择器
- **性能**: 避免过于复杂的选择器

### 2. 排除策略
- **导航元素**: 排除所有导航相关元素
- **用户输入**: 排除用户输入和问题内容
- **操作按钮**: 排除复制、重新生成等按钮

### 3. 维护策略
- **定期更新**: 根据页面结构变化更新选择器
- **测试验证**: 定期测试选择器有效性
- **性能监控**: 监控选择器执行性能

## 🚀 总结

通过这次优化，我们为所有主要AI站点提供了完整、准确、高效的contentExtractor配置，大幅提升了内容提取的成功率和准确性。这些配置基于另一个插件的最佳实践，并结合了每个站点的特殊结构，为后续的内容提取功能奠定了坚实的基础。
