import fs from 'node:fs';
import path from 'node:path';
import critical from 'critical';

const siteDir = path.resolve('_site');
const directCriticalRoutes = new Set([
  '/',
  '/about/',
  '/bagtags/',
  '/blog/',
  '/contact/',
  '/disc-dice/',
  '/events/',
  '/faq/',
  '/preisvergleich/',
  '/ratings/',
  '/register/',
  '/tools/',
  '/training/',
  '/turniere/',
]);

const blogSourceRoute = '/blog/die-besten-scheiben-fuer-discgolf-einsteiger/';
const stylesheet = ['normalize.css', 'style.min.css']
  .map((file) => fs.readFileSync(path.join(siteDir, 'assets/css', file), 'utf8'))
  .join('\n');

function getHtmlFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      results = results.concat(getHtmlFiles(filePath));
    } else if (file.endsWith('.html')) {
      results.push(filePath);
    }
  });
  return results;
}

function filePathToRoute(file) {
  const relativePath = path.relative(siteDir, file).replace(/\\/g, '/');

  if (relativePath === 'index.html') {
    return '/';
  }

  if (relativePath.endsWith('/index.html')) {
    return `/${relativePath.slice(0, -'index.html'.length)}`;
  }

  return `/${relativePath.replace(/\.html$/, '')}`;
}

function inlineCssIntoFile(file, css, label) {
  if (!css) return;

  const styleTag = `<style data-critical="${label}">${css}</style>`;
  const existingTagPattern = new RegExp(`<style data-critical="${label}">[\\s\\S]*?<\\/style>\\s*`, 'g');
  const html = fs.readFileSync(file, 'utf8');

  if (!html.includes('</head>')) {
    throw new Error(`Missing </head> in ${file}`);
  }

  const nextHtml = html.replace(existingTagPattern, '').replace('</head>', `  ${styleTag}\n</head>`);
  fs.writeFileSync(file, nextHtml);
}

async function generateCriticalCss(file) {
  const html = fs.readFileSync(file, 'utf8');
  const { css } = await critical({
    html,
    css: stylesheet,
    base: siteDir,
    engine: 'static',
  });
  return css;
}

async function inlineDirectCriticalCss(htmlFiles) {
  const directFiles = htmlFiles.filter((file) => directCriticalRoutes.has(filePathToRoute(file)));

  for (const file of directFiles) {
    try {
      const css = await generateCriticalCss(file);
      inlineCssIntoFile(file, css, 'page');
      console.log(`✅ Fixed & Inlined: ${path.relative(siteDir, file)}`);
    } catch (err) {
      throw new Error(`Failed critical CSS for ${file}: ${err.message}`, { cause: err });
    }
  }
}

async function inlineSharedCriticalCss(htmlFiles) {
  const filesByRoute = new Map(htmlFiles.map((file) => [filePathToRoute(file), file]));
  const sourceFile = filesByRoute.get(blogSourceRoute);

  if (!sourceFile) {
    throw new Error(`Missing source route ${blogSourceRoute} for shared blog critical CSS`);
  }

  try {
    const css = await generateCriticalCss(sourceFile);
    const blogFiles = htmlFiles.filter((file) => {
      const route = filePathToRoute(file);
      return route.startsWith('/blog/') && !/^\/blog\/(?:page\d+\/)?$/.test(route);
    });

    for (const file of blogFiles) {
      inlineCssIntoFile(file, css, 'blog-posts');
      console.log(`✅ Inlined shared critical CSS (blog-posts): ${path.relative(siteDir, file)}`);
    }
  } catch (err) {
    throw new Error(`Failed shared blog critical CSS: ${err.message}`, { cause: err });
  }
}

async function inlineCriticalCss() {
  const htmlFiles = getHtmlFiles(siteDir);

  await inlineDirectCriticalCss(htmlFiles);
  await inlineSharedCriticalCss(htmlFiles);
}

inlineCriticalCss().catch((err) => {
  console.error(`❌ Critical CSS generation failed: ${err.message}`);
  process.exitCode = 1;
});

