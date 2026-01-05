import { AppStateData } from "../models/types";
import { SyncAdapter } from "./adapter";

export class ManualEndpointAdapter implements SyncAdapter {
  constructor(private endpoint: string) {}

  async load(): Promise<AppStateData> {
    const response = await fetch(`${this.endpoint}?action=load`, {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`Sync load failed: ${response.status}`);
    }
    return response.json();
  }

  async save(state: AppStateData): Promise<{ ok: boolean }> {
    const response = await fetch(`${this.endpoint}?action=save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    if (!response.ok) {
      throw new Error(`Sync save failed: ${response.status}`);
    }
    return response.json();
  }
}
