import React, { useState } from 'react';
import { membershipService } from '../../services/membership';
import { useMembership } from '../../hooks/useMembership'; // 用于显示当前状态
import { safeLogger } from '../../utils/safeEnvironment';
import { Button } from '../common/Button'; // 复用现有按钮组件

// 简单的内联样式，避免创建额外的 CSS 文件
const switcherStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '10px',
  right: '10px',
  zIndex: 9999, // 确保在最上层
  background: 'rgba(255, 255, 255, 0.9)',
  border: '1px solid #ccc',
  borderRadius: '4px',
  padding: '10px',
  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
  display: 'flex',
  flexDirection: 'column',
  gap: '5px',
};

const buttonStyle: React.CSSProperties = {
  padding: '3px 6px', // 进一步减小内边距
  fontSize: '11px', // 字体更小
  lineHeight: '1.4', // 调整行高
  backgroundColor: '#f0f0f0', // 浅灰色背景
  color: '#333', // 深色文字
  border: '1px solid #ccc', // 边框
  // 移除 variant 和 size 后可能需要重置或调整 Button 组件默认样式
  // 这里假设 Button 没有强制的 variant/size
};

const statusStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 'bold',
  textAlign: 'center',
  marginBottom: '5px',
  color: '#333',
};

export const DevMembershipSwitcher: React.FC = () => {
  const { membershipState, loading, refresh } = useMembership();
  const [isWorking, setIsWorking] = useState(false);

  const handleSetFree = async () => {
    setIsWorking(true);
    safeLogger.log('[DevTool] Setting membership to Free...');
    try {
      await membershipService._devSetFreeMembership();
      await refresh(); // 调用 useMembership 的 refresh 更新状态显示
      safeLogger.log('[DevTool] Membership set to Free.');
    } catch (error) {
      safeLogger.error('[DevTool] Error setting membership to Free:', error);
    } finally {
      setIsWorking(false);
    }
  };

  const handleSetPro = async () => {
    setIsWorking(true);
    safeLogger.log('[DevTool] Setting membership to Pro...');
    try {
      await membershipService._devSetProMembership();
      await refresh(); // 调用 useMembership 的 refresh 更新状态显示
      safeLogger.log('[DevTool] Membership set to Pro.');
    } catch (error) {
      safeLogger.error('[DevTool] Error setting membership to Pro:', error);
    } finally {
      setIsWorking(false);
    }
  };
  
  // 可选：添加模拟即将到期状态的按钮
  const handleSetExpiring = async () => {
    setIsWorking(true);
    safeLogger.log('[DevTool] Setting membership to Expiring Soon...');
    try {
      await membershipService._devSetExpiringSoon();
      await refresh();
      safeLogger.log('[DevTool] Membership set to Expiring Soon.');
    } catch (error) {
      safeLogger.error('[DevTool] Error setting membership to Expiring Soon:', error);
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <div style={switcherStyle}>
      <div style={statusStyle}>
        {loading ? 'Loading...' : `Current: ${membershipState.status.toUpperCase()}`}
      </div>
      <Button
        onClick={handleSetFree}
        disabled={isWorking || loading || membershipState.status === 'free'}
        style={buttonStyle}
        // variant="outline" // 移除不支持的属性
        // size="sm" // 移除不支持的属性
      >
        Set Free
      </Button>
      <Button
        onClick={handleSetPro}
        disabled={isWorking || loading || membershipState.status === 'pro'}
        style={buttonStyle}
        // variant="outline"
        // size="sm"
      >
        Set Pro
      </Button>
       <Button
        onClick={handleSetExpiring}
        disabled={isWorking || loading}
        style={buttonStyle}
        // variant="outline"
        // size="sm"
      >
        Set Expiring
      </Button>
      {/* 可以添加更多测试按钮，例如重置状态 */} 
    </div>
  );
}; 