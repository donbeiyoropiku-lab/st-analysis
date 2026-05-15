import React, { useState, useRef, useMemo } from 'react';
import { 
  PlusCircle, MapPin, BarChart2, List, Trash2, Crosshair, PlayCircle, Download, TrendingUp, PieChart as PieChartIcon, Settings
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

// 初期データ構造
const INITIAL_STATE = {
  matchName: "",
  points: [],
  currentGame: { sideA: 0, sideB: 0 },
  matchScore: { sideA: 0, sideB: 0 },
  matchConfig: {
    playerNames: ["自陣 後衛", "自陣 前衛", "相手 後衛", "相手 前衛"],
    targetGames: 7
  }
};

const PLAYER_CONFIG = {
  meBack: { label: '自後', color: '#2563eb', bg: 'bg-blue-600', group: 'me' },
  meFront: { label: '自前', color: '#60a5fa', bg: 'bg-blue-400', group: 'me' },
  oppBack: { label: '相後', color: '#dc2626', bg: 'bg-red-600', group: 'opp' },
  oppFront: { label: '相前', color: '#f87171', bg: 'bg-red-400', group: 'opp' },
};

// --- コート設定 ---
const COURT_CONTAINER_ASPECT = '3/4';
// コートの内側（ベースラインからベースライン）の領域 (%)
const C_TOP = 10;
const C_BOTTOM = 90;
const C_HEIGHT = 80;
const C_WIDTH = 50;
const C_LEFT = 25;

const SHOT_TYPES = [
  { id: 'serve_1st', label: '1stサーブ' },
  { id: 'serve_2nd', label: '2ndサーブ' },
  { id: 'return', label: 'レシーブ' },
  { id: 'shoot_strong', label: 'シュート(強)' },
  { id: 'shoot_weak', label: 'シュート(弱)' },
  { id: 'lob', label: 'ロブ/中ロブ' },
  { id: 'volley_poach', label: 'ポーチボレー' },
  { id: 'volley_front', label: '正面ボレー' },
  { id: 'smash', label: 'スマッシュ' },
  { id: 'drop', label: 'ドロップ/ツイスト' }
];

const RESULT_TYPES = [
  { id: 'winner', label: '得点(ウィナー)', type: 'win' },
  { id: 'error_forced', label: '相手のミス', type: 'win' },
  { id: 'error_unforced', label: '自陣のミス', type: 'loss' },
  { id: 'missed_return', label: 'レシーブミス', type: 'loss' },
  { id: 'double_fault', label: 'ダブルフォルト', type: 'loss' }
];

const CourtMap = ({ 
  interactive = false, positions = {}, ballPosition = null, onUpdatePosition = null, heatmapData = null, selectedGrid = null, onSelectGrid = null
}) => {
  const courtRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  const handlePointerDown = (e, id) => {
    if (!interactive) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingId(id);
  };

  const handlePointerMove = (e) => {
    if (!interactive || !draggingId) return;
    const rect = courtRef.current.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    onUpdatePosition(draggingId, { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  const handlePointerUp = (e) => {
    if (!interactive || !draggingId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggingId(null);
  };

  const renderGrids = () => {
    const grids = [];
    for (let i = 0; i < 36; i++) {
      const row = Math.floor(i / 6);
      const col = i % 6;
      const heat = heatmapData ? heatmapData[i] || 0 : 0;
      const isSelected = selectedGrid === i;
      grids.push(
        <div key={`grid-${i}`} onClick={(e) => { if (!interactive && onSelectGrid) { e.stopPropagation(); onSelectGrid(i); } }}
          className={`absolute border border-white/30 transition-all duration-300 z-10 ${isSelected ? 'bg-yellow-400/60 border-yellow-400/90 border-[2px]' : ''} ${!interactive ? 'cursor-pointer hover:bg-white/30' : ''}`}
          style={{ top: `${row * (100/6)}%`, left: `${col * (100/6)}%`, width: `${100/6}%`, height: `${100/6}%`, backgroundColor: heat > 0 && !isSelected ? `rgba(239, 68, 68, ${Math.min(0.8, heat * 0.15)})` : undefined }}
        />
      );
    }
    return grids;
  };

  return (
    <div ref={courtRef} className={`relative w-full bg-[#1b5e20] rounded-lg shadow-inner overflow-hidden ${interactive ? 'touch-none' : ''}`} style={{ aspectRatio: COURT_CONTAINER_ASPECT }} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
      <div className="absolute border-[3px] border-white bg-[#2e7d32]" style={{ left: `${C_LEFT}%`, width: `${C_WIDTH}%`, top: `${C_TOP}%`, height: `${C_HEIGHT}%` }}>
        <div className="absolute inset-0 z-10">{renderGrids()}</div>
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute border-l-[3px] border-r-[3px] border-white" style={{ left: '12.5%', right: '12.5%', top: 0, bottom: 0 }} />
          <div className="absolute border-t-[3px] border-b-[3px] border-white" style={{ left: '12.5%', right: '12.5%', top: '23.1%', bottom: '23.1%' }} />
          <div className="absolute border-l-[3px] border-white" style={{ left: '50%', top: '23.1%', bottom: '23.1%' }} />
        </div>
        <div className="absolute h-[4px] bg-slate-200 z-30 pointer-events-none" style={{ top: '50%', left: '-5%', right: '-5%', transform: 'translateY(-50%)' }} />
      </div>
      {Object.entries(positions).map(([player, pos]) => (
        <div key={player} onPointerDown={(e) => handlePointerDown(e, player)} className={`absolute w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white flex items-center justify-center text-[10px] md:text-xs font-bold text-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 z-40 transition-transform ${interactive ? 'cursor-grab active:cursor-grabbing hover:scale-110' : ''} ${PLAYER_CONFIG[player]?.bg || 'bg-gray-500'}`} style={{ left: `${pos.x}%`, top: `${pos.y}%` }}>
          {PLAYER_CONFIG[player]?.label || '?'}
        </div>
      ))}
      {ballPosition && (
        <div onPointerDown={(e) => handlePointerDown(e, 'ball')} className={`absolute w-6 h-6 rounded-full border-2 border-slate-800 bg-yellow-300 flex items-center justify-center shadow-[0_0_12px_rgba(253,224,71,0.8)] transform -translate-x-1/2 -translate-y-1/2 z-50 transition-transform ${interactive ? 'cursor-grab active:cursor-grabbing hover:scale-110 animate-pulse' : ''}`} style={{ left: `${ballPosition.x}%`, top: `${ballPosition.y}%` }}>
          <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('input');
  const [data, setData] = useState(INITIAL_STATE);
  
  // コートの幅（25%〜75%）に合わせて初期位置を調整
  const [currentPoint, setCurrentPoint] = useState({
    server: 'meBack', ender: 'meFront', shotType: 'volley_poach', result: 'winner',
    ballPosition: { x: 50, y: 70 },
    positions: { meBack: { x: 50, y: 85 }, meFront: { x: 65, y: 60 }, oppBack: { x: 50, y: 15 }, oppFront: { x: 35, y: 40 } }
  });
  
  const [selectedGrid, setSelectedGrid] = useState(null);

  const handleUpdatePosition = (id, newPos) => {
    if (id === 'ball') setCurrentPoint(prev => ({ ...prev, ballPosition: newPos }));
    else setCurrentPoint(prev => ({ ...prev, positions: { ...prev.positions, [id]: newPos } }));
  };

  const addPoint = () => {
    let relX = (currentPoint.ballPosition.x - C_LEFT) / C_WIDTH;
    let relY = (currentPoint.ballPosition.y - C_TOP) / C_HEIGHT;
    let gridIndex = -1;
    if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
      gridIndex = Math.min(5, Math.floor(relY * 6)) * 6 + Math.min(5, Math.floor(relX * 6));
    }
    const isWin = RESULT_TYPES.find(r => r.id === currentPoint.result)?.type === 'win';
    const newPoint = { ...currentPoint, id: Date.now(), gridIndex, isMeScored: isWin };
    
    let newGame = { ...data.currentGame };
    isWin ? newGame.sideA++ : newGame.sideB++;
    let newMatch = { ...data.matchScore };
    if (newGame.sideA >= 4) { newMatch.sideA++; newGame = { sideA: 0, sideB: 0 }; }
    else if (newGame.sideB >= 4) { newMatch.sideB++; newGame = { sideA: 0, sideB: 0 }; }

    setData(prev => ({ ...prev, points: [...prev.points, newPoint], currentGame: newGame, matchScore: newMatch }));
  };

  const exportCSV = () => {
    const headers = ["ID", "Server", "Ender", "ShotType", "Result", "IsWin", "BallX", "BallY", "GridIndex"];
    const rows = data.points.map(p => [p.id, p.server, p.ender, p.shotType, p.result, p.isMeScored, p.ballPosition.x, p.ballPosition.y, p.gridIndex]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${data.matchName || 'match_data'}.csv`);
    link.click();
  };

  // グラフ用データ計算
  const scoreTrendData = useMemo(() => {
    let a = 0, b = 0;
    return [{ name: 'Start', 自陣: 0, 相手: 0 }, ...data.points.map((p, i) => {
      p.isMeScored ? a++ : b++;
      return { name: `P${i+1}`, 自陣: a, 相手: b };
    })];
  }, [data.points]);

  const playerStats = useMemo(() => {
    const contribution = { meBack: 0, meFront: 0 };
    const errors = { meBack: 0, meFront: 0 };
    data.points.forEach(p => {
      if (p.isMeScored && contribution[p.ender] !== undefined) contribution[p.ender]++;
      if (!p.isMeScored && errors[p.ender] !== undefined) errors[p.ender]++;
    });
    const COLORS = [PLAYER_CONFIG.meBack.color, PLAYER_CONFIG.meFront.color];
    return {
      contribution: Object.entries(contribution).map(([name, value]) => ({ name: PLAYER_CONFIG[name].label, value })),
      errors: Object.entries(errors).map(([name, value]) => ({ name: PLAYER_CONFIG[name].label, value })),
      COLORS
    };
  }, [data.points]);

  const heatmapData = useMemo(() => {
    const map = {};
    data.points.forEach(p => { if (p.gridIndex >= 0) map[p.gridIndex] = (map[p.gridIndex] || 0) + 1; });
    return map;
  }, [data.points]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20">
      <header className="bg-slate-800 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-black flex items-center gap-2"><PlayCircle className="text-emerald-400" />ST-ANALYTICS</h1>
            <div className="flex items-center gap-4 bg-slate-700/50 px-4 py-1.5 rounded-full border border-slate-600 text-sm font-bold">
              <span className="text-blue-400">{data.matchScore.sideA} <span className="text-xs">({data.currentGame.sideA})</span></span>
              <span className="text-slate-500">-</span>
              <span className="text-red-400"><span className="text-xs">({data.currentGame.sideB})</span> {data.matchScore.sideB}</span>
            </div>
          </div>
          <div className="relative">
            <input type="text" placeholder="試合名を入力 (例: A・BペアvsC・Dペア_20260514)" value={data.matchName} onChange={(e) => setData(prev => ({ ...prev, matchName: e.target.value }))}
              className="w-full bg-slate-700 border-none rounded-lg py-2 px-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 space-y-6">
        {activeTab === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h3 className="text-md font-bold mb-4 flex items-center gap-2"><MapPin size={18} className="text-emerald-600" />ポジションと着弾点</h3>
              <CourtMap interactive={true} positions={currentPoint.positions} ballPosition={currentPoint.ballPosition} onUpdatePosition={handleUpdatePosition} />
            </div>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-2 gap-4">
                {['server', 'ender'].map(key => (
                  <div key={key}>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">{key === 'server' ? 'サーバー' : '最終プレーヤー'}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(PLAYER_CONFIG).map(([id, cfg]) => (
                        <button key={id} onClick={() => setCurrentPoint(p => ({ ...p, [key]: id }))} className={`p-2 text-[10px] rounded font-bold transition-all ${currentPoint[key] === id ? `${cfg.bg} text-white` : 'bg-slate-100 text-slate-600'}`}>{cfg.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <label className="text-xs font-bold text-slate-500 mb-2 block">ショット種類</label>
                <div className="flex flex-wrap gap-2">
                  {SHOT_TYPES.map(s => <button key={s.id} onClick={() => setCurrentPoint(p => ({ ...p, shotType: s.id }))} className={`px-3 py-1 text-xs rounded-full border transition-all ${currentPoint.shotType === s.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border-slate-200'}`}>{s.label}</button>)}
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {RESULT_TYPES.map(r => <button key={r.id} onClick={() => setCurrentPoint(p => ({ ...p, result: r.id }))} className={`p-2 text-xs rounded font-bold border-2 transition-all ${currentPoint.result === r.id ? (r.type === 'win' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-transparent bg-slate-100'}`}>{r.label}</button>)}
                </div>
                <button onClick={addPoint} className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"><PlusCircle size={20}/>記録する</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Crosshair size={18} className="text-indigo-600" />ヒートマップ</h3>
                <CourtMap heatmapData={heatmapData} selectedGrid={selectedGrid} onSelectGrid={setSelectedGrid} />
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-indigo-600" />得点推移</h3>
                <div className="h-64"><ResponsiveContainer><LineChart data={scoreTrendData}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name" hide/><YAxis/><RechartsTooltip/><Legend/><Line type="stepAfter" dataKey="自陣" stroke="#2563eb" strokeWidth={3} dot={false}/><Line type="stepAfter" dataKey="相手" stroke="#dc2626" strokeWidth={3} dot={false}/></LineChart></ResponsiveContainer></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[ { title: '得点貢献 (Finish)', data: playerStats.contribution }, { title: 'ミス内訳 (Errors)', data: playerStats.errors } ].map((s, i) => (
                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
                  <h3 className="font-bold mb-2 flex items-center justify-center gap-2"><PieChartIcon size={18} className="text-indigo-600" />{s.title}</h3>
                  <div className="h-48"><ResponsiveContainer><PieChart><Pie data={s.data} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} label>{playerStats.COLORS.map((c, j) => <Cell key={j} fill={c} />)}</Pie><RechartsTooltip/><Legend/></PieChart></ResponsiveContainer></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2"><List size={18}/>ポイント履歴</h3>
              <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors"><Download size={16}/>CSV出力</button>
            </div>
            <div className="overflow-x-auto text-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500"><tr><th className="p-3">#</th><th className="p-3">結果</th><th className="p-3">サーバー</th><th className="p-3">最後</th><th className="p-3">操作</th></tr></thead>
                <tbody>
                  {data.points.slice().reverse().map((p, i) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="p-3">{data.points.length - i}</td>
                      <td className="p-3 font-bold"><span className={p.isMeScored ? 'text-blue-600' : 'text-red-600'}>{RESULT_TYPES.find(r => r.id === p.result)?.label}</span></td>
                      <td className="p-3">{PLAYER_CONFIG[p.server]?.label}</td>
                      <td className="p-3">{PLAYER_CONFIG[p.ender]?.label}</td>
                      <td className="p-3"><button onClick={() => setData(prev => ({ ...prev, points: prev.points.filter(pt => pt.id !== p.id) }))} className="text-red-400"><Trash2 size={16}/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t p-2 flex justify-around shadow-lg z-50">
        {[ { id: 'input', icon: PlusCircle, label: '入力' }, { id: 'analysis', icon: BarChart2, label: '分析' }, { id: 'history', icon: List, label: '履歴' } ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex flex-col items-center p-2 rounded-lg transition-colors ${activeTab === t.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}>
            <t.icon size={20}/><span className="text-[10px] font-bold mt-1">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}