import { debug } from 'console'
import { CustomError } from 'ts-custom-error'

export class OtomiError extends CustomError {
  public code

  public publicMessage

  public constructor(msg, err?: string) {
    if (err) debug(err)
    super(err)
    this.publicMessage = msg
  }
}
export class ForbiddenError extends OtomiError {
  public constructor(err?: string) {
    super('Forbidden', err)
    this.code = 403
  }
}
export class NotExistError extends OtomiError {
  public constructor(err?: string) {
    super('Not Found', err)
    this.code = 404
  }
}
export class AlreadyExists extends OtomiError {
  public constructor(err?: string) {
    super('Conflict', err)
    this.code = 409
  }
}
export class GitError extends OtomiError {
  public constructor(err?: string) {
    super('Git error occured', err)
    this.code = 409
  }
}
export class GitPullError extends GitError {}
export class PublicUrlExists extends OtomiError {
  public constructor(err?: string) {
    super('The URL is already in use', err)
    this.code = 409
  }
}
export class ValidationError extends OtomiError {
  public constructor(err?: string) {
    super('Invalid values detected', err)
    this.code = 422
  }
}

export class ApiNotReadyError extends OtomiError {
  public constructor(err?: string) {
    super('Api is not ready (initializing). Please try again in 30 seconds.', err)
    this.code = 503
  }
}

export class K8sResourceNotFound extends OtomiError {
  public constructor(k8sResource: string, err?: string) {
    super(`Kubernetes resource ${k8sResource} not found`, err)
    this.code = 404
  }
}
export class HttpError extends OtomiError {
  protected static messages: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized', // RFC 7235
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required', // RFC 7235
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed', // RFC 7232
    413: 'Payload Too Large', // RFC 7231
    414: 'URI Too Long', // RFC 7231
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable', // RFC 7233
    417: 'Expectation Failed',
    418: "I'm a teapot", // RFC 2324
    421: 'Misdirected Request', // RFC 7540
    426: 'Upgrade Required',
    428: 'Precondition Required', // RFC 6585
    429: 'Too Many Requests', // RFC 6585
    431: 'Request Header Fields Too Large', // RFC 6585
    451: 'Unavailable For Legal Reasons', // RFC 7725
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates', // RFC 2295
    510: 'Not Extended', // RFC 2774
    511: 'Network Authentication Required', // RFC 6585
  }

  public constructor(
    public code: number,
    message?: string,
  ) {
    super(message)
    // this.code = code
  }

  public static fromCode(code: number): HttpError {
    return new HttpError(code, HttpError.messages[code])
  }
}
