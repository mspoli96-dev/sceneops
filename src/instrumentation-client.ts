import { initBotId } from "botid/client/core";

initBotId({ protect: [{ path: "/api/query", method: "POST" }] });
