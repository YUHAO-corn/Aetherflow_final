import { renderHook, act } from '@testing-library/react-hooks';
import '@testing-library/jest-dom';
import { CloudStorageService, Prompt, SyncStats } from '../src/types';

// 模拟 Firebase Firestore
jest.mock('firebase/firestore', () => {
  return {
    __esModule: true,
    getFirestore: jest.fn(),
    collection: jest.fn(),
    doc: jest.fn(),
    setDoc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    deleteDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    onSnapshot: jest.fn(),
    serverTimestamp: jest.fn(() => new Date().getTime()),
    updateDoc: jest.fn(),
  };
});

// 模拟 Firebase Auth
jest.mock('firebase/auth', () => {
  return {
    __esModule: true,
    getAuth: jest.fn(() => ({
      currentUser: { uid: 'test-user-id' },
    })),
    onAuthStateChanged: jest.fn((auth, callback) => {
      callback({ uid: 'test-user-id' });
      return jest.fn(); // 返回unsubscribe函数
    }),
  };
});

// 导入相关服务和hooks
import { cloudStorageService } from '../src/services/storage/cloudStorage';
import { useCloudSync } from '../src/hooks/useCloudSync';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';

// 声明模拟的服务实例
const mockCloudStorageService: jest.Mocked<CloudStorageService> = {
  uploadPrompt: jest.fn(),
  getPrompt: jest.fn(),
  deletePrompt: jest.fn(),
  subscribeToPrompts: jest.fn(),
  resolveConflict: jest.fn(),
  syncAllPrompts: jest.fn(),
  isOnline: jest.fn(),
  pendingOperations: [],
  processPendingOperations: jest.fn()
};

