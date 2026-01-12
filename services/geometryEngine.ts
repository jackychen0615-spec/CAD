
import { BoxParams, BoxType, GeometryElement, LineType, Point } from '../types';

export class GeometryEngine {
  
  static generate(params: BoxParams): GeometryElement[] {
    let lines: GeometryElement[] = [];
    switch (params.type) {
      case BoxType.MAILER: lines = this.generateMailer(params); break;
      case BoxType.TUCK_END: lines = this.generateTuckEnd(params); break;
      case BoxType.TELESCOPE: lines = this.generateTelescope(params); break;
      case BoxType.GLUE_BOTTOM: lines = this.generateGlueBottom(params); break;
      case BoxType.DRAWER: lines = this.generateDrawer(params); break;
      case BoxType.BOOK_STYLE: lines = this.generateBookStyle(params); break;
      case BoxType.HANDLE: lines = this.generateHandleBox(params); break;
      default: lines = this.generateMailer(params);
    }
    const annotations = this.generateSmartDimensions(params, lines);
    return [...lines, ...annotations];
  }

  // 估算抗壓強度 (BCT)
  static estimateBCT(p: BoxParams): number {
    const ect = p.t * 4.5; 
    const perimeter = 2 * (p.w + p.d);
    if (perimeter === 0) return 0;
    // 簡化版的 McKee 公式
    return 5.87 * ect * Math.sqrt((perimeter/10) * p.t); 
  }

  static validate(p: BoxParams): string[] {
    const warnings: string[] = [];
    if (p.h < 15) warnings.push("高度過低，物理折疊時容易斷裂。");
    if (p.w < p.d * 0.5) warnings.push("寬深比異常，結構穩定性較差。");
    return warnings;
  }

