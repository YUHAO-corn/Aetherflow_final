/**
 * 配置服务
 * 用于安全管理API密钥和环境配置，避免硬编码敏感信息
 */

// 定义配置服务接口
export interface ConfigService {
  // 获取当前环境（开发或生产）
  getEnvironment(): 'development' | 'production';
  
  // Paddle配置
  getPaddleVendorId(): string;
  getPaddleApiKey(): string;
  getPaddleProductIdMonthly(): string;
  getPaddleProductIdAnnual(): string;
  getWebhookUrl(): string;
  
  // 获取会员配置
  getMembershipLimits(isPro: boolean): {
    maxPrompts: number;
    dailyOptimizations: number;
    canExport: boolean;
    hasPrioritySupport: boolean;
  };
  
  // 获取通用配置项
  getConfig(key: string, defaultValue?: any): any;
}

/**
 * 配置服务实现
 */
class ConfigServiceImpl implements ConfigService {
  private env: 'development' | 'production';
  private readonly envPrefix = 'AETHERFLOW_';
  
  // 开发环境和生产环境的配置映射
  private readonly configMap: Record<string, Record<'development' | 'production', any>> = {
    // Paddle配置
    PADDLE_VENDOR_ID: {
      development: '33333', // 开发环境使用测试Vendor ID
      production: '33333'   // 替换为实际产品ID
    },
    PADDLE_API_KEY: {
      development: 'dev_api_key', // 开发环境使用测试密钥
      production: 'prod_api_key'  // 替换为实际API密钥
    },
    PADDLE_PRODUCT_ID_MONTHLY: {
      development: 'pri_01jfcwajex91zya4346h9ek32', // 月度产品ID
      production: 'pri_01jfcwajex91zya4346h9ek32'   // 月度产品ID
    },
    PADDLE_PRODUCT_ID_ANNUAL: {
      development: 'pri_01jfcz25f4zdktr7tt1pnzpw', // 年度产品ID
      production: 'pri_01jfcz25f4zdktr7tt1pnzpw'   // 年度产品ID
    },
    WEBHOOK_URL: {
      development: 'https://api.aetherflow-app.com/webhook/paddle',
      production: 'https://api.aetherflow-app.com/webhook/paddle'
    },
    // 其他配置项可以按需添加
  };

  // 会员限制配置
  private readonly membershipLimits = {
    free: {
      maxPrompts: 5,              // 免费版最多5条提示词
      dailyOptimizations: 3,       // 每天3次优化
      canExport: false,            // 不能导出
      hasPrioritySupport: false    // 无优先支持
    },
    pro: {
      maxPrompts: 100,             // Pro版最多100条提示词
      dailyOptimizations: 50,      // 每天50次优化
      canExport: true,             // 可以导出
      hasPrioritySupport: true     // 有优先支持
    }
  };

  constructor() {
    // 根据环境变量或其他标志确定当前环境
    this.env = this.determineEnvironment();
    console.log(`ConfigService initialized in ${this.env} environment`);
  }

  /**
   * 确定当前运行环境
   */
  private determineEnvironment(): 'development' | 'production' {
    // 可以根据不同的环境判断逻辑来实现
    // 例如，基于环境标记或者chrome.management.getSelf()的结果
    
    // 这里使用简单的逻辑：检查URL或扩展ID来判断是否为生产环境
    const isProd = this.isProductionEnvironment();
    return isProd ? 'production' : 'development';
  }

  /**
   * 判断是否为生产环境
   */
  private isProductionEnvironment(): boolean {
    try {
      // 在浏览器环境中执行
      if (typeof window !== 'undefined' && window.location) {
        // 如果URL包含localhost或127.0.0.1，则视为开发环境
        const url = window.location.href;
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
          return false;
        }
      }
      
      // 如果是扩展环境，可以检查扩展ID
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        const extensionId = chrome.runtime.id;
        // 可以将开发版扩展ID列入白名单
        const devExtensionIds = ['开发版扩展ID1', '开发版扩展ID2'];
        if (devExtensionIds.includes(extensionId)) {
          return false;
        }
      }
      
      // 默认为生产环境
      return true;
    } catch (e) {
      console.error('Error determining environment:', e);
      // 出错时默认为开发环境，更安全
      return false;
    }
  }

  /**
   * 获取环境变量值，优先从配置映射中获取
   */
  private getEnvValue(key: string): string | undefined {
    // 在浏览器扩展环境中，不适合使用process.env
    // 直接从配置映射中获取
    try {
      return this.configMap[key]?.[this.env];
    } catch (e) {
      console.error(`Error getting config for key ${key}:`, e);
      return undefined;
    }
  }

  /**
   * 获取当前环境
   */
  getEnvironment(): 'development' | 'production' {
    return this.env;
  }

  /**
   * 获取Paddle Vendor ID
   */
  getPaddleVendorId(): string {
    return this.getEnvValue('PADDLE_VENDOR_ID') || '';
  }

  /**
   * 获取Paddle API Key
   */
  getPaddleApiKey(): string {
    return this.getEnvValue('PADDLE_API_KEY') || '';
  }

  /**
   * 获取月度产品ID
   */
  getPaddleProductIdMonthly(): string {
    return this.getEnvValue('PADDLE_PRODUCT_ID_MONTHLY') || '';
  }

  /**
   * 获取年度产品ID
   */
  getPaddleProductIdAnnual(): string {
    return this.getEnvValue('PADDLE_PRODUCT_ID_ANNUAL') || '';
  }

  /**
   * 获取Webhook URL
   */
  getWebhookUrl(): string {
    return this.getEnvValue('WEBHOOK_URL') || '';
  }

  /**
   * 获取会员限制
   */
  getMembershipLimits(isPro: boolean) {
    return isPro ? this.membershipLimits.pro : this.membershipLimits.free;
  }

  /**
   * 获取通用配置项
   */
  getConfig(key: string, defaultValue?: any): any {
    const value = this.getEnvValue(key);
    return value !== undefined ? value : defaultValue;
  }
}

// 导出单例实例
export const configService = new ConfigServiceImpl(); 