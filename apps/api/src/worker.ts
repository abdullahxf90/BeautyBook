import { processNext } from "./lib/queue";

async function main() {
  console.log("[Worker] Started — waiting for jobs...");
  setInterval(async () => {
    try {
      await processNext();
    } catch (err) {
      console.error("[Worker] Error processing job:", err);
    }
  }, 1000);
}

main().catch(console.error);
