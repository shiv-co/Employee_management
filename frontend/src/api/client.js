import axios from "axios";

// fixed api base URL to point to the deployed backend on Vercel
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "https://employee-management-bay-seven.vercel.app/api",
  headers: {
    "Content-Type": "application/json"
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
