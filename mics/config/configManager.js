import fs from 'fs'
import path from 'path'
import EventEmitter from 'events'

const CONFIG_FILE = path.join(process.cwd(), 'config.json')

class ConfigManager extends EventEmitter {
  constructor() {
    super()
    this.config = {}
    this.loadConfig()
    this.watchConfig()
  }

  loadConfig() {
    try {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8')
      this.config = JSON.parse(raw)
      this.emit('update', this.config)
      console.log('[ConfigManager] Config loaded:', this.config)
    } catch (err) {
      console.error('[ConfigManager] Failed to load config:', err.message)
    }
  }

  watchConfig() {
    fs.watch(CONFIG_FILE, (eventType) => {
      if (eventType === 'change') {
        console.log('[ConfigManager] Config file changed — reloading...')
        this.loadConfig()
      }
    })
  }

  get(key) {
    return key ? this.config[key] : this.config
  }
}

const configManager = new ConfigManager()
export default configManager
