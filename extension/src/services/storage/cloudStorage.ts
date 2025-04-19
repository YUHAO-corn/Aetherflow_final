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
      // 检查是否为软删除的提示词
      if (cloudPrompt.isActive === false || cloudPrompt.active === false) {
        // 如果云端标记为删除，则尝试在本地删除
        await this.handleCloudPromptRemoval(cloudPrompt.id);
        return;
      }

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
        // 本地不存在，直接保存 (确保只保存 active 的)
        // 修正: 明确检查 true 或 undefined 以消除 linter 警告
        if (cloudPrompt.isActive === true || cloudPrompt.isActive === undefined) {
          await chromeStorageService.savePrompt(cloudPrompt);
        }
      } else {
        // 本地存在，解决冲突
        const resolvedPrompt = this.resolveSimpleConflict(localPrompt, cloudPrompt);
        // 仅当解决后的提示词是 active 时才保存
        // 修正: isActive !== false 包含了 true 和 undefined 的情况
        if (resolvedPrompt.isActive !== false) {
          await chromeStorageService.savePrompt(resolvedPrompt);
        } else {
          // 如果解决结果是 inactive，则确保本地也删除 (软删除)
          await chromeStorageService.deletePrompt(resolvedPrompt.id);
        }
      }
    } catch (error) {
      console.error('处理云端提示词更新失败:', error);
    }
  }

  // 处理云端提示词删除 (或标记为 inactive)
  private async handleCloudPromptRemoval(promptId: string) {
    try {
      // 检查是否为同步过程中自己删除的
      const pendingOp = this.pendingOperationsList.find(
        op => op.id === promptId && op.type === 'delete'
      );

      if (pendingOp) {
        // 是我们自己删除的，移除待处理操作
        this.removePendingOperation(promptId);
        return;
      }

      // 不是自己删除的，执行本地软删除
      await chromeStorageService.deletePrompt(promptId);
      console.log(`[CloudStorage] 已根据云端状态在本地软删除: ${promptId}`);
    } catch (error) {
      console.error('处理云端提示词删除失败:', error);
    }
  }

  // 简单冲突解决 (保留最新)
  private resolveSimpleConflict(localPrompt: Prompt, cloudPrompt: Prompt): Prompt {
    // 优先保留最新的有效提示词
    if ((localPrompt.updatedAt || 0) >= (cloudPrompt.updatedAt || 0)) {
      // 如果本地较新或相等，则使用本地版本
      return localPrompt;
    } else {
      // 否则使用云端版本
      return cloudPrompt;
    }
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

  // 处理待处理操作列表
  public async processPendingOperations(): Promise<void> {
    if (!this.isOnlineStatus || !this.userId || this.pendingOperationsList.length === 0) {
      return;
    }

    console.log(`[CloudStorage] 开始处理 ${this.pendingOperationsList.length} 个待处理操作...`);
    const operationsToProcess = [...this.pendingOperationsList]; // 复制一份以防修改影响迭代

    for (const op of operationsToProcess) {
      try {
        if (op.type === 'upload') {
          if (op.data) {
             // 确保上传的数据 isActive 不为 false
             if(op.data.isActive !== false){
                await this.uploadPromptToFirestore(op.data);
             } else {
                // 如果数据标记为删除，则尝试在云端软删除
                await this.softDeletePromptInFirestore(op.id);
             }
          } else {
            // 如果没有数据，尝试从本地获取最新数据上传
            const localPrompt = await chromeStorageService.getPrompt(op.id);
            if (localPrompt && localPrompt.isActive !== false) { // 只上传 active 的
              await this.uploadPromptToFirestore(localPrompt);
            } else {
              // 如果本地没有或已软删除，确保云端也软删除
              await this.softDeletePromptInFirestore(op.id);
            }
          }
        } else if (op.type === 'delete') {
          // *** 调用软删除而不是硬删除 ***
          await this.softDeletePromptInFirestore(op.id);
        }
        // 操作成功，从队列中移除
        this.removePendingOperation(op.id);
        console.log(`[CloudStorage] 成功处理待处理操作: ${op.type} ${op.id}`);
      } catch (error) {
        console.error(`[CloudStorage] 处理待处理操作失败 (${op.type} ${op.id}):`, error);
        // 保留操作在队列中，下次重试
      }
    }
    console.log('[CloudStorage] 待处理操作处理完成。');
  }

  // 上传提示词到Firestore (确保 isActive 状态正确)
  private async uploadPromptToFirestore(prompt: Prompt): Promise<void> {
    if (!this.userId) return;
     // 确保只上传 isActive 不为 false 的数据
    if (prompt.isActive === false) {
        console.warn(`[CloudStorage] 尝试上传已标记为删除的提示词 ${prompt.id}，已阻止。将尝试软删除云端版本。`);
        await this.softDeletePromptInFirestore(prompt.id); // 确保云端也标记为删除
        return;
    }
    const db = getFirestore();
    const dataToUpload = {
      ...prompt,
      isActive: true, // 明确设置为 true
      active: true,   // 保持兼容
      userId: this.userId // 确保 userId 存在
    };
    // 修正: 删除 undefined 值，需要显式类型断言
    Object.keys(dataToUpload).forEach(key => {
        if (dataToUpload[key as keyof typeof dataToUpload] === undefined) {
          delete dataToUpload[key as keyof typeof dataToUpload];
        }
    });

    const promptRef = doc(db, 'users', this.userId, 'prompts', prompt.id);
    await setDoc(promptRef, dataToUpload, { merge: true }); // 使用 merge: true
     console.log(`[CloudStorage] 成功上传/更新提示词到Firestore: ${prompt.id}`);
  }

  // 新增: 实现 Firestore 软删除
  private async softDeletePromptInFirestore(promptId: string): Promise<void> {
    if (!this.userId) {
      console.warn('[CloudStorage] 用户未登录，无法在 Firestore 中软删除');
      return; // 或者可以抛出错误
    }
    const db = getFirestore();
    const promptRef = doc(db, 'users', this.userId, 'prompts', promptId);
    try {
      await updateDoc(promptRef, {
        isActive: false,
        active: false, // 同时更新两个字段以保持一致性
        updatedAt: Date.now() // 更新时间戳也很重要
      });
      console.log(`[CloudStorage] 成功在Firestore中软删除提示词: ${promptId}`);
    } catch (error: any) {
      // 处理文档不存在的情况 (可能已被硬删除或从未创建)
      if (error.code === 'not-found') {
        console.log(`[CloudStorage] Firestore文档 ${promptId} 不存在，无需软删除。`);
        return; // 视为成功
      }
      console.error(`[CloudStorage] 在Firestore中软删除提示词失败: ${promptId}`, error);
      throw error; // 抛出错误以便上层处理或重试
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

  // 新增: 私有辅助方法，处理提示词上传同步逻辑
  private async _syncPromptUpload(prompt: Prompt): Promise<void> {
    if (!this.userId) {
      console.log('[CloudStorage] 用户未登录，跳过上传同步。');
      return;
    }

    // 确保不上传已软删除的提示词
    if (prompt.isActive === false) {
      console.warn(`[CloudStorage] 尝试同步上传已软删除的提示词 ${prompt.id}，已阻止。将尝试软删除云端版本。`);
      try {
         if (this.isOnlineStatus) {
           await this.softDeletePromptInFirestore(prompt.id);
           this.removePendingOperation(prompt.id); // 如果之前有待处理的删除，移除它
         } else {
           this.addPendingOperation({ type: 'delete', id: prompt.id, timestamp: Date.now() });
         }
      } catch (error) {
         console.error(`[CloudStorage] 在阻止上传软删除提示词时，尝试软删除云端版本失败: ${prompt.id}`, error);
         this.addPendingOperation({ type: 'delete', id: prompt.id, timestamp: Date.now() });
      }
      return;
    }

    try {
      if (this.isOnlineStatus) {
        console.log(`[CloudStorage] 在线状态，尝试立即上传/更新 Firestore: ${prompt.id}`);
        await this.uploadPromptToFirestore(prompt);
        // 如果成功，确保从待处理队列中移除（以防之前失败时加入过）
        this.removePendingOperation(prompt.id);
      } else {
        // 离线状态，加入待处理队列
        console.log(`[CloudStorage] 离线状态，将上传操作加入待处理队列: ${prompt.id}`);
        this.addPendingOperation({
          type: 'upload',
          id: prompt.id,
          data: prompt, // 包含完整数据
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error(`[CloudStorage] 同步上传到 Firestore 失败: ${prompt.id}`, error);
      // 如果尝试立即上传失败，加入待处理队列，下次重试
      console.log(`[CloudStorage] 将失败的上传操作加入待处理队列: ${prompt.id}`);
      this.addPendingOperation({ type: 'upload', id: prompt.id, data: prompt, timestamp: Date.now() });
      // 可选：抛出错误通知调用者云同步失败
      // throw new Error(`同步上传到云端失败: ${error}`);
    }
  }

  // 实现StorageService接口 - savePrompt
  async savePrompt(prompt: Prompt): Promise<void> {
    // 先保存到本地
    await chromeStorageService.savePrompt(prompt);
    
    // 然后上传到云端
    // 修正: 调用新的同步辅助方法
    await this._syncPromptUpload(prompt);
  }

  // 实现StorageService接口 - updatePrompt
  async updatePrompt(id: string, updates: Partial<Prompt>): Promise<void> {
    // 先更新本地
    await chromeStorageService.updatePrompt(id, updates);
    
    // 获取完整的更新后提示词
    const updatedPrompt = await chromeStorageService.getPrompt(id);
    if (updatedPrompt) {
      // 上传到云端
      // 修正: 调用新的同步辅助方法
      await this._syncPromptUpload(updatedPrompt);
    }
  }

  // 删除提示词 (统一软删除)
  async deletePrompt(id: string): Promise<void> {
    // === 调试日志: 确认函数调用和初始状态 ===
    console.log(`[DEBUG CloudStorage] deletePrompt called for ID: ${id}. Current User ID: ${this.userId}, Online Status: ${this.isOnlineStatus}`);

    // 1. 先执行本地软删除
    try {
      await chromeStorageService.deletePrompt(id);
      console.log(`[CloudStorage] 已在本地软删除: ${id}`);
    } catch (error) {
      console.error(`[CloudStorage] 本地软删除失败: ${id}`, error);
      // 考虑是否在此处停止或继续尝试云同步
    }

    // 2. 如果已登录，尝试同步到云端（软删除）
    if (!this.userId) {
      // === 调试日志: 确认是否因未登录而退出 ===
      console.log(`[DEBUG CloudStorage] Condition !this.userId is TRUE. Exiting deletePrompt early.`);
      console.log('[CloudStorage] 用户未登录，仅执行本地软删除。');
      return;
    }

    // === 调试日志: 确认已通过登录检查 ===
    console.log(`[DEBUG CloudStorage] Passed !this.userId check.`);

    try {
      if (this.isOnlineStatus) {
        // === 调试日志: 确认进入在线处理逻辑 ===
        console.log(`[DEBUG CloudStorage] Condition this.isOnlineStatus is TRUE. Attempting online soft delete.`);
        // *** 调用软删除 ***
        console.log(`[CloudStorage] 在线状态，尝试立即在 Firestore 中软删除: ${id}`);
        await this.softDeletePromptInFirestore(id);
        // 如果成功，确保从待处理队列中移除（以防之前失败时加入过）
        this.removePendingOperation(id);
      } else {
        // === 调试日志: 确认进入离线处理逻辑 ===
        console.log(`[DEBUG CloudStorage] Condition this.isOnlineStatus is FALSE. Adding to pending queue.`);
        // 离线状态，加入待处理队列
        console.log(`[CloudStorage] 离线状态，将软删除操作加入待处理队列: ${id}`);
        this.addPendingOperation({
          type: 'delete',
          id,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      // === 调试日志: 确认是否进入错误处理逻辑 ===
      console.log(`[DEBUG CloudStorage] Entered catch block for cloud sync.`);
      console.error(`[CloudStorage] 同步软删除到 Firestore 失败: ${id}`, error);
      // 如果尝试立即软删除失败，加入待处理队列，下次重试
      console.log(`[CloudStorage] 将失败的软删除操作加入待处理队列: ${id}`);
      this.addPendingOperation({ type: 'delete', id, timestamp: Date.now() });
       // 可选: 抛出错误通知调用者云同步失败
       // throw new Error(`同步软删除到云端失败: ${error}`);
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
      // 修正: 调用新的同步辅助方法
      await this._syncPromptUpload(updatedPrompt);
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

  // 全量同步提示词
  public async syncAllPrompts(): Promise<SyncStats> {
    if (!this.userId) {
      throw new Error('用户未登录，无法同步');
    }
    this.setSyncStatus('syncing', '开始全量同步...');
    console.log('[CloudStorage] 开始执行 syncAllPrompts');

    const stats: SyncStats = { uploaded: 0, downloaded: 0, conflicts: 0, resolved: 0 };
    const batch = writeBatch(getFirestore());
    let batchOps = 0;

    try {
      // 1. 获取所有本地提示词 (包括软删除的)
      const localPromptsRaw = await chromeStorageService.getAllPrompts();
      const localPromptsMap = new Map(localPromptsRaw.map(p => [p.id, p]));
      console.log(`[CloudStorage] 获取到 ${localPromptsRaw.length} 个本地提示词`);


      // 2. 获取所有云端提示词 (仅获取 active 的)
      const cloudPromptsActive = await this.getCloudPrompts(true); // true 表示只获取 active
      const cloudPromptsActiveMap = new Map(cloudPromptsActive.map(p => [p.id, p]));
      console.log(`[CloudStorage] 获取到 ${cloudPromptsActive.length} 个云端活动提示词`);


      // 3. 比较本地和云端差异 (以本地为主循环)
      for (const [localId, localPrompt] of localPromptsMap.entries()) {
        const cloudPrompt = cloudPromptsActiveMap.get(localId);

        if (localPrompt.isActive !== false) {
          // ---- 处理本地 Active 的提示词 ----
          if (!cloudPrompt) {
            // 本地 Active, 云端没有 -> 上传
            console.log(`[CloudStorage] 准备上传本地独有提示词: ${localId}`);
            const promptRef = doc(getFirestore(), 'users', this.userId, 'prompts', localId);
            const dataToUpload = { ...localPrompt, userId: this.userId, isActive: true, active: true };
            // 修正: 删除 undefined 值，需要显式类型断言
            Object.keys(dataToUpload).forEach(key => {
                if (dataToUpload[key as keyof typeof dataToUpload] === undefined) {
                  delete dataToUpload[key as keyof typeof dataToUpload];
                }
            });
            batch.set(promptRef, dataToUpload, { merge: true });
            stats.uploaded++;
            batchOps++;
          } else {
            // 本地 Active, 云端 Active -> 比较时间戳
            if ((localPrompt.updatedAt || 0) > (cloudPrompt.updatedAt || 0)) {
              // 本地较新 -> 上传
              console.log(`[CloudStorage] 准备上传本地较新版本: ${localId}`);
              const promptRef = doc(getFirestore(), 'users', this.userId, 'prompts', localId);
              const dataToUpload = { ...localPrompt, userId: this.userId, isActive: true, active: true };
              // 修正: 删除 undefined 值，需要显式类型断言
              Object.keys(dataToUpload).forEach(key => {
                  if (dataToUpload[key as keyof typeof dataToUpload] === undefined) {
                    delete dataToUpload[key as keyof typeof dataToUpload];
                  }
              });
              batch.set(promptRef, dataToUpload, { merge: true });
              stats.uploaded++;
              batchOps++;
            } else if ((localPrompt.updatedAt || 0) < (cloudPrompt.updatedAt || 0)) {
              // 云端较新 -> 下载覆盖本地
              console.log(`[CloudStorage] 准备下载云端较新版本: ${cloudPrompt.id}`);
              await chromeStorageService.savePrompt(cloudPrompt);
              stats.downloaded++;
            }
            // 时间戳相同不处理
            cloudPromptsActiveMap.delete(localId); // 从云端 map 中移除已处理的
          }
        } else {
          // ---- 处理本地 Inactive (软删除) 的提示词 ----
          if (cloudPrompt) {
            // 本地 Inactive, 云端 Active -> 在云端软删除
            console.log(`[CloudStorage] 准备在云端软删除本地已删除的提示词: ${localId}`);
            const promptRef = doc(getFirestore(), 'users', this.userId, 'prompts', localId);
            batch.update(promptRef, { isActive: false, active: false, updatedAt: Date.now() });
            batchOps++;
            stats.uploaded++; // 算作更新操作
            cloudPromptsActiveMap.delete(localId); // 从云端 map 中移除已处理的
          }
          // 如果云端也没有（或云端也 Inactive），则无需操作
        }
      }

      // 4. 处理剩余的云端 Active 提示词 (这些是本地没有的)
      for (const cloudPrompt of cloudPromptsActiveMap.values()) {
          console.log(`[CloudStorage] 准备下载云端独有提示词: ${cloudPrompt.id}`);
          await chromeStorageService.savePrompt(cloudPrompt);
          stats.downloaded++;
      }


      // 5. 提交批量操作
      if (batchOps > 0) {
        console.log(`[CloudStorage] 提交 ${batchOps} 个批量写操作...`);
        await batch.commit();
      }

      this.lastSyncTime = Date.now();
      await chromeStorageService.set(STORAGE_KEYS.LAST_SYNC_TIME, this.lastSyncTime);
      this.setSyncStatus('synced', `同步完成: 上传${stats.uploaded}, 下载${stats.downloaded}`);
      console.log('[CloudStorage] syncAllPrompts 完成', stats);
      return stats;

    } catch (error) {
      console.error('[CloudStorage] syncAllPrompts 失败:', error);
      this.setSyncStatus('error', '同步失败，请稍后重试');
      throw error;
    }
  }


  // 获取云端提示词 (增加只获取 active 的选项)
  private async getCloudPrompts(onlyActive: boolean = false): Promise<Prompt[]> {
    if (!this.userId) return [];
    const db = getFirestore();
    const promptsRef = collection(db, 'users', this.userId, 'prompts');

    // 根据 onlyActive 添加查询条件
    // 使用 != false 会包含 true 和 undefined (对于旧数据可能没有 isActive 字段)
    // 如果只想获取明确为 true 的，用 where('isActive', '==', true)
    const q = onlyActive
      ? query(promptsRef, where('isActive', '!=', false))
      : promptsRef; // 获取所有

    const snapshot = await getDocs(q);
    const prompts: Prompt[] = [];
    snapshot.forEach(doc => {
       const data = doc.data();
       // 确保 isActive 存在，如果 Firestore 中没有，默认为 true
       const isActive = data.isActive === undefined ? true : data.isActive;
       // 如果 onlyActive 为 true，则再次确认 isActive 不为 false
       if (!onlyActive || isActive !== false) {
           prompts.push({ id: doc.id, ...data, isActive } as Prompt);
       }
    });
    return prompts;
  }

  // 新增：根据 ID 获取单个云端提示词（无论状态）
  private async getCloudPromptById(promptId: string): Promise<Prompt | null> {
    if (!this.userId) return null;
    const db = getFirestore();
    const promptRef = doc(db, 'users', this.userId, 'prompts', promptId);
    const docSnap = await getDoc(promptRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
       const isActive = data.isActive === undefined ? true : data.isActive;
      return { id: docSnap.id, ...data, isActive } as Prompt;
    } else {
      return null;
    }
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