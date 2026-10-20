# Farm Project — original PHP system packaged as a container.
# Apache + PHP serve the pages; the database runs in its own container
# (see docker-compose.yml). Configuration comes from environment variables.
FROM php:8.2-apache

# PHP extensions used by the code: mysqli (config.php) and PDO MySQL (dashboard, login, reports).
RUN docker-php-ext-install mysqli pdo_mysql

# Python for the AI veterinary assistant called by ai_vision.php.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip \
    && pip3 install --no-cache-dir --break-system-packages \
       mysql-connector-python pandas requests google-generativeai \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHON_PATH=/usr/bin/python3 \
    DB_HOST=db \
    DB_NAME=farmproject \
    DB_USER=farm \
    DB_PASS=farm

# index.html is the entry page, then PHP files.
RUN sed -i 's/DirectoryIndex .*/DirectoryIndex index.html index.php/' /etc/apache2/mods-enabled/dir.conf

WORKDIR /var/www/html
COPY . .

# Apache runs as www-data: it must be able to write uploads and the AI temp files.
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fs http://localhost/index.html > /dev/null || exit 1
