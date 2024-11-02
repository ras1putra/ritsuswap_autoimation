
# Ritsu Swap Bot

This automation tool is used to automate exchanges from ETH to WETH and vice versa on the ritsu.xyz taiko chain

## Prerequisites

- Node.js v20 or above
- OKX Walet (I don't use metamask because slow transaction process)
- Google Chrome with developer option enabled

## Get started

Copy .env.example to .env. Fill wsChromeEndpointUrl with your url.
You can find the tutorial on internet

```bash
copy .env.example .env
```

To run the project

```bash
node --experimental-strip-types index.ts
```

## Notes
- Your OKEx wallet must be on the taiko chain and logged in
- Maybe you need to fix the selector with yours because of the difference in elements
- If you have any question, contact me: @ras1_putra
