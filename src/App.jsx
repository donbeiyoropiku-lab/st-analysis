import React, { useState, useRef, useMemo } from 'react';
import {
  PlusCircle,
  MapPin,
  BarChart2,
  List,
  Trash2,
  Crosshair,
  
  PlayCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// 初期データ構造
const INITIAL_STATE = {
  points: [],
  currentGame: { sideA: 0, sideB: 0 },
  matchScore: { sideA: 0, sideB: 0 },
  matchConfig: {
    playerNames: ['自陣 後衛', '自陣 前衛', '相手 後衛', '相手 前衛'],
    targetGames: 7,
  },
};

// プレイヤー識別子と表示設定
const PLAYER_CONFIG = {
  meBack: { label: '自後', color: 'bg-blue-600', group: 'me' },
  meFront: { label: '自前', color: 'bg-blue-400', group: 'me' },
  oppBack: { label: '相後', color: 'bg-red-600', group: 'opp' },
  oppFront: { label: '相前', color: 'bg-red-400', group: 'opp' },
};

// --- コート設定 ---
const COURT_CONTAINER_ASPECT = '3/4';
// コートの内側（ベースラインからベースライン）の領域 (%)
const C_TOP = 10;
const C_BOTTOM = 90;
const C_HEIGHT = 80;
const C_WIDTH = 50;
const C_LEFT = 25;

// 各種ショット
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
  { id: 'drop', label: 'ドロップ/ツイスト' },
];

// 結果タイプ
const RESULT_TYPES = [
  { id: 'winner', label: '得点(ウィナー)', type: 'win' },
  { id: 'error_forced', label: '相手のミス', type: 'win' },
  { id: 'error_unforced', label: '自陣のミス', type: 'loss' },
  { id: 'missed_return', label: 'レシーブミス', type: 'loss' },
  { id: 'double_fault', label: 'ダブルフォルト', type: 'loss' },
];

