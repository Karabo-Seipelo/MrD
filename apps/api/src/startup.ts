import { ping } from "@mrd/db";
import { app } from "./app.js";

export const USE_DATABASE_REQUIRED_MESSAGE =
  "USE_DATABASE=1 is required; seed Postgres with pnpm db:seed after supabase start";

export function databaseEnvError(): string | null {
  if (process.env.USE_DATABASE !== "1") {
    return USE_DATABASE_REQUIRED_MESSAGE;
  }
  return null;
}

export async function startServer(): Promise<void> {
  const envError = databaseEnvError();
  if (envError) {
    throw new Error(envError);
  }

  await ping();

  const port = Number(process.env.PORT ?? 3000);

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
      resolve();
    });
    server.on("error", reject);
  });
}
