
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  HeartPulse, 
  Activity, 
  User, 
  Tag, 
  Radio, 
  Camera, 
  ShieldAlert,
  Clock,
  RefreshCw,
  AlertTriangle,
  Scan,
  Zap,
  Navigation,
  Lock
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

// --- Configuration ---
const BASE_URL = 'https://backend-5g49.onrender.com';
const POLL_INTERVAL = 2500;

// --- Types ---
interface EnvironmentData {
  node_id: string;
  temperature: number;
  humidity: number;
  mq135_ppm: number;
  timestamp: string;
}

interface VitalsData {
  node_id: string;
  human_detected: number;
  heart_rate: number;
  breath_rate: number;
  distance_m: number;
  move_speed_cm: number;
  timestamp: string;
}

interface RFIDData {
  node_id: string;
  room: string;
  uid: string;
  access: 'GRANTED' | 'DENIED';
  timestamp: string;
}

interface HistoryPoint {
  time: string;
  temp: number;
  gas: number;
  heart: number;
  breath: number;
}

interface LogEntry {
  id: string;
  type: 'RFID' | 'SYSTEM' | 'ALERT';
  message: string;
  timestamp: string;
  status: 'info' | 'warning' | 'danger' | 'success';
}

// --- Components ---

type NodeStatus = 'ACTIVE' | 'DELAYED' | 'OFFLINE';

