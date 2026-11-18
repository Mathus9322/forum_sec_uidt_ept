# Déployer le forum sur Render (services séparés)

Ce guide décrit le déploiement de l’application avec trois ressources Render indépendantes :

1. une base PostgreSQL ;
2. l’API Laravel, exécutée dans un service Docker ;
3. l’interface Angular, publiée comme site statique.

## État du dépôt et prérequis importants

Le [Dockerfile](../Dockerfile) à la racine construit maintenant uniquement l’API Laravel. Son contexte de build doit rester la racine du dépôt : il copie `backend/` et `docker/apache-vhost.conf`.

La séparation des services nécessite aussi quelques adaptations de l’application avant le premier déploiement :

- Les appels de [AuthService](../frontend/src/app/auth.service.ts) et [ForumService](../frontend/src/app/forum.service.ts) utilisent actuellement des URL relatives (`/api/...`, `/sanctum/...`). Ils doivent pointer vers l’URL publique de l’API, par exemple `https://api.forumuidteptuidt.app`.
- Les requêtes Angular vers cette autre origine doivent envoyer les cookies de session et le jeton XSRF (`withCredentials` et configuration XSRF adaptée aux requêtes cross-origin).
- Laravel doit autoriser l’origine exacte du frontend avec CORS et les credentials.
- L’accessor `avatar_url` de [User](../backend/app/Models/User.php) renvoie actuellement une URL relative. En déploiement séparé, cette URL doit pointer vers le domaine de l’API.
- Le Dockerfile initialise `FRONTEND_URL` à la même adresse que l’API. Il faut le modifier pour respecter la variable `FRONTEND_URL` configurée sur Render, afin que les liens de réinitialisation reviennent sur le frontend.

Ne passez pas directement à la configuration Render tant que ces points ne sont pas pris en charge : le site pourra s’afficher, mais l’authentification, les appels API ou les avatars risquent d’échouer.

## 1. Choisir les domaines

Utilisez deux sous-domaines du même domaine personnalisé, par exemple :

| Ressource | Domaine |
| --- | --- |
| Frontend Angular | `https://forumuidteptuidt.app` |
| API Laravel | `https://api.forumuidteptuidt.app` |

Cette configuration permet le partage contrôlé des cookies de session entre sous-domaines. N’utilisez pas les adresses `onrender.com` comme URL principale de connexion si le frontend et l’API sont séparés.

Dans **Settings → Custom Domains** des services Render, ajoutez le domaine frontend au site statique et le sous-domaine `api` au service backend. Configurez les enregistrements DNS indiqués par Render chez votre fournisseur de domaine, puis attendez que Render confirme les certificats HTTPS.

## 2. Créer PostgreSQL

1. Dans Render, choisissez **New → PostgreSQL**.
2. Donnez un nom, par exemple `forum-db`.
3. Choisissez une région et réutilisez-la pour les deux services web.
4. Choisissez un plan adapté à vos besoins. Vérifiez le prix et la politique de rétention avant de confirmer.
5. Une fois la base créée, utilisez son **Internal Database URL** pour le backend. Ne placez pas cette URL dans le code ou dans le frontend.
6. Configurez des sauvegardes adaptées à vos besoins et vérifiez périodiquement qu’une restauration est possible.

Dans un Blueprint, la connexion interne peut être liée sans copier le secret :

```yaml
- key: DB_CONNECTION
  value: pgsql
- key: DB_URL
  fromDatabase:
    name: forum-db
    property: connectionString
```

Le nom `forum-db` doit correspondre exactement à celui de la ressource déclarée dans le Blueprint.

## 3. Déployer l’API Laravel

Créez un **Web Service** à partir du dépôt GitHub :

1. Choisissez la branche à déployer.
2. Laissez **Root Directory** vide (racine du dépôt).
3. Choisissez l’environnement Docker.
4. Dockerfile : `./Dockerfile`.
5. Docker build context : `.`.
6. Health check path : `/api/sessions`.
7. Ajoutez un disque persistant monté sur `/var/www/html/storage/app/public` pour conserver les photos de profil lors des redéploiements.

