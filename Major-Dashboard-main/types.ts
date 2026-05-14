
export interface SensorData {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'ALERT';
  systemHealth: number;
  lastUpdate: string;
  metrics: {
    label: string;
    value: string | number;
    unit: string;
    trend?: 'up' | 'down' | 'stable';
  }[];
}

export interface Alert {
  id: string;
  timestamp: string;
  node: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL';
}

// Fixed: Added ChartData interface which was missing and causing errors in components/ChartPanel.tsx
export interface ChartData {
  time: string | number;
  [key: string]: string | number | undefined;
}
