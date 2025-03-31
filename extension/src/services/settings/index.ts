import { STORAGE_KEYS } from '../storage/constants';
import { getStorageService } from '../storage';
import { UserSettings } from '../storage/types';

// 存储服务实例
const storageService = getStorageService();

// 默认设置
const DEFAULT_SETTINGS: UserSettings = {
  enablePromptShortcut: true, // 默认开启提示词快捷输入
};

/**
 * 获取用户设置
 * @returns 用户设置对象
 */
export async function getSettings(): Promise<UserSettings> {
  try {
    // 从存储中获取设置
    const settings = await storageService.get<UserSettings>(STORAGE_KEYS.SETTINGS);
    
    // 如果没有设置，返回默认设置
    if (!settings) {
      return DEFAULT_SETTINGS;
    }
    
    // 合并默认设置和用户设置，确保新增的设置项有默认值
    return { ...DEFAULT_SETTINGS, ...settings };
  } catch (error) {
    console.error('[Settings] 获取设置失败:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 更新用户设置
 * @param settings 要更新的设置对象
 */
export async function updateSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
  try {
    // 获取当前设置
    const currentSettings = await getSettings();
    
    // 合并当前设置和新设置
    const newSettings = { ...currentSettings, ...settings };
    
    // 保存到存储
    await storageService.set(STORAGE_KEYS.SETTINGS, newSettings);
    
    // 发送设置变更消息
    chrome.runtime.sendMessage({
      type: 'SETTINGS_UPDATED',
      data: newSettings
    });
    
    return newSettings;
  } catch (error) {
    console.error('[Settings] 更新设置失败:', error);
    throw error;
  }
}

/**
 * 获取单个设置项值
 * @param key 设置项的键名
 * @returns 设置项的值
 */
export async function getSetting<K extends keyof UserSettings>(key: K): Promise<UserSettings[K]> {
  const settings = await getSettings();
  return settings[key];
}

/**
 * 更新单个设置项
 * @param key 设置项的键名
 * @param value 设置项的新值
 */
export async function updateSetting<K extends keyof UserSettings>(
  key: K, 
  value: UserSettings[K]
): Promise<UserSettings> {
  return updateSettings({ [key]: value } as Partial<UserSettings>);
} 