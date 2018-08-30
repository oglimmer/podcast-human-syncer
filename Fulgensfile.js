module.exports = {

  config: {
    Name: "podcast-human-syncer",
    Vagrant: {
      Box: "ubuntu/xenial64",
      Install: "npm docker.io"
    }
  },

  software: {

    redis: {
      Source: "redis"
    },
    
    phs: {
      Source: "node",
      Artifact: "server.js"
    }

  }
}
