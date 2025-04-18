## api key
sk-e7eb50c23c684a1fbfceedf6623e4a3d


## 官方文档链接
https://api-docs.deepseek.com/zh-cn/


## 官方API指南

# DeepSeek API 请求示例

**HTTP 请求：**
```http
POST https://api.deepseek.com/v1/chat/completions
Content-Type: application/json
Authorization: Bearer <your_api_key>

{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "user",
      "content": "你好，请介绍一下你自己"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 256
}
```

# DeepSeek API 响应示例

**HTTP 响应：**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1710000000,
  "model": "deepseek-chat",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "您好！我是由深度求索公司开发的智能助手DeepSeek-R1。我擅长通过思考来帮您解答复杂的数学，代码和逻辑推理等理工类问题。"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 35,
    "total_tokens": 55
  }
}
```

> 📌 注意：
> 1. 替换 `<your_api_key>` 为实际API密钥
> 2. 实际API端点、模型名称和响应格式请以官方文档为准
> 3. 支持通过 `temperature` 等参数控制生成随机性（0-2范围）
```