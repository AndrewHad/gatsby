import netlifyIdentityWidget from "netlify-identity-widget"

exports.onInitialClientRender = (_, { enableIdentityWidget }) => {
  if (enableIdentityWidget) {
    netlifyIdentityWidget.on(`init`, user => {
      if (!user) {
        netlifyIdentityWidget.on(`login`, () => {
          document.location.reload()
        })
      }
    })
    netlifyIdentityWidget.init()
  }
}
