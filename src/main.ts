import { mount } from "svelte";
import App from "./App.svelte";
// The physics of a panel — screws, grain, lamps, meters — shared by every
// manufacturer and loaded once, globally. See src/cockpit/substrate.css.
import "./cockpit/substrate.css";

const target = document.getElementById("app");
if (!target) throw new Error("missing #app mount point");

export default mount(App, { target });
