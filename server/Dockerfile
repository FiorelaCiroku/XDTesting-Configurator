FROM php:8.1.3-apache

COPY . /var/www/html/

RUN apt update && \
    apt install git libzip-dev unzip -y && \
    pecl install zip && \
    docker-php-ext-enable zip && \
    cd /var/www/html/ && \
    chown $USER: ./install-composer.sh && \
    chmod u+rx ./install-composer.sh && \
    ./install-composer.sh && \
    php ./composer.phar install --no-dev && \
    a2enmod rewrite

