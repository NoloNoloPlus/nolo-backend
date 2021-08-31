const fs = require('fs')
const path = require('path')
const rewrite = require('express-urlrewrite')

const mergeUrls = (url1, url2) => {
    if (url1.endsWith('/')) {
        url1 = url1.substring(0, url1.length - 1);
    }
    if (url2[0] == '/') {
        url2 = url2.substring(1, url2.length);
    }

    return url1 + '/' + url2;
}

module.exports = (baseUrl, folder, routePath='dynamicRoutes.js', strict=true) => {
    const routeAbsolutePath = path.join(folder, routePath)
    if (fs.existsSync(routeAbsolutePath)) {
        const routes = require(routeAbsolutePath);
        const rewrites = [];
        for (var route of routes) {
            route = mergeUrls(baseUrl, route);

            const re = /\[(.+)\]/g;
            var matches;
            const routeReplacements = [];
            while ((matches = re.exec(route)) != null) {
                const match = matches[1];
                routeReplacements.push(`${match}=:${match}`)
            }

            const routeRe = /\[(.+)\]/g;
            const newRoute = route.replace(routeRe, ':$1')

            if (routeReplacements.length > 0) {
                rewrites.push(rewrite(newRoute, route + '.html?' + routeReplacements.join('&')))
            }
        }

        return (req, res, next) => {
            for (var replacement of rewrites) {
                replacement(req, res, () => {});
            }
            console.log('Final URL: ', req.url)
            next();
        }
    }
    else {
        const errorMessage = 'No dynamic route file found at ' + routeAbsolutePath;
        if (strict) {
            throw new Error(errorMessage);
        }
        else {
            console.warn(errorMessage);
        }
        return (req, res, next) => { next() }
    }
}