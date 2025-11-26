<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap - VIN Trust</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <style type="text/css">
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
          }
          h1 {
            color: #111827;
            font-size: 2rem;
            margin-bottom: 10px;
          }
          .intro {
            color: #666;
            margin-bottom: 30px;
            font-size: 0.95rem;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          thead {
            background: #111827;
            color: white;
          }
          th {
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            font-size: 0.9rem;
          }
          td {
            padding: 12px 15px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 0.9rem;
          }
          tr:hover {
            background: #f9fafb;
          }
          a {
            color: #111827;
            text-decoration: none;
            font-weight: 500;
          }
          a:hover {
            text-decoration: underline;
            color: #374151;
          }
          .stats {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }
          .stats strong {
            color: #111827;
            font-size: 1.2rem;
          }
        </style>
      </head>
      <body>
        <h1>XML Sitemap</h1>
        <div class="intro">
          This sitemap contains <strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong> URLs from vintrusted.com
        </div>
        <div class="stats">
          <strong>Total URLs:</strong> <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
        </div>
        <table>
          <thead>
            <tr>
              <th>URL</th>
              <th>Last Modified</th>
              <th>Change Frequency</th>
              <th>Priority</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="sitemap:urlset/sitemap:url">
              <tr>
                <td>
                  <a>
                    <xsl:attribute name="href">
                      <xsl:value-of select="sitemap:loc"/>
                    </xsl:attribute>
                    <xsl:value-of select="sitemap:loc"/>
                  </a>
                </td>
                <td><xsl:value-of select="sitemap:lastmod"/></td>
                <td><xsl:value-of select="sitemap:changefreq"/></td>
                <td><xsl:value-of select="sitemap:priority"/></td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>

