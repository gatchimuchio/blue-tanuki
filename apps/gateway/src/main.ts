import { createLogger } from "@blue-tanuki/core";
import { runGatewayCliRouter } from "./cli_router.js";

export { buildAuditLog, AUDIT_FILENAME } from "./audit_config.js";

const gatewayLog = createLogger({ scope: "gateway" });

runGatewayCliRouter().catch((e) => {
  gatewayLog.error("fatal", {
    error: e instanceof Error ? e.message : String(e),
  });
  process.exit(1);
});
