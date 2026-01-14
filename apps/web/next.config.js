/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // experimental: {
    //     serverActions: true,
    // },
    images: {
        domains: ['localhost', 'avatars.githubusercontent.com', 'images.unsplash.com'],
    },
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                destination: 'http://localhost:3001/api/v1/:path*',
            },
        ];
    },
};

module.exports = nextConfig;
