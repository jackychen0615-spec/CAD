
import { BoxParams, BoxType, GeometryElement, LineType, Point } from '../types';

export class GeometryEngine {
  
  static generate(params: BoxParams): GeometryElement[] {
    let lines: GeometryElement[] = [];
    switch (params.type) {
      case BoxType.MAILER: lines = this.generateMailer(params); break;
      case BoxType.TUCK_END: lines = this.generateTuckEnd(params); break;
      case BoxType.TELESCOPE: lines = this.generateTelescope(params); break;
      case BoxType.GLUE_BOTTOM: lines = this.generateGlueBottom(params); break;
      case BoxType.DRAWER: lines = this.generateRSC(params); break; 
      default: lines = this.generateMailer(params);
    }
    const bleed = this.generateBleed(lines, 3);
    // 加入自動分段標註
    const annotations = this.generateSmartDimensions(params, lines);
    return [...lines, ...bleed, ...annotations];
  }

  static estimateBCT(p: BoxParams): number {
    const ect = p.t * 4.5; 
    const perimeter = 2 * (p.w + p.d);
    if (perimeter === 0) return 0;
    return 5.87 * ect * Math.sqrt((perimeter/10) * (p.t)); 
  }

  static validate(p: BoxParams): string[] {
    const warnings: string[] = [];
    if (p.h < 25 && p.type === BoxType.MAILER) warnings.push("高度過低，成型時側板可能重疊。");
    if (p.w < p.d && p.type === BoxType.TUCK_END) warnings.push("寬度小於深度，插舌比例可能失調。");
    return warnings;
  }

  private static generateBleed(elements: GeometryElement[], offset: number): GeometryElement[] {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.filter(e => e.type === LineType.CUT).forEach(el => el.points.forEach(p => {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }));
    return [{
      type: LineType.DIMENSION,
      points: [
        {x: minX - offset, y: minY - offset},
        {x: maxX + offset, y: minY - offset},
        {x: maxX + offset, y: maxY + offset},
        {x: minX - offset, y: maxY + offset},
        {x: minX - offset, y: minY - offset}
      ],
      label: `Bleed Area (Offset: ${offset}mm)`
    }];
  }

  private static generateSmartDimensions(p: BoxParams, elements: GeometryElement[]): GeometryElement[] {
    const dims: GeometryElement[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.filter(e => e.type !== LineType.DIMENSION).forEach(el => el.points.forEach(p => {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }));

    // 全寬全高標註
    dims.push({ 
      type: LineType.DIMENSION, 
      points: [{x: minX, y: minY - 50}, {x: maxX, y: minY - 50}], 
      label: `TOTAL WIDTH: ${(maxX - minX).toFixed(1)}mm` 
    });
    dims.push({ 
      type: LineType.DIMENSION, 
      points: [{x: minX - 50, y: minY}, {x: minX - 50, y: maxY}], 
      label: `TOTAL HEIGHT: ${(maxY - minY).toFixed(1)}mm` 
    });

    return dims;
  }

  private static generateMailer(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, t } = p;
    const tuck = 18;
    const comp = t * 0.5; // 避位補償

    let y = 0;
    // 插舌 (加入 R 角避位計算)
    const tuckPts = [
      {x: 5, y: 0}, {x: w-5, y: 0}, 
      {x: w, y: tuck - 2}, {x: w - 2, y: tuck}, 
      {x: 2, y: tuck}, {x: 0, y: tuck - 2}, {x: 5, y: 0}
    ];
    lines.push({ type: LineType.CUT, points: tuckPts });
    y += tuck;

    this.addRect(lines, 0, y, w, d, LineType.CREASE); y += d;
    this.addRect(lines, 0, y, w, h, LineType.CREASE); y += h;
    this.addRect(lines, 0, y, w, d, LineType.CREASE); y += d;
    this.addRect(lines, 0, y, w, h, LineType.CREASE); y += h;
    
    const btmPts = [{x: 0, y}, {x: w, y}, {x: w-10, y: y+h*0.8}, {x: 10, y: y+h*0.8}, {x: 0, y}];
    lines.push({ type: LineType.CUT, points: btmPts });

    const baseY = tuck + d + h; 
    // 側板加入內縮補償，防止折疊擠壓
    this.addRect(lines, -h, baseY + comp, h, d - comp*2, LineType.CREASE);
    this.addRect(lines, -h*2, baseY + comp, h, d - comp*2, LineType.CUT); 
    this.addRect(lines, w, baseY + comp, h, d - comp*2, LineType.CREASE);
    this.addRect(lines, w + h, baseY + comp, h, d - comp*2, LineType.CUT); 

    return lines;
  }

  private static generateRSC(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, g } = p;
    const flap = d / 2; 

    let x = 0;
    [w, d, w, d].forEach((pw, i) => {
      this.addRect(lines, x, 0, pw, h, LineType.CREASE);
      const gap = (i % 2 === 0) ? 0 : 0.5; // 0.5mm 避位
      this.addRect(lines, x + gap, -flap, pw - gap*2, flap, LineType.CUT);
      this.addRect(lines, x + gap, h, pw - gap*2, flap, LineType.CUT);
      if (i < 3) lines.push({ type: LineType.CREASE, points: [{x: x + pw, y: -flap}, {x: x + pw, y: h + flap}] });
      x += pw;
    });

