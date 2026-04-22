import { LosslessAPI } from "@bitperfect/shared/api";
import instances from "@/instances.json";

const settings = {
  getInstances: async () => instances as string[],
  streamProxy: "/api/stream",
};

export const api = new LosslessAPI(settings);
