export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export class AuthenticationRequiredError extends ServiceError {
  constructor() {
    super("Debes iniciar sesión.", 401, "AUTHENTICATION_REQUIRED");
  }
}

export class AccessDeniedError extends ServiceError {
  constructor() {
    super("El recurso solicitado no está disponible.", 404, "NOT_FOUND");
  }
}

export class ResourceNotFoundError extends ServiceError {
  constructor(message = "El recurso solicitado no existe.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ReservationConflictError extends ServiceError {
  constructor() {
    super(
      "El horario acaba de ser reservado. Selecciona otro horario.",
      409,
      "RESERVATION_CONFLICT",
    );
  }
}
