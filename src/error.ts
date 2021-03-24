class OtomiError {
  name: string
  message: string
  stack: string
  constructor(message?) {
    this.name = this.constructor.name
    this.message = message
    this.stack = new Error().stack
  }
}

export class NotExistError extends OtomiError {}
export class AlreadyExists extends OtomiError {}
export class GitError extends OtomiError {}
export class GitPushError extends OtomiError {}
export class GitPullError extends OtomiError {}
export class PublicUrlExists extends OtomiError {}
export class NotAuthorized extends OtomiError {}
export class ToolsError extends OtomiError {}
