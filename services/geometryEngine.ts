
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

  static estimateBCT(p: BoxParams): number {
    const ect = p.t * 4.5; 
    const perimeter = 2 * (p.w + p.d);
    if (perimeter === 0) return 0;
    return 5.87 * ect * Math.sqrt((perimeter/10) * (p.t)); 
  }

  static validate(p: BoxParams): string[] {
    const warnings: string[] = [];
    if (p.h < 20 && p.type === BoxType.MAILER) warnings.push("高度 H 過低，飛機盒側邊插舌可能會發生物理干涉。");
    if (p.t > 1.5) warnings.push("紙厚 T 大於 1.5mm，建議增加折線補償 (K-factor)。");
    if (p.w < 50 || p.d < 50) warnings.push("尺寸過小，建議檢查自動生產可行性。");
    return warnings;
  }

  /**
   * 1. 飛機盒 (Mailer Box) - 典型的 T 型展開結構
   */
  private static generateMailer(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h } = p;
    const dustFlap = h * 0.8; // 防塵翼
    const tuck = 15; // 插舌長度

    // 縱向主體：前內折 - 前牆 - 底 - 後牆 - 頂蓋 - 插舌
    let y = 0;
    // 插舌 + 頂蓋
    this.addRect(lines, 0, y, w, tuck, LineType.CUT); y += tuck;
    this.addRect(lines, 0, y, w, d, LineType.CREASE); y += d;
    // 後牆 (主折線)
    this.addRect(lines, 0, y, w, h, LineType.CREASE); y += h;
    // 底
    this.addRect(lines, 0, y, w, d, LineType.CREASE); y += d;
    // 前牆
    this.addRect(lines, 0, y, w, h, LineType.CREASE); y += h;
    // 前內折
    this.addRect(lines, 0, y, w, h * 0.9, LineType.CUT);

    // 側牆 (從底向兩側展開)
    const baseY = tuck + d + h; 
    // 左側牆
    this.addRect(lines, -h, baseY, h, d, LineType.CREASE);
    this.addRect(lines, -h*2, baseY, h, d, LineType.CUT); // 左內折
    // 右側牆
    this.addRect(lines, w, baseY, h, d, LineType.CREASE);
    this.addRect(lines, w + h, baseY, h, d, LineType.CUT); // 右內折

    // 側邊防塵翼 (從後牆兩側展開)
    const backWallY = tuck + d;
    this.addRect(lines, -dustFlap, backWallY, dustFlap, h, LineType.CUT);
    this.addRect(lines, w, backWallY, dustFlap, h, LineType.CUT);

    return lines;
  }

  /**
   * 2. 上插下扣盒 (Tuck End) - 傳統的一字型展開結構
   */
  private static generateTuckEnd(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, g } = p;
    const tuck = 15;
    const shoulder = 10;
    
    let x = 0;
    // 四個面：寬 - 深 - 寬 - 深
    [w, d, w, d].forEach((pw, i) => {
      this.addRect(lines, x, 0, pw, h, LineType.CREASE);
      
      if (i === 0) { // 在第一個寬面增加上插舌
        this.addRect(lines, x, -d, pw, d, LineType.CREASE);
        this.addRect(lines, x + 5, -d - tuck, pw - 10, tuck, LineType.CUT);
      }
      if (i === 2) { // 在第二個寬面增加下插舌
        this.addRect(lines, x, h, pw, d, LineType.CREASE);
        this.addRect(lines, x + 5, h + d, pw - 10, tuck, LineType.CUT);
      }
      x += pw;
    });
    
    // 糊邊 (Glue Flap)
    const pts = [{x, y: 5}, {x: x + g, y: 10}, {x: x + g, y: h - 10}, {x, y: h - 5}];
    lines.push({ type: LineType.CUT, points: pts });
    
    return lines;
  }

  /**
   * 3. 天地蓋 (Telescope Box) - 兩個獨立盤狀結構
   */
  private static generateTelescope(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, t } = p;
    const lidH = h * 0.5; // 蓋子高度通常為底的一半
    const gap = 2; // 天地蓋位移公差
    
    // 底盒 (Tray)
    this.addTray(lines, 0, 0, w, d, h);
    // 天蓋 (Lid) - 略大於底盒以利套合
    this.addTray(lines, w + h * 3, 0, w + gap + t*2, d + gap + t*2, lidH);
    
    return lines;
  }

  /**
   * 4. 糊底盒 (Glue Bottom / Crash Lock) - 複雜的底部斜角結構
   */
  private static generateGlueBottom(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, g } = p;
    const bH = d * 0.7; // 底部扣合高度
    
    let x = 0;
    [w, d, w, d].forEach((pw, i) => {
      this.addRect(lines, x, 0, pw, h, LineType.CREASE);
      
      // 底部扣位邏輯 (簡化示意)
      if (i % 2 === 0) { // 寬面的底
        this.addRect(lines, x, h, pw, bH, LineType.CUT);
      } else { // 深面的底 (帶斜角)
        const flap = [{x, y: h}, {x: x+pw, y: h}, {x: x+pw/2, y: h+bH}, {x, y: h}];
        lines.push({ type: LineType.CUT, points: flap });
      }
      x += pw;
    });
    
    // 側邊糊邊
    this.addRect(lines, x, 0, g, h, LineType.CUT);
    return lines;
  }

  private static addTray(lines: GeometryElement[], x: number, y: number, w: number, d: number, h: number) {
    this.addRect(lines, x, y, w, d, LineType.CREASE); // 底
    this.addRect(lines, x, y - h, w, h, LineType.CUT); // 上
    this.addRect(lines, x, y + d, w, h, LineType.CUT); // 下
    this.addRect(lines, x - h, y, h, d, LineType.CUT); // 左
    this.addRect(lines, x + w, y, h, d, LineType.CUT); // 右
    
    // 四角糊貼位
    this.addRect(lines, x - h, y - h, h, h, LineType.CUT);
    this.addRect(lines, x + w, y - h, h, h, LineType.CUT);
    this.addRect(lines, x - h, y + d, h, h, LineType.CUT);
    this.addRect(lines, x + w, y + d, h, h, LineType.CUT);
  }

  private static generateDimensions(elements: GeometryElement[]): GeometryElement[] {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => el.points.forEach(p => {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }));
    return [
      { type: LineType.DIMENSION, points: [{x: minX, y: minY - 30}, {x: maxX, y: minY - 30}], label: `W: ${(maxX - minX).toFixed(0)}mm` },
      { type: LineType.DIMENSION, points: [{x: minX - 30, y: minY}, {x: minX - 30, y: maxY}], label: `H: ${(maxY - minY).toFixed(0)}mm` }
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
    const padding = 100;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const viewBox = `${minX - padding} ${minY - padding} ${width} ${height}`;
    
    const paths = elements.map((el) => {
      const dString = el.points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      let color = '#ef4444'; // CutLine - Red
      let dash = '';
      if (el.type === LineType.CREASE) { 
        color = '#3b82f6'; // CreaseLine - Blue
        dash = 'stroke-dasharray="4,3"'; 
      }
      else if (el.type === LineType.DIMENSION) color = '#94a3b8';
      
      let labelText = '';
      if (el.label) {
        const midX = (el.points[0].x + el.points[1].x) / 2;
        const midY = (el.points[0].y + el.points[1].y) / 2;
        labelText = `<text x="${midX}" y="${midY - 10}" font-size="12" fill="#475569" font-weight="bold" text-anchor="middle">${el.label}</text>`;
      }
      
      return `<path d="${dString}" fill="none" stroke="${color}" stroke-width="0.8" ${dash} />${labelText}`;
    }).join('\n');
    
    return `<svg width="100%" height="100%" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="background:#ffffff">${paths}</svg>`;
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
