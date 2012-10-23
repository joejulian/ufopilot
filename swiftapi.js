/*  Copyright (c) 2012 Joe Julian, All Rights Reserved
 *
 *  This file is part of ufopilot
 *
 *  ufopilot is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  ufopilot is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with ufopilot.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
var swiftdemo = {
    authkey: "",
    baseurl: "",
    volume:  "ufodemo",
    tempurlkey: "demotempurlkey",
    containers: {},
    auth: function (form) {
        var username = form.username.value;
        var password = form.password.value;
        this.authorize(username, password);
        return false;
    },
    reauthorize: function (stage) {
        if(stage == 0) {
            if(this.authkey) {
                this.checkkey(this.authkey,stage);
                return false;
            } else {
                stage = 1;
            }
        }
        if(stage == 1) {
            if(supports_html5_storage()) {
                var authkey = localStorage["swiftdemo.authkey"];
                if(authkey) {
                    this.checkkey(authkey,stage);
                    return false;
                }
            }
        }
        swiftdemo.list.display(false);
        swiftdemo.upload.display(false);
        swiftdemo.container.display(false);
        swiftdemo.authinfo.display(true);
    },
    checkkey: function (key, stage) {
        if(key) {
            $.ajax({
                type: "HEAD",
                beforeSend: function (request) {
                    request.setRequestHeader("X-Auth-Token", key);
                },
                url: this.baseurl + "/v1/AUTH_" + this.volume,
                processData: false,
                success: function (data, status, request) {
                    swiftdemo.authkey = key;
                    if(supports_html5_storage()) {
                        localStorage['swiftdemo.authkey'] = key;
                    }
                    swiftdemo.list.display(true);
                    swiftdemo.authinfo.display(false);
                },
                error: function (data, status, request) {
                    swiftdemo.reauthorize(stage + 1);
                },
            });
        }
    },
    authorize: function (username, password) {
        $.ajax({
            type: "GET",
            beforeSend: function (request) {
                request.setRequestHeader("X-Storage-User", swiftdemo.volume + ":" + username);
                request.setRequestHeader("X-Storage-Pass", password);
            },
            url: this.baseurl + "/auth/v1.0",
            processData: false,
            success: function (data, status, request) {
                swiftdemo.authkey = request.getResponseHeader("X-Auth-Token");
                localStorage['swiftdemo.authkey'] = swiftdemo.authkey;
                swiftdemo.list.display(true);
                swiftdemo.authinfo.display(false);
            },
            error: function() {
                alert("Invalid Credentials");
            }
        });
    },
    download: function(target) {
        target = "/v1/AUTH_" + swiftdemo.volume + "/" + target
        var d = new Date();
        var unixtime = Math.ceil(d.valueOf() / 1000 + 600).toString();
        var hmac_body = ["GET", unixtime, target].join("\n");
        var shaObj = new jsSHA(hmac_body, "ASCII");
        var sig = shaObj.getHMAC(swiftdemo.tempurlkey, "ASCII", "SHA-1", "HEX");
        dwin = window.open(swiftdemo.baseurl + encodeURIComponent(target).replace('%2F','/') + '?temp_url_sig=' + sig +
            '&temp_url_expires=' + unixtime);
        dwin.document.title = "Download Page";
        window.focus();
        return false;
    },
    logout: function() {
        localStorage["swiftdemo.authkey"] = null;
        this.authkey = null;
        swiftdemo.list.display(false);
        swiftdemo.upload.display(false);
        swiftdemo.container.display(false);
        swiftdemo.authinfo.display(true);
        return false;
    },
    authinfo: {
        display: function(bool) {
            var thisdiv = document.getElementById("authinfo");
            if (bool) {
                thisdiv.style.display = "inherit";
            } else {
                thisdiv.style.display = "none";
            }
        }
    },
    list: {
        display: function(bool) {
            if (this.authkey != "") {
                var thisdiv = document.getElementById("list");
                if (bool) {
                    // Load the list here
                    this._getContainers();
                    thisdiv.style.display = "inherit";
                } else {
                    thisdiv.style.display = "none";
                }
            } else {
                swiftdemo.authinfo.display(true);
            }
        },
        _getContainers: function() {
            $.ajax({
                type: "GET",
                dataType: 'json',
                url: swiftdemo.baseurl + "/v1/AUTH_" + swiftdemo.volume,
                beforeSend: function (request) {
                    request.setRequestHeader("X-Auth-Token", swiftdemo.authkey);
                    request.setRequestHeader("Accept", "application/json");
                },
                success: function (data) {
                    swiftdemo.containers = data;
                    swiftdemo.list.viewContainers();
                },
                error: function (data) {
                    swiftdemo.list.display(false);
                    swiftdemo.authinfo.display(true);
                },
            });
        },
        viewContainers: function() {
            var items = [];
            var selected = "";
            $.each(swiftdemo.containers, function(key, val) {
                items.push('<li id=' + swiftdemo.hashid('li_'+ val['name']) + '>' + swiftdemo.list.containerItem( key, val ) + '</li>');
            });

            $('#filelist').replaceWith($('<fieldset/>', {
                'id': 'filelist',
                html: $('<ul/>', {
                    'class': 'containers',
                    html: items.join('')
                }),
            }))
            $.each(swiftdemo.containers, function(key, val) {
                var obj = document.getElementById(swiftdemo.hashid(val['name']));
                if(swiftdemo.container.selected[val['name']]) {
                    obj.checked = true
                } else {
                    obj.checked = false
                }
                swiftdemo.container.select(obj);
            });
        },
        containerItem: function(key, val) {
            if(swiftdemo.container.selected[val['name']]) {
                selected = " checked";
            } else {
                selected = "";
            }
            return '<label for="' + swiftdemo.hashid(val['name']) + '">' + val['name'] + 
                '</label><input type="checkbox" id="' + swiftdemo.hashid(val['name']) + 
                '" onchange="swiftdemo.container.select(this)"'+ selected + ' value="' +
                val['name'] + '" />';
        },
        refresh: function() {
            this._getContainers();
            return false;
        },
    },
    container: {
        contents: {},
        selected: {},
        create: function(form) {
            var container = form.container.value;
            $.ajax({
                type: "PUT",
                processData: false,
                url: encodeURIComponent(swiftdemo.baseurl + "/v1/AUTH_" + swiftdemo.volume + "/" + container).replace('%2F','/'),
                beforeSend: function (request) {
                    request.setRequestHeader("X-Auth-Token", swiftdemo.authkey);
                    request.setRequestHeader("Accept", "application/json");
                },
                success: function () {
                    swiftdemo.list.display(true);
                    swiftdemo.container.display(false);
                },
                error: function (data) {
                    swiftdemo.authinfo.display(true);
                    swiftdemo.container.display(false);
                },
            });
            return false;
        },
        display: function(bool) {
            if (this.authkey != "") {
                var thisdiv = document.getElementById("create");
                if (bool) {
                    thisdiv.style.display = "inherit";
                    swiftdemo.list.display(false);
                } else {
                    thisdiv.style.display = "none";
                }
            } else {
                swiftdemo.authinfo.display(true);
            }
            return false;
        },
        select: function(container) {
            var thisli = document.getElementById(swiftdemo.hashid("li_" + container.value));
            if(container.checked) {
                this._getObjects(container.value);
            } else {
                $('#' + swiftdemo.hashid('files_' + container.value)).replaceWith("");
            }
            thisli.style.listStyleType = container.checked ? "circle" : "disc";
            this.selected[container.id] = !this.selected[container.id];
        },
        _getObjects: function(container) {
            $.ajax({
                type: "GET",
                dataType: 'json',
                url: encodeURIComponent(swiftdemo.baseurl + "/v1/AUTH_" + swiftdemo.volume + "/" + container).replace('%2F','/'),
                beforeSend: function (request) {
                    request.setRequestHeader("X-Auth-Token", swiftdemo.authkey);
                    request.setRequestHeader("Accept", "application/json");
                },
                success: function (data) {
                    swiftdemo.container.contents[container] = data;
                    swiftdemo.container.view(container);
                },
                error: function (data) {
                    swiftdemo.authinfo.display(true);
                    swiftdemo.list.display(false);
                },
            });
        },
        view: function(container) {
            var items = [];
            var itemid = null;
            $.each(swiftdemo.container.contents[container], function(key, val) {
                itemid = swiftdemo.hashid('li_' + container + val['name']);
                if(val.content_type != "application/directory") {
                    items.push('<li id="' + itemid + '">' + 
                        '<a href="#" onMouseDown="return swiftdemo.download(\'' + 
                        container + '/' + val['name'] + '\')">' + 
                        val['name'] + '</a></li>');
                } else {
                    items.push('<li id="' + itemid + '" style="list-style-type: disc">' + 
                        val['name'] + '</li>');
                }
            });

            $('#' + swiftdemo.hashid('li_' + container)).append($('<ul/>', {
                'id'   : swiftdemo.hashid('files_' + container),
                'class': 'files',
                html   : items.join(''),
            }));
        },
    },
    upload: {
        display: function(bool) {
            if (this.authkey != "") {
                var thisdiv = document.getElementById("upload");
                if (bool) {
                    thisdiv.style.display = "inherit";
                    swiftdemo.list.display(false);
                    this.startForm();
                } else {
                    thisdiv.style.display = "none";
                }
            } else {
                swiftdemo.authinfo.display(true);
            }
            return false;
        },
        startForm: function() {
            var items = [];
            var foo = Object.keys(swiftdemo.container.contents)
            $.each(swiftdemo.containers, function(key, val) {
                items.push('<option>' + val['name'] + '</option>');
            });
            $('#upload_form_container').html(items.join());
            this.selectContainer();
        },
        selectContainer: function() {
            var target = "/v1/AUTH_" + swiftdemo.volume + "/" + $('#upload_form_container').val()
            $('#upload_form').attr("action",encodeURIComponent(target).replace('%2F','/'));
            var redirect = window.location.pathname + '#';
            $('#upload_form_redirect').val(redirect);
            var max_file_size = $('#upload_form_size').val();
            var max_file_count = $('#upload_form_count').val();
            var d = new Date();
            var expires = Math.ceil(d.valueOf() / 1000 + 3600).toString();
            $('#upload_form_expire').val(expires);
            var hmac_body = [target, redirect, max_file_size, max_file_count, expires ].join("\n");
            var shaObj = new jsSHA(hmac_body, "ASCII");
            var sig = shaObj.getHMAC(swiftdemo.tempurlkey, "ASCII", "SHA-1", "HEX");
            $('#upload_form_sig').val(sig);
        },
    },
    hashid: function(string) {
        var shaObj = new jsSHA(string, "ASCII");
        return "swift_" + shaObj.getHash("SHA-1", "HEX");
    },
}

function supports_html5_storage() {
    try {
        return 'localStorage' in window && window['localStorage'] !== null;
    } catch (e) {
        return false;
    }
}

$(document).ready(function() {
    swiftdemo.reauthorize(0);
});
