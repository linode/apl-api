import * as k8s from '@kubernetes/client-node'

export async function watch(): Promise<any> {
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()

  const k8swatch = new k8s.Watch(kc)

  try {
    await k8swatch
      .watch(
        '/api/v1/pods',
        // optional query parameters can go here.
        {
          allowWatchBookmarks: true,
        },
        // callback is called for each received object.
        (type, apiObj, watchObj) => {
          if (type === 'ADDED') {
            // tslint:disable-next-line:no-console
            console.log('new object:')
          } else if (type === 'MODIFIED') {
            // tslint:disable-next-line:no-console
            console.log('changed object:')
          } else if (type === 'DELETED') {
            // tslint:disable-next-line:no-console
            console.log('deleted object:')
          } else if (type === 'BOOKMARK') {
            // tslint:disable-next-line:no-console
            console.log(`bookmark: ${watchObj.metadata.resourceVersion}`)
          } else {
            // tslint:disable-next-line:no-console
            console.log(`unknown type: ${type}`)
          }
          // tslint:disable-next-line:no-console
          console.log(apiObj)
        },
        // done callback is called if the watch terminates normally
        (err) => {
          // tslint:disable-next-line:no-console
          console.log(err)
        },
      )
      .then((req) => {
        console.log('req', req)
        // watch returns a request object which you can use to abort the watch.
        setTimeout(() => {
          req.abort()
        }, 10 * 1000)
      })
  } catch (error) {
    console.log('watch error', error)
  }

  return () => console.log('watch executed!')
}
