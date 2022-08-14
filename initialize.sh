#!/bin/sh

# get this directory path
# see https://stackoverflow.com/a/4774063/7432968
CURRENT_DIR="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

# check if npm is installed
if ! command -v npm &> /dev/null
then
    # if not, exit
    echo -e "\033[0;31mnpm not found\033[0m"
    exit 1
fi

# run npm install on frontend
cd "$CURRENT_DIR/configurator" && npm install

# set composer install path
# this_script_path/server
COMPOSER_INSTALL_PATH="$CURRENT_DIR/server"

# check if composer is installed globally
if ! command -v composer &> /dev/null
then
    # if not, check if php is installed globally
    if ! command -v php &> /dev/null
    then
        # if not, exit
        echo -e "\033[0;31mphp not found\033[0m"
        exit 1
    else
        # if php is found but not composer, install the latter globally
        if installComposer
        then
            COMPOSER_COMMAND="php composer.phar"
        else
            echo -e "\033[0;31munable to install composer\033[0m"
            exit 1
        fi
    fi
else
    COMPOSER_COMMAND="composer"
fi

# run composer install in server directory
cd "$CURRENT_DIR/server" && $COMPOSER_COMMAND install


installComposer() {
    # see https://getcomposer.org/doc/faqs/how-to-install-composer-programmatically.md

    echo "Installing composer in $COMPOSER_INSTALL_PATH"
    cd $COMPOSER_INSTALL_PATH

    local EXPECTED_CHECKSUM="$(php -r 'copy("https://composer.github.io/installer.sig", "php://stdout");')"
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
    local ACTUAL_CHECKSUM="$(php -r "echo hash_file('sha384', 'composer-setup.php');")"

    if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]
    then
        >&2 echo 'ERROR: Invalid installer checksum'
        rm composer-setup.php
        exit 1
    fi

    php composer-setup.php --quiet
    local RESULT=$?
    rm composer-setup.php
    return $RESULT
}
