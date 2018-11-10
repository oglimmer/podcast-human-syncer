module.exports = {

  config: {
    SchemaVersion: "1.0.0",
    Name: "podcast-human-syncer",
    Vagrant: {
      Box: "ubuntu/xenial64",
      Install: "nodejs docker.io"
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
