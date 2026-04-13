import axios from "axios";

export const URL_API_LOCAL = "http://localhost:3000";

const API = axios.create({
  baseURL: URL_API_LOCAL, 
});

export default API;