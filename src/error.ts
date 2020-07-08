export class NotExistError extends Error {}
export class AlreadyExists extends Error {}
export class GitError extends Error {}
export class GitPushError extends GitError {}
export class GitPullError extends GitError {}
export class PublicUrlExists extends Error {}
export class NotAuthorized extends Error {}
export class ToolsError extends Error {}
