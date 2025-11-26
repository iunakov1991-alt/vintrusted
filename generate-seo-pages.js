#!/usr/bin/env node

/**
 * SEO Page Generator
 * Generates SEO-optimized pages based on templates
 */

const fs = require('fs');
const path = require('path');

// Common header/footer template
const getHeader = () => `    <header class="header">
        <div class="container">
            <div class="header-content">
                <a href="/" class="logo">
                    <img src="/images/logo-vin-trust.png" alt="VIN Trust Logo">
                    <span>VIN TRUST</span>
                </a>
                <nav class="nav">
                    <a href="/">Home</a>
                    <a href="/about">About</a>
                    <a href="/contact">Contact</a>
                </nav>
            </div>
        </div>
    </header>`;

const getFooter = () => `    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <div class="footer-logo">
                        <img src="/images/logo-vin-trust.png" alt="VIN TRUST" class="footer-logo-img">
                        <span class="footer-logo-text">VIN TRUST</span>
                    </div>
                </div>
                <div class="footer-section">
                    <h4 class="footer-title">Services</h4>
                    <ul class="footer-links">
                        <li><a href="/vin-history-report" class="footer-link">VIN History Report</a></li>
                        <li><a href="/accident-history" class="footer-link">Accident History</a></li>
                        <li><a href="/title-records" class="footer-link">Title Records</a></li>
                        <li><a href="/recall-information" class="footer-link">Recall Information</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4 class="footer-title">Company</h4>
                    <ul class="footer-links">
                        <li><a href="/about-us" class="footer-link">About Us</a></li>
                        <li><a href="/contact" class="footer-link">Contact</a></li>
                    </ul>
                </div>
            </div>
        </div>
    </footer>`;

