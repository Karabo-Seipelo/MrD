import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { productsRouter } from "./routes/products.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

/** From `apps/api/src` or `apps/api/dist`, two levels up is `apps/`, then `web`. */
export const webStaticRoot = path.join(__dirname, "../../web");

app.use(express.json());
app.use(express.static(webStaticRoot));
app.use(productsRouter);
