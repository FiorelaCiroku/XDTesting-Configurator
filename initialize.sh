#!/bin/sh

# get this directory path
# see https://stackoverflow.com/a/4774063/7432968
CURRENT_DIR="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

# check if npm is installed
if ! [ -x "$(command -v npm)" ]
then
    # if not, exit
    echo -e "\033[0;31mnpm not found\033[0m"
    exit 1
fi

# run npm install on frontend
cd "$CURRENT_DIR/configurator" && npm install

# set composer install path
# this_script_path/server
export COMPOSER_INSTALL_PATH="$CURRENT_DIR/server"
cd $COMPOSER_INSTALL_PATH

# check if composer is installed globally
if ! [ -x "$(command -v composer)" ]
then
    # if not, check if php is installed globally
    if ! [ -x "$(command -v php)" ]
    then
        # if not, exit
        echo -e "\033[0;31mphp not found\033[0m"
        exit 1
    else
        # if php is found but not composer, install the latter globally
        if $COMPOSER_INSTALL_PATH/install-composer.sh
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

$COMPOSER_COMMAND install
