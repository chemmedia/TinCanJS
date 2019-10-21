/**
TinCan client library

@module TinCan
@submodule TinCan.Environment.ReactNative
**/
(function() {
    /* globals require,fetch,Buffer,ArrayBuffer,Uint8Array */
    "use strict";
    var LOG_SRC = "Environment.ReactNative",
        log = TinCan.prototype.log,
        requestComplete;

    requestComplete = function (xhr, cfg) {
        log("requestComplete - xhr.status: " + xhr.status, LOG_SRC);
        log("requestComplete - xhr.responseText: " + xhr.responseText, LOG_SRC);
        var requestCompleteResult,
            httpStatus = xhr.status,
            notFoundOk = (cfg.ignore404 && httpStatus === 404);

        if ((httpStatus >= 200 && httpStatus < 400) || notFoundOk) {
            if (cfg.callback) {
                cfg.callback(null, xhr);
                return;
            }

            requestCompleteResult = {
                err: null,
                xhr: xhr
            };
            return requestCompleteResult;
        }

        requestCompleteResult = {
            err: httpStatus,
            xhr: xhr
        };
        if (httpStatus === 0) {
            log("[warning] There was a problem communicating with the Learning Record Store. Aborted, offline, or invalid CORS endpoint (" + httpStatus + ")", LOG_SRC);
        }
        else {
            log("[warning] There was a problem communicating with the Learning Record Store. (" + httpStatus + " | " + xhr.responseText+ ")", LOG_SRC);
        }
        if (cfg.callback) {
            cfg.callback(httpStatus, xhr);
        }
        return requestCompleteResult;
    };

    //
    // Override LRS' init method to set up our request handling
    // capabilities, basically empty implementation here so that
    // we don't get a no-env loaded message
    //
    TinCan.LRS.prototype._initByEnvironment = function () {};

    TinCan.LRS.prototype._makeRequest = function(fullUrl, headers, cfg) {
        log("_makeRequest using http/https", LOG_SRC);
        var url = fullUrl,
            qs = require("qs")
        ;

        if (typeof cfg.params !== "undefined" && Object.keys(cfg.params).length > 0) {
            url += "?" + qs.stringify(cfg.params);
        }

        if (typeof cfg.data !== "undefined") {
            cfg.data += "";
        }

        fetch(url, {
                method: cfg.method,
                headers: headers,
                body: cfg.data,
                credentials: "include"
            })
            .then(function(response) {
                requestComplete(
                    {
                        readyState: 4,
                        responseText: response.text(),
                        responseUrl: response.url,
                        status: response.status,
                        statusText: response.statusText,
                        getResponseHeader: function(key) {
                            return response.headers.get(key);
                        }
                    },
                    cfg
                );
            });
    };

    //
    // Synchronous request handling is unsupported in react-native
    //
    TinCan.LRS.syncEnabled = false;

    TinCan.Utils.stringToArrayBuffer = function (content, encoding) {
        var b,
            ab,
            view,
            i;

        if (! encoding) {
            encoding = TinCan.Utils.defaultEncoding;
        }

        if (typeof Buffer.from === "undefined") {
            // for Node.js prior to v4.x
            b = new Buffer(content, encoding);

            ab = new ArrayBuffer(b.length);
            view = new Uint8Array(ab);
            for (i = 0; i < b.length; i += 1) {
                view[i] = b[i];
            }

            return ab;
        }

        b = Buffer.from(content, encoding);
        ab = b.buffer;

        //
        // this .slice is required because of the internals of how Buffer is
        // implemented, it uses a shared ArrayBuffer underneath for small buffers
        // see http://stackoverflow.com/a/31394257/1464957
        //
        return ab.slice(b.byteOffset, b.byteOffset + b.byteLength);
    };

    TinCan.Utils.stringFromArrayBuffer = function (content, encoding) {
        var b,
            view,
            i;

        if (! encoding) {
            encoding = TinCan.Utils.defaultEncoding;
        }

        if (typeof Buffer.from === "undefined") {
            // for Node.js prior to v4.x
            b = new Buffer(content.byteLength);

            view = new Uint8Array(content);
            for (i = 0; i < b.length; i += 1) {
                b[i] = view[i];
            }
        }
        else {
            b = Buffer.from(content);
        }

        return b.toString(encoding);
    };
}());
