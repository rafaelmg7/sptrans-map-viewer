import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { pathToFileURL } from "node:url";
import { createApp, normalizePrevisao } from "./app.js";

export { createApp, normalizePrevisao };

export function createDefaultClient() {
  const jar = new CookieJar();
  return wrapper(axios.create({ jar, withCredentials: true }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = process.env.PORT || 3000;
  const app = createApp({ client: createDefaultClient() });

  app.listen(port, () => {
    console.log(`Proxy rodando em http://localhost:${port}`);
  });
}
