import { apiClient } from "./client";

export const authApi = {
  register: (payload) => apiClient.request("/auth/register", { method: "POST", auth: false, body: payload }),
  login: async (payload) => {
    const tokens = await apiClient.request("/auth/login", { method: "POST", auth: false, body: payload });
    apiClient.setTokens(tokens.access_token, tokens.refresh_token);
    return tokens;
  },
  me: () => apiClient.request("/auth/me"),
  logout: async () => {
    const refreshToken = apiClient.getRefreshToken();
    if (refreshToken) {
      try {
        await apiClient.request("/auth/logout", {
          method: "POST",
          body: { refresh_token: refreshToken },
        });
      } catch {
        // Ignore logout errors, tokens will still be cleared locally.
      }
    }
    apiClient.clearTokens();
  },
};

export const learningApi = {
  listSkills: () => apiClient.request("/skills"),
  createSkill: (payload) => apiClient.request("/skills", { method: "POST", body: payload }),
  createSubSkill: (skillId, payload) => apiClient.request(`/skills/${skillId}/sub-skills`, { method: "POST", body: payload }),
  createTask: (skillId, payload) => apiClient.request(`/skills/${skillId}/tasks`, { method: "POST", body: payload }),
  createCommitment: (skillId, payload) => apiClient.request(`/skills/${skillId}/commitment`, { method: "POST", body: payload }),
  getCommitment: (skillId) => apiClient.request(`/skills/${skillId}/commitment`),

  startSession: (payload) => apiClient.request("/sessions/start", { method: "POST", body: payload }),
  logPomodoro: (sessionId, payload) => apiClient.request(`/sessions/${sessionId}/pomodoro`, { method: "POST", body: payload }),
  endSession: (sessionId, payload) => apiClient.request(`/sessions/${sessionId}/end`, { method: "POST", body: payload }),
  listSessions: () => apiClient.request("/sessions"),

  listFlashcards: (query = "") => apiClient.request(`/flashcards${query}`),
  createFlashcard: (payload) => apiClient.request("/flashcards", { method: "POST", body: payload }),
  reviewFlashcard: (cardId, payload) => apiClient.request(`/flashcards/${cardId}/review`, { method: "POST", body: payload }),
  flashcardStats: (query = "") => apiClient.request(`/flashcards/stats${query}`),

  listJournal: (query = "") => apiClient.request(`/journal${query}`),
  createJournalEntry: (payload) => apiClient.request("/journal", { method: "POST", body: payload }),
};

export const gamificationApi = {
  profile: () => apiClient.request("/gamification/profile"),
  streak: () => apiClient.request("/gamification/streak"),
  leaderboard: (limit = 10) => apiClient.request(`/gamification/leaderboard?limit=${limit}`),
  rewardsHistory: () => apiClient.request("/gamification/rewards/history"),
  rewardsPool: () => apiClient.request("/gamification/rewards/pool"),
  badges: () => apiClient.request("/gamification/badges"),
  allBadges: () => apiClient.request("/gamification/badges/all"),
  streakCalendar: (days = 30) => apiClient.request(`/gamification/streak/calendar?last_days=${days}`),
  buyFreeze: () => apiClient.request("/gamification/streak/freeze", { method: "POST" }),
};

export const notificationApi = {
  list: (query = "") => apiClient.request(`/notifications${query}`),
  readOne: (notificationId) => apiClient.request(`/notifications/${notificationId}/read`, { method: "POST" }),
  readAll: () => apiClient.request("/notifications/read-all", { method: "POST" }),
  getPreferences: () => apiClient.request("/notifications/preferences"),
  updatePreferences: (preferences) =>
    apiClient.request("/notifications/preferences", { method: "PUT", body: { preferences } }),
};

export { apiClient };
