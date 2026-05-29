
import React from 'react';
import { BoxParams, BoxType } from '../types';

interface Props {
  params: BoxParams;
  onChange: (params: BoxParams) => void;
}

const PRESETS = [
  { name: '手機殼', type: BoxType.MAILER, w: 180, d: 100, h: 30, t: 1.2, g: 15 },
  { name: '化妝品盒', type: BoxType.TUCK_END, w: 80, d: 60, h: 150, t: 1.0, g: 15 },
  { name: '鞋盒', type: BoxType.TELESCOPE, w: 330, d: 200, h: 120, t: 2.0, g: 20 },
  { name: '禮品盒', type: BoxType.BOOK_STYLE, w: 250, d: 200, h: 80, t: 1.5, g: 20 },
  { name: '飲料提盒', type: BoxType.HANDLE, w: 200, d: 150, h: 250, t: 1.5, g: 20 },
];

const BOX_DESCRIPTIONS: Record<BoxType, string> = {
  [BoxType.MAILER]: "適用於電商快遞、3C產品包裝。",
  [BoxType.TUCK_END]: "常見於藥盒、化妝品盒。",
  [BoxType.TELESCOPE]: "禮品盒首選，上下蓋結構。",
  [BoxType.GLUE_BOTTOM]: "自動扣底，承重性能佳。",
  [BoxType.DRAWER]: "高端抽屜盒，外殼+內抽結構。",
  [BoxType.BOOK_STYLE]: "精品書型盒，皮殼+內盒結構。",
  [BoxType.HANDLE]: "商超手提彩盒，自帶提手。"
};

export const ControlPanel: React.FC<Props> = ({ params, onChange }) => {
  const handleChange = (field: keyof BoxParams, value: any) => {
    onChange({ ...params, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-2">
          <span className="w-1.5 h-4 bg-indigo-600 rounded-full"></span>
          模型選擇
        </h2>
        <div className="relative mb-2">
          <select 
            value={params.type}
            onChange={(e) => handleChange('type', e.target.value as BoxType)}
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm font-bold appearance-none focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm"
          >
            <option value={BoxType.MAILER}>飛機盒 (Mailer Box)</option>
            <option value={BoxType.TUCK_END}>上插下扣盒 (Tuck End)</option>
            <option value={BoxType.TELESCOPE}>天地蓋盒 (Telescope Box)</option>
            <option value={BoxType.GLUE_BOTTOM}>糊底盒 (Glue Bottom)</option>
            <option value={BoxType.DRAWER}>抽屜盒 (Drawer Box)</option>
            <option value={BoxType.BOOK_STYLE}>書型盒 (Book Style)</option>
            <option value={BoxType.HANDLE}>手提盒 (Handle Box)</option>
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeWidth="3" /></svg>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 font-medium pl-1 mb-3">{BOX_DESCRIPTIONS[params.type]}</p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onChange({ type: preset.type, w: preset.w, d: preset.d, h: preset.h, t: preset.t, g: preset.g })}
              className="px-3 py-1 rounded-full text-[10px] font-bold bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-all"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      <div className="px-1">
        <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
          <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
          幾何參數
        </h2>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <ParamInput label="成品寬 (W)" value={params.w} unit="mm" onChange={(v) => handleChange('w', v)} />
          <ParamInput label="成品深 (D)" value={params.d} unit="mm" onChange={(v) => handleChange('d', v)} />
          <ParamInput label="成品高 (H)" value={params.h} unit="mm" onChange={(v) => handleChange('h', v)} />
          <ParamInput label="紙厚 (T)" value={params.t} unit="mm" step={0.1} onChange={(v) => handleChange('t', v)} />
          <div className="col-span-2">
            <ParamInput label="黏貼位 (G)" value={params.g} unit="mm" onChange={(v) => handleChange('g', v)} />
          </div>
        </div>
      </div>
    </div>
  );
};

const ParamInput: React.FC<{ label: string, value: number, unit: string, step?: number, onChange: (v: number) => void }> = ({ label, value, unit, step = 1, onChange }) => (
  <div className="group">
    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider group-focus-within:text-indigo-600 transition-colors">{label}</label>
    <div className="relative">
      <input 
        type="number" 
        step={step}
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-4 pr-10 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono font-black transition-all shadow-sm"
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 uppercase">{unit}</span>
    </div>
  </div>
);
