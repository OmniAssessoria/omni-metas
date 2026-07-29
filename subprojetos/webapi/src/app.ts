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
      origin: function (origin, callback) {
        if (!origin) {
          return callback(null, true);
        }
        
        callback(null, true); 
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: "*", 
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
