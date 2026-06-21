import pytest

from app.core.exceptions import NotFoundError
from app.schemas.studio import StudioCreate, StudioUpdate
from app.services.studio import StudioService


def make_service(db):
    return StudioService(db)


def make_studio(db, nome="Estúdio A", capacidade=5, equipamentos=None):
    service = make_service(db)
    return service.create_studio(
        StudioCreate(nome=nome, capacidade=capacidade, equipamentos=equipamentos or [])
    )


class TestStudioCreate:
    def test_cria_studio_valido(self, db):
        studio = make_studio(db)
        assert studio.id is not None
        assert studio.nome == "Estúdio A"
        assert studio.capacidade == 5

    def test_cria_studio_com_equipamentos(self, db):
        studio = make_studio(db, equipamentos=["Microfone", "Mesa de Som"])
        assert studio.equipamentos == ["Microfone", "Mesa de Som"]

    def test_lista_studios_retorna_todos(self, db):
        make_studio(db, nome="Estúdio A")
        make_studio(db, nome="Estúdio B")
        result = make_service(db).list_studios()
        assert len(result) == 2


class TestStudioGet:
    def test_busca_studio_existente(self, db):
        created = make_studio(db)
        found = make_service(db).get_studio(created.id)
        assert found.id == created.id

    def test_busca_studio_inexistente_lanca_not_found(self, db):
        with pytest.raises(NotFoundError):
            make_service(db).get_studio(999)


class TestStudioUpdate:
    def test_atualiza_nome(self, db):
        studio = make_studio(db)
        updated = make_service(db).update_studio(studio.id, StudioUpdate(nome="Estúdio B"))
        assert updated.nome == "Estúdio B"
        assert updated.capacidade == 5

    def test_atualiza_capacidade(self, db):
        studio = make_studio(db)
        updated = make_service(db).update_studio(studio.id, StudioUpdate(capacidade=10))
        assert updated.capacidade == 10

    def test_atualiza_studio_inexistente_lanca_not_found(self, db):
        with pytest.raises(NotFoundError):
            make_service(db).update_studio(999, StudioUpdate(nome="Nome Qualquer"))


class TestStudioDelete:
    def test_remove_studio_existente(self, db):
        studio = make_studio(db)
        make_service(db).delete_studio(studio.id)
        with pytest.raises(NotFoundError):
            make_service(db).get_studio(studio.id)

    def test_remove_studio_inexistente_lanca_not_found(self, db):
        with pytest.raises(NotFoundError):
            make_service(db).delete_studio(999)
