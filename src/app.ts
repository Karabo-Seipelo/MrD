import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { productsRouter } from "./routes/products.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../client")));
app.use(productsRouter);
