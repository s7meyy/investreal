/** @type {import('next').NextConfig} */
const nextConfig = {
  // التطبيق كله يعمل على العميل: لا خوادم ولا واجهات برمجية، والمحرّك
  // يُحسب في المتصفح. التصدير الثابت أبسط وأسرع، ويعني أن بيانات
  // المستثمر لا تغادر جهازه أصلاً.
  output: 'export',
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
