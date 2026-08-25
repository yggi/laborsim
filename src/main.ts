import { mount } from "svelte";
import App from "./App.svelte";
// The physics of a panel — screws, grain, lamps, meters — shared by every
// manufacturer and loaded once, globally. See src/cockpit/substrate.css.
import "./cockpit/substrate.css";
// The cab's own tokens, which belong to the vehicle rather than to a maker.
import "./cockpit/cab.css";

const target = document.getElementById("app");
if (!target) throw new Error("missing #app mount point");

export default mount(App, { target });
