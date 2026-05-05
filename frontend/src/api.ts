import axios from "axios";

const baseURL = (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:3333/api";

export const STORAGE_ACCESS_TOKEN = "scq.accessToken";

export const api = axios.create({
  baseURL,
  timeout: 25_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(STORAGE_ACCESS_TOKEN);
  if (token && isLikelyJwt(token)) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

function isLikelyJwt(value: string) {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value.trim());
}

export { isLikelyJwt };
