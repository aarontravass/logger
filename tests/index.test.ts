import { Context, suite, uvu } from 'uvu'
import { logger } from '../src/index'
import { cyan, red, magenta, bold } from 'colorette'
import { makeFetch } from 'supertest-fetch'
import { App } from '@tinyhttp/app'
import expect from 'expect'

function describe(name: string, fn: (it: uvu.Test<Context>) => void) {
  const s = suite(name)
  fn(s)
  s.run()
}

describe('Logger tests', (it) => {
  it('should use the timestamp format specified in the `format` property', () => {
    const originalConsoleLog = console.log

    console.log = (log: string) => {
      expect(log.split(' ')[0]).toMatch(/[0-9]{2}:[0-9]{2}/)
      console.log = originalConsoleLog
    }

    const app = new App()
    app.use(logger({ timestamp: { format: 'mm:ss' } }))

    const server = app.listen()

    makeFetch(server)('/')
      .expect(404)
      .then(() => {
        server.close()
      })
  })
  it('should enable timestamp if `timestamp` propery is true', () => {
    const originalConsoleLog = console.log

    console.log = (log: string) => {
      expect(log.split(' ')[0]).toMatch(/[0-9]{2}:[0-9]{2}:[0-9]{2}/)
      console.log = originalConsoleLog
    }

    const app = new App()
    app.use(logger({ timestamp: true }))

    const server = app.listen()

    makeFetch(server)('/')
      .expect(404)
      .then(() => {
        server.close()
      })
  })

  it('should call a custom output function', () => {
    const customOutput = (log: string) => {
      expect(log).toMatch('GET 404 Not Found /')
    }

    const app = new App()
    app.use(logger({ output: { callback: customOutput, color: false } }))

    const server = app.listen()

    makeFetch(server)('/')
      .expect(404)
      .then(() => {
        server.close()
      })
  })

  describe('Color logs', (it) => {
    const createColorTest = (status: number, color: string) => {
      return async () => {
        const customOutput = (log: string) => {
          if (color === 'cyan') {
            expect(log.split(' ')[1]).toMatch(cyan(bold(status.toString()).toString()))
          } else if (color === 'red') {
            expect(log.split(' ')[1]).toMatch(red(bold(status.toString()).toString()))
          } else if (color === 'magenta') {
            expect(log.split(' ')[1]).toMatch(magenta(bold(status.toString()).toString()))
          }
        }

        const app = new App()

        app.use(logger({ output: { callback: customOutput, color: true } }))
        app.get('/', (_, res) => res.status(status).send(''))

        const server = app.listen()

        await makeFetch(server)('/').expect(status)
      }
    }

    it('should color 2xx cyan', () => {
      createColorTest(200, 'cyan')()
    })

    it('should color 4xx red', () => {
      createColorTest(400, 'red')()
    })

    it('should color 5xx magenta', () => {
      createColorTest(500, 'magenta')()
    })
  })
  describe('Badge Log', (it) => {
    it('should display emoji', () => {
      const app = new App()

      const customOutput = (log: string) => {
        expect(log).toMatch(/✅/)
      }

      app.use(
        logger({
          emoji: true,
          output: { callback: customOutput, color: false }
        })
      )

      app.get('/', (_, res) => res.status(200).send(''))

      const server = app.listen()

      makeFetch(server)('/')
        .expect(200)
        .then(() => {
          server.close()
        })
    })
    it('should not output anything if not passing badge config', () => {
      const app = new App()
      const customOutput = (log: string) => {
        expect(log).toMatch('GET 200 OK /')
      }

      app.use(logger({ output: { callback: customOutput, color: false } }))

      app.get('/', (_, res) => res.status(200).send(''))

      const server = app.listen()

      makeFetch(server)('/')
        .expect(200)
        .then(() => {
          server.close()
        })
    })
    it('should display both emoji and caption', () => {
      const app = new App()
      const customOutput = (log: string) => {
        expect(log).toMatch('✅ GET 200 OK /')
      }

      app.use(
        logger({
          emoji: true,
          output: { callback: customOutput, color: false }
        })
      )

      app.get('/', (_, res) => res.status(200).send(''))

      const server = app.listen()

      makeFetch(server)('/')
        .expect(200)
        .then(() => {
          server.close()
        })
    })
    const createEmojiTest = (status: number, expected: string) => {
      const app = new App()
      const customOutput = (log: string) => {
        expect(log.split(' ')[0]).toMatch(expected)
      }

      app.use(
        logger({
          emoji: true,
          output: { callback: customOutput, color: false }
        })
      )

      app.get('/', (_, res) => res.status(status).send(''))

      const server = app.listen()

      makeFetch(server)('/')
        .expect(status)
        .then(() => {
          server.close()
        })
    }
    it('should output correct 2XX log', () => {
      createEmojiTest(200, '✅')
    })
    it('should output correct 4XX log', () => {
      createEmojiTest(400, '🚫')
    })
    it('should output correct 404 log', () => {
      createEmojiTest(404, '❓')
    })
    it('should output correct 5XX log', () => {
      createEmojiTest(500, '💣')
    })
  })
})
