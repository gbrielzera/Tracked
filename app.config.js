const fs = require('fs');
const path = require('path');

// O Expo exige que o google-services.json exista quando é citado. Por isso só o citamos se o
// arquivo estiver na raiz: sem ele o app roda normalmente, só que sem push no Android.
module.exports = ({ config }) => {
  const hasFirebaseFile = fs.existsSync(path.join(__dirname, 'google-services.json'));
  return {
    ...config,
    android: {
      ...config.android,
      ...(hasFirebaseFile ? { googleServicesFile: './google-services.json' } : {}),
    },
  };
};
