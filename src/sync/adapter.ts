import { AppStateData } from "../models/types";

export interface SyncAdapter {
  load(): Promise<AppStateData>;
  save(state: AppStateData): Promise<{ ok: boolean }>;
}
