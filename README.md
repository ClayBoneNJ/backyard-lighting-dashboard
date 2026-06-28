# Backyard Lighting Dashboard

A tiny static WLED control surface for the `BackyardLights` travel-router network.

The app currently controls two real WLED controllers:

```text
Cabana   192.168.0.161
Kitchen  192.168.0.31
```

## Run

Open `index.html` in Chrome on a device connected to the `BackyardLights` Wi-Fi network.

There is no backend, build step, npm install, framework, or internet requirement.

## Current Controls

Each controller card supports:

- Power
- Brightness
- Color
- Effect
- Test

## WLED API

The dashboard sends local WLED JSON API requests directly to:

```text
http://CONTROLLER_IP/json/state
```

The tablet/laptop and WLED controllers must be on the same local network.
