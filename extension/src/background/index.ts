// extension/src/background/index.ts
import { initializeKeepAlive } from './keepAlive';
import { initializeContentScriptTracking } from './contentScriptManager';
import { initializeContextMenu } from './contextMenu';
import { initializeLifecycleEvents } from './initialization';
import { initializeMessageListeners } from './listeners';
import { initializeSidePanel } from './sidepanelManager';

console.log('[AetherFlow] Background script loading...');

// 生命周期事件监听器应首先设置，以确保能捕获 onInstalled 等事件
initializeLifecycleEvents();       // 设置 onStartup, onInstalled 监听器

// 然后初始化其他后台功能
initializeKeepAlive();               // 设置 Service Worker 保活
initializeContentScriptTracking();   // 设置内容脚本状态跟踪
initializeContextMenu();           // 设置上下文菜单
initializeSidePanel();             // 设置侧边栏行为和图标点击
initializeMessageListeners();      // 设置统一的消息监听器

console.log('[AetherFlow] Background script initializers called.');
// TODO: Create remaining handler modules (sidepanel, auth, aiFeatures, optimization, payment)
// TODO: Update listeners.ts to import and call functions from handler modules
