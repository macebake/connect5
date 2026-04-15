export function getAppBasePath() {
    const { pathname } = window.location;
    const pagesIndex = pathname.indexOf('/pages/');

    if (pagesIndex >= 0) {
        return pathname.slice(0, pagesIndex + 1);
    }

    const lastSlashIndex = pathname.lastIndexOf('/');
    return pathname.slice(0, lastSlashIndex + 1);
}

export function buildAppUrl(path) {
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    return new URL(`${getAppBasePath()}${normalizedPath}`, window.location.origin).toString();
}
