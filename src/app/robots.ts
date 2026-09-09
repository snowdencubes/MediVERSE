import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/patient/staff/', '/doctor/'],
    },
    sitemap: 'https://mediverse.vercel.app/sitemap.xml',
  }
}
