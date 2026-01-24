// App configuration for Expo
// AI API keys have been moved to the backend for security

export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      // Note: AI extraction is now handled by the backend
      // No API keys should be exposed in the frontend
    },
  };
};
