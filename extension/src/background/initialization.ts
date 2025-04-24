 // extension/src/background/initialization.ts

import { initializeFirebase, getFirebaseAuth } from '../services/auth/firebase';
import { safeLocalStorage, isServiceWorkerEnvironment, safeLogger } from '../utils/safeEnvironment';
import { cloudStorageService } from '../services/storage/cloudStorage'; // Verify path and export
import { storageService, migratePromptsData } from '../services/storage'; // Verify path and export
import { initializeSampleData } from './sampleData'; // Assuming sampleData.ts is in the same dir
import { initializeContextMenu } from './contextMenu';

/**
 * 设置初始示例数据
 */
async function setupInitialData() {
  try {
    // 检查是否已有数据
    const existingPrompts = await storageService.getAllPrompts();

    // 如果没有数据，初始化示例数据
    if (existingPrompts.length === 0) {
      console.log('[AetherFlow] 后台: 初始化示例提示词数据');
      const result = await initializeSampleData();
      console.log('示例数据初始化结果:', result);
    } else {
      console.log('[AetherFlow] 后台: 已存在提示词数据, 共', existingPrompts.length, '条');
    }
  } catch (error) {
    console.error('[AetherFlow] 后台: 初始化数据失败', error);
  }
}

/**
 * 初始化核心服务，如 Firebase 和云存储检查。
 */
async function initializeCoreServices() {
  try {
    // 初始化Firebase
    initializeFirebase();
    console.log('[Background] Firebase初始化成功');

    // 检查是否应使用云存储 - 使用 safeLocalStorage
    const useCloudStorageSetting = safeLocalStorage.getItem('USE_CLOUD_STORAGE');
    const useCloudStorage = useCloudStorageSetting === 'true';
    console.log('[Background] 云存储设置状态:', useCloudStorage ? '已启用' : '未启用');

    // TODO: Review this logic. Background scripts in MV3 are usually Service Workers.
    // This condition might rarely be true.
    if (!isServiceWorkerEnvironment && useCloudStorage) {
      // 只有在非SW环境且启用云存储时才执行相关逻辑
      console.log('[Background] 启用云存储服务 (非SW环境)');
      // 确保云存储服务已初始化
      if (cloudStorageService.isAuthenticated()) {
        console.log('[Background] 用户已登录，准备同步数据');
        try {
          // 执行同步
          const stats = await cloudStorageService.syncAllPrompts();
          console.log('[Background] 同步完成:', stats);
        } catch (error) {
          console.error('[Background] 同步失败:', error);
        }
      } else {
        console.log('[Background] 用户未登录，云存储处于待命状态');
      }
    } else if (isServiceWorkerEnvironment) {
      console.log('[Background] 在Service Worker中，云存储逻辑需要重新设计或确认行为。'); // Modified log
    } else {
       console.log('[Background] 使用本地存储服务 (或云存储未启用)');
    }

    // 添加详细的认证状态日志
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    console.log('[Background] 当前认证状态:', user ? '已登录' : '未登录');
    if (user) {
      console.log('[Background] 登录用户:', user.email);
    }
  } catch (error) {
    console.error('[Background] 服务初始化失败:', error);
  }
}

/**
 * 初始化扩展的生命周期事件监听器 (onStartup, onInstalled)。
 */
export function initializeLifecycleEvents() {
  // 在扩展启动时初始化服务
  chrome.runtime.onStartup.addListener(() => {
    console.log('[Background] 扩展启动，初始化服务');
    initializeCoreServices();
    // 可能还需要重新初始化其他需要启动时设置的东西，比如监听器（如果它们可能丢失）
    // initializeContextMenu(); // Context menu setup might be needed on startup too
  });

  // 处理扩展安装或更新事件
  chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('Extension installed/updated:', details.reason);

    // 1. 执行数据迁移 (应在其他操作之前)
    try {
      console.log('Starting data migration...');
      const result = await migratePromptsData();
      if (result.migrated) {
        console.log(`Data migration successful, migrated ${result.count} prompts`);
      } else {
        console.log('无需进行数据迁移');
      }
    } catch (error) {
      console.error('数据迁移失败:', error);
    }

    // 2. TODO: 处理硬编码的 API Key - 这是一个安全风险!
    const doubaoApiKey = '32550ef8-b626-4478-bf53-5fb5e34e114f'; // TODO: REMOVE HARDCODED KEY
    chrome.storage.local.set({ doubaoApiKey: doubaoApiKey }, () => {
        if (chrome.runtime.lastError) {
            console.error('[AetherFlow] 保存豆包 API Key 到 storage 失败:', chrome.runtime.lastError);
        } else {
            console.log('[AetherFlow] TODO: 豆包 API Key 已硬编码写入 storage。请修改此逻辑！');
        }
    });

    // 3. 根据安装原因执行操作
    if (details.reason === 'install') {
      // 新安装时，初始化示例数据
      await setupInitialData();
      // 打开欢迎页面 (可选)
      // chrome.tabs.create({ url: 'welcome.html' });
      console.log("[Background] 新安装完成，已初始化示例数据。");
    } else if (details.reason === 'update') {
      // 更新时可能也需要检查或设置初始数据
      console.log('扩展已更新到新版本，正在检查数据...');
      await setupInitialData(); // 确保即使更新也有数据
    }

    // 4. 初始化右键菜单 (每次安装/更新时都设置一次是安全的)
    initializeContextMenu();

    // 5. 初始化核心服务 (确保 Firebase 等服务在安装/更新后立即可用)
    await initializeCoreServices(); // Use await if it becomes async

    console.log("[Background] onInstalled 处理完成。");
  });

  console.log("[AetherFlow] 生命周期事件监听器已设置。");
}