  private static addRect(lines: GeometryElement[], x: number, y: number, w: number, h: number, type: LineType) {
    lines.push({ type, points: [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }] });
  }

  private static generateSmartDimensions(p: BoxParams, elements: GeometryElement[]): GeometryElement[] {
    const dims: GeometryElement[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => el.points.forEach(p => {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }));

    dims.push({ 
      type: LineType.DIMENSION, 
      points: [{x: minX, y: minY - 40}, {x: maxX, y: minY - 40}], 
      label: `W: ${(maxX - minX).toFixed(0)}mm` 
    });
    return dims;
  }

  // --- 盒型幾何算法 ---

  private static generateMailer(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h } = p;
    const t = 15; // 扣位長度
    
    // 底部主體
    this.addRect(lines, 0, 0, w, d, LineType.CREASE);
    
    // 前壁 + 蓋子
    this.addRect(lines, 0, -h, w, h, LineType.CREASE);
    this.addRect(lines, 0, -h-d, w, d, LineType.CREASE);
    // 蓋子插舌 (Tuck)
    lines.push({ type: LineType.CUT, points: [
      {x: 0, y: -h-d}, {x: 10, y: -h-d-t}, {x: w-10, y: -h-d-t}, {x: w, y: -h-d}
    ]});

    // 後壁
    this.addRect(lines, 0, d, w, h, LineType.CREASE);
    
    // 左右側壁 (雙層加強)
    [[-h, 0, h, d], [w, 0, h, d]].forEach(r => {
      this.addRect(lines, r[0], r[1], r[2], r[3], LineType.CUT);
      // 防塵翼
      const side = r[0] < 0 ? -1 : 1;
      const fx = r[0] < 0 ? 0 : w;
      lines.push({ type: LineType.CUT, points: [
        {x: fx, y: 0}, {x: fx + side*h*0.8, y: -h*0.5}, {x: fx, y: -h}
      ]});
    });

    return lines;
  }

  private static generateDrawer(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, g, t } = p;
    // 1. 外殼 (Sleeve)
    let x = 0;
    const sw = w + t*4 + 1; // 考慮內外盒間隙
    const sh = h + t*4 + 1;
    [sw, d, sw, d].forEach(pw => {
      this.addRect(lines, x, 0, pw, sh, LineType.CREASE);
      x += pw;
    });
    this.addRect(lines, x, 0, g, sh, LineType.CUT);

    // 2. 內抽 (Tray)
    const tx = x + g + 100;
    this.addRect(lines, tx, 0, w, d, LineType.CREASE);
    [[-h,0,h,d], [w,0,h,d], [0,-h,w,h], [0,d,w,h]].forEach(r => {
      this.addRect(lines, tx+r[0], r[1], r[2], r[3], LineType.CUT);
    });
    return lines;
  }

  private static generateBookStyle(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, t } = p;
    // 皮殼
    const bw = w + 4;
    const bd = d + 4;
    this.addRect(lines, 0, 0, bw, bd, LineType.CUT);
    this.addRect(lines, bw, 0, h + t, bd, LineType.CUT);
    this.addRect(lines, bw + h + t, 0, bw, bd, LineType.CUT);
    // 內盒
    const ix = bw*2 + h + 100;
    this.addRect(lines, ix, 0, w, d, LineType.CREASE);
    [[-h,0,h,d], [w,0,h,d], [0,-h,w,h], [0,d,w,h]].forEach(r => this.addRect(lines, ix+r[0], r[1], r[2], r[3], LineType.CUT));
    return lines;
  }

  private static generateHandleBox(p: BoxParams): GeometryElement[] {
    const lines = this.generateTuckEnd(p);
    const { w, d, h } = p;
    // 提手結構
    const hw = w * 0.7;
    const hh = 50;
    const ox = (w - hw) / 2;
    lines.push({ type: LineType.CUT, points: [
      {x: ox, y: -d}, {x: ox, y: -d-hh}, {x: ox+hw, y: -d-hh}, {x: ox+hw, y: -d}
    ]});
    // 手提孔
    this.addRect(lines, ox + 15, -d-hh+15, hw-30, 20, LineType.CUT);
    return lines;
  }

  private static generateTuckEnd(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, g } = p;
    let x = 0;
    [w, d, w, d].forEach((pw, i) => {
      this.addRect(lines, x, 0, pw, h, LineType.CREASE);
      if (i === 0) { // 頂蓋
        this.addRect(lines, x, -d, pw, d, LineType.CREASE);
        lines.push({ type: LineType.CUT, points: [{x, y: -d}, {x: x+5, y: -d-15}, {x: x+pw-5, y: -d-15}, {x: x+pw, y: -d}] });
      }
      x += pw;
    });
    this.addRect(lines, x, 0, g, h, LineType.CUT);
    return lines;
  }

  private static generateGlueBottom(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, g } = p;
    let x = 0;
    [w, d, w, d].forEach((pw, i) => {
      this.addRect(lines, x, 0, pw, h, LineType.CREASE);
      const bh = d * 0.75;
      this.addRect(lines, x, h, pw, bh, LineType.CUT);
      x += pw;
    });
    this.addRect(lines, x, 0, g, h, LineType.CUT);
    return lines;
  }

  private static generateTelescope(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, t } = p;
    // 下蓋
    this.addRect(lines, 0, 0, w, d, LineType.CREASE);
    [[-h,0,h,d],[w,0,h,d],[0,-h,w,h],[0,d,w,h]].forEach(r => this.addRect(lines, r[0], r[1], r[2], r[3], LineType.CUT));
    // 上蓋 (略大)
    const ux = w + h*3;
    const uw = w + t*2 + 1;
    const ud = d + t*2 + 1;
    this.addRect(lines, ux, 0, uw, ud, LineType.CREASE);
    [[-h,0,h,ud],[uw,0,h,ud],[0,-h,uw,h],[0,ud,uw,h]].forEach(r => this.addRect(lines, ux+r[0], r[1], r[2], r[3], LineType.CUT));
    return lines;
  }

  static toSVG(elements: GeometryElement[]): string {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => el.points.forEach(p => {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }));
    const padding = 60;
    const viewBox = `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`;
    
    const paths = elements.map((el) => {
      const d = el.points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      let color = '#ef4444';
      let dash = '';
      if (el.type === LineType.CREASE) { color = '#3b82f6'; dash = 'stroke-dasharray="6,4"'; }
      else if (el.type === LineType.DIMENSION) color = '#94a3b8';
      
      const labelText = el.label ? `<text x="${(el.points[0].x + el.points[1].x)/2}" y="${el.points[0].y - 10}" font-size="12" fill="${color}" text-anchor="middle" font-weight="bold">${el.label}</text>` : '';
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5" ${dash} />${labelText}`;
    }).join('');
    
    return `<svg width="100%" height="100%" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" style="background:white">${paths}</svg>`;
  }

  static toDXF(elements: GeometryElement[]): string {
    let dxf = "0\nSECTION\n2\nENTITIES\n";
    elements.forEach(el => {
      for (let i = 0; i < el.points.length - 1; i++) {
        dxf += `0\nLINE\n8\n${el.type}\n10\n${el.points[i].x}\n20\n${-el.points[i].y}\n11\n${el.points[i+1].x}\n21\n${-el.points[i+1].y}\n`;
      }
    });
    return dxf + "0\nENDSEC\n0\nEOF\n";
  }
}
