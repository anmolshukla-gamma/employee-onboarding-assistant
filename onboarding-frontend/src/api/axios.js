import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL });

// Attach the JWT to every request if we have one.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Centralized 401 handling: drop the token and bounce to login.
// We avoid importing the router here to keep this module dependency-free;
// AuthContext listens for this event instead.
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Centralized 401 handling with silent token refresh:
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    // If no response or not a 401, or already retried, reject immediately
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // Do not attempt to refresh for login or refresh endpoints
    const url = originalRequest?.url || "";
    if (url.includes("/auth/login") || url.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Call refresh using base axios to bypass interceptors
      const { data } = await axios.post(`${baseURL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const { access_token, refresh_token: newRefreshToken } = data;
      localStorage.setItem("access_token", access_token);
      if (newRefreshToken) {
        localStorage.setItem("refresh_token", newRefreshToken);
      }

      api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
      originalRequest.headers.Authorization = `Bearer ${access_token}`;

      processQueue(null, access_token);
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export function extractErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (error?.response?.status === 429) {
    return "Too many requests. Please wait a minute and try again.";
  }
  
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => d.msg || d).join(", ");
  }
  if (error?.message) return error.message;
  return fallback;
}

export default api;
