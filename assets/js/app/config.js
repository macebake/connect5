// Configuration for Connect5 application
const runtimeConfig = globalThis.CONNECT5_CONFIG ?? {};

export const CONFIG = {
    SUPABASE_URL: runtimeConfig.SUPABASE_URL || 'https://mhshcrzknfwaczghjrse.supabase.co',
    SUPABASE_ANON_KEY: runtimeConfig.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oc2hjcnprbmZ3YWN6Z2hqcnNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgxOTgxMjUsImV4cCI6MjA3Mzc3NDEyNX0.G_hEh3BOeKjfuA4BosWldUQ9cKknSdwbEmjfP5UCJ_0'
};

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
