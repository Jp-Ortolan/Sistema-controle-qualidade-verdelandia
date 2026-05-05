/** Modo apresentação: dados só no navegador (localStorage), sem API — útil para vídeo quando o backend falha. */

import type { ApiAnalysis, ApiPackagingSheet, ApiProducer, ApiSampleCollection } from "./appTypes";

export { VIDEO_TOKEN } from "./appTypes";

const LS_KEY = "scq.video.snapshot";

export type VideoSnapshot = {
  nextId: number;
  producers: ApiProducer[];
  analyses: ApiAnalysis[];
  fichas: ApiPackagingSheet[];
  coletas: ApiSampleCollection[];
};

export function emptyVideoSnapshot(): VideoSnapshot {
  return { nextId: 1, producers: [], analyses: [], fichas: [], coletas: [] };
}

export function loadVideoSnapshot(): VideoSnapshot {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      return emptyVideoSnapshot();
    }
    const parsed = JSON.parse(raw) as VideoSnapshot;
    if (!parsed || typeof parsed.nextId !== "number") {
      return emptyVideoSnapshot();
    }
    return {
      nextId: parsed.nextId,
      producers: Array.isArray(parsed.producers) ? parsed.producers : [],
      analyses: Array.isArray(parsed.analyses) ? parsed.analyses : [],
      fichas: Array.isArray(parsed.fichas) ? parsed.fichas : [],
      coletas: Array.isArray(parsed.coletas) ? parsed.coletas : [],
    };
  } catch {
    return emptyVideoSnapshot();
  }
}

export function saveVideoSnapshot(s: VideoSnapshot) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

export function calculateDiscountLocal(stickPercent: number): number {
  if (stickPercent <= 2.5) {
    return 0;
  }
  return Number(((stickPercent - 2.5) * 0.5).toFixed(2));
}