Le conteneur exécute les migrations et les seeders avant de démarrer Apache. La base doit être joignable et les variables de seed administrateur configurées, sinon le démarrage échoue.

### Variables d’environnement du backend

Configurez-les dans **Environment** du service backend :

| Variable | Valeur |
| --- | --- |
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | Valeur générée une fois par Render ; la conserver lors des déploiements suivants |
| `APP_DOMAIN` | `api.forumuidteptuidt.app` |
| `APP_URL` | `https://api.forumuidteptuidt.app` |
| `FRONTEND_URL` | `https://forumuidteptuidt.app` |
| `DB_CONNECTION` | `pgsql` |
| `DB_URL` | Internal Database URL de `forum-db` |
| `SESSION_DRIVER` | `database` |
| `SESSION_DOMAIN` | `.forumuidteptuidt.app` |
| `SESSION_SECURE_COOKIE` | `true` |
| `SESSION_SAME_SITE` | `lax` |
| `SANCTUM_STATEFUL_DOMAINS` | `forumuidteptuidt.app,api.forumuidteptuidt.app` |
| `FILESYSTEM_DISK` | `public` |
| `CACHE_STORE` | `database` |
| `QUEUE_CONNECTION` | `database` |
| `LOG_CHANNEL` | `stderr` |
| `LOG_LEVEL` | `info` |
| `SEED_ADMIN_EMAIL` | Adresse réelle du compte administrateur initial |
| `SEED_ADMIN_PASSWORD` | Mot de passe fort, au moins 16 caractères |

`SEED_ADMIN_PASSWORD` est un secret : saisissez-le dans le tableau de bord Render, jamais dans Git, le Blueprint ou une conversation. Les comptes de démonstration non administrateurs créés par les seeders reçoivent des mots de passe aléatoires en production.

Pour les liens de réinitialisation, configurez aussi un fournisseur de courrier : `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SCHEME`, `MAIL_FROM_ADDRESS` et `MAIL_FROM_NAME`. Sans transport mail de production, les demandes de réinitialisation ne parviendront pas aux utilisateurs.

### Adapter l’entrypoint du Dockerfile

Le Dockerfile doit définir `APP_URL` depuis le domaine API, mais conserver `FRONTEND_URL` fourni par Render. La logique d’initialisation doit être équivalente à :

```sh
HOST=${APP_DOMAIN:-${RENDER_EXTERNAL_HOSTNAME:-forum-sec-uidt-ept.onrender.com}}
FRONTEND=${FRONTEND_URL:-https://$HOST}
export APP_URL=https://$HOST FRONTEND_URL=$FRONTEND
```

Il faut également conserver dans `SANCTUM_STATEFUL_DOMAINS` les domaines fournis par Render ; ne pas les remplacer par le seul `RENDER_EXTERNAL_HOSTNAME`.

## 4. Configurer CORS et Sanctum

L’origine du frontend doit être autorisée explicitement côté Laravel. Ajoutez ou configurez `backend/config/cors.php` avec au minimum :

```php
'paths' => ['api/*', 'sanctum/csrf-cookie', 'sanctum/*'],
'allowed_methods' => ['*'],
'allowed_origins' => ['https://forumuidteptuidt.app'],
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => true,
```

N’utilisez pas `*` pour `allowed_origins` avec des cookies. Si vous activez aussi `www.forumuidteptuidt.app`, ajoutez cette origine explicitement à CORS et à `SANCTUM_STATEFUL_DOMAINS`.

Le frontend doit d’abord demander `/sanctum/csrf-cookie` à l’API, puis envoyer les cookies et le jeton CSRF avec les appels de connexion. Configurez les requêtes cross-origin Angular pour inclure `withCredentials` et transmettre l’en-tête XSRF. Les cookies doivent être `Secure`, et leur domaine doit couvrir les deux sous-domaines.

