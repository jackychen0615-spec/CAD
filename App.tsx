
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
  const [resetKey, setResetKey] = useState(0); // 用於重置 3D 視角

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
    const area = (fw * fh) / 1000000;
    const sheetW = 1000, sheetH = 700;
    const yieldCount = Math.floor(sheetW / fw) * Math.floor(sheetH / fh);

    return {
      flatDim: `${fw.toFixed(0)}x${fh.toFixed(0)}mm`,
      area: `${area.toFixed(3)} m²`,
      yield: Math.max(0, yieldCount),
      utilization: yieldCount > 0 ? ((area * yieldCount) / ((sheetW * sheetH) / 1000000) * 100).toFixed(1) : '0'
    };
  }, [dieLines]);

  const handleDownload = (format: 'SVG' | 'DXF') => {
    setIsExporting(true);
    // 模擬打包時間，給客戶更好的視覺反饋
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
    }, 1000);
  };

  return (
    <div className="bg-[#f1f5f9] min-h-screen flex flex-col font-sans text-slate-900 selection:bg-indigo-100">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-2.5 rounded-xl shadow-lg shadow-indigo-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">PackCAD <span className="text-indigo-600 text-sm font-bold ml-1 px-1.5 py-0.5 bg-indigo-50 rounded">PRO</span></h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Live Preview for Client</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner border border-slate-200">
              <button 
                onClick={() => setViewMode('2D')}
                className={`px-5 py-2 rounded-lg text-xs font-black transition-all duration-200 ${viewMode === '2D' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >2D 展開圖</button>
              <button 
                onClick={() => setViewMode('3D')}
                className={`px-5 py-2 rounded-lg text-xs font-black transition-all duration-200 ${viewMode === '3D' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
              >3D 模擬器</button>
           </div>
           <div className="h-8 w-px bg-slate-200 mx-2"></div>
           <button 
            disabled={isExporting}
            onClick={() => handleDownload('DXF')} 
            className="group bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-xl shadow-slate-200 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
           >
            {isExporting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
            {isExporting ? '處理中...' : '下載 DXF'}
           </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row p-8 gap-8 overflow-hidden">
        <aside className="lg:w-80 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          <ControlPanel params={params} onChange={setParams} />
          
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <h3 className="text-[10px] font-black uppercase text-indigo-500 mb-5 tracking-[0.2em] flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
              數據報表 (AI 估算)
            </h3>
            <div className="space-y-4">
              <StatRow label="展開平面尺寸" value={stats.flatDim} />
              <StatRow label="抗壓強度 BCT" value={`${bctValue.toFixed(1)} kgf`} highlight />
              <StatRow label="全開大紙連晒" value={`${stats.yield} 模`} />
              <StatRow label="紙張利用率" value={`${stats.utilization}%`} />
            </div>
          </div>

          <div className="bg-indigo-900 p-5 rounded-2xl shadow-lg text-white/90">
             <h4 className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-2">部署狀態</h4>
             <p className="text-[11px] leading-relaxed">已連接 Zeabur Edge Network。所有幾何計算均在瀏覽器端完成，確保隱私與極速響應。</p>
          </div>
        </aside>

        <section className="flex-1 bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-200 relative overflow-hidden flex items-center justify-center group/viewer">
          {viewMode === '2D' ? (
            <div className="w-full h-full p-16 transition-all duration-500 ease-out transform group-hover/viewer:scale-[1.01]" dangerouslySetInnerHTML={{ __html: svgString }} />
          ) : (
            <div className="w-full h-full relative">
              <ThreeDViewer key={resetKey} params={params} foldAmount={foldAmount} />
              
              <button 
                onClick={() => setResetKey(k => k + 1)}
                className="absolute top-6 right-6 bg-white/80 hover:bg-white p-2 rounded-full border border-slate-200 shadow-sm text-slate-500 transition-all hover:scale-110 active:scale-95"
                title="重置視角"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>

              <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-80 bg-white/90 backdrop-blur-xl p-6 rounded-3xl border border-slate-200 shadow-2xl">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mb-4 tracking-tighter">
                  <span className={foldAmount < 0.2 ? 'text-indigo-600' : ''}>展開模式</span>
                  <span className={foldAmount > 0.8 ? 'text-indigo-600' : ''}>折疊模擬 (成品)</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.001" 
                  value={foldAmount} 
                  onChange={(e) => setFoldAmount(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-grab active:cursor-grabbing accent-indigo-600"
                />
              </div>
            </div>
          )}
          
          <div className="absolute top-8 left-10 flex gap-6 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white/50 backdrop-blur px-4 py-2 rounded-full border border-slate-100">
             <span className="flex items-center gap-2"><div className="w-2.5 h-0.5 bg-red-500"></div> 裁切線 (Cut)</span>
             <span className="flex items-center gap-2"><div className="w-2.5 h-0.5 border-t-2 border-dashed border-blue-500"></div> 折疊線 (Crease)</span>
          </div>
        </section>
      </main>
    </div>
  );
};

const StatRow = ({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) => (
  <div className="flex justify-between items-end border-b border-slate-100 pb-2">
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{label}</span>
    <span className={`text-sm font-mono font-black ${highlight ? 'text-indigo-600' : 'text-slate-700'}`}>{value}</span>
  </div>
);

export default App;
