class NotFoundError(Exception):
    def __init__(self, message: str):
        super().__init__(message)


class ConflictError(Exception):
    def __init__(self, message: str):
        super().__init__(message)


class BookingConflictError(ConflictError):
    def __init__(self, studio_id: int):
        super().__init__(f"Conflito de horário para o studio {studio_id}")
