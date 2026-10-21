import assert from "node:assert";
import { truckLocation, tripStatus, paymentsDue, driverCheckin } from "./tools.js";
console.log(truckLocation(3).text); assert.equal(truckLocation(3).highlight, 3);
console.log(tripStatus().text);
console.log(paymentsDue().text);
console.log(driverCheckin("ramesh").text); assert.equal(driverCheckin("ramesh").highlight, 1);
assert.match(truckLocation(99).text, /couldn't find/);
console.log("ok");
