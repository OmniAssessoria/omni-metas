import axios from "axios";

const TOKEN_PIPERUN = "cbfdb0becb96556b9d76f8bbf7f5efd6";

const apiPipeRunRest = axios.create({
  baseURL: "https://api.pipe.run/v1",
  headers: {
    accept: "application/json",
    "content-type": "application/json",
    token: TOKEN_PIPERUN,
  },
});

export { TOKEN_PIPERUN, apiPipeRunRest };
