import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/', '/admin/', '/ayarlar/', '/api/'],
        },
        sitemap: 'https://ortakbarkod.com/sitemap.xml', // Replace with real domain if different
    };
}
