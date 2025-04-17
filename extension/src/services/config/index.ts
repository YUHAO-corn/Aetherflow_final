/**
 * 配置服务
 * 用于管理应用的各种配置选项
 */

interface MembershipLimits {
  promptLimit: number;
  dailyOptimizationAttempts: number;
  allowDataExport: boolean;
  allowMultiDeviceSync: boolean;
  allowAdvancedFeatures: boolean;
}

class ConfigService {
  private environment: 'development' | 'production';
  
  // Paddle相关配置
  private paddleVendorId: string;
  private paddleApiKey: string;
  private paddleProductIdMonthly: string;
  private paddleProductIdAnnual: string;
  private webhookUrl: string;
  
  // 会员限制
  private freeLimits: MembershipLimits;
  private proLimits: MembershipLimits;
  
  constructor() {
    // 确定环境
    this.environment = this.determineEnvironment();
    
    // 配置Paddle相关信息
    if (this.environment === 'production') {
      this.paddleVendorId = '123456'; // 生产环境ID
      this.paddleApiKey = 'prod_api_key_xxx';
      this.paddleProductIdMonthly = 'prod_monthly_xxx';
      this.paddleProductIdAnnual = 'prod_annual_xxx';
      this.webhookUrl = 'https://aetherflow.com/api/webhook';
    } else {
      this.paddleVendorId = '654321'; // 开发环境ID
      this.paddleApiKey = 'dev_api_key_xxx';
      this.paddleProductIdMonthly = 'dev_monthly_xxx';
      this.paddleProductIdAnnual = 'dev_annual_xxx';
      this.webhookUrl = 'https://dev.aetherflow.com/api/webhook';
    }
    
    // 设置会员限制
    this.freeLimits = {
      promptLimit: 5,
      dailyOptimizationAttempts: 3,
      allowDataExport: false,
      allowMultiDeviceSync: true,
      allowAdvancedFeatures: false
    };
    
    this.proLimits = {
      promptLimit: 100,
      dailyOptimizationAttempts: 50,
      allowDataExport: true,
      allowMultiDeviceSync: true,
      allowAdvancedFeatures: true
    };
  }
  
  /**
   * 确定当前环境
   */
  private determineEnvironment(): 'development' | 'production' {
    // 在Chrome扩展中，我们通过URL或特定标志来确定环境
    
    // 检查当前是否为生产环境URL
    if (typeof window !== 'undefined') {
      // 确认是否在正式域名上运行
      if (window.location.href.includes('aetherflow.com')) {
        return 'production';
      }
      
      // 检查本地存储中是否有环境标志
      try {
        const storedEnv = localStorage.getItem('aetherflow_environment');
        if (storedEnv === 'production') {
          return 'production';
        }
      } catch (e) {
        // 忽略存储访问错误
      }
    }
    
    // 默认为开发环境
    return 'development';
  }
  
  /**
   * 获取当前环境
   */
  public getEnvironment(): 'development' | 'production' {
    return this.environment;
  }
  
  /**
   * 获取Paddle商家ID
   */
  public getPaddleVendorId(): string {
    return this.paddleVendorId;
  }
  
  /**
   * 获取Paddle API密钥
   */
  public getPaddleApiKey(): string {
    return this.paddleApiKey;
  }
  
  /**
   * 获取月付产品ID
   */
  public getPaddleProductIdMonthly(): string {
    return this.paddleProductIdMonthly;
  }
  
  /**
   * 获取年付产品ID
   */
  public getPaddleProductIdAnnual(): string {
    return this.paddleProductIdAnnual;
  }
  
  /**
   * 获取Webhook URL
   */
  public getWebhookUrl(): string {
    return this.webhookUrl;
  }
  
  /**
   * 获取会员限制
   */
  public getMembershipLimits(isPro: boolean): MembershipLimits {
    return isPro ? this.proLimits : this.freeLimits;
  }
}

// 创建单例实例
export const configService = new ConfigService(); 