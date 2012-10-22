ufopilot 
======== 
 
UfoPilot is an HTML5/Javascript tool for managing Gluster Unified File and Object (UFO) Storage. 
 
Installation
============
Install GlusterFS according to the [QuickStart Guide](http://www.gluster.org/community/documentation/index.php/QuickStart)

The rest of these instructions will assume you used the volume named gv0 as in the QuickStart Guide

Install the swift components:

    yum install 'glusterfs-swift*' memcached
    
Add some middleware to /etc/swift/proxy-server.conf

Change the pipeline to read:

    pipeline = healthcheck cache tempauth staticweb tempurl formpost proxy-server
    
Add the following sections:

    [filter:cache]
    use = egg:swift#memcache
    memcache_servers = 127.0.0.1:11211
    
    [filter:staticweb]
    use = egg:swift#staticweb
    
    [filter:tempurl]
    use = egg:swift#tempurl
    
    [filter:formpost]
    use = egg:swift#formpost

Set up your user(s) by adding them to the [filter:tempauth] section. For this example, the username will be "tommy"
and the password will be "demo". Note gv0 in there which is the volume we created earlier:

    user_gv0_tommy=demo .admin

For production, you should probably enable encryption by setting the cert\_file and key\_file after creating the 
appropriate files with your certificate provider (OPTIONAL):

    bind_port = 443
    cert_file = /etc/swift/cert.crt
    key_file = /etc/swift/cert.key

These instructions will continue using unencrypted connections.

Start your new services

    service memcached start
    service gluster-swift-object start
    service gluster-swift-container start
    service gluster-swift-account start
    service gluster-swift-proxy start

Retrieve this package and it's dependency

    git clone git://github.com/joejulian/ufopilot.git
    wget https://github.com/downloads/Caligatio/jsSHA/jsSHA-1.31.tar.bz2
    cd ufopilot
    wget -O - https://github.com/downloads/Caligatio/jsSHA/jsSHA-1.31.tar.bz2 | tar xjv -C /tmp -f - jsSHA/src/sha.js
    mv /tmp/jsSHA/src/sha.js .
    rm -rf /tmp/jsSHA

Set some shell variables to make the rest of this more generic and save you copy/pasters some time

    $host=http://localhost:8080
    $user=tommy
    $pass=demo
    $volume=gv0
    $webcon=app

Create a container to be the web app container and set the permissions and index page

    swift -A $host/auth/v1.0 -U $volume:$user -K $pass post $webcon
    swift -A $host/auth/v1.0 -U $volume:$user -K $pass post $webcon -m 'web-index:index.html'
    swift -A $host/auth/v1.0 -U $volume:$user -K $pass post $webcon -r '.r:*'
    
Add a key for tempurl signing
    
    swift -A $host/auth/v1.0 -U $volume:$user -K $pass post -m 'tempurlkey'
    
Upload these files to your web app container

    swift -A $host/auth/v1.0 -U $volume:$user -K $pass upload $webcon *

Open your new app in your browser
    [My New Swift App Server](http://localhost:8080/v1/AUTH_gv0/app/)


License 
========
Copyright (c) 2012 Joe Julian, All Rights Reserved 
 
This file is part of ufopilot 
 
ufopilot is free software: you can redistribute it and/or modify 
it under the terms of the GNU General Public License as published by 
the Free Software Foundation, either version 3 of the License, or 
(at your option) any later version. 
 
ufopilot is distributed in the hope that it will be useful, 
but WITHOUT ANY WARRANTY; without even the implied warranty of 
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the 
GNU General Public License for more details. 
 
You should have received a copy of the GNU General Public License 
along with ufopilot.  If not, see <http://www.gnu.org/licenses/>. 

