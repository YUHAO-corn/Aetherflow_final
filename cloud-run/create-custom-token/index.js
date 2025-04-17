const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

// 初始化 Firebase Admin SDK
// **显式指定项目 ID**
const firebaseProjectId = process.env.GOOGLE_CLOUD_PROJECT || 'aetherflow-b6459'; // 优先使用环境变量，否则回退到硬编码
try {
  admin.initializeApp({
    projectId: firebaseProjectId, 
  });
  console.log(`Firebase Admin SDK initialized successfully for project: ${firebaseProjectId}`);
  // 移除了之前的警告，因为我们现在显式指定了 ID
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  process.exit(1);
}

const app = express();

// 配置基础 CORS 选项 (用于 POST 请求等)
const corsOptions = {
  origin: 'https://aetherflow-app.com', // 限制为您的网站源
  methods: ['POST'], // POST 请求需要的配置
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200
};

// !! 手动处理特定路径的 OPTIONS 预检请求 !!
app.options('/api/create-custom-token', (req, res) => {
  console.log('Handling OPTIONS request for /api/create-custom-token');
  // 设置允许的来源
  res.setHeader('Access-Control-Allow-Origin', 'https://aetherflow-app.com');
  // 设置允许的方法
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  // 设置允许的头部
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // 设置预检请求的缓存时间 (可选)
  // res.setHeader('Access-Control-Max-Age', '86400'); // 24 小时
  // 响应 204 No Content 表示预检成功
  res.status(204).send('');
});

// 对 POST 请求应用 cors 中间件 (使用基础配置)
app.use('/api/create-custom-token', cors(corsOptions));

// 使用 express.json() 中间件解析 JSON 请求体 (在路由之前)
app.use(express.json());

// 定义创建 Custom Token 的端点
app.post('/api/create-custom-token', async (req, res) => {
  console.log('[Cloud Run Debug] 收到创建Custom Token请求');
  const idToken = req.body.idToken;

  if (!idToken) {
    console.log('[Cloud Run Debug] ID token在请求中缺失');
    return res.status(400).send('ID token is required');
  }

  // **增加日志：记录收到的ID Token (只记录前后部分以保护隐私)**
  const tokenSnippet = idToken.length > 50 
    ? `${idToken.substring(0, 25)}...${idToken.substring(idToken.length - 25)}` 
    : idToken;
  console.log(`[Cloud Run Debug] 收到ID token片段: ${tokenSnippet}`);
  console.log(`[Cloud Run Debug] 收到ID token长度: ${idToken.length}`); 

  try {
    // 1. 验证 ID Token
    console.log('[Cloud Run Debug] 开始验证ID token...');
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    console.log(`[Cloud Run Debug] ID token验证成功，用户UID: ${uid}`);
    console.log(`[Cloud Run Debug] Token发行时间: ${new Date(decodedToken.iat * 1000).toISOString()}`);
    console.log(`[Cloud Run Debug] Token过期时间: ${new Date(decodedToken.exp * 1000).toISOString()}`);

    // 2. 创建 Custom Token
    console.log(`[Cloud Run Debug] 开始为UID创建custom token: ${uid}...`);
    const customToken = await admin.auth().createCustomToken(uid);
    console.log('[Cloud Run Debug] Custom token创建成功，长度:', customToken.length);

    // 3. 返回 Custom Token
    console.log('[Cloud Run Debug] 返回custom token到客户端');
    res.status(200).json({ customToken: customToken });

  } catch (error) {
    // 处理验证或创建令牌过程中的错误
    console.error('[Cloud Run Debug] 处理token出错:', error);
    // **增加日志：记录详细错误信息**
    console.error(`[Cloud Run Debug] 错误代码: ${error.code}`);
    console.error(`[Cloud Run Debug] 错误消息: ${error.message}`);
    console.error(`[Cloud Run Debug] 错误栈: ${error.stack}`);
    
    if (error.code === 'auth/id-token-expired') {
      console.log('[Cloud Run Debug] 错误类型: Token已过期');
      res.status(401).send('ID token has expired');
    } else if (error.code && error.code.startsWith('auth/')) {
      // 其他 Firebase Auth 错误 (如格式无效)
      console.log('[Cloud Run Debug] 错误类型: Firebase Auth错误');
      res.status(400).send(`Invalid ID token: ${error.message}`);
    } else {
      // 其他服务器内部错误
      console.log('[Cloud Run Debug] 错误类型: 服务器内部错误');
      res.status(500).send('Internal server error while creating custom token');
    }
  }
});

// 根路径处理 (可选，用于健康检查或基本信息)
app.get('/', cors({ origin: '*' }), (req, res) => { // 根路径允许所有来源访问
  res.status(200).send('Create Custom Token function is running.');
});

// 启动服务器
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
}); 