import { LosslessAPI } from "@bitperfect/shared";

const instances = [
  "https://triton.squid.wtf",
  "https://wolf.qqdl.site",
  "https://maus.qqdl.site",
  "https://vogel.qqdl.site",
  "https://katze.qqdl.site",
  "https://hund.qqdl.site",
  "https://tidal.kinoplus.online",
  "https://tidal-api.binimum.org",
];

export const api = new LosslessAPI({
  getInstances: async () => instances,
});
