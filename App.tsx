
import React, { useState, useMemo, useEffect } from 'react';
import { BoxParams, BoxType, LineType } from './types';
import { ControlPanel } from './components/ControlPanel';
import { GeometryEngine } from './services/geometryEngine';
import { ThreeDViewer } from './components/ThreeDViewer';
import { OnboardingModal } from './components/OnboardingModal';

const App: React.FC = () => {
  const [params, setParams] = useState<BoxParams>({
    type: BoxType.MAILER,
    w: 200,
    d: 100,
    h: 80,
    t: 1.5,
    g: 20
  });

  const [viewMode, setViewMode] = useState<'2D' | '3D'>('2D');
  const [foldAmount, setFoldAmount] = useState(0.85);
  const [material, setMaterial] = useState<'white' | 'kraft' | 'corrugated'>('kraft');
  const [resetKey, setResetKey] = useState(0);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // 當核心幾何參數變動時，強制重置 3D 畫布以防緩存
  useEffect(() => {
    setResetKey(prev => prev + 1);
  }, [params.type, params.w, params.d, params.h, params.t, material]);

  useEffect(() => {
    const hasSeen = localStorage.getItem('packcad_onboarding');
    if (!hasSeen) {
      setIsHelpOpen(true);
      localStorage.setItem('packcad_onboarding', 'true');
    }
  }, []);

  const dieLines = useMemo(() => GeometryEngine.generate(params), [params]);
  const svgString = useMemo(() => GeometryEngine.toSVG(dieLines), [dieLines]);
  const warnings = useMemo(() => GeometryEngine.validate(params), [params]);
  const bctValue = useMemo(() => GeometryEngine.estimateBCT(params), [params]);

  const stats = useMemo(() => {
    let maxX = -Infinity, minX = Infinity, maxY = -Infinity, minY = Infinity;
    dieLines.filter(l => l.type !== LineType.DIMENSION).forEach(l => l.points.forEach(p => {
      maxX = Math.max(maxX, p.x); minX = Math.min(minX, p.x);
      maxY = Math.max(maxY, p.y); minY = Math.min(minY, p.y);
    }));
    return {
      flatDim: `${(maxX - minX).toFixed(0)}x${(maxY - minY).toFixed(0)}mm`,
      bct: `${bctValue.toFixed(1)} kgf`
    };
  }, [dieLines, bctValue]);

  const handleDownload = (format: 'SVG' | 'DXF') => {
    const content = format === 'SVG' ? svgString : GeometryEngine.toDXF(dieLines);
    const mime = format === 'SVG' ? 'image/svg+xml' : 'application/dxf';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PackCAD_${params.type}_${params.w}x${params.d}.${format.toLowerCase()}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#f8fafc] h-[100dvh] flex flex-col font-sans text-slate-900 overflow-hidden">
      <OnboardingModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      
      <nav className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center z-[100] shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-indigo-600 text-white p-1.5 rounded-lg shadow-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <h1 className="text-lg font-black tracking-tight hidden sm:block">PackCAD <span className="text-indigo-600">PRO</span></h1>
        </div>

        <div className="flex items-center gap-2">
           <button onClick={() => setIsHelpOpen(true)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth="2.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           </button>
           <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200">
              <button onClick={() => setViewMode('2D')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === '2D' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>2D</button>
              <button onClick={() => setViewMode('3D')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === '3D' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>3D</button>
           </div>
           <button onClick={() => handleDownload('DXF')} className="bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 active:scale-95">DXF 導出</button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        <aside className="w-full lg:w-80 bg-white border-b lg:border-r border-slate-200 overflow-y-auto max-h-[40vh] lg:max-h-full lg:h-full z-40 shrink-0 p-6 space-y-6">
          <ControlPanel params={params} onChange={setParams} />
          
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-4 bg-orange-500 rounded-full"></span>
              材料預覽
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(['white', 'kraft', 'corrugated'] as const).map(m => (
                <button key={m} onClick={() => setMaterial(m)} className={`py-2 rounded-lg text-[10px] font-bold border-2 transition-all ${material === m ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300'}`}>
                  {m === 'white' ? '白卡' : m === 'kraft' ? '牛皮' : '瓦楞'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="展開尺寸" value={stats.flatDim} />
            <StatCard label="抗壓預估" value={stats.bct} highlight />
          </div>

          {warnings.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              {warnings.map((w, i) => <p key={i} className="text-[10px] text-amber-800 leading-tight">• {w}</p>)}
            </div>
          )}
        </aside>

        <section className="flex-1 relative bg-[#f1f5f9] overflow-hidden flex flex-col">
          {viewMode === '3D' && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[85%] max-w-sm bg-white/80 backdrop-blur-xl px-6 py-4 rounded-3xl border border-white shadow-2xl z-[60]">
              <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">展開</span>
                <span className="text-[10px] font-black text-indigo-600 uppercase">成型模擬</span>
              </div>
              <input type="range" min="0" max="1" step="0.001" value={foldAmount} onChange={(e) => setFoldAmount(parseFloat(e.target.value))} className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600" />
            </div>
          )}

          <div className="flex-1 relative">
            {viewMode === '2D' ? (
              <div className="w-full h-full p-12 overflow-auto flex items-center justify-center">
                <div className="bg-white shadow-2xl rounded-sm transition-all p-8" dangerouslySetInnerHTML={{ __html: svgString }} />
              </div>
            ) : (
              <div className="w-full h-full">
                <ThreeDViewer key={resetKey} params={params} foldAmount={foldAmount} materialType={material} />
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

const StatCard = ({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) => (
  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-xs font-mono font-black ${highlight ? 'text-indigo-600' : 'text-slate-700'}`}>{value}</p>
  </div>
);

export default App;
