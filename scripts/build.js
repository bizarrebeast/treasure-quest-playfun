import * as esbuild from "esbuild"
import * as fs from "fs"
import * as path from "path"
import { fileURLToPath } from "url"
import * as cheerio from "cheerio"

// Get dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const rootDir = path.resolve(__dirname, "..")
const distDir = path.join(rootDir, "dist")
const srcDir = path.join(rootDir, "src")
const htmlTemplatePath = path.join(rootDir, "index.html")
const outputPath = path.join(distDir, "index.html")
const tempJsPath = path.join(distDir, "game-bundle.js")

// Ensure the dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

async function buildGame() {
  try {
    // Step 1: Bundle the TypeScript code with esbuild
    const result = await esbuild.build({
      entryPoints: [path.join(srcDir, "main.ts")],
      bundle: true,
      external: ["phaser"],
      format: "iife",
      globalName: "Game",
      outfile: tempJsPath,
      sourcemap: false,
      minify: true,
      target: ["es2020"],
      define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
        'DGEN1_BUILD': JSON.stringify(false),
      },
      write: true,
      logLevel: "silent",
    })

    if (result.errors.length > 0) {
      console.error("Build errors:", result.errors)
      process.exit(1)
    }

    // Step 2: Read the bundled JS and HTML template
    let jsCode = fs.readFileSync(tempJsPath, "utf8")
    const htmlTemplate = fs.readFileSync(htmlTemplatePath, "utf8")

    // Step 3: Process the HTML template with cheerio
    const $ = cheerio.load(htmlTemplate)

    // Step 4: Replace require('phaser') with window.Phaser
    jsCode = jsCode.replace(/require\(['"]phaser['"]\)/g, "window.Phaser")

    // Remove the development script tag and add our bundled code
    $('script[type="module"]').remove()
    $("body").append(`<script>${jsCode}</script>`)

    // Step 5: Process HTML
    let htmlOutput = $.html()
    htmlOutput = htmlOutput.replace(/<!--[\s\S]*?-->/g, "")

    // Step 6: Write the final HTML file
    fs.writeFileSync(outputPath, htmlOutput)

    // Step 7: Clean up temporary files
    if (fs.existsSync(tempJsPath)) {
      fs.unlinkSync(tempJsPath)
    }

    const stats = fs.statSync(outputPath)
    console.log(`Build complete: dist/index.html (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)
  } catch (error) {
    console.error("Build failed:", error)
    process.exit(1)
  }
}

buildGame()
