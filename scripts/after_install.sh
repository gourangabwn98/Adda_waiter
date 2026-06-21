#!/bin/bash
set -e
echo "=== AfterInstall: setting permissions ==="
chown -R ubuntu:ubuntu /var/www/adda-frontend
find /var/www/adda-frontend -type d -exec chmod 755 {} \;
find /var/www/adda-frontend -type f -exec chmod 644 {} \;
echo "=== Done ==="