/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    devIndicators: {
        appIsrStatus: false,
        buildActivityPosition: 'bottom-right',
    },
};

export default nextConfig;