const CourtMap = ({
  interactive = false,
  positions = {},
  ballPosition = null,
  onUpdatePosition = null,
  heatmapData = null,
  selectedGrid = null,
  onSelectGrid = null,
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
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    onUpdatePosition(draggingId, { x, y });
  };

  const handlePointerUp = (e) => {
    if (!interactive || !draggingId) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDraggingId(null);
  };

  // 36分割(6x6)のグリッド描画 (コート内のみ)
  const renderGrids = () => {
    const grids = [];
    for (let i = 0; i < 36; i++) {
      const row = Math.floor(i / 6);
      const col = i % 6;
      const heat = heatmapData ? heatmapData[i] || 0 : 0;
      const isSelected = selectedGrid === i;

      grids.push(
        <div
          key={`grid-${i}`}
          onClick={(e) => {
            if (!interactive && onSelectGrid) {
              e.stopPropagation();
              onSelectGrid(i);
            }
          }}
          className={`absolute border border-white/30 transition-all duration-300 z-10 
            ${
              isSelected
                ? 'bg-yellow-400/60 border-yellow-400/90 border-[2px]'
                : ''
            } 
            ${!interactive ? 'cursor-pointer hover:bg-white/30' : ''}`}
          style={{
            top: `${row * (100 / 6)}%`,
            left: `${col * (100 / 6)}%`,
            width: `${100 / 6}%`,
            height: `${100 / 6}%`,
            backgroundColor:
              heat > 0 && !isSelected
                ? `rgba(239, 68, 68, ${Math.min(0.8, heat * 0.15)})`
                : undefined,
          }}
        />
      );
    }
    return grids;
  };

  return (
    <div
      ref={courtRef}
      className={`relative w-full bg-[#1b5e20] rounded-lg shadow-inner overflow-hidden ${
        interactive ? 'touch-none' : ''
      }`}
      style={{ aspectRatio: COURT_CONTAINER_ASPECT }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* コート内側 (24:11の比率になる領域) */}
      <div
        className="absolute border-[3px] border-white bg-[#2e7d32]"
        style={{
          left: `${C_LEFT}%`,
          width: `${C_WIDTH}%`,
          top: `${C_TOP}%`,
          height: `${C_HEIGHT}%`,
        }}
      >
        {/* 36分割グリッド */}
        <div className="absolute inset-0 z-10">{renderGrids()}</div>

        {/* コートの太線ライン */}
        <div className="absolute inset-0 pointer-events-none z-20">
          {/* シングルスサイドライン */}
          <div
            className="absolute border-l-[3px] border-r-[3px] border-white"
            style={{ left: '12.5%', right: '12.5%', top: 0, bottom: 0 }}
          />

          {/* サービスライン */}
          <div
            className="absolute border-t-[3px] border-b-[3px] border-white"
            style={{
              left: '12.5%',
              right: '12.5%',
              top: '23.1%',
              bottom: '23.1%',
            }}
          />

          {/* センターライン */}
          <div
            className="absolute border-l-[3px] border-white"
            style={{ left: '50%', top: '23.1%', bottom: '23.1%' }}
          />
        </div>

        {/* センターネット */}
        <div
          className="absolute h-[4px] bg-slate-200 z-30 pointer-events-none"
          style={{
            top: '50%',
            left: '-5%',
            right: '-5%',
            transform: 'translateY(-50%)',
          }}
        >
          <div className="absolute w-2 h-2 rounded-full bg-slate-300 -left-1 top-1/2 -translate-y-1/2 shadow-sm" />
          <div className="absolute w-2 h-2 rounded-full bg-slate-300 -right-1 top-1/2 -translate-y-1/2 shadow-sm" />
        </div>
      </div>

      {/* プレイヤー配置 */}
      {Object.entries(positions).map(([player, pos]) => (
        <div
          key={player}
          onPointerDown={(e) => handlePointerDown(e, player)}
          className={`absolute w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white flex items-center justify-center text-[10px] md:text-xs font-bold text-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 z-40 transition-transform ${
            interactive
              ? 'cursor-grab active:cursor-grabbing hover:scale-110'
              : ''
          } ${PLAYER_CONFIG[player]?.color || 'bg-gray-500'}`}
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
        >
          {PLAYER_CONFIG[player]?.label || '?'}
        </div>
      ))}

      {/* ボール着弾点 */}
      {ballPosition && (
        <div
          onPointerDown={(e) => handlePointerDown(e, 'ball')}
          className={`absolute w-6 h-6 rounded-full border-2 border-slate-800 bg-yellow-300 flex items-center justify-center shadow-[0_0_12px_rgba(253,224,71,0.8)] transform -translate-x-1/2 -translate-y-1/2 z-50 transition-transform ${
            interactive
              ? 'cursor-grab active:cursor-grabbing hover:scale-110 animate-pulse'
              : ''
          }`}
          style={{ left: `${ballPosition.x}%`, top: `${ballPosition.y}%` }}
        >
          <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState('input');
  const [data, setData] = useState(INITIAL_STATE);

  const [currentPoint, setCurrentPoint] = useState({
    server: 'meBack',
    ender: 'meFront',
    shotType: 'volley_poach',
    result: 'winner',
    ballPosition: { x: 50, y: 70 },
    positions: {
      meBack: { x: 50, y: 85 },
      meFront: { x: C_LEFT + C_WIDTH + 5, y: 60 },
      oppBack: { x: 50, y: 15 },
      oppFront: { x: C_LEFT - 5, y: 40 },
    },
  });

  const [selectedGrid, setSelectedGrid] = useState(null);

  const handleUpdatePosition = (id, newPos) => {
    if (id === 'ball') {
      setCurrentPoint((prev) => ({ ...prev, ballPosition: newPos }));
    } else {
      setCurrentPoint((prev) => ({
        ...prev,
        positions: { ...prev.positions, [id]: newPos },
      }));
    }
  };

  const addPoint = () => {
    let relX = (currentPoint.ballPosition.x - C_LEFT) / C_WIDTH;
    let relY = (currentPoint.ballPosition.y - C_TOP) / C_HEIGHT;

    let gridIndex = -1;
    if (relX >= 0 && relX <= 1 && relY >= 0 && relY <= 1) {
      const col = Math.floor(relX * 6);
      const row = Math.floor(relY * 6);
      const safeCol = Math.min(5, Math.max(0, col));
      const safeRow = Math.min(5, Math.max(0, row));
      gridIndex = safeRow * 6 + safeCol;
    }

    const newPoint = {
      ...currentPoint,
      id: Date.now(),
      gridIndex,
      isMeScored:
        RESULT_TYPES.find((r) => r.id === currentPoint.result)?.type === 'win',
    };

    const newCurrentGame = { ...data.currentGame };
    if (newPoint.isMeScored) {
      newCurrentGame.sideA += 1;
    } else {
      newCurrentGame.sideB += 1;
    }

    let newMatchScore = { ...data.matchScore };
    if (newCurrentGame.sideA >= 4) {
      newMatchScore.sideA += 1;
      newCurrentGame.sideA = 0;
      newCurrentGame.sideB = 0;
    } else if (newCurrentGame.sideB >= 4) {
      newMatchScore.sideB += 1;
      newCurrentGame.sideA = 0;
      newCurrentGame.sideB = 0;
    }

    setData((prev) => ({
      ...prev,
      points: [...prev.points, newPoint],
      currentGame: newCurrentGame,
      matchScore: newMatchScore,
    }));
  };

  const deletePoint = (id) => {
    setData((prev) => ({
      ...prev,
      points: prev.points.filter((p) => p.id !== id),
    }));
  };

  const heatmapData = useMemo(() => {
    const map = {};
    data.points.forEach((p) => {
      if (p.gridIndex >= 0) {
        map[p.gridIndex] = (map[p.gridIndex] || 0) + 1;
      }
    });
    return map;
  }, [data.points]);

  const getGridStats = (gridIndex) => {
    if (gridIndex === null) return null;
    const pointsInGrid = data.points.filter((p) => p.gridIndex === gridIndex);
    if (pointsInGrid.length === 0) return null;

    const winCount = pointsInGrid.filter((p) => p.isMeScored).length;
    const lossCount = pointsInGrid.length - winCount;

    const shotCounts = {};
    pointsInGrid.forEach((p) => {
      const label =
        SHOT_TYPES.find((s) => s.id === p.shotType)?.label || p.shotType;
      shotCounts[label] = (shotCounts[label] || 0) + 1;
    });

    return {
      total: pointsInGrid.length,
      winRate: Math.round((winCount / pointsInGrid.length) * 100),
      winCount,
      lossCount,
      shotData: Object.entries(shotCounts).map(([name, value]) => ({
        name,
        value,
      })),
    };
  };

  const PIE_COLORS = ['#3b82f6', '#ef4444'];

  const renderInputTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <MapPin className="text-emerald-600" />
          ポジションと着弾点
        </h3>
        <p className="text-xs text-slate-500 mb-2">
          アイコンをドラッグして配置を再現してください
        </p>
        <div className="max-w-md mx-auto">
          <CourtMap
            interactive={true}
            positions={currentPoint.positions}
            ballPosition={currentPoint.ballPosition}
            onUpdatePosition={handleUpdatePosition}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              サーバー
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PLAYER_CONFIG).map(([id, config]) => (
                <button
                  key={`server-${id}`}
                  onClick={() =>
                    setCurrentPoint((prev) => ({ ...prev, server: id }))
                  }
                  className={`p-2 text-xs rounded-md font-medium transition-colors ${
                    currentPoint.server === id
                      ? `${config.color} text-white`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              最終プレーヤー
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(PLAYER_CONFIG).map(([id, config]) => (
                <button
                  key={`ender-${id}`}
                  onClick={() =>
                    setCurrentPoint((prev) => ({ ...prev, ender: id }))
                  }
                  className={`p-2 text-xs rounded-md font-medium transition-colors ${
                    currentPoint.ender === id
                      ? `${config.color} text-white`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            ショット種類
          </label>
          <div className="flex flex-wrap gap-2">
            {SHOT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() =>
                  setCurrentPoint((prev) => ({ ...prev, shotType: type.id }))
                }
                className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                  currentPoint.shotType === type.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            結果
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {RESULT_TYPES.map((res) => (
              <button
                key={res.id}
                onClick={() =>
                  setCurrentPoint((prev) => ({ ...prev, result: res.id }))
                }
                className={`p-2 text-sm rounded-lg font-medium border-2 transition-all ${
                  currentPoint.result === res.id
                    ? res.type === 'win'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-red-500 bg-red-50 text-red-700'
                    : 'border-transparent bg-slate-100 text-slate-600'
                }`}
              >
                {res.label}
              </button>
            ))}
          </div>

          <button
            onClick={addPoint}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-md flex items-center justify-center gap-2 transition-colors active:scale-95"
          >
            <PlusCircle />
            ポイントを記録する
          </button>
        </div>
      </div>
    </div>
  );

  const renderAnalysisTab = () => {
    const gridStats = getGridStats(selectedGrid);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Crosshair className="text-indigo-600" />
            着弾点ヒートマップ
          </h3>
          <p className="text-xs text-slate-500 mb-2">
            マスをタップして詳細分析を表示
          </p>
          <div className="max-w-md mx-auto">
            <CourtMap
              interactive={false}
              heatmapData={heatmapData}
              selectedGrid={selectedGrid}
              onSelectGrid={setSelectedGrid}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BarChart2 className="text-indigo-600" />
            エリア詳細分析
          </h3>

          {gridStats ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500 font-medium">
                    選択エリアの球数
                  </p>
                  <p className="text-3xl font-bold text-slate-800">
                    {gridStats.total}
                    <span className="text-sm font-normal text-slate-600 ml-1">
                      球
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500 font-medium">
                    自陣得点率
                  </p>
                  <p
                    className={`text-3xl font-bold ${
                      gridStats.winRate >= 50 ? 'text-blue-600' : 'text-red-600'
                    }`}
                  >
                    {gridStats.winRate}
                    <span className="text-sm font-normal ml-1">%</span>
                  </p>
                </div>
              </div>

              <div className="h-48">
                <p className="text-sm font-bold text-slate-700 text-center mb-2">
                  得点 / 失点 内訳
                </p>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: '得点', value: gridStats.winCount },
                        { name: '失点', value: gridStats.lossCount },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                      label
                    >
                      {[0, 1].map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="h-56">
                <p className="text-sm font-bold text-slate-700 text-center mb-2">
                  ショット種類
                </p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={gridStats.shotData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={80}
                      tick={{ fontSize: 12 }}
                    />
                    <RechartsTooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400">
              <Crosshair size={48} className="mb-4 opacity-50" />
              <p>左のコートからエリアを選択してください</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderHistoryTab = () => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <List className="text-slate-600" />
        ポイント履歴
      </h3>

      {data.points.length === 0 ? (
        <p className="text-center text-slate-500 py-8">まだ記録がありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">結果</th>
                <th className="px-4 py-3">サーバー</th>
                <th className="px-4 py-3">最終</th>
                <th className="px-4 py-3">ショット</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {data.points
                .slice()
                .reverse()
                .map((point, idx) => (
                  <tr
                    key={point.id}
                    className="border-b last:border-0 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium">
                      {data.points.length - idx}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          point.isMeScored
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {RESULT_TYPES.find((r) => r.id === point.result)?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {PLAYER_CONFIG[point.server]?.label}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {PLAYER_CONFIG[point.ender]?.label}
                    </td>
                    <td className="px-4 py-3">
                      {SHOT_TYPES.find((s) => s.id === point.shotType)?.label}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deletePoint(point.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <header className="bg-slate-800 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-xl font-black tracking-wider flex items-center gap-2">
            <PlayCircle className="text-emerald-400" />
            ST-ANALYTICS
          </h1>

          <div className="flex items-center gap-6 bg-slate-700/50 px-6 py-2 rounded-full border border-slate-600">
            <div className="text-center">
              <span className="text-xs text-blue-300 font-bold block mb-1">
                自陣
              </span>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black text-blue-400 leading-none">
                  {data.matchScore.sideA}
                </span>
                <span className="text-xl font-bold leading-none mb-0.5">
                  {data.currentGame.sideA}
                </span>
              </div>
            </div>
            <div className="text-2xl font-black text-slate-500">-</div>
            <div className="text-center">
              <span className="text-xs text-red-300 font-bold block mb-1">
                相手
              </span>
              <div className="flex items-end gap-2">
                <span className="text-xl font-bold leading-none mb-0.5">
                  {data.currentGame.sideB}
                </span>
                <span className="text-3xl font-black text-red-400 leading-none">
                  {data.matchScore.sideB}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 pb-24">
        {activeTab === 'input' && renderInputTab()}
        {activeTab === 'analysis' && renderAnalysisTab()}
        {activeTab === 'history' && renderHistoryTab()}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 px-4 py-2 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-md mx-auto flex justify-between">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex flex-col items-center p-2 flex-1 rounded-xl transition-colors ${
              activeTab === 'input'
                ? 'text-emerald-600 bg-emerald-50'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <PlusCircle className="mb-1" />
            <span className="text-[10px] font-bold">入力</span>
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex flex-col items-center p-2 flex-1 rounded-xl transition-colors ${
              activeTab === 'analysis'
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <BarChart2 className="mb-1" />
            <span className="text-[10px] font-bold">分析</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center p-2 flex-1 rounded-xl transition-colors ${
              activeTab === 'history'
                ? 'text-slate-800 bg-slate-100'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <List className="mb-1" />
            <span className="text-[10px] font-bold">履歴</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
