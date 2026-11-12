// 원스토어 앱 안에서 실행될 때 SDK와 연결합니다. 일반 브라우저에서는 아무 일도 하지 않습니다.
import { createSDK } from "https://h5sdk.onestore.net/lib/v1.1.0/onestore-h5-sdk.min.js";

const sdk = createSDK();
sdk.on("pause", () => {});
sdk.on("resume", () => {});
sdk.initializeAsync()
  .then((info) => {
    if (info && info.err) return; // 원스토어 앱 밖(일반 브라우저)
    sdk.setLoadingProgress(100);
    return sdk.startGameAsync();
  })
  .catch((e) => console.warn("onestore sdk", e && (e.reason || e.message)));
