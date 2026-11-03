import { app } from "./app.js";
import { initUpstream } from "./upstream.js";

const port = process.env.PORT ?? 3000;

await initUpstream();

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
