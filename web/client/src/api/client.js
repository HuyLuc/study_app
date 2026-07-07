const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

const ACCESS_TOKEN_KEY = "study_app_access_token";
const REFRESH_TOKEN_KEY = "study_app_refresh_token";

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY) || "";
    this.refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || "";
    this.refreshPromise = null;
  }

  getAccessToken() {
    return this.accessToken;
  }

  getRefreshToken() {
    return this.refreshToken;
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken || "";
    this.refreshToken = refreshToken || "";

    if (this.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, this.accessToken);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }

    if (this.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, this.refreshToken);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }

  clearTokens() {
    this.setTokens("", "");
  }

  async request(path, options = {}) {
    const {
      method = "GET",
      body,
      auth = true,
      retryOnUnauthorized = true,
      headers = {},
    } = options;

    const requestHeaders = {
      ...headers,
    };

    if (body !== undefined) {
      requestHeaders["Content-Type"] = "application/json";
    }

    if (auth && this.accessToken) {
      requestHeaders.Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401 && auth && retryOnUnauthorized && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        return this.request(path, {
          ...options,
          retryOnUnauthorized: false,
        });
      }
    }

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = payload?.detail || payload?.message || `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, payload);
    }

    return payload;
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      return false;
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refresh_token: this.refreshToken }),
        });

        if (!response.ok) {
          this.clearTokens();
          return false;
        }

        const payload = await response.json();
        this.setTokens(payload.access_token, payload.refresh_token);
        return true;
      } catch {
        this.clearTokens();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }
}

export const apiClient = new ApiClient();
export { ApiError };
