import app from "./app.js";
import 'dotenv/config';

async function Servidor() {
  app.listen(3000, () => {
    console.log("Server está rodando http://localhost:3000");
  });
}

Servidor();