    const pts = [{x, y: 0}, {x: x+g, y: 5}, {x: x+g, y: h-5}, {x, y: h}];
    lines.push({ type: LineType.CUT, points: pts });
    lines.push({ type: LineType.CREASE, points: [{x, y: 0}, {x, y: h}] });
    return lines;
  }

  private static generateTuckEnd(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, g } = p;
    const tuck = 15;
    const df = Math.min(15, d * 0.4);

    let x = 0;
    [w, d, w, d].forEach((pw, i) => {
      this.addRect(lines, x, 0, pw, h, LineType.CREASE);
      if (i === 0 || i === 2) {
        const ty = i === 0 ? -d : h;
        const tuckY = i === 0 ? -d - tuck : h + d;
        this.addRect(lines, x, ty, pw, d, LineType.CREASE);
        const tPts = [
          {x: x, y: ty + (i===0?0:d)}, 
          {x: x + 4, y: tuckY + (i===0?tuck:-tuck)},
          {x: x + pw - 4, y: tuckY + (i===0?tuck:-tuck)},
          {x: x + pw, y: ty + (i===0?0:d)}
        ];
        lines.push({ type: LineType.CUT, points: tPts });
      } else {
        const fT = [{x, y: 0}, {x: x+pw, y: 0}, {x: x+pw-3, y: -df}, {x: x+3, y: -df}, {x, y: 0}];
        const fB = [{x, y: h}, {x: x+pw, y: h}, {x: x+pw-3, y: h+df}, {x: x+3, y: h+df}, {x, y: h}];
        lines.push({ type: LineType.CUT, points: fT });
        lines.push({ type: LineType.CUT, points: fB });
      }
      if (i < 3) lines.push({ type: LineType.CREASE, points: [{x: x+pw, y: 0}, {x: x+pw, y: h}] });
      x += pw;
    });
    this.addRect(lines, x, 0, g, h, LineType.CUT);
    return lines;
  }

  private static generateTelescope(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, t } = p;
    const lidH = h * 0.5;
    const gap = t * 2 + 0.5; 
    this.addTray(lines, 0, 0, w, d, h);
    this.addTray(lines, w + h * 3, 0, w + gap, d + gap, lidH);
    return lines;
  }

  private static generateGlueBottom(p: BoxParams): GeometryElement[] {
    const lines: GeometryElement[] = [];
    const { w, d, h, g } = p;
    const bH = d * 0.8; 
    let x = 0;
    [w, d, w, d].forEach((pw, i) => {
      this.addRect(lines, x, 0, pw, h, LineType.CREASE);
      if (i % 2 === 0) { 
        const pts = [{x, y: h}, {x: x+pw, y: h}, {x: x+pw, y: h+bH}, {x: x+pw*0.15, y: h+bH}, {x, y: h}];
        lines.push({ type: LineType.CUT, points: pts });
      } else { 
        const flap = [{x, y: h}, {x: x+pw, y: h}, {x: x+pw, y: h+bH*0.5}, {x: x+pw/2, y: h+bH}, {x, y: h}];
        lines.push({ type: LineType.CUT, points: flap });
      }
      if (i < 3) lines.push({ type: LineType.CREASE, points: [{x: x+pw, y: 0}, {x: x+pw, y: h}] });
      x += pw;
    });
    this.addRect(lines, x, 0, g, h, LineType.CUT);
    return lines;
  }

  private static addTray(lines: GeometryElement[], x: number, y: number, w: number, d: number, h: number) {
    this.addRect(lines, x, y, w, d, LineType.CREASE);
    this.addRect(lines, x, y - h, w, h, LineType.CUT); 
    this.addRect(lines, x, y + d, w, h, LineType.CUT); 
    this.addRect(lines, x - h, y, h, d, LineType.CUT); 
    this.addRect(lines, x + w, y, h, d, LineType.CUT); 
    [[x-h, y-h, 1, 1], [x+w, y-h, -1, 1], [x-h, y+d, 1, -1], [x+w, y+d, -1, -1]].forEach(c => {
      const pts = [{x: c[0], y: c[1]}, {x: c[0]+h, y: c[1]}, {x: c[0]+h*0.5, y: c[1]+h*0.5*c[3]}, {x: c[0], y: c[1]}];
      lines.push({ type: LineType.CUT, points: pts });
    });
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
    const padding = 150;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const viewBox = `${minX - padding} ${minY - padding} ${width} ${height}`;
    
    const paths = elements.map((el) => {
      const dString = el.points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      let color = '#ef4444'; 
      let dash = '';
      let sw = 1.2;
      
      if (el.type === LineType.CREASE) { 
        color = '#3b82f6'; 
        dash = 'stroke-dasharray="8,5"'; 
      } else if (el.type === LineType.DIMENSION) {
        color = '#94a3b8';
        sw = 0.8;
        if (el.label?.includes("Bleed")) { color = '#22c55e'; dash = 'stroke-dasharray="4,4"'; }
      }
      
      let labelText = '';
      if (el.label) {
        const midX = (el.points[0].x + el.points[el.points.length-1].x) / 2;
        const midY = (el.points[0].y + el.points[el.points.length-1].y) / 2;
        labelText = `<text x="${midX}" y="${midY - 10}" font-size="18" fill="${color}" font-weight="900" text-anchor="middle">${el.label}</text>`;
      }
      
      return `<path d="${dString}" fill="none" stroke="${color}" stroke-width="${sw}" ${dash} />${labelText}`;
    }).join('\n');
    
    return `<svg width="100%" height="100%" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff">${paths}</svg>`;
  }

  static toDXF(elements: GeometryElement[]): string {
    let output = "0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n";
    elements.forEach(el => {
      const layerName = el.type === LineType.CUT ? "CUT_LINE" : el.type === LineType.CREASE ? "CREASE_LINE" : "ANNOTATION";
      for (let i = 0; i < el.points.length - 1; i++) {
        output += `0\nLINE\n8\n${layerName}\n10\n${el.points[i].x}\n20\n${-el.points[i].y}\n11\n${el.points[i+1].x}\n21\n${-el.points[i+1].y}\n`;
      }
    });
    output += "0\nENDSEC\n0\nEOF\n";
    return output;
  }
}
