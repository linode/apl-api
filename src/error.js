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

module.exports = {
  AlreadyExists: AlreadyExists,
  NotExistError: NotExistError,
  GitError: GitError,
}
