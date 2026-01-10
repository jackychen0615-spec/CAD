
import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-white/20 transform animate-in zoom-in-95 duration-300">
        <div className="bg-indigo-600 p-8 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="bg-white/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black mb-1 tracking-tight">操作指南</h2>
          <p className="text-indigo-100 text-sm">歡迎使用專業包裝刀模生成系統</p>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid gap-6">
            <GuideItem 
              icon="⚙️"
              title="參數調節"
              desc="在左側面板輸入 W/D/H。系統會即時重新計算幾何數據，並自動生成工業級避位補償。"
            />
            <GuideItem 
              icon="🔄"
              title="3D 互動"
              desc="切換至 3D 模式，使用滑鼠或單指旋轉、滾輪或雙指縮放，全方位檢查結構成型效果。"
            />
            <GuideItem 
              icon="📐"
              title="2D 刀模"
              desc="自動產生裁切線 (紅) 與壓痕線 (藍)，支援工業標準 DXF 與向量 SVG 導出。"
            />
            <GuideItem 
              icon="📦"
              title="強度評估"
              desc="下方即時估計 BCT 抗壓強度，並偵測比例異常警告，確保量產安全性。"
            />
          </div>

          <button 
            onClick={onClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
          >
            開始設計
          </button>
        </div>
      </div>
    </div>
  );
};

const GuideItem = ({ icon, title, desc }: { icon: string, title: string, desc: string }) => (
  <div className="flex gap-4 items-start">
    <div className="text-2xl bg-slate-50 w-10 h-10 flex items-center justify-center rounded-xl shrink-0">{icon}</div>
    <div>
      <h3 className="text-sm font-bold text-slate-800 mb-0.5">{title}</h3>
      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{desc}</p>
    </div>
  </div>
);
