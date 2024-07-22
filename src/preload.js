window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector);
      if (element) element.innerText = text;
    };
  
    for (const dependency of ['chrome', 'node', 'electron']) {
      replaceText(`${dependency}-version`, process.versions[dependency]);
    }
    
  });
  

  
// "build": {
//     "appId": "com.abshrms.biometric",
//     "productName": "Biometric",
//     "directories": {
//       "output": "dist"
//     },
//     "files": [
//       "src/**/*",
//       "index.js"
//     ],
//     "mac": {
//       "category": "your.app.category.type"
//     },
//     "win": {
//       "target": "nsis"
//     },
//     "nsis": {
//       "oneClick": false,
//       "perMachine": true,
//       "allowToChangeInstallationDirectory": true,
//       "createDesktopShortcut": true,
//       "createStartMenuShortcut": true,
//       "runAfterFinish": true
//     }
//   },