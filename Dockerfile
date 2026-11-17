FROM node:22-alpine AS frontend

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM php:8.4-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev libpq-dev libzip-dev unzip \
    && docker-php-ext-install mbstring pdo_pgsql zip \
    && a2enmod headers rewrite \
    && sed -i 's/Listen 80/Listen 10000/' /etc/apache2/ports.conf \
    && rm -rf /var/lib/apt/lists/*

COPY docker/apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist

COPY backend/ ./
COPY --from=frontend /app/frontend/dist/frontend/browser/ /var/www/html/public/

RUN composer dump-autoload --no-dev --optimize --no-interaction \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views \
    && chown -R www-data:www-data bootstrap/cache storage

EXPOSE 10000

CMD ["sh", "-c", "set -eu; HOST=${RENDER_EXTERNAL_HOSTNAME:-forum-sec-uidt-ept.onrender.com}; export APP_URL=https://$HOST FRONTEND_URL=https://$HOST SANCTUM_STATEFUL_DOMAINS=$HOST; mkdir -p storage/app/public; chown -R www-data:www-data storage/app/public; php artisan migrate --force; exec apache2-foreground"]
