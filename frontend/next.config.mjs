/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    devIndicators: {
        appIsrStatus: false,
        buildActivityPosition: 'bottom-right',
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
