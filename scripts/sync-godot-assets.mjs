/**
 * Copies shared game assets from the Vite `public/` tree into `godot/`
 * so Godot uses the same local files as the web build.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function shouldIgnore(relPath) {
  return relPath.split(path.sep).includes('_downloads')
}

/**
 * Recursively copy files from srcDir into dstDir, preserving relative paths.
 * @returns number of files copied
 */
function copyTree(srcDir, dstDir) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`[sync-godot] Skip (missing): ${srcDir}`)
    return 0
  }
  let n = 0
  const stack = [['', srcDir, dstDir]]
  while (stack.length) {
    const [rel, fromBase, toBase] = stack.pop()
    for (const name of fs.readdirSync(fromBase)) {
      const relNext = rel ? `${rel}/${name}` : name
      if (shouldIgnore(relNext)) continue
      const from = path.join(fromBase, name)
      const to = path.join(toBase, name)
      const st = fs.statSync(from)
      if (st.isDirectory()) {
        ensureDir(to)
        stack.push([relNext, from, to])
      } else if (st.isFile()) {
        ensureDir(path.dirname(to))
        fs.copyFileSync(from, to)
        n += 1
      }
    }
  }
  return n
}

const audioSrc = path.join(root, 'public', 'assets', 'audio')
const audioDst = path.join(root, 'godot', 'assets', 'audio')
const mapSrc = path.join(root, 'public', 'assets', 'map')
const mapDst = path.join(root, 'godot', 'assets', 'map')
const dataSrc = path.join(root, 'public', 'data')
const dataDst = path.join(root, 'godot', 'data')

const audioFiles = copyTree(audioSrc, audioDst)
const mapFiles = copyTree(mapSrc, mapDst)
const dataFiles = copyTree(dataSrc, dataDst)

console.log(`[sync-godot] public/assets/audio → godot/assets/audio (${audioFiles} files)`)
console.log(`[sync-godot] public/assets/map    → godot/assets/map    (${mapFiles} files)`)
console.log(`[sync-godot] public/data         → godot/data          (${dataFiles} files)`)
