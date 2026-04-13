import axios from "axios";

const TOKEN_PIPERUN = "3dfa1682a3832478cb29a7b9a4c86233";

const apiPipeRunRest = axios.create({
  baseURL: "https://api.pipe.run/v1",
  headers: {
    accept: "application/json",
    "content-type": "application/json",
    token: TOKEN_PIPERUN,
  },
});

export { TOKEN_PIPERUN, apiPipeRunRest };
