import { CanvasTexture, LinearFilter } from "three";

export interface GlyphAtlas {
  texture: CanvasTexture;
  count: number;
  cellWidth: number;
  cellHeight: number;
}

export abstract class GlyphAtlasBuilder {
  private static readonly candidates = " .'`,:;-_~\"^!i|/\\()<>+=*?rclvtxzsjnuoeaJCLYZUXmwqpdbkhOQ0%#&8@$MWB";
  private static readonly levels = 18;
  private static readonly fontSize = 11;
  private static readonly cellWidth = 7;
  private static readonly cellHeight = 12;
  private static readonly scale = 2;

  static async create(): Promise<GlyphAtlas> {
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim() || "monospace";
    const font = `${GlyphAtlasBuilder.fontSize * GlyphAtlasBuilder.scale}px ${family}`;
    await document.fonts.load(font).catch(() => []);
    const ramp = GlyphAtlasBuilder.ramp(font);
    const width = GlyphAtlasBuilder.cellWidth * GlyphAtlasBuilder.scale;
    const height = GlyphAtlasBuilder.cellHeight * GlyphAtlasBuilder.scale;
    const canvas = document.createElement("canvas");
    canvas.width = width * ramp.length;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context) {
      context.font = font;
      context.fillStyle = "#fff";
      context.textAlign = "center";
      context.textBaseline = "middle";
      ramp.forEach((glyph, index) => {
        context.fillText(glyph, width * index + width / 2, height / 2);
      });
    }
    const texture = new CanvasTexture(canvas);
    texture.minFilter = LinearFilter;
    texture.generateMipmaps = false;
    return {
      texture,
      count: ramp.length,
      cellWidth: GlyphAtlasBuilder.cellWidth,
      cellHeight: GlyphAtlasBuilder.cellHeight,
    };
  }

  private static ramp(font: string): string[] {
    const size = 32;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return Array.from(GlyphAtlasBuilder.candidates.slice(0, GlyphAtlasBuilder.levels));
    }
    context.font = font;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const measured = Array.from(GlyphAtlasBuilder.candidates).map((glyph) => {
      context.clearRect(0, 0, size, size);
      context.fillStyle = "#fff";
      context.fillText(glyph, size / 2, size / 2);
      const pixels = context.getImageData(0, 0, size, size).data;
      let ink = 0;
      for (let index = 3; index < pixels.length; index += 4) {
        ink += pixels[index];
      }
      return { glyph, ink };
    });
    measured.sort((a, b) => {
      return a.ink - b.ink;
    });
    const darkest = measured[measured.length - 1].ink;
    return Array.from({ length: GlyphAtlasBuilder.levels }, (_, level) => {
      const target = (darkest * level) / (GlyphAtlasBuilder.levels - 1);
      return measured.reduce((best, entry) => {
        if (Math.abs(entry.ink - target) < Math.abs(best.ink - target)) {
          return entry;
        }
        return best;
      }).glyph;
    });
  }
}