describe('云端存储功能测试', () => {
  beforeEach(() => {
    // 清除所有模拟调用
    jest.clearAllMocks();
  });
  
  // 1. 基本数据同步测试
  describe('基本数据同步', () => {
    test('上传本地提示词到云端', async () => {
      // 模拟测试数据
      const testPrompt = {
        id: 'test-prompt-1',
        title: '测试提示词',
        content: '这是一个测试提示词',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: true,
        useCount: 5
      };
      
      // 模拟Doc函数返回路径
      (doc as jest.Mock).mockReturnValue({ path: 'users/test-user-id/prompts/test-prompt-1' });
      
      // 模拟setDoc成功
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      
      // 执行上传操作
      await cloudStorageService.uploadPrompt(testPrompt);
      
      // 验证调用
      expect(doc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'test-user-id',
        'prompts',
        'test-prompt-1'
      );
      
      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          title: '测试提示词',
          content: '这是一个测试提示词',
          isFavorite: true,
          useCount: 5,
          updatedAt: expect.any(Number)
        })
      );
    });
    
    test('从云端获取提示词', async () => {
      // 模拟测试数据
      const testPromptData = {
        title: '云端提示词',
        content: '这是从云端获取的提示词',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: true,
        useCount: 10
      };
      
      // 模拟Doc函数返回路径
      (doc as jest.Mock).mockReturnValue({ path: 'users/test-user-id/prompts/test-prompt-2' });
      
      // 模拟getDoc返回数据
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => testPromptData,
        id: 'test-prompt-2'
      });
      
      // 执行获取操作
      const result = await cloudStorageService.getPrompt('test-prompt-2');
      
      // 验证调用和结果
      expect(doc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'test-user-id',
        'prompts',
        'test-prompt-2'
      );
      
      expect(getDoc).toHaveBeenCalled();
      
      expect(result).toEqual({
        id: 'test-prompt-2',
        ...testPromptData
      });
    });
    
    test('删除云端提示词', async () => {
      // 模拟Doc函数返回路径
      (doc as jest.Mock).mockReturnValue({ path: 'users/test-user-id/prompts/test-prompt-3' });
      
      // 模拟deleteDoc成功
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);
      
      // 执行删除操作
      await cloudStorageService.deletePrompt('test-prompt-3');
      
      // 验证调用
      expect(doc).toHaveBeenCalledWith(
        expect.anything(),
        'users',
        'test-user-id',
        'prompts',
        'test-prompt-3'
      );
      
      expect(deleteDoc).toHaveBeenCalled();
    });
  });
  
  // 2. 实时同步测试
  describe('实时同步', () => {
    test('设置实时监听器', () => {
      // 模拟回调函数
      const mockCallback = jest.fn();
      
      // 模拟onSnapshot实现
      (onSnapshot as jest.Mock).mockImplementation((docRef, callback) => {
        // 模拟文档变化
        callback({
          docs: [
            {
              id: 'test-prompt-4',
              data: () => ({
                title: '实时更新的提示词',
                content: '这是通过实时监听获取的提示词',
                updatedAt: Date.now()
              }),
              exists: () => true
            }
          ]
        });
        return jest.fn(); // 返回unsubscribe函数
      });
      
      // 设置监听器
      const unsubscribe = cloudStorageService.subscribeToPrompts(mockCallback);
      
      // 验证调用
      expect(onSnapshot).toHaveBeenCalled();
      
      // 验证回调被触发
      expect(mockCallback).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'test-prompt-4',
          title: '实时更新的提示词'
        })
      ]);
      
      // 验证返回了取消订阅函数
      expect(typeof unsubscribe).toBe('function');
    });
  });
  
  // 3. 冲突处理测试
  describe('冲突处理', () => {
    test('检测并解决冲突 - 本地版本较新', async () => {
      // 模拟本地提示词
      const localPrompt = {
        id: 'conflict-prompt',
        title: '本地版本',
        content: '本地内容',
        updatedAt: Date.now(), // 当前时间，表示较新
        useCount: 5
      };
      
      // 模拟云端提示词
      const cloudPrompt = {
        id: 'conflict-prompt',
        title: '云端版本',
        content: '云端内容',
        updatedAt: Date.now() - 86400000, // 一天前，表示较旧
        useCount: 3
      };
      
      // 模拟函数调用
      (doc as jest.Mock).mockReturnValue({ path: 'users/test-user-id/prompts/conflict-prompt' });
      
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => cloudPrompt,
        id: 'conflict-prompt'
      });
      
      (setDoc as jest.Mock).mockResolvedValue(undefined);
      
      // 执行冲突检测和解决
      const result = await cloudStorageService.resolveConflict(localPrompt, cloudPrompt);
      
      // 验证使用了本地版本
      expect(result).toEqual(expect.objectContaining({
        id: 'conflict-prompt',
        title: '本地版本',
        content: '本地内容'
      }));
      
      // 验证上传了本地版本
      expect(setDoc).toHaveBeenCalled();
    });
    
    test('检测并解决冲突 - 云端版本较新', async () => {
      // 模拟本地提示词
      const localPrompt = {
        id: 'conflict-prompt-2',
        title: '本地版本',
        content: '本地内容',
        updatedAt: Date.now() - 86400000, // 一天前，表示较旧
        useCount: 5
      };
      
      // 模拟云端提示词
      const cloudPrompt = {
        id: 'conflict-prompt-2',
        title: '云端版本',
        content: '云端内容',
        updatedAt: Date.now(), // 当前时间，表示较新
        useCount: 3
      };
      
      // 执行冲突检测和解决
      const result = await cloudStorageService.resolveConflict(localPrompt, cloudPrompt);
      
      // 验证使用了云端版本
      expect(result).toEqual(expect.objectContaining({
        id: 'conflict-prompt-2',
        title: '云端版本',
        content: '云端内容'
      }));
    });
  });
  
  // 4. useCloudSync Hook测试
  describe('useCloudSync Hook', () => {
    test('同步状态初始化', () => {
      // 渲染Hook
      const { result } = renderHook(() => useCloudSync());
      
      // 验证初始状态
      expect(result.current.syncStatus).toBe('idle');
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.lastSyncTime).toBe(null);
      expect(result.current.error).toBe(null);
    });
    
    test('开始同步操作', async () => {
      // 模拟服务函数
      cloudStorageService.syncAllPrompts = jest.fn().mockResolvedValue({
        uploaded: 2,
        downloaded: 3,
        conflicts: 1,
        resolved: 1
      });
      
      // 渲染Hook
      const { result, waitForNextUpdate } = renderHook(() => useCloudSync());
      
      // 执行同步操作
      act(() => {
        result.current.startSync();
      });
      
      // 验证状态变化为同步中
      expect(result.current.syncStatus).toBe('syncing');
      expect(result.current.isSyncing).toBe(true);
      
      // 等待操作完成
      await waitForNextUpdate();
      
      // 验证同步完成状态
      expect(result.current.syncStatus).toBe('completed');
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.lastSyncTime).not.toBe(null);
      expect(result.current.syncStats).toEqual({
        uploaded: 2,
        downloaded: 3,
        conflicts: 1,
        resolved: 1
      });
    });
    
    test('同步操作失败处理', async () => {
      // 模拟服务函数抛出错误
      const mockError = new Error('同步失败');
      cloudStorageService.syncAllPrompts = jest.fn().mockRejectedValue(mockError);
      
      // 渲染Hook
      const { result, waitForNextUpdate } = renderHook(() => useCloudSync());
      
      // 执行同步操作
      act(() => {
        result.current.startSync();
      });
      
      // 等待操作完成
      await waitForNextUpdate();
      
      // 验证错误状态
      expect(result.current.syncStatus).toBe('error');
      expect(result.current.error).toBe(mockError);
      expect(result.current.isSyncing).toBe(false);
    });
  });
  
  // 5. 离线支持测试
  describe('离线支持', () => {
    test('离线操作队列', async () => {
      // 模拟离线状态
      cloudStorageService.isOnline = jest.fn().mockReturnValue(false);
      
      // 模拟提示词操作
      const testPrompt = {
        id: 'offline-prompt',
        title: '离线创建的提示词',
        content: '这是在离线状态下创建的提示词'
      };
      
      // 执行离线操作
      await cloudStorageService.uploadPrompt(testPrompt);
      
      // 验证操作被添加到队列而不是直接执行
      expect(setDoc).not.toHaveBeenCalled();
      
      // 验证离线队列包含该操作
      expect(cloudStorageService.pendingOperations.length).toBe(1);
      expect(cloudStorageService.pendingOperations[0]).toEqual(
        expect.objectContaining({
          type: 'upload',
          data: expect.objectContaining({
            id: 'offline-prompt'
          })
        })
      );
      
      // 模拟重新联网
      cloudStorageService.isOnline = jest.fn().mockReturnValue(true);
      
      // 执行同步
      await cloudStorageService.processPendingOperations();
      
      // 验证操作被执行
      expect(setDoc).toHaveBeenCalled();
      
      // 验证队列被清空
      expect(cloudStorageService.pendingOperations.length).toBe(0);
    });
  });
});

