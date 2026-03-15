import express, { Application } from 'express';
import cors from 'cors';
import RouterController from './routes/rotas.router';
class App {
    public server: Application;

    constructor() {
        this.server = express();
        this.middleware();
        this.routes();
    }

    private middleware() {
        this.server.use(cors());
        this.server.use(express.json());
        this.server.use(express.urlencoded({ extended: true }));
    }

    private routes() {
        const routerController = new RouterController();
        this.server.use(routerController.retornarRotas());
    }
}

export default new App().server;
