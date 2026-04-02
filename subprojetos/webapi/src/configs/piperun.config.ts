import axios from "axios";


export const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";
export const HASH_GANHOS = "c1d9312f-db68-4379-8820-a5d3619ec002";
export const FUNIS_PERDAS = [93990, 91356, 103176, 91369, 77127, 90697, 102509];

export const apiPipeRun = axios.create({
    baseURL: "https://api.pipe.run/v1",
    headers: { "accept": "application/json", "token": TOKEN_PIPERUN },
});

export const apiInterna = axios.create({
    baseURL: "http://localhost:3000/api",
    headers: { "Content-Type": "application/json" },
});