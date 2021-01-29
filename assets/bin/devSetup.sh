#!/bin/bash
HOST=localhost
PORT=9090
UNAME="$(uname -s)"
if [ "$UNAME" != Linux ]; then
    echo "$0 is for Linux only"
    exit 0
fi

echo "Start Xcalar Design Configuration..."
echo "Install necessary packages..."
# install newer nodejs and npm
if [ "$(node -v 2>/dev/null | cut -d'.' -f1)" != "v5" ]; then
    curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
    sudo apt-get update
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
    hash -r
fi

# install apache if not exist
if [ ! -e /etc/apache2 ]
then
    echo "do not have apache2, install apache2..."
    sudo apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y apache2
fi

# set up apache
echo "Set up apache..."
FILE=/etc/apache2/conf-available/fqdn.conf
if grep -sq "ServerName localhost" "$FILE"
then
    echo "fqdn.conf file already set up"
else
    echo "creating fqdn for apache2"
    echo "ServerName localhost" | sudo tee /etc/apache2/conf-available/fqdn.conf && sudo a2enconf fqdn
fi
sudo service apache2 reload

sudo cp /etc/apache2/sites-available/000-default.conf  XI.conf
sed -i 's,/var/www/html,/var/www/xcalar-gui,' XI.conf
sudo mv XI.conf /etc/apache2/sites-available/
sudo ln -sfn $XLRGUIDIR/prod /var/www/xcalar-gui
sudo a2dissite 000-default && sudo a2ensite XI
sudo service apache2 restart
