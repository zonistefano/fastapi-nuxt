# Tutorial: aggiungere una funzionalità end-to-end

Questo tutorial aggiunge una funzionalità completa: **documenti privati** che ogni
utente può creare, leggere, modificare ed eliminare. Tocca tutti i livelli del
template: modello, CRUD, endpoint protetti, migrazione, test, client generato e
pagina Nuxt. Usa il modulo scheletro `editor`, ma lo stesso schema vale per
qualsiasi modulo.

Il codice di questa pagina è stato verificato con i test, Ruff, `make api_generate`
e `nuxt typecheck` del template.

## 1. Modello

`backend/app/src/editor/models/document.py`:

```python
import uuid
from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class DocumentBase(SQLModel):
    title: str = Field(min_length=1, max_length=255)
    content: str = ""


class Document(DocumentBase, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    owner_id: uuid.UUID = Field(foreign_key="user.id", index=True, ondelete="CASCADE")
    modified: datetime = Field(default_factory=lambda: datetime.now(UTC))


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(SQLModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = None


class DocumentRead(DocumentBase):
    id: uuid.UUID
    modified: datetime
```

> `DocumentCreate` non contiene `owner_id`: il client non deve poter scegliere il
> proprietario, che viene impostato dal server con l'utente autenticato.

Esporta i modelli dal pacchetto, così `app/models.py` (già collegato al modulo
`editor`) li registra per Alembic. `backend/app/src/editor/models/__init__.py`:

```python
# ruff: noqa: F401
from .document import Document, DocumentCreate, DocumentRead, DocumentUpdate
```

## 2. CRUD

`backend/app/src/editor/crud/__init__.py`:

```python
import uuid
from datetime import UTC, datetime

from fastapi_myauth.transactions import persist
from sqlmodel import Session, select

from app.crud import CRUDBase

from ..models import Document, DocumentCreate, DocumentUpdate


class CRUDDocument(CRUDBase[Document, DocumentCreate, DocumentUpdate]):
    def create_for_owner(
        self, db: Session, *, obj_in: DocumentCreate, owner_id: uuid.UUID
    ) -> Document:
        db_obj = Document.model_validate(obj_in, update={"owner_id": owner_id})
        db.add(db_obj)
        persist(db, db_obj)
        return db_obj

    def get_multi_by_owner(self, db: Session, *, owner_id: uuid.UUID) -> list[Document]:
        statement = (
            select(Document)
            .where(Document.owner_id == owner_id)
            .order_by(Document.modified.desc())
        )
        return list(db.exec(statement).all())

    def touch_update(
        self, db: Session, *, db_obj: Document, obj_in: DocumentUpdate
    ) -> Document:
        data = obj_in.model_dump(exclude_unset=True)
        data["modified"] = datetime.now(UTC)
        return self.update(db, db_obj=db_obj, obj_in=data)


crud_document = CRUDDocument(Document)
```