Après tout changement des variables Render, déclenchez un nouveau déploiement ou redémarrez le service afin que Laravel recharge sa configuration.

## 5. Déployer Angular comme site statique

Créez un service **Static Site** à partir du même dépôt :

1. Branche : la même branche validée que le backend.
2. **Root Directory** : `frontend`.
3. **Build Command** : `npm ci && npm run build`.
4. **Publish Directory** : `dist/frontend/browser`.
5. Ajoutez le domaine `forumuidteptuidt.app`.
6. Ajoutez une règle de réécriture `/*` vers `/index.html` pour les routes Angular profondes.

La valeur `https://api.forumuidteptuidt.app` est une configuration publique, pas un secret. Le frontend doit l’utiliser comme base pour **toutes** les routes `/api/...` et `/sanctum/...`. Angular ne prend pas automatiquement une variable d’environnement Render et ne transforme pas les URL relatives en URL d’API : cette base doit être intégrée dans le build ou chargée depuis une configuration publique au démarrage.

Dans un Blueprint, la partie statique ressemble à ceci :

```yaml
- type: web
  name: forum-frontend
  runtime: static
  rootDir: frontend
  buildCommand: npm ci && npm run build
  staticPublishPath: dist/frontend/browser
  routes:
    - type: rewrite
      source: /*
      destination: /index.html
```

Ce bloc doit être ajouté au Blueprint en plus des ressources backend et PostgreSQL. Le `render.yaml` actuel configure un service Docker et une base ; il ne déclare pas encore le site statique séparé.

## 6. Ordre de déploiement initial

1. Créez PostgreSQL et attendez son état **Available**.
2. Déployez le backend avec l’Internal Database URL et les secrets administrateur.
3. Vérifiez que le service backend devient **Live** et que le health check `/api/sessions` répond avec du JSON.
4. Déployez le frontend statique avec son URL d’API configurée.
5. Configurez les domaines personnalisés et attendez les certificats HTTPS.
6. Confirmez que les domaines listés dans CORS, Sanctum et les cookies correspondent aux URL réellement utilisées.
7. Testez d’abord le frontend public, puis l’authentification.

## 7. Vérifications après déploiement

- `https://api.forumuidteptuidt.app/api/sessions` renvoie une réponse JSON.
- Le site `https://forumuidteptuidt.app` charge aussi les pages profondes après actualisation.
- Dans les outils réseau du navigateur, `GET /sanctum/csrf-cookie` est envoyé à l’API et ses cookies sont acceptés.
- Une connexion avec les identifiants de `SEED_ADMIN_EMAIL` et `SEED_ADMIN_PASSWORD` réussit ; ensuite `/api/me` renvoie le compte connecté.
- Un `/api/me` à `401` **avant** connexion est normal.
- La photo de profil reste accessible après un redémarrage du service, ce qui vérifie le disque persistant.
- Une erreur `419` suggère un problème de cookie ou de jeton CSRF ; une erreur CORS indique généralement une origine ou des credentials mal configurés.
- Pour un `500`, consultez les journaux du service backend Render. Avec `LOG_CHANNEL=stderr`, les exceptions doivent apparaître dans les logs du conteneur. Ne partagez jamais les mots de passe, cookies, clés ou URL de base contenant des identifiants.

## 8. Redéploiements et maintenance

- Chaque démarrage backend exécute `php artisan migrate --force` puis `php artisan db:seed --force`. Les seeders actuels sont conçus pour être relancés sans remplacer le contenu déjà modifié.
- Gardez `APP_KEY` stable. La changer invaliderait notamment les cookies et données chiffrées.
- Après un changement de code, poussez les commits sur la branche configurée et surveillez les logs de build et de démarrage des deux services.
- Avant une migration destructive ou une opération sur PostgreSQL, vérifiez une sauvegarde restaurable.
- Les fichiers du disque et les données PostgreSQL sont des ressources séparées : prévoyez et testez leurs sauvegardes indépendamment.

