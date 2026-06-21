class BookingConflictError(Exception):
    def __init__(self, studio_id: int):
        self.studio_id = studio_id
        super().__init__(f"Conflito de horário para o studio {studio_id}")
