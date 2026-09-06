// Public API address; no credentials are shipped to the browser.
export function communityAPI(){return ['localhost','127.0.0.1','[::1]'].includes(location.hostname)?undefined:'https://little-world-postcards.youyoucandlin.chatgpt.site/api/';}
