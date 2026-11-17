# Forum Section UIDT-EPT

Application de forum en français : API REST Laravel 13, interface Angular 22 et base SQLite pour le démarrage local. Le logo et la palette terracotta du Forum Section UIDT-EPT sont intégrés à l’interface. Les questions restent consultables sans compte ; l’inscription est libre, mais un administrateur doit approuver les comptes avant toute participation.

## Fonctionnalités MVP

- Inscription, connexion par session Sanctum, déconnexion, demande et réinitialisation de mot de passe.
- Profil utilisateur, photo de profil, modification du nom et changement de mot de passe.
- Séances créées et gérées par l’administration, avec plusieurs animateurs par séance et archivage en lecture seule.
- Questions publiques avec recherche, filtres, pagination, réponses et acceptation d’une réponse.
- Gestion des contenus par leur auteur, un animateur affecté à la séance ou un administrateur.
- Administration des rôles et de l’approbation des comptes.
- Interface responsive avec choix de thème clair/sombre.

Les tags, votes, notifications de réponse, signalements, pièces jointes, statistiques et exports restent des évolutions ultérieures du cahier des charges.

## Prérequis

- PHP 8.3 ou ultérieur avec `pdo_sqlite`, Composer 2
- Node.js 22.22.3+ ou 24.15.0+ et npm (versions prises en charge par Angular 22)

## Démarrage local (PowerShell)

Terminal 1 — API :

```powershell
Set-Location backend
composer install
Copy-Item .env.example .env
php artisan key:generate
if (-not (Test-Path database\database.sqlite)) { New-Item -ItemType File database\database.sqlite }
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

La configuration `.env.example` utilise SQLite, le courrier journalisé et l’adresse locale d’Angular. Les liens de réinitialisation en développement apparaissent dans `backend\storage\logs\laravel.log`.

En environnement `local` ou `testing`, les seeders ajoutent des comptes de démonstration, trois séances et des questions/réponses. Comptes locaux : `admin@uidt-ept.test`, `aminata@uidt-ept.test`, `mamadou@uidt-ept.test`, `fatou@uidt-ept.test` et `ibrahima@uidt-ept.test` — mot de passe `password`. Ces identifiants sont réservés au développement et ne sont pas créés en production. `php artisan db:seed` peut être relancé sans dupliquer les données.

Terminal 2 — Angular :

```powershell
Set-Location frontend
npm install
npm start -- --host localhost --port 4200
```

Ouvrir `http://localhost:4200`. Le proxy Angular transmet `/api` et `/sanctum` à `http://127.0.0.1:8000`, ce qui permet l’authentification SPA par cookie et la protection CSRF.

### Visualiser sur un téléphone (même Wi-Fi)

1. Repérer l’adresse IPv4 Wi-Fi du PC avec `Get-NetIPConfiguration`.
2. Ajouter `<IP_DU_PC>:4200` à `SANCTUM_STATEFUL_DOMAINS` dans `backend\.env`, et ajouter `<IP_DU_PC>` à `allowedHosts` dans `frontend\angular.json`. Redémarrer Laravel pour relire `.env`.
3. Lancer Angular avec `npm start -- --host 0.0.0.0 --port 4200`.
4. Ouvrir `http://<IP_DU_PC>:4200` sur le téléphone.

Le proxy garde l’API Laravel sur le PC : seul le port Angular 4200 doit être accessible depuis le réseau local. Si Windows demande une autorisation, choisir le réseau privé et ne pas exposer le serveur de développement à Internet. Les adresses de cette configuration sont locales et peuvent changer avec le DHCP.

## Premier administrateur

1. Créer un compte depuis l’application.
2. Dans le dossier `backend`, approuver ce compte et lui attribuer le rôle administrateur :

```powershell
php artisan forum:make-admin admin@example.org
```

3. Se connecter avec ce compte. Les autres comptes en attente pourront être validés et se voir attribuer les rôles Participant ou Animateur dans **Administration**.

## Tests et commandes utiles

```powershell
Set-Location backend
php artisan test
vendor\bin\pint --test
```

```powershell
Set-Location frontend
npm run build
```

## Production

Définir `APP_KEY`, `APP_ENV=production`, `APP_DEBUG=false`, une base PostgreSQL/MySQL, un transport mail et `FRONTEND_URL`. Mettre le frontend et l’API derrière HTTPS ; idéalement les publier sous la même origine avec un reverse proxy. Configurer `SANCTUM_STATEFUL_DOMAINS` avec les domaines réels de l’application, les cookies de session sécurisés et un CORS restreint si les origines diffèrent. Prévoir sauvegardes quotidiennes et restauration vérifiée avant le lancement : elles ne sont pas automatisées par le MVP.

### Déployer sur Render

Le Blueprint [`render.yaml`](./render.yaml) déploie Angular et Laravel dans un même service Docker, avec PostgreSQL. Pour l’utiliser, pousser le dépôt sur GitHub puis choisir **New > Blueprint** dans Render et sélectionner ce dépôt. La configuration crée une base PostgreSQL et un disque persistant pour les photos de profil ; ces ressources utilisent des offres payantes Render. Les migrations Laravel sont exécutées au démarrage du service.
"# forum_sec_uidt_ept" 
