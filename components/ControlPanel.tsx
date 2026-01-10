
import React from 'react';
import { BoxParams, BoxType } from '../types';

interface Props {
  params: BoxParams;
  onChange: (params: BoxParams) => void;
}

export const ControlPanel: React.FC<Props> = ({ params, onChange }) => {
  const handleChange = (field: keyof BoxParams, value: any) => {
    onChange({ ...params, [field]: value });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200 space-y-6">
      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <span className="bg-indigo-600 w-2 h-6 rounded-full"></span>
        結構參數 (mm)
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">選擇盒型模板</label>
          <select 
            value={params.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value={BoxType.MAILER}>飛機盒 (Mailer Box)</option>
            <option value={BoxType.TUCK_END}>上插下扣盒 (Tuck End)</option>
            <option value={BoxType.TELESCOPE}>天地蓋盒 (Telescope Box)</option>
            <option value={BoxType.GLUE_BOTTOM}>糊底盒 (Glue Bottom)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ParamInput label="成品寬 (W)" value={params.w} unit="mm" onChange={(v) => handleChange('w', v)} />
          <ParamInput label="成品深 (D)" value={params.d} unit="mm" onChange={(v) => handleChange('d', v)} />
          <ParamInput label="成品高 (H)" value={params.h} unit="mm" onChange={(v) => handleChange('h', v)} />
          <ParamInput label="紙張厚度 (T)" value={params.t} unit="mm" step={0.1} onChange={(v) => handleChange('t', v)} />
          <ParamInput label="糊邊寬度 (G)" value={params.g} unit="mm" onChange={(v) => handleChange('g', v)} />
        </div>
      </div>
    </div>
  );
};

const ParamInput: React.FC<{ label: string, value: number, unit: string, step?: number, onChange: (v: number) => void }> = ({ label, value, unit, step = 1, onChange }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <input 
        type="number" 
        step={step}
        value={value} 
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
      />
      <span className="absolute right-2 top-2 text-slate-400 text-[10px] uppercase">{unit}</span>
    </div>
  </div>
);
