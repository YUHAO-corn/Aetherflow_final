import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  writeBatch
} from 'firebase/firestore';
import { getFirebaseAuth, mapFirebaseUser } from '../auth/firebase';
import { onAuthStateChanged as fbOnAuthStateChanged } from 'firebase/auth';
import { Prompt } from '../prompt/types';
import { StorageService } from './types';
import { STORAGE_KEYS, STORAGE_LIMITS } from './constants';
import { chromeStorageService } from './chromeStorage';
import { User } from '../auth/types';

// 同步状态类型
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

// 同步状态消息
export interface SyncStatusMessage {
  status: SyncStatus;
  message?: string;
  timestamp: number;
}

// 同步统计
export interface SyncStats {
  uploaded: number;
  downloaded: number;
  conflicts: number;
  resolved: number;
}

// 待处理操作
export interface PendingOperation {
  type: 'upload' | 'delete';
  id: string;
  data?: any;
  timestamp: number;
}

/**
 * Firebase云存储服务
 * 提供提示词数据的云存储和同步功能
 */
export class CloudStorageService implements StorageService {
  // 存储状态
  private isOnlineStatus: boolean = navigator.onLine;
  private currentUser: User | null = null;
  private userId: string | null = null;
  private syncStatusListeners: ((status: SyncStatusMessage) => void)[] = [];
  private currentSyncStatus: SyncStatusMessage = { status: 'idle', timestamp: Date.now() };
  private pendingOperationsList: PendingOperation[] = [];
  private unsubscribeAuth: (() => void) | null = null;
  private firestoreUnsubscribers: (() => void)[] = [];
  private lastSyncTime: number = 0;

  constructor() {
    this.setupNetworkMonitoring();
    this.initializeAuthListener();
    this.loadPendingOperations();
  }

  // 初始化认证状态监听器
  private initializeAuthListener() {
    const auth = getFirebaseAuth();
    this.unsubscribeAuth = fbOnAuthStateChanged(auth, (user) => {
      if (user) {
        // 用户登录
        this.currentUser = mapFirebaseUser(user);
        this.userId = user.uid;
        this.setupFirestoreListeners();
        this.onLoginSuccess();
      } else {
        // 用户登出
        this.currentUser = null;
        this.userId = null;
        this.cleanupFirestoreListeners();
      }
    });
  }

