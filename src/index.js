import React from "react";
import express from "express";
import {OK} from "http-status-codes";
import appRootPath from "app-root-path";
import {renderToString} from "react-dom/server";
import {compile} from "handlebars";

import App from "./app/App";

const serviceWorkerPath = "/serviceworker";
const torusPath = "/torus";

const app = ({
  enableLogging,
  proxyContractAddress,
  network,
  verifierMap,
  loginToConnectionMap,
  selectedVerifier,
}) => (req, res, next) => Promise
  .resolve()
  .then(
    () => { 
      const jwtParams = loginToConnectionMap[selectedVerifier] || {};
      const verify = verifierMap[selectedVerifier];
      //const {typeOfLogin, clientId, verifier} = verifierMap[selectedVerifier];
      //const jwtParams = loginToConnectionMap[selectedVerifier] || {};
      const path = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
      const baseUrl = `${path.substring(0, path.length - `${torusPath}/${selectedVerifier}`.length)}${serviceWorkerPath}`;
      const config = Object.freeze({
        baseUrl,
        enableLogging,
        proxyContractAddress,
        network,
        verify,
        jwtParams,
        //verifierMap[selectedVerifier]
        //loginToConnectionMap,
        //verifierMap,
        //selectedVerifier,
        //loginToConnectionMap,
        //verifierMap,
        //selectedVerifier,
      });
      // TODO: pass children for custom render
      const container = renderToString(
        <App
          config={config}
        />);
      const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Torus Login</title>
    <script>
      /* extern */
      window.__REACT_APP_CONFIG__ = ${JSON.stringify(config)};
    </script>
  </head>
  <body>
    <div id="container">{{{container}}}</div>
    <script src="${torusPath}/app.js" charset="utf-8"></script>
    <script src="${torusPath}/vendor.js" charset="utf-8"></script>
  </body>
</html>
      `.trim();
      return res
        .status(OK)
        .send(compile(html)({container}));
    },
  )
  .catch(next);

export const torus = (opts) => {
  const {verifierMap} = opts;
  return Object
    .keys(verifierMap)
    .reduce(
      (middleware, selectedVerifier) => middleware
        .get(`${torusPath}/${selectedVerifier}`, app({...opts, selectedVerifier})),
      express()
        .get(`${serviceWorkerPath}/redirect.html`, (_, res) => res.status(OK).sendFile(appRootPath + '/node_modules/@toruslabs/torus-direct-web-sdk/serviceworker/redirect.html'))
        .get(`${serviceWorkerPath}/sw.js`, (_, res) => res.status(OK).sendFile(appRootPath + '/node_modules/@toruslabs/torus-direct-web-sdk/serviceworker/sw.js'))
        .get(`${torusPath}/app.js`, (_, res) => res.status(OK).sendFile(appRootPath + '/node_modules/express-torus/dist/app.js'))
        .get(`${torusPath}/vendor.js`, (_, res) => res.status(OK).sendFile(appRootPath + '/node_modules/express-torus/dist/vendor.js')),

    );
};


