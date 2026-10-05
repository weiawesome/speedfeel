# speedfeel

[![CI dev](https://img.shields.io/github/actions/workflow/status/weiawesome/speedfeel/ci-check.yml?branch=dev&label=CI%20dev)](https://github.com/weiawesome/speedfeel/actions/workflows/ci-check.yml?query=branch%3Adev)
[![CI main](https://img.shields.io/github/actions/workflow/status/weiawesome/speedfeel/ci-check.yml?branch=main&label=CI%20main)](https://github.com/weiawesome/speedfeel/actions/workflows/ci-check.yml?query=branch%3Amain)
[![CodeQL](https://img.shields.io/github/actions/workflow/status/weiawesome/speedfeel/ci-codeql.yml?branch=main&label=CodeQL)](https://github.com/weiawesome/speedfeel/actions/workflows/ci-codeql.yml)
[![MIT](https://img.shields.io/github/license/weiawesome/speedfeel)](LICENSE)

選一個網速，看長片、短影音和動態實際是什麼感覺。方案上的 Mbps 只是數字，這裡讓等待、緩衝和畫質變成看得到的事。

站點：<https://weiawesome.github.io/speedfeel/>

## 它在做什麼

台灣的通訊方案通常寫月租，和一個 Mbps。這個速度會不會讓人乾等、畫面卡不卡、畫質撐不撐得住，單上沒寫。speedfeel 讓你選一個 Mbps，或先量這個網站自己的下載速度，然後看這三種畫面。

打開頁面會自動量一次下載速度，只量這一次。量完，滑桿停在測到的 Mbps。滑桿問的是「如果方案是這個 Mbps，會是什麼感覺」，可以拉得比剛測到的更快，也可以更慢。上面的 3G、4G、5G 是速度帶，不是一個固定的數字。

## 三個畫面

| 畫面 | 你會看到 |
| --- | --- |
| 影片 | 長片。畫質在播放器裡面，從 240p 到 2160p，也可以交給自動。進度條可以拖，放開後會重新緩衝。 |
| 短影音 | 上下滑。畫質在播放器外面，最高 1080p。 |
| 動態 | 字先到，圖和影片依序出現。 |

每個畫面外面有一個循環圖示。影片和短影音會換成另一種播放器，動態會換成另一種版面。說明文字會寫這個畫質每秒要多少、現在的管子是多少、播不播得動。按「重來」只把這段模擬再跑一次，不會重新測速。

怎麼操作、速度帶會跳到哪，寫在 [使用](docs/使用.md)。

## 畫面從哪來

畫面是這個網站自己畫的，用來模擬等待、緩衝和畫質。測到的是開這個網站時的下載速度。別的網站不一定一樣，對方的伺服器也會影響。

這個網站不計算一個月的流量什麼時候用完。為什麼要做、為什麼只有中文，站內有 [`/why`](https://weiawesome.github.io/speedfeel/why)，較長的版本在 [初衷](docs/初衷.md)。

## 文件

- [使用](docs/使用.md)：打開網站之後怎麼看網速。
- [開發](docs/開發.md)：本地怎麼跑、程式放在哪、分支怎麼走。
- [初衷](docs/初衷.md)：為什麼做這個，以及為什麼只有中文。

## 本地看看

```bash
npm install
npm run dev
```

同一網路的手機要看：

```bash
npm run dev -- --host 0.0.0.0
```

技術是 Vite、React、Tailwind、TypeScript。測試、無障礙檢查、分支和發版寫在 [開發](docs/開發.md)。

## 授權

[MIT](LICENSE)。著作權人是 Tcweeei。
