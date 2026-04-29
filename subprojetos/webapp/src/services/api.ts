import axios from "axios";

export const URL_API_LOCAL = import.meta.env.VITE_API_URL || "http://localhost:3333";

const API = axios.create({
  baseURL: URL_API_LOCAL, 
});

export default API;