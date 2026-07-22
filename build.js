const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const { minify } = require('terser');

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to, { recursive: true });
  }
  fs.readdirSync(from).forEach(element => {
    const fromPath = path.join(from, element);
    const toPath = path.join(to, element);
    if (fs.lstatSync(fromPath).isDirectory()) {
      copyFolderSync(fromPath, toPath);
    } else {
      fs.copyFileSync(fromPath, toPath);
    }
  });
}

async function build() {
  console.log("Starting custom production build...");

  // 1. Clean and recreate www/
  if (fs.existsSync('www')) {
    fs.rmSync('www', { recursive: true, force: true });
  }
  fs.mkdirSync('www', { recursive: true });

  // 2. Copy static public/assets (which was renamed from assets) to www/assets
  if (fs.existsSync('public/assets')) {
    console.log("Copying assets...");
    copyFolderSync('public/assets', 'www/assets');
  } else if (fs.existsSync('assets')) {
    console.log("Copying assets (fallback)...");
    copyFolderSync('assets', 'www/assets');
  }

  // 3. Copy vendor/ to www/vendor/
  if (fs.existsSync('vendor')) {
    console.log("Copying vendor dependencies...");
    copyFolderSync('vendor', 'www/vendor');
  }

  // 4. Minify CSS
  console.log("Minifying style.css...");
  const css = fs.readFileSync('style.css', 'utf8');
  const minifiedCss = new CleanCSS({}).minify(css).styles;
  fs.writeFileSync('www/style.css', minifiedCss);

  // 5. Minify JS files in src/
  console.log("Minifying JS files...");
  fs.mkdirSync('www/src', { recursive: true });
  const jsFiles = ['audio.js', 'patient.js', 'clinic.js', 'app.js'];
  for (const file of jsFiles) {
    const filePath = path.join('src', file);
    if (fs.existsSync(filePath)) {
      console.log(`  - Processing ${file}...`);
      const code = fs.readFileSync(filePath, 'utf8');
      try {
        const minified = await minify(code, {
          mangle: true,
          compress: {
            dead_code: true,
            drop_debugger: true,
            conditionals: true,
            evaluate: true,
            booleans: true,
            loops: true,
            unused: true,
            hoist_funs: true,
            keep_fargs: false,
            hoist_vars: true,
            if_return: true,
            join_vars: true,
          }
        });
        fs.writeFileSync(path.join('www/src', file), minified.code);
        console.log(`    Successfully minified ${file}.`);
      } catch (err) {
        console.error(`    Terser error in ${file}:`, err);
        throw err;
      }
    }
  }

  // 6. Minify HTML
  console.log("Minifying index.html...");
  let html = fs.readFileSync('index.html', 'utf8');
  // Simple HTML minifier: remove comments and extra whitespace
  html = html
    .replace(/<!--[\s\S]*?-->/g, '') // remove HTML comments
    .replace(/\s+/g, ' ') // replace multiple spaces/newlines with single space
    .replace(/> </g, '><') // remove spaces between tags
    .trim();
  fs.writeFileSync('www/index.html', html);

  console.log("Custom build completed successfully! Output is in the 'www' directory.");
}

build().catch(err => {
  console.error("Build failed:", err);
  process.exit(1);
});
