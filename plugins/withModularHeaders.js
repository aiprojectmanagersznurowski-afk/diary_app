const { withPodfile } = require('@expo/config-plugins');

// Bez tego `pod install` pada na: "The following Swift pods cannot yet be integrated as static
// libraries: AppCheckCore depends upon GoogleUtilities and RecaptchaInterop, which do not define
// modules" — transytywna zależność @react-native-google-signin/google-signin (pod GoogleSignIn).
// ios/ jest generowane (CNG), więc ta linijka musi wracać przy każdym `expo prebuild`.
module.exports = function withModularHeaders(config) {
  return withPodfile(config, (config) => {
    if (!config.modResults.contents.includes('use_modular_headers!')) {
      config.modResults.contents = config.modResults.contents.replace(
        /^prepare_react_native_project!/m,
        'use_modular_headers!\nprepare_react_native_project!',
      );
    }
    return config;
  });
};