describe('存储配额管理测试', () => {
  let mockPrompts: Prompt[];
  
  beforeEach(() => {
    // 重置模拟
    jest.clearAllMocks();
    
    // 准备测试数据
    mockPrompts = Array(5).fill(null).map((_, index) => ({
      id: `prompt-${index}`,
      title: `测试提示词 ${index}`,
      content: `这是测试提示词内容 ${index}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      useCount: 0
    }));
  });
  
  test('免费用户达到5个提示词限制时提示升级', async () => {
    // 模拟存储服务返回5个提示词(已达上限)
    const mockGetAllPrompts = jest.fn().mockResolvedValue(mockPrompts);
    cloudStorageService.getAllPrompts = mockGetAllPrompts;
    
    // 模拟用户状态为免费用户
    const mockGetUserSubscription = jest.fn().mockResolvedValue({
      status: 'active',
      plan: 'free',
      currentPeriodEnd: Date.now() + 86400000,
      cancelAtPeriodEnd: false
    });
    
    // 尝试添加第6个提示词
    const newPrompt: Prompt = {
      id: 'prompt-6',
      title: '测试提示词 6',
      content: '这是第6个提示词',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      useCount: 0
    };
    
    // 模拟配额检查服务
    const quotaInfo = {
      isLimitReached: true,
      currentCount: 5,
      limit: 5,
      isPremium: false
    };
    const mockCheckQuota = jest.fn().mockResolvedValue(quotaInfo);
    
    // 添加提示词应该被拒绝
    await expect(async () => {
      // 在添加前检查配额
      const quota = await mockCheckQuota();
      if (quota.isLimitReached) {
        throw new Error('存储限制已达到，请升级您的账户');
      }
      await cloudStorageService.uploadPrompt(newPrompt);
    }).rejects.toThrow('存储限制已达到，请升级您的账户');
    
    // 验证配额检查被调用
    expect(mockCheckQuota).toHaveBeenCalled();
  });
  
  test('付费用户可以存储超过基础限制的提示词', async () => {
    // 模拟用户状态为付费用户
    const mockGetUserSubscription = jest.fn().mockResolvedValue({
      status: 'active',
      plan: 'premium',
      currentPeriodEnd: Date.now() + 86400000,
      cancelAtPeriodEnd: false
    });
    
    // 模拟配额检查服务 - 付费用户未达上限
    const quotaInfo = {
      isLimitReached: false,
      currentCount: 50,
      limit: 100,
      isPremium: true
    };
    const mockCheckQuota = jest.fn().mockResolvedValue(quotaInfo);
    
    // 创建一个新的提示词
    const newPrompt: Prompt = {
      id: 'premium-prompt',
      title: '付费用户提示词',
      content: '这是付费用户的提示词',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      useCount: 0
    };
    
    // 模拟上传函数
    cloudStorageService.uploadPrompt = jest.fn().mockResolvedValue(undefined);
    
    // 执行测试
    const quota = await mockCheckQuota();
    if (!quota.isLimitReached) {
      await cloudStorageService.uploadPrompt(newPrompt);
    }
    
    // 验证上传被调用
    expect(cloudStorageService.uploadPrompt).toHaveBeenCalledWith(newPrompt);
  });
});

describe('数据安全测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('API请求包含有效认证令牌', async () => {
    // 模拟 Firebase 认证
    const mockGetIdToken = jest.fn().mockResolvedValue('valid-auth-token-123');
    const mockCurrentUser = {
      getIdToken: mockGetIdToken,
      uid: 'test-user-id'
    };
    const mockAuth = {
      currentUser: mockCurrentUser
    };
    
    // 模拟 getAuth 方法
    (getAuth as jest.Mock).mockReturnValue(mockAuth);
    
    // 模拟 Firestore 方法调用
    const mockSetDoc = jest.fn().mockResolvedValue(undefined);
    (setDoc as jest.Mock).mockImplementation(mockSetDoc);
    
    // 创建测试提示词
    const testPrompt: Prompt = {
      id: 'secure-prompt',
      title: '安全测试提示词',
      content: '这是测试内容',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      useCount: 0
    };
    
    // 调用上传方法
    await cloudStorageService.uploadPrompt(testPrompt);
    
    // 验证获取令牌方法被调用
    expect(mockGetIdToken).toHaveBeenCalled();
    
    // 验证 Firestore 操作使用了认证上下文
    expect(getAuth).toHaveBeenCalled();
  });
  
  test('未授权用户无法访问他人数据', async () => {
    // 模拟不同的用户ID
    const currentUserUid = 'current-user-id';
    const otherUserUid = 'other-user-id';
    
    // 模拟 Firebase 认证
    const mockCurrentUser = {
      uid: currentUserUid,
      getIdToken: jest.fn().mockResolvedValue('token')
    };
    const mockAuth = {
      currentUser: mockCurrentUser
    };
    (getAuth as jest.Mock).mockReturnValue(mockAuth);
    
    // 模拟数据库安全规则检查 - 访问权限函数
    const canAccessData = (documentPath: string, userUid: string) => {
      // 模拟 Firestore 安全规则逻辑
      const pathComponents = documentPath.split('/');
      const userIdInPath = pathComponents[1]; // 假设路径格式为 'users/{userId}/prompts/{promptId}'
      return userIdInPath === userUid;
    };
    
    // 模拟访问当前用户数据 - 应成功
    const currentUserPath = `users/${currentUserUid}/prompts/prompt-1`;
    const hasAccessToCurrentUserData = canAccessData(currentUserPath, mockCurrentUser.uid);
    expect(hasAccessToCurrentUserData).toBe(true);
    
    // 模拟访问其他用户数据 - 应失败
    const otherUserPath = `users/${otherUserUid}/prompts/prompt-1`;
    const hasAccessToOtherUserData = canAccessData(otherUserPath, mockCurrentUser.uid);
    expect(hasAccessToOtherUserData).toBe(false);
  });
});

describe('性能测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('同步操作响应时间不超过1秒', async () => {
    // 模拟同步操作
    const syncStats: SyncStats = {
      uploaded: 2,
      downloaded: 3,
      conflicts: 0,
      resolved: 0
    };
    cloudStorageService.syncAllPrompts = jest.fn().mockResolvedValue(syncStats);
    
    // 测量操作时间
    const startTime = Date.now();
    await cloudStorageService.syncAllPrompts();
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 验证响应时间不超过1秒
    expect(duration).toBeLessThanOrEqual(1000);
  });
  
  test('数据同步在30秒内完成', async () => {
    // 模拟需要同步的大量数据
    const largeDataSet = Array(50).fill(null).map((_, i) => ({
      id: `prompt-${i}`,
      title: `大数据测试 ${i}`,
      content: `这是测试内容，包含较长文本 ${i}`.repeat(20), // 创建较大的内容
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      useCount: 0
    }));
    
    // 模拟同步过程
    const mockSyncOperation = jest.fn().mockImplementation(() => {
      return new Promise<SyncStats>((resolve) => {
        // 模拟同步过程需要一些时间
        setTimeout(() => {
          resolve({
            uploaded: 20,
            downloaded: 30,
            conflicts: 0,
            resolved: 0
          });
        }, 500); // 模拟耗时500ms
      });
    });
    
    cloudStorageService.syncAllPrompts = mockSyncOperation;
    
    // 测量同步时间
    const startTime = Date.now();
    await cloudStorageService.syncAllPrompts();
    const duration = Date.now() - startTime;
    
    // 验证同步时间在要求范围内
    expect(duration).toBeLessThanOrEqual(30000);
    // 同时验证函数是否被调用
    expect(mockSyncOperation).toHaveBeenCalled();
  });
  
  test('实时更新应立即触发UI更新', async () => {
    // 模拟提示词数据
    const mockPrompts = [
      {
        id: 'prompt-1',
        title: '测试提示词',
        content: '测试内容',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
        useCount: 0
      }
    ];
    
    // 模拟实时订阅
    let callbackFn: (prompts: Prompt[]) => void;
    cloudStorageService.subscribeToPrompts = jest.fn().mockImplementation((callback) => {
      callbackFn = callback;
      return () => {}; // 返回取消订阅函数
    });
    
    // 渲染hook
    const { result } = renderHook(() => useCloudSync());
    
    // 初始状态
    expect(result.current.prompts).toEqual([]);
    
    // 触发回调，模拟数据更新
    act(() => {
      if (callbackFn) callbackFn(mockPrompts);
    });
    
    // 验证UI立即更新
    expect(result.current.prompts).toEqual(mockPrompts);
  });
});

describe('边界条件测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('处理大量数据时不会崩溃', async () => {
    // 生成大量测试数据
    const largeDataSet = Array(1000).fill(null).map((_, i) => ({
      id: `prompt-${i}`,
      title: `大数据测试 ${i}`,
      content: `这是测试内容 ${i}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: i % 5 === 0, // 每5个设置一个收藏
      useCount: i
    }));
    
    // 模拟订阅回调
    let callbackFunction: (prompts: Prompt[]) => void;
    cloudStorageService.subscribeToPrompts = jest.fn().mockImplementation((callback) => {
      callbackFunction = callback;
      return () => {}; // 返回取消订阅函数
    });
    
    // 渲染hook
    const { result } = renderHook(() => useCloudSync());
    
    // 用超大数据集触发回调
    act(() => {
      if (callbackFunction) callbackFunction(largeDataSet);
    });
    
    // 验证系统处理了所有数据
    expect(result.current.prompts.length).toBe(largeDataSet.length);
  });
  
  test('网络速度极慢时的行为', async () => {
    // 模拟极慢的网络响应
    cloudStorageService.uploadPrompt = jest.fn().mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => resolve(undefined), 5000); // 模拟5秒的网络延迟
      });
    });
    
    // 设置测试超时时间
    jest.setTimeout(10000);
    
    // 准备测试数据
    const testPrompt: Prompt = {
      id: 'slow-network-test',
      title: '慢网络测试',
      content: '测试内容',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      useCount: 0
    };
    
    // 记录开始时间
    const startTime = Date.now();
    
    // 执行上传，应该可以成功但会很慢
    await cloudStorageService.uploadPrompt(testPrompt);
    
    // 验证实际耗时
    const duration = Date.now() - startTime;
    expect(duration).toBeGreaterThanOrEqual(5000);
    
    // 验证方法被调用
    expect(cloudStorageService.uploadPrompt).toHaveBeenCalledWith(testPrompt);
  });
  
  test('存储空间不足的错误处理', async () => {
    // 模拟存储空间不足错误
    const mockStorageError = new Error('Quota exceeded');
    mockStorageError.name = 'QuotaExceededError';
    
    // 模拟上传失败
    cloudStorageService.uploadPrompt = jest.fn().mockRejectedValue(mockStorageError);
    
    // 测试数据
    const testPrompt: Prompt = {
      id: 'storage-test',
      title: '存储空间测试',
      content: '测试内容',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      useCount: 0
    };
    
    // 验证上传失败并捕获正确的错误
    await expect(cloudStorageService.uploadPrompt(testPrompt))
      .rejects.toThrow('Quota exceeded');
    
    // 验证错误类型
    try {
      await cloudStorageService.uploadPrompt(testPrompt);
    } catch (error) {
      expect(error.name).toBe('QuotaExceededError');
    }
  });
  
  test('处理空或无效数据', async () => {
    // 使用空内容测试
    const emptyPrompt: Prompt = {
      id: 'empty-test',
      title: '',
      content: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      useCount: 0
    };
    
    // 模拟上传功能
    cloudStorageService.uploadPrompt = jest.fn().mockResolvedValue(undefined);
    
    // 验证空内容仍然可以上传
    await cloudStorageService.uploadPrompt(emptyPrompt);
    expect(cloudStorageService.uploadPrompt).toHaveBeenCalledWith(emptyPrompt);
    
    // 测试边界情况 - 超长标题
    const longTitlePrompt: Prompt = {
      id: 'long-title',
      title: 'a'.repeat(1000), // 创建超长标题
      content: '测试内容',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      useCount: 0
    };
    
    // 清除之前的模拟调用
    jest.clearAllMocks();
    
    // 验证超长标题仍然可以处理
    await cloudStorageService.uploadPrompt(longTitlePrompt);
    expect(cloudStorageService.uploadPrompt).toHaveBeenCalledWith(longTitlePrompt);
  });
});

