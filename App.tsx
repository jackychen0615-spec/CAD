
import React, { useState, useMemo } from 'react';
import { BoxParams, BoxType } from './types';
import { ControlPanel } from './components/ControlPanel';
import { GeometryEngine } from './services/geometryEngine';
import { ThreeDViewer } from './components/ThreeDViewer';

const App: React.FC = () => {
  const [params, setParams] = useState<BoxParams>({
    type: BoxType.MAILER,
    w: 200,
    d: 100,
    h: 80,
    t: 0.3,
    g: 20
  });

  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [foldAmount, setFoldAmount] = useState(0.85);
  const [isExporting, setIsExporting] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const dieLines = useMemo(() => GeometryEngine.generate(params), [params]);
  const svgString = useMemo(() => GeometryEngine.toSVG(dieLines), [dieLines]);
  const warnings = useMemo(() => GeometryEngine.validate(params), [params]);
  const bctValue = useMemo(() => GeometryEngine.estimateBCT(params), [params]);

  const stats = useMemo(() => {
    let maxX = -Infinity, minX = Infinity, maxY = -Infinity, minY = Infinity;
    dieLines.forEach(l => l.points.forEach(p => {
      maxX = Math.max(maxX, p.x); minX = Math.min(minX, p.x);
      maxY = Math.max(maxY, p.y); minY = Math.min(minY, p.y);
    }));
    const fw = maxX - minX;
    const fh = maxY - minY;
    return {
      flatDim: `${fw.toFixed(0)}x${fh.toFixed(0)}mm`,
      bct: `${bctValue.toFixed(1)} kgf`
    };
  }, [dieLines, bctValue]);

  const handleDownload = (format: 'SVG' | 'DXF') => {
    setIsExporting(true);
    setTimeout(() => {
      const content = format === 'SVG' ? svgString : GeometryEngine.toDXF(dieLines);
      const mime = format === 'SVG' ? 'image/svg+xml' : 'application/dxf';
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PackCAD_${params.type}_${params.w}x${params.d}.${format.toLowerCase()}`;
      a.click();
      URL.revokeObjectURL(url);
      setIsExporting(false);
    }, 800);
  };

  return (
    <div className="bg-[#f8fafc] h-screen flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* 導覽列 */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3 flex justify-between items-center shrink-0 z-[100] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-lg shadow-md shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <h1 className="text-lg font-black tracking-tight hidden xs:block">PackCAD <span className="text-indigo-600">PRO</span></h1>
        </div>

        <div className="flex items-center gap-2">
           <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200">
              <button 
                onClick={() => setViewMode('2D')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${viewMode === '2D' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
              >2D</button>
              <button 
                onClick={() => setViewMode('3D')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${viewMode === '3D' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
              >3D</button>
           </div>
           <button 
            disabled={isExporting}
            onClick={() => handleDownload('DXF')} 
            className="bg-slate-800 text-white px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-2 active:scale-95 disabled:opacity-50"
           >
            {isExporting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth="2" /></svg>}
            <span className="hidden sm:inline">DXF 導出</span>
           </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* 控制面板：在手機端為可折疊的頂部區域或固定比例區域 */}
        <aside className="w-full lg:w-80 bg-white border-b lg:border-r border-slate-200 overflow-y-auto max-h-[40vh] lg:max-h-full lg:h-full z-40 shrink-0 shadow-xl lg:shadow-none">
          <div className="p-4 sm:p-6 space-y-5">
            <ControlPanel params={params} onChange={setParams} />
            
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              <StatCard label="展開尺寸" value={stats.flatDim} />
              <StatCard label="抗壓強度" value={stats.bct} highlight />
            </div>

            {warnings.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-[10px] text-amber-700 font-bold uppercase mb-1">結構警告</p>
                {warnings.map((w, i) => <p key={i} className="text-[11px] text-amber-800 leading-tight">• {w}</p>)}
              </div>
            )}
          </div>
        </aside>

        {/* 畫布視圖區域：在手機端佔據剩餘 60% 空間 */}
        <section className="flex-1 relative bg-[#f1f5f9] overflow-hidden flex flex-col">
          <div className="flex-1 relative">
            {viewMode === '2D' ? (
              <div className="w-full h-full p-4 sm:p-12 overflow-auto flex items-center justify-center">
                <div 
                  className="bg-white shadow-2xl rounded-sm max-w-full max-h-full transition-all duration-300"
                  dangerouslySetInnerHTML={{ __html: svgString }} 
                />
              </div>
            ) : (
              <div className="w-full h-full touch-none relative">
                <ThreeDViewer key={resetKey} params={params} foldAmount={foldAmount} />
                
                <button 
                  onClick={() => setResetKey(k => k + 1)}
                  className="absolute top-4 right-4 bg-white/90 p-2.5 rounded-full shadow-lg border border-slate-200 text-slate-500 z-50 hover:bg-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>

                {/* 行動端折疊控制器優化：懸浮於底部 */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[85%] max-w-sm bg-white/80 backdrop-blur-xl p-4 rounded-3xl border border-white/50 shadow-2xl z-50 ring-1 ring-black/5">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">展開</span>
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">折疊模擬</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.001" 
                    value={foldAmount} 
                    onChange={(e) => setFoldAmount(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>
              </div>
            )}
            
            {/* 2D 模式圖例 */}
            {viewMode === '2D' && (
              <div className="absolute top-4 left-4 flex gap-3 text-[10px] font-bold text-slate-600 bg-white/90 backdrop-blur px-3 py-2 rounded-xl border border-slate-200 z-30 shadow-sm">
                 <span className="flex items-center gap-1.5"><div className="w-2.5 h-0.5 bg-red-500 rounded-full"></div> 裁切線</span>
                 <span className="flex items-center gap-1.5"><div className="w-2.5 h-0.5 border-t-2 border-dashed border-blue-500"></div> 折線</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const StatCard = ({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) => (
  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-center">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">{label}</p>
    <p className={`text-xs sm:text-sm font-mono font-black ${highlight ? 'text-indigo-600' : 'text-slate-700'}`}>{value}</p>
  </div>
);

export default App;
