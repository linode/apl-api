import * as k8s from '@kubernetes/client-node'

export async function watch(): Promise<any> {
  const kc = new k8s.KubeConfig()
  kc.loadFromDefault()

  const k8swatch = new k8s.Watch(kc)

  try {
    await k8swatch
      .watch(
        '/api/v1/pods',
        {
          allowWatchBookmarks: true,
        },
        (type, apiObj, watchObj) => {
          const filteredTty = apiObj.filter(
            (item: any) => item.metadata.name === 'tty-9867f64d-174b-493a-950e-e82bca1d734f-admin',
          )

          console.log('filteredTty:', filteredTty)
        },
        (err) => {
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
