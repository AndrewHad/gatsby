const axios = require(`axios`)
const crypto = require(`crypto`)
const url = require(`url`)
const _ = require(`lodash`)

const get = query => {
  return axios.get(
    `https://www.graphqlhub.com/graphql?query=${encodeURIComponent(query)}`
  )
}

exports.sourceNodes = async ({
  boundActionCreators,
  getNode,
  hasNodeChanged,
}) => {
  const { createNode, updateSourcePluginStatus } = boundActionCreators
  updateSourcePluginStatus({
    plugin: `gatsby-source-hacker-news`,
    ready: false,
  })

  // Do the initial fetch
  console.time(`fetch HN data`)
  console.log(
    `starting to fetch data from the Hacker News GraphQL API. Warning, this can take a long time e.g. 10-20 seconds`
  )
  const result = await get(`
{
  hn {
    topStories(limit: 30) {
      id
      title
      score
      timeISO
      url
      by {
        id
      }
      descendants
      kids {
        ...commentsFragment
        kids {
          ...commentsFragment
          kids {
            ...commentsFragment
            kids {
              ...commentsFragment
              kids {
                ...commentsFragment
                kids {
                  ...commentsFragment
                  kids {
                    ...commentsFragment
                    kids {
                      ...commentsFragment
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

fragment commentsFragment on HackerNewsItem {
  id
  text
  timeISO
  by {
    id
  }
}
  `)
  console.timeEnd(`fetch HN data`)

  // Create top-story nodes.
  result.data.data.hn.topStories.forEach((story, i) => {
    const storyStr = JSON.stringify(story)

    // Ask HN, Polls, etc. don't have urls.
    // For those that do, HN displays just the bare domain.
    let domain
    if (story.url) {
      const parsedUrl = url.parse(story.url)
      const splitHost = parsedUrl.host.split(`.`)
      if (splitHost.length > 2) {
        domain = splitHost.slice(1).join(`.`)
      } else {
        domain = splitHost.join(`.`)
      }
    }

    let kids
    kids = _.pick(story, `kids`)
    if (!kids.kids) {
      kids.kids = []
    }
    const kidLessStory = _.omit(story, `kids`)

    const storyNode = {
      ...kidLessStory,
      domain,
      order: i + 1,
      parent: `__SOURCE__`,
      type: `HNStory`,
      children: [...kids.kids.map(k => k.id)],
      content: storyStr,
      mediaType: `application/json`,
    }

    // Just store the user id
    storyNode.by = storyNode.by.id

    // Get content digest of node.
    const contentDigest = crypto
      .createHash(`md5`)
      .update(JSON.stringify(storyNode))
      .digest(`hex`)

    storyNode.contentDigest = contentDigest

    createNode(storyNode)

    // Recursively create comment nodes.
    const createCommentNodes = (comments, parent, depth = 0) => {
      comments.forEach((comment, i) => {
        if (!comment.kids) {
          comment.kids = []
        }
        let commentNode = {
          ..._.omit(comment, `kids`),
          order: i + 1,
          type: `HNComment`,
          parent,
          children: [...comment.kids.map(k => k.id)],
          mediaType: `application/json`,
        }

        commentNode.by = commentNode.by.id
        const nodeStr = JSON.stringify(commentNode)

        // Get content digest of comment node.
        const contentDigest = crypto
          .createHash(`md5`)
          .update(nodeStr)
          .digest(`hex`)

        commentNode.contentDigest = contentDigest
        commentNode.content = nodeStr

        createNode(commentNode)

        if (comment.kids.length > 0) {
          createCommentNodes(comment.kids, comment.id, depth + 1)
        }
      })
    }

    createCommentNodes(kids.kids, story.id)
  })

  const ready = true
  updateSourcePluginStatus({
    plugin: `gatsby-source-hacker-news`,
    status: { ready },
  })

  return
}