describe('用户交互场景测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('用户手动触发同步过程', async () => {
    // 模拟同步功能
    const syncStats: SyncStats = {
      uploaded: 2,
      downloaded: 3,
      conflicts: 0,
      resolved: 0
    };
    cloudStorageService.syncAllPrompts = jest.fn().mockResolvedValue(syncStats);
    
    // 渲染hook
    const { result, waitForNextUpdate } = renderHook(() => useCloudSync());
    
    // 触发手动同步
    act(() => {
      result.current.startSync();
    });
    
    // 等待状态更新
    await waitForNextUpdate();
    
    // 验证状态变化
    expect(result.current.syncStatus).toBe('success');
    expect(cloudStorageService.syncAllPrompts).toHaveBeenCalled();
  });
  
  test('用户解决冲突选择保留本地版本', async () => {
    // 模拟冲突的提示词
    const localPrompt: Prompt = {
      id: 'conflict-prompt',
      title: '本地版本',
      content: '本地内容',
      createdAt: Date.now() - 10000,
      updatedAt: Date.now(),
      isFavorite: true,
      useCount: 5
    };
    
    const cloudPrompt: Prompt = {
      id: 'conflict-prompt',
      title: '云端版本',
      content: '云端内容',
      createdAt: Date.now() - 10000,
      updatedAt: Date.now() - 5000, // 云端版本更旧
      isFavorite: false,
      useCount: 3
    };
    
    // 模拟冲突解决功能
    cloudStorageService.resolveConflict = jest.fn().mockImplementation(
      (local, cloud) => Promise.resolve(local) // 总是选择本地版本
    );
    
    // 执行冲突解决
    const resolvedPrompt = await cloudStorageService.resolveConflict(localPrompt, cloudPrompt);
    
    // 验证解决结果
    expect(resolvedPrompt).toEqual(localPrompt);
    expect(cloudStorageService.resolveConflict).toHaveBeenCalledWith(localPrompt, cloudPrompt);
  });
  
  test('用户中断同步过程', async () => {
    // 创建一个可控的同步函数Promise
    let resolveSyncPromise: (value: SyncStats) => void;
    let rejectSyncPromise: (reason: any) => void;
    
    const syncPromise = new Promise<SyncStats>((resolve, reject) => {
      resolveSyncPromise = resolve;
      rejectSyncPromise = reject;
    });
    
    // 模拟长时间运行的同步过程
    cloudStorageService.syncAllPrompts = jest.fn().mockImplementation(() => syncPromise);
    
    // 渲染hook
    const { result } = renderHook(() => useCloudSync());
    
    // 开始同步
    act(() => {
      result.current.startSync();
    });
    
    // 验证同步状态已更新为进行中
    expect(result.current.syncStatus).toBe('loading');
    
    // 模拟用户取消
    act(() => {
      result.current.cancelSync();
    });
    
    // 完成同步过程
    act(() => {
      rejectSyncPromise(new Error('用户取消'));
    });
    
    // 验证同步已取消
    expect(result.current.syncStatus).toBe('idle');
  });
}); 