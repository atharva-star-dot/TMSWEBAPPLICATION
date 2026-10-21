# Sarthiwala Control Room

A Fire TV dashboard and Alexa voice layer for small fleet operators. One TV on the office wall shows every truck; ask Alexa "where is truck 3?" and the TV opens that truck.

```
shared/fleet.json  -> tv-app (React Native for Vega, Fire TV)
                   -> voice-mcp (MCP server + HTTP bridge for Alexa+)
```

## Run the voice server
```
cd voice-mcp && npm install && npm test && npm start
curl "http://localhost:8787/ask?tool=truck_location&arg=3"   # demo without Alexa
```
Tools: `truck_location(truckId)`, `trip_status()`, `payments_due()`, `driver_checkin(driverName)`.

## Run the TV app
1. Install the Vega SDK and its VS Code extension (Vega Studio) from the Amazon developer docs.
2. Create a project from the `hello-world` template, then copy `tv-app/src` into it and point the template's entry file at `src/App.tsx`.
3. Enable `"resolveJsonModule": true` in tsconfig.json (the app imports `fleet.json`).
4. Run it in the Vega Virtual Device. If the simulator can't reach `localhost`, set your computer's LAN IP in `src/config.ts`.
5. Keep `tv-app/src/data/fleet.json` in sync with `shared/fleet.json` (`cp shared/fleet.json tv-app/src/data/`).

## Notes
Data is mock. Trucks advance on a timer to simulate live updates. Licensed MIT.
