# Backyard Lighting Dashboard

A simple static WLED control dashboard for a dedicated backyard lighting network. It is built with plain HTML, CSS, and JavaScript only, so there is no backend, build step, npm install, or framework.

## Run locally

Open `index.html` in Chrome. On the Android tablet, copy this folder to the tablet or serve it from any simple local file share and open `index.html`.

## Demo Mode

Demo Mode is enabled by default. In Demo Mode the app does not contact real WLED controllers. It simulates WLED responses with a short delay and occasionally marks a controller offline so the dashboard can show error handling.

The header clearly shows:

`Demo Mode - no real lights connected.`

## Live Mode

Use the Demo Mode toggle in the admin panel at the bottom of the dashboard. When Demo Mode is off, the app sends WLED JSON API requests to each controller:

`http://CONTROLLER_IP/json/state`

The tablet and every WLED controller must be connected to the same Wi-Fi network. For this install, that network is expected to be the TP-Link travel router SSID:

`BackyardLights`

## Edit controller IP addresses

Controller IPs are defined near the top of `app.js` in the `controllers` array:

```js
const controllers = [
  { id: "kitchen", name: "Kitchen", ip: "192.168.0.71", group: "Kitchen" }
];
```

Replace the placeholder IP addresses with the real reserved IPs after the WLED controllers are installed.

## TP-Link router DHCP reservations

After each WLED controller joins the `BackyardLights` Wi-Fi network:

1. Open the TP-Link router admin page.
2. Find the DHCP client list.
3. Identify each WLED controller by hostname, MAC address, or current IP.
4. Add an address reservation for each controller.
5. Use the reserved IPs in the `controllers` array in `app.js`.
6. Restart or reconnect the WLED controllers so they receive the reserved addresses.

Use stable reservations so the tablet always sends commands to the correct controller.

## WLED API notes

The dashboard uses WLED JSON API POST requests. Common payload examples:

```json
{ "on": true }
```

```json
{ "bri": 128 }
```

```json
{ "seg": [{ "col": [[255, 160, 80]] }] }
```

```json
{ "seg": [{ "fx": 0 }] }
```

## Troubleshooting

- Confirm the tablet is on the `BackyardLights` Wi-Fi network.
- Confirm the controller IP addresses in `app.js`.
- Confirm WLED responds at `http://IP/json`.
- Confirm Live Mode is enabled in the dashboard.
- Confirm each controller has power and a strong Wi-Fi signal.

## Files

- `index.html` contains the dashboard structure.
- `styles.css` contains tablet-friendly dark mode styling.
- `app.js` contains controller config, WLED helpers, scenes, Demo Mode, and Live Mode behavior.
- `README.md` contains setup and troubleshooting notes.
