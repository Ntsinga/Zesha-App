// App configuration for Expo
// This file allows us to use environment variables in the app

export default ({ config }) => {
  const geminiKey =
    process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  const openaiKey =
    process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

  return {
    ...config,
    extra: {
      ...config.extra,
      geminiApiKey: geminiKey,
      openaiApiKey: openaiKey,
    },
  };
};
