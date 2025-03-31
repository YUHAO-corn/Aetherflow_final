import { useState, useEffect, useCallback } from 'react';
import { getSettings, updateSettings, updateSetting } from '../services/settings';
import type { UserSettings } from '../services/storage/types';

// 添加消息监听器类型
type MessageListenerCallback = (changes: UserSettings) => void;

// 消息监听器集合
const listeners: MessageListenerCallback[] = [];

// 设置消息监听
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'SETTINGS_UPDATED') {
    // 通知所有监听器
    listeners.forEach(listener => listener(message.data));
    return true;
  }
  return false;
});

/**
 * 设置管理Hook
 * 用于获取和更新用户设置
 */
export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载设置
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userSettings = await getSettings();
      setSettings(userSettings);
    } catch (err) {
      console.error('[useSettings] 加载设置失败:', err);
      setError('加载设置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新整个设置对象
  const saveSettings = useCallback(async (newSettings: Partial<UserSettings>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedSettings = await updateSettings(newSettings);
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err) {
      console.error('[useSettings] 更新设置失败:', err);
      setError('更新设置失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 更新单个设置项
  const updateSingleSetting = useCallback(async <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    try {
      setLoading(true);
      setError(null);
      const updatedSettings = await updateSetting(key, value);
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (err) {
      console.error(`[useSettings] 更新设置项 ${String(key)} 失败:`, err);
      setError(`更新设置项 ${String(key)} 失败`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 设置变更监听
  useEffect(() => {
    // 添加设置变更监听
    const handleSettingsChanged = (newSettings: UserSettings) => {
      setSettings(newSettings);
    };
    
    listeners.push(handleSettingsChanged);
    
    // 初次加载
    loadSettings();
    
    // 清理函数
    return () => {
      const index = listeners.indexOf(handleSettingsChanged);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    saveSettings,
    updateSetting: updateSingleSetting,
    reloadSettings: loadSettings
  };
} 