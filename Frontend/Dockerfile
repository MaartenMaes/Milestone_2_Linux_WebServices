# Use official Apache httpd image as base
# This is a lightweight web server optimized for serving static files
FROM httpd:2.4-alpine

# LABEL adds metadata to the image
# Useful for identifying the image purpose and author
LABEL maintainer="maarten@mm.local" \
    description="Frontend web server for milestone 2 app" \
    version="1.0"

# Copy index.html from local machine to container's web root
# /usr/local/apache2/htdocs/ is the default Apache document root
# where httpd looks for files to serve
COPY index.html /usr/local/apache2/htdocs/

# EXPOSE documents which ports the container listens on
# Port 80 is the standard HTTP port
# Note: This doesn't actually publish the port, it documents it
EXPOSE 80

# httpd runs in foreground mode when using this base image
# No need for explicit CMD - inherited from base image