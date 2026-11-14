/** Runs before first paint so the page never flashes the wrong theme. Plain module, safe for server components. */
export const THEME_KEY = "eco.theme";
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
