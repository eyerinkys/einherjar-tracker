export interface BodyweightEntry {
  id: string;
  date: string;
  weightKg: number;
  notes?: string;
}

export interface BodyweightSummaryDTO {
  currentWeight: number | null;
  startWeight: number | null;
  startDate: string | null;
  netChange: number | null;
  trend: number | null;
  logs: BodyweightEntry[];
}
