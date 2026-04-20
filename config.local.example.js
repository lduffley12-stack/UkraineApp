// ---------------------------------------------------------------------------
// HOW TO USE THIS FILE
//
// 1. Copy this file and rename the copy to   config.local.js
//    (On macOS/Linux:  cp config.local.example.js config.local.js)
//    (On Windows:      copy config.local.example.js config.local.js)
//
// 2. Paste your Azure Speech KEY 1 between the quotes where it says
//    "PASTE_YOUR_AZURE_KEY_HERE" and set the region to match what you
//    picked in the Azure portal (e.g. "eastus", "westus2", "westeurope").
//
// 3. Save the file. Reload the app. You should see "Using Polina (Azure
//    Speech)" under the Hear-it button.
//
// The file config.local.js is listed in .gitignore and will NOT be
// committed to Git, so your key stays on your own machine.
// ---------------------------------------------------------------------------

window.UKRAINE_APP_CONFIG = {
  voice: {
    provider: "azure",           // "azure" or "system"
    azure: {
      key:    "PASTE_YOUR_AZURE_KEY_HERE",
      region: "eastus",          // e.g. "eastus", "westus2", "westeurope"
      voice:  "uk-UA-PolinaNeural", // or "uk-UA-OstapNeural" for the male voice
    },
  },
};
