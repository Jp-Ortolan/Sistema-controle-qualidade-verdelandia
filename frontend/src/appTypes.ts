export const VIDEO_TOKEN = "scq-video-local-mode";

export type ApiProducer = { id: number; name: string; city: string; phone: string };
export type ApiAnalysis = {
  id: number;
  producerId: number;
  stickPercent: number;
  discountPercent: number;
  createdAt: string;
  producer: ApiProducer;
};
export type ApiPackagingParam = {
  id: number;
  sheetId?: number;
  name: string;
  result: string;
  unit: string;
  standard: string;
  status: "C" | "NC";
};
export type ApiPackagingSheet = {
  id: number;
  formCode: string;
  lot: string;
  supplier: string;
  observations: string | null;
  overallStatus: "C" | "NC";
  createdAt: string;
  parameters: ApiPackagingParam[];
};
export type ApiSampleCollection = {
  id: number;
  productType: string;
  destination: string;
  notes: string | null;
  createdAt: string;
};
