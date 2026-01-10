
import { BoxParams, BoxType, GeometryElement, LineType, Point } from '../types';

export class GeometryEngine {
  
  static generate(params: BoxParams): GeometryElement[] {
    let lines: GeometryElement[] = [];
    switch (params.type) {
      case BoxType.MAILER: lines = this.generateMailer(params); break;
      case BoxType.TUCK_END: lines = this.generateTuckEnd(params); break;
      case BoxType.TELESCOPE: lines = this.generateTelescope(params); break;
      case BoxType.GLUE_BOTTOM: lines = this.generateGlueBottom(params); break;
      default: lines = this.generateMailer(params);
    }
    return [...lines, ...this.generateDimensions(lines)];
  }

  // 凱里卡特公式 (McKee Formula) 估算抗壓
  static estimateBCT(p: BoxParams): number {
    // 簡化模型：假設為普通瓦楞紙板，ECT 值隨厚度 T 增加
    const ect = p.t * 4.5; // 理論環壓值
    const perimeter = 2 * (p.w + p.d);
    if (perimeter === 0) return 0;
    // BCT = 5.87 * ECT * sqrt(Perimeter * T)
    return 5.87 * ect * Math.sqrt((perimeter/10) * (p.t)); 
  }

  static validate(p: BoxParams): string[] {
    const warnings: string[] = [];
    if (p.h < 20 && p.type === BoxType.MAILER) warnings.push("高度 H 過低，側邊插舌可能會發生物理干涉。");
    if (p.t > 1.5) warnings.push("紙厚 T 大於 1.5mm，建議檢查折線補償。");
    if (p.w < 50 || p.d < 50) warnings.push("尺寸過小，手工作業困難，建議機器自動糊盒。");
    return warnings;
  }

  private static generateTuckEnd(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, g, t } = p;
    let x = 0;
    const tolerance = 0.5; // 插舌公差

    [w, d, w, d].forEach((pw, i) => {
      this.addRect(lines, x, 0, pw, h, LineType.CREASE);
      if (i % 2 === 0) {
        const flapH = Math.min(d * 0.6, 35);
        // 插舌自動加入公差：寬度縮小
        this.addRect(lines, x + tolerance, -flapH, pw - (tolerance * 2), flapH, LineType.CUT);
        this.addRect(lines, x + tolerance, h, pw - (tolerance * 2), flapH, LineType.CUT);
      }
      x += pw;
    });
    
    // 糊邊帶有斜角
    const pts = [
      {x, y: 5}, {x: x + g, y: 10}, 
      {x: x + g, y: h - 10}, {x, y: h - 5}
    ];
    lines.push({ type: LineType.CUT, points: pts });
    
    return lines;
  }

  private static generateMailer(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, t } = p;
    // 飛機盒核心邏輯：加入側壁雙層折疊預留位
    this.addRect(lines, 0, 0, w, d, LineType.CREASE); // 底
    this.addRect(lines, 0, d, w, h, LineType.CREASE); // 前牆
    this.addRect(lines, 0, d + h, w, d * 0.8, LineType.CUT); // 前內折
    this.addRect(lines, 0, -h, w, h, LineType.CREASE); // 後牆
    this.addRect(lines, 0, -(h + d), w, d, LineType.CREASE); // 頂蓋
    
    // 側牆
    this.addRect(lines, -h, 0, h, d, LineType.CREASE);
    this.addRect(lines, w, 0, h, d, LineType.CREASE);
    
    return lines;
  }

  private static generateTelescope(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, t } = p;
    const gap = 1.5; 
    this.addTray(lines, 0, 0, w, d, h, LineType.CREASE);
    this.addTray(lines, w + h*3, 0, w + gap + t*2, d + gap + t*2, h*0.5, LineType.CREASE);
    return lines;
  }

  private static addTray(lines: GeometryElement[], x: number, y: number, w: number, d: number, h: number, type: LineType) {
    this.addRect(lines, x, y, w, d, type);
    this.addRect(lines, x, y - h, w, h, type);
    this.addRect(lines, x, y + d, w, h, type);
    this.addRect(lines, x - h, y, h, d, type);
    this.addRect(lines, x + w, y, h, d, type);
  }

  private static generateGlueBottom(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, g } = p;
    let x = 0;
    [w, d, w, d].forEach((pw) => {
      this.addRect(lines, x, 0, pw, h, LineType.CREASE);
      x += pw;
    });
    this.addRect(lines, x, 0, g, h, LineType.CUT);
    return lines;
  }

  private static generateDimensions(elements: GeometryElement[]): GeometryElement[] {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => el.points.forEach(p => {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }));
    return [
      { type: LineType.DIMENSION, points: [{x: minX, y: minY - 20}, {x: maxX, y: minY - 20}], label: `${(maxX - minX).toFixed(0)}mm` },
      { type: LineType.DIMENSION, points: [{x: minX - 20, y: minY}, {x: minX - 20, y: maxY}], label: `${(maxY - minY).toFixed(0)}mm` }
    ];
  }

  private static addRect(lines: GeometryElement[], x: number, y: number, w: number, h: number, type: LineType) {
    lines.push({ type, points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }] });
  }

  static toSVG(elements: GeometryElement[]): string {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => el.points.forEach(p => {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }));
    const padding = 80;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const viewBox = `${minX - padding} ${minY - padding} ${width} ${height}`;
    const paths = elements.map((el) => {
      const dString = el.points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      let color = '#ef4444';
      let dash = '';
      if (el.type === LineType.CREASE) { color = '#3b82f6'; dash = 'stroke-dasharray="3,2"'; }
      else if (el.type === LineType.DIMENSION) color = '#94a3b8';
      let text = el.label ? `<text x="${(el.points[0].x + el.points[1].x)/2}" y="${(el.points[0].y + el.points[1].y)/2 - 8}" font-size="8" fill="#64748b" font-weight="bold" text-anchor="middle">${el.label}</text>` : '';
      return `<path d="${dString}" fill="none" stroke="${color}" stroke-width="0.6" ${dash} />${text}`;
    }).join('\n');
    return `<svg width="100%" height="100%" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" style="background:#f8fafc">${paths}</svg>`;
  }

  static toDXF(elements: GeometryElement[]): string {
    let output = "0\nSECTION\n2\nENTITIES\n";
    elements.forEach(el => {
      if (el.type === LineType.DIMENSION) return;
      const layerName = el.type === LineType.CUT ? "CUT" : "CREASE";
      for (let i = 0; i < el.points.length - 1; i++) {
        output += `0\nLINE\n8\n${layerName}\n10\n${el.points[i].x}\n20\n${el.points[i].y}\n11\n${el.points[i+1].x}\n21\n${el.points[i+1].y}\n`;
      }
    });
    output += "0\nENDSEC\n0\nEOF\n";
    return output;
  }
}