const StatusBadge = ({ status, type = 'default' }: { status: string, type?: 'default' | 'alert' }) => {
  const colors: Record<string, string> = {
    Authorized: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Denied: 'bg-red-500/10 text-red-500 border-red-500/20',
    Yes: 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse',
    No: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Safe: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    Warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    Danger: 'bg-red-500/10 text-red-500 border-red-500/20 animate-bounce',
    Detected: 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse',
    Clear: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };

  const colorClass = colors[status] || 'bg-slate-500/10 text-slate-500 border-slate-500/20';

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colorClass}`}>
      {status}
    </span>
  );
};

const NodeCard = ({ 
  title, 
  icon: Icon, 
  children, 
  isAlert = false, 
  isHighlighted = false,
  timestamp,
  nodeId,
  status = 'ACTIVE'
}: { 
  title: string, 
  icon: any, 
  children: React.ReactNode, 
  isAlert?: boolean,
  isHighlighted?: boolean,
  timestamp?: string,
  nodeId: string,
  status?: NodeStatus
}) => {
  const isOffline = status === 'OFFLINE';
  const isDelayed = status === 'DELAYED';

  return (
    <div className={`bg-[#0d1117] border ${isAlert && !isOffline ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : isHighlighted && !isOffline ? 'border-[#0ea5e9] shadow-[0_0_15px_rgba(14,165,233,0.2)]' : 'border-[#30363d]'} rounded-2xl p-5 flex flex-col h-full transition-all relative overflow-hidden group ${isOffline ? 'opacity-75' : ''}`}>
      {isAlert && !isOffline && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${isOffline ? 'bg-slate-800 text-slate-600' : isAlert ? 'bg-red-500/10 text-red-500' : isHighlighted ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]' : 'bg-slate-900 text-slate-400'} flex items-center justify-center transition-transform`}>
            <Icon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-tight leading-tight">{title}</h3>
            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">{nodeId}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest ${isOffline ? 'text-red-500' : isDelayed ? 'text-amber-500' : 'text-emerald-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-red-500' : isDelayed ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
            {status}
          </span>
          {timestamp && (
            <div className="flex items-center gap-1 text-slate-600 font-mono text-[8px]">
              {new Date(timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
      <div className={`flex-1 ${isOffline ? 'grayscale contrast-75' : ''}`}>
        {isOffline ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-4">
            <RefreshCw size={24} className="text-slate-700 animate-spin-slow" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Waiting for Data...</p>
            <p className="text-[8px] font-mono text-slate-600 uppercase">Node Offline</p>
          </div>
        ) : children}
      </div>
    </div>
  );
};

const ChartContainer = ({ title, children, icon: Icon }: { title: string, children: React.ReactNode, icon?: any }) => (
  <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5 h-[280px] flex flex-col">
    <div className="flex items-center gap-2 mb-4">
      {Icon && <Icon size={14} className="text-[#0ea5e9]" />}
      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</h3>
    </div>
    <div className="flex-1 relative">
      <div className="absolute inset-0">
        {children}
      </div>
    </div>
  </div>
);

// --- Main App ---
const App: React.FC = () => {
  const [env, setEnv] = useState<EnvironmentData | null>(null);
  const [vitals, setVitals] = useState<VitalsData | null>(null);
  const [rfid, setRfid] = useState<RFIDData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Freshness check logic
  const getNodeStatus = (timestamp?: string, nodeId?: string): NodeStatus => {
    if (!timestamp) return 'OFFLINE';
    
    let parsedDate: Date;
    try {
      // YYYY-MM-DD HH:mm:ss -> YYYY-MM-DDTHH:mm:ssZ (Forces UTC for SQLite timestamps)
      const isoFormat = timestamp.replace(" ", "T") + "Z";
      parsedDate = new Date(isoFormat);
      
      // Fallback if parsing fails (NaN check)
      if (isNaN(parsedDate.getTime())) {
        console.warn(`[${nodeId || 'UNKNOWN'}] Invalid timestamp format: ${timestamp}`);
        return 'ACTIVE'; 
      }
    } catch (e) {
      console.error(`[${nodeId || 'UNKNOWN'}] Timestamp parse error:`, e);
      return 'ACTIVE';
    }

    const diffSeconds = (now - parsedDate.getTime()) / 1000;
    const statusResult = diffSeconds < 30 ? 'ACTIVE' : (diffSeconds < 120 ? 'DELAYED' : 'OFFLINE');

    // Requirement 6: Detailed console logs
    if (nodeId) {
      console.log(`[${nodeId}] SYNC_CHECK:`, {
        raw: timestamp,
        parsed: parsedDate.toISOString(),
        secondsDiff: Math.floor(diffSeconds),
        status: statusResult
      });
    }

    return statusResult;
  };

  const envStatus = getNodeStatus(env?.timestamp, 'NODE-01');
  const vitalsStatus = getNodeStatus(vitals?.timestamp, 'NODE-02');
  const rfidStatus = getNodeStatus(rfid?.timestamp, 'NODE-03');
  
  const fetchData = async () => {
    console.log("--- FETCHING TELEMETRY ---");
    try {
      setSyncError(false);
      // 1. Handle APIs independently (Remove all-or-nothing failure)
      const [envRes, vitalsRes, rfidRes] = await Promise.allSettled([
        fetch(`${BASE_URL}/api/environment`),
        fetch(`${BASE_URL}/api/vitals`),
        fetch(`${BASE_URL}/api/rfid`)
      ]);

      let envJson: any = null;
      let vitalsJson: any = null;
      let rfidJson: any = null;

      if (envRes.status === 'fulfilled' && envRes.value.ok) {
        try {
          envJson = await envRes.value.json();
        } catch (e) {
          console.error("Failed to parse Environment JSON:", e);
        }
      } else {
        console.warn("Environment API failed or returned error", envRes);
      }

      if (vitalsRes.status === 'fulfilled' && vitalsRes.value.ok) {
        try {
          vitalsJson = await vitalsRes.value.json();
        } catch (e) {
          console.error("Failed to parse Vitals JSON:", e);
        }
      } else {
        console.warn("Vitals API failed or returned error", vitalsRes);
      }

      if (rfidRes.status === 'fulfilled' && rfidRes.value.ok) {
        try {
          rfidJson = await rfidRes.value.json();
        } catch (e) {
          console.error("Failed to parse RFID JSON:", e);
        }
      } else {
        console.warn("RFID API failed or returned error", rfidRes);
      }

      // 2. Handle Array vs Object response (CRITICAL)
      const envData = envJson ? (Array.isArray(envJson) ? envJson : [envJson]) : [];
      const vitalsData = vitalsJson ? (Array.isArray(vitalsJson) ? vitalsJson : [vitalsJson]) : [];
      const rfidData = rfidJson ? (Array.isArray(rfidJson) ? rfidJson : [rfidJson]) : [];

      // 5. Debug Logs
      console.log("ENV DATA:", envData);
      console.log("VITALS DATA:", vitalsData);
      console.log("RFID DATA:", rfidData);

      const latestEnv = envData.length > 0 ? envData[0] : null;
      const latestVitals = vitalsData.length > 0 ? vitalsData[0] : null;
      const latestRFID = rfidData.length > 0 ? rfidData[0] : null;

      if (latestEnv) setEnv(latestEnv);
      if (latestVitals) setVitals(latestVitals);
      if (latestRFID) setRfid(latestRFID);
      
      // Update current time for freshness check
      setNow(Date.now());
      
      // 3. Ensure history state is ALWAYS updated (even with partial data)
      // 4. Force numeric values
      setHistory(prev => {
        // Stop updating graph if node is OFFLINE
        const eStatus = getNodeStatus(latestEnv?.timestamp, 'NODE-01-GRAPH');
        const vStatus = getNodeStatus(latestVitals?.timestamp, 'NODE-02-GRAPH');

        if (eStatus === 'OFFLINE' && vStatus === 'OFFLINE') return prev;

        const parseNum = (val: any, fallback: number) => {
          const n = Number(val);
          return isNaN(n) ? fallback : n;
        };

        const newPoint: HistoryPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          temp: latestEnv && eStatus !== 'OFFLINE' ? parseNum(latestEnv.temperature, (prev.length > 0 ? prev[prev.length - 1].temp : 0)) : (prev.length > 0 ? prev[prev.length - 1].temp : 0),
          gas: latestEnv && eStatus !== 'OFFLINE' ? parseNum(latestEnv.mq135_ppm, (prev.length > 0 ? prev[prev.length - 1].gas : 0)) : (prev.length > 0 ? prev[prev.length - 1].gas : 0),
          heart: latestVitals && vStatus !== 'OFFLINE' ? parseNum(latestVitals.heart_rate, (prev.length > 0 ? prev[prev.length - 1].heart : 0)) : (prev.length > 0 ? prev[prev.length - 1].heart : 0),
          breath: latestVitals && vStatus !== 'OFFLINE' ? parseNum(latestVitals.breath_rate, (prev.length > 0 ? prev[prev.length - 1].breath : 0)) : (prev.length > 0 ? prev[prev.length - 1].breath : 0)
        };
        const updated = [...prev, newPoint].slice(-20);
        console.log("HISTORY UPDATED, COUNT:", updated.length, "LATEST:", newPoint);
        return updated;
      });

      // Simple alert log logic
      if (latestEnv && Number(latestEnv.mq135_ppm) > 400) {
        addLog('ALERT', `High gas concentration detected: ${latestEnv.mq135_ppm} ppm`, 'danger');
      }
      if (latestVitals && Number(latestVitals.human_detected) === 1) {
        addLog('SYSTEM', 'Human presence detected in restricted zone', 'warning');
      }
      if (latestRFID && latestRFID.access === 'DENIED') {
        addLog('ALERT', `Unauthorized access attempt: UID ${latestRFID.uid}`, 'danger');
      }
    } catch (error) {
      console.error("Telemetry Sync Error:", error);
      setSyncError(true);
    } finally {
      setLoading(false);
      setLastSync(new Date());
    }
  };

  const addLog = (type: LogEntry['type'], message: string, status: LogEntry['status']) => {
    setLogs(prev => {
      // Avoid duplicate logs for the same event in a short time
      if (prev.length > 0 && prev[0].message === message) return prev;
      const newLog: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        message,
        timestamp: new Date().toLocaleTimeString(),
        status
      };
      return [newLog, ...prev].slice(0, 20);
    });
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const isGasDanger = env && env.mq135_ppm > 400;
  const isHumanDetected = vitals && vitals.human_detected === 1;

  return (
    <div className="min-h-screen bg-[#010409] text-slate-100 p-4 lg:p-8 font-sans selection:bg-[#0ea5e9]/30 overflow-x-hidden">
      {/* Global Alert Overlay */}
      {isGasDanger && (
        <div className="fixed inset-0 pointer-events-none border-[4px] border-red-500/30 animate-pulse z-50"></div>
      )}
      
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0ea5e9] rounded flex items-center justify-center text-black">
                <ShieldAlert size={20} />
              </div>
              <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white leading-none">
                Military Automation Hub
              </h1>
            </div>
            <p className="text-slate-500 font-mono text-[9px] md:text-[10px] uppercase tracking-[0.4em] flex items-center gap-2">
              <span className="text-[#0ea5e9] font-bold">TACTICAL_NETWORK</span>
              <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
              Real-time IoT Telemetry Interface
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`bg-[#0d1117] border ${syncError ? 'border-red-500/30' : 'border-[#30363d]'} px-4 py-2 rounded-xl hidden sm:block`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`}></span>
                <p className={`text-[8px] font-black ${syncError ? 'text-red-500' : 'text-emerald-500'} uppercase tracking-widest`}>
                  {syncError ? 'Uplink Offline' : 'Uplink Active'}
                </p>
              </div>
              <p className="text-[9px] leading-tight text-slate-500 font-bold font-mono">
                Last Sync: {lastSync ? lastSync.toLocaleTimeString() : 'Never'}
              </p>
            </div>
            <button 
              onClick={fetchData}
              className="p-2.5 rounded-lg bg-slate-900 border border-[#30363d] text-slate-400 hover:text-white hover:border-[#0ea5e9]/50 transition-all"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-[#0ea5e9]' : ''} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          
          {/* LEFT & MIDDLE: Main Telemetry */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* TOP: Node Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <NodeCard 
                title="Environmental Monitoring Unit" 
                nodeId="NODE-01"
                icon={Thermometer} 
                isAlert={isGasDanger && envStatus !== 'OFFLINE'}
                timestamp={env?.timestamp}
                status={envStatus}
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Temperature</p>
                      <p className="text-2xl font-mono font-bold text-white">{env?.temperature ?? 'Waiting for data...'}<span className="text-xs text-slate-500 ml-1">°C</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Humidity</p>
                      <p className="text-xl font-mono font-bold text-slate-300">{env?.humidity ?? 'Waiting for data...'}<span className="text-xs text-slate-500 ml-1">%</span></p>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg border ${isGasDanger ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-900/50 border-slate-800'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black text-slate-500 uppercase">MQ135 Gas</span>
                      <StatusBadge status={isGasDanger ? 'Danger' : 'Safe'} />
                    </div>
                    <p className={`text-lg font-mono font-bold mt-1 ${isGasDanger ? 'text-red-500' : 'text-emerald-500'}`}>
                      {env?.mq135_ppm ?? 'Waiting for data...'} <span className="text-[10px] uppercase">ppm</span>
                    </p>
                  </div>
                </div>
              </NodeCard>

              <NodeCard 
                title="Human Vitals Detection Unit" 
                nodeId="NODE-02"
                icon={HeartPulse} 
                isHighlighted={isHumanDetected && vitalsStatus !== 'OFFLINE'}
                timestamp={vitals?.timestamp}
                status={vitalsStatus}
              >
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                      <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Heart Rate</p>
                      <p className="text-lg font-mono font-bold text-red-500 flex items-center gap-1">
                        {vitals?.heart_rate ?? 'Waiting for data...'} <span className="text-[8px] text-slate-600">BPM</span>
                      </p>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                      <p className="text-[7px] font-black text-slate-500 uppercase mb-1">Breath Rate</p>
                      <p className="text-lg font-mono font-bold text-[#0ea5e9] flex items-center gap-1">
                        {vitals?.breath_rate ?? 'Waiting for data...'} <span className="text-[8px] text-slate-600">RPM</span>
                      </p>
                    </div>
                  </div>
                  <div className={`p-2 rounded-lg border ${isHumanDetected ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-900/50 border-slate-800'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black text-slate-500 uppercase">Presence</span>
                      <StatusBadge status={isHumanDetected ? 'Detected' : 'Clear'} />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                        <Navigation size={8} /> {vitals?.distance_m ?? 'Waiting for data...'}m
                      </p>
                      <p className="text-[9px] font-mono text-slate-400">
                        {vitals?.move_speed_cm ?? 'Waiting for data...'} cm/s
                      </p>
                    </div>
                  </div>
                </div>
              </NodeCard>

              <NodeCard 
                title="RFID Access Control Unit" 
                nodeId="NODE-03"
                icon={Tag} 
                isAlert={rfid?.access === 'DENIED' && rfidStatus !== 'OFFLINE'}
                isHighlighted={rfid?.access === 'GRANTED' && rfidStatus !== 'OFFLINE'}
                timestamp={rfid?.timestamp}
                status={rfidStatus}
              >
                <div className="space-y-3">
                  {!rfid || rfidStatus === 'OFFLINE' ? (
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center h-[90px] text-center">
                      <Lock size={20} className="text-slate-700 mb-2" />
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        {rfidStatus === 'OFFLINE' ? 'NO RECENT SCAN' : 'Waiting for RFID scan...'}
                      </p>
                    </div>
                  ) : (
                    <div className={`p-3 rounded-xl border flex flex-col items-center justify-center h-[90px] text-center transition-all ${
                      rfid.access === 'GRANTED' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20 animate-pulse'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                        rfid.access === 'GRANTED' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {rfid.access === 'GRANTED' ? <Zap size={16} /> : <Lock size={16} />}
                      </div>
                      <p className="text-[10px] font-mono font-bold text-white tracking-widest uppercase">{rfid.uid}</p>
                      <p className={`text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${
                        rfid.access === 'GRANTED' ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {rfid.access === 'GRANTED' ? 'ACCESS_GRANTED' : 'ACCESS_DENIED'}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8px] font-black text-slate-600 uppercase">Last Status</span>
                    <StatusBadge status={rfid && rfidStatus !== 'OFFLINE' ? (rfid.access === 'GRANTED' ? 'Authorized' : 'Denied') : 'Clear'} />
                  </div>
                </div>
              </NodeCard>

              <NodeCard 
                title="LPDA Drone Defense Unit" 
                nodeId="NODE-04"
                icon={Radio} 
              >
                <div className="space-y-3">
                  <div className="bg-slate-900/50 rounded-xl border border-slate-800 h-[90px] overflow-hidden relative group">
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Camera size={20} className="text-slate-700" />
                    </div>
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
                      <span className="text-[7px] font-black text-slate-600 uppercase">No Feed</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8px] font-black text-slate-600 uppercase">Airspace</span>
                    <StatusBadge status="Clear" />
                  </div>
                </div>
              </NodeCard>
            </div>

            {/* MIDDLE: Graphs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartContainer title="Environmental Telemetry (Temp & Gas)" icon={Thermometer}>
                {history.length < 2 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono text-[10px] gap-2">
                    <RefreshCw size={16} className="animate-spin" />
                    COLLECTING TELEMETRY DATA ({history.length}/2)...
                  </div>
                ) : (
                  <div className={`w-full h-full transition-opacity duration-500 ${envStatus === 'OFFLINE' ? 'opacity-30 grayscale' : 'opacity-100'}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          stroke="#4b5563" 
                          fontSize={8} 
                          tickLine={false} 
                          axisLine={false}
                          minTickGap={30}
                        />
                        <YAxis stroke="#4b5563" fontSize={8} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', fontSize: '10px' }}
                          itemStyle={{ padding: '2px 0' }}
                        />
                        <Area type="monotone" dataKey="temp" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2} name="Temp (°C)" isAnimationActive={false} />
                        <Area type="monotone" dataKey="gas" stroke="#ef4444" fillOpacity={1} fill="url(#colorGas)" strokeWidth={2} name="Gas (ppm)" isAnimationActive={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                    {envStatus === 'OFFLINE' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="bg-slate-900/80 border border-slate-700 px-3 py-1 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Sensor Offline - Data Paused
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </ChartContainer>

              <ChartContainer title="Human Vitals Telemetry (Heart & Breath)" icon={HeartPulse}>
                {history.length < 2 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono text-[10px] gap-2">
                    <RefreshCw size={16} className="animate-spin" />
                    COLLECTING TELEMETRY DATA ({history.length}/2)...
                  </div>
                ) : (
                  <div className={`w-full h-full transition-opacity duration-500 ${vitalsStatus === 'OFFLINE' ? 'opacity-30 grayscale' : 'opacity-100'}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                        <XAxis 
                          dataKey="time" 
                          stroke="#4b5563" 
                          fontSize={8} 
                          tickLine={false} 
                          axisLine={false}
                          minTickGap={30}
                        />
                        <YAxis stroke="#4b5563" fontSize={8} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', fontSize: '10px' }}
                        />
                        <Line type="monotone" dataKey="heart" stroke="#ef4444" strokeWidth={2} dot={false} name="Heart (BPM)" isAnimationActive={false} />
                        <Line type="monotone" dataKey="breath" stroke="#10b981" strokeWidth={2} dot={false} name="Breath (RPM)" isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                    {vitalsStatus === 'OFFLINE' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="bg-slate-900/80 border border-slate-700 px-3 py-1 rounded-full text-[8px] font-black text-slate-400 uppercase tracking-widest">
                          Sensor Offline - Data Paused
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </ChartContainer>
            </div>

            {/* BOTTOM: System Alerts */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active System Alerts</h3>
                </div>
                <span className="text-[8px] font-mono text-slate-600 uppercase">Diagnostics: Normal</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-3 rounded-xl border ${isGasDanger ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-900/30 border-slate-800'}`}>
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Air Quality</p>
                  <p className={`text-xs font-bold ${isGasDanger ? 'text-red-500' : 'text-emerald-500'}`}>
                    {isGasDanger ? 'CRITICAL: HIGH GAS' : 'ATMOSPHERE STABLE'}
                  </p>
                </div>
                <div className={`p-3 rounded-xl border ${isHumanDetected ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900/30 border-slate-800'}`}>
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Security Perimeter</p>
                  <p className={`text-xs font-bold ${isHumanDetected ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {isHumanDetected ? 'WARNING: HUMAN DETECTED' : 'PERIMETER SECURE'}
                  </p>
                </div>
                <div className="p-3 rounded-xl border bg-slate-900/30 border-slate-800">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Network Integrity</p>
                  <p className="text-xs font-bold text-emerald-500 uppercase">Uplink Synchronized</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Logs & Events */}
          <div className="space-y-6">
            <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl flex flex-col h-full max-h-[calc(100vh-160px)]">
              <div className="p-5 border-b border-[#30363d] flex justify-between items-center bg-slate-900/20">
                <div className="flex items-center gap-2">
                  <Scan size={14} className="text-[#0ea5e9]" />
                  <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Tactical Logs</h3>
                </div>
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {logs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50 py-20">
                    <Clock size={32} className="mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Waiting for events...</p>
                  </div>
                )}
                {logs.map((log) => (
                  <div key={log.id} className="bg-[#010409] border border-[#30363d]/50 rounded-xl p-3 relative overflow-hidden group hover:border-[#0ea5e9]/30 transition-colors">
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                      log.status === 'danger' ? 'bg-red-500' : 
                      log.status === 'warning' ? 'bg-amber-500' : 
                      log.status === 'success' ? 'bg-emerald-500' : 'bg-[#0ea5e9]'
                    }`}></div>
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[8px] font-black uppercase tracking-widest ${
                        log.status === 'danger' ? 'text-red-500' : 
                        log.status === 'warning' ? 'text-amber-500' : 'text-[#0ea5e9]'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-[8px] font-mono text-slate-600">{log.timestamp}</span>
                    </div>
                    <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
                      {log.message}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="p-4 border-t border-[#30363d] bg-slate-900/10">
                <div className="flex justify-between items-center text-[8px] font-black text-slate-600 uppercase tracking-widest">
                  <span>Log Buffer</span>
                  <span>{logs.length}/20 Entries</span>
                </div>
                <div className="w-full h-1 bg-slate-900 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-[#0ea5e9] transition-all duration-500" style={{ width: `${(logs.length / 20) * 100}%` }}></div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-[#30363d] space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-slate-600">
                  <ShieldAlert size={12} />
                  <span className="text-[9px] font-bold uppercase tracking-widest">AeroLink Tactical Systems</span>
              </div>
              <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
              <p className="text-[9px] font-mono text-slate-500 uppercase">
                System Ver: 4.2.0-STABLE
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                  {syncError ? 'Backend Disconnected' : 'Backend Connected'}
                </span>
              </div>
              <p className="text-[8px] font-black text-slate-800 uppercase tracking-[0.4em]">
                CONFIDENTIAL // INTERNAL USE ONLY
              </p>
            </div>
          </div>

          {/* Data Debugger Panel */}
          <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-[#0ea5e9]" />
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Telemetry Debugger</h3>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[8px] font-mono text-slate-600 uppercase">Buffer: {history.length}/20</span>
                <span className={`text-[8px] font-mono uppercase ${syncError ? 'text-red-500' : 'text-emerald-500'}`}>
                  {syncError ? 'Sync Error' : 'Sync OK'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                <p className="text-[7px] font-black text-slate-500 uppercase mb-2">Latest Raw Entry</p>
                <div className="text-[9px] font-mono text-emerald-500/70 overflow-x-auto">
                  {history.length > 0 ? (
                    <pre>{JSON.stringify(history[history.length - 1], null, 2)}</pre>
                  ) : (
                    'Waiting for first data point...'
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800 flex flex-col justify-center">
                  <p className="text-[7px] font-black text-slate-500 uppercase">History Count</p>
                  <p className="text-xl font-mono font-bold text-white">{history.length}</p>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800 flex flex-col justify-center">
                  <p className="text-[7px] font-black text-slate-500 uppercase">Last Temp</p>
                  <p className="text-xl font-mono font-bold text-[#0ea5e9]">
                    {history.length > 0 ? history[history.length - 1].temp : '--'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #30363d;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #0ea5e9;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default App;