`persist()` esegue `flush` dentro la transazione della richiesta e committa solo
fuori da essa (vedi [Backend → Transazioni](backend.md#transazioni-e-dipendenze)).

## 3. Endpoint

`backend/app/src/editor/api/endpoints/documents.py`:

```python
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.deps import SessionDep
from app.src.auth.api.deps import CurrentUser
from app.src.auth.models import CustomUser

from ...crud import crud_document
from ...models import Document, DocumentCreate, DocumentRead, DocumentUpdate

router = APIRouter()
User = Annotated[CustomUser, Depends(CurrentUser)]


def get_owned_document(db: SessionDep, user: User, document_id: uuid.UUID) -> Document:
    document = crud_document.get(db, document_id)
    if document is None or document.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found.")
    return document


OwnedDocument = Annotated[Document, Depends(get_owned_document)]


@router.get("/")
def read_documents(db: SessionDep, user: User) -> list[DocumentRead]:
    """List the current user's documents."""
    return crud_document.get_multi_by_owner(db, owner_id=user.id)


@router.post("/", status_code=201)
def create_document(db: SessionDep, user: User, data: DocumentCreate) -> DocumentRead:
    """Create a document owned by the current user."""
    return crud_document.create_for_owner(db, obj_in=data, owner_id=user.id)


@router.get("/{document_id}")
def read_document(document: OwnedDocument) -> DocumentRead:
    return document


@router.patch("/{document_id}")
def update_document(
    db: SessionDep, document: OwnedDocument, data: DocumentUpdate
) -> DocumentRead:
    return crud_document.touch_update(db, db_obj=document, obj_in=data)


@router.delete("/{document_id}", status_code=204)
def delete_document(db: SessionDep, document: OwnedDocument) -> None:
    crud_document.remove(db, id=document.id)
```

Punti chiave:

- `SessionDep` e `CurrentUser` condividono la stessa sessione e transazione.
- La dipendenza `get_owned_document` centralizza il controllo di proprietà;
  risponde `404` anche per i documenti altrui, senza rivelarne l'esistenza.
- I tipi di ritorno `DocumentRead` filtrano i campi esposti (niente `owner_id`) e
  generano tipi precisi per il frontend.

Registra il router con un **tag**, da cui derivano i nomi dell'SDK.
`backend/app/src/editor/api/api.py`:

```python
from fastapi import APIRouter

from .endpoints import documents

api_router = APIRouter()
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
```

Il router del modulo `editor` è già incluso in `backend/app/router.py`. Per un
modulo nuovo, aggiungi lì `include_router` e importa i suoi modelli in
`backend/app/models.py`.

## 4. Migrazione

```sh
make backend_makemigrations MESSAGE="add documents"
```

Apri il file creato in `backend/alembic/versions/` e verifica che crei la tabella
`document` con la chiave esterna su `user.id` e l'indice su `owner_id`. Poi:

```sh
make dev_db_up      # oppure riavvia make dev: prestart applica le migrazioni
```

Senza questo passo `tests/test_migrations.py` fallisce, perché lo schema prodotto
dalle migrazioni non corrisponde più ai modelli.

## 5. Test

`backend/tests/api/v1/test_documents.py`:

```python
from fastapi.testclient import TestClient


def auth_headers(client: TestClient, email: str) -> dict[str, str]:
    password = "test-user-password"
    client.post("/login/signup", json={"email": email, "password": password})
    response = client.post(
        "/login/oauth", data={"username": email, "password": password}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_documents_are_private_to_their_owner(client):
    alice = auth_headers(client, "alice@example.com")
    bob = auth_headers(client, "bob@example.com")

    created = client.post("/documents/", headers=alice, json={"title": "Note"})
    assert created.status_code == 201
    document_id = created.json()["id"]

    assert [d["id"] for d in client.get("/documents/", headers=alice).json()] == [
        document_id
    ]
    assert client.get("/documents/", headers=bob).json() == []
    assert client.get(f"/documents/{document_id}", headers=bob).status_code == 404

    updated = client.patch(
        f"/documents/{document_id}", headers=alice, json={"content": "Hi"}
    )
    assert updated.json()["content"] == "Hi"
    assert client.delete(f"/documents/{document_id}", headers=alice).status_code == 204
    assert client.get("/documents/", headers=alice).json() == []


def test_documents_require_authentication(client):
    assert client.get("/documents/").status_code == 401
```

```sh
cd backend && uv run --locked pytest tests/api/v1/test_documents.py   # veloce, SQLite
make test_backend                                                     # PostgreSQL, completo
```

## 6. Client generato

```sh
make api_generate
```

`frontend/app/api/generated/` ora contiene `documentsReadDocuments`,
`documentsCreateDocument`, `documentsReadDocument`, `documentsUpdateDocument`,
`documentsDeleteDocument` e i tipi `DocumentRead`, `DocumentCreate`,
`DocumentUpdate`.

## 7. Pagina Nuxt

`frontend/app/pages/documents.vue`:

```vue
<script setup lang="ts">
import {
  documentsCreateDocument,
  documentsDeleteDocument,
  documentsReadDocuments,
} from "~/api/generated"

definePageMeta({
  layout: "dashboard",
  middleware: ["authenticated"],
})

const { t } = useI18n()
const toast = useToast()
const { $api } = useNuxtApp()

const { data: documents, refresh } = await useAsyncData("documents", () =>
  documentsReadDocuments({ client: $api }),
)

const title = ref("")

async function createDocument() {
  try {
    await documentsCreateDocument({
      client: $api,
      body: { title: title.value },
    })
    title.value = ""
    await refresh()
  } catch {
    toast.add({ title: t("documents.createError"), color: "error" })
  }
}

async function deleteDocument(id: string) {
  await documentsDeleteDocument({ client: $api, path: { document_id: id } })
  await refresh()
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('documents.title')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <form class="flex gap-2" @submit.prevent="createDocument">
        <UInput
          v-model="title"
          :placeholder="t('documents.newTitle')"
          required
        />
        <UButton type="submit" :label="t('common.save')" />
      </form>

      <ul class="mt-6 space-y-2">
        <li
          v-for="document in documents"
          :key="document.id"
          class="flex items-center justify-between"
        >
          <span>{{ document.title }}</span>
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            @click="deleteDocument(document.id)"
          />
        </li>
      </ul>
    </template>
  </UDashboardPanel>
</template>
```

## 8. Traduzioni e navigazione

Aggiungi le chiavi in **entrambi** i file di lingua.

`frontend/i18n/locales/en.ts`:

```ts
  nav: {
    // ...
    documents: "Documents",
  },
  documents: {
    title: "Documents",
    newTitle: "New document title",
    createError: "Could not create the document",
  },
```

`frontend/i18n/locales/it.ts`:

```ts
  nav: {
    // ...
    documents: "Documenti",
  },
  documents: {
    title: "Documenti",
    newTitle: "Titolo del nuovo documento",
    createError: "Impossibile creare il documento",
  },
```

Aggiungi la voce alla sidebar in `frontend/app/layouts/dashboard.vue`, nell'array
`links`:

```ts
  {
    label: t("nav.documents"),
    to: localePath("/documents"),
    icon: "i-heroicons-document-text",
  },
```

## 9. Verifica finale

```sh
make format
make check
make test
```

Committa insieme: modelli, CRUD, endpoint, migrazione, test, `frontend/openapi.json`,
`frontend/app/api/generated/`, pagina, traduzioni e layout.

## Varianti comuni

- **Risorsa amministrativa**: sostituisci `User` con
  `Annotated[CustomUser, Depends(RequireRole(["admin"]))]`.
- **Elenco paginato**: usa `crud.get_multi(db, page=page)` con un parametro query
  `page: int = 0`.
- **Lavoro lento** (email, export, chiamate a servizi esterni): sposta la logica in
  un task Celery e accodalo dall'endpoint (vedi [Backend → Job in background](backend.md#job-in-background)).
- **Configurazione del modulo**: aggiungi campi a `EditorSettings` in
  `src/editor/config.py` e le variabili a `.env.example`
  (vedi [Configurazione](configuration.md#aggiungere-una-variabile)).
