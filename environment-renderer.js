/* Act-specific near-field architecture. Rendering only: no world/collision data. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.MoonlitEnvironment = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const TAU = Math.PI * 2;
  const THEMES = Object.freeze([
    { name: "salvage-girders", body: "#17242b", face: "#34454b", edge: "#b1cac8", trim: "#65888a", accent: "#65c9bc", recess: "#0e1a22" },
    { name: "refractory-foundry", body: "#28282c", face: "#605347", edge: "#dfc9a1", trim: "#9a8164", accent: "#c99856", recess: "#171c22" },
    { name: "memory-cathedral", body: "#292b3b", face: "#686b7c", edge: "#d5d3e2", trim: "#9b94b0", accent: "#ad98cd", recess: "#191f31" },
    { name: "broadcast-lattice", body: "#14242e", face: "#344f60", edge: "#b7d8e0", trim: "#7793a5", accent: "#ac7899", recess: "#0b1823" },
    { name: "mirror-cradles", body: "#182d31", face: "#3a6064", edge: "#cdf4e6", trim: "#83b1b0", accent: "#84c9b2", recess: "#102128" },
  ].map(Object.freeze));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function createRenderer(ctx) {
    const polygon = (points, fill, stroke = null, width = 1) => {
      ctx.beginPath();
      points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
    };
    const line = (x1, y1, x2, y2, color, width = 1) => {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    };
    const rect = (x, y, w, h, color) => {
      if (w <= 0 || h <= 0) return;
      ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
    };
    const visible = (object, view, padding = 0) => object.x + object.w > view.x - padding
      && object.x < view.x + view.w + padding && object.y + object.h > view.y - padding
      && object.y < view.y + view.h + padding;

    function drawPlatform(platform, stageIndex, view) {
      if (platform.kind === "training") return false; // Existing drill markings stay intact.
      if (![platform.x, platform.y, platform.w, platform.h].every(Number.isFinite)
        || platform.w <= 0 || platform.h <= 0) return false;
      if (!visible(platform, view, 3)) return true;
      const act = clamp(Math.trunc(stageIndex), 0, 4), theme = THEMES[act];
      const { x, y, w, h } = platform;
      const tall = h > 64;
      const left = Math.max(x, view.x - 3), right = Math.min(x + w, view.x + view.w + 3);
      const top = Math.max(y, view.y - 3), bottom = Math.min(y + h, view.y + view.h + 3);
      const pitch = (tall ? [112, 96, 136, 100, 124] : [62, 50, 72, 58, 78])[act] * (view.mobile ? 1.25 : 1);
      // Clip every surface detail to the real solid rectangle. No ornamental
      // ledge can imply a foothold outside the collision shape.
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      rect(left, top, right - left, bottom - top, theme.body);
      rect(left, y, right - left, Math.min(h, tall ? 15 : 10), theme.face);
      rect(left, y + 10, right - left, Math.min(3, h - 10), theme.recess);
      const first = Math.max(0, Math.floor((left - x) / pitch));
      const last = Math.min(Math.ceil(w / pitch), first + 24, Math.ceil((right - x) / pitch));
      for (let index = first; index < last; index++) {
        const a = x + index * pitch, cellW = Math.min(pitch, x + w - a), b = a + cellW;
        if (act === 0) {
          if (tall) {
            rect(a + 5, Math.max(y + 17, top), cellW - 10, Math.min(h - 22, bottom - Math.max(y + 17, top)), theme.recess);
            const rowStart = Math.max(0, Math.floor((top - y - 22) / 104));
            for (let row = rowStart; row < rowStart + 9; row++) {
              const ry = y + 22 + row * 104;
              if (ry > bottom) break;
              line(a + 8, ry, b - 8, ry + 86, theme.face, 6);
              line(b - 8, ry, a + 8, ry + 86, "#283b42", 4);
              rect(a + 4, ry + 91, cellW - 8, 5, theme.face);
            }
          } else {
            polygon([[a+4,y+13],[b-4,y+13],[b-11,y+h-3],[a+11,y+h-3]], theme.recess);
            line(a + 8, y + 13, b - 8, y + h - 3, theme.trim, 2);
          }
          rect(a + 2, y + 5, 3, 3, theme.edge);
          rect(b - 6, y + 5, 3, 3, theme.trim);
          if (index % 3 === 1) rect(a + 12, y + 4, Math.max(0, cellW - 29), 3, "#887656");
        } else if (act === 1) {
          rect(a + 3, y + 3, cellW - 6, 5, theme.trim);
          if (tall) {
            rect(a + 9, Math.max(y + 22, top), cellW - 18, bottom - Math.max(y + 22, top), theme.recess);
            const rowStart = Math.max(0, Math.floor((top - y - 24) / 58));
            for (let row = rowStart; row < rowStart + 15; row++) {
              const ry = y + 24 + row * 58;
              if (ry > bottom) break;
              rect(a + 15, ry, cellW - 30, 35, "#3f3b35");
              line(a + 17, ry + 8, b - 17, ry + 8, theme.trim, 2);
              line(a + 17, ry + 27, b - 17, ry + 27, "#6c6049", 1);
              rect(a + 18, ry + 12, 3, 10, theme.accent);
            }
          } else {
            for (let fin = 0; fin < 3; fin++) {
              const fx = a + 8 + fin * Math.max(7, (cellW - 22) / 3);
              polygon([[fx,y+12],[fx+5,y+12],[fx+2,y+h-3],[fx-2,y+h-3]], theme.trim);
            }
          }
          line(a + 1, y + 1, a + 1, Math.min(y + h, bottom), theme.recess, 2);
        } else if (act === 2) {
          rect(a + 4, y + 4, cellW - 8, 3, theme.trim);
          if (tall) {
            const crown = y + 24, foot = Math.min(y + h - 8, crown + 280);
            polygon([[a+12,foot],[a+12,crown+43],[a+cellW/2,crown],[b-12,crown+43],[b-12,foot]], theme.recess, "#4c4d66", 2);
            line(a + cellW / 2, crown + 20, a + cellW / 2, foot - 8, "#4b4465", 2);
            rect(a + 3, Math.max(y + 16, top), 6, bottom - Math.max(y + 16, top), theme.face);
            rect(a + 4, y + 18, cellW - 8, 4, theme.trim);
          } else {
            polygon([[a+6,y+12],[a+cellW/2,y+12],[a+cellW/2+8,y+h-4],[a+6,y+h-4]], "#424459");
            const center = a + cellW / 2;
            polygon([[center,y+12],[center+4,y+16],[center,y+20],[center-4,y+16]], theme.accent);
            line(a + 4, y + h - 3, b - 4, y + h - 3, theme.trim, 1);
          }
          line(b - 1, y + 3, b - 1, y + Math.min(h, 13), theme.recess);
        } else if (act === 3) {
          rect(a + 4, y + 4, cellW - 8, 3, theme.recess);
          if (tall) {
            rect(a + 4, Math.max(y + 17, top), 5, bottom - Math.max(y + 17, top), theme.trim);
            rect(b - 9, Math.max(y + 17, top), 5, bottom - Math.max(y + 17, top), theme.face);
            const rowStart = Math.max(0, Math.floor((top - y - 23) / 83));
            for (let row = rowStart; row < rowStart + 11; row++) {
              const ry = y + 23 + row * 83;
              if (ry > bottom) break;
              line(a + 11, ry, b - 11, ry + 66, theme.face, 4);
              line(b - 11, ry, a + 11, ry + 66, "#4f6879", 2);
              rect(a + 13, ry + 67, cellW - 26, 4, theme.face);
            }
          } else {
            line(a + 5, y + 12, b - 5, y + h - 4, theme.trim, 2);
            line(b - 5, y + 12, a + 5, y + h - 4, theme.face, 2);
            line(a + 5, y + h - 3, b - 5, y + h - 3, theme.trim, 1);
          }
          if (index % 2 === 0) rect(a + 7, y + 5, 5, 2, theme.accent);
        } else {
          polygon([[a+3,y+4],[b-5,y+4],[b-13,y+9],[a+11,y+9]], theme.trim);
          if (tall) {
            const rowStart = Math.max(0, Math.floor((top - y - 24) / 128));
            for (let row = rowStart; row < rowStart + 8; row++) {
              const ry = y + 24 + row * 128;
              if (ry > bottom) break;
              polygon([[a+14,ry],[b-14,ry],[b-7,ry+14],[b-7,ry+94],[b-18,ry+107],[a+7,ry+107],[a+7,ry+14]], theme.recess, theme.face, 2);
              polygon([[a+16,ry+8],[a+32,ry+8],[b-16,ry+91],[b-29,ry+96]], "#29464e");
              line(a + 14, ry + 103, b - 18, ry + 103, "#48756f", 2);
            }
          } else {
            polygon([[a+4,y+12],[a+cellW*.4,y+12],[b-4,y+h-3],[b-cellW*.4,y+h-3]], "#52747c");
            polygon([[a+4,y+12],[a+10,y+h-3],[b-4,y+h-3],[b-10,y+12]], null, theme.face);
          }
          line(a + 1, y + 2, a + 1, y + h - 2, theme.recess, 2);
        }
      }
      // Every act shares a precise two-pixel walkable edge; visual detail never
      // wins over readable landings or the red hazard silhouettes drawn later.
      rect(left, y, right - left, Math.min(h, 2), theme.edge);
      rect(left, y + 2, right - left, Math.min(Math.max(0, h - 2), 1), theme.trim);
      line(x + 0.5, top, x + 0.5, bottom, theme.trim, 1);
      line(x + w - 0.5, top, x + w - 0.5, bottom, theme.trim, 1);
      ctx.restore();
      return true;
    }

    function drawArena(zone, stageIndex, view) {
      const floor = Number.isFinite(view.floorY) ? view.floorY : 670;
      const act = clamp(Math.trunc(stageIndex), 0, 4), theme = THEMES[act];
      if (zone.x > view.x + view.w || zone.end < view.x || floor < view.y - 20 || floor - 430 > view.y + view.h) return;
      const pitch = [620, 540, 610, 600, 570][act];
      const first = Math.max(0, Math.floor((view.x - zone.x - 300) / pitch));
      const count = Math.min(5, Math.ceil(view.w / pitch) + 2);
      ctx.save();
      ctx.globalAlpha = 0.52;
      ctx.lineCap = "butt";
      for (let cell = first; cell < first + count; cell++) {
        const x = zone.x + 180 + cell * pitch;
        if (x > zone.end - 120) break;
        const y = floor - (act === 3 ? 405 : 345);
        if (act === 0) {
          polygon([[x-92,floor],[x-75,y+28],[x-48,y],[x+48,y],[x+75,y+28],[x+92,floor]], "#12232c", "#30474e", 3);
          line(x - 58, y + 40, x - 58, floor - 14, "#476167", 5);
          line(x + 58, y + 40, x + 58, floor - 14, "#476167", 5);
          rect(x - 72, y + 24, 144, 13, "#455652");
          line(x, y + 38, x, y + 128, "#66807d", 2);
          ctx.strokeStyle = "#65837d"; ctx.lineWidth = 6; ctx.beginPath();ctx.arc(x,y+145,18,-.3,Math.PI*1.4);ctx.stroke();
          for (let rack = 0; rack < 3; rack++) { rect(x - 38 + rack * 27, floor - 75, 13, 56, "#354d4a"); rect(x - 36 + rack * 27, floor - 78, 9, 5, "#77755a"); }
        } else if (act === 1) {
          for (let flue = -1; flue <= 1; flue++) {
            const fx = x + flue * 58, fy = y + Math.abs(flue) * 42;
            polygon([[fx-21,floor],[fx-21,fy+16],[fx-14,fy],[fx+14,fy],[fx+21,fy+16],[fx+21,floor]], "#302c29", "#665347", 2);
            for (let ring = 0; ring < 4; ring++) rect(fx - 24, fy + 40 + ring * 57, 48, 5, "#594a3d");
          }
          polygon([[x-90,floor],[x-90,floor-125],[x-53,floor-160],[x+53,floor-160],[x+90,floor-125],[x+90,floor]], "#392f2b", "#856847", 3);
          rect(x - 57, floor - 103, 114, 83, "#181e23");
          for (let fin = 0; fin < 6; fin++) rect(x - 49 + fin * 18, floor - 94, 6, 65, "#66523b");
        } else if (act === 2) {
          polygon([[x-107,floor],[x-107,y+100],[x,y-38],[x+107,y+100],[x+107,floor]], "#282a3e", "#5b536d", 3);
          polygon([[x-77,floor-15],[x-77,y+115],[x,y+9],[x+77,y+115],[x+77,floor-15]], "#141d2c", "#746881", 2);
          line(x,y+20,x,floor-22,"#4d4969",3);
          line(x-72,y+180,x+72,y+180,"#4d4969",3);
          polygon([[x,y+78],[x+26,y+118],[x,y+154],[x-26,y+118]], "#494261", "#9a88ae", 1);
          for (const side of [-1,1]) { rect(x+side*118-8,y+80,16,floor-y-80,"#414055"); polygon([[x+side*118-13,y+80],[x+side*118,y+39],[x+side*118+13,y+80]],"#5b536d"); }
        } else if (act === 3) {
          polygon([[x-88,floor],[x-24,y+35],[x+24,y+35],[x+88,floor]], "#142632", "#3b5365", 3);
          for (let strut = 0; strut < 5; strut++) {
            const sy=y+70+strut*62,half=28+strut*10;
            line(x-half,sy,x+half+10,sy+55,"#456174",3);line(x+half,sy,x-half-10,sy+55,"#2c4459",3);
          }
          line(x,y-24,x,y+42,"#8297a5",3);line(x-32,y+8,x+32,y+8,"#8297a5",3);
          ctx.save();ctx.translate(x+58,y+108);ctx.rotate(-.5);ctx.strokeStyle="#6c8295";ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,39,-Math.PI/2,Math.PI/2);ctx.stroke();line(0,-38,0,38,"#4d657a",3);line(0,0,28,0,"#91a3af",2);ctx.restore();
          rect(x-8,y+40,16,4,"#8f6b82");
        } else {
          for (const side of [-1,1]) {
            const sx=x+side*61;
            polygon([[sx-28,floor],[sx-37,y+30],[sx-15,y],[sx+27,y+10],[sx+37,floor-26]],"#1c363c","#547e81",2);
            polygon([[sx-18,y+34],[sx-6,y+19],[sx+18,floor-41],[sx+5,floor-24]],"#35555f");
            line(sx-20,y+43,sx+16,floor-42,"#6d9190",1);
          }
          ctx.strokeStyle="#779f96";ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y+174,43,76,0,0,TAU);ctx.stroke();
          polygon([[x,y+124],[x+20,y+174],[x,y+224],[x-20,y+174]],"#355855","#90c6b3",2);
          rect(x-83,floor-12,166,5,"#446f68");
        }
      }
      ctx.restore();
    }
    return Object.freeze({ drawPlatform, drawArena });
  }
  return Object.freeze({ createRenderer, themes: THEMES });
});
