import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import { defineConfig } from "@opennextjs/cloudflare/config";

export default defineConfig({
  ...defineCloudflareConfig(),
});
