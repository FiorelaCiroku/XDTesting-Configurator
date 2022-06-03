FROM php:8.1.3-apache

RUN apt update -y && \
    curl -fsSL https://deb.nodesource.com/setup_16.x | bash - && \
    apt install -y nodejs unzip git

COPY . /root/project
RUN cd /root/project/configurator && npm i && npm run build && \
    cd /root/project/server && \
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" && \
    php composer-setup.php && \
    php -r "unlink('composer-setup.php');" && \
    php ./composer.phar install && \
    a2enmod rewrite && \
    cp -r /root/project/configurator/dist/configurator/* /var/www/html && \
    cp -r /root/project/server /var/www/html/api && \
    cp /root/project/frontend.htaccess /var/www/html/.htaccess && \
    rm -rf /root/project
