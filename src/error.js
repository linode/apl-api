class NotExistError extends Error {
  constructor(message) {
    super(message)
  }
}

class AlreadyExists extends Error {
  constructor(message) {
    super(message)
  }
}
class GitError extends Error {
  constructor(message) {
    super(message)
  }
}

class PublicUrlExists extends Error {
  constructor(message) {
    super(message)
  }
}

module.exports = {
  AlreadyExists,
  NotExistError,
  PublicUrlExists,
  GitError,
}
