import pytest

from app.core.exceptions import NotFoundError
from app.schemas.host import HostCreate, HostUpdate
from app.services.host import HostService


def make_service(db):
    return HostService(db)


def make_host(db, nome="João Silva"):
    return make_service(db).create_host(HostCreate(nome=nome))


class TestHostCreate:
    def test_cria_host_valido(self, db):
        host = make_host(db)
        assert host.id is not None
        assert host.nome == "João Silva"

    def test_lista_hosts_retorna_todos(self, db):
        make_host(db, nome="João Silva")
        make_host(db, nome="Maria Oliveira")
        result = make_service(db).list_hosts()
        assert len(result) == 2


class TestHostGet:
    def test_busca_host_existente(self, db):
        created = make_host(db)
        found = make_service(db).get_host(created.id)
        assert found.id == created.id

    def test_busca_host_inexistente_lanca_not_found(self, db):
        with pytest.raises(NotFoundError):
            make_service(db).get_host(999)


class TestHostUpdate:
    def test_atualiza_nome(self, db):
        host = make_host(db)
        updated = make_service(db).update_host(host.id, HostUpdate(nome="Maria Oliveira"))
        assert updated.nome == "Maria Oliveira"

    def test_atualiza_host_inexistente_lanca_not_found(self, db):
        with pytest.raises(NotFoundError):
            make_service(db).update_host(999, HostUpdate(nome="Nome Qualquer"))


class TestHostDelete:
    def test_remove_host_existente(self, db):
        host = make_host(db)
        make_service(db).delete_host(host.id)
        with pytest.raises(NotFoundError):
            make_service(db).get_host(host.id)

    def test_remove_host_inexistente_lanca_not_found(self, db):
        with pytest.raises(NotFoundError):
            make_service(db).delete_host(999)
