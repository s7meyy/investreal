/** @type {import('next').NextConfig} */
const nextConfig = {
  // المحرّك حزمة TypeScript مصدرية تُترجم مع التطبيق.
  transpilePackages: ['@investreal/engine'],
  webpack(config) {
    // المحرّك يستورد بلاحقة `.js` (وهو الشكل الصحيح لوحدات ESM)،
    // فنوجّه الحزم إلى ملفات `.ts` المقابلة بدل خطوة بناء وسيطة.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};
export default nextConfig;
