const API_URL = "http://localhost:3000/api";
window.API_URL = API_URL;

if (!document.querySelector('script[src="js/content.js"]')) {
    const contentScript = document.createElement("script");
    contentScript.src = "js/content.js";
    document.head.appendChild(contentScript);
}
