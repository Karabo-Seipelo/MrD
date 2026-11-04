import { ping } from "@mrd/db";
import { app } from "./app.js";

const port = process.env.PORT ?? 3000;

if (process.env.USE_DATABASE !== "1") {
  throw new Error(
    "USE_DATABASE=1 is required; seed Postgres with pnpm db:seed after supabase start",
  );
}

await ping();

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
