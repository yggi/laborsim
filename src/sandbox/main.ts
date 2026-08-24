import { mount } from "svelte";
// The substrate the whole cockpit stands on. Loaded here too, because the
// sandbox has to render what the app renders — if a maker's theme looks right
// here and wrong in the cab, the sandbox was lying.
import "../cockpit/substrate.css";
import Sandbox from "./Sandbox.svelte";

const target = document.getElementById("sandbox");
if (!target) throw new Error("missing #sandbox mount point");

export default mount(Sandbox, { target });
