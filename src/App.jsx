import React, { useState, useRef, useMemo } from 'react';
import { 
  PlusCircle, MapPin, BarChart2, List, Trash2, Crosshair, PlayCircle, Download, TrendingUp, PieChart as PieChartIcon, RotateCcw, Save, ArrowLeft, Trophy, Undo2
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const getInitialState = () => ({
  id: Date.now(),
  matchName: "",
  points: [],
  currentGame: { sideA: 0, sideB: 0 },
  matchScore: { sideA: 0, sideB: 0 },
  matchConfig: {
    playerNames: ["自陣 後衛", "自陣 前衛", "相手 後衛", "相手 前衛"],
    targetGames: 7
  }
});

const PLAYER_CONFIG = {
  meBack: { label: '自後', color: '#2563eb', bg: 'bg-blue-600', group: 'me' },
  meFront: { label: '自前', color: '#60a5fa', bg: 'bg-blue-400', group: 'me' },
  oppBack: { label: '相後', color: '#dc2626', bg: 'bg-red-600', group: 'opp' },
  oppFront: { label: '相前', color: '#f87171', bg: 'bg-red-400', group: 'opp' },
};

const COURT_CONTAINER_ASPECT = '3/4';
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

const PIE_COLORS = ['#3b82f6', '#ef4444'];

// スコア再計算エンジン
const applyPointsToState = (pointsArray, targetGamesVal) => {
  let gA = 0, gB = 0;
  let pA = 0, pB = 0;
  const kVal = Math.floor(targetGamesVal / 2);

  const updatedPoints = pointsArray.map(pt => {
    const scoreState = { matchScoreMe: gA, matchScoreOpp: gB, gameScoreMe: pA, gameScoreOpp: pB };
    const isFin = (gA === kVal && gB === kVal);
    const threshold = isFin ? 7 : 4;

    let nextPa = pA; let nextPb = pB;
    if (pt.isMeScored) nextPa++; else nextPb++;

    if (nextPa >= threshold && (nextPa - nextPb) >= 2) {
      gA++; pA = 0; pB = 0;
    } else if (nextPb >= threshold && (nextPb - nextPa) >= 2) {
      gB++; pA = 0; pB = 0;
    } else {
      pA = nextPa; pB = nextPb;
    }

    return { ...pt, scoreState };
  });

  return {
    points: updatedPoints,
    matchScore: { sideA: gA, sideB: gB },
    currentGame: { sideA: pA, sideB: pB }
  };
};

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
  const [data, setData] = useState(getInitialState());
  const [matchHistory, setMatchHistory] = useState([]);
  const [historyView, setHistoryView] = useState('list');
  const [selectedHistoryMatch, setSelectedHistoryMatch] = useState(null);

  const [currentPoint, setCurrentPoint] = useState({
    server: 'meBack', ender: 'meFront', shotType: 'volley_poach', result: 'winner',
    ballPosition: { x: 50, y: 70 },
    positions: { meBack: { x: 50, y: 85 }, meFront: { x: 65, y: 60 }, oppBack: { x: 50, y: 15 }, oppFront: { x: 35, y: 40 } }
  });
  
  const [selectedGrid, setSelectedGrid] = useState(null);

  const targetGames = data.matchConfig.targetGames;
  const k = Math.floor(targetGames / 2);
  const isFinalGame = (data.matchScore.sideA === k && data.matchScore.sideB === k);
  const isMatchOver = (data.matchScore.sideA > k || data.matchScore.sideB > k);

  const handleUpdatePosition = (id, newPos) => {
    if (id === 'ball') setCurrentPoint(prev => ({ ...prev, ballPosition: newPos }));
    else setCurrentPoint(prev => ({ ...prev, positions: { ...prev.positions, [id]: newPos } }));
  };

  const addPoint = () => {
    if (isMatchOver) {
      alert(`この試合はすでに決着がついています。`);
      return;
    }

    let relX = (currentPoint.ballPosition.x - C_LEFT) / C_WIDTH;
    let relY = (currentPoint.ballPosition.y - C_TOP) / C_HEIGHT;
    let gridIndex = -1;
    if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
      gridIndex = Math.min(5, Math.floor(relY * 6)) * 6 + Math.min(5, Math.floor(relX * 6));
    }
    const isWin = RESULT_TYPES.find(r => r.id === currentPoint.result)?.type === 'win';
    
    const newPoint = { 
      ...currentPoint, 
      id: Date.now(), 
      gridIndex, 
      isMeScored: isWin,
      scoreState: null
    };
    
    const newPointsArray = [...data.points, newPoint];
    const recalculated = applyPointsToState(newPointsArray, targetGames);
    setData(prev => ({ ...prev, ...recalculated }));
  };

  // 1手戻る（直前のポイントを取り消す）処理
  const handleUndoPoint = () => {
    if (data.points.length === 0) return;
    const newPointsArray = data.points.slice(0, -1);
    const recalculated = applyPointsToState(newPointsArray, targetGames);
    setData(prev => ({ ...prev, ...recalculated }));
  };

  const handleSaveAndReset = () => {
    if (data.points.length === 0 && !data.matchName) {
      setData(getInitialState());
      return;
    }
    if (window.confirm("現在の試合を履歴に保存して、新しい試合の入力を始めますか？\n（現在入力中のデータは履歴タブに格納されます）")) {
      setMatchHistory(prev => [data, ...prev]);
      setData(getInitialState());
    }
  };

  const handleResetOnly = () => {
    if (window.confirm("現在の入力データをすべて破棄してリセットしますか？\n（※元に戻せません）")) {
      setData(getInitialState());
    }
  };

  const handleDeletePoint = (matchId, pointId) => {
    if (data.id === matchId) {
      const newPointsArray = data.points.filter(pt => pt.id !== pointId);
      const recalculated = applyPointsToState(newPointsArray, data.matchConfig.targetGames);
      setData(prev => ({ ...prev, ...recalculated }));
      
      if (selectedHistoryMatch?.id === matchId) {
        setSelectedHistoryMatch(prev => ({ ...prev, ...recalculated }));
      }
    } else {
      setMatchHistory(prev => prev.map(m => {
        if (m.id === matchId) {
          const newPts = m.points.filter(pt => pt.id !== pointId);
          const rec = applyPointsToState(newPts, m.matchConfig.targetGames);
          const updatedMatch = { ...m, ...rec };
          if (selectedHistoryMatch?.id === matchId) setSelectedHistoryMatch(updatedMatch);
          return updatedMatch;
        }
        return m;
      }));
    }
  };

  const exportCSV = (targetMatch) => {
    const headers = [
      "MatchName", "TargetGames", "PointID", 
      "MatchScore_Me", "MatchScore_Opp", "GameScore_Me", "GameScore_Opp", 
      "Server", "Ender", "EnderGroup", "ShotType", "Result", "IsMeScored", 
      "BallX", "BallY", "GridIndex"
    ];
    
    const rows = targetMatch.points.map(p => [
      targetMatch.matchName || 'Unknown_Match',
      targetMatch.matchConfig.targetGames,
      p.id,
      p.scoreState.matchScoreMe,
      p.scoreState.matchScoreOpp,
      p.scoreState.gameScoreMe,
      p.scoreState.gameScoreOpp,
      p.server,
      p.ender,
      PLAYER_CONFIG[p.ender].group,
      p.shotType,
      p.result,
      p.isMeScored ? 1 : 0,
      p.ballPosition.x.toFixed(2),
      p.ballPosition.y.toFixed(2),
      p.gridIndex
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${targetMatch.matchName || 'match_data'}.csv`);
    link.click();
  };

  const heatmapData = useMemo(() => {
    const map = {};
    data.points.forEach(p => { if (p.gridIndex >= 0) map[p.gridIndex] = (map[p.gridIndex] || 0) + 1; });
    return map;
  }, [data.points]);

  const scoreTrendData = useMemo(() => {
    let a = 0, b = 0;
    return [{ name: 'Start', 自陣: 0, 相手: 0 }, ...data.points.map((p, i) => {
      p.isMeScored ? a++ : b++;
      return { name: `P${i+1}`, 自陣: a, 相手: b };
    })];
  }, [data.points]);

  const playerStats = useMemo(() => {
    const meFinish = { meBack: 0, meFront: 0 };
    const meError = { meBack: 0, meFront: 0 };
    const oppFinish = { oppBack: 0, oppFront: 0 };
    const oppError = { oppBack: 0, oppFront: 0 };

    data.points.forEach(p => {
      const group = PLAYER_CONFIG[p.ender].group;
      if (p.isMeScored) {
        if (group === 'me') meFinish[p.ender]++; 
        if (group === 'opp') oppError[p.ender]++;
      } else {
        if (group === 'me') meError[p.ender]++;
        if (group === 'opp') oppFinish[p.ender]++;
      }
    });

    const formatData = (obj) => Object.entries(obj).map(([name, value]) => ({ name: PLAYER_CONFIG[name].label, value })).filter(d => d.value > 0);

    return {
      meFinish: formatData(meFinish), meError: formatData(meError),
      oppFinish: formatData(oppFinish), oppError: formatData(oppError),
      meColors: [PLAYER_CONFIG.meBack.color, PLAYER_CONFIG.meFront.color],
      oppColors: [PLAYER_CONFIG.oppBack.color, PLAYER_CONFIG.oppFront.color]
    };
  }, [data.points]);

  const getGridStats = (gridIndex) => {
    if (gridIndex === null) return null;
    const pointsInGrid = data.points.filter(p => p.gridIndex === gridIndex);
    if (pointsInGrid.length === 0) return null;
    const winCount = pointsInGrid.filter(p => p.isMeScored).length;
    const lossCount = pointsInGrid.length - winCount;
    const shotCounts = {};
    pointsInGrid.forEach(p => {
      const label = SHOT_TYPES.find(s => s.id === p.shotType)?.label || p.shotType;
      shotCounts[label] = (shotCounts[label] || 0) + 1;
    });
    return {
      total: pointsInGrid.length, winRate: Math.round((winCount / pointsInGrid.length) * 100),
      winCount, lossCount, shotData: Object.entries(shotCounts).map(([name, value]) => ({ name, value }))
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20">
      <header className="bg-slate-800 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black flex items-center gap-2"><PlayCircle className="text-emerald-400" />ST-ANALYTICS</h1>
            </div>
            <div className="flex flex-col items-center">
              {isMatchOver && <span className="text-[10px] text-yellow-300 font-bold mb-0.5 animate-pulse bg-yellow-900/50 px-2 rounded"><Trophy size={10} className="inline mr-1" />MATCH END</span>}
              {!isMatchOver && isFinalGame && <span className="text-[10px] text-orange-400 font-bold mb-0.5 bg-orange-900/50 px-2 rounded">FINAL GAME</span>}
              <div className="flex items-center gap-3 bg-slate-700/80 px-4 py-1.5 rounded-full border border-slate-600 text-sm font-bold shadow-inner">
                <span className="text-blue-400 flex items-center gap-1">
                  <span className="text-xl">{data.matchScore.sideA}</span> <span className="text-[10px] text-slate-400">({data.currentGame.sideA})</span>
                </span>
                <span className="text-slate-500">-</span>
                <span className="text-red-400 flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">({data.currentGame.sideB})</span> <span className="text-xl">{data.matchScore.sideB}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="relative">
            <input type="text" placeholder="試合名を入力 (例: A・BペアvsC・Dペア_20260514)" value={data.matchName} onChange={(e) => setData(prev => ({ ...prev, matchName: e.target.value }))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg py-2 px-4 text-sm focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 space-y-6">
        {activeTab === 'input' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-bold flex items-center gap-2"><MapPin size={18} className="text-emerald-600" />配置と着弾点</h3>
                <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                  {[5, 7, 9].map(num => (
                    <button key={num} onClick={() => setData(prev => ({ ...prev, matchConfig: { ...prev.matchConfig, targetGames: num } }))}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${data.matchConfig.targetGames === num ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      {num}G
                    </button>
                  ))}
                </div>
              </div>
              <div className="max-w-sm mx-auto">
                <CourtMap interactive={true} positions={currentPoint.positions} ballPosition={currentPoint.ballPosition} onUpdatePosition={handleUpdatePosition} />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-2 gap-4">
                {['server', 'ender'].map(key => (
                  <div key={key}>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">{key === 'server' ? 'サーバー' : '最終プレーヤー'}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(PLAYER_CONFIG).map(([id, cfg]) => (
                        <button key={id} onClick={() => setCurrentPoint(p => ({ ...p, [key]: id }))} className={`p-2 text-[10px] rounded font-bold transition-all ${currentPoint[key] === id ? `${cfg.bg} text-white shadow-sm` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cfg.label}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <label className="text-xs font-bold text-slate-500 mb-2 block">ショット種類</label>
                <div className="flex flex-wrap gap-2">
                  {SHOT_TYPES.map(s => <button key={s.id} onClick={() => setCurrentPoint(p => ({ ...p, shotType: s.id }))} className={`px-3 py-1 text-xs rounded-full border transition-all ${currentPoint.shotType === s.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{s.label}</button>)}
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {RESULT_TYPES.map(r => <button key={r.id} onClick={() => setCurrentPoint(p => ({ ...p, result: r.id }))} className={`p-2 text-xs rounded font-bold border-2 transition-all ${currentPoint.result === r.id ? (r.type === 'win' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-transparent bg-slate-100 hover:bg-slate-200'}`}>{r.label}</button>)}
                </div>
                
                <button onClick={addPoint} disabled={isMatchOver} className={`w-full py-4 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all text-lg ${isMatchOver ? 'bg-slate-400 cursor-not-allowed opacity-50' : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95'}`}>
                  <PlusCircle size={24}/>記録する
                </button>
                
                <div className="flex justify-end mt-2">
                  <button onClick={handleUndoPoint} disabled={data.points.length === 0} className={`flex items-center gap-1 text-sm font-bold transition-colors ${data.points.length === 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-500 hover:text-red-500 active:scale-95'}`}>
                    <Undo2 size={16} /> 1手戻る
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleSaveAndReset} className="flex-1 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 hover:bg-indigo-100 transition-colors">
                  <Save size={18}/>履歴に保存して次へ
                </button>
                <button onClick={handleResetOnly} className="flex-1 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 active:scale-95 hover:bg-red-100 transition-colors">
                  <RotateCcw size={18}/>破棄してリセット
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Crosshair size={18} className="text-indigo-600" />ヒートマップ (タップして詳細表示)</h3>
                <div className="max-w-sm mx-auto">
                  <CourtMap heatmapData={heatmapData} selectedGrid={selectedGrid} onSelectGrid={setSelectedGrid} />
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart2 size={18} className="text-indigo-600" />選択エリアの詳細分析</h3>
                {getGridStats(selectedGrid) ? (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
                      <div>
                        <p className="text-sm text-slate-500 font-medium">エリアへの球数</p>
                        <p className="text-2xl font-bold text-slate-800">{getGridStats(selectedGrid).total}<span className="text-sm font-normal ml-1">球</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500 font-medium">自陣得点率</p>
                        <p className={`text-2xl font-bold ${getGridStats(selectedGrid).winRate >= 50 ? 'text-blue-600' : 'text-red-600'}`}>
                          {getGridStats(selectedGrid).winRate}<span className="text-sm font-normal ml-1">%</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 h-48">
                      <div>
                        <p className="text-xs font-bold text-slate-500 text-center mb-1">得点 / 失点</p>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[{ name: '得点', value: getGridStats(selectedGrid).winCount }, { name: '失点', value: getGridStats(selectedGrid).lossCount }]} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={2} dataKey="value" label>
                              {[0,1].map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />)}
                            </Pie>
                            <RechartsTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 text-center mb-1">ショット種類</p>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getGridStats(selectedGrid).shotData} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} />
                            <RechartsTooltip />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-lg">
                    <Crosshair size={32} className="mb-2 opacity-30" />
                    左のコートのマスを選択してください
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-indigo-600" />試合の流れ（得点推移）</h3>
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={scoreTrendData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="name" hide/>
                    <YAxis/>
                    <RechartsTooltip/>
                    <Legend/>
                    <Line type="stepAfter" dataKey="自陣" stroke="#2563eb" strokeWidth={3} dot={false}/>
                    <Line type="stepAfter" dataKey="相手" stroke="#dc2626" strokeWidth={3} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold mb-4 flex items-center gap-2"><PieChartIcon size={18} className="text-indigo-600" />プレイヤー別 決定力・ミス分析</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[ 
                  { title: '自陣の決定打', data: playerStats.meFinish, colors: playerStats.meColors }, 
                  { title: '自陣のミス', data: playerStats.meError, colors: playerStats.meColors },
                  { title: '相手の決定打', data: playerStats.oppFinish, colors: playerStats.oppColors }, 
                  { title: '相手のミス', data: playerStats.oppError, colors: playerStats.oppColors } 
                ].map((s, i) => (
                  <div key={i} className="flex flex-col items-center p-2 bg-slate-50 rounded-lg">
                    <h4 className="text-[10px] font-bold text-slate-600 mb-2">{s.title}</h4>
                    <div className="w-full h-32">
                      {s.data.length > 0 ? (
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie data={s.data} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={40} label={(entry) => entry.name} labelLine={false} style={{fontSize: '10px'}}>
                              {s.data.map((entry, j) => <Cell key={j} fill={s.colors[j % s.colors.length]} />)}
                            </Pie>
                            <RechartsTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">データなし</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          historyView === 'list' ? (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold flex items-center gap-2 mb-4"><List size={18}/>試合履歴</h3>
              {(data.points.length > 0 || data.matchName || matchHistory.length > 0) ? (
                <div className="overflow-x-auto text-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 border-b">
                      <tr><th className="p-3">状態</th><th className="p-3">試合名</th><th className="p-3">スコア</th><th className="p-3">操作</th></tr>
                    </thead>
                    <tbody>
                      {[(data.points.length > 0 || data.matchName) ? { ...data, isOngoing: true } : null, ...matchHistory].filter(Boolean).map((m) => (
                        <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-3">
                            {m.isOngoing 
                              ? <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold">入力中</span> 
                              : <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">保存済</span>}
                          </td>
                          <td className="p-3 font-medium">{m.matchName || '未名称の試合'} <span className="text-[10px] text-slate-400 ml-1">({m.matchConfig.targetGames}G)</span></td>
                          <td className="p-3 font-mono">{m.matchScore.sideA} - {m.matchScore.sideB}</td>
                          <td className="p-3">
                            <button onClick={() => { setSelectedHistoryMatch(m); setHistoryView('points'); }} className="text-indigo-600 hover:text-indigo-800 font-bold px-3 py-1 bg-indigo-50 rounded-lg whitespace-nowrap">
                              詳細・出力
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center text-slate-400 py-8 text-sm">記録された試合はありません</p>
              )}
            </div>
          ) : (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-6">
                <button onClick={() => setHistoryView('list')} className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold text-sm bg-slate-100 px-3 py-1.5 rounded-lg transition-colors">
                  <ArrowLeft size={16}/> 試合一覧に戻る
                </button>
                <button onClick={() => exportCSV(selectedHistoryMatch)} className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors">
                  <Download size={16}/> CSV出力
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-indigo-900">{selectedHistoryMatch.matchName || '未名称の試合'}</h4>
                  <p className="text-xs text-indigo-700 mt-1">
                    {selectedHistoryMatch.matchConfig.targetGames}ゲームマッチ / 総ポイント数: {selectedHistoryMatch.points.length} pts
                  </p>
                </div>
                <div className="text-xl font-mono font-bold text-indigo-900">
                  {selectedHistoryMatch.matchScore.sideA} - {selectedHistoryMatch.matchScore.sideB}
                </div>
              </div>

              {selectedHistoryMatch.points.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">ポイントの記録がありません</p>
              ) : (
                <div className="overflow-x-auto text-sm">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr><th className="p-3">#</th><th className="p-3">スコア</th><th className="p-3">結果</th><th className="p-3">最後</th><th className="p-3 text-center">操作</th></tr>
                    </thead>
                    <tbody>
                      {selectedHistoryMatch.points.slice().reverse().map((p, i) => (
                        <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="p-3 text-xs text-slate-400">{selectedHistoryMatch.points.length - i}</td>
                          <td className="p-3 font-mono text-xs">{p.scoreState.gameScoreMe}-{p.scoreState.gameScoreOpp}</td>
                          <td className="p-3 font-bold"><span className={p.isMeScored ? 'text-blue-600' : 'text-red-600'}>{RESULT_TYPES.find(r => r.id === p.result)?.label}</span></td>
                          <td className="p-3 text-xs">{PLAYER_CONFIG[p.ender]?.label}</td>
                          <td className="p-3 text-center">
                            <button onClick={() => handleDeletePoint(selectedHistoryMatch.id, p.id)} className="text-red-400 p-1.5 hover:bg-red-50 hover:text-red-600 rounded transition-colors" title="このポイントを削除（再計算されます）">
                              <Trash2 size={16}/>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        )}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t p-2 flex justify-around shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50 pb-safe">
        {[ { id: 'input', icon: PlusCircle, label: '入力' }, { id: 'analysis', icon: BarChart2, label: '分析' }, { id: 'history', icon: List, label: '履歴' } ].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); if(t.id === 'history') setHistoryView('list'); }} className={`flex flex-col items-center p-2 rounded-lg transition-colors flex-1 ${activeTab === t.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
            <t.icon size={20}/><span className="text-[10px] font-bold mt-1">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}