  // 设置网络状态监控
  private setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.isOnlineStatus = true;
      if (this.isAuthenticated()) {
        this.setSyncStatus('syncing', '网络恢复，正在同步...');
        this.processPendingOperations();
      }
    });
    
    window.addEventListener('offline', () => {
      this.isOnlineStatus = false;
      this.setSyncStatus('offline', '当前处于离线状态');
    });
  }

  // 登录成功后触发
  private async onLoginSuccess() {
    try {
      this.setSyncStatus('syncing', '正在同步数据...');
      const stats = await this.syncAllPrompts();
      this.setSyncStatus('synced', `同步完成: 上传${stats.uploaded}，下载${stats.downloaded}`);
    } catch (error) {
      console.error('登录同步失败:', error);
      this.setSyncStatus('error', '同步失败，请检查网络连接');
    }
  }

  // 登出处理
  private async onLogout() {
    this.cleanupFirestoreListeners();
    this.setSyncStatus('idle', '已登出');
    // 不清空待处理操作，等待下次登录再处理
  }

  // 设置同步状态
  private setSyncStatus(status: SyncStatus, message?: string) {
    this.currentSyncStatus = {
      status,
      message,
      timestamp: Date.now()
    };
    
    // 通知所有监听器
    this.syncStatusListeners.forEach(listener => {
      listener(this.currentSyncStatus);
    });
    
    // 状态持久化
    this.saveSyncStatusLocally();
  }

  // 保存同步状态到本地
  private async saveSyncStatusLocally() {
    try {
      await chromeStorageService.set(STORAGE_KEYS.SYNC_STATUS, this.currentSyncStatus);
    } catch (error) {
      console.error('保存同步状态失败:', error);
    }
  }

  // 加载待处理操作
  private async loadPendingOperations() {
    try {
      const pendingOps = await chromeStorageService.get<PendingOperation[]>(STORAGE_KEYS.PENDING_OPERATIONS);
      if (pendingOps) {
        this.pendingOperationsList = pendingOps;
      }
    } catch (error) {
      console.error('加载待处理操作失败:', error);
    }
  }

  // 保存待处理操作到本地
  private async savePendingOperations() {
    try {
      await chromeStorageService.set(STORAGE_KEYS.PENDING_OPERATIONS, this.pendingOperationsList);
    } catch (error) {
      console.error('保存待处理操作失败:', error);
    }
  }

  // 添加待处理操作
  private addPendingOperation(operation: PendingOperation) {
    // 检查是否已存在相同ID的操作
    const existingIndex = this.pendingOperationsList.findIndex(op => op.id === operation.id);
    
    if (existingIndex >= 0) {
      // 更新现有操作
      this.pendingOperationsList[existingIndex] = operation;
    } else {
      // 添加新操作
      this.pendingOperationsList.push(operation);
    }
    
    this.savePendingOperations();
  }

  // 清除待处理操作
  private removePendingOperation(id: string) {
    this.pendingOperationsList = this.pendingOperationsList.filter(op => op.id !== id);
    this.savePendingOperations();
  }

  // 设置Firestore监听器
  private setupFirestoreListeners() {
    if (!this.userId) return;
    
    try {
      const db = getFirestore();
      const promptsRef = collection(db, 'users', this.userId, 'prompts');
      
      // 监听提示词变化
      const unsubscribe = onSnapshot(promptsRef, (snapshot) => {
        snapshot.docChanges().forEach(change => {
          const prompt = change.doc.data() as Prompt;
          
          if (change.type === 'added' || change.type === 'modified') {
            this.handleCloudPromptUpdate(prompt);
          } else if (change.type === 'removed') {
            this.handleCloudPromptRemoval(prompt.id);
          }
        });
      }, (error) => {
        console.error('Firestore监听错误:', error);
        this.setSyncStatus('error', '云端数据监听失败');
      });
      
      this.firestoreUnsubscribers.push(unsubscribe);
    } catch (error) {
      console.error('设置Firestore监听器失败:', error);
    }
  }

  // 清理Firestore监听器
  private cleanupFirestoreListeners() {
    this.firestoreUnsubscribers.forEach(unsubscribe => unsubscribe());
    this.firestoreUnsubscribers = [];
  }

  // 处理云端提示词更新
  private async handleCloudPromptUpdate(cloudPrompt: Prompt) {
    try {
      // 检查是否为同步过程中自己上传的
      const pendingOp = this.pendingOperationsList.find(
        op => op.id === cloudPrompt.id && op.type === 'upload'
      );
      
      if (pendingOp) {
        // 是我们自己上传的，不需要重复保存
        this.removePendingOperation(cloudPrompt.id);
        return;
      }
      
      // 获取本地版本
      const localPrompt = await chromeStorageService.getPrompt(cloudPrompt.id);
      
      if (!localPrompt) {
        // 本地不存在，直接保存
        await chromeStorageService.savePrompt(cloudPrompt);
        return;
      }
      
      // 检查是否有冲突
      if (localPrompt.updatedAt !== cloudPrompt.updatedAt) {
        // 有冲突，解决冲突
        const resolvedPrompt = await this.resolveConflict(localPrompt, cloudPrompt);
        if (resolvedPrompt) {
          await chromeStorageService.savePrompt(resolvedPrompt);
        }
      }
    } catch (error) {
      console.error('处理云端提示词更新失败:', error);
    }
  }

  // 处理云端提示词删除
  private async handleCloudPromptRemoval(promptId: string) {
    try {
      // 检查是否为同步过程中自己删除的
      const pendingOp = this.pendingOperationsList.find(
        op => op.id === promptId && op.type === 'delete'
      );
      
      if (pendingOp) {
        // 是我们自己删除的，不需要重复处理
        this.removePendingOperation(promptId);
        return;
      }
      
      // 获取本地版本
      const localPrompt = await chromeStorageService.getPrompt(promptId);
      
      if (localPrompt) {
        // 检查本地版本是否有未同步的修改
        const result = await this.resolveDeletionConflict(localPrompt, { timestamp: Date.now() });
        
        if (result.action === 'delete') {
          // 删除本地版本
          await chromeStorageService.deletePrompt(promptId);
        } else if (result.action === 'keep' && result.prompt) {
          // 保留本地版本并重新上传
          await this.uploadPrompt(result.prompt);
        }
      }
    } catch (error) {
      console.error('处理云端提示词删除失败:', error);
    }
  }

  // 处理删除冲突
  private async resolveDeletionConflict(localPrompt: Prompt | null, isDeleted: { timestamp: number } | null): Promise<{ action: 'keep' | 'delete', prompt?: Prompt }> {
    // 如果本地有修改且时间较新，保留本地版本
    if (localPrompt && isDeleted && localPrompt.updatedAt > isDeleted.timestamp) {
      return { action: 'keep', prompt: localPrompt };
    } else {
      // 否则进行删除
      return { action: 'delete' };
    }
  }

  // 简单冲突解决
  private resolveSimpleConflict(localPrompt: Prompt, cloudPrompt: Prompt): Prompt {
    // 保留更新时间较新的版本
    return localPrompt.updatedAt > cloudPrompt.updatedAt ? localPrompt : cloudPrompt;
  }

  // 计算两个提示词内容的差异程度 (0-1)
  private calculateDifference(content1: string, content2: string): number {
    if (content1 === content2) return 0;
    if (!content1 || !content2) return 1;
    
    const longer = content1.length > content2.length ? content1 : content2;
    const shorter = content1.length > content2.length ? content2 : content1;
    
    // 计算编辑距离的简化版本，仅用于判断差异程度
    let same = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter.substring(i, i + 10))) {
        same += 10;
        i += 9; // 跳过已匹配的部分
      }
    }
    
    return 1 - (same / longer.length);
  }

  // 检查认证状态
  public isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  // 获取当前用户
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  // 获取在线状态
  public isOnline(): boolean {
    return this.isOnlineStatus;
  }

  // 获取进行中的操作
  public get pendingOperations(): PendingOperation[] {
    return [...this.pendingOperationsList];
  }

  // 处理待处理操作
  public async processPendingOperations(): Promise<void> {
    if (!this.isAuthenticated() || !this.isOnline() || this.pendingOperationsList.length === 0) {
      return;
    }
    
    try {
      this.setSyncStatus('syncing', '正在处理待同步数据...');
      
      // 按照时间戳排序，保证操作顺序
      const sortedOps = [...this.pendingOperationsList].sort((a, b) => a.timestamp - b.timestamp);
      
      for (const op of sortedOps) {
        if (op.type === 'upload' && op.data) {
          // 上传操作
          await this.uploadPromptToFirestore(op.data);
          this.removePendingOperation(op.id);
        } else if (op.type === 'delete') {
          // 删除操作
          await this.deletePromptFromFirestore(op.id);
          this.removePendingOperation(op.id);
        }
      }
      
      this.setSyncStatus('synced', '待处理操作已完成');
    } catch (error) {
      console.error('处理待处理操作失败:', error);
      this.setSyncStatus('error', '同步失败，将在网络恢复后重试');
    }
  }

  // 上传提示词到Firestore
  private async uploadPromptToFirestore(prompt: Prompt): Promise<void> {
    if (!this.userId) {
      throw new Error('未登录，无法上传数据');
    }
    
    try {
      console.log(`[CloudStorage:Firebase] 开始上传提示词到Firebase: ID=${prompt.id}, 标题=${prompt.title}`);
      const db = getFirestore();
      console.log(`[CloudStorage:Firebase] 获取Firestore实例成功，路径: users/${this.userId}/prompts/${prompt.id}`);
      const promptRef = doc(db, 'users', this.userId, 'prompts', prompt.id);
      await setDoc(promptRef, prompt);
      console.log(`[CloudStorage:Firebase] 提示词上传成功: ID=${prompt.id}, 标题=${prompt.title}`);
    } catch (error) {
      console.error('[CloudStorage:Firebase] 上传提示词到Firestore失败:', error);
      throw error;
    }
  }

  // 从Firestore删除提示词
  private async deletePromptFromFirestore(promptId: string): Promise<void> {
    if (!this.userId) {
      throw new Error('未登录，无法删除数据');
    }
    
    try {
      console.log(`[CloudStorage:Firebase] 开始从Firebase删除提示词: ID=${promptId}`);
      const db = getFirestore();
      const promptRef = doc(db, 'users', this.userId, 'prompts', promptId);
      await deleteDoc(promptRef);
      console.log(`[CloudStorage:Firebase] 提示词删除成功: ID=${promptId}`);
    } catch (error) {
      console.error('[CloudStorage:Firebase] 从Firestore删除提示词失败:', error);
      throw error;
    }
  }

  // 上传提示词 (内部方法)
  private async uploadPrompt(prompt: Prompt): Promise<void> {
    if (!this.isAuthenticated()) {
      return; // 未登录，不上传
    }
    
    try {
      if (this.isOnline()) {
        // 在线，直接上传
        await this.uploadPromptToFirestore(prompt);
      } else {
        // 离线，添加到待处理队列
        this.addPendingOperation({
          type: 'upload',
          id: prompt.id,
          data: prompt,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('上传提示词失败:', error);
      // 添加到待处理队列
      this.addPendingOperation({
        type: 'upload',
        id: prompt.id,
        data: prompt,
        timestamp: Date.now()
      });
    }
  }

  // 实现StorageService接口 - getPrompt
  async getPrompt(id: string): Promise<Prompt | null> {
    // 先从本地获取
    return chromeStorageService.getPrompt(id);
  }

  // 实现StorageService接口 - getAllPrompts
  async getAllPrompts(): Promise<Prompt[]> {
    // 从本地获取
    return chromeStorageService.getAllPrompts();
  }

  // 实现StorageService接口 - savePrompt
  async savePrompt(prompt: Prompt): Promise<void> {
    // 先保存到本地
    await chromeStorageService.savePrompt(prompt);
    
    // 然后上传到云端
    await this.uploadPrompt(prompt);
  }

  // 实现StorageService接口 - updatePrompt
  async updatePrompt(id: string, updates: Partial<Prompt>): Promise<void> {
    // 先更新本地
    await chromeStorageService.updatePrompt(id, updates);
    
    // 获取完整的更新后提示词
    const updatedPrompt = await chromeStorageService.getPrompt(id);
    if (updatedPrompt) {
      // 上传到云端
      await this.uploadPrompt(updatedPrompt);
    }
  }

  // 实现StorageService接口 - deletePrompt
  async deletePrompt(id: string): Promise<void> {
    // 先从本地删除
    await chromeStorageService.deletePrompt(id);
    
    // 然后从云端删除
    if (this.isAuthenticated()) {
      try {
        if (this.isOnline()) {
          // 在线，直接删除
          await this.deletePromptFromFirestore(id);
        } else {
          // 离线，添加到待处理队列
          this.addPendingOperation({
            type: 'delete',
            id,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('删除提示词失败:', error);
        // 添加到待处理队列
        this.addPendingOperation({
          type: 'delete',
          id,
          timestamp: Date.now()
        });
      }
    }
  }

  // 实现StorageService接口 - incrementUseCount
  async incrementUseCount(id: string): Promise<void> {
    // 更新本地
    await chromeStorageService.incrementUseCount(id);
    
    // 获取更新后的提示词
    const updatedPrompt = await chromeStorageService.getPrompt(id);
    if (updatedPrompt) {
      // 上传到云端
      await this.uploadPrompt(updatedPrompt);
    }
  }

  // 实现StorageService接口 - get
  async get<T>(key: string): Promise<T | null> {
    return chromeStorageService.get<T>(key);
  }

  // 实现StorageService接口 - set
  async set<T>(key: string, value: T): Promise<void> {
    return chromeStorageService.set<T>(key, value);
  }

  // 实现StorageService接口 - remove
  async remove(key: string): Promise<void> {
    return chromeStorageService.remove(key);
  }

  // 实现StorageService接口 - clear
  async clear(): Promise<void> {
    return chromeStorageService.clear();
  }

  // 云存储特有方法 - 注册同步状态监听器
  public onSyncStatusChange(callback: (status: SyncStatusMessage) => void): () => void {
    this.syncStatusListeners.push(callback);
    
    // 立即触发一次当前状态
    callback(this.currentSyncStatus);
    
    // 返回取消订阅函数
    return () => {
      this.syncStatusListeners = this.syncStatusListeners.filter(listener => listener !== callback);
    };
  }

  // 云存储特有方法 - 获取同步状态
  public getSyncStatus(): SyncStatusMessage {
    return this.currentSyncStatus;
  }

  // 云存储特有方法 - 手动触发同步
  public async syncAllPrompts(): Promise<SyncStats> {
    if (!this.isAuthenticated()) {
      console.log('[CloudStorage:Firebase] 未登录，无法同步');
      throw new Error('未登录，无法同步');
    }
    
    if (!this.isOnline()) {
      console.log('[CloudStorage:Firebase] 当前处于离线状态，无法同步');
      throw new Error('离线状态，无法同步');
    }
    
    // 更新同步状态
    console.log('[CloudStorage:Firebase] 开始执行全量数据同步');
    this.setSyncStatus('syncing', '正在同步数据...');
    this.lastSyncTime = Date.now();
    
    try {
      // 处理待处理操作
      const pendingOpsCount = this.pendingOperationsList.length;
      if (pendingOpsCount > 0) {
        console.log(`[CloudStorage:Firebase] 处理${pendingOpsCount}个待处理操作`);
        await this.processPendingOperations();
      }
      
      // 获取本地提示词
      console.log('[CloudStorage:Firebase] 获取本地提示词');
      const localPrompts = await chromeStorageService.getAllPrompts();
      console.log(`[CloudStorage:Firebase] 本地提示词数量: ${localPrompts.length}`);
      
      // 获取云端提示词
      console.log('[CloudStorage:Firebase] 获取云端提示词');
      const cloudPrompts = await this.getCloudPrompts();
      console.log(`[CloudStorage:Firebase] 云端提示词数量: ${cloudPrompts.length}`);
      
      // 创建ID映射
      const localMap = new Map(localPrompts.map(p => [p.id, p]));
      const cloudMap = new Map(cloudPrompts.map(p => [p.id, p]));
      
      // 统计数据
      const stats: SyncStats = {
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        resolved: 0
      };
      
      // 处理本地存在但云端不存在的提示词(上传)
      console.log('[CloudStorage:Firebase] 开始处理需要上传的提示词');
      for (const localPrompt of localPrompts) {
        if (!cloudMap.has(localPrompt.id)) {
          console.log(`[CloudStorage:Firebase] 上传新提示词: ID=${localPrompt.id}, 标题=${localPrompt.title}`);
          await this.uploadPromptToFirestore(localPrompt);
          stats.uploaded++;
        } else {
          // 存在于两端，检查更新时间
          const cloudPrompt = cloudMap.get(localPrompt.id)!;
          if (localPrompt.updatedAt > cloudPrompt.updatedAt) {
            console.log(`[CloudStorage:Firebase] 上传更新的提示词: ID=${localPrompt.id}, 本地时间=${new Date(localPrompt.updatedAt).toISOString()}, 云端时间=${new Date(cloudPrompt.updatedAt).toISOString()}`);
            await this.uploadPromptToFirestore(localPrompt);
            stats.uploaded++;
          } else if (localPrompt.updatedAt < cloudPrompt.updatedAt) {
            console.log(`[CloudStorage:Firebase] 下载更新的提示词: ID=${cloudPrompt.id}, 云端时间=${new Date(cloudPrompt.updatedAt).toISOString()}, 本地时间=${new Date(localPrompt.updatedAt).toISOString()}`);
            await chromeStorageService.savePrompt(cloudPrompt);
            stats.downloaded++;
          } else if (JSON.stringify(localPrompt) !== JSON.stringify(cloudPrompt)) {
            // 时间戳相同但内容不同，处理冲突
            console.log(`[CloudStorage:Firebase] 检测到内容冲突: ID=${localPrompt.id}, 标题=${localPrompt.title}`);
            stats.conflicts++;
            const resolvedPrompt = await this.resolveConflict(localPrompt, cloudPrompt);
            if (resolvedPrompt) {
              console.log(`[CloudStorage:Firebase] 冲突已解决: ID=${resolvedPrompt.id}, 标题=${resolvedPrompt.title}`);
              await chromeStorageService.savePrompt(resolvedPrompt);
              stats.resolved++;
            }
          }
        }
      }
      
      // 处理云端存在但本地不存在的提示词(下载)
      console.log('[CloudStorage:Firebase] 开始处理需要下载的提示词');
      for (const cloudPrompt of cloudPrompts) {
        if (!localMap.has(cloudPrompt.id)) {
          console.log(`[CloudStorage:Firebase] 下载新提示词: ID=${cloudPrompt.id}, 标题=${cloudPrompt.title}`);
          await chromeStorageService.savePrompt(cloudPrompt);
          stats.downloaded++;
        }
      }
      
      // 更新同步状态
      console.log(`[CloudStorage:Firebase] 同步完成: 上传=${stats.uploaded}, 下载=${stats.downloaded}, 冲突=${stats.conflicts}, 已解决=${stats.resolved}`);
      this.setSyncStatus('synced', `同步完成: 上传${stats.uploaded}，下载${stats.downloaded}`);
      
      return stats;
    } catch (error) {
      console.error('[CloudStorage:Firebase] 同步失败:', error);
      this.setSyncStatus('error', '同步失败，请检查网络连接');
      throw error;
    }
  }

  // 获取云端提示词
  private async getCloudPrompts(): Promise<Prompt[]> {
    if (!this.userId) {
      console.log('[CloudStorage:Firebase] 未登录，无法获取云端提示词');
      return [];
    }
    
    try {
      console.log(`[CloudStorage:Firebase] 开始从Firebase获取云端提示词, 用户ID=${this.userId}`);
      const db = getFirestore();
      const promptsRef = collection(db, 'users', this.userId, 'prompts');
      console.log('[CloudStorage:Firebase] 发起Firestore查询');
      const querySnapshot = await getDocs(promptsRef);
      console.log(`[CloudStorage:Firebase] 查询完成，获取到${querySnapshot.docs.length}个提示词`);
      
      const prompts = querySnapshot.docs.map(doc => doc.data() as Prompt);
      console.log('[CloudStorage:Firebase] 云端提示词概要:', 
        prompts.map(p => ({ id: p.id, title: p.title, updatedAt: new Date(p.updatedAt).toISOString() })));
      return prompts;
    } catch (error) {
      console.error('[CloudStorage:Firebase] 获取云端提示词失败:', error);
      throw error;
    }
  }

  // 冲突解决 (完整版)
  public async resolveConflict(localPrompt: Prompt, cloudPrompt: Prompt): Promise<Prompt | null> {
    // 检查是否为删除冲突
    if (localPrompt.isActive === false || cloudPrompt.isActive === false) {
      const result = await this.resolveDeletionConflict(
        localPrompt.isActive ? localPrompt : null,
        cloudPrompt.isActive ? null : { timestamp: cloudPrompt.updatedAt }
      );
      
      return result.action === 'keep' && result.prompt ? result.prompt : null;
    }
    
    // 计算内容差异
    const difference = this.calculateDifference(localPrompt.content, cloudPrompt.content);
    
    // 根据差异程度选择策略
    if (difference < 0.2) {
      // 差异小，使用时间戳策略
      return this.resolveSimpleConflict(localPrompt, cloudPrompt);
    } else {
      // 较大差异，保留两者
      // 如果本地较新，保留本地并创建云端副本
      if (localPrompt.updatedAt >= cloudPrompt.updatedAt) {
        // 创建云端副本
        const cloudCopy = {...cloudPrompt};
        cloudCopy.id = this.generateUniqueId();
        cloudCopy.title = `${cloudCopy.title} (云端版本)`;
        
        // 保存副本
        await chromeStorageService.savePrompt(cloudCopy);
        
        return localPrompt;
      } else {
        // 如果云端较新，保留云端并创建本地副本
        const localCopy = {...localPrompt};
        localCopy.id = this.generateUniqueId();
        localCopy.title = `${localCopy.title} (本地版本)`;
        
        // 保存副本
        await chromeStorageService.savePrompt(localCopy);
        
        return cloudPrompt;
      }
    }
  }

  // 生成唯一ID
  private generateUniqueId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 重置云存储服务状态
   * 在用户登出或会话结束时调用
   */
  async reset(): Promise<void> {
    console.log('[CloudStorageService] 重置云存储服务状态');
    await this.onLogout();
  }
}

// 导出云存储服务实例
export const cloudStorageService = new CloudStorageService(); 