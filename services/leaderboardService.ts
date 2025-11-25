
import { LeaderboardEntry } from '../types';
import { PANTRY_CONFIG, DEFAULT_LEADERBOARD } from '../constants';

const BASE_URL = `https://getpantry.cloud/apiv1/pantry/${PANTRY_CONFIG.ID}/basket/${PANTRY_CONFIG.BASKET_NAME}`;

export const LeaderboardService = {
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    try {
      const response = await fetch(BASE_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // If 404, basket might not exist yet. Initialize it.
        if (response.status === 404) {
             console.log("Basket not found, creating default.");
             await this.saveLeaderboard(DEFAULT_LEADERBOARD);
             return DEFAULT_LEADERBOARD;
        }
        throw new Error("Failed to fetch leaderboard");
      }

      const data = await response.json();
      // Pantry stores just the JSON object. We assume the basket content has a key "entries"
      // If we saved it as just the array directly, data itself is the object.
      // Let's assume structure { entries: [] } to be safe, or just an array if we posted an array.
      // For simplicity in previous prompts, we usually post { entries: [...] }
      
      if (data.entries && Array.isArray(data.entries)) {
        return data.entries;
      } else if (Array.isArray(data)) {
        return data; // If we saved strictly as array
      }
      
      return DEFAULT_LEADERBOARD;

    } catch (error) {
      console.error("Leaderboard fetch error:", error);
      return DEFAULT_LEADERBOARD;
    }
  },

  async saveLeaderboard(entries: LeaderboardEntry[]): Promise<void> {
    try {
      // Pantry requires a JSON body. 
      const payload = { entries: entries };
      
      await fetch(BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error("Leaderboard save error:", error);
    }
  },

  async submitScore(entry: LeaderboardEntry): Promise<LeaderboardEntry[]> {
    // 1. Fetch current
    const current = await this.getLeaderboard();
    
    // 2. Append new score
    const updated = [...current, entry];
    
    // 3. Sort descending
    updated.sort((a, b) => b.score - a.score);
    
    // 4. Slice top 10 (or 100, let's keep it manageable)
    const top10 = updated.slice(0, 10);
    
    // 5. Save back
    await this.saveLeaderboard(top10);
    
    return top10;
  }
};
