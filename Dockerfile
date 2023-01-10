# STAGE 1 -> build frontend
FROM node:16 AS FE
COPY configurator /root/project
RUN cd /root/project && \
    npm ci && \
    npm run build


# STAGE 2 -> install backend dependencies
FROM php:8.1.3 AS BE
COPY server /root/project
RUN apt update -y && \
    apt install -y unzip git libzip-dev -y && \
    pecl install zip && \
    docker-php-ext-enable zip && \
    cd /root/project && \
    chown $USER: ./install-composer.sh && \
    chmod u+rx ./install-composer.sh && \
    ./install-composer.sh && \
    php composer.phar install && \
    rm composer.phar


# STAGE 3 -> final image
FROM php:8.1.3-apache AS final_image
RUN a2enmod rewrite
COPY --from=FE /root/project/dist/configurator/* /var/www/html/
COPY --from=BE /root/project /var/www/html/api/
COPY frontend.htaccess /var/www/html/.htaccess

# RUN apt update -y && \
#     apt install curl -y && \
#     curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
#     apt install -y nodejs unzip git libzip-dev -y && \
#     pecl install zip && \
#     docker-php-ext-enable zip && \
#     a2enmod rewrite && \
#     /root/project/initialize.sh && \
#     cd /root/project/configurator && \
#     npm run build && \
#     cp -r /root/project/configurator/dist/configurator/* /var/www/html && \
#     cp -r /root/project/server /var/www/html/api && \
#     cp /root/project/frontend.htaccess /var/www/html/.htaccess && \
#     rm -rf /root/project