const getStyles = () => `    <style>
        body .header {
            position: relative !important;
            background: white !important;
            border-bottom: 1px solid #e5e7eb !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
        }
        
        body .header-content {
            max-width: 1200px !important;
            margin: 0 auto !important;
            padding: 0 20px !important;
            justify-content: center !important;
            height: 70px !important;
        }
        
        body .header .logo {
            margin-left: 0 !important;
            transform: none !important;
            animation: none !important;
            scale: 1 !important;
        }
        
        body .header .logo img,
        body .header img,
        body .logo img,
        body .logo-img,
        .header .logo img,
        .header img {
            height: 35px !important;
            width: auto !important;
            max-height: 35px !important;
            max-width: 150px !important;
            object-fit: contain !important;
        }
        
        body .header .logo span,
        body .logo span {
            font-size: 1rem !important;
            margin-left: 8px !important;
            font-weight: 600 !important;
        }
        
        body .header .logo {
            font-size: 1rem !important;
            display: flex !important;
            align-items: center !important;
        }
        
        body .header .nav {
            position: absolute !important;
            right: 20px !important;
        }
        
        .seo-page {
            padding: 40px 0;
            background: #f8f9fa;
            padding-top: 100px;
        }
        
        .seo-content {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            padding: 60px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .seo-content h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: #111827;
            margin-bottom: 20px;
            line-height: 1.2;
        }
        
        .intro-section {
            background: #fef3c7;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 40px;
            border-left: 4px solid #FFD700;
        }
        
        .lead {
            font-size: 1.25rem;
            line-height: 1.8;
            color: #374151;
            margin: 0;
        }
        
        .seo-content section {
            margin-bottom: 50px;
        }
        
        .seo-content h2 {
            font-size: 2rem;
            font-weight: 700;
            color: #111827;
            margin-top: 40px;
            margin-bottom: 20px;
        }
        
        .seo-content h3 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #374151;
            margin-top: 30px;
            margin-bottom: 15px;
        }
        
        .seo-content p {
            font-size: 1.1rem;
            line-height: 1.8;
            color: #4b5563;
            margin-bottom: 20px;
        }
        
        .seo-content ul, .seo-content ol {
            margin-bottom: 25px;
            padding-left: 30px;
        }
        
        .seo-content li {
            font-size: 1.1rem;
            line-height: 1.8;
            color: #4b5563;
            margin-bottom: 10px;
        }
        
        .seo-content li strong {
            color: #111827;
        }
        
        .cta-section {
            background: linear-gradient(135deg, #111827 0%, #374151 100%);
            padding: 40px;
            border-radius: 12px;
            text-align: center;
            color: white;
            margin-top: 60px;
            border: none !important;
            border-left: none !important;
            position: relative;
        }
        
        .cta-section::before,
        .cta-section::after {
            display: none !important;
            content: none !important;
        }
        
        .cta-section h2 {
            color: white;
            margin-top: 0;
        }
        
        .cta-section p {
            color: #e5e7eb;
            font-size: 1.2rem;
        }
        
        .cta-buttons {
            display: flex;
            flex-direction: column;
            gap: 12px;
            justify-content: center;
            margin-top: 30px;
        }
        
        .btn {
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.95rem;
            transition: all 0.3s;
            display: inline-block;
            width: 100%;
        }
        
        .btn-primary {
            width: 100% !important;
            background: #111827 !important;
            color: #fff !important;
            border: 0 !important;
            border-radius: 999px !important;
            padding: 21px 8px !important;
            font-weight: 700 !important;
            font-size: 18px !important;
            text-align: center !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            margin-bottom: 8px !important;
        }
        
        .btn-primary:hover {
            background: #1f2937 !important;
            transform: translateY(-2px);
        }
        
        .btn-secondary {
            background: transparent;
            color: white;
            border: 2px solid white;
            border-radius: 999px !important;
        }
        
        .btn-secondary:hover {
            background: white;
            color: #111827;
        }
        
        .comparison-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .comparison-table th {
            background: #111827;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        
        .comparison-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .comparison-table tr:hover {
            background: #f9fafb;
        }
        
        .articles-list {
            margin: 40px 0;
        }
        
        .articles-grid {
            list-style: none;
            padding: 0;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .articles-grid li {
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
            border-left: 4px solid #111827;
        }
        
        .articles-grid a {
            color: #111827;
            text-decoration: none;
            font-weight: 500;
        }
        
        .articles-grid a:hover {
            color: #374151;
            text-decoration: underline;
        }
        
        .pagination {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
            margin: 40px 0;
            padding: 20px;
        }
        
        .pagination a {
            padding: 10px 20px;
            background: #111827;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
        }
        
        .pagination a:hover {
            background: #374151;
        }
        
        .pagination .current {
            font-weight: 600;
            color: #374151;
        }
        
        @media (max-width: 768px) {
            .seo-content {
                padding: 30px 20px;
            }
            
            .seo-content h1 {
                font-size: 2rem;
            }
            
            .seo-content h2 {
                font-size: 1.75rem;
            }
            
            .cta-buttons {
                flex-direction: column;
            }
            
            .comparison-table {
                font-size: 0.9rem;
            }
            
            .comparison-table th,
            .comparison-table td {
                padding: 8px;
            }
            
            .articles-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>`;

function generatePage(config) {
    const {
        title,
        description,
        keywords,
        canonical,
        ogTitle,
        ogDescription,
        schemaType = 'Service',
        schemaName,
        schemaDescription,
        content
    } = config;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="keywords" content="${keywords}">
    <meta name="robots" content="index, follow">
    <meta name="google-site-verification" content="qDo-C4vI8pcD0DjwRgrLnsJkB_3dWwBs8WCPe_nBLrY">
    <link rel="canonical" href="https://vintrusted.com${canonical}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://vintrusted.com${canonical}">
    <meta property="og:title" content="${ogTitle}">
    <meta property="og:description" content="${ogDescription}">
    <link rel="stylesheet" href="/styles.css">
    <link rel="stylesheet" href="/mobile.css">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "${schemaType}",
      "name": "${schemaName}",
      "description": "${schemaDescription}",
      "provider": {
        "@type": "Organization",
        "name": "VIN Trust",
        "url": "https://vintrusted.com"
      }
    }
    </script>
</head>
<body>
${getHeader()}

    <main class="seo-page">
        <div class="container">
            <article class="seo-content">
${content}
            </article>
        </div>
    </main>

${getFooter()}

${getStyles()}
</body>
</html>`;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { generatePage, getHeader, getFooter, getStyles };
}

// CLI usage
if (require.main === module) {
    console.log('SEO Page Generator');
    console.log('Usage: node generate-seo-pages.js');
    console.log('This script provides helper functions for generating SEO pages.');
}

