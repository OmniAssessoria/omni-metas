import express, { Application } from "express";
import cors, { CorsOptions } from "cors";
import RouterController from "./routes/rotas.router";

class App {
  public server: Application;

  constructor() {
    this.server = express();
    this.middleware();
    this.routes();
  }

  private middleware() {
    const corsOptions: CorsOptions = {
      origin: [
        "http://localhost:3035",
        "http://127.0.0.1:3035",
        "http://192.168.0.149:3035",
        "http://10.197.254.224:3035",
      ],

      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Accept", "token"],
      credentials: true,
      optionsSuccessStatus: 200,
    };

    this.server.use(cors(corsOptions));

    this.server.use(express.json({ limit: "50mb" }));
    this.server.use(express.urlencoded({ extended: true, limit: "50mb" }));
  }

  private routes() {
    const routerController = new RouterController();
    this.server.use(routerController.retornarRotas());
  }
}

export default new App().server;
