# Full Stack Template
## Technology Stack and Features

- ⚡ [**FastAPI**](https://fastapi.tiangolo.com) for the Python backend API.
    - 🧰 [SQLModel](https://sqlmodel.tiangolo.com) for the Python SQL database interactions (ORM).
    - 🔍 [Pydantic](https://docs.pydantic.dev), used by FastAPI, for the data validation and settings management.
    - 💾 [PostgreSQL](https://www.postgresql.org) as the SQL database.
- 🚀 [NuxtJS](https://nuxt.com/) for the frontend.
    - 💃 Using TypeScript.
    - 🎨 [Nuxt UI](https://ui.nuxt.com/) for the frontend components.
    - Authorisation via middleware, including logged in or superuser.
    - Model blog project, with Nuxt Content for writing Markdown pages.
    - Form validation with Yup.
    - State management with Pinia, and persistance with Pinia PersistedState.
    - 🦇 Dark mode support.
    - Internationalisation with [nuxt/i18n](https://i18n.nuxtjs.org/)
- 🐋 [Docker Compose](https://www.docker.com) for development and production.
- 🔒 Secure password hashing by default.
- 🔑 JWT (JSON Web Token) authentication.
- 📫 Email based password recovery.
- 🏭 CI (continuous integration) and CD (continuous deployment) based on GitHub Actions.
- PostgreSQL database.
- PGAdmin for PostgreSQL database management.
- Celery worker that can import and use models and code from the rest of the backend selectively.
- Flower for Celery jobs monitoring.

## How To Use It

You can **just fork or clone** this repository and use it as is.

✨ It just works. ✨

### How to Use a Private Repository

If you want to have a private repository, GitHub won't allow you to simply fork it as it doesn't allow changing the visibility of forks.

But you can do the following:

- Create a new GitHub repo, for example `my-full-stack`.
- Clone this repository manually, wiping the content of the new repository:

```bash
rm -rf ./*
git clone https://github.com/zonistefano/postgresql-fastapi-nuxt .
```

- Clean git

```bash
rm -rf ./.git
```

- Set the new origin to your new repository, copy it from the GitHub interface, for example:

```bash
git remote add origin https://github.com/zonistefano/my-full-stack
```

- Add this repo as another "remote" to allow you to get updates later (it will only be saved locally):

```bash
git remote add upstream https://github.com/zonistefano/postgresql-fastapi-nuxt
```

- Push the code to your new repository:

```bash
git push -u origin master
```

### Update From the Original Template

After cloning the repository, and after doing changes, you might want to get the latest changes from this original template.

- Make sure you added the original repository as a remote, you can check it with:

```bash
git remote -v
```

- Pull the latest changes without merging:

```bash
git fetch upstream
git merge --no-commit upstream/main --allow-unrelated-histories
```

This will download the latest changes from this template without committing them, that way you can check everything is right before committing.

- If there are conflicts, solve them in your editor.

- Once you are done, commit the changes.

### Configure

You can then update configs in the `.env`, `.env.dev` (frontend), `.env.github` files to customize your configurations.

Run the `init.sh` script that will install dependencies and configure docker-compose files.

```bash
./scripts/init.sh
```

## Backend Development

Backend docs: [backend/README.md](./backend/README.md).

## Frontend Development

Frontend docs: [frontend/README.md](./frontend/README.md).

## Deployment

Deployment docs: [deployment.md](./deployment.md).

## Development

General development docs: [development.md](./development.md).

This includes using Docker Compose, custom local domains, `.env` configurations, etc.


env -i bash 