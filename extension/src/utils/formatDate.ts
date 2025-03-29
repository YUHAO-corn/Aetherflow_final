/**
 * 将毫秒时间戳格式化为可读的日期字符串
 * @param timestamp 毫秒时间戳
 * @returns 格式化的日期字符串，例如：2024年3月28日 12:34
 */
export function formatDate(timestamp: number): string {
  if (!timestamp) return '未知时间';
  
  const date = new Date(timestamp);
  
  // 格式化为：YYYY年MM月DD日 HH:MM
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${year}年${month}月${day}日 ${hours}:${minutes}`;
} 