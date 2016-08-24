'use strict'

// Test object creation, the `disconnect` method, and `connected/disconnected`
// events.

function doneWrap(done) {
  let alreadyDone = false
  return (...args) => {
    if (!alreadyDone) {
      alreadyDone = true
      return done(...args)
    }
  }
}

export default function horizonObjectSuite() {
  describe('Horizon', () => {
    it('connects and can track its status', done => {
      let oneDone = doneWrap(done)
      Horizon.clearAuthTokens()
      const horizon = Horizon({ secure: false })
      assert.isDefined(horizon)
      horizon.status(
        stat => {
          switch (stat.type) {
          case 'unconnected':
            break
          case 'ready':
            horizon.disconnect()
            break
          case 'error':
            oneDone(new Error('Got an error in socket status'))
            break
          case 'disconnected':
            oneDone()
            break
          default:
            oneDone(new Error(`Received unknown status type ${stat.type}`))
          }
        },
        () => oneDone(new Error('Got an error in status'))
      )
      horizon.connect(err => oneDone(err))
    })

    it('errors when it gets the wrong host', done => {
      // Note -- the connection string specifies a bad host.
      const horizon = Horizon({
        host: 'wrong_host',
        secure: false,
      })
      assert.isDefined(horizon)
      horizon.status().take(3).toArray().subscribe(statuses => {
        const expected = [
          { type: 'unconnected' },
          { type: 'error' }, // socket
          { type: 'disconnected' },
        ]
        assert.deepEqual(expected, statuses)
        done()
      })
      horizon.connect() // no-op error handler, already covered
    })

    // it('clears all state when reconnecting', done => {
    //   const horizon = Horizon()
    //   horizon.onReady(e => {
    //     console.log('fired onready')
    //     horizon('foo').findAll({ foo: 'req1' }).fetch().subscribe({
    //       error(e) {
    //         console.log('first query errored')
    //         done(e)
    //       },
    //       complete() {
    //         console.log('first query finished')
    //         horizon._socket.socket.close()
    //       },
    //     })
    //   })
    //   horizon.onDisconnected(e => {
    //     console.log('fired disconnection')
    //     horizon.onReady(e => {
    //       console.log('Got ready')
    //       horizon('foo').findAll({ foo: 'req2' }).fetch().subscribe({
    //         error(e) {
    //           done(e)
    //         },
    //         complete() {
    //           done()
    //         },
    //       })
    //     })
    //     horizon.connect(e => done(e))
    //   })
    //   horizon.connect(e => done(e))
    // })
    it('clears all state when reconnecting', done => {
      const message = {
        text: 'What a beautiful horizon!',
      }

      const horizon = Horizon()
      const chat = horizon('messages')
      let handle

      horizon.status(s => {
        console.log('status', s)
      })

      horizon.onReady(() => {
        if (handle) {
          clearTimeout(handle)
        }
      })

      horizon.onDisconnected(() => {
        handle = setTimeout(() => {
          console.log('interval fired')
          chat.watch().subscribe(docs => {
            console.log('Docs', docs.map(e => e.text))
            done()
          })
        }, 1000)
      })
      chat.watch().subscribe(docs => {
        console.log('DOCUMENTS', docs.length)
        horizon.disconnect()
      })
      chat.store(message)
    })
  })
